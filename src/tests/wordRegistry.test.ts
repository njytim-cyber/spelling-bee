import { describe, it, expect } from 'vitest';
import {
    getRegistryVersion,
    getLoadedWords,
    getLoadedTiers,
    getLoadedPacks,
    ensureAllTiers,
} from '../domains/spelling/words/registry';

describe('wordRegistry.ts', () => {

    it('starts with tier 1 and 2 loaded', () => {
        const tiers = getLoadedTiers();
        expect(tiers.has(1)).toBe(true);
        expect(tiers.has(2)).toBe(true);
    });

    it('initial words are non-empty', () => {
        const words = getLoadedWords();
        expect(words.length).toBeGreaterThan(0);
    });

    it('initial load has reasonable uniqueness (>90%)', () => {
        const words = getLoadedWords();
        const unique = new Set(words.map(w => w.word));
        // Small overlap between tiers is acceptable; dynamic loads deduplicate
        expect(unique.size / words.length).toBeGreaterThan(0.9);
    });

    it('ensureAllTiers loads tiers 3-5', async () => {
        const wordsBefore = getLoadedWords().length;
        await ensureAllTiers();
        expect(getLoadedTiers().has(3)).toBe(true);
        expect(getLoadedTiers().has(4)).toBe(true);
        expect(getLoadedTiers().has(5)).toBe(true);
        expect(getLoadedWords().length).toBeGreaterThan(wordsBefore);
    });

    it('version increments after tier load', async () => {
        // ensureAllTiers was already called — version should be > 0
        expect(getRegistryVersion()).toBeGreaterThan(0);
    });

    it('re-loading is idempotent', async () => {
        await ensureAllTiers();
        const v1 = getRegistryVersion();
        const count1 = getLoadedWords().length;
        await ensureAllTiers();
        expect(getRegistryVersion()).toBe(v1);
        expect(getLoadedWords().length).toBe(count1);
    });

    it('competition packs start empty', () => {
        expect(getLoadedPacks().size).toBe(0);
    });

    it('every loaded word has required fields', () => {
        for (const w of getLoadedWords()) {
            expect(typeof w.word).toBe('string');
            expect(w.word.length).toBeGreaterThan(0);
            expect(typeof w.definition).toBe('string');
            expect(typeof w.difficulty).toBe('number');
            expect(w.difficulty).toBeGreaterThanOrEqual(1);
            expect(w.difficulty).toBeLessThanOrEqual(10);
        }
    });
});
