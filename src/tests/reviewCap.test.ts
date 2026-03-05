/**
 * tests/reviewCap.test.ts
 *
 * Tests for the SRS daily review cap logic (FREE_DAILY_REVIEW_CAP).
 * Tests the pure logic extracted from useWordHistory, not the React hook itself.
 */
import { describe, it, expect } from 'vitest';
import { FREE_DAILY_REVIEW_CAP, REFERRAL_MILESTONES } from '../config';

describe('FREE_DAILY_REVIEW_CAP', () => {
    it('is a positive integer', () => {
        expect(FREE_DAILY_REVIEW_CAP).toBeGreaterThan(0);
        expect(Number.isInteger(FREE_DAILY_REVIEW_CAP)).toBe(true);
    });

    it('equals 30', () => {
        expect(FREE_DAILY_REVIEW_CAP).toBe(30);
    });
});

describe('Review cap logic', () => {
    // Simulates the capping logic from useWordHistory
    function capReviewQueue<T>(queue: T[], reviewsUsedToday: number, isPremium: boolean): T[] {
        if (isPremium) return queue;
        const remaining = Math.max(0, FREE_DAILY_REVIEW_CAP - reviewsUsedToday);
        return queue.slice(0, remaining);
    }

    function isReviewLimited(reviewsUsedToday: number, isPremium: boolean): boolean {
        return !isPremium && reviewsUsedToday >= FREE_DAILY_REVIEW_CAP;
    }

    function reviewsRemaining(reviewsUsedToday: number, isPremium: boolean): number {
        const cap = isPremium ? Infinity : FREE_DAILY_REVIEW_CAP;
        return Math.max(0, cap - reviewsUsedToday);
    }

    const mockQueue = Array.from({ length: 50 }, (_, i) => `word-${i}`);

    it('premium user gets full queue regardless of daily count', () => {
        expect(capReviewQueue(mockQueue, 100, true)).toHaveLength(50);
        expect(capReviewQueue(mockQueue, 0, true)).toHaveLength(50);
    });

    it('free user with 0 reviews today gets up to 30', () => {
        expect(capReviewQueue(mockQueue, 0, false)).toHaveLength(30);
    });

    it('free user with 10 reviews today gets 20 more', () => {
        expect(capReviewQueue(mockQueue, 10, false)).toHaveLength(20);
    });

    it('free user with 29 reviews today gets 1 more', () => {
        expect(capReviewQueue(mockQueue, 29, false)).toHaveLength(1);
    });

    it('free user at cap gets empty queue', () => {
        expect(capReviewQueue(mockQueue, 30, false)).toHaveLength(0);
    });

    it('free user over cap still gets empty queue (no negatives)', () => {
        expect(capReviewQueue(mockQueue, 50, false)).toHaveLength(0);
    });

    it('small queue is not inflated beyond actual size', () => {
        const smallQueue = ['a', 'b', 'c'];
        expect(capReviewQueue(smallQueue, 0, false)).toHaveLength(3);
    });

    it('isReviewLimited is false for premium users', () => {
        expect(isReviewLimited(100, true)).toBe(false);
    });

    it('isReviewLimited is false when under cap', () => {
        expect(isReviewLimited(29, false)).toBe(false);
    });

    it('isReviewLimited is true at exactly cap', () => {
        expect(isReviewLimited(30, false)).toBe(true);
    });

    it('isReviewLimited is true when over cap', () => {
        expect(isReviewLimited(50, false)).toBe(true);
    });

    it('reviewsRemaining is Infinity for premium', () => {
        expect(reviewsRemaining(10, true)).toBe(Infinity);
    });

    it('reviewsRemaining counts down correctly for free user', () => {
        expect(reviewsRemaining(0, false)).toBe(30);
        expect(reviewsRemaining(15, false)).toBe(15);
        expect(reviewsRemaining(30, false)).toBe(0);
    });

    it('reviewsRemaining never goes negative', () => {
        expect(reviewsRemaining(50, false)).toBe(0);
    });
});

