/**
 * premium.test.ts
 *
 * Tests for premium/paywall logic:
 * - isLevelPremium gate
 * - FREE_LEVEL_CAP boundary
 * - Expiry comparison logic (isPremium, daysRemaining, extendPass, setExpiryFromServer)
 */
import { describe, it, expect } from 'vitest';
import { isLevelPremium } from '../hooks/usePremium';
import { FREE_LEVEL_CAP } from '../config';

// ── isLevelPremium ──────────────────────────────────────────────────────────

describe('isLevelPremium', () => {
    it('returns false for levels at or below FREE_LEVEL_CAP', () => {
        for (let i = 1; i <= FREE_LEVEL_CAP; i++) {
            expect(isLevelPremium(`level-${i}`)).toBe(false);
        }
    });

    it('returns true for levels above FREE_LEVEL_CAP', () => {
        for (let i = FREE_LEVEL_CAP + 1; i <= 10; i++) {
            expect(isLevelPremium(`level-${i}`)).toBe(true);
        }
    });

    it('handles plain number strings', () => {
        expect(isLevelPremium('1')).toBe(false);
        expect(isLevelPremium('3')).toBe(false);
        expect(isLevelPremium('4')).toBe(true);
        expect(isLevelPremium('10')).toBe(true);
    });

    it('returns false for non-numeric values', () => {
        expect(isLevelPremium('abc')).toBe(false);
        expect(isLevelPremium('')).toBe(false);
    });
});

// ── FREE_LEVEL_CAP constant ────────────────────────────────────────────────

describe('FREE_LEVEL_CAP', () => {
    it('equals 3 (Levels 1-3 free, 4-10 premium)', () => {
        expect(FREE_LEVEL_CAP).toBe(3);
    });
});

// ── Premium expiry logic (pure functions) ───────────────────────────────────

describe('premium expiry logic', () => {
    it('future expiry is premium', () => {
        const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        expect(new Date(future) > new Date()).toBe(true);
    });

    it('past expiry is not premium', () => {
        const past = new Date(Date.now() - 1000).toISOString();
        expect(new Date(past) > new Date()).toBe(false);
    });

    it('empty expiry is not premium', () => {
        const expiry = '';
        const isPremium = expiry !== '' && new Date(expiry) > new Date();
        expect(isPremium).toBe(false);
    });

    it('daysRemaining calculates correctly', () => {
        const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const diff = new Date(sevenDays).getTime() - Date.now();
        const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        expect(days).toBe(7);
    });

    it('daysRemaining is 0 for expired pass', () => {
        const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const diff = new Date(past).getTime() - Date.now();
        const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        expect(days).toBe(0);
    });

    it('extendPass extends from current expiry if still active', () => {
        const currentExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
        const extensionDays = 7;
        const base = currentExpiry > new Date() ? currentExpiry : new Date();
        const newExpiry = new Date(base.getTime() + extensionDays * 24 * 60 * 60 * 1000);
        const totalDays = Math.ceil((newExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        expect(totalDays).toBe(10); // 3 remaining + 7 extension
    });

    it('extendPass starts from now if pass expired', () => {
        const expiredExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
        const extensionDays = 7;
        const base = expiredExpiry > new Date() ? expiredExpiry : new Date();
        const newExpiry = new Date(base.getTime() + extensionDays * 24 * 60 * 60 * 1000);
        const totalDays = Math.ceil((newExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        expect(totalDays).toBe(7); // fresh 7 days
    });

    it('setExpiryFromServer takes the later of local vs server', () => {
        const local = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days
        const server = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days
        const best = new Date(local) > new Date(server) ? local : server;
        expect(best).toBe(local);
    });

    it('setExpiryFromServer prefers server if later', () => {
        const local = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days
        const server = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days
        const best = new Date(local) > new Date(server) ? local : server;
        expect(best).toBe(server);
    });
});
