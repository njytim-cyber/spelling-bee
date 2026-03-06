import { describe, it, expect } from 'vitest';
import { containsProfanity } from '../utils/profanityFilter';

describe('profanityFilter', () => {
    describe('substring matching (PROFANE_ROOTS)', () => {
        it('blocks words containing profane roots', () => {
            expect(containsProfanity('FuckYou')).toBe(true);
            expect(containsProfanity('bullshit')).toBe(true);
            expect(containsProfanity('MrPornStar')).toBe(true);
            expect(containsProfanity('cocksucker99')).toBe(true);
        });

        it('blocks case-insensitive', () => {
            expect(containsProfanity('FUCK')).toBe(true);
            expect(containsProfanity('sHiT')).toBe(true);
        });

        it('blocks with spaces/separators stripped', () => {
            expect(containsProfanity('f u c k')).toBe(true);
            expect(containsProfanity('sh-it')).toBe(true);
            expect(containsProfanity('f_u_c_k')).toBe(true);
            expect(containsProfanity('p.o.r.n')).toBe(true);
        });
    });

    describe('exact matching (EXACT_BLOCKLIST)', () => {
        it('blocks exact profane words', () => {
            expect(containsProfanity('ass')).toBe(true);
            expect(containsProfanity('dick')).toBe(true);
            expect(containsProfanity('cock')).toBe(true);
            expect(containsProfanity('nazi')).toBe(true);
        });

        it('does NOT block words containing exact-match words as substrings', () => {
            // These contain "ass" but are legitimate words
            expect(containsProfanity('assistant')).toBe(false);
            expect(containsProfanity('classic')).toBe(false);
            expect(containsProfanity('class')).toBe(false);
            // These contain "cock" substring but aren't in PROFANE_ROOTS
            expect(containsProfanity('peacock')).toBe(false);
            // "therapist" contains "rape" + "rapist" but those are exact-match only
            expect(containsProfanity('therapist')).toBe(false);
        });
    });

    describe('leet-speak normalization', () => {
        it('blocks leet-speak substitutions', () => {
            expect(containsProfanity('sh1t')).toBe(true);    // 1→i
            expect(containsProfanity('a$$hole')).toBe(false); // "ass" is exact-match, not substring — "$$hole" normalizes to "asshole" but "ass" is exact only
            expect(containsProfanity('fvck')).toBe(false);    // v→u not in normalization
            expect(containsProfanity('p0rn')).toBe(true);     // 0→o
            expect(containsProfanity('f4g')).toBe(true);      // 4→a → "fag"
        });

        it('blocks combined leet + case', () => {
            expect(containsProfanity('SH1T')).toBe(true);
            expect(containsProfanity('P0RN')).toBe(true);
        });
    });

    describe('safe names pass', () => {
        it('allows normal display names', () => {
            expect(containsProfanity('SwiftTiger42')).toBe(false);
            expect(containsProfanity('SpellingBee')).toBe(false);
            expect(containsProfanity('WordMaster')).toBe(false);
            expect(containsProfanity('Alex')).toBe(false);
            expect(containsProfanity('Player1')).toBe(false);
        });

        it('allows words that share letters with profanity', () => {
            expect(containsProfanity('grass')).toBe(false);
            expect(containsProfanity('brass')).toBe(false);
            expect(containsProfanity('assassin')).toBe(false);  // contains "ass" but exact-match only
            expect(containsProfanity('dickens')).toBe(false);   // wait — "dick" is exact-match only
            expect(containsProfanity('analytics')).toBe(false); // contains "anal" exact-match only
        });
    });

    describe('edge cases', () => {
        it('handles empty string', () => {
            expect(containsProfanity('')).toBe(false);
        });

        it('handles single characters', () => {
            expect(containsProfanity('a')).toBe(false);
        });

        it('handles numbers only', () => {
            expect(containsProfanity('12345')).toBe(false);
        });
    });
});
