/**
 * words/registry.ts
 *
 * Dynamic word loading registry. Tier 1-2 are eagerly loaded.
 * Tier 3-9 load on demand via dynamic import().
 * Supports dialect switching (en-US / en-GB) via UK overrides.
 */
import type { SpellingWord, Dialect } from './types';
import { TIER_1_WORDS } from './tier1';
import { TIER_2_WORDS } from './tier2';

// ── UK override types ────────────────────────────────────────────────────────

export interface UkOverride {
    /** UK spelling of the word */
    word: string;
    /** UK pronunciation guide (if different) */
    pronunciation?: string;
    /** UK-appropriate distractors (plausible misspellings of the UK form) */
    distractors: string[];
}

// ── State ────────────────────────────────────────────────────────────────────

/** US canonical word list (always the base truth) */
let baseWords: SpellingWord[] = [...TIER_1_WORDS, ...TIER_2_WORDS];
/** Active word list (may have UK overlays applied). Shares reference with
 *  baseWords in en-US mode; only diverges when UK overrides are applied. */
let loadedWords: SpellingWord[] = baseWords;
const loadedTiers = new Set<number>([1, 2]);
let version = 0;

let currentDialect: Dialect = 'en-US';
let ukOverrides: Record<string, UkOverride> | null = null;
/** Reverse map: UK spelling → US canonical key (for word history) */
let ukToUsMap: Map<string, string> | null = null;
/** Pre-compiled regex + map for US→UK text substitution in definitions/examples */
let ukTextRegex: RegExp | null = null;
let ukTextMap: Record<string, string> | null = null;
/** Stem keys sorted longest-first for greedy matching in ukTextReplace */
let ukStemKeys: string[] | null = null;

// ── Indexed caches (invalidated whenever loadedWords changes) ───────────────

/** Cache state tracking for lazy invalidation */
interface CacheState<T> {
    valid: boolean;
    data: T | null;
}

const cacheState = {
    wordMap: { valid: false, data: null } as CacheState<Map<string, SpellingWord>>,
    byPattern: { valid: false, data: null } as CacheState<Map<string, SpellingWord[]>>,
    byTheme: { valid: false, data: null } as CacheState<Map<string, SpellingWord[]>>,
    byDifficulty: { valid: false, data: null } as CacheState<Map<number, SpellingWord[]>>,
};

function invalidateCaches(): void {
    cacheState.wordMap.valid = false;
    cacheState.byPattern.valid = false;
    cacheState.byTheme.valid = false;
    cacheState.byDifficulty.valid = false;
}

function ensureWordMapCache(): Map<string, SpellingWord> {
    if (cacheState.wordMap.valid && cacheState.wordMap.data) {
        return cacheState.wordMap.data;
    }

    const map = new Map<string, SpellingWord>();
    for (const w of loadedWords) map.set(w.word, w);

    cacheState.wordMap.data = map;
    cacheState.wordMap.valid = true;
    return map;
}

function ensurePatternCache(): Map<string, SpellingWord[]> {
    if (cacheState.byPattern.valid && cacheState.byPattern.data) {
        return cacheState.byPattern.data;
    }

    const map = new Map<string, SpellingWord[]>();
    for (const w of loadedWords) {
        let arr = map.get(w.pattern);
        if (!arr) { arr = []; map.set(w.pattern, arr); }
        arr.push(w);
        if (w.secondaryPatterns) {
            for (const p of w.secondaryPatterns) {
                let arr2 = map.get(p);
                if (!arr2) { arr2 = []; map.set(p, arr2); }
                arr2.push(w);
            }
        }
    }

    cacheState.byPattern.data = map;
    cacheState.byPattern.valid = true;
    return map;
}

function ensureThemeCache(): Map<string, SpellingWord[]> {
    if (cacheState.byTheme.valid && cacheState.byTheme.data) {
        return cacheState.byTheme.data;
    }

    const map = new Map<string, SpellingWord[]>();
    for (const w of loadedWords) {
        if (!w.theme) continue;
        let arr = map.get(w.theme);
        if (!arr) { arr = []; map.set(w.theme, arr); }
        arr.push(w);
    }

    cacheState.byTheme.data = map;
    cacheState.byTheme.valid = true;
    return map;
}

