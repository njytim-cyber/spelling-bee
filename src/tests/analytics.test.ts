/**
 * tests/analytics.test.ts
 *
 * Tests for the analytics wrapper — ensures trackEvent is a no-op
 * when Firebase Analytics is not available (test/SSR environments).
 */
import { describe, it, expect } from 'vitest';

describe('trackEvent', () => {
    it('exports a function', async () => {
        const { trackEvent } = await import('../utils/analytics');
        expect(typeof trackEvent).toBe('function');
    });

    it('does not throw when called without analytics support', async () => {
        const { trackEvent } = await import('../utils/analytics');
        // In test environment, Firebase Analytics is not supported — should silently no-op
        expect(() => trackEvent('test_event')).not.toThrow();
        expect(() => trackEvent('test_event', { key: 'value' })).not.toThrow();
    });
});
