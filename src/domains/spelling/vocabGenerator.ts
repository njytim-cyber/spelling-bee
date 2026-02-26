/**
 * domains/spelling/vocabGenerator.ts
 *
 * Vocabulary quiz generator: player sees a definition, picks the correct word
 * from 3 options. Matches the Scripps vocabulary component.
 *
 * Distractors are real words (not misspellings) — prefer same difficulty and
 * same part of speech for maximum challenge.
 */
import type { EngineItem } from '../../engine/domain';
import type { SpellingWord, DifficultyTier } from './words/types';
import { getAllWords, wordsByDifficulty, difficultyRange } from './words';

/**
 * Pick 2 distractor WORDS (not misspellings) from the word bank.
 * Prefers words of the same part of speech and similar difficulty.
 */
function pickWordDistractors(
    correct: SpellingWord,
    pool: SpellingWord[],
    rng: () => number,
): SpellingWord[] {
    // Prefer same POS and different word
    const samePOS = pool.filter(
        w => w.word !== correct.word && w.partOfSpeech === correct.partOfSpeech,
    );
    const candidates = samePOS.length >= 2 ? samePOS : pool.filter(w => w.word !== correct.word);

    // Shuffle and pick 2
    const shuffled = [...candidates].sort(() => rng() - 0.5);
    return shuffled.slice(0, 2);
}

/**
 * Generate a vocabulary quiz item.
 * Prompt = definition, options = 3 real words (1 correct + 2 distractors).
 */
export function generateVocabItem(
    difficulty: number,
    category: string,
    hardMode: boolean,
    rng: () => number = Math.random,
): EngineItem {
    const effectiveDifficulty = hardMode ? 5 : difficulty;
    const [minDiff, maxDiff] = difficultyRange(effectiveDifficulty);

    let pool = wordsByDifficulty(minDiff as DifficultyTier, maxDiff as DifficultyTier);
    if (pool.length < 3) pool = getAllWords();

    const correct = pool[Math.floor(rng() * pool.length)];
    const distractors = pickWordDistractors(correct, pool, rng);

    // Build 3 word options, shuffled
    const options = [correct.word, ...distractors.map(d => d.word)].sort(() => rng() - 0.5);
    const correctIndex = options.indexOf(correct.word);

    return {
        id: `vocab-${correct.word}-${Date.now()}-${Math.floor(rng() * 1e6)}`,
        prompt: correct.definition,
        answer: correct.word,
        options,
        correctIndex,
        meta: {
            mode: 'vocab',
            word: correct.word,
            category,
            hardMode,
            definition: correct.definition,
            exampleSentence: correct.exampleSentence,
            pronunciation: correct.pronunciation,
            partOfSpeech: correct.partOfSpeech,
            pattern: correct.pattern,
            difficulty: correct.difficulty,
            ...(correct.etymology ? { etymology: correct.etymology } : {}),
        },
    };
}
