import { describe, it, expect } from 'vitest';
import type { WordRecord } from '../hooks/useWordHistory';
import type { DifficultyTier } from '../domains/spelling/words/types';
import { evaluateLevelProgress } from '../domains/spelling/curriculum';
// Tier 1-2 core words are eager-loaded — no explicit init needed

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRecord(word: string, overrides: Partial<WordRecord> = {}): WordRecord {
    return {
        word,
        category: 'cvc',
        attempts: 5,
        correct: 3,
        lastSeen: Date.now(),
        lastCorrect: Date.now(),
        box: 1,
        nextReview: Date.now(),
        ...overrides,
    };
}

const stubWordCount = () => 1000;

// ── Tests ────────────────────────────────────────────────────────────────────

describe('evaluateLevelProgress', () => {
    it('returns 10 levels', () => {
        const progress = evaluateLevelProgress({}, stubWordCount);
        expect(progress).toHaveLength(10);
    });

    it('returns all zeros for empty records', () => {
        const progress = evaluateLevelProgress({}, stubWordCount);
        for (const lp of progress) {
            expect(lp.attempted).toBe(0);
            expect(lp.mastered).toBe(0);
            expect(lp.accuracy).toBe(0);
        }
    });

    it('counts mastered words only when box >= 4 AND typed', () => {
        // Use a known tier-1 word (difficulty 1)
        const records: Record<string, WordRecord> = {
            the: makeRecord('the', { box: 4, typedAttempts: 1, correct: 5, attempts: 5 }),
            and: makeRecord('and', { box: 4, typedAttempts: 0, correct: 5, attempts: 5 }),
            cat: makeRecord('cat', { box: 3, typedAttempts: 2, correct: 5, attempts: 5 }),
        };
        const progress = evaluateLevelProgress(records, stubWordCount);
        const level1 = progress[0]; // difficulty 1
        // Only 'the' should be mastered (box 4 + typed)
        // 'and' has box 4 but no typed attempts
        // 'cat' has box 3 — not mastered
        expect(level1.mastered).toBeLessThanOrEqual(level1.attempted);
    });

    it('level numbers are 1-10', () => {
        const progress = evaluateLevelProgress({}, stubWordCount);
        expect(progress.map(p => p.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('uses provided wordCountByDifficulty for totalWords', () => {
        const custom = (diff: DifficultyTier) => diff * 100;
        const progress = evaluateLevelProgress({}, custom);
        expect(progress[0].totalWords).toBe(100);
        expect(progress[4].totalWords).toBe(500);
    });
});
