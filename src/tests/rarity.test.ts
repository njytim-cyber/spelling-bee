import { describe, it, expect } from 'vitest';
import { difficultyToRarity, getRarityConfig, RARITY_CONFIGS, ALL_RARITIES, RARITY_ORDER, type Rarity } from '../utils/rarity';
import type { DifficultyTier } from '../domains/spelling/words/types';

describe('rarity.ts', () => {
    describe('difficultyToRarity', () => {
        it('maps tiers 1-2 to common', () => {
            expect(difficultyToRarity(1)).toBe('common');
            expect(difficultyToRarity(2)).toBe('common');
        });

        it('maps tiers 3-4 to uncommon', () => {
            expect(difficultyToRarity(3)).toBe('uncommon');
            expect(difficultyToRarity(4)).toBe('uncommon');
        });

        it('maps tiers 5-6 to rare', () => {
            expect(difficultyToRarity(5)).toBe('rare');
            expect(difficultyToRarity(6)).toBe('rare');
        });

        it('maps tiers 7-8 to epic', () => {
            expect(difficultyToRarity(7)).toBe('epic');
            expect(difficultyToRarity(8)).toBe('epic');
        });

        it('maps tier 9 to legendary', () => {
            expect(difficultyToRarity(9)).toBe('legendary');
        });

        it('maps tier 10 to legendary', () => {
            expect(difficultyToRarity(10 as DifficultyTier)).toBe('legendary');
        });

        it('covers every difficulty tier 1-10', () => {
            const expected: [DifficultyTier, Rarity][] = [
                [1, 'common'], [2, 'common'],
                [3, 'uncommon'], [4, 'uncommon'],
                [5, 'rare'], [6, 'rare'],
                [7, 'epic'], [8, 'epic'],
                [9, 'legendary'], [10 as DifficultyTier, 'legendary'],
            ];
            for (const [diff, rarity] of expected) {
                expect(difficultyToRarity(diff)).toBe(rarity);
            }
        });
    });

    describe('getRarityConfig', () => {
        it('returns matching config for each difficulty', () => {
            const config = getRarityConfig(5);
            expect(config.rarity).toBe('rare');
            expect(config.label).toBe('Rare');
            expect(config.emoji).toBe('💎');
            expect(config.color).toBe('#3b82f6');
            expect(config.confettiIntensity).toBe('normal');
        });

        it('returns no confetti for common/uncommon', () => {
            expect(getRarityConfig(1).confettiIntensity).toBe('none');
            expect(getRarityConfig(2).confettiIntensity).toBe('none');
            expect(getRarityConfig(3).confettiIntensity).toBe('none');
            expect(getRarityConfig(4).confettiIntensity).toBe('none');
        });

        it('returns epic confetti for epic/legendary', () => {
            expect(getRarityConfig(7).confettiIntensity).toBe('epic');
            expect(getRarityConfig(9).confettiIntensity).toBe('epic');
        });
    });

    describe('RARITY_CONFIGS', () => {
        it('has entries for all 5 rarities', () => {
            expect(Object.keys(RARITY_CONFIGS)).toHaveLength(5);
            for (const r of ALL_RARITIES) {
                expect(RARITY_CONFIGS[r]).toBeDefined();
                expect(RARITY_CONFIGS[r].rarity).toBe(r);
            }
        });

        it('each config has required fields', () => {
            for (const config of Object.values(RARITY_CONFIGS)) {
                expect(config.label).toBeTruthy();
                expect(config.emoji).toBeTruthy();
                expect(config.color).toMatch(/^#[0-9a-f]{6}$/);
                expect(config.bgGlow).toMatch(/^rgba\(/);
                expect(['none', 'normal', 'epic']).toContain(config.confettiIntensity);
            }
        });
    });

    describe('RARITY_ORDER', () => {
        it('orders from common (lowest) to legendary (highest)', () => {
            expect(RARITY_ORDER.common).toBeLessThan(RARITY_ORDER.uncommon);
            expect(RARITY_ORDER.uncommon).toBeLessThan(RARITY_ORDER.rare);
            expect(RARITY_ORDER.rare).toBeLessThan(RARITY_ORDER.epic);
            expect(RARITY_ORDER.epic).toBeLessThan(RARITY_ORDER.legendary);
        });
    });

    describe('ALL_RARITIES', () => {
        it('contains 5 rarities in order', () => {
            expect(ALL_RARITIES).toHaveLength(5);
            expect(ALL_RARITIES[0]).toBe('common');
            expect(ALL_RARITIES[4]).toBe('legendary');
        });
    });
});
