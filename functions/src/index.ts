/**
 * Firebase Cloud Functions
 *
 * 1. synthesizeSpeech — TTS proxy with caching + rate limiting
 * 2. redeemReferral — Referral code redemption + Champion Pass reward
 * 3. createCheckoutSession — Stripe Checkout for Champion Pass subscriptions
 * 4. stripeWebhook — Stripe webhook handler (checkout complete, renewal, cancel, pack purchase)
 * 5. createPortalSession — Stripe Customer Portal for subscription management
 * 6. createPackCheckout — Stripe Checkout for one-time cosmetic pack purchases
 * 7. restoreSubscription — Check Stripe for active subscription on login
 * 8. deployHealthCheck — Scheduled health check: error/vitals spike detection
 */
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { createHash } from 'crypto';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';

initializeApp();

const ttsClient = new TextToSpeechClient();
const db = getFirestore();
const storage = getStorage();

// ── Stripe Configuration ─────────────────────────────────────────────────────

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

/** Lazy-initialized Stripe client (uses secret at runtime, not deploy time). */
function getStripe(): Stripe {
    return new Stripe(stripeSecretKey.value());
}

/** Stripe Price IDs — set via `firebase functions:config:set` or env. */
const STRIPE_PRICES: Record<string, string> = {
    monthly: process.env.STRIPE_PRICE_MONTHLY || '',
    annual: process.env.STRIPE_PRICE_ANNUAL || '',
    'bee-team-monthly': process.env.STRIPE_PRICE_BEE_TEAM_MONTHLY || '',
    'bee-team-annual': process.env.STRIPE_PRICE_BEE_TEAM_ANNUAL || '',
};

/** Stripe Price IDs for cosmetic packs (one-time purchases). */
const STRIPE_PACK_PRICES: Record<string, string> = {
    'everything-pack': process.env.STRIPE_PRICE_EVERYTHING_PACK || '',
    // Legacy packs — kept so existing purchases validate
    'neon-pack': process.env.STRIPE_PRICE_NEON_PACK || '',
    'pastel-pack': process.env.STRIPE_PRICE_PASTEL_PACK || '',
    'nature-pack': process.env.STRIPE_PRICE_NATURE_PACK || '',
    'trail-pack': process.env.STRIPE_PRICE_TRAIL_PACK || '',
    'ultimate-pack': process.env.STRIPE_PRICE_ULTIMATE_PACK || '',
};

const ALLOWED_ORIGINS = [
    'https://spelling-bee-prod.web.app',
    'https://spelling-bee-prod.firebaseapp.com',
    'capacitor://localhost',
    'http://localhost',
];

const CORS_REGEX = /http:\/\/localhost(:\d+)?$/;

/** Validate voice name matches allowed Neural2 pattern */
const VOICE_PATTERN = /^en-(US|GB|AU|IN)-Neural2-[A-Z]$/;

/** Max text length for synthesis */
const MAX_TEXT_LENGTH = 100;

/** Daily request limit per user (free / premium) */
const DAILY_LIMIT = 200;
const DAILY_LIMIT_PREMIUM = 2000;

/** Cloud Storage bucket subfolder for cached audio */
const CACHE_PREFIX = 'tts-cache';

// ── Referral Redemption ─────────────────────────────────────────────────────

/** Max referrals a single user can generate */
const MAX_REFERRALS = 20;

/** Days of Champion Pass granted per referral */
const REFERRAL_REWARD_DAYS = 7;

