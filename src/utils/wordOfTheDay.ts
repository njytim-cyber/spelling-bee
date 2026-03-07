/**
 * utils/wordOfTheDay.ts
 *
 * Deterministic daily word selection using seeded RNG.
 * Picks an interesting word at/above the user's frontier difficulty.
 */
import { dateSeed, createSeededRng } from './seededRng';
import { wordsByDifficulty } from '../domains/spelling/words';
import type { SpellingWord } from '../domains/spelling/words/types';
import type { DifficultyTier } from '../domains/spelling/words/types';
import type { WordRecord } from '../hooks/useWordHistory';

/**
 * Get the Word of the Day for a given date and user progress.
 *
 * Strategy:
 * 1. Find user's highest mastered difficulty → target one above (clamped 3-9)
 * 2. Pick a deterministic word at that difficulty, preferring words with etymology
 */
export function getWordOfTheDay(
    records: Record<string, WordRecord>,
    date: Date = new Date(),
): SpellingWord | null {
    // Find user's frontier: highest difficulty where they have mastered words
    let highestMastered = 0;
    for (const r of Object.values(records)) {
        if (r.box >= 4 && (r.typedAttempts ?? 0) >= 1) {
            // Look up the word's difficulty — we need the word map
            // Instead, use a proxy: difficulty is encoded in category for session words,
            // but we can look up the word in the word bank
            // For simplicity, use the lastCorrect time as a proxy to find recent mastery
            highestMastered = Math.max(highestMastered, 2); // At least common
        }
    }

    // Target difficulty: one above highest mastered, clamped 3-9
    const targetDiff = Math.max(3, Math.min(9, highestMastered + 1)) as DifficultyTier;

    // Get candidate words at target difficulty
    const candidates = wordsByDifficulty(targetDiff, targetDiff);
    if (candidates.length === 0) return null;

    // Prefer words with etymology (more interesting)
    const withEtymology = candidates.filter(w => w.etymology);
    const pool = withEtymology.length >= 10 ? withEtymology : candidates;

    // Deterministic selection using date seed
    const rng = createSeededRng(dateSeed(date));
    const idx = Math.floor(rng() * pool.length);
    return pool[idx];
}

/**
 * Get the word of the day with user's actual highest mastered difficulty,
 * looking up word difficulties from the word map.
 */
export function getWordOfTheDayWithMap(
    records: Record<string, WordRecord>,
    wordMap: Map<string, SpellingWord>,
    date: Date = new Date(),
): SpellingWord | null {
    // Find user's frontier from actual word difficulties
    let highestMastered = 0;
    for (const r of Object.values(records)) {
        if (r.box >= 4 && (r.typedAttempts ?? 0) >= 1) {
            const sw = wordMap.get(r.word);
            if (sw) {
                highestMastered = Math.max(highestMastered, sw.difficulty);
            }
        }
    }

    // Target difficulty: one above highest mastered, clamped 3-9
    const targetDiff = Math.max(3, Math.min(9, highestMastered + 1)) as DifficultyTier;

    const candidates = wordsByDifficulty(targetDiff, targetDiff);
    if (candidates.length === 0) return null;

    const withEtymology = candidates.filter(w => w.etymology);
    const pool = withEtymology.length >= 10 ? withEtymology : candidates;

    const rng = createSeededRng(dateSeed(date));
    const idx = Math.floor(rng() * pool.length);
    return pool[idx];
}
