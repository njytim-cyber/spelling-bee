/**
 * domains/spelling/spellingGenerator.ts
 *
 * Generates EngineItem instances for spelling words.
 * The core mechanic: "Which spelling is correct?" — players pick the
 * correctly spelled word from misspellings of the same word.
 *
 * Now powered by rich SpellingWord objects from the tiered word bank.
 */
import type { EngineItem } from '../../engine/domain';
import type { SpellingWord, PhonicsPattern, DifficultyTier } from './words/types';
import {
    getAllWords,
    wordsByPattern,
    wordsByDifficulty,
    wordsByPatternAndDifficulty,
    difficultyRange,
    BAND_DIFFICULTY_CAP,
} from './words';

// ── Pattern → category mapping ───────────────────────────────────────────────

/**
 * Maps a SpellingCategory id to a PhonicsPattern (or null for mixed/special).
 * Categories that directly correspond to patterns use the same string id.
 */
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
    // Mixed / special modes — no single pattern
    'mix': null,
    'daily': null,
    'challenge': null,
    'speedrun': null,
    'ghost': null,
    'competition': null,
};

// ── Misspelling Generator ───────────────────────────────────────────────────

/** Common vowel/consonant confusion pairs */
const VOWEL_SWAPS: [string, string][] = [
    ['a', 'e'], ['e', 'i'], ['i', 'o'], ['o', 'u'], ['a', 'u'],
];

const CONSONANT_CONFUSIONS: [string, string][] = [
    ['b', 'd'], ['p', 'b'], ['m', 'n'], ['s', 'z'], ['f', 'v'],
    ['t', 'd'], ['g', 'k'], ['c', 'k'],
];

const DIGRAPH_CONFUSIONS: [string, string][] = [
    ['sh', 'ch'], ['th', 'f'], ['wh', 'w'], ['ck', 'k'], ['ph', 'f'],
];

/**
 * Generate a plausible misspelling of a word using common error patterns.
 * Returns a different string or null if no mutation was possible.
 */
function generateMisspelling(word: string, rng: () => number): string | null {
    const strategies: (() => string | null)[] = [
        // 1. Swap two adjacent letters
        () => {
            if (word.length < 3) return null;
            const i = 1 + Math.floor(rng() * (word.length - 2));
            return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
        },
        // 2. Swap a vowel for a similar vowel
        () => {
            const vowelPositions = [...word].map((ch, i) => ({ ch, i })).filter(({ ch }) => 'aeiou'.includes(ch));
            if (vowelPositions.length === 0) return null;
            const pos = vowelPositions[Math.floor(rng() * vowelPositions.length)];
            const swaps = VOWEL_SWAPS.filter(([a, b]) => a === pos.ch || b === pos.ch);
            if (swaps.length === 0) return null;
            const [a, b] = swaps[Math.floor(rng() * swaps.length)];
            const newCh = pos.ch === a ? b : a;
            return word.slice(0, pos.i) + newCh + word.slice(pos.i + 1);
        },
        // 3. Double a consonant (or remove a double)
        () => {
            for (let i = 0; i < word.length - 1; i++) {
                if (word[i] === word[i + 1] && !'aeiou'.includes(word[i])) {
                    // Remove the double
                    return word.slice(0, i) + word.slice(i + 1);
                }
            }
            // Add a double to a single consonant
            const consonants = [...word].map((ch, i) => ({ ch, i })).filter(({ ch }) => !'aeiou'.includes(ch) && /[a-z]/.test(ch));
            if (consonants.length === 0) return null;
            const c = consonants[Math.floor(rng() * consonants.length)];
            // Don't double if already doubled or at start
            if (c.i > 0 && word[c.i - 1] !== c.ch && (c.i + 1 >= word.length || word[c.i + 1] !== c.ch)) {
                return word.slice(0, c.i) + c.ch + word.slice(c.i);
            }
            return null;
        },
        // 4. Swap consonant confusion pairs
        () => {
            for (const [a, b] of CONSONANT_CONFUSIONS) {
                const idx = word.indexOf(a);
                if (idx >= 0 && rng() > 0.5) {
                    return word.slice(0, idx) + b + word.slice(idx + a.length);
                }
                const idx2 = word.indexOf(b);
                if (idx2 >= 0) {
                    return word.slice(0, idx2) + a + word.slice(idx2 + b.length);
                }
            }
            return null;
        },
        // 5. Digraph confusion
        () => {
            for (const [a, b] of DIGRAPH_CONFUSIONS) {
                const idx = word.indexOf(a);
                if (idx >= 0) {
                    return word.slice(0, idx) + b + word.slice(idx + a.length);
                }
            }
            return null;
        },
    ];

    // Shuffle strategies and try each
    const shuffled = [...strategies].sort(() => rng() - 0.5);
    for (const strategy of shuffled) {
        const result = strategy();
        if (result && result !== word && result.length > 0) {
            return result;
        }
    }
    return null;
}