export const redeemReferral = onCall(
    {
        region: 'us-central1',
        cors: [
            'https://spelling-bee-prod.web.app',
            'https://spelling-bee-prod.firebaseapp.com',
            /http:\/\/localhost(:\d+)?$/,
        ],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be signed in.');
        }
        const inviteeUid = request.auth.uid;

        const { referralCode } = request.data as { referralCode?: string };
        if (!referralCode || typeof referralCode !== 'string' || !/^SPELL-[A-Z0-9]{4}$/.test(referralCode)) {
            throw new HttpsError('invalid-argument', 'Invalid referral code format.');
        }

        // Find referrer by code
        const usersRef = db.collection('users');
        const snap = await usersRef.where('referralCode', '==', referralCode).limit(1).get();
        if (snap.empty) {
            return { success: false, error: 'Referral code not found.' };
        }

        const referrerDoc = snap.docs[0];
        const referrerUid = referrerDoc.id;
        const referrerData = referrerDoc.data();

        // Self-referral check
        if (referrerUid === inviteeUid) {
            return { success: false, error: "Can't use your own referral code." };
        }

        // Already redeemed check
        const existingRef = await db.collection('referrals')
            .where('inviteeUid', '==', inviteeUid)
            .where('referrerUid', '==', referrerUid)
            .limit(1)
            .get();
        if (!existingRef.empty) {
            return { success: false, error: 'Already redeemed this referral.' };
        }

        // Max referrals check
        const referralCount = referrerData.referralCount || 0;
        if (referralCount >= MAX_REFERRALS) {
            return { success: false, error: 'This referral code has reached its limit.' };
        }

        // Calculate new expiry: extend from current expiry or now
        const rewardMs = REFERRAL_REWARD_DAYS * 24 * 60 * 60 * 1000;

        const extendExpiry = (currentExpiry?: string) => {
            const base = currentExpiry && new Date(currentExpiry) > new Date()
                ? new Date(currentExpiry)
                : new Date();
            return new Date(base.getTime() + rewardMs).toISOString();
        };

        const referrerExpiry = extendExpiry(referrerData.championPassExpiry);
        const inviteeDoc = await db.doc(`users/${inviteeUid}`).get();
        const inviteeExpiry = extendExpiry(inviteeDoc.exists ? inviteeDoc.data()?.championPassExpiry : undefined);

        // Batch write: referral doc + update both users
        const batch = db.batch();

        batch.create(db.collection('referrals').doc(), {
            referrerUid,
            inviteeUid,
            referralCode,
            createdAt: FieldValue.serverTimestamp(),
            rewarded: true,
        });

        batch.set(db.doc(`users/${referrerUid}`), {
            referralCount: FieldValue.increment(1),
            championPassExpiry: referrerExpiry,
        }, { merge: true });

        batch.set(db.doc(`users/${inviteeUid}`), {
            championPassExpiry: inviteeExpiry,
        }, { merge: true });

        await batch.commit();

        return { success: true, expiresAt: inviteeExpiry };
    },
);

// ── Text-to-Speech ──────────────────────────────────────────────────────────

