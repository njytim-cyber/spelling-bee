/**
 * words/index.ts
 *
 * Re-exports word types and provides lookup utilities.
 * Backed by the dynamic registry — tier 1-2 are always available,
 * tier 3-5 load on demand via ensureAllTiers().
 */
import type { SpellingWord, PhonicsPattern, DifficultyTier, SemanticTheme } from './types';
import { getLoadedWords } from './registry';
import { extractLanguage, type LanguageOfOrigin } from '../../../utils/etymologyParser';

export type { SpellingWord, PhonicsPattern, DifficultyTier, PartOfSpeech, SemanticTheme, Dialect, WotcTier } from './types';
export { ensureAllTiers, getRegistryVersion, loadCompetitionPack, getDialect, setDialect, resolveUsKey } from './registry';

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

/** Get words matching a specific semantic theme. */
export function wordsByTheme(theme: SemanticTheme): SpellingWord[] {
    return getLoadedWords().filter(w => w.theme === theme);
}

/** Get words matching BOTH a theme AND a difficulty range. */
export function wordsByThemeAndDifficulty(
    theme: SemanticTheme,
    min: DifficultyTier,
    max: DifficultyTier,
): SpellingWord[] {
    return getLoadedWords().filter(w =>
        w.theme === theme && w.difficulty >= min && w.difficulty <= max,
    );
}

/** Build a word-keyed lookup map from currently loaded words. */
export function getWordMap(): Map<string, SpellingWord> {
    const map = new Map<string, SpellingWord>();
    for (const w of getLoadedWords()) {
        map.set(w.word, w);
    }
    return map;
}

/** Get words whose etymology matches a specific language of origin. */
export function wordsByLanguageOfOrigin(lang: LanguageOfOrigin): SpellingWord[] {
    return getLoadedWords().filter(w => extractLanguage(w.etymology) === lang);
}

/** Get words matching BOTH a language of origin AND a difficulty range. */
export function wordsByLanguageAndDifficulty(
    lang: LanguageOfOrigin,
    min: DifficultyTier,
    max: DifficultyTier,
): SpellingWord[] {
    return getLoadedWords().filter(w =>
        extractLanguage(w.etymology) === lang &&
        w.difficulty >= min &&
        w.difficulty <= max,
    );
}

/** Map difficulty to Scripps WOTC tier: ≤2 → One Bee, ≤6 → Two Bee, ≤10 → Three Bee */
export function getWotcTier(difficulty: number): import('./types').WotcTier {
    if (difficulty <= 2) return 'one-bee';
    if (difficulty <= 6) return 'two-bee';
    return 'three-bee';
}

/** Get words matching a WOTC tier. */
export function wordsByWotcTier(tier: import('./types').WotcTier): SpellingWord[] {
    const ranges: Record<string, [DifficultyTier, DifficultyTier]> = {
        'one-bee': [1, 2],
        'two-bee': [3, 6],
        'three-bee': [7, 10],
    };
    const [min, max] = ranges[tier];
    return wordsByDifficulty(min, max);
}
