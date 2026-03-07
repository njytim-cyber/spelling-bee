/**
 * tests/analytics.test.ts
 *
 * Tests for the analytics wrapper — ensures all analytics functions are no-ops
 * when Firebase Analytics is not available (test/SSR environments).
 */
import { describe, it, expect } from 'vitest';

describe('analytics', () => {
    it('exports trackEvent', async () => {
        const { trackEvent } = await import('../utils/analytics');
        expect(typeof trackEvent).toBe('function');
    });

    it('exports setAnalyticsUserId', async () => {
        const { setAnalyticsUserId } = await import('../utils/analytics');
        expect(typeof setAnalyticsUserId).toBe('function');
    });

    it('exports setAnalyticsUserProperties', async () => {
        const { setAnalyticsUserProperties } = await import('../utils/analytics');
        expect(typeof setAnalyticsUserProperties).toBe('function');
    });

    it('exports trackScreenView', async () => {
        const { trackScreenView } = await import('../utils/analytics');
        expect(typeof trackScreenView).toBe('function');
    });

    it('does not throw when called without analytics support', async () => {
        const { trackEvent, setAnalyticsUserId, setAnalyticsUserProperties, trackScreenView } = await import('../utils/analytics');
        // In test environment, Firebase Analytics is not supported — should silently no-op
        expect(() => trackEvent('test_event')).not.toThrow();
        expect(() => trackEvent('test_event', { key: 'value' })).not.toThrow();
        expect(() => setAnalyticsUserId('test-uid')).not.toThrow();
        expect(() => setAnalyticsUserId(null)).not.toThrow();
        expect(() => setAnalyticsUserProperties({ level: '3' })).not.toThrow();
        expect(() => trackScreenView('game')).not.toThrow();
    });

    it('exports trackLatency', async () => {
        const { trackLatency } = await import('../utils/analytics');
        expect(typeof trackLatency).toBe('function');
    });

    it('trackLatency returns the wrapped value on success', async () => {
        const { trackLatency } = await import('../utils/analytics');
        const result = await trackLatency('test', 'op', async () => 42);
        expect(result).toBe(42);
    });

    it('trackLatency re-throws errors from the wrapped function', async () => {
        const { trackLatency } = await import('../utils/analytics');
        await expect(
            trackLatency('test', 'op', async () => { throw new Error('boom'); }),
        ).rejects.toThrow('boom');
    });
});
