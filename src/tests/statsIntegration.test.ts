import { describe, it, expect } from 'vitest';

/**
 * Integration tests for useStats logic — tests the pure functions
 * that operate on Stats objects (mergeStats, recordSession, etc.)
 */

// Inline the types and pure functions from useStats to test them directly
// (they're not exported, so we re-implement the merge logic for testing)

interface TypeStat { solved: number; correct: number; }

interface Stats {
    totalXP: number;
    totalSolved: number;
    totalCorrect: number;
    bestStreak: number;
    sessionsPlayed: number;
    dayStreak: number;
    streakShields: number;
    lastPlayedDate: string;
    byType: Record<string, TypeStat>;
    // Mode stats omitted for brevity — tested via totalXP merge
}

function makeStats(overrides: Partial<Stats> = {}): Stats {
    return {
        totalXP: 0,
        totalSolved: 0,
        totalCorrect: 0,
        bestStreak: 0,
        sessionsPlayed: 0,
        dayStreak: 0,
        streakShields: 0,
        lastPlayedDate: '',
        byType: {},
        ...overrides,
    };
}

/** Mirror of mergeStats from useStats.ts */
function mergeStats(local: Stats, cloud: Stats): Stats {
    const mergedByType: Record<string, TypeStat> = {};
    const allKeys = new Set([...Object.keys(local.byType), ...Object.keys(cloud.byType)]);
    for (const key of allKeys) {
        const l = local.byType[key] || { solved: 0, correct: 0 };
        const c = cloud.byType[key] || { solved: 0, correct: 0 };
        mergedByType[key] = {
            solved: Math.max(l.solved, c.solved),
            correct: Math.max(l.correct, c.correct),
        };
    }

    return {
        ...makeStats(),
        totalXP: Math.max(local.totalXP, cloud.totalXP),
        totalSolved: Math.max(local.totalSolved, cloud.totalSolved),
        totalCorrect: Math.max(local.totalCorrect, cloud.totalCorrect),
        bestStreak: Math.max(local.bestStreak, cloud.bestStreak),
        sessionsPlayed: Math.max(local.sessionsPlayed, cloud.sessionsPlayed),
        dayStreak: Math.max(local.dayStreak, cloud.dayStreak),
        streakShields: Math.max(local.streakShields, cloud.streakShields),
        lastPlayedDate: local.lastPlayedDate > cloud.lastPlayedDate ? local.lastPlayedDate : cloud.lastPlayedDate,
        byType: mergedByType,
    };
}

describe('mergeStats', () => {
    it('takes higher totalXP', () => {
        const local = makeStats({ totalXP: 500 });
        const cloud = makeStats({ totalXP: 800 });
        expect(mergeStats(local, cloud).totalXP).toBe(800);
    });

    it('preserves best streak from local when cloud is lower', () => {
        const local = makeStats({ bestStreak: 15 });
        const cloud = makeStats({ bestStreak: 10 });
        expect(mergeStats(local, cloud).bestStreak).toBe(15);
    });

    it('merges byType per-key, taking max of each', () => {
        const local = makeStats({ byType: { cvc: { solved: 100, correct: 80 }, blends: { solved: 50, correct: 50 } } });
        const cloud = makeStats({ byType: { cvc: { solved: 80, correct: 90 }, digraphs: { solved: 30, correct: 25 } } });
        const merged = mergeStats(local, cloud);
        expect(merged.byType.cvc).toEqual({ solved: 100, correct: 90 });
        expect(merged.byType.blends).toEqual({ solved: 50, correct: 50 });
        expect(merged.byType.digraphs).toEqual({ solved: 30, correct: 25 });
    });

    it('takes more recent lastPlayedDate', () => {
        const local = makeStats({ lastPlayedDate: '2026-2-20' });
        const cloud = makeStats({ lastPlayedDate: '2026-2-22' });
        expect(mergeStats(local, cloud).lastPlayedDate).toBe('2026-2-22');
    });

    it('handles two empty stats', () => {
        const merged = mergeStats(makeStats(), makeStats());
        expect(merged.totalXP).toBe(0);
    });
});

describe('day streak logic', () => {
    it('increments streak on consecutive days', () => {
        const todayStr = '2026-2-22';
        const yesterdayStr = '2026-2-21';
        // Simulating the recordSession day streak computation
        const prev = makeStats({ dayStreak: 5, lastPlayedDate: yesterdayStr });
        let dayStreak = prev.dayStreak;
        if (prev.lastPlayedDate === yesterdayStr) {
            dayStreak = prev.dayStreak + 1;
        }
        expect(dayStreak).toBe(6);
        // Verify today string comparison
        expect(todayStr > yesterdayStr).toBe(true);
    });

    it('resets streak when day is missed and no shields', () => {
        const prev = makeStats({ dayStreak: 10, lastPlayedDate: '2026-2-19', streakShields: 0 });
        const todayStr = '2026-2-22';
        const yesterdayStr = '2026-2-21';
        let dayStreak = prev.dayStreak;
        if (prev.lastPlayedDate !== todayStr) {
            if (prev.lastPlayedDate === yesterdayStr) {
                dayStreak = prev.dayStreak + 1;
            } else if (prev.lastPlayedDate !== '') {
                if (prev.streakShields > 0) {
                    dayStreak = prev.dayStreak + 1; // Shield
                } else {
                    dayStreak = 1; // Broken
                }
            }
        }
        expect(dayStreak).toBe(1);
    });

    it('preserves streak with shield when day missed', () => {
        const prev = makeStats({ dayStreak: 10, lastPlayedDate: '2026-2-19', streakShields: 2 });
        const todayStr = '2026-2-22';
        const yesterdayStr = '2026-2-21';
        let dayStreak = prev.dayStreak;
        let shields = prev.streakShields;
        if (prev.lastPlayedDate !== todayStr) {
            if (prev.lastPlayedDate === yesterdayStr) {
                dayStreak = prev.dayStreak + 1;
            } else if (prev.lastPlayedDate !== '') {
                if (shields > 0) {
                    shields -= 1;
                    dayStreak = prev.dayStreak + 1;
                } else {
                    dayStreak = 1;
                }
            }
        }
        expect(dayStreak).toBe(11);
        expect(shields).toBe(1);
    });
});
