import { describe, it, expect } from 'vitest';
import { spellingDiff, spellingHint } from '../utils/spellingDiff';

describe('spellingDiff', () => {
    it('marks all chars correct for identical strings', () => {
        const { correctChars, typedChars } = spellingDiff('apple', 'apple');
        expect(correctChars.every(c => c.kind === 'correct')).toBe(true);
        expect(typedChars.every(c => c.kind === 'correct')).toBe(true);
        expect(correctChars.map(c => c.char).join('')).toBe('apple');
    });

    it('detects missing letters', () => {
        const { correctChars } = spellingDiff('aple', 'apple');
        const missing = correctChars.filter(c => c.kind === 'missing');
        expect(missing.length).toBe(1);
        expect(missing[0].char).toBe('p');
    });

    it('detects extra letters', () => {
        const { typedChars } = spellingDiff('appple', 'apple');
        const extra = typedChars.filter(c => c.kind === 'extra');
        expect(extra.length).toBe(1);
        expect(extra[0].char).toBe('p');
    });

    it('handles completely different words', () => {
        const { correctChars, typedChars } = spellingDiff('xyz', 'abc');
        expect(correctChars.every(c => c.kind === 'missing')).toBe(true);
        expect(typedChars.every(c => c.kind === 'extra')).toBe(true);
    });

    it('handles empty typed string', () => {
        const { correctChars, typedChars } = spellingDiff('', 'hello');
        expect(correctChars.every(c => c.kind === 'missing')).toBe(true);
        expect(typedChars).toHaveLength(0);
    });

    it('handles empty correct string', () => {
        const { correctChars, typedChars } = spellingDiff('hello', '');
        expect(correctChars).toHaveLength(0);
        expect(typedChars.every(c => c.kind === 'extra')).toBe(true);
    });

    it('is case-insensitive for matching', () => {
        const { correctChars } = spellingDiff('Apple', 'apple');
        expect(correctChars.every(c => c.kind === 'correct')).toBe(true);
    });

    it('preserves original case in output', () => {
        const { correctChars, typedChars } = spellingDiff('Apple', 'apple');
        expect(typedChars[0].char).toBe('A');
        expect(correctChars[0].char).toBe('a');
    });

    it('handles transposition (ie → ei)', () => {
        const { correctChars } = spellingDiff('recieve', 'receive');
        // Both 'i' and 'e' at the swap position should appear
        const allCorrectChars = correctChars.map(c => c.char).join('');
        expect(allCorrectChars).toContain('e');
        expect(allCorrectChars).toContain('i');
        // Most chars should be correct since it's a small diff
        const correctCount = correctChars.filter(c => c.kind === 'correct').length;
        expect(correctCount).toBeGreaterThanOrEqual(5);
    });
});

describe('spellingHint', () => {
    it('returns empty for correct spelling', () => {
        expect(spellingHint('apple', 'apple')).toBe('');
    });

    it('returns empty for case-only differences', () => {
        expect(spellingHint('Apple', 'apple')).toBe('');
    });

    it('trims whitespace from typed input', () => {
        expect(spellingHint('  apple  ', 'apple')).toBe('');
    });

    it('detects adjacent transposition', () => {
        expect(spellingHint('recieve', 'receive')).toBe("swapped 'ei'");
    });

    it('detects single wrong letter', () => {
        expect(spellingHint('definite', 'definete')).toBe("'i' should be 'e'");
    });

    it('detects single missing letter', () => {
        expect(spellingHint('enviroment', 'environment')).toBe("missing 'n'");
    });

    it('detects single extra letter', () => {
        expect(spellingHint('occurrance', 'occurence')).not.toBe('');
    });

    it('detects missing double consonant', () => {
        expect(spellingHint('comitee', 'committee')).toBe("needs double 'mm'");
    });

    it('detects extra letter in double consonant case', () => {
        expect(spellingHint('occassion', 'occasion')).toBe("extra 's'");
    });

    it('returns empty for very different words (no simple pattern)', () => {
        expect(spellingHint('xyz', 'abcdef')).toBe('');
    });
});
