/**
 * utils/offlinePacks.ts
 *
 * Manages offline availability of word tier chunks.
 * "Downloading a pack" pre-fetches the dynamic import chunks so they
 * are in the browser/service worker cache for offline use.
 */
import { ensureAllTiers, getLoadedTiers } from '../domains/spelling/words/registry';

export interface WordPack {
    id: string;
    label: string;
    description: string;
    tiers: number[];
    downloaded: boolean;
}

const PACKS: Omit<WordPack, 'downloaded'>[] = [
    { id: 'k-3rd', label: 'K – 3rd', description: 'CVC, blends, digraphs, silent-e, vowel teams', tiers: [1, 2] },
    { id: '4th-5th', label: '4th – 5th', description: 'Prefixes, suffixes, multisyllable', tiers: [3] },
    { id: '6th-plus', label: '6th+', description: 'Latin/Greek roots, competition words', tiers: [4, 5] },
];

/** Get the status of all word packs. */
export function getPackStatus(): WordPack[] {
    const loaded = getLoadedTiers();
    return PACKS.map(p => ({
        ...p,
        downloaded: p.tiers.every(t => loaded.has(t)),
    }));
}

/**
 * Download a word pack by triggering its dynamic imports.
 * This populates the browser cache / service worker for offline use.
 */
export async function downloadPack(): Promise<void> {
    // All tiers load together now
    await ensureAllTiers();
}