export const synthesizeSpeech = onCall(
    {
        region: 'us-central1',
        cors: [
            'https://spelling-bee-prod.web.app',
            'https://spelling-bee-prod.firebaseapp.com',
            /http:\/\/localhost(:\d+)?$/,
        ],
    },
    async (request) => {
        // ── Auth check ──────────────────────────────────────────────────
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be signed in.');
        }
        const uid = request.auth.uid;

        // ── Input validation ────────────────────────────────────────────
        const { text, voiceName, speakingRate } = request.data as {
            text?: string;
            voiceName?: string;
            speakingRate?: number;
        };

        if (!text || typeof text !== 'string' || text.length > MAX_TEXT_LENGTH) {
            throw new HttpsError('invalid-argument', `Text must be 1-${MAX_TEXT_LENGTH} characters.`);
        }
        if (!voiceName || !VOICE_PATTERN.test(voiceName)) {
            throw new HttpsError('invalid-argument', 'Invalid voice name.');
        }
        const rate = typeof speakingRate === 'number'
            ? Math.max(0.5, Math.min(2.0, speakingRate))
            : 1.0;

        // ── Rate limiting ───────────────────────────────────────────────
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const rateLimitRef = db.doc(`ttsRateLimit/${uid}_${today}`);
        const rateLimitSnap = await rateLimitRef.get();
        const currentCount = rateLimitSnap.exists ? (rateLimitSnap.data()?.count ?? 0) : 0;

        if (currentCount >= DAILY_LIMIT) {
            // Premium users get a higher cap, not unlimited (cost control)
            const userDoc = await db.doc(`users/${uid}`).get();
            const expiry = userDoc.data()?.championPassExpiry as string | undefined;
            const userIsPremium = expiry && new Date(expiry) > new Date();
            if (!userIsPremium) {
                throw new HttpsError('resource-exhausted', 'Daily TTS limit reached. Try again tomorrow.');
            }
            if (currentCount >= DAILY_LIMIT_PREMIUM) {
                throw new HttpsError('resource-exhausted', 'Daily TTS limit reached. Try again tomorrow.');
            }
        }

        // ── Cache check ─────────────────────────────────────────────────
        const cacheKey = createHash('md5')
            .update(`${text.toLowerCase()}|${voiceName}|${rate}`)
            .digest('hex');
        const bucket = storage.bucket('spelling-bee-prod-tts');
        const filePath = `${CACHE_PREFIX}/${cacheKey}.mp3`;
        const file = bucket.file(filePath);

        const [exists] = await file.exists();
        if (exists) {
            const [url] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000, // 1 hour
            });
            // Still count toward rate limit
            await rateLimitRef.set(
                { count: FieldValue.increment(1), date: today },
                { merge: true },
            );
            return { audioUrl: url, cached: true };
        }

        // ── Synthesize ──────────────────────────────────────────────────
        const langCode = voiceName.slice(0, 5); // e.g. 'en-US'
        const [response] = await ttsClient.synthesizeSpeech({
            input: { text },
            voice: { languageCode: langCode, name: voiceName },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: rate,
                pitch: 0,
            },
        });

        if (!response.audioContent) {
            throw new HttpsError('internal', 'TTS API returned empty audio.');
        }

        // ── Upload to Cloud Storage ─────────────────────────────────────
        const audioBuffer = Buffer.isBuffer(response.audioContent)
            ? response.audioContent
            : Buffer.from(response.audioContent as Uint8Array);

        await file.save(audioBuffer, {
            contentType: 'audio/mpeg',
            metadata: {
                cacheControl: 'public, max-age=2592000', // 30 days
                metadata: { text: text.toLowerCase(), voice: voiceName, rate: String(rate) },
            },
        });

        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000,
        });

        // ── Increment rate limit counter ────────────────────────────────
        await rateLimitRef.set(
            { count: FieldValue.increment(1), date: today },
            { merge: true },
        );

        return { audioUrl: url, cached: false };
    },
);

// ── Stripe: Create Checkout Session ──────────────────────────────────────────

