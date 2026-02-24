/**
 * words/index.ts
 *
 * Re-exports word types and provides lookup utilities.
 * Backed by the dynamic registry — tier 1-2 are always available,
 * tier 3-5 load on demand via ensureTiersForBand().
 */
import type { SpellingWord, PhonicsPattern, DifficultyTier } from './types';
import { getLoadedWords } from './registry';

export type { SpellingWord, PhonicsPattern, DifficultyTier, PartOfSpeech } from './types';
export { ensureTiersForBand, getRegistryVersion, loadCompetitionPack } from './registry';

/** Every word currently loaded in the registry. */
export function getAllWords(): SpellingWord[] {
    return getLoadedWords();
}

/**
 * @deprecated Use getAllWords() instead. Kept for backward compat.
 * Returns a snapshot of currently loaded words (not live).
 */
export const ALL_WORDS: SpellingWord[] = getLoadedWords();

/** Get words matching a specific phonics pattern. */
export function wordsByPattern(pattern: PhonicsPattern): SpellingWord[] {
    return getLoadedWords().filter(w => w.pattern === pattern || w.secondaryPatterns?.includes(pattern));
}

/** Get words within a difficulty range (inclusive). */
export function wordsByDifficulty(min: DifficultyTier, max: DifficultyTier): SpellingWord[] {
    return getLoadedWords().filter(w => w.difficulty >= min && w.difficulty <= max);
}

/** Get words matching BOTH a pattern AND a difficulty range. */
export function wordsByPatternAndDifficulty(
    pattern: PhonicsPattern,
    min: DifficultyTier,
    max: DifficultyTier,
): SpellingWord[] {
    return getLoadedWords().filter(w =>
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
