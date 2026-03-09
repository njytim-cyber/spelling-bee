/**
 * utils/cosmeticPacks.ts
 *
 * Cosmetic IAP — a single one-time purchase that unlocks all cosmetic items.
 * Legacy packs are kept in LEGACY_PACKS so isItemOwned() still works for
 * users who purchased individual packs before the shop simplification.
 *
 * The actual ChalkTheme / TrailConfig objects live in chalkThemes.ts / trails.ts
 * with `packItem: true`. This file defines which items belong to which pack.
 */

export interface CosmeticPack {
    id: string;
    name: string;
    description: string;
    price: string;          // Display price e.g. "$0.99"
    priceEnv: string;       // Env var key for Stripe Price ID
    emoji: string;          // Pack icon
    /** Chalk theme IDs included in this pack */
    themeIds: string[];
    /** Trail IDs included in this pack */
    trailIds: string[];
    /** Flair IDs included in this pack */
    flairIds?: string[];
}

/** The single shop offering — one purchase, everything unlocked. */
export const EVERYTHING_PACK: CosmeticPack = {
    id: 'everything-pack',
    name: 'Everything Pack',
    description: 'All chalk styles, swipe trails, and avatar flair — forever',
    price: '$2.99',
    priceEnv: 'STRIPE_PRICE_EVERYTHING_PACK',
    emoji: '👑',
    themeIds: [
        'neon-pink', 'neon-cyan', 'neon-yellow',
        'pastel-lavender', 'pastel-peach', 'pastel-sky',
        'forest-green', 'ocean-deep', 'autumn-leaf',
    ],
    trailIds: ['snowflake', 'sparkle', 'comet'],
    flairIds: ['flair-snowfall', 'flair-petals', 'flair-sunbeam'],
};

/**
 * Legacy packs — kept for backwards compatibility so isItemOwned() resolves
 * items purchased before the shop simplification. Not shown in the shop UI.
 */
const LEGACY_PACKS: CosmeticPack[] = [
    { id: 'neon-pack', name: 'Neon Glow', description: '', price: '', priceEnv: '', emoji: '', themeIds: ['neon-pink', 'neon-cyan', 'neon-yellow'], trailIds: [] },
    { id: 'pastel-pack', name: 'Pastel Dreams', description: '', price: '', priceEnv: '', emoji: '', themeIds: ['pastel-lavender', 'pastel-peach', 'pastel-sky'], trailIds: [] },
    { id: 'nature-pack', name: "Nature's Palette", description: '', price: '', priceEnv: '', emoji: '', themeIds: ['forest-green', 'ocean-deep', 'autumn-leaf'], trailIds: [] },
    { id: 'trail-pack', name: 'Trail Variety', description: '', price: '', priceEnv: '', emoji: '', themeIds: [], trailIds: ['snowflake', 'sparkle', 'comet'] },
    { id: 'ultimate-pack', name: 'Ultimate Collection', description: '', price: '', priceEnv: '', emoji: '', themeIds: ['neon-pink', 'neon-cyan', 'neon-yellow', 'pastel-lavender', 'pastel-peach', 'pastel-sky', 'forest-green', 'ocean-deep', 'autumn-leaf'], trailIds: ['snowflake', 'sparkle', 'comet'] },
    { id: 'winter-flair-pack', name: 'Winter Wonderland', description: '', price: '', priceEnv: '', emoji: '', themeIds: [], trailIds: [], flairIds: ['flair-snowfall'] },
    { id: 'spring-flair-pack', name: 'Spring Bloom', description: '', price: '', priceEnv: '', emoji: '', themeIds: [], trailIds: [], flairIds: ['flair-petals'] },
    { id: 'summer-flair-pack', name: 'Summer Rays', description: '', price: '', priceEnv: '', emoji: '', themeIds: [], trailIds: [], flairIds: ['flair-sunbeam'] },
    { id: 'seasonal-flair-bundle', name: 'All Seasons Bundle', description: '', price: '', priceEnv: '', emoji: '', themeIds: [], trailIds: [], flairIds: ['flair-snowfall', 'flair-petals', 'flair-sunbeam'] },
];

/** All packs (current + legacy) used for ownership resolution. */
export const COSMETIC_PACKS: CosmeticPack[] = [EVERYTHING_PACK, ...LEGACY_PACKS];

/** Check if a cosmetic item ID belongs to a purchased pack */
export function isItemOwned(itemId: string, purchasedPacks: string[]): boolean {
    return COSMETIC_PACKS.some(
        pack => purchasedPacks.includes(pack.id) &&
            (pack.themeIds.includes(itemId) || pack.trailIds.includes(itemId) || (pack.flairIds?.includes(itemId) ?? false)),
    );
}

/** Check if a pack is fully superseded by already-purchased packs */
export function isPackRedundant(packId: string, purchasedPacks: string[]): boolean {
    const pack = COSMETIC_PACKS.find(p => p.id === packId);
    if (!pack) return false;
    const allItems = [...pack.themeIds, ...pack.trailIds, ...(pack.flairIds ?? [])];
    return allItems.every(itemId => isItemOwned(itemId, purchasedPacks));
}
