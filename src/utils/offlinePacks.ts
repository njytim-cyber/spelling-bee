/**
 * utils/offlinePacks.ts
 *
 * Manages offline availability of word tier chunks.
 * "Downloading a pack" pre-fetches the dynamic import chunks so they
 * are in the browser/service worker cache for offline use.
 */
import { ensureTiersForBand, getLoadedTiers } from '../domains/spelling/words/registry';

export interface WordPack {
    id: string;
    label: string;
    description: string;
    tiers: number[];
    downloaded: boolean;
}

const PACKS: Omit<WordPack, 'downloaded'>[] = [
    { id: 'starter', label: 'Starter', description: 'K-1st grade (CVC, blends, digraphs)', tiers: [1, 2] },
    { id: 'rising', label: 'Rising', description: '2nd-5th grade (silent-e, vowel teams, prefixes)', tiers: [3, 4] },
    { id: 'sigma', label: 'Sigma', description: '6th+ (Latin/Greek roots, competition)', tiers: [5] },
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
export async function downloadPack(packId: string): Promise<void> {
    const pack = PACKS.find(p => p.id === packId);
    if (!pack) return;

    // Map pack to the corresponding band that loads those tiers
    if (packId === 'starter') {
        await ensureTiersForBand('starter');
    } else if (packId === 'rising') {
        await ensureTiersForBand('rising');
    } else if (packId === 'sigma') {
        await ensureTiersForBand('sigma');
    }
}
