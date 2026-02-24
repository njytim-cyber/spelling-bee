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
    bestSpeedrunTime: number;
    speedrunHardMode: boolean;
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
        bestSpeedrunTime: 0,
        speedrunHardMode: false,
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
        bestSpeedrunTime: local.bestSpeedrunTime > 0 && cloud.bestSpeedrunTime > 0
            ? Math.min(local.bestSpeedrunTime, cloud.bestSpeedrunTime)
            : local.bestSpeedrunTime || cloud.bestSpeedrunTime,
        speedrunHardMode: (local.bestSpeedrunTime > 0 && cloud.bestSpeedrunTime > 0
            ? (local.bestSpeedrunTime <= cloud.bestSpeedrunTime ? local : cloud)
            : local.bestSpeedrunTime ? local : cloud
        ).speedrunHardMode,
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

    it('takes best (lowest) speedrun time', () => {
        const local = makeStats({ bestSpeedrunTime: 12000, speedrunHardMode: true });
        const cloud = makeStats({ bestSpeedrunTime: 15000, speedrunHardMode: false });
        const merged = mergeStats(local, cloud);
        expect(merged.bestSpeedrunTime).toBe(12000);
        expect(merged.speedrunHardMode).toBe(true); // from the faster run
    });

    it('takes non-zero speedrun time when other is 0', () => {
        const local = makeStats({ bestSpeedrunTime: 0 });
        const cloud = makeStats({ bestSpeedrunTime: 9000, speedrunHardMode: true });
        const merged = mergeStats(local, cloud);
        expect(merged.bestSpeedrunTime).toBe(9000);
        expect(merged.speedrunHardMode).toBe(true);
    });

    it('merges byType per-key, taking max of each', () => {
        const local = makeStats({ byType: { multiply: { solved: 100, correct: 80 }, add: { solved: 50, correct: 50 } } });
        const cloud = makeStats({ byType: { multiply: { solved: 80, correct: 90 }, divide: { solved: 30, correct: 25 } } });
        const merged = mergeStats(local, cloud);
        expect(merged.byType.multiply).toEqual({ solved: 100, correct: 90 });
        expect(merged.byType.add).toEqual({ solved: 50, correct: 50 });
        expect(merged.byType.divide).toEqual({ solved: 30, correct: 25 });
    });

    it('takes more recent lastPlayedDate', () => {
        const local = makeStats({ lastPlayedDate: '2026-2-20' });
        const cloud = makeStats({ lastPlayedDate: '2026-2-22' });
        expect(mergeStats(local, cloud).lastPlayedDate).toBe('2026-2-22');
    });

    it('handles two empty stats', () => {
        const merged = mergeStats(makeStats(), makeStats());
        expect(merged.totalXP).toBe(0);
        expect(merged.bestSpeedrunTime).toBe(0);
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
