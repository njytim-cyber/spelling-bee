/**
 * domains/spelling/spellingGenerator.ts
 *
 * Generates EngineItem instances for spelling words.
 * The core mechanic: "Which spelling is correct?" — players pick the
 * correctly spelled word from misspellings of the same word.
 *
 * Distractors are pre-baked into each SpellingWord at build time
 * (via scripts/bake-distractors.ts). Runtime generation is only
 * used as a fallback for words missing pre-computed distractors.
 */
import type { EngineItem } from '../../engine/domain';
import type { SpellingWord, PhonicsPattern, DifficultyTier, SemanticTheme } from './words/types';
import {
    getAllWords,
    getWordMap,
    wordsByPattern,
    wordsByDifficulty,
    wordsByPatternAndDifficulty,
    wordsByTheme,
    wordsByThemeAndDifficulty,
    wordsByLanguageOfOrigin,
    wordsByLanguageAndDifficulty,
    difficultyRange,
} from './words';
import type { LanguageOfOrigin } from '../../utils/etymologyParser';

// ── Pattern → category mapping ───────────────────────────────────────────────

const CATEGORY_TO_PATTERN: Record<string, PhonicsPattern | null> = {
    'cvc': 'cvc',
    'blends': 'blends',
    'digraphs': 'digraphs',
    'silent-e': 'silent-e',
    'vowel-teams': 'vowel-teams',
    'r-controlled': 'r-controlled',
    'diphthongs': 'diphthongs',
    'prefixes': 'prefixes',
    'suffixes': 'suffixes',
    'multisyllable': 'multisyllable',
    'latin-roots': 'latin-roots',
    'greek-roots': 'greek-roots',
    'french-origin': 'french-origin',
    'compound': 'compound',
    'irregular': 'irregular',
    'daily': null,
    'challenge': null,
    'ghost': null,
    'review': null,
    'level-1': null,
    'level-2': null,
    'level-3': null,
    'level-4': null,
    'level-5': null,
    'level-6': null,
    'level-7': null,
    'level-8': null,
    'level-9': null,
    'level-10': null,
    'vocab': null,
    'origin-latin': null,
    'origin-greek': null,
    'origin-french': null,
    'origin-german': null,
    'origin-other': null,
    'roots': null,
    'etymology': null,
    'custom': null,
};

// ── Theme → category mapping ────────────────────────────────────────────────

const CATEGORY_TO_THEME: Record<string, SemanticTheme | null> = {
    'theme-actions': 'actions',
    'theme-people': 'people',
    'theme-mind': 'mind',
    'theme-home': 'home',
    'theme-character': 'character',
    'theme-feelings': 'feelings',
    'theme-sensory': 'sensory',
    'theme-academic': 'academic',
    'theme-animals': 'animals',
    'theme-food': 'food',
    'theme-body': 'body',
    'theme-language': 'language',
    'theme-art': 'art',
    'theme-communication': 'communication',
    'theme-plants': 'plants',
    'theme-time': 'time',
    'theme-health': 'health',
    'theme-earth': 'earth',
    'theme-society': 'society',
    'theme-quantity': 'quantity',
    'theme-money': 'money',
    'theme-clothing': 'clothing',
    'theme-nature': 'nature',
    'theme-travel': 'travel',
    'theme-everyday': 'everyday',
    'theme-weather': 'weather',
    'theme-water': 'water',
};

// ── Origin → category mapping ───────────────────────────────────────────────

const CATEGORY_TO_ORIGIN: Record<string, LanguageOfOrigin | null> = {
    'origin-latin': 'Latin',
    'origin-greek': 'Greek',
    'origin-french': 'French',
    'origin-german': 'German',
    'origin-other': 'Other',
};

/** Look up the SemanticTheme for a category, or null if it isn't theme-based. */
export function categoryToTheme(category: string): SemanticTheme | null {
    return CATEGORY_TO_THEME[category] ?? null;
}

/** Look up the PhonicsPattern for a category, or null if it isn't pattern-based. */
export function categoryToPattern(category: string): PhonicsPattern | null {
    return CATEGORY_TO_PATTERN[category] ?? null;
}

