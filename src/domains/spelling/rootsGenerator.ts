/**
 * domains/spelling/rootsGenerator.ts
 *
 * Generates quiz items for word roots practice.
 * Two quiz types:
 *   1. Root-to-Word: "Which word contains 'bio' (life)?" → pick from 3 words
 *   2. Word-to-Root: "The root 'tele' in 'telephone' means?" → pick from 3 meanings
 */
import type { EngineItem } from '../../engine/domain';
import { WORD_ROOTS, type WordRoot } from './words/roots';

/**
 * Generate a single root quiz item.
 * Randomly alternates between root-to-word and word-to-root.
 */
export function generateRootQuizItem(
    _difficulty: number,
    _category: string,
    _hardMode: boolean,
    rng: () => number = Math.random,
): EngineItem {
    if (WORD_ROOTS.length < 4) {
        throw new Error('Need at least 4 word roots for quiz generation');
    }

    const isRootToWord = rng() < 0.5;

    // Pick a random root
    const rootIdx = Math.floor(rng() * WORD_ROOTS.length);
    const root = WORD_ROOTS[rootIdx];

    if (isRootToWord) {
        return generateRootToWord(root, rng);
    } else {
        return generateWordToRoot(root, rng);
    }
}

function generateRootToWord(root: WordRoot, rng: () => number): EngineItem {
    // Correct answer: a random example word from this root
    const correctWord = root.examples[Math.floor(rng() * root.examples.length)];

    // Distractor words: pick from other roots' examples
    const otherRoots = WORD_ROOTS.filter(r => r.root !== root.root);
    const shuffledOthers = [...otherRoots].sort(() => rng() - 0.5);
    const distractorWords: string[] = [];
    for (const other of shuffledOthers) {
        if (distractorWords.length >= 2) break;
        const w = other.examples[Math.floor(rng() * other.examples.length)];
        if (w !== correctWord && !distractorWords.includes(w)) {
            distractorWords.push(w);
        }
    }

    const options = [correctWord, ...distractorWords].sort(() => rng() - 0.5);

    return {
        id: `roots-r2w-${root.root}-${Date.now()}-${Math.floor(rng() * 1e6)}`,
        prompt: `Which word contains "${root.root}" (${root.meaning})?`,
        answer: correctWord,
        options,
        correctIndex: options.indexOf(correctWord),
        meta: {
            mode: 'roots',
            quizType: 'root-to-word',
            root: root.root,
            meaning: root.meaning,
            origin: root.origin,
            category: 'roots',
        },
    };
}

function generateWordToRoot(root: WordRoot, rng: () => number): EngineItem {
    // Pick an example word from this root
    const exampleWord = root.examples[Math.floor(rng() * root.examples.length)];
    const correctMeaning = root.meaning;

    // Distractor meanings: from other roots
    const otherRoots = WORD_ROOTS.filter(r => r.root !== root.root);
    const shuffledOthers = [...otherRoots].sort(() => rng() - 0.5);
    const distractorMeanings: string[] = [];
    for (const other of shuffledOthers) {
        if (distractorMeanings.length >= 2) break;
        if (other.meaning !== correctMeaning && !distractorMeanings.includes(other.meaning)) {
            distractorMeanings.push(other.meaning);
        }
    }

    const options = [correctMeaning, ...distractorMeanings].sort(() => rng() - 0.5);

    return {
        id: `roots-w2r-${root.root}-${Date.now()}-${Math.floor(rng() * 1e6)}`,
        prompt: `The root "${root.root}" in "${exampleWord}" means?`,
        answer: correctMeaning,
        options,
        correctIndex: options.indexOf(correctMeaning),
        meta: {
            mode: 'roots',
            quizType: 'word-to-root',
            root: root.root,
            word: exampleWord,
            origin: root.origin,
            category: 'roots',
        },
    };
}
