import { describe, it, expect } from 'vitest';
import { getRank, getMasteryInfo, checkUnlock, RANKS } from '../utils/ranks';

describe('getRank', () => {
    it('returns Beginner for 0 XP', () => {
        const { rank, nextRank, progress } = getRank(0);
        expect(rank.name).toBe('Beginner');
        expect(nextRank?.name).toBe('Learner');
        expect(progress).toBe(0);
    });

    it('returns Learner at 100 XP', () => {
        const { rank, nextRank } = getRank(100);
        expect(rank.name).toBe('Learner');
        expect(nextRank?.name).toBe('Speller');
    });

    it('computes progress within a rank', () => {
        // Learner: 100-300 XP. At 200 XP → 50% progress
        const { progress } = getRank(200);
        expect(progress).toBeCloseTo(0.5);
    });

    it('returns max rank at 20000 XP', () => {
        const { rank, nextRank, progress } = getRank(20000);
        expect(rank.name).toBe('Transcendent');
        expect(nextRank).toBeNull();
        expect(progress).toBe(1);
    });

    it('returns max rank for XP beyond top threshold', () => {
        const { rank, nextRank } = getRank(999999);
        expect(rank.name).toBe('Transcendent');
        expect(nextRank).toBeNull();
    });

    it('rank boundaries are exact', () => {
        // Just below Legend threshold (8000)
        expect(getRank(7999).rank.name).toBe('Grandmaster');
        expect(getRank(8000).rank.name).toBe('Legend');
    });

    it('handles all rank transitions', () => {
        for (let i = 0; i < RANKS.length; i++) {
            const { rank } = getRank(RANKS[i].xp);
            expect(rank.name).toBe(RANKS[i].name);
        }
    });
});

describe('getMasteryInfo', () => {
    it('returns null below max rank XP', () => {
        expect(getMasteryInfo(19999)).toBeNull();
    });

    it('returns level 1 at max rank XP', () => {
        const info = getMasteryInfo(20000);
        expect(info).not.toBeNull();
        expect(info!.level).toBe(1);
        expect(info!.progress).toBe(0);
    });

    it('ML1 → ML2 costs 25k XP (at 45000 total)', () => {
        const info = getMasteryInfo(45000);
        expect(info).not.toBeNull();
        expect(info!.level).toBe(2);
    });

    it('progress is computed within mastery level', () => {
        // ML1 costs 25k: 20000 + 12500 = halfway
        const info = getMasteryInfo(32500);
        expect(info!.level).toBe(1);
        expect(info!.progress).toBeCloseTo(0.5);
    });

    it('ML2 → ML3 costs 35k XP (25k + 10k scaling)', () => {
        // ML1: 20k-45k (25k), ML2: 45k-80k (35k)
        const info = getMasteryInfo(80000);
        expect(info!.level).toBe(3);
    });
});

describe('checkUnlock', () => {
    it('all conditions met → available', () => {
        const result = checkUnlock(5, 20, 100, { minLevel: 3, minStreak: 10, minSolved: 50 });
        expect(result.available).toBe(true);
        expect(result.hint).toBeUndefined();
    });

    it('rank too low → not available with hint', () => {
        const result = checkUnlock(1, 20, 100, { minLevel: 5 });
        expect(result.available).toBe(false);
        expect(result.hint).toContain('Reach');
    });

    it('streak too low → not available with hint', () => {
        const result = checkUnlock(5, 3, 100, { minStreak: 10 });
        expect(result.available).toBe(false);
        expect(result.hint).toContain('streak');
    });

    it('solved too low → not available with hint', () => {
        const result = checkUnlock(5, 20, 10, { minSolved: 100 });
        expect(result.available).toBe(false);
        expect(result.hint).toContain('Solve');
    });

    it('no requirements → always available', () => {
        const result = checkUnlock(0, 0, 0, {});
        expect(result.available).toBe(true);
    });

    it('multiple failures shown in hint', () => {
        const result = checkUnlock(0, 0, 0, { minLevel: 5, minStreak: 10, minSolved: 100 });
        expect(result.available).toBe(false);
        expect(result.hint).toContain('·');
    });
});
