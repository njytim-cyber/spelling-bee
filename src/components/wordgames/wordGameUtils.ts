/**
 * Shared utilities for word games.
 */
import type { SpellingWord, DifficultyTier, SemanticTheme } from '../../domains/spelling/words';
import { wordsByDifficulty, wordsByThemeAndDifficulty, wordsByTheme, difficultyRange } from '../../domains/spelling/words';

/** Fisher-Yates shuffle (in-place, returns same array). */
export function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/** Length ranges for anagram difficulty levels. */
const ANAGRAM_LENGTH: Record<string, [number, number]> = {
    easy:   [3, 5],
    medium: [5, 7],
    hard:   [7, 20],
};

/** Pick words for anagrams with difficulty-based length filtering.
 * Easy = 3-5 letters, Medium = 5-7, Hard = 7+. */
export function pickAnagramWords(level: number, count: number, difficulty: string): SpellingWord[] {
    const [minLen, maxLen] = ANAGRAM_LENGTH[difficulty] ?? [3, 20];
    // Use broader difficulty range for more variety
    const minDiff = Math.max(1, level - 2) as DifficultyTier;
    const maxDiff = Math.min(10, level + 2) as DifficultyTier;
    let pool = wordsByDifficulty(minDiff, maxDiff).filter(w => w.word.length >= minLen && w.word.length <= maxLen);
    // Widen further if not enough words
    if (pool.length < count) {
        pool = wordsByDifficulty(1 as DifficultyTier, 10 as DifficultyTier).filter(w => w.word.length >= minLen && w.word.length <= maxLen);
    }
    if (pool.length === 0) return [];
    const shuffled = shuffle([...pool]);
    const seen = new Set<string>();
    const result: SpellingWord[] = [];
    for (const w of shuffled) {
        if (seen.has(w.word)) continue;
        seen.add(w.word);
        result.push(w);
        if (result.length >= count) break;
    }
    return result;
}

/** Pick `count` random words at the user's difficulty level.
 * Filters for words with 3+ letters and unique words only. */
export function pickWords(level: number, count: number): SpellingWord[] {
    const [min, max] = difficultyRange(level);
    let pool = wordsByDifficulty(min, max).filter(w => w.word.length >= 3);
    // Fall back to wider range if pool too small
    if (pool.length < count) {
        const wideMin = Math.max(1, min - 1) as DifficultyTier;
        const wideMax = Math.min(10, max + 1) as DifficultyTier;
        pool = wordsByDifficulty(wideMin, wideMax).filter(w => w.word.length >= 3);
    }
    if (pool.length === 0) return [];
    const shuffled = shuffle([...pool]);
    // Deduplicate
    const seen = new Set<string>();
    const result: SpellingWord[] = [];
    for (const w of shuffled) {
        if (seen.has(w.word)) continue;
        seen.add(w.word);
        result.push(w);
        if (result.length >= count) break;
    }
    return result;
}

/** Pick words with progressively increasing difficulty. */
export function pickProgressiveWords(startLevel: number, count: number, increment = 0.3): SpellingWord[] {
    const result: SpellingWord[] = [];
    const used = new Set<string>();
    for (let i = 0; i < count; i++) {
        const lvl = Math.min(10, startLevel + i * increment);
        const diff = Math.round(lvl) as DifficultyTier;
        const clampedDiff = Math.max(1, Math.min(10, diff)) as DifficultyTier;
        const pool = wordsByDifficulty(clampedDiff, clampedDiff).filter(w => !used.has(w.word) && w.word.length >= 3);
        if (pool.length === 0) continue;
        const w = pool[Math.floor(Math.random() * pool.length)];
        used.add(w.word);
        result.push(w);
    }
    return result;
}

/** Pick themed words for crossword puzzles (3-7 letters).
 *  Fallback chain: theme+difficulty → theme-only → pad with general words. */
export function pickThemedCrosswordWords(
    level: number,
    theme: SemanticTheme,
    count: number,
): { words: SpellingWord[]; pureTheme: boolean } {
    const minDiff = Math.max(1, level - 3) as DifficultyTier;
    const maxDiff = Math.min(10, level + 1) as DifficultyTier;
    const lenFilter = (w: SpellingWord) => w.word.length >= 3 && w.word.length <= 7;

    // Step 1: Theme + difficulty
    let pool = wordsByThemeAndDifficulty(theme, minDiff, maxDiff).filter(lenFilter);
    // Step 2: Widen to any difficulty for this theme
    if (pool.length < count) {
        pool = wordsByTheme(theme).filter(lenFilter);
    }

    const seen = new Set<string>();
    const result: SpellingWord[] = [];
    for (const w of shuffle([...pool])) {
        if (seen.has(w.word)) continue;
        seen.add(w.word);
        result.push(w);
        if (result.length >= count) break;
    }
    const pureTheme = result.length >= count;

    // Step 3: Pad from general pool if needed
    if (result.length < count) {
        const general = wordsByDifficulty(minDiff, maxDiff).filter(w => lenFilter(w) && !seen.has(w.word));
        for (const w of shuffle([...general])) {
            if (seen.has(w.word)) continue;
            seen.add(w.word);
            result.push(w);
            if (result.length >= count) break;
        }
    }

    return { words: result, pureTheme };
}

/** Scramble a word, ensuring the result differs from the original. */
export function scrambleWord(word: string): string {
    const letters = word.split('');
    for (let attempt = 0; attempt < 20; attempt++) {
        shuffle(letters);
        if (letters.join('') !== word) return letters.join('');
    }
    return letters.reverse().join('');
}

/** Format seconds as m:ss */
export function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Get high score from localStorage */
export function getHighScore(gameId: string): number {
    try {
        const val = localStorage.getItem(`wordGames_${gameId}_highScore`);
        return val ? parseInt(val, 10) || 0 : 0;
    } catch {
        return 0;
    }
}

/** Save high score to localStorage (only if higher). Returns true if new record.
 *  Also marks the game as played for the current session. */
export function saveHighScore(gameId: string, score: number): boolean {
    // Mark as played this session (for "played today" indicator)
    try { sessionStorage.setItem(`wordGames_${gameId}_played`, '1'); } catch { /* quota */ }
    const prev = getHighScore(gameId);
    if (score > prev) {
        try { localStorage.setItem(`wordGames_${gameId}_highScore`, String(score)); } catch { /* quota */ }
        return true;
    }
    return false;
}

/** XP feedback messages for different score ranges. */
export function xpFeedback(xp: number): string {
    if (xp >= 100) return 'Incredible!';
    if (xp >= 60) return 'Amazing!';
    if (xp >= 30) return 'Great job!';
    if (xp >= 10) return 'Nice work!';
    return 'Good try!';
}
