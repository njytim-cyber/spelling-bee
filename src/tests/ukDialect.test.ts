import { describe, it, expect, beforeAll } from 'vitest';
import {
    getLoadedWords,
    getRegistryVersion,
    getDialect,
    setDialect,
    resolveUsKey,
    ensureAllWords,
} from '../domains/spelling/words/registry';
import { UK_OVERRIDES } from '../domains/spelling/words/uk-overrides';

describe('UK dialect support', () => {
    let versionBeforeDialect: number;
    let usWordCount: number;

    beforeAll(async () => {
        await ensureAllWords();
        versionBeforeDialect = getRegistryVersion();
        usWordCount = getLoadedWords().length;
    }, 60_000);

    it('starts in en-US dialect', () => {
        expect(getDialect()).toBe('en-US');
    });

    it('setDialect("en-GB") switches to UK mode', async () => {
        await setDialect('en-GB');
        expect(getDialect()).toBe('en-GB');
    }, 30_000);

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
        const missing: string[] = [];
        for (const usKey of Object.keys(UK_OVERRIDES)) {
            if (!usWords.has(usKey)) missing.push(usKey);
        }
        expect(missing).toEqual([]);
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

    it('example sentences use UK spellings in en-GB mode', async () => {
        await setDialect('en-GB');
        const words = getLoadedWords();
        const colour = words.find(w => w.word === 'colour');
        expect(colour).toBeDefined();
        // "color" in the example should become "colour"
        expect(colour!.exampleSentence).toContain('colour');
        expect(colour!.exampleSentence).not.toContain('color');
    }, 30_000);

    it('definitions use UK spellings in en-GB mode', async () => {
        await setDialect('en-GB');
        const words = getLoadedWords();
        // "colorize" definition: "To add color to..."
        const colourise = words.find(w => w.word === 'colourise');
        if (colourise && colourise.definition.toLowerCase().includes('colour')) {
            expect(colourise.definition.toLowerCase()).not.toMatch(/\bcolor\b/);
        }
        // "honorable" definition: "...showing honor..."
        const honourable = words.find(w => w.word === 'honourable');
        if (honourable) {
            expect(honourable.definition.toLowerCase()).not.toMatch(/\bhonor\b/);
        }
    }, 30_000);

    it('UK text substitution respects word boundaries', async () => {
        await setDialect('en-GB');
        const words = getLoadedWords();
        // "tire" should NOT be replaced inside "entire", "retire", etc.
        const entire = words.find(w => w.word === 'entire');
        if (entire) {
            expect(entire.word).toBe('entire');
            expect(entire.definition).not.toContain('entyre');
        }
        // "mom" should NOT be replaced inside "moment", "momentum"
        const moment = words.find(w => w.word === 'moment');
        if (moment) {
            expect(moment.definition).not.toContain('mum');
        }
    }, 30_000);

    it('UK text covers compound/inflected forms (e.g. multicolored)', async () => {
        await setDialect('en-GB');
        const words = getLoadedWords();
        // Check that "color" in definitions/examples is converted to "colour"
        // even in compounds and inflections (colorless → colourless, etc.)
        const badWords: string[] = [];
        const colorRegex = /\bcolor(?!ado)\w*/i; // "colorado" is a proper noun/word, not a colour variant
        for (const w of words) {
            if (colorRegex.test(w.definition) || colorRegex.test(w.exampleSentence)) {
                badWords.push(w.word);
            }
        }
        expect(badWords).toEqual([]);
    }, 30_000);

    it('setDialect("en-US") restores US words', async () => {
        await setDialect('en-US');
        expect(getDialect()).toBe('en-US');
        const words = getLoadedWords();
        const wordStrings = words.map(w => w.word);
        expect(wordStrings).toContain('harbor');
        expect(wordStrings).not.toContain('harbour');
    }, 30_000);

    it('round-trip restores US text in definitions and examples', () => {
        const words = getLoadedWords();
        const color = words.find(w => w.word === 'color');
        expect(color).toBeDefined();
        expect(color!.exampleSentence).toContain('color');
        expect(color!.exampleSentence).not.toContain('colour');
    });

    it('round-trip dialect switch preserves word count', () => {
        expect(getLoadedWords().length).toBe(usWordCount);
    });
});
