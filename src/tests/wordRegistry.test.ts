import { describe, it, expect } from 'vitest';
import {
    getRegistryVersion,
    getLoadedWords,
    getLoadedTiers,
    ensureAllWords,
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

    it('ensureAllWords loads tiers 3-9', async () => {
        const wordsBefore = getLoadedWords().length;
        await ensureAllWords();
        for (let t = 3; t <= 9; t++) {
            expect(getLoadedTiers().has(t)).toBe(true);
        }
        expect(getLoadedWords().length).toBeGreaterThan(wordsBefore);
    }, 60_000);

    it('version increments after tier load', async () => {
        // ensureAllWords was already called — version should be > 0
        expect(getRegistryVersion()).toBeGreaterThan(0);
    });

    it('re-loading is idempotent', async () => {
        await ensureAllWords();
        const v1 = getRegistryVersion();
        const count1 = getLoadedWords().length;
        await ensureAllWords();
        expect(getRegistryVersion()).toBe(v1);
        expect(getLoadedWords().length).toBe(count1);
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
    }, 60_000);
});