/** Cached word-keyed lookup map. O(1) per lookup after first build. */
export function getCachedWordMap(): Map<string, SpellingWord> {
    return ensureWordMapCache();
}

/** Words matching a phonics pattern. O(1) lookup via index. */
export function getCachedByPattern(pattern: string): SpellingWord[] {
    return ensurePatternCache().get(pattern) ?? [];
}

/** Words matching a semantic theme. O(1) lookup via index. */
export function getCachedByTheme(theme: string): SpellingWord[] {
    return ensureThemeCache().get(theme) ?? [];
}

/** Words grouped by difficulty value (1-10). Builds index lazily. */
function ensureDifficultyCache(): Map<number, SpellingWord[]> {
    if (cacheState.byDifficulty.valid && cacheState.byDifficulty.data) {
        return cacheState.byDifficulty.data;
    }

    const map = new Map<number, SpellingWord[]>();
    for (const w of loadedWords) {
        let arr = map.get(w.difficulty);
        if (!arr) { arr = []; map.set(w.difficulty, arr); }
        arr.push(w);
    }

    cacheState.byDifficulty.data = map;
    cacheState.byDifficulty.valid = true;
    return map;
}

/** Words within a difficulty range [min, max]. O(1) per difficulty level via index. */
export function getCachedByDifficulty(min: number, max: number): SpellingWord[] {
    const cache = ensureDifficultyCache();
    // Fast path: single-level lookup (the common case) — return cached array directly
    // instead of allocating a new one. Callers treat the result as read-only.
    if (min === max) return cache.get(min) ?? [];
    const result: SpellingWord[] = [];
    for (let d = min; d <= max; d++) {
        const arr = cache.get(d);
        if (arr) result.push(...arr);
    }
    return result;
}

// ── Public getters ───────────────────────────────────────────────────────────

/** Current registry version — increments on every new tier/pack load or dialect change. */
export function getRegistryVersion(): number {
    return version;
}

/** All currently loaded words (with dialect overlays applied). */
export function getLoadedWords(): SpellingWord[] {
    return loadedWords;
}

/** Set of tier numbers currently loaded. */
export function getLoadedTiers(): ReadonlySet<number> {
    return loadedTiers;
}

/** Lazily-built US-keyed difficulty map (invalidated when baseWords changes). */
let baseWordMap: Map<string, SpellingWord> | null = null;
let baseWordMapSize = 0;

function ensureBaseWordMap(): Map<string, SpellingWord> {
    if (baseWordMap && baseWordMapSize === baseWords.length) return baseWordMap;
    baseWordMap = new Map();
    for (const w of baseWords) baseWordMap.set(w.word, w);
    baseWordMapSize = baseWords.length;
    return baseWordMap;
}

/**
 * Look up a word by its US canonical key, regardless of current dialect.
 * O(1) after first call (lazy-built index over baseWords).
 */
export function getWordByUsKey(usKey: string): SpellingWord | undefined {
    return ensureBaseWordMap().get(usKey);
}

/** Current active dialect. */
export function getDialect(): Dialect {
    return currentDialect;
}

/**
 * Map a US canonical key to the current dialect's spelling.
 * In en-US mode, returns the key unchanged.
 * In en-GB mode, returns the UK override spelling if one exists.
 */
export function toDialectWord(usKey: string): string {
    if (currentDialect !== 'en-GB' || !ukOverrides) return usKey;
    if (!Object.hasOwn(ukOverrides, usKey)) return usKey;
    return ukOverrides[usKey].word;
}

/**
 * Resolve a word string to its US canonical key.
 * If the word is a UK spelling, returns the US equivalent.
 * If already US (or no override exists), returns the word unchanged.
 */
export function resolveUsKey(word: string): string {
    if (!ukToUsMap) return word;
    return ukToUsMap.get(word.toLowerCase()) ?? word;
}

// ── Dialect management ───────────────────────────────────────────────────────

/**
 * Short stems that could cause false positives without word boundaries.
 * e.g. "tire" inside "entire", "mom" inside "momenta", "gray" inside "grayed".
 * These get \b word-boundary guards in the regex.
 */
const BOUNDARY_REQUIRED_STEMS = new Set([
    'tire', 'mom', 'gray', 'curb', 'draft', 'plow', 'mold', 'ax',
    'aging', 'check',
]);

