/**
 * words/registry.ts
 *
 * Dynamic word loading registry. Tier 1-2 are eagerly loaded (starter band).
 * Tier 3-5 and competition packs load on demand via dynamic import().
 */
import type { SpellingWord } from './types';
import { TIER_1_WORDS } from './tier1';
import { TIER_2_WORDS } from './tier2';

let loadedWords: SpellingWord[] = [...TIER_1_WORDS, ...TIER_2_WORDS];
const loadedTiers = new Set<number>([1, 2]);
const loadedPacks = new Set<string>();
let version = 0;

/** Current registry version — increments on every new tier/pack load. */
export function getRegistryVersion(): number {
    return version;
}

/** All currently loaded words. */
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

const tierImporters: Record<number, () => Promise<{ default?: SpellingWord[]; [key: string]: unknown }>> = {
    3: () => import('./tier3'),
    4: () => import('./tier4'),
    5: () => import('./tier5'),
};

/** Tiers required per band. */
const BAND_TIERS: Record<string, number[]> = {
    starter: [1, 2],
    rising: [1, 2, 3, 4],
    sigma: [1, 2, 3, 4, 5],
};

/**
 * Ensure all word tiers needed for the given band are loaded.
 * Returns immediately if already loaded. Safe to call multiple times.
 */
export async function ensureTiersForBand(band: string): Promise<void> {
    const needed = BAND_TIERS[band] ?? [1, 2];
    const missing = needed.filter(t => !loadedTiers.has(t));
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
        // Deduplicate by word string (in case of re-load)
        const existing = new Set(loadedWords.map(w => w.word));
        const unique = newWords.filter(w => !existing.has(w.word));
        loadedWords = [...loadedWords, ...unique];
        version++;
    }
}

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
        const existing = new Set(loadedWords.map(w => w.word));
        const unique = words.filter(w => !existing.has(w.word));
        loadedWords = [...loadedWords, ...unique];
        loadedPacks.add(packId);
        version++;
    }
}
