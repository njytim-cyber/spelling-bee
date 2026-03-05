/**
 * utils/cosmeticPacks.ts
 *
 * Cosmetic IAP packs — one-time purchases of themed chalk colors and swipe trails.
 * Each pack has a Stripe Price ID (set via env) and a list of cosmetic item IDs.
 *
 * The actual ChalkTheme / TrailConfig objects live in chalkThemes.ts / trails.ts
 * with `packItem: true`. This file just defines which items belong to which pack.
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
}

export const COSMETIC_PACKS: CosmeticPack[] = [
    {
        id: 'neon-pack',
        name: 'Neon Glow',
        description: '3 electric chalk colors that light up the blackboard',
        price: '$0.99',
        priceEnv: 'STRIPE_PRICE_NEON_PACK',
        emoji: '💡',
        themeIds: ['neon-pink', 'neon-cyan', 'neon-yellow'],
        trailIds: [],
    },
    {
        id: 'pastel-pack',
        name: 'Pastel Dreams',
        description: '3 soft chalk colors for a gentle vibe',
        price: '$0.99',
        priceEnv: 'STRIPE_PRICE_PASTEL_PACK',
        emoji: '🌸',
        themeIds: ['pastel-lavender', 'pastel-peach', 'pastel-sky'],
        trailIds: [],
    },
    {
        id: 'nature-pack',
        name: 'Nature\'s Palette',
        description: '3 earthy chalk colors inspired by the great outdoors',
        price: '$0.99',
        priceEnv: 'STRIPE_PRICE_NATURE_PACK',
        emoji: '🌿',
        themeIds: ['forest-green', 'ocean-deep', 'autumn-leaf'],
        trailIds: [],
    },
    {
        id: 'trail-pack',
        name: 'Trail Variety',
        description: '3 new swipe trails: Snowflake, Sparkle, and Comet',
        price: '$1.49',
        priceEnv: 'STRIPE_PRICE_TRAIL_PACK',
        emoji: '🌟',
        themeIds: [],
        trailIds: ['snowflake', 'sparkle', 'comet'],
    },
    {
        id: 'ultimate-pack',
        name: 'Ultimate Collection',
        description: 'All 9 chalk colors + all 3 trails — best value!',
        price: '$2.99',
        priceEnv: 'STRIPE_PRICE_ULTIMATE_PACK',
        emoji: '👑',
        themeIds: ['neon-pink', 'neon-cyan', 'neon-yellow', 'pastel-lavender', 'pastel-peach', 'pastel-sky', 'forest-green', 'ocean-deep', 'autumn-leaf'],
        trailIds: ['snowflake', 'sparkle', 'comet'],
    },
];

/** Check if a cosmetic item ID belongs to a purchased pack */
export function isItemOwned(itemId: string, purchasedPacks: string[]): boolean {
    return COSMETIC_PACKS.some(
        pack => purchasedPacks.includes(pack.id) &&
            (pack.themeIds.includes(itemId) || pack.trailIds.includes(itemId)),
    );
}

/** Check if a pack is fully superseded by already-purchased packs */
export function isPackRedundant(packId: string, purchasedPacks: string[]): boolean {
    const pack = COSMETIC_PACKS.find(p => p.id === packId);
    if (!pack) return false;
    const allItems = [...pack.themeIds, ...pack.trailIds];
    return allItems.every(itemId => isItemOwned(itemId, purchasedPacks));
}