/**
 * Extract the minimal US→UK stem pairs from the override list.
 * Groups related overrides (color, colorful, coloring, colorize) to find
 * the shortest common stem (color→colour), enabling substring-based
 * replacement that covers ALL inflected forms (colors, colored, colorless, etc.)
 */
function buildUkStemMap(overrides: Record<string, UkOverride>): [string, string][] {
    // Extract raw pairs and group by potential stem
    const rawPairs = Object.entries(overrides).map(([us, ov]) => [us, ov.word] as const);

    // Find minimal stem pairs: for each US→UK pair, check if a shorter pair
    // in the list is a prefix. If so, the shorter one subsumes this one.
    // Sort shortest first to build stem set incrementally.
    const sorted = [...rawPairs].sort((a, b) => a[0].length - b[0].length);
    const stems: [string, string][] = [];

    for (const [us, uk] of sorted) {
        // Check if any existing stem is a prefix of this US word
        // AND the UK word starts with that stem's UK replacement
        let covered = false;
        for (const [stemUs, stemUk] of stems) {
            if (us.startsWith(stemUs) && uk.startsWith(stemUk)) {
                covered = true;
                break;
            }
        }
        if (!covered) {
            stems.push([us, uk]);
        }
    }

    return stems;
}

/**
 * Apply case-preserving US→UK substitution to a text string.
 * Uses stem-based matching: replaces US stems wherever they appear within
 * words to cover all inflected forms (e.g. "colors", "colorless", "multicolored").
 * Left word-boundary prevents matching inside unrelated words.
 */
function ukTextReplace(text: string): string {
    if (!ukTextRegex || !ukTextMap || !ukStemKeys) return text;
    return text.replace(ukTextRegex, (match) => {
        const lower = match.toLowerCase();
        // Find which stem this match starts with (stems are sorted longest-first)
        let stemUs = '';
        let stemUk = '';
        for (const key of ukStemKeys!) {
            if (lower.startsWith(key)) {
                stemUs = key;
                stemUk = ukTextMap![key];
                break;
            }
        }
        if (!stemUs) return match;
        const suffix = match.slice(stemUs.length);
        // Preserve original casing of the stem portion
        const origStem = match.slice(0, stemUs.length);
        let ukResult: string;
        if (origStem === origStem.toUpperCase()) {
            ukResult = stemUk.toUpperCase();
        } else if (origStem[0] === origStem[0].toUpperCase()) {
            ukResult = stemUk[0].toUpperCase() + stemUk.slice(1);
        } else {
            ukResult = stemUk;
        }
        return ukResult + suffix;
    });
}

/**
 * Switch the active dialect. Lazy-loads UK overrides on first en-GB use.
 * Rebuilds loadedWords and bumps version counter.
 */
export async function setDialect(dialect: Dialect): Promise<void> {
    if (dialect === currentDialect) return;
    currentDialect = dialect;
    if (dialect === 'en-GB' && !ukOverrides) {
        const mod = await import('./uk-overrides');
        ukOverrides = mod.UK_OVERRIDES;
        // Build reverse map
        ukToUsMap = new Map();
        for (const [usWord, override] of Object.entries(ukOverrides)) {
            ukToUsMap.set(override.word.toLowerCase(), usWord);
        }
        // Build pre-compiled regex for text substitution using stem-based matching.
        // Stems are sorted longest-first so "colorful" is checked before "color".
        const stems = buildUkStemMap(ukOverrides)
            .sort((a, b) => b[0].length - a[0].length);
        ukTextMap = {};
        for (const [us, uk] of stems) ukTextMap[us] = uk;
        ukStemKeys = stems.map(([us]) => us);
        // Match stem followed by optional word characters (to catch inflections).
        // Short ambiguous stems get \b guards; longer stems match inside compounds.
        const pattern = stems
            .map(([us]) => {
                const escaped = us.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return BOUNDARY_REQUIRED_STEMS.has(us)
                    ? `\\b${escaped}\\w*`
                    : `${escaped}\\w*`;
            })
            .join('|');
        ukTextRegex = new RegExp(pattern, 'gi');
    }
    rebuildLoadedWords();
    version++;
}

