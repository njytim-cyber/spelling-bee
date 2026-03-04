/**
 * words/index.ts
 *
 * Re-exports word types and provides lookup utilities.
 * Backed by the dynamic registry — tier 1-2 are always available,
 * tier 3-5 load on demand via ensureAllWords().
 *
 * Pattern and theme lookups use cached indexes (O(1) via Map)
 * that are lazily built and auto-invalidated on tier/dialect changes.
 */
import type { SpellingWord, PhonicsPattern, DifficultyTier, SemanticTheme } from './types';
import { getLoadedWords, getCachedWordMap, getCachedByPattern, getCachedByTheme, getCachedByDifficulty } from './registry';
import { extractLanguage, type LanguageOfOrigin } from '../../../utils/etymologyParser';

export type { SpellingWord, PhonicsPattern, DifficultyTier, PartOfSpeech, SemanticTheme, Dialect } from './types';
export { ensureAllWords, ensurePipelineWords, getRegistryVersion, getDialect, setDialect, resolveUsKey } from './registry';
export { getRootsForWord, formatRootHint, highlightRoot, rootFragments, computeRootMastery } from './rootUtils';
export type { RootMasteryEntry } from './rootUtils';

/** Every word currently loaded in the registry. */
export function getAllWords(): SpellingWord[] {
    return getLoadedWords();
}

/** Get words matching a specific phonics pattern. Uses cached index. */
export function wordsByPattern(pattern: PhonicsPattern): SpellingWord[] {
    return getCachedByPattern(pattern);
}

/** Get words within a difficulty range (inclusive). Uses cached index. */
export function wordsByDifficulty(min: DifficultyTier, max: DifficultyTier): SpellingWord[] {
    return getCachedByDifficulty(min, max);
}

/** Get words matching BOTH a pattern AND a difficulty range. Uses cached index + filter. */
export function wordsByPatternAndDifficulty(
    pattern: PhonicsPattern,
    min: DifficultyTier,
    max: DifficultyTier,
): SpellingWord[] {
    return getCachedByPattern(pattern).filter(w =>
        w.difficulty >= min && w.difficulty <= max,
    );
}

/**
 * Maps adaptive difficulty level (1-10 from useDifficulty) to a word
 * difficulty range [min, max] inclusive. Centered 3-wide window around
 * the target level for variety while staying close.
 */
export function difficultyRange(level: number): [DifficultyTier, DifficultyTier] {
    const clamped = Math.max(1, Math.min(10, Math.round(level)));
    const min = Math.max(1, clamped - 1) as DifficultyTier;
    const max = Math.min(10, clamped + 1) as DifficultyTier;
    return [min, max];
}

/** Get words matching a specific semantic theme. Uses cached index. */
export function wordsByTheme(theme: SemanticTheme): SpellingWord[] {
    return getCachedByTheme(theme);
}

/** Get words matching BOTH a theme AND a difficulty range. Uses cached index + filter. */
export function wordsByThemeAndDifficulty(
    theme: SemanticTheme,
    min: DifficultyTier,
    max: DifficultyTier,
): SpellingWord[] {
    return getCachedByTheme(theme).filter(w =>
        w.difficulty >= min && w.difficulty <= max,
    );
}

/** Cached word-keyed lookup map. Reuses registry index — no allocation per call. */
export function getWordMap(): Map<string, SpellingWord> {
    return getCachedWordMap();
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

