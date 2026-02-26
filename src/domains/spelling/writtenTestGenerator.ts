/**
 * domains/spelling/writtenTestGenerator.ts
 *
 * Generates a mock Scripps Round 3 written test:
 * 28 spelling questions + 12 vocabulary questions = 40 total.
 * Each question has 4 multiple-choice options.
 */
import type { SpellingWord, DifficultyTier } from './words/types';
import { wordsByDifficulty, getAllWords, difficultyRange } from './words';

export interface WrittenTestQuestion {
    id: string;
    type: 'spelling' | 'vocabulary';
    /** The prompt shown to the player */
    prompt: string;
    /** 4 answer options */
    options: string[];
    /** Index of the correct option (0-3) */
    correctIndex: number;
    /** The underlying word object */
    word: SpellingWord;
}

export interface WrittenTest {
    questions: WrittenTestQuestion[];
    timeLimitMs: number;
    difficulty: number;
}

/**
 * Generate a complete 40-question written test.
 * @param difficulty 1-5 adaptive difficulty level
 * @param rng Optional seeded random for reproducibility
 */
export function generateWrittenTest(
    difficulty: number,
    rng: () => number = Math.random,
): WrittenTest {
    const [minDiff, maxDiff] = difficultyRange(difficulty);
    let pool = wordsByDifficulty(minDiff as DifficultyTier, maxDiff as DifficultyTier);
    if (pool.length < 40) pool = getAllWords();

    // Shuffle and pick 40 unique words
    const shuffled = [...pool].sort(() => rng() - 0.5);
    const selected = shuffled.slice(0, 40);

    // Split: first 28 = spelling, last 12 = vocabulary
    const spellingWords = selected.slice(0, 28);
    const vocabWords = selected.slice(28, 40);

    const questions: WrittenTestQuestion[] = [];

    // Spelling questions: "Which is spelled correctly?"
    for (let i = 0; i < spellingWords.length; i++) {
        const w = spellingWords[i];
        const distractors = (w.distractors ?? []).slice(0, 3);
        // Pad with simple mutations if not enough distractors
        while (distractors.length < 3) {
            const mutated = simpleDistractor(w.word, rng);
            if (!distractors.includes(mutated) && mutated !== w.word) {
                distractors.push(mutated);
            }
        }
        const options = [w.word, ...distractors.slice(0, 3)].sort(() => rng() - 0.5);
        questions.push({
            id: `wt-spell-${i}`,
            type: 'spelling',
            prompt: w.definition,
            options,
            correctIndex: options.indexOf(w.word),
            word: w,
        });
    }

    // Vocabulary questions: "Which word means...?"
    for (let i = 0; i < vocabWords.length; i++) {
        const w = vocabWords[i];
        // Pick 3 distractor WORDS from the pool
        const otherWords = pool
            .filter(p => p.word !== w.word)
            .sort(() => rng() - 0.5)
            .slice(0, 3);
        const options = [w.word, ...otherWords.map(o => o.word)].sort(() => rng() - 0.5);
        questions.push({
            id: `wt-vocab-${i}`,
            type: 'vocabulary',
            prompt: w.definition,
            options,
            correctIndex: options.indexOf(w.word),
            word: w,
        });
    }

    return {
        questions,
        timeLimitMs: 15 * 60 * 1000, // 15 minutes
        difficulty,
    };
}

/** Simple distractor fallback: swap a vowel or double a letter */
function simpleDistractor(word: string, rng: () => number): string {
    const vowels = 'aeiou';
    const chars = word.split('');
    if (rng() < 0.5) {
        // Swap a vowel
        const vowelIdxs = chars.map((c, i) => vowels.includes(c) ? i : -1).filter(i => i >= 0);
        if (vowelIdxs.length > 0) {
            const idx = vowelIdxs[Math.floor(rng() * vowelIdxs.length)];
            const replacement = vowels[Math.floor(rng() * vowels.length)];
            if (replacement !== chars[idx]) {
                chars[idx] = replacement;
                return chars.join('');
            }
        }
    }
    // Double a random letter
    const idx = Math.floor(rng() * chars.length);
    chars.splice(idx, 0, chars[idx]);
    return chars.join('');
}
