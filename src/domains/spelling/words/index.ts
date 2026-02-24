/**
 * words/index.ts
 *
 * Re-exports all word tiers and provides lookup utilities.
 * The dataset is small (750 words) so linear .filter() is fine.
 */
import type { SpellingWord, PhonicsPattern, DifficultyTier } from './types';
import { TIER_1_WORDS } from './tier1';
import { TIER_2_WORDS } from './tier2';
import { TIER_3_WORDS } from './tier3';
import { TIER_4_WORDS } from './tier4';
import { TIER_5_WORDS } from './tier5';

export type { SpellingWord, PhonicsPattern, DifficultyTier, PartOfSpeech } from './types';

/** Every word in the bank, combined from all tiers. */
export const ALL_WORDS: SpellingWord[] = [
    ...TIER_1_WORDS,
    ...TIER_2_WORDS,
    ...TIER_3_WORDS,
    ...TIER_4_WORDS,
    ...TIER_5_WORDS,
];

/** Get words matching a specific phonics pattern. */
export function wordsByPattern(pattern: PhonicsPattern): SpellingWord[] {
    return ALL_WORDS.filter(w => w.pattern === pattern || w.secondaryPatterns?.includes(pattern));
}

/** Get words within a difficulty range (inclusive). */
export function wordsByDifficulty(min: DifficultyTier, max: DifficultyTier): SpellingWord[] {
    return ALL_WORDS.filter(w => w.difficulty >= min && w.difficulty <= max);
}

/** Get words matching BOTH a pattern AND a difficulty range. */
export function wordsByPatternAndDifficulty(
    pattern: PhonicsPattern,
    min: DifficultyTier,
    max: DifficultyTier,
): SpellingWord[] {
    return ALL_WORDS.filter(w =>
        (w.pattern === pattern || w.secondaryPatterns?.includes(pattern)) &&
        w.difficulty >= min &&
        w.difficulty <= max,
    );
}

/**
 * Maps adaptive difficulty level (1-5 from useDifficulty) to a word
 * difficulty range [min, max] inclusive.
 */
export function difficultyRange(level: number): [DifficultyTier, DifficultyTier] {
    switch (level) {
        case 1: return [1, 2];
        case 2: return [1, 4];
        case 3: return [3, 6];
        case 4: return [5, 8];
        case 5: return [7, 10];
        default: return [1, 4];
    }
}

/** Maximum word difficulty allowed per age band. */
export const BAND_DIFFICULTY_CAP: Record<string, DifficultyTier> = {
    starter: 4,
    rising: 7,
    sigma: 10,
};
