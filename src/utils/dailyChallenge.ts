/**
 * utils/dailyChallenge.ts
 *
 * Seeded daily and challenge generators for spelling.
 */
import { createSeededRng, dateSeed, stringSeed } from './seededRng';
import { generateSpellingItem } from '../domains/spelling/spellingGenerator';
import type { EngineItem } from '../engine/domain';

const DAILY_CATEGORIES = ['cvc', 'blends', 'digraphs', 'silent-e', 'vowel-teams'];

export type DailyChallengeSize = 10 | 25 | 50;

/**
 * Generate today's daily challenge — same N words for everyone.
 * Uses a date-seeded RNG so every player gets the same set.
 * The first `count` words are deterministic from the same seed,
 * so 10-word and 25-word daily challenges share the first 10 words.
 */
export function generateDailyChallenge(count: DailyChallengeSize = 10): { problems: EngineItem[]; dateLabel: string } {
    const today = new Date();
    const seed = dateSeed(today);
    const rng = createSeededRng(seed);

    const problems: EngineItem[] = [];
    for (let i = 0; i < count; i++) {
        const cat = DAILY_CATEGORIES[Math.floor(rng() * DAILY_CATEGORIES.length)];
        const difficulty = 2 + Math.floor(i / 3);
        problems.push(generateSpellingItem(difficulty, cat, false, rng));
    }
    problems.forEach((p, i) => { p.id = `daily-${seed}-${i}`; });
    return {
        problems,
        dateLabel: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
}

/**
 * Generate a challenge from a seed string (e.g., from a URL param).
 * Same seed → same words for both players.
 */
export function generateChallenge(challengeId: string, count: DailyChallengeSize = 10): EngineItem[] {
    const seed = stringSeed(challengeId);
    const rng = createSeededRng(seed);

    const problems: EngineItem[] = [];
    for (let i = 0; i < count; i++) {
        const cat = DAILY_CATEGORIES[Math.floor(rng() * DAILY_CATEGORIES.length)];
        const difficulty = 2 + Math.floor(i / 3);
        problems.push(generateSpellingItem(difficulty, cat, false, rng));
    }
    problems.forEach((p, i) => { p.id = `challenge-${seed}-${i}`; });
    return problems;
}

/** Create a short challenge ID from current timestamp */
export function createChallengeId(): string {
    return Date.now().toString(36);
}