describe('Premium category gating', () => {
    it('etymology and roots are marked premium in SPELLING_CATEGORIES', async () => {
        const { SPELLING_CATEGORIES } = await import('../domains/spelling/spellingCategories');
        const etymology = SPELLING_CATEGORIES.find(c => c.id === 'etymology');
        const roots = SPELLING_CATEGORIES.find(c => c.id === 'roots');
        expect(etymology?.premium).toBe(true);
        expect(roots?.premium).toBe(true);
    });

    it('other origin categories are not premium', async () => {
        const { SPELLING_CATEGORIES } = await import('../domains/spelling/spellingCategories');
        const originLatin = SPELLING_CATEGORIES.find(c => c.id === 'origin-latin');
        const originGreek = SPELLING_CATEGORIES.find(c => c.id === 'origin-greek');
        expect(originLatin?.premium).toBeFalsy();
        expect(originGreek?.premium).toBeFalsy();
    });

    it('level categories are not premium', async () => {
        const { SPELLING_CATEGORIES } = await import('../domains/spelling/spellingCategories');
        const level1 = SPELLING_CATEGORIES.find(c => c.id === 'level-1');
        const level5 = SPELLING_CATEGORIES.find(c => c.id === 'level-5');
        expect(level1?.premium).toBeFalsy();
        expect(level5?.premium).toBeFalsy();
    });
});

describe('Cosmetics premium gating', () => {
    it('4 chalk themes are marked premium', async () => {
        const { CHALK_THEMES } = await import('../utils/chalkThemes');
        const premiumThemes = CHALK_THEMES.filter(t => t.premium);
        expect(premiumThemes).toHaveLength(4);
        const ids = premiumThemes.map(t => t.id);
        expect(ids).toContain('shadow-flame');
        expect(ids).toContain('neon-green');
        expect(ids).toContain('void-black');
        expect(ids).toContain('prismatic');
    });

    it('9 chalk themes are free', async () => {
        const { CHALK_THEMES } = await import('../utils/chalkThemes');
        const freeThemes = CHALK_THEMES.filter(t => !t.premium);
        expect(freeThemes.length).toBe(9);
    });

    it('2 swipe trails are marked premium', async () => {
        const { SWIPE_TRAILS } = await import('../utils/trails');
        const premiumTrails = SWIPE_TRAILS.filter(t => t.premium);
        expect(premiumTrails).toHaveLength(2);
        const ids = premiumTrails.map(t => t.id);
        expect(ids).toContain('rainbow');
        expect(ids).toContain('lightning');
    });

    it('2 swipe trails are free', async () => {
        const { SWIPE_TRAILS } = await import('../utils/trails');
        const freeTrails = SWIPE_TRAILS.filter(t => !t.premium);
        expect(freeTrails).toHaveLength(2);
    });
});

describe('Referral milestones', () => {
    it('has 3 milestone tiers', () => {
        expect(REFERRAL_MILESTONES).toHaveLength(3);
    });

    it('milestones are in ascending count order', () => {
        for (let i = 1; i < REFERRAL_MILESTONES.length; i++) {
            expect(REFERRAL_MILESTONES[i].count).toBeGreaterThan(REFERRAL_MILESTONES[i - 1].count);
        }
    });

    it('milestones have increasing day rewards', () => {
        for (let i = 1; i < REFERRAL_MILESTONES.length; i++) {
            expect(REFERRAL_MILESTONES[i].days).toBeGreaterThan(REFERRAL_MILESTONES[i - 1].days);
        }
    });

    it('milestone thresholds match expected values', () => {
        expect(REFERRAL_MILESTONES[0]).toMatchObject({ count: 3, days: 14 });
        expect(REFERRAL_MILESTONES[1]).toMatchObject({ count: 5, days: 30 });
        expect(REFERRAL_MILESTONES[2]).toMatchObject({ count: 10, days: 90 });
    });

    it('next milestone finder works correctly', () => {
        function nextMilestone(count: number) {
            return REFERRAL_MILESTONES.find(m => count < m.count) ?? null;
        }
        expect(nextMilestone(0)?.count).toBe(3);
        expect(nextMilestone(2)?.count).toBe(3);
        expect(nextMilestone(3)?.count).toBe(5);
        expect(nextMilestone(5)?.count).toBe(10);
        expect(nextMilestone(10)).toBeNull();
        expect(nextMilestone(15)).toBeNull();
    });
});