export const createCheckoutSession = onCall(
    {
        region: 'us-central1',
        secrets: [stripeSecretKey],
        cors: [...ALLOWED_ORIGINS, CORS_REGEX],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be signed in.');
        }
        const uid = request.auth.uid;

        const { plan } = request.data as { plan?: string };
        const validPlans = ['monthly', 'annual', 'bee-team-monthly', 'bee-team-annual'];
        if (!plan || !validPlans.includes(plan)) {
            throw new HttpsError('invalid-argument', 'Invalid plan.');
        }

        const priceId = STRIPE_PRICES[plan];
        if (!priceId) {
            throw new HttpsError('failed-precondition', `Stripe price for ${plan} not configured.`);
        }

        const stripe = getStripe();

        // Find or create Stripe customer for this Firebase user
        const userDoc = await db.doc(`users/${uid}`).get();
        let stripeCustomerId = userDoc.data()?.stripeCustomerId as string | undefined;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                metadata: { firebaseUid: uid },
            });
            stripeCustomerId = customer.id;
            await db.doc(`users/${uid}`).set({ stripeCustomerId }, { merge: true });
        }

        // Determine success/cancel URLs
        const origin = typeof request.rawRequest?.headers?.origin === 'string'
            ? request.rawRequest.headers.origin
            : ALLOWED_ORIGINS[0];

        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}?checkout=success`,
            cancel_url: `${origin}?checkout=cancel`,
            subscription_data: {
                metadata: { firebaseUid: uid, plan },
            },
            metadata: { firebaseUid: uid, plan },
        });

        return { sessionId: session.id, url: session.url };
    },
);

// ── Stripe: Webhook Handler ──────────────────────────────────────────────────

export const stripeWebhook = onRequest(
    {
        region: 'us-central1',
        secrets: [stripeSecretKey, stripeWebhookSecret],
    },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).send('Method not allowed');
            return;
        }

        const stripe = getStripe();
        const sig = req.headers['stripe-signature'] as string;

        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(
                req.rawBody,
                sig,
                stripeWebhookSecret.value(),
            );
        } catch (err) {
            console.error('Webhook signature verification failed:', err);
            res.status(400).send('Webhook signature verification failed');
            return;
        }

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const uid = session.metadata?.firebaseUid;
                if (!uid) break;

                // One-time cosmetic pack purchase
                if (session.metadata?.type === 'cosmetic_pack') {
                    const packId = session.metadata?.packId;
                    if (packId) {
                        await db.doc(`users/${uid}`).set({
                            purchasedPacks: FieldValue.arrayUnion(packId),
                        }, { merge: true });
                    }
                    break;
                }

                // Subscription: validate plan against actual Stripe price ID
                const plan = session.metadata?.plan ?? 'monthly';
                const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
                const actualPriceId = lineItems.data[0]?.price?.id;
                const expectedPriceId = STRIPE_PRICES[plan];
                if (actualPriceId && expectedPriceId && actualPriceId !== expectedPriceId) {
                    console.error('Plan/price mismatch:', { plan, actualPriceId, expectedPriceId, uid });
                    break; // Don't grant premium for mismatched plan
                }

                const days = plan === 'annual' || plan === 'bee-team-annual' ? 365 : 30;
                const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

                await db.doc(`users/${uid}`).set({
                    championPassExpiry: expiry,
                    subscriptionStatus: 'active',
                    subscriptionPlan: plan,
                    stripeSubscriptionId: session.subscription as string,
                }, { merge: true });
                break;
            }

            case 'invoice.paid': {
                // Subscription renewal — extend expiry
                const invoice = event.data.object as Stripe.Invoice;
                const subRef = invoice.parent?.subscription_details?.subscription;
                const subId = typeof subRef === 'string' ? subRef : subRef?.id;
                if (!subId) break;

                const sub = await stripe.subscriptions.retrieve(subId);
                const uid = sub.metadata?.firebaseUid;
                if (!uid) break;

                const plan = sub.metadata?.plan ?? 'monthly';
                const days = plan === 'annual' ? 365 : 30;
                const userDoc = await db.doc(`users/${uid}`).get();
                const currentExpiry = userDoc.data()?.championPassExpiry;
                const base = currentExpiry && new Date(currentExpiry) > new Date()
                    ? new Date(currentExpiry)
                    : new Date();
                const expiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

                await db.doc(`users/${uid}`).set({
                    championPassExpiry: expiry,
                    subscriptionStatus: 'active',
                }, { merge: true });
                break;
            }

            case 'customer.subscription.deleted': {
                // Cancellation — let current period finish, then expire
                const sub = event.data.object as Stripe.Subscription;
                const uid = sub.metadata?.firebaseUid;
                if (!uid) break;

                // Set expiry to current period end (no immediate revoke)
                // In Stripe v20+, current_period_end is on SubscriptionItem, not Subscription
                const cancelPeriodEnd = sub.items.data[0]?.current_period_end ?? (Date.now() / 1000);
                const periodEnd = new Date(cancelPeriodEnd * 1000).toISOString();
                await db.doc(`users/${uid}`).set({
                    championPassExpiry: periodEnd,
                    subscriptionStatus: 'canceled',
                }, { merge: true });
                break;
            }

            default:
                // Unhandled event type — log and acknowledge
                console.log(`Unhandled Stripe event: ${event.type}`);
        }

        res.status(200).json({ received: true });
    },
);

// ── Stripe: Customer Portal Session ──────────────────────────────────────────

export const createPortalSession = onCall(
    {
        region: 'us-central1',
        secrets: [stripeSecretKey],
        cors: [...ALLOWED_ORIGINS, CORS_REGEX],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be signed in.');
        }
        const uid = request.auth.uid;

        const userDoc = await db.doc(`users/${uid}`).get();
        const stripeCustomerId = userDoc.data()?.stripeCustomerId as string | undefined;

        if (!stripeCustomerId) {
            throw new HttpsError('failed-precondition', 'No subscription found. Purchase Champion Pass first.');
        }

        const stripe = getStripe();

        const origin = typeof request.rawRequest?.headers?.origin === 'string'
            ? request.rawRequest.headers.origin
            : ALLOWED_ORIGINS[0];

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: origin,
        });

        return { url: portalSession.url };
    },
);

// ── Stripe: Restore Subscription Status ──────────────────────────────────────

export const restoreSubscription = onCall(
    {
        region: 'us-central1',
        secrets: [stripeSecretKey],
        cors: [...ALLOWED_ORIGINS, CORS_REGEX],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be signed in.');
        }
        const uid = request.auth.uid;

        const userDoc = await db.doc(`users/${uid}`).get();
        const stripeCustomerId = userDoc.data()?.stripeCustomerId as string | undefined;

        if (!stripeCustomerId) {
            return { active: false };
        }

        const stripe = getStripe();

        // Check for active subscriptions
        const subs = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: 'active',
            limit: 1,
        });

        if (subs.data.length === 0) {
            return { active: false };
        }

        const sub = subs.data[0];
        const plan = sub.metadata?.plan ?? 'monthly';
        // In Stripe v20+, current_period_end is on SubscriptionItem, not Subscription
        const restorePeriodEnd = sub.items.data[0]?.current_period_end ?? (Date.now() / 1000);
        const periodEnd = new Date(restorePeriodEnd * 1000).toISOString();

        // Sync expiry to Firestore
        await db.doc(`users/${uid}`).set({
            championPassExpiry: periodEnd,
            subscriptionStatus: 'active',
            subscriptionPlan: plan,
            stripeSubscriptionId: sub.id,
        }, { merge: true });

        return { active: true, expiresAt: periodEnd, plan };
    },
);

// ── Stripe: One-Time Cosmetic Pack Checkout ─────────────────────────────────

export const createPackCheckout = onCall(
    {
        region: 'us-central1',
        secrets: [stripeSecretKey],
        cors: [...ALLOWED_ORIGINS, CORS_REGEX],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be signed in.');
        }
        const uid = request.auth.uid;

        const { packId } = request.data as { packId?: string };
        if (!packId || typeof packId !== 'string' || !STRIPE_PACK_PRICES[packId]) {
            throw new HttpsError('invalid-argument', 'Invalid pack ID.');
        }

        const priceId = STRIPE_PACK_PRICES[packId];
        if (!priceId) {
            throw new HttpsError('failed-precondition', `Stripe price for pack "${packId}" not configured.`);
        }

        // Check if already purchased
        const userDoc = await db.doc(`users/${uid}`).get();
        const userData = userDoc.data();
        const existing: string[] = userData?.purchasedPacks ?? [];
        if (existing.includes(packId)) {
            throw new HttpsError('already-exists', 'You already own this pack.');
        }

        const stripe = getStripe();

        // Find or create Stripe customer
        let stripeCustomerId = userData?.stripeCustomerId as string | undefined;
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                metadata: { firebaseUid: uid },
            });
            stripeCustomerId = customer.id;
            await db.doc(`users/${uid}`).set({ stripeCustomerId }, { merge: true });
        }

        const origin = typeof request.rawRequest?.headers?.origin === 'string'
            ? request.rawRequest.headers.origin
            : ALLOWED_ORIGINS[0];

        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            mode: 'payment',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}?pack_purchased=${packId}`,
            cancel_url: `${origin}?checkout=cancel`,
            metadata: { firebaseUid: uid, packId, type: 'cosmetic_pack' },
        });

        return { sessionId: session.id, url: session.url };
    },
);

