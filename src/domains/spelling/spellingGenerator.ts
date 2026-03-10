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
import { toDialectWord } from './words/registry';
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

    // Widen difficulty range gradually if pool is too small to avoid repetition.
    // Minimum 5 unique words prevents the dedup loop from giving up.
    const MIN_POOL = 5;
    if (pool.length < MIN_POOL && (origin || theme || pattern)) {
        // First, try dropping difficulty constraint but keeping category
        if (origin) pool = wordsByLanguageOfOrigin(origin);
        else if (theme) pool = wordsByTheme(theme);
        else if (pattern) pool = wordsByPattern(pattern);
    }
    if (pool.length < MIN_POOL) {
        for (let spread = 1; spread <= 3 && pool.length < MIN_POOL; spread++) {
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

// ── Session phases ──────────────────────────────────────────────────────────

export type SessionPhase = 'warmup' | 'build' | 'boss' | 'victory';

export interface PhaseSlot {
    phase: SessionPhase;
    /** Index within the full session (0-based) */
    index: number;
}

/**
 * Compute phase layout for a session of a given size.
 * 10-word:  warmup(2) → build(6) → boss(2)
 * 20-word:  warmup(4) → build(10) → boss(4) → victory(2)
 * 50-word:  warmup(5) → build(35) → boss(7) → victory(3)
 * Other:    proportional split
 */
export function computePhaseLayout(sessionSize: number): PhaseSlot[] {
    if (sessionSize <= 0) return [];

    let warmup: number, boss: number, victory: number;

    if (sessionSize <= 10) {
        warmup = 2;
        boss = 2;
        victory = 0;
    } else if (sessionSize <= 20) {
        warmup = 4;
        boss = 4;
        victory = 2;
    } else {
        warmup = 5;
        boss = 7;
        victory = 3;
    }

    // Clamp to session size
    const total = warmup + boss + victory;
    if (total >= sessionSize) {
        warmup = Math.min(warmup, Math.floor(sessionSize * 0.2));
        boss = Math.min(boss, Math.floor(sessionSize * 0.2));
        victory = 0;
    }
    const build = sessionSize - warmup - boss - victory;

    const slots: PhaseSlot[] = [];
    let idx = 0;
    for (let i = 0; i < warmup; i++) slots.push({ phase: 'warmup', index: idx++ });
    for (let i = 0; i < build; i++) slots.push({ phase: 'build', index: idx++ });
    for (let i = 0; i < boss; i++) slots.push({ phase: 'boss', index: idx++ });
    for (let i = 0; i < victory; i++) slots.push({ phase: 'victory', index: idx++ });
    return slots;
}

/**
 * Get the session phase for a given question index.
 * Returns null if not in a phased session.
 */
export function getPhaseAt(layout: PhaseSlot[], questionIndex: number): SessionPhase | null {
    if (questionIndex < 0 || questionIndex >= layout.length) return null;
    return layout[questionIndex].phase;
}

/**
 * Count results per phase from a layout and an answer history array.
 */
export function summarizeByPhase(
    layout: PhaseSlot[],
    answerHistory: boolean[],
): Record<SessionPhase, { total: number; correct: number }> {
    const summary: Record<SessionPhase, { total: number; correct: number }> = {
        warmup: { total: 0, correct: 0 },
        build: { total: 0, correct: 0 },
        boss: { total: 0, correct: 0 },
        victory: { total: 0, correct: 0 },
    };
    for (let i = 0; i < Math.min(layout.length, answerHistory.length); i++) {
        const phase = layout[i].phase;
        summary[phase].total++;
        if (answerHistory[i]) summary[phase].correct++;
    }
    return summary;
}

/**
 * Generate a spelling item for a specific session phase.
 * - warmup: pulls from 1 tier below current level (easier)
 * - build: standard difficulty at current level
 * - boss: 1 tier above current level, typed-only flag in meta
 * - victory: pulls from 1 tier below (easy, end on high note)
 */
export function generatePhaseItem(
    phase: SessionPhase,
    level: number,
    category: string,
    rng: () => number = Math.random,
): EngineItem {
    const clampedLevel = Math.max(1, Math.min(10, level));

    switch (phase) {
        case 'warmup': {
            const easyLevel = Math.max(1, clampedLevel - 1);
            const cat = `level-${easyLevel}`;
            const item = generateSpellingItem(easyLevel, cat, rng);
            item.meta = { ...item.meta, sessionPhase: 'warmup' };
            return item;
        }
        case 'build': {
            const item = generateSpellingItem(clampedLevel, category, rng);
            item.meta = { ...item.meta, sessionPhase: 'build' };
            return item;
        }
        case 'boss': {
            const hardLevel = Math.min(10, clampedLevel + 1);
            const cat = `level-${hardLevel}`;
            const item = generateSpellingItem(hardLevel, cat, rng);
            item.meta = { ...item.meta, sessionPhase: 'boss', bossRound: true, bonusMultiplier: 2 };
            return item;
        }
        case 'victory': {
            const easyLevel = Math.max(1, clampedLevel - 1);
            const cat = `level-${easyLevel}`;
            const item = generateSpellingItem(easyLevel, cat, rng);
            item.meta = { ...item.meta, sessionPhase: 'victory' };
            return item;
        }
    }
}

/**
 * Generate a spelling item for warmup/victory using SRS data.
 * Pulls known words from the student's Leitner boxes:
 * - warmup: box 3+ (familiar/mastered) — confidence boosters
 * - victory: box 4 (mastered) — end on a high note
 * Returns null if no suitable SRS words are available.
 *
 * @param usedWords  Set of words already used this session — picks are excluded
 *                   from it and added on success to prevent repeats.
 */
export function generateSRSPhaseItem(
    phase: 'warmup' | 'victory',
    category: string,
    srsWords: { word: string; box: number }[],
    rng: () => number = Math.random,
    usedWords?: Set<string>,
): EngineItem | null {
    const minBox = phase === 'warmup' ? 3 : 4;

    // Extract level from category so we can filter by difficulty.
    // Without this, a Level 1 word like "tip" could appear at Level 8.
    const levelMatch = category.match(/^level-(\d+)$/);
    const level = levelMatch ? parseInt(levelMatch[1], 10) : 0;
    const wordMap = level > 0 ? getWordMap() : null;
    // Allow words within ±2 difficulty of the current level
    const minDiff = Math.max(1, level - 2);
    const maxDiff = Math.min(10, level + 2);

    const candidates = srsWords.filter(w => {
        if (w.box < minBox) return false;
        if (usedWords?.has(w.word)) return false;
        if (wordMap) {
            const entry = wordMap.get(w.word.toLowerCase());
            if (entry && (entry.difficulty < minDiff || entry.difficulty > maxDiff)) return false;
        }
        return true;
    });

    if (candidates.length === 0) return null;
    const pick = candidates[Math.floor(rng() * candidates.length)];
    const item = generateItemForWord(pick.word, category, rng);
    if (!item) return null;
    usedWords?.add(pick.word);
    item.meta = { ...item.meta, sessionPhase: phase, srsReview: true };
    return item;
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
    // Try direct lookup first, then resolve US key to current dialect spelling
    const richWord = wordMap.get(wordStr.toLowerCase())
        ?? wordMap.get(toDialectWord(wordStr.toLowerCase()));
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

// ── Mid-session surprises ────────────────────────────────────────────────────

export type SurpriseType = 'bonusWord' | 'etymologyReveal' | 'speedBurst' | 'lootDrop';

export interface SessionSurprise {
    type: SurpriseType;
    /** The question index (0-based) at which this surprise triggers */
    triggerIndex: number;
}

/**
 * Roll for session surprises at session start.
 * At most 1 surprise per session. Probability scales with session size.
 *
 * 10-word session: 20% chance of any surprise
 * 20-word session: 40% chance
 * 50-word session: 60% chance
 */
export function rollSessionSurprises(
    sessionSize: number,
    rng: () => number = Math.random,
): SessionSurprise | null {
    // Probability of getting a surprise at all
    const pAny = Math.min(0.6, sessionSize * 0.02);
    if (rng() > pAny) return null;

    // Pick surprise type: 25% bonus word, 35% etymology reveal, 25% speed burst, 15% loot drop
    const roll = rng();
    const type: SurpriseType = roll < 0.25 ? 'bonusWord' : roll < 0.60 ? 'etymologyReveal' : roll < 0.85 ? 'speedBurst' : 'lootDrop';

    // Pick a trigger index in the middle third of the session (not too early, not too late)
    const third = Math.floor(sessionSize / 3);
    const minIdx = Math.max(2, third);
    const maxIdx = Math.min(sessionSize - 2, third * 2);
    const triggerIndex = minIdx + Math.floor(rng() * (maxIdx - minIdx + 1));

    return { type, triggerIndex };
}

/**
 * Generate a bonus word — 2 tiers above current level.
 * Meta includes `bonusWord: true` flag for golden UI treatment.
 */
export function generateBonusWord(
    level: number,
    rng: () => number = Math.random,
): EngineItem {
    const bonusLevel = Math.min(10, level + 2);
    const cat = `level-${bonusLevel}`;
    const item = generateSpellingItem(bonusLevel, cat, rng);
    item.meta = {
        ...item.meta,
        bonusWord: true,
        bonusMultiplier: 5,
    };
    return item;
}

/**
 * Generate 3 easy MCQ items for a Speed Burst surprise.
 * Words are 1 tier below current level for quick answering.
 * Each carries `speedBurst: true` and 3x XP multiplier.
 */
export function generateSpeedBurst(
    level: number,
    rng: () => number = Math.random,
): EngineItem[] {
    const easyLevel = Math.max(1, level - 1);
    const cat = `level-${easyLevel}`;
    return Array.from({ length: 3 }, () => {
        const item = generateSpellingItem(easyLevel, cat, rng);
        item.meta = { ...item.meta, speedBurst: true, bonusMultiplier: 3 };
        return item;
    });
}
