import { describe, it, expect } from 'vitest';

/**
 * Tests for the word history / Leitner spaced repetition logic.
 * We extract and test the pure logic since the hook uses React state.
 */

// ── Inline the pure Leitner logic from useWordHistory.ts ────────────────────

interface WordRecord {
    word: string;
    category: string;
    attempts: number;
    correct: number;
    lastSeen: number;
    lastCorrect: number;
    box: number;
    nextReview: number;
}

const BOX_DELAY_MS: Record<number, number> = {
    0: 0,
    1: 1 * 24 * 60 * 60 * 1000,
    2: 3 * 24 * 60 * 60 * 1000,
    3: 7 * 24 * 60 * 60 * 1000,
    4: 14 * 24 * 60 * 60 * 1000,
};

function recordAttempt(
    existing: WordRecord | undefined,
    word: string,
    category: string,
    correct: boolean,
    now: number,
): WordRecord {
    const newBox = existing
        ? (correct ? Math.min(existing.box + 1, 4) : 0)
        : (correct ? 1 : 0);

    return {
        word: word.toLowerCase(),
        category,
        attempts: (existing?.attempts ?? 0) + 1,
        correct: (existing?.correct ?? 0) + (correct ? 1 : 0),
        lastSeen: now,
        lastCorrect: correct ? now : (existing?.lastCorrect ?? 0),
        box: newBox,
        nextReview: now + (BOX_DELAY_MS[newBox] ?? 0),
    };
}

function getReviewQueue(records: Record<string, WordRecord>, asOf: number): WordRecord[] {
    return Object.values(records)
        .filter(r => r.box < 4 && r.nextReview <= asOf)
        .sort((a, b) => {
            if (a.box !== b.box) return a.box - b.box;
            const aAcc = a.attempts > 0 ? a.correct / a.attempts : 0;
            const bAcc = b.attempts > 0 ? b.correct / b.attempts : 0;
            return aAcc - bAcc;
        });
}

function getWeakCategories(records: Record<string, WordRecord>) {
    const cats: Record<string, { attempts: number; correct: number }> = {};
    for (const r of Object.values(records)) {
        if (!cats[r.category]) cats[r.category] = { attempts: 0, correct: 0 };
        cats[r.category].attempts += r.attempts;
        cats[r.category].correct += r.correct;
    }
    return Object.entries(cats)
        .filter(([, s]) => s.attempts >= 5 && (s.correct / s.attempts) < 0.8)
        .map(([cat, s]) => ({ category: cat, accuracy: s.correct / s.attempts }))
        .sort((a, b) => a.accuracy - b.accuracy);
}

