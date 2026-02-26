/**
 * domains/spelling/customGenerator.ts
 *
 * Generates EngineItem instances from a custom word list.
 * Uses pre-baked distractors for enriched words, falls back to
 * simple letter-swap distractors for custom-only words.
 */
import type { EngineItem } from '../../engine/domain';
import type { CustomWord } from '../../types/customList';

function swapLetters(word: string, rng: () => number): string {
    if (word.length < 2) return word + 'z';
    const chars = word.split('');
    const idx = Math.floor(rng() * (chars.length - 1));
    // Swap adjacent letters
    [chars[idx], chars[idx + 1]] = [chars[idx + 1], chars[idx]];
    const result = chars.join('');
    return result === word ? word.slice(0, -1) + (word.slice(-1) === 'e' ? 'a' : 'e') : result;
}

function generateDistractors(word: string, count: number, rng: () => number): string[] {
    const distractors = new Set<string>();
    let attempts = 0;
    while (distractors.size < count && attempts < 20) {
        const d = swapLetters(word, rng);
        if (d !== word) distractors.add(d);
        attempts++;
    }
    return [...distractors];
}

const defaultRng = () => Math.random();

export function generateCustomItem(
    pool: CustomWord[],
    _difficulty: number,
    _categoryId: string,
    _hardMode: boolean,
    rng: () => number = defaultRng,
): EngineItem {
    if (pool.length === 0) {
        throw new Error('Custom word pool is empty');
    }

    const word = pool[Math.floor(rng() * pool.length)];
    const correctSpelling = word.word;

    // Get distractors
    let distractors: string[];
    if (word.distractors && word.distractors.length >= 2) {
        // Use pre-baked distractors from word bank
        const shuffled = [...word.distractors].sort(() => rng() - 0.5);
        distractors = shuffled.slice(0, 2);
    } else {
        // Generate simple distractors
        distractors = generateDistractors(correctSpelling, 2, rng);
    }

    // Build options array with correct answer at random position
    const correctIndex = Math.floor(rng() * 3);
    const options = [...distractors];
    options.splice(correctIndex, 0, correctSpelling);

    return {
        id: `custom-${Date.now()}-${Math.floor(rng() * 1000)}`,
        prompt: word.definition || `Spell: ${correctSpelling}`,
        options,
        correctIndex,
        answer: correctSpelling,
        meta: {
            word: correctSpelling,
            category: 'custom',
            mode: 'custom',
            ...(word.pronunciation && { pronunciation: word.pronunciation }),
            ...(word.partOfSpeech && { partOfSpeech: word.partOfSpeech }),
        },
    };
}
