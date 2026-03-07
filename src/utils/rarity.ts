/**
 * utils/rarity.ts
 *
 * Maps word difficulty tiers (1-9) to collectible rarity levels.
 * Used for card borders, celebration scaling, and collection stats.
 */
import type { DifficultyTier } from '../domains/spelling/words/types';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface RarityConfig {
    rarity: Rarity;
    label: string;
    emoji: string;
    color: string;
    bgGlow: string;
    confettiIntensity: 'none' | 'normal' | 'epic';
}

export const RARITY_CONFIGS: Record<Rarity, RarityConfig> = {
    common:    { rarity: 'common',    label: 'Common',    emoji: '📗', color: '#a3a3a3', bgGlow: 'rgba(163,163,163,0.08)', confettiIntensity: 'none' },
    uncommon:  { rarity: 'uncommon',  label: 'Uncommon',  emoji: '📘', color: '#22c55e', bgGlow: 'rgba(34,197,94,0.10)',   confettiIntensity: 'none' },
    rare:      { rarity: 'rare',      label: 'Rare',      emoji: '💎', color: '#3b82f6', bgGlow: 'rgba(59,130,246,0.12)',  confettiIntensity: 'normal' },
    epic:      { rarity: 'epic',      label: 'Epic',      emoji: '🔮', color: '#a855f7', bgGlow: 'rgba(168,85,247,0.15)', confettiIntensity: 'epic' },
    legendary: { rarity: 'legendary', label: 'Legendary',  emoji: '👑', color: '#f59e0b', bgGlow: 'rgba(245,158,11,0.18)', confettiIntensity: 'epic' },
};

/** Numeric sort order (higher = rarer). */
export const RARITY_ORDER: Record<Rarity, number> = {
    common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
};

/** All rarities in display order. */
export const ALL_RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

/** Map a word's difficulty tier (1-10) to a rarity. */
export function difficultyToRarity(difficulty: DifficultyTier): Rarity {
    if (difficulty <= 2) return 'common';
    if (difficulty <= 4) return 'uncommon';
    if (difficulty <= 6) return 'rare';
    if (difficulty <= 8) return 'epic';
    return 'legendary';
}

/** Get full rarity config for a difficulty tier. */
export function getRarityConfig(difficulty: DifficultyTier): RarityConfig {
    return RARITY_CONFIGS[difficultyToRarity(difficulty)];
}
