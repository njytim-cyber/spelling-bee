/**
 * utils/analytics.ts
 *
 * Lightweight analytics wrapper over Firebase Analytics.
 * No-op in test/SSR environments where Analytics isn't supported.
 */
import { logEvent } from 'firebase/analytics';
import { getAnalyticsInstance } from './firebase';

type EventParams = Record<string, string | number | boolean>;

/**
 * Track an analytics event. Fire-and-forget — never throws.
 *
 * Key events:
 * - onboarding_complete
 * - session_complete { words, accuracy, level }
 * - paywall_shown
 * - trial_started
 * - purchase_clicked { plan: 'monthly' | 'annual' }
 * - referral_shared
 * - level_gated { level }
 */
export function trackEvent(name: string, params?: EventParams): void {
    getAnalyticsInstance()
        .then(analytics => {
            if (analytics) logEvent(analytics, name, params);
        })
        .catch(() => {
            // Silent — analytics is non-critical
        });
}