/** Apply UK overrides to baseWords or restore US originals. */
function rebuildLoadedWords(): void {
    if (currentDialect === 'en-US' || !ukOverrides) {
        // en-US: share reference — no copy needed since baseWords is replaced
        // (not mutated) on tier loads, and loadedWords is read-only downstream.
        loadedWords = baseWords;
    } else {
        loadedWords = baseWords.map(w => {
            const def = ukTextReplace(w.definition);
            const ex = ukTextReplace(w.exampleSentence);
            if (!Object.hasOwn(ukOverrides!, w.word)) {
                // No spelling override, but definition/example may still need UK text
                if (def === w.definition && ex === w.exampleSentence) return w;
                return { ...w, definition: def, exampleSentence: ex };
            }
            const override = ukOverrides![w.word];
            return {
                ...w,
                word: override.word,
                pronunciation: override.pronunciation ?? w.pronunciation,
                distractors: override.distractors,
                definition: def,
                exampleSentence: ex,
            };
        });
    }
    invalidateCaches();
}

// ── Tier loading ─────────────────────────────────────────────────────────────

/** Retry a dynamic import up to 3 times with exponential backoff (1s, 2s, 4s). */
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    const delays = [1000, 2000, 4000];
    let lastError: unknown;
    for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < delays.length) {
                await new Promise(r => setTimeout(r, delays[attempt]));
            }
        }
    }
    throw new Error(`Failed to load ${label} after ${delays.length + 1} attempts: ${lastError}`);
}

const tierImporters: Record<number, () => Promise<{ default?: SpellingWord[]; [key: string]: unknown }>> = {
    3: () => Promise.all([import('./tier3'), import('./tier3-pipeline')]).then(
        ([core, pipeline]) => ({ TIER_3_WORDS: [...core.TIER_3_WORDS, ...pipeline.TIER_3_PIPELINE_WORDS] }),
    ),
    4: () => Promise.all([import('./tier4'), import('./tier4-pipeline')]).then(
        ([core, pipeline]) => ({ TIER_4_WORDS: [...core.TIER_4_WORDS, ...pipeline.TIER_4_PIPELINE_WORDS] }),
    ),
    5: () => Promise.all([import('./tier5'), import('./tier5-expansion'), import('./tier5-pipeline')]).then(
        ([core, exp, pipeline]) => ({ TIER_5_WORDS: [...core.TIER_5_WORDS, ...exp.TIER_5_EXPANSION_WORDS, ...pipeline.TIER_5_PIPELINE_WORDS] }),
    ),
    // Tiers 6-9: pipeline-only (no hand-curated core files)
    6: () => import('./tier6-pipeline').then(m => ({ TIER_6_WORDS: m.TIER_6_PIPELINE_WORDS })),
    7: () => import('./tier7-pipeline').then(m => ({ TIER_7_WORDS: m.TIER_7_PIPELINE_WORDS })),
    8: () => import('./tier8-pipeline').then(m => ({ TIER_8_WORDS: m.TIER_8_PIPELINE_WORDS })),
    9: () => import('./tier9-pipeline').then(m => ({ TIER_9_WORDS: m.TIER_9_PIPELINE_WORDS })),
};

/** Pipeline expansion importers for tiers 1-2 (lazy-loaded separately from core). */
const pipelineImporters: Record<number, () => Promise<SpellingWord[]>> = {
    1: () => import('./tier1-pipeline').then(m => m.TIER_1_PIPELINE_WORDS),
    2: () => import('./tier2-pipeline').then(m => m.TIER_2_PIPELINE_WORDS),
};
const loadedPipeline = new Set<number>();

/**
 * Load pipeline expansion words for tiers 1-2.
 * These are lazy-loaded to keep initial bundle small.
 * Safe to call multiple times — no-ops if already loaded.
 */
export async function ensurePipelineWords(): Promise<void> {
    const missing = [1, 2].filter(t => !loadedPipeline.has(t));
    if (missing.length === 0) return;

    const modules = await Promise.all(missing.map(t =>
        withRetry(() => pipelineImporters[t](), `tier ${t} pipeline`),
    ));
    const existing = new Set(baseWords.map(w => w.word));
    const newWords: SpellingWord[] = [];

    for (let i = 0; i < missing.length; i++) {
        const words = modules[i];
        const unique = words.filter(w => !existing.has(w.word));
        newWords.push(...unique);
        for (const w of unique) existing.add(w.word);
        loadedPipeline.add(missing[i]);
    }

    if (newWords.length > 0) {
        baseWords = [...baseWords, ...newWords];
        rebuildLoadedWords();
        version++;
    }
}

