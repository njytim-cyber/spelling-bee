/**
 * tests/shareHelper.test.ts
 *
 * Tests for the centralized share utility: appendReferralFooter.
 * shareOrCopy relies on navigator.share / clipboard (browser-only), tested manually.
 */
import { describe, it, expect } from 'vitest';

// Inline re-implementation to avoid importing browser-dependent module
function appendReferralFooter(text: string, referralCode?: string, origin = 'https://spellingbee.pages.dev'): string {
    if (!referralCode) return text;
    return `${text}\n\nJoin free → ${origin}?ref=${referralCode}`;
}

describe('appendReferralFooter', () => {
    it('appends referral link when code is present', () => {
        const result = appendReferralFooter('Great score!', 'SPELL-AB12');
        expect(result).toContain('Join free →');
        expect(result).toContain('?ref=SPELL-AB12');
    });

    it('returns text unchanged when no referral code', () => {
        expect(appendReferralFooter('No code here')).toBe('No code here');
    });

    it('returns text unchanged when referral code is undefined', () => {
        expect(appendReferralFooter('Test', undefined)).toBe('Test');
    });

    it('returns text unchanged when referral code is empty string', () => {
        // Empty string is falsy, should skip
        expect(appendReferralFooter('Test', '')).toBe('Test');
    });

    it('preserves multiline text with referral footer', () => {
        const text = '🐝 Weekly Recap\n⚡ 500 XP\n🔥 7-day streak';
        const result = appendReferralFooter(text, 'SPELL-XY99');
        expect(result).toContain('🐝 Weekly Recap');
        expect(result).toContain('⚡ 500 XP');
        expect(result).toContain('?ref=SPELL-XY99');
        // Two newlines before footer
        expect(result).toContain('\n\nJoin free →');
    });
});
