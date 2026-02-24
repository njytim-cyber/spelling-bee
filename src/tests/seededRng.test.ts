import { describe, it, expect } from 'vitest';
import { createSeededRng, dateSeed, stringSeed } from '../utils/seededRng';

describe('seededRng.ts', () => {

    describe('createSeededRng', () => {
        it('same seed produces identical sequence', () => {
            const rng1 = createSeededRng(42);
            const rng2 = createSeededRng(42);
            for (let i = 0; i < 100; i++) {
                expect(rng1()).toBe(rng2());
            }
        });

        it('different seeds produce different sequences', () => {
            const rng1 = createSeededRng(1);
            const rng2 = createSeededRng(2);
            let same = 0;
            for (let i = 0; i < 100; i++) {
                if (rng1() === rng2()) same++;
            }
            // Extremely unlikely to have more than a couple matches
            expect(same).toBeLessThan(5);
        });

        it('output is always in [0, 1)', () => {
            const rng = createSeededRng(99);
            for (let i = 0; i < 1000; i++) {
                const val = rng();
                expect(val).toBeGreaterThanOrEqual(0);
                expect(val).toBeLessThan(1);
            }
        });

        it('distributes roughly uniformly', () => {
            const rng = createSeededRng(12345);
            let below = 0;
            const N = 10000;
            for (let i = 0; i < N; i++) {
                if (rng() < 0.5) below++;
            }
            // Should be roughly 50% ± 5%
            expect(below / N).toBeGreaterThan(0.45);
            expect(below / N).toBeLessThan(0.55);
        });
    });

    describe('dateSeed', () => {
        it('same date produces same seed', () => {
            const d1 = new Date('2026-02-24');
            const d2 = new Date('2026-02-24');
            expect(dateSeed(d1)).toBe(dateSeed(d2));
        });

        it('different dates produce different seeds', () => {
            const d1 = new Date('2026-02-24');
            const d2 = new Date('2026-02-25');
            expect(dateSeed(d1)).not.toBe(dateSeed(d2));
        });

        it('returns an integer', () => {
            const seed = dateSeed(new Date());
            expect(Number.isInteger(seed)).toBe(true);
        });
    });

    describe('stringSeed', () => {
        it('same string produces same seed', () => {
            expect(stringSeed('hello')).toBe(stringSeed('hello'));
        });

        it('different strings produce different seeds', () => {
            expect(stringSeed('alpha')).not.toBe(stringSeed('beta'));
        });
    });
});
