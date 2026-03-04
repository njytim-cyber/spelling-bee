/**
 * utils/ranks.ts
 *
 * Rank progression, mastery levels, and cosmetic unlock checks.
 * Shared between MePage (display) and useUnlockTracker (detection).
 */

export interface Rank {
    name: string;
    emoji: string;
    xp: number;
}

/** Ranks with progressive XP thresholds (gets harder to level up) */
export const RANKS: Rank[] = [
    { name: 'Beginner', emoji: '🌱', xp: 0 },
    { name: 'Learner', emoji: '📚', xp: 100 },
    { name: 'Speller', emoji: '🔤', xp: 300 },
    { name: 'Wordsmith', emoji: '✏️', xp: 600 },
    { name: 'Linguist', emoji: '🗣️', xp: 1000 },
    { name: 'Lexicon', emoji: '📖', xp: 1800 },
    { name: 'Word Wizard', emoji: '🧙', xp: 3000 },
    { name: 'Grandmaster', emoji: '♟️', xp: 5000 },
    { name: 'Legend', emoji: '👑', xp: 8000 },
    { name: 'Mythic', emoji: '🌌', xp: 12000 },
    { name: 'Transcendent', emoji: '✨', xp: 20000 },
];

export function getRank(xp: number) {
    let rank = RANKS[0];
    let nextRank: Rank | null = RANKS[1];
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (xp >= RANKS[i].xp) {
            rank = RANKS[i];
            nextRank = RANKS[i + 1] || null;
            break;
        }
    }
    const progress = nextRank
        ? (xp - rank.xp) / (nextRank.xp - rank.xp)
        : 1;
    return { rank, nextRank, progress };
}

/** Mastery levels — post-max-rank infinite progression:
 *  ML1→ML2 costs 25k XP, each subsequent level 10k more. */
const MASTERY_BASE = 25000;
const MASTERY_SCALE = 10000;
const MAX_RANK_XP = 20000;

export function getMasteryInfo(xp: number) {
    if (xp < MAX_RANK_XP) return null;
    let remaining = xp - MAX_RANK_XP;
    let level = 1;
    let levelStartXp = MAX_RANK_XP;
    while (true) {
        const cost = MASTERY_BASE + (level - 1) * MASTERY_SCALE;
        if (remaining < cost) {
            return { level, progress: remaining / cost, xpForNext: levelStartXp + cost };
        }
        remaining -= cost;
        levelStartXp += cost;
        level++;
    }
}

/** Check if a cosmetic item is unlocked based on rank/streak/solved thresholds */
export function checkUnlock(
    rankIdx: number, bestStreak: number, totalSolved: number,
    item: { minLevel?: number; minStreak?: number; minSolved?: number },
): { available: boolean; hint?: string } {
    const rankOk = !item.minLevel || rankIdx >= item.minLevel - 1;
    const streakOk = !item.minStreak || bestStreak >= item.minStreak;
    const solvedOk = !item.minSolved || totalSolved >= item.minSolved;
    const available = rankOk && streakOk && solvedOk;
    const hint = !available
        ? [
            !rankOk && `Reach ${RANKS[(item.minLevel ?? 1) - 1]?.name ?? 'next rank'}`,
            !streakOk && `${item.minStreak}-streak needed`,
            !solvedOk && `Solve ${item.minSolved} words`,
        ].filter(Boolean).join(' · ')
        : undefined;
    return { available, hint };
}
