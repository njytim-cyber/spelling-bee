/**
 * services/stripe.ts
 *
 * Client-side helpers for Stripe integration via Firebase Cloud Functions.
 * Calls createCheckoutSession / createPortalSession / restoreSubscription
 * deployed in functions/src/index.ts.
 */
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { app } from '../utils/firebase';

const functions = getFunctions(app, 'us-central1');

interface CheckoutResult {
    sessionId: string;
    url: string;
}

interface PortalResult {
    url: string;
}

interface RestoreResult {
    active: boolean;
    expiresAt?: string;
    plan?: string;
}

/**
 * Create a Stripe Checkout session and redirect to it.
 * @returns Checkout session URL (caller should redirect)
 */
export async function startCheckout(plan: 'monthly' | 'annual'): Promise<string> {
    const fn = httpsCallable<{ plan: string }, CheckoutResult>(functions, 'createCheckoutSession');
    const result = await fn({ plan });
    return result.data.url;
}

/**
 * Open Stripe Customer Portal for subscription management.
 * @returns Portal URL (caller should redirect)
 */
export async function openCustomerPortal(): Promise<string> {
    const fn = httpsCallable<Record<string, never>, PortalResult>(functions, 'createPortalSession');
    const result = await fn({});
    return result.data.url;
}

/**
 * Check Stripe for an active subscription and sync to Firestore.
 * Called on login to restore purchases.
 */
export async function restoreSubscription(): Promise<RestoreResult> {
    const fn = httpsCallable<Record<string, never>, RestoreResult>(functions, 'restoreSubscription');
    const result = await fn({});
    return result.data;
}

/**
 * Create a Stripe Checkout session for a one-time cosmetic pack purchase.
 * @returns Checkout URL (caller should redirect)
 */
export async function purchasePack(packId: string): Promise<string> {
    const fn = httpsCallable<{ packId: string }, CheckoutResult>(functions, 'createPackCheckout');
    const result = await fn({ packId });
    return result.data.url;
}
