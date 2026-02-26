/**
 * words/registry.ts
 *
 * Dynamic word loading registry. Tier 1-2 are eagerly loaded.
 * Tier 3-5 and competition packs load on demand via dynamic import().
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
/** Active word list (may have UK overlays applied) */
let loadedWords: SpellingWord[] = [...baseWords];
const loadedTiers = new Set<number>([1, 2]);
const loadedPacks = new Set<string>();
let version = 0;

let currentDialect: Dialect = 'en-US';
let ukOverrides: Record<string, UkOverride> | null = null;
/** Reverse map: UK spelling → US canonical key (for word history) */
let ukToUsMap: Map<string, string> | null = null;

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

/** Set of competition pack IDs currently loaded. */
export function getLoadedPacks(): ReadonlySet<string> {
    return loadedPacks;
}

/** Current active dialect. */
export function getDialect(): Dialect {
    return currentDialect;
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
    }
    rebuildLoadedWords();
    version++;
}

/** Apply UK overrides to baseWords or restore US originals. */
function rebuildLoadedWords(): void {
    if (currentDialect === 'en-US' || !ukOverrides) {
        loadedWords = [...baseWords];
    } else {
        loadedWords = baseWords.map(w => {
            const override = ukOverrides![w.word];
            if (!override) return w;
            return {
                ...w,
                word: override.word,
                pronunciation: override.pronunciation ?? w.pronunciation,
                distractors: override.distractors,
            };
        });
    }
}

// ── Tier loading ─────────────────────────────────────────────────────────────

const tierImporters: Record<number, () => Promise<{ default?: SpellingWord[]; [key: string]: unknown }>> = {
    3: () => import('./tier3'),
    4: () => import('./tier4'),
    5: () => import('./tier5'),
};

/**
 * Ensure all word tiers (1-5) are loaded.
 * Returns immediately if already loaded. Safe to call multiple times.
 */
export async function ensureAllTiers(): Promise<void> {
    const allTiers = [1, 2, 3, 4, 5];
    const missing = allTiers.filter(t => !loadedTiers.has(t));
    if (missing.length === 0) return;

    const modules = await Promise.all(
        missing.map(t => tierImporters[t]?.()),
    );

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

    if (newWords.length > 0) {
        // Deduplicate by US canonical word string
        const existing = new Set(baseWords.map(w => w.word));
        const unique = newWords.filter(w => !existing.has(w.word));
        baseWords = [...baseWords, ...unique];
        rebuildLoadedWords();
        version++;
    }
}

// ── Competition packs ────────────────────────────────────────────────────────

const packImporters: Record<string, () => Promise<{ default?: SpellingWord[]; [key: string]: unknown }>> = {
    scripps: () => import('./tier5-scripps'),
    'state-bee': () => import('./tier5-state'),
};

/**
 * Load a competition word pack (scripps, state-bee).
 * No-op if already loaded. Files may not exist yet — fails silently.
 */
export async function loadCompetitionPack(packId: string): Promise<void> {
    if (loadedPacks.has(packId)) return;
    const importer = packImporters[packId];
    if (!importer) return;

    const mod = await importer();
    const packKey = Object.keys(mod).find(k => k.includes('WORDS'));
    const words = packKey ? (mod[packKey] as SpellingWord[]) : [];

    if (words.length > 0) {
        const existing = new Set(baseWords.map(w => w.word));
        const unique = words.filter(w => !existing.has(w.word));
        baseWords = [...baseWords, ...unique];
        rebuildLoadedWords();
        loadedPacks.add(packId);
        version++;
    }
}