function getMasteredCount(records: Record<string, WordRecord>): number {
    return Object.values(records).filter(r => r.box >= 4).length;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Leitner spaced repetition (useWordHistory logic)', () => {

    const NOW = 1_700_000_000_000;

    describe('box progression', () => {
        it('new word correct → box 1', () => {
            const r = recordAttempt(undefined, 'apple', 'cvc', true, NOW);
            expect(r.box).toBe(1);
        });

        it('new word incorrect → box 0', () => {
            const r = recordAttempt(undefined, 'apple', 'cvc', false, NOW);
            expect(r.box).toBe(0);
        });

        it('consecutive corrects advance box to 4 (mastered)', () => {
            let r = recordAttempt(undefined, 'cat', 'cvc', true, NOW);
            r = recordAttempt(r, 'cat', 'cvc', true, NOW + 1000);
            r = recordAttempt(r, 'cat', 'cvc', true, NOW + 2000);
            r = recordAttempt(r, 'cat', 'cvc', true, NOW + 3000);
            expect(r.box).toBe(4);
        });

        it('box does not exceed 4', () => {
            let r = recordAttempt(undefined, 'hat', 'cvc', true, NOW);
            for (let i = 0; i < 10; i++) {
                r = recordAttempt(r, 'hat', 'cvc', true, NOW + (i + 1) * 1000);
            }
            expect(r.box).toBe(4);
        });

        it('incorrect answer resets box to 0', () => {
            let r = recordAttempt(undefined, 'mat', 'cvc', true, NOW);
            r = recordAttempt(r, 'mat', 'cvc', true, NOW + 1000);
            r = recordAttempt(r, 'mat', 'cvc', true, NOW + 2000);
            expect(r.box).toBe(3);
            r = recordAttempt(r, 'mat', 'cvc', false, NOW + 3000);
            expect(r.box).toBe(0);
        });
    });

    describe('nextReview timing', () => {
        it('box 0 has immediate review', () => {
            const r = recordAttempt(undefined, 'bad', 'cvc', false, NOW);
            expect(r.nextReview).toBe(NOW);
        });

        it('box 1 has 1-day delay', () => {
            const r = recordAttempt(undefined, 'good', 'cvc', true, NOW);
            expect(r.nextReview).toBe(NOW + 24 * 60 * 60 * 1000);
        });

        it('box 4 (mastered) has 14-day delay', () => {
            let r = recordAttempt(undefined, 'ace', 'cvc', true, NOW);
            for (let i = 1; i <= 3; i++) {
                r = recordAttempt(r, 'ace', 'cvc', true, NOW + i * 1000);
            }
            expect(r.box).toBe(4);
            expect(r.nextReview).toBe(NOW + 3000 + 14 * 24 * 60 * 60 * 1000);
        });
    });

    describe('review queue', () => {
        it('empty records → empty queue', () => {
            expect(getReviewQueue({}, NOW)).toHaveLength(0);
        });

        it('words due for review appear in queue', () => {
            const records: Record<string, WordRecord> = {
                bat: recordAttempt(undefined, 'bat', 'cvc', false, NOW),
                cat: recordAttempt(undefined, 'cat', 'cvc', true, NOW - 2 * 24 * 60 * 60 * 1000),
            };
            const queue = getReviewQueue(records, NOW);
            expect(queue.length).toBeGreaterThan(0);
            // 'bat' is box 0 (immediate) so should be in queue
            expect(queue.some(r => r.word === 'bat')).toBe(true);
        });

        it('mastered words (box 4) are excluded', () => {
            let r = recordAttempt(undefined, 'star', 'cvc', true, NOW);
            for (let i = 1; i <= 3; i++) {
                r = recordAttempt(r, 'star', 'cvc', true, NOW + i);
            }
            const records = { star: r };
            const queue = getReviewQueue(records, NOW + 100);
            expect(queue).toHaveLength(0);
        });
    });

    describe('weak categories', () => {
        it('categories below 80% with 5+ attempts are flagged', () => {
            const records: Record<string, WordRecord> = {};
            // 5 attempts, 3 correct (60%) in blends
            for (let i = 0; i < 5; i++) {
                const word = `blend${i}`;
                records[word] = {
                    word, category: 'blends',
                    attempts: 1, correct: i < 3 ? 1 : 0,
                    lastSeen: NOW, lastCorrect: 0, box: 0, nextReview: NOW,
                };
            }
            const weak = getWeakCategories(records);
            expect(weak).toHaveLength(1);
            expect(weak[0].category).toBe('blends');
            expect(weak[0].accuracy).toBeCloseTo(0.6);
        });

        it('categories at 80%+ are not flagged', () => {
            const records: Record<string, WordRecord> = {};
            for (let i = 0; i < 5; i++) {
                const word = `cvc${i}`;
                records[word] = {
                    word, category: 'cvc',
                    attempts: 1, correct: i < 4 ? 1 : 0,
                    lastSeen: NOW, lastCorrect: 0, box: 0, nextReview: NOW,
                };
            }
            const weak = getWeakCategories(records);
            expect(weak).toHaveLength(0);
        });
    });

    describe('mastered count', () => {
        it('counts words at box 4', () => {
            const mastered = recordAttempt(undefined, 'ace', 'cvc', true, NOW);
            let m = mastered;
            for (let i = 1; i <= 3; i++) m = recordAttempt(m, 'ace', 'cvc', true, NOW + i);
            const notMastered = recordAttempt(undefined, 'bat', 'cvc', true, NOW);
            expect(getMasteredCount({ ace: m, bat: notMastered })).toBe(1);
        });

        it('returns 0 when no mastered words', () => {
            const r = recordAttempt(undefined, 'new', 'cvc', true, NOW);
            expect(getMasteredCount({ new: r })).toBe(0);
        });
    });
});
