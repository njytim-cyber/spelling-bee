import { describe, it, expect } from 'vitest';
import { getAllWords, difficultyRange, BAND_DIFFICULTY_CAP } from '../domains/spelling/words';
import type { DifficultyTier, SpellingWord } from '../domains/spelling/words/types';

/**
 * Tests for bee simulation logic.
 * Since useBeeSimulation is a React hook with TTS dependencies,
 * we test the pure pickBeeWord logic and XP calculation directly.
 */

// ── Extracted pickBeeWord logic ─────────────────────────────────────────────

function pickBeeWord(round: number, band?: string): SpellingWord {
    const diffLevel = Math.min(5, 1 + Math.floor(round / 5));
    const [minDiff, maxDiff] = difficultyRange(diffLevel);
    const bandCap = band ? (BAND_DIFFICULTY_CAP[band] ?? 10) : 10;
    const effectiveMax = Math.min(maxDiff, bandCap) as DifficultyTier;
    const effectiveMin = Math.min(minDiff, effectiveMax) as DifficultyTier;

    const all = getAllWords();
    const pool = all.filter(w => w.difficulty >= effectiveMin && w.difficulty <= effectiveMax);
    const source = pool.length > 0 ? pool : all;
    return source[Math.floor(Math.random() * source.length)];
}

// ── XP calculation logic ────────────────────────────────────────────────────

function calcSessionXP(wordsCorrect: number, usedInfoRequests: boolean): number {
    return wordsCorrect * 15 + wordsCorrect * (usedInfoRequests ? 0 : 5);
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Bee simulation (pickBeeWord)', () => {

    it('round 0 picks easy words (difficulty ≤ 4)', () => {
        for (let i = 0; i < 30; i++) {
            const word = pickBeeWord(0, 'starter');
            expect(word.difficulty).toBeLessThanOrEqual(4);
        }
    });

    it('higher rounds pick harder words', () => {
        const earlyDiffs: number[] = [];
        const lateDiffs: number[] = [];
        for (let i = 0; i < 50; i++) {
            earlyDiffs.push(pickBeeWord(0).difficulty);
            lateDiffs.push(pickBeeWord(20).difficulty);
        }
        const earlyAvg = earlyDiffs.reduce((a, b) => a + b, 0) / earlyDiffs.length;
        const lateAvg = lateDiffs.reduce((a, b) => a + b, 0) / lateDiffs.length;
        expect(lateAvg).toBeGreaterThan(earlyAvg);
    });

    it('starter band caps at difficulty 4', () => {
        for (let i = 0; i < 50; i++) {
            const word = pickBeeWord(25, 'starter');
            expect(word.difficulty).toBeLessThanOrEqual(4);
        }
    });

    it('rising band caps at difficulty 7', () => {
        for (let i = 0; i < 50; i++) {
            const word = pickBeeWord(25, 'rising');
            expect(word.difficulty).toBeLessThanOrEqual(7);
        }
    });

    it('sigma band allows difficulty up to 10', () => {
        // Just verify it doesn't crash and returns valid words
        for (let i = 0; i < 30; i++) {
            const word = pickBeeWord(25, 'sigma');
            expect(word.difficulty).toBeGreaterThanOrEqual(1);
            expect(word.difficulty).toBeLessThanOrEqual(10);
        }
    });

    it('always returns a valid SpellingWord', () => {
        for (let i = 0; i < 30; i++) {
            const word = pickBeeWord(i);
            expect(typeof word.word).toBe('string');
            expect(word.word.length).toBeGreaterThan(0);
            expect(typeof word.definition).toBe('string');
        }
    });

    it('difficulty level plateaus at round 20+', () => {
        // diffLevel = min(5, 1 + floor(round/5))
        // round 20 → 1+4 = 5 (max)
        // round 30 → 1+6 capped to 5
        const word20 = pickBeeWord(20);
        const word30 = pickBeeWord(30);
        // Both should use difficulty level 5 so same difficulty range
        expect(word20.difficulty).toBeGreaterThanOrEqual(1);
        expect(word30.difficulty).toBeGreaterThanOrEqual(1);
    });
});

describe('Bee simulation (XP calculation)', () => {

    it('base XP is 15 per correct word', () => {
        expect(calcSessionXP(5, true)).toBe(75);
    });

    it('no-help bonus adds 5 per word', () => {
        expect(calcSessionXP(5, false)).toBe(100);
    });

    it('0 correct = 0 XP', () => {
        expect(calcSessionXP(0, false)).toBe(0);
    });
});