// ── Distractor selection ────────────────────────────────────────────────────

const VOWELS = 'aeiou';

/**
 * Pick 2 distractors from a word's pre-baked list.
 * If the word has 3+ distractors, randomly select 2.
 * Falls back to simple vowel/consonant swaps if no distractors are baked.
 */
function pickDistractors(word: SpellingWord, rng: () => number): string[] {
    const correct = word.word;
    const baked = word.distractors;

    if (baked && baked.length >= 2) {
        const shuffled = [...baked].sort(() => rng() - 0.5);
        return shuffled.slice(0, 2);
    }

    return runtimeFallbackDistractors(correct, rng);
}

/** Simple runtime fallback for words without pre-baked distractors */
function runtimeFallbackDistractors(correct: string, rng: () => number): string[] {
    const result = new Set<string>();

    for (let i = 0; i < correct.length && result.size < 2; i++) {
        if (VOWELS.includes(correct[i])) {
            for (const v of 'aeiou') {
                if (v !== correct[i]) {
                    const mis = correct.slice(0, i) + v + correct.slice(i + 1);
                    if (!result.has(mis)) { result.add(mis); break; }
                }
            }
        }
    }

    if (result.size < 2) {
        if (correct.endsWith('e') && correct.length > 2) {
            const mis = correct.slice(0, -1);
            if (mis !== correct && !result.has(mis)) result.add(mis);
        } else {
            const mis = correct + 'e';
            if (!result.has(mis)) result.add(mis);
        }
    }

    const CONSONANT_CONFUSIONS: [string, string][] = [
        ['b', 'd'], ['p', 'b'], ['m', 'n'], ['s', 'z'], ['f', 'v'],
        ['t', 'd'], ['g', 'k'], ['c', 'k'],
    ];
    if (result.size < 2) {
        for (let i = 0; i < correct.length && result.size < 2; i++) {
            if (!VOWELS.includes(correct[i]) && /[a-z]/.test(correct[i])) {
                for (const [a, b] of CONSONANT_CONFUSIONS) {
                    if (correct[i] === a || correct[i] === b) {
                        const replacement = correct[i] === a ? b : a;
                        const mis = correct.slice(0, i) + replacement + correct.slice(i + 1);
                        if (mis !== correct && !result.has(mis)) { result.add(mis); break; }
                    }
                }
            }
        }
    }

    return [...result].sort(() => rng() - 0.5).slice(0, 2);
}

// ── Word selection ───────────────────────────────────────────────────────────

/** Fixed difficulty range for level-N categories */
const LEVEL_RANGES: Record<string, [DifficultyTier, DifficultyTier]> = {
    'level-1': [1, 1],
    'level-2': [2, 2],
    'level-3': [3, 3],
    'level-4': [4, 4],
    'level-5': [5, 5],
    'level-6': [6, 6],
    'level-7': [7, 7],
    'level-8': [8, 8],
    'level-9': [9, 9],
    'level-10': [10, 10],
};

/**
 * Build a candidate pool of words for a category + difficulty range.
 * Filters by origin/theme/pattern with fallback chains.
 * Shared by both the main game (pickRichWord) and the bee simulation (pickBeeWord).
 */