/**
 * Ensure only the tiers needed for a specific difficulty level are loaded.
 * Loads the target tier plus ±1 buffer for adaptive difficulty headroom.
 * Much faster initial load than ensureAllWords() for users at lower levels.
 */
export async function ensureTiersForLevel(level: number): Promise<void> {
    // Map level to needed tiers: the level's own tier + neighbors for adaptive range
    const needed = new Set<number>();
    // Level 10 uses difficulty-10 words which come from tiers 5 and 9
    if (level === 10) {
        needed.add(5).add(8).add(9);
    } else {
        // Core tier for this level
        const tier = Math.min(Math.max(level, 1), 9);
        needed.add(tier);
        if (tier > 1) needed.add(tier - 1); // buffer below
        if (tier < 9) needed.add(tier + 1); // buffer above
    }

    const missingTiers = [...needed].filter(t => !loadedTiers.has(t) && tierImporters[t]);
    // Also load pipeline for tiers 1-2 if they're in the needed set
    const missingPipeline = [1, 2].filter(t => needed.has(t) && !loadedPipeline.has(t));

    if (missingTiers.length === 0 && missingPipeline.length === 0) return;

    const [modules, pipelineModules] = await Promise.all([
        Promise.all(missingTiers.map(async (t) => {
            return withRetry(tierImporters[t], `tier ${t}`);
        })),
        Promise.all(missingPipeline.map(t =>
            withRetry(() => pipelineImporters[t](), `tier ${t} pipeline`),
        )),
    ]);

    const newWords: SpellingWord[] = [];
    for (let i = 0; i < missingTiers.length; i++) {
        const mod = modules[i];
        const tierKey = Object.keys(mod).find(k => k.startsWith('TIER_'));
        const words = tierKey ? (mod[tierKey] as SpellingWord[]) : [];
        newWords.push(...words);
        loadedTiers.add(missingTiers[i]);
    }
    for (let i = 0; i < missingPipeline.length; i++) {
        newWords.push(...pipelineModules[i]);
        loadedPipeline.add(missingPipeline[i]);
    }

    if (newWords.length > 0) {
        const existing = new Set(baseWords.map(w => w.word));
        const unique = newWords.filter(w => !existing.has(w.word));
        baseWords = [...baseWords, ...unique];
        rebuildLoadedWords();
        version++;
    }
}

/**
 * Ensure all word tiers (1-9) are loaded, including pipeline expansions.
 * Returns immediately if already loaded. Safe to call multiple times.
 * Loads all missing tiers in parallel for maximum speed.
 */
export async function ensureAllWords(): Promise<void> {
    const allTiers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const missing = allTiers.filter(t => !loadedTiers.has(t));
    const pipelineMissing = [1, 2].filter(t => !loadedPipeline.has(t));

    if (missing.length === 0 && pipelineMissing.length === 0) return;

    // Load all missing tiers + pipeline expansions in parallel (with retry)
    const [modules, pipelineModules] = await Promise.all([
        Promise.all(
            missing.map(async (t) => {
                const importer = tierImporters[t];
                if (!importer) return null;
                return withRetry(importer, `tier ${t}`);
            }),
        ),
        Promise.all(pipelineMissing.map(t =>
            withRetry(() => pipelineImporters[t](), `tier ${t} pipeline`),
        )),
    ]);

    const newWords: SpellingWord[] = [];
    for (let i = 0; i < missing.length; i++) {
        const mod = modules[i];
        if (!mod) continue;
        // Each tier exports a named constant like TIER_3_WORDS
        const tierKey = Object.keys(mod).find(k => k.startsWith('TIER_'));
        const words = tierKey ? (mod[tierKey] as SpellingWord[]) : [];
        newWords.push(...words);
        loadedTiers.add(missing[i]);
    }

    for (let i = 0; i < pipelineMissing.length; i++) {
        newWords.push(...pipelineModules[i]);
        loadedPipeline.add(pipelineMissing[i]);
    }

    if (newWords.length > 0) {
        // Deduplicate by US canonical word string (build Set once, reuse)
        const existing = new Set(baseWords.map(w => w.word));
        const unique = newWords.filter(w => !existing.has(w.word));
        baseWords = [...baseWords, ...unique];
        rebuildLoadedWords();
        version++;
    }
}

