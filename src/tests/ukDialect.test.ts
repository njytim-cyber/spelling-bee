import { describe, it, expect, beforeAll } from 'vitest';
import {
    getLoadedWords,
    getRegistryVersion,
    getDialect,
    setDialect,
    resolveUsKey,
    ensureAllTiers,
    loadCompetitionPack,
} from '../domains/spelling/words/registry';
import { UK_OVERRIDES } from '../domains/spelling/words/uk-overrides';

describe('UK dialect support', () => {
    let versionBeforeDialect: number;
    let usWordCount: number;

    beforeAll(async () => {
        await ensureAllTiers();
        await loadCompetitionPack('scripps');
        await loadCompetitionPack('state-bee');
        versionBeforeDialect = getRegistryVersion();
        usWordCount = getLoadedWords().length;
    });

    it('starts in en-US dialect', () => {
        expect(getDialect()).toBe('en-US');
    });

    it('setDialect("en-GB") switches to UK mode', async () => {
        await setDialect('en-GB');
        expect(getDialect()).toBe('en-GB');
    });

    it('version increments on dialect change', () => {
        expect(getRegistryVersion()).toBeGreaterThan(versionBeforeDialect);
    });

    it('word count is preserved after dialect switch', () => {
        expect(getLoadedWords().length).toBe(usWordCount);
    });

    it('UK overrides are applied — "harbour" replaces "harbor"', () => {
        const words = getLoadedWords();
        const wordStrings = words.map(w => w.word);
        expect(wordStrings).toContain('harbour');
        expect(wordStrings).not.toContain('harbor');
    });

    it('UK overrides are applied — "colour" replaces "color" variants', () => {
        const words = getLoadedWords();
        const wordStrings = words.map(w => w.word);
        expect(wordStrings).toContain('colourful');
        expect(wordStrings).not.toContain('colorful');
    });

    it('UK words have UK-specific distractors', () => {
        const words = getLoadedWords();
        const harbour = words.find(w => w.word === 'harbour');
        expect(harbour).toBeDefined();
        expect(harbour!.distractors).toBeDefined();
        expect(harbour!.distractors).toEqual(['harbur', 'harber', 'harboir']);
    });

    it('non-override words are unchanged', () => {
        const words = getLoadedWords();
        // "cat" is a tier 1 word with no UK override
        const cat = words.find(w => w.word === 'cat');
        expect(cat).toBeDefined();
        expect(cat!.word).toBe('cat');
    });

    it('every UK override key exists in the US word bank', () => {
        const usWords = new Set(
            getLoadedWords().map(w => resolveUsKey(w.word)),
        );
        for (const usKey of Object.keys(UK_OVERRIDES)) {
            expect(usWords.has(usKey)).toBe(true);
        }
    });

    it('resolveUsKey maps UK spellings back to US keys', () => {
        expect(resolveUsKey('harbour')).toBe('harbor');
        expect(resolveUsKey('centre')).toBe('center');
        expect(resolveUsKey('organisation')).toBe('organization');
    });

    it('resolveUsKey returns input unchanged for US words', () => {
        expect(resolveUsKey('cat')).toBe('cat');
        expect(resolveUsKey('harbor')).toBe('harbor');
    });

    it('setDialect("en-US") restores US words', async () => {
        await setDialect('en-US');
        expect(getDialect()).toBe('en-US');
        const words = getLoadedWords();
        const wordStrings = words.map(w => w.word);
        expect(wordStrings).toContain('harbor');
        expect(wordStrings).not.toContain('harbour');
    });

    it('round-trip dialect switch preserves word count', () => {
        expect(getLoadedWords().length).toBe(usWordCount);
    });
});
