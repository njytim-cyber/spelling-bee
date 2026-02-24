import { describe, it, expect } from 'vitest';
import { generateSpellingItem } from '../domains/spelling/spellingGenerator';

describe('spellingGenerator.ts', () => {

    const CATEGORIES = ['cvc', 'blends', 'digraphs', 'silent-e', 'vowel-teams', 'mix'] as const;

    describe('EngineItem shape', () => {
        it('produces an item with 3 unique options where options[correctIndex] === answer', () => {
            for (const cat of CATEGORIES) {
                for (let i = 0; i < 20; i++) {
                    const item = generateSpellingItem(1, cat, false);
                    expect(item.options).toHaveLength(3);
                    // All 3 options must be unique
                    expect(new Set(item.options).size).toBe(3);
                    // correctIndex must point to the correct answer
                    expect(item.options[item.correctIndex]).toBe(item.answer);
                    // correctIndex within bounds
                    expect(item.correctIndex).toBeGreaterThanOrEqual(0);
                    expect(item.correctIndex).toBeLessThanOrEqual(2);
                }
            }
        });

        it('prompt asks which spelling is correct', () => {
            for (let i = 0; i < 20; i++) {
                const item = generateSpellingItem(1, 'cvc', false);
                expect(item.prompt).toBe('Which spelling is correct?');
            }
        });

        it('has a non-empty id string', () => {
            const item = generateSpellingItem(1, 'vowel-teams', false);
            expect(typeof item.id).toBe('string');
            expect(item.id.length).toBeGreaterThan(0);
        });
    });

    describe('Rich metadata', () => {
        it('meta includes definition, pronunciation, and partOfSpeech', () => {
            for (const cat of CATEGORIES) {
                const item = generateSpellingItem(1, cat, false);
                expect(typeof item.meta?.['definition']).toBe('string');
                expect((item.meta?.['definition'] as string).length).toBeGreaterThan(0);
                expect(typeof item.meta?.['pronunciation']).toBe('string');
                expect(typeof item.meta?.['partOfSpeech']).toBe('string');
            }
        });

        it('meta includes exampleSentence and pattern', () => {
            const item = generateSpellingItem(1, 'cvc', false);
            expect(typeof item.meta?.['exampleSentence']).toBe('string');
            expect(typeof item.meta?.['pattern']).toBe('string');
            expect(typeof item.meta?.['difficulty']).toBe('number');
        });
    });

    describe('Difficulty filtering', () => {
        it('level 1 words have difficulty ≤ 2', () => {
            for (let i = 0; i < 30; i++) {
                const item = generateSpellingItem(1, 'mix', false);
                expect(item.meta?.['difficulty']).toBeLessThanOrEqual(2);
            }
        });

        it('starter band caps difficulty at 4', () => {
            for (let i = 0; i < 30; i++) {
                const item = generateSpellingItem(3, 'mix', false, undefined, 'starter');
                expect(item.meta?.['difficulty']).toBeLessThanOrEqual(4);
            }
        });

        it('rising band caps difficulty at 7', () => {
            for (let i = 0; i < 30; i++) {
                const item = generateSpellingItem(5, 'mix', false, undefined, 'rising');
                expect(item.meta?.['difficulty']).toBeLessThanOrEqual(7);
            }
        });
    });

    describe('Hard mode', () => {
        it('distractors have same length as correct word in hard mode (when possible)', () => {
            let foundSameLength = 0;
            for (let i = 0; i < 50; i++) {
                const item = generateSpellingItem(1, 'cvc', true);
                const others = item.options.filter((_, idx) => idx !== item.correctIndex);
                const allSameLen = others.every(d => (d as string).length === (item.answer as string).length);
                if (allSameLen) foundSameLength++;
            }
            // Should have at least some items with same-length distractors
            expect(foundSameLength).toBeGreaterThan(0);
        });
    });

    describe('Seeded RNG', () => {
        it('produces deterministic output with same seed function', () => {
            let seed = 12345;
            function seededRng() {
                seed = (seed * 1664525 + 1013904223) & 0xffffffff;
                return (seed >>> 0) / 0x100000000;
            }
            const item1 = generateSpellingItem(1, 'blends', false, seededRng);

            seed = 12345; // reset
            function seededRng2() {
                seed = (seed * 1664525 + 1013904223) & 0xffffffff;
                return (seed >>> 0) / 0x100000000;
            }
            const item2 = generateSpellingItem(1, 'blends', false, seededRng2);

            expect(item1.answer).toBe(item2.answer);
            expect(item1.options).toEqual(item2.options);
        });
    });

    describe('Mix category', () => {
        it('generates words from the combined bank', () => {
            const answers = new Set<string>();
            for (let i = 0; i < 100; i++) {
                answers.add(generateSpellingItem(1, 'mix', false).answer as string);
            }
            // With ~750 words in the bank, 100 samples should hit >15 unique words
            expect(answers.size).toBeGreaterThan(15);
        });
    });

});
