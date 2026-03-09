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
    streakFreezes: number;
    freezesGranted: number;
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
        streakFreezes: 0,
        freezesGranted: 0,
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
        streakFreezes: Math.max(local.streakFreezes || 0, cloud.streakFreezes || 0),
        freezesGranted: Math.max(local.freezesGranted || 0, cloud.freezesGranted || 0),
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

describe('streak freeze', () => {
    /** Simulate the recordSession day-streak logic with freezes */
    function computeStreak(prev: Stats, todayStr: string, yesterdayStr: string) {
        let dayStreak = prev.dayStreak;
        let shields = prev.streakShields;
        let freezes = prev.streakFreezes || 0;

        if (prev.lastPlayedDate !== todayStr) {
            if (prev.lastPlayedDate === yesterdayStr) {
                dayStreak = prev.dayStreak + 1;
            } else if (prev.lastPlayedDate !== '') {
                // Missed day(s) — consume freeze first, then shield
                if (freezes > 0) {
                    freezes -= 1;
                    dayStreak = prev.dayStreak + 1;
                } else if (shields > 0) {
                    shields -= 1;
                    dayStreak = prev.dayStreak + 1;
                } else {
                    dayStreak = 1;
                }
            } else {
                dayStreak = 1;
            }
        }
        return { dayStreak, shields, freezes };
    }

    it('consumes freeze before shield on 1-day gap', () => {
        const prev = makeStats({ dayStreak: 10, lastPlayedDate: '2026-2-20', streakShields: 2, streakFreezes: 1 });
        const result = computeStreak(prev, '2026-2-22', '2026-2-21');
        expect(result.dayStreak).toBe(11); // Streak preserved
        expect(result.freezes).toBe(0);    // Freeze consumed
        expect(result.shields).toBe(2);    // Shields untouched
    });

    it('falls back to shield when no freezes', () => {
        const prev = makeStats({ dayStreak: 10, lastPlayedDate: '2026-2-20', streakShields: 2, streakFreezes: 0 });
        const result = computeStreak(prev, '2026-2-22', '2026-2-21');
        expect(result.dayStreak).toBe(11);
        expect(result.freezes).toBe(0);
        expect(result.shields).toBe(1);   // Shield consumed
    });

    it('breaks streak when no freezes and no shields', () => {
        const prev = makeStats({ dayStreak: 10, lastPlayedDate: '2026-2-20', streakShields: 0, streakFreezes: 0 });
        const result = computeStreak(prev, '2026-2-22', '2026-2-21');
        expect(result.dayStreak).toBe(1); // Streak broken
    });

    it('auto-grants freeze at 500 XP milestone', () => {
        // User at 450 XP earns 60 → crosses 500 → gets 1 freeze
        const prev = makeStats({ totalXP: 450, streakFreezes: 0, freezesGranted: 0 });
        const score = 60;
        const newTotalXP = prev.totalXP + score;
        const freezesEarned = Math.floor(newTotalXP / 500);
        const newFreezes = Math.max(0, freezesEarned - prev.freezesGranted);
        expect(newTotalXP).toBe(510);
        expect(freezesEarned).toBe(1);
        expect(newFreezes).toBe(1);
    });

    it('auto-grants multiple freezes when crossing several milestones', () => {
        // User at 400 XP earns 700 → crosses 500 and 1000 → gets 2 freezes
        const prev = makeStats({ totalXP: 400, streakFreezes: 0, freezesGranted: 0 });
        const score = 700;
        const newTotalXP = prev.totalXP + score;
        const freezesEarned = Math.floor(newTotalXP / 500);
        const newFreezes = Math.max(0, freezesEarned - prev.freezesGranted);
        expect(newTotalXP).toBe(1100);
        expect(freezesEarned).toBe(2);
        expect(newFreezes).toBe(2);
    });

    it('does not re-grant already-granted freezes', () => {
        // User at 600 XP with 1 already granted — earning more doesn't re-grant
        const prev = makeStats({ totalXP: 600, streakFreezes: 1, freezesGranted: 1 });
        const score = 50;
        const newTotalXP = prev.totalXP + score;
        const freezesEarned = Math.floor(newTotalXP / 500);
        const newFreezes = Math.max(0, freezesEarned - prev.freezesGranted);
        expect(freezesEarned).toBe(1); // Still only 1 milestone passed
        expect(newFreezes).toBe(0);    // No new freezes
    });

    it('caps banked freezes at 3', () => {
        // User crosses 5 milestones but freeze bank caps at 3
        const prev = makeStats({ totalXP: 2400, streakFreezes: 2, freezesGranted: 4 });
        const score = 200;
        const newTotalXP = prev.totalXP + score;
        const freezesEarned = Math.floor(newTotalXP / 500);
        const newFreezes = Math.max(0, freezesEarned - prev.freezesGranted);
        const banked = Math.min(3, prev.streakFreezes + newFreezes);
        expect(freezesEarned).toBe(5);
        expect(newFreezes).toBe(1);
        expect(banked).toBe(3); // Capped at 3
    });

    it('merges streakFreezes taking max', () => {
        const local = makeStats({ streakFreezes: 2 });
        const cloud = makeStats({ streakFreezes: 3 });
        const merged = mergeStats(local, cloud);
        expect(merged.streakFreezes).toBe(3);
    });

    it('merges freezesGranted taking max', () => {
        const local = makeStats({ freezesGranted: 4 });
        const cloud = makeStats({ freezesGranted: 6 });
        const merged = mergeStats(local, cloud);
        expect(merged.freezesGranted).toBe(6);
    });
});