export function selectWordPool(
    category: string | undefined,
    min: DifficultyTier,
    max: DifficultyTier,
): SpellingWord[] {
    const origin = category ? (CATEGORY_TO_ORIGIN[category] ?? null) : null;
    const theme = category ? (CATEGORY_TO_THEME[category] ?? null) : null;
    const pattern = category ? (CATEGORY_TO_PATTERN[category] ?? null) : null;

    let pool: SpellingWord[];

    if (origin) {
        pool = wordsByLanguageAndDifficulty(origin, min, max);
        if (pool.length === 0) pool = wordsByLanguageOfOrigin(origin);
        if (pool.length === 0) pool = wordsByDifficulty(min, max);
    } else if (theme) {
        pool = wordsByThemeAndDifficulty(theme, min, max);
        if (pool.length === 0) pool = wordsByTheme(theme);
        if (pool.length === 0) pool = wordsByDifficulty(min, max);
    } else if (pattern) {
        pool = wordsByPatternAndDifficulty(pattern, min, max);
        if (pool.length === 0) pool = wordsByPattern(pattern);
        if (pool.length === 0) pool = wordsByDifficulty(min, max);
    } else {
        pool = wordsByDifficulty(min, max);
    }

    // Widen difficulty range gradually rather than falling back to the entire
    // word bank, which would serve easy words at hard levels (and vice-versa).
    if (pool.length === 0) {
        for (let spread = 1; spread <= 3 && pool.length === 0; spread++) {
            const widerMin = Math.max(1, min - spread) as DifficultyTier;
            const widerMax = Math.min(10, max + spread) as DifficultyTier;
            pool = wordsByDifficulty(widerMin, widerMax);
        }
    }
    // True last resort — should only happen if no tiers are loaded at all
    if (pool.length === 0) pool = getAllWords();

    return pool;
}

function pickRichWord(
    category: string,
    difficulty: number,
    rng: () => number,
): SpellingWord {
    const tierRange = LEVEL_RANGES[category];

    let effectiveMin: DifficultyTier;
    let effectiveMax: DifficultyTier;

    if (tierRange) {
        [effectiveMin, effectiveMax] = tierRange;
    } else {
        [effectiveMin, effectiveMax] = difficultyRange(difficulty);
    }

    const pool = selectWordPool(category, effectiveMin, effectiveMax);
    return pool[Math.floor(rng() * pool.length)];
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a spelling EngineItem for a specific word (used by SRS review).
 * Looks up the SpellingWord by string and generates distractors for it.
 * Returns null if the word isn't found in the loaded word bank.
 */
export function generateItemForWord(
    wordStr: string,
    category: string,
    rng: () => number = Math.random,
): EngineItem | null {
    const wordMap = getWordMap();
    const richWord = wordMap.get(wordStr.toLowerCase());
    if (!richWord) return null;

    const correct = richWord.word;
    const distractors = pickDistractors(richWord, rng);
    const options = [correct, ...distractors].sort(() => rng() - 0.5);
    const correctIndex = options.indexOf(correct);

    return {
        id: `review-${correct}-${Date.now()}-${Math.floor(rng() * 1e6)}`,
        prompt: 'Which spelling is correct?',
        answer: correct,
        options,
        correctIndex,
        meta: {
            word: correct,
            category,
            definition: richWord.definition,
            exampleSentence: richWord.exampleSentence,
            pronunciation: richWord.pronunciation,
            partOfSpeech: richWord.partOfSpeech,
            pattern: richWord.pattern,
            difficulty: richWord.difficulty,
            ...(richWord.etymology ? { etymology: richWord.etymology } : {}),
        },
    };
}

/**
 * Generate a single spelling EngineItem.
 *
 * Uses pre-baked distractors from the word bank for guaranteed quality.
 * Each word carries 3 pre-validated, pronounceable misspellings;
 * 2 are randomly selected per question for variety.
 */
export function generateSpellingItem(
    difficulty: number,
    category: string,
    rng: () => number = Math.random,
): EngineItem {
    const richWord = pickRichWord(category, difficulty, rng);
    const correct = richWord.word;
    const distractors = pickDistractors(richWord, rng);
    const options = [correct, ...distractors].sort(() => rng() - 0.5);
    const correctIndex = options.indexOf(correct);

    return {
        id: `${category}-${correct}-${Date.now()}-${Math.floor(rng() * 1e6)}`,
        prompt: 'Which spelling is correct?',
        answer: correct,
        options,
        correctIndex,
        meta: {
            word: correct,
            category,
            definition: richWord.definition,
            exampleSentence: richWord.exampleSentence,
            pronunciation: richWord.pronunciation,
            partOfSpeech: richWord.partOfSpeech,
            pattern: richWord.pattern,
            difficulty: richWord.difficulty,
            ...(richWord.etymology ? { etymology: richWord.etymology } : {}),
        },
    };
}
