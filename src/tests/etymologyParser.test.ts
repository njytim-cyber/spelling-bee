import { describe, it, expect } from 'vitest';
import { extractLanguage, parseEtymology } from '../utils/etymologyParser';

describe('etymologyParser', () => {
    describe('extractLanguage', () => {
        it('extracts Latin', () => {
            expect(extractLanguage('Latin: acquiescere (to find rest)')).toBe('Latin');
        });

        it('extracts Greek', () => {
            expect(extractLanguage('Greek: onomatopoiia (word-making)')).toBe('Greek');
        });

        it('extracts French', () => {
            expect(extractLanguage('French: bourgeoisie (middle class)')).toBe('French');
        });

        it('normalises Old French to French', () => {
            expect(extractLanguage('Old French: entente (understanding)')).toBe('French');
        });

        it('normalises Middle English to English', () => {
            expect(extractLanguage('Middle English: hous (house)')).toBe('English');
        });

        it('returns Other for missing etymology', () => {
            expect(extractLanguage(undefined)).toBe('Other');
            expect(extractLanguage('')).toBe('Other');
        });

        it('returns Other for unrecognised language', () => {
            expect(extractLanguage('Sanskrit: dharma (duty)')).toBe('Other');
        });
    });

    describe('parseEtymology', () => {
        it('parses single-language etymology', () => {
            const result = parseEtymology('Latin: supercilium (eyebrow, haughtiness)');
            expect(result.language).toBe('Latin');
            expect(result.roots).toEqual(['supercilium']);
            expect(result.isCompound).toBe(false);
            expect(result.allLanguages).toEqual(['Latin']);
        });

        it('parses compound etymology', () => {
            const result = parseEtymology('French: bureau (desk, office) + Greek: kratos (rule, power)');
            expect(result.language).toBe('French');
            expect(result.roots).toEqual(['bureau', 'kratos']);
            expect(result.isCompound).toBe(true);
            expect(result.allLanguages).toContain('French');
            expect(result.allLanguages).toContain('Greek');
        });

        it('handles etymology with from clauses', () => {
            const result = parseEtymology('Latin: conscientia (moral awareness), from conscire (to be aware)');
            expect(result.language).toBe('Latin');
            expect(result.roots[0]).toBe('conscientia');
        });

        it('returns Other for empty string', () => {
            const result = parseEtymology('');
            expect(result.language).toBe('Other');
            expect(result.roots).toEqual([]);
            expect(result.isCompound).toBe(false);
        });

        it('deduplicates languages in compound', () => {
            const result = parseEtymology('Latin: super (above) + Latin: cilium (eyelid)');
            expect(result.allLanguages).toEqual(['Latin']);
            expect(result.isCompound).toBe(true); // still compound (2 parts), even if same language
            expect(result.roots).toEqual(['super', 'cilium']);
        });
    });
});