// ── Deploy Health Check (Scheduled) ─────────────────────────────────────────

/**
 * Runs every 10 minutes. Compares recent error/vitals rates against a baseline
 * window and writes a health status document. Logs warnings when rates spike.
 *
 * Health levels:
 * - green: error rate ≤ baseline (or ≤ 2 errors in window)
 * - yellow: error rate 2–3x baseline
 * - red: error rate > 3x baseline OR > 5 poor vitals in window
 *
 * Results are written to `deployHealth/{timestamp}` and visible in
 * Firebase Console → Cloud Logging. Wire Cloud Logging → Slack/email
 * alerts for severity >= WARNING to get notified.
 */
export const deployHealthCheck = onSchedule(
    {
        schedule: 'every 10 minutes',
        region: 'us-central1',
        timeoutSeconds: 30,
    },
    async () => {
        const now = Date.now();
        const RECENT_WINDOW_MS = 10 * 60 * 1000;  // last 10 minutes
        const BASELINE_WINDOW_MS = 60 * 60 * 1000; // prior 60 minutes

        const recentStart = new Date(now - RECENT_WINDOW_MS);
        const baselineStart = new Date(now - BASELINE_WINDOW_MS);
        const baselineEnd = new Date(now - RECENT_WINDOW_MS);

        // ── Count recent errors ──
        const errorsRef = db.collection('errors');
        const recentErrorsSnap = await errorsRef
            .where('timestamp', '>=', recentStart)
            .where('timestamp', '<=', new Date(now))
            .count()
            .get();
        const recentErrors = recentErrorsSnap.data().count;

        // ── Count baseline errors (prior 60 min, normalized to 10-min rate) ──
        const baselineErrorsSnap = await errorsRef
            .where('timestamp', '>=', baselineStart)
            .where('timestamp', '<', baselineEnd)
            .count()
            .get();
        const baselineErrorsTotal = baselineErrorsSnap.data().count;
        // Normalize: 60-min baseline ÷ 6 = expected per 10-min window
        const baselineErrorRate = baselineErrorsTotal / 6;

        // ── Count poor vitals in recent window ──
        const vitalsRef = db.collection('vitals');
        const poorVitalsSnap = await vitalsRef
            .where('timestamp', '>=', recentStart)
            .where('timestamp', '<=', new Date(now))
            .where('rating', '==', 'poor')
            .count()
            .get();
        const poorVitals = poorVitalsSnap.data().count;

        // ── Determine health level ──
        let level: 'green' | 'yellow' | 'red' = 'green';
        const reasons: string[] = [];

        // Skip spike detection if both counts are trivially small
        if (recentErrors > 2) {
            const ratio = baselineErrorRate > 0
                ? recentErrors / baselineErrorRate
                : recentErrors; // no baseline = treat count as ratio

            if (ratio > 3) {
                level = 'red';
                reasons.push(`Error spike: ${recentErrors} errors in 10 min (${ratio.toFixed(1)}x baseline)`);
            } else if (ratio > 2) {
                level = 'yellow';
                reasons.push(`Elevated errors: ${recentErrors} in 10 min (${ratio.toFixed(1)}x baseline)`);
            }
        }

        if (poorVitals > 5) {
            level = 'red';
            reasons.push(`${poorVitals} poor web vitals in 10 min`);
        }

        // ── Write health status ──
        const status = {
            timestamp: FieldValue.serverTimestamp(),
            level,
            recentErrors,
            baselineErrorRate: Math.round(baselineErrorRate * 10) / 10,
            poorVitals,
            reasons,
        };

        await db.collection('deployHealth').add(status);

        // ── Log warnings for Cloud Logging alerting ──
        if (level === 'red') {
            console.error(`[DEPLOY HEALTH] RED: ${reasons.join('; ')}`);
        } else if (level === 'yellow') {
            console.warn(`[DEPLOY HEALTH] YELLOW: ${reasons.join('; ')}`);
        } else {
            console.log(`[DEPLOY HEALTH] GREEN: ${recentErrors} errors, ${poorVitals} poor vitals`);
        }
    },
);