/**
 * Generate 2 unique misspellings of a word.
 * Falls back to simple letter substitutions if needed.
 */
function makeMisspellings(correct: string, rng: () => number): string[] {
    const misspellings = new Set<string>();
    let attempts = 0;

    while (misspellings.size < 2 && attempts < 20) {
        const mis = generateMisspelling(correct, rng);
        if (mis && mis !== correct && !misspellings.has(mis)) {
            misspellings.add(mis);
        }
        attempts++;
    }

    // Fallback: if we couldn't generate enough, use simple character swaps
    if (misspellings.size < 2) {
        const chars = [...correct];
        for (let i = 0; i < chars.length && misspellings.size < 2; i++) {
            if ('aeiou'.includes(chars[i])) {
                const replacement = 'aeiou'.replace(chars[i], '')[Math.floor(rng() * 4)];
                const mis = correct.slice(0, i) + replacement + correct.slice(i + 1);
                if (mis !== correct && !misspellings.has(mis)) {
                    misspellings.add(mis);
                }
            }
        }
    }

    // Last resort: append/remove a letter
    while (misspellings.size < 2) {
        misspellings.add(correct + 'e');
        if (misspellings.size < 2) misspellings.add(correct.slice(0, -1));
    }

    return [...misspellings].slice(0, 2);
}

// ── Word selection ───────────────────────────────────────────────────────────

/**
 * Pick a SpellingWord from the bank, filtered by category and difficulty.
 * Falls back gracefully to broader pools when a narrow filter yields nothing.
 */
function pickRichWord(
    category: string,
    difficulty: number,
    band: string | undefined,
    rng: () => number,
): SpellingWord {
    const [minDiff, maxDiff] = difficultyRange(difficulty);
    const bandCap = band ? (BAND_DIFFICULTY_CAP[band] ?? 10) : 10;
    const effectiveMax = Math.min(maxDiff, bandCap) as DifficultyTier;
    const effectiveMin = Math.min(minDiff, effectiveMax) as DifficultyTier;

    const pattern = CATEGORY_TO_PATTERN[category] ?? null;

    // Try narrowest filter first, then progressively broaden
    let pool: SpellingWord[];

    if (pattern) {
        pool = wordsByPatternAndDifficulty(pattern, effectiveMin, effectiveMax);
        if (pool.length === 0) pool = wordsByPattern(pattern);
        if (pool.length === 0) pool = wordsByDifficulty(effectiveMin, effectiveMax);
    } else {
        pool = wordsByDifficulty(effectiveMin, effectiveMax);
    }

    if (pool.length === 0) pool = getAllWords();

    return pool[Math.floor(rng() * pool.length)];
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a single spelling EngineItem.
 *
 * The core mechanic: "Which spelling is correct?" — all 3 options are
 * variations of the SAME word (1 correct + 2 misspellings).
 *
 * @param difficulty - adaptive difficulty level 1-5 (from useDifficulty)
 * @param category   - SpellingCategory string id
 * @param hardMode   - if true, misspellings are subtler
 * @param rng        - optional seeded random function (defaults to Math.random)
 * @param band       - optional age band for difficulty capping
 */
export function generateSpellingItem(
    difficulty: number,
    category: string,
    hardMode: boolean,
    rng: () => number = Math.random,
    band?: string,
): EngineItem {
    const richWord = pickRichWord(category, difficulty, band, rng);
    const correct = richWord.word;
    const misspellings = makeMisspellings(correct, rng);
    const options = [correct, ...misspellings].sort(() => rng() - 0.5);
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
