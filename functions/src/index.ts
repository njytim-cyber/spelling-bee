/**
 * Firebase Cloud Function: synthesizeSpeech
 *
 * Proxies Google Cloud Text-to-Speech Neural2 API calls.
 * - Requires Firebase Auth (must be signed in)
 * - Caches audio in Cloud Storage for reuse
 * - Rate limits to 200 requests/day/user
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { createHash } from 'crypto';

initializeApp();

const ttsClient = new TextToSpeechClient();
const db = getFirestore();
const storage = getStorage();

/** Validate voice name matches allowed Neural2 pattern */
const VOICE_PATTERN = /^en-(US|GB|AU|IN)-Neural2-[A-Z]$/;

/** Max text length for synthesis */
const MAX_TEXT_LENGTH = 100;

/** Daily request limit per user */
const DAILY_LIMIT = 200;

/** Cloud Storage bucket subfolder for cached audio */
const CACHE_PREFIX = 'tts-cache';

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
            throw new HttpsError('resource-exhausted', 'Daily TTS limit reached. Try again tomorrow.');
        }

        // ── Cache check ─────────────────────────────────────────────────
        const cacheKey = createHash('md5')
            .update(`${text.toLowerCase()}|${voiceName}|${rate}`)
            .digest('hex');
        const bucket = storage.bucket('scribble-math-prod-tts');
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
