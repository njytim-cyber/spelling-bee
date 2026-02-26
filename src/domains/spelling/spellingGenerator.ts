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
    'tier-1': null,
    'tier-2': null,
    'tier-3': null,
    'tier-4': null,
    'tier-5': null,
    'vocab': null,
    'origin-latin': null,
    'origin-greek': null,
    'origin-french': null,
    'origin-german': null,
    'origin-other': null,
    'wotc-one': null,
    'wotc-two': null,
    'wotc-three': null,
    'written-test': null,
    'roots': null,
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
function pickDistractors(word: SpellingWord, rng: () => number, hardMode: boolean): string[] {
    const correct = word.word;
    const baked = word.distractors;

    if (baked && baked.length >= 2) {
        if (hardMode) {
            const sameLenBaked = baked.filter(d => d.length === correct.length);
            if (sameLenBaked.length >= 2) {
                const shuffled = [...sameLenBaked].sort(() => rng() - 0.5);
                return shuffled.slice(0, 2);
            }
        }
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

/** Fixed difficulty range for tier-N and WOTC categories */
const TIER_RANGES: Record<string, [DifficultyTier, DifficultyTier]> = {
    'tier-1': [1, 2],
    'tier-2': [3, 4],
    'tier-3': [5, 6],
    'tier-4': [7, 8],
    'tier-5': [9, 10],
    'wotc-one': [1, 2],
    'wotc-two': [3, 6],
    'wotc-three': [7, 10],
};

/**
 * Build a candidate pool of words for a category + difficulty range.
 * Filters by origin/theme/pattern with fallback chains, applies hard mode bias.
 * Shared by both the swipe game (pickRichWord) and the bee simulation (pickBeeWord).
 */
export function selectWordPool(
    category: string | undefined,
    min: DifficultyTier,
    max: DifficultyTier,
    hardMode: boolean,
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

    if (pool.length === 0) pool = getAllWords();

    // Hard mode: bias toward the longest, hardest words in the pool
    if (hardMode && pool.length > 3) {
        pool = [...pool].sort((a, b) => b.difficulty - a.difficulty || b.word.length - a.word.length);
        const cutoff = Math.max(3, Math.ceil(pool.length * 0.3));
        pool = pool.slice(0, cutoff);
    }

    return pool;
}

function pickRichWord(
    category: string,
    difficulty: number,
    rng: () => number,
    hardMode = false,
): SpellingWord {
    const tierRange = TIER_RANGES[category];

    let effectiveMin: DifficultyTier;
    let effectiveMax: DifficultyTier;

    if (tierRange) {
        [effectiveMin, effectiveMax] = tierRange;
    } else {
        const effectiveDifficulty = hardMode ? 5 : difficulty;
        [effectiveMin, effectiveMax] = difficultyRange(effectiveDifficulty);
    }

    const pool = selectWordPool(category, effectiveMin, effectiveMax, hardMode);
    return pool[Math.floor(rng() * pool.length)];
}

// ── Public API ────────────────────────────────────────────────────────────────

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
    hardMode: boolean,
    rng: () => number = Math.random,
): EngineItem {
    const richWord = pickRichWord(category, difficulty, rng, hardMode);
    const correct = richWord.word;
    const distractors = pickDistractors(richWord, rng, hardMode);
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
            hardMode,
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
