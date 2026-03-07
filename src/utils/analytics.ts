/**
 * utils/analytics.ts
 *
 * Lightweight analytics wrapper over Firebase Analytics.
 * No-op in test/SSR environments where Analytics isn't supported.
 */
import { logEvent, setUserId as fbSetUserId, setUserProperties as fbSetUserProperties } from 'firebase/analytics';
import { getAnalyticsInstance } from './firebase';

type EventParams = Record<string, string | number | boolean>;

/**
 * Track an analytics event. Fire-and-forget — never throws.
 *
 * Key events:
 * - onboarding_complete
 * - session_start { level, session_size }
 * - session_complete { words, accuracy, level, duration_sec, session_size, completed }
 * - mastery_milestone { milestone, total_mastered }
 * - word_retention_check { words_checked, words_retained, retention_rate }
 * - error_pattern_detected { pattern }
 * - loot_drop { item }
 * - paywall_shown
 * - trial_started
 * - purchase_clicked { plan: 'monthly' | 'annual' }
 * - referral_shared
 * - level_gated { level }
 * - app_open
 * - screen_view { screen_name }
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

/** Set the Firebase Analytics user ID (for cross-session retention tracking). */
export function setAnalyticsUserId(uid: string | null): void {
    getAnalyticsInstance()
        .then(analytics => {
            if (analytics) fbSetUserId(analytics, uid);
        })
        .catch(() => {});
}

/** Set user properties for retention segmentation (level, subscription, etc.). */
export function setAnalyticsUserProperties(props: Record<string, string | null>): void {
    getAnalyticsInstance()
        .then(analytics => {
            if (analytics) fbSetUserProperties(analytics, props);
        })
        .catch(() => {});
}

/** Track a screen view (SPA navigation). GA4 uses screen_name param. */
export function trackScreenView(screenName: string): void {
    trackEvent('screen_view', { screen_name: screenName });
}

/**
 * Wrap an async call with latency tracking. Logs `api_latency` event with
 * service name, operation, duration in ms, and success/failure status.
 * Re-throws errors so callers still handle them normally.
 */
export async function trackLatency<T>(
    service: string,
    operation: string,
    fn: () => Promise<T>,
): Promise<T> {
    const start = performance.now();
    let ok = true;
    try {
        return await fn();
    } catch (err) {
        ok = false;
        throw err;
    } finally {
        const duration_ms = Math.round(performance.now() - start);
        trackEvent('api_latency', { service, operation, duration_ms, success: ok });
    }
}
