import { describe, it, expect } from 'vitest';
import type { WordRecord } from '../hooks/useWordHistory';
import {
    getErrorPatterns,
    getCategoryAccuracy,
    getWordDrillDown,
    getMistakeInsights,
    getImprovements,
    getStudyPlan,
    getDifficultyNudge,
    getInlineErrorTip,
} from '../utils/errorPatterns';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRecord(overrides: Partial<WordRecord> & { word: string }): WordRecord {
    return {
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

function makeRecords(list: Array<Partial<WordRecord> & { word: string }>): Record<string, WordRecord> {
    const out: Record<string, WordRecord> = {};
    for (const r of list) out[r.word] = makeRecord(r);
    return out;
}

// ── getErrorPatterns ─────────────────────────────────────────────────────────

describe('getErrorPatterns', () => {
    it('returns categories with > 20% error rate and >= 5 attempts', () => {
        const records = makeRecords([
            { word: 'a', category: 'hard', attempts: 10, correct: 5 }, // 50% error
            { word: 'b', category: 'easy', attempts: 10, correct: 9 }, // 10% error
            { word: 'c', category: 'hard', attempts: 5, correct: 2 },
        ]);
        const patterns = getErrorPatterns(records);
        expect(patterns.length).toBe(1);
        expect(patterns[0].category).toBe('hard');
    });

    it('excludes categories with fewer than 5 attempts', () => {
        const records = makeRecords([
            { word: 'a', category: 'new', attempts: 3, correct: 0 },
        ]);
        expect(getErrorPatterns(records)).toHaveLength(0);
    });

    it('sorts by worst accuracy first', () => {
        const records = makeRecords([
            { word: 'a', category: 'bad', attempts: 10, correct: 2 },  // 80% error
            { word: 'b', category: 'mid', attempts: 10, correct: 5 },  // 50% error
        ]);
        const patterns = getErrorPatterns(records);
        expect(patterns[0].category).toBe('bad');
    });
});

// ── getCategoryAccuracy ──────────────────────────────────────────────────────

describe('getCategoryAccuracy', () => {
    it('returns accuracy per category', () => {
        const records = makeRecords([
            { word: 'a', category: 'cvc', attempts: 10, correct: 8 },
            { word: 'b', category: 'blends', attempts: 10, correct: 5 },
        ]);
        const cats = getCategoryAccuracy(records);
        expect(cats.length).toBe(2);
        // Sorted by worst accuracy first
        expect(cats[0].category).toBe('blends');
        expect(cats[0].accuracy).toBeCloseTo(0.5);
    });
});

// ── getWordDrillDown ─────────────────────────────────────────────────────────

describe('getWordDrillDown', () => {
    it('returns words sorted by worst accuracy', () => {
        const records = makeRecords([
            { word: 'good', attempts: 5, correct: 5 },
            { word: 'bad', attempts: 5, correct: 1 },
        ]);
        const drill = getWordDrillDown(records);
        expect(drill[0].word).toBe('bad');
    });

    it('excludes unattempted words', () => {
        const records = makeRecords([
            { word: 'unseen', attempts: 0, correct: 0 },
        ]);
        expect(getWordDrillDown(records)).toHaveLength(0);
    });
});

// ── getMistakeInsights ───────────────────────────────────────────────────────

describe('getMistakeInsights', () => {
    it('returns empty for < 2 misspelling pairs', () => {
        const records = makeRecords([
            { word: 'apple', misspellings: ['aple'] },
        ]);
        expect(getMistakeInsights(records)).toHaveLength(0);
    });

    it('detects double letter errors', () => {
        const records = makeRecords([
            { word: 'committee', misspellings: ['comitee', 'comittee'] },
        ]);
        const insights = getMistakeInsights(records);
        expect(insights.some(i => i.label === 'Double letters')).toBe(true);
    });

    it('detects ie/ei confusion', () => {
        const records = makeRecords([
            { word: 'receive', misspellings: ['recieve', 'recieve'] },
        ]);
        const insights = getMistakeInsights(records);
        expect(insights.some(i => i.label === 'ie vs ei')).toBe(true);
    });

    it('detects silent letter drops', () => {
        const records = makeRecords([
            { word: 'knight', misspellings: ['night', 'night'] },
        ]);
        const insights = getMistakeInsights(records);
        expect(insights.some(i => i.label === 'Silent letters')).toBe(true);
    });

    it('detects vowel confusion', () => {
        const records = makeRecords([
            { word: 'definite', misspellings: ['definate', 'defonate'] },
        ]);
        const insights = getMistakeInsights(records);
        expect(insights.some(i => i.label === 'Vowel confusion')).toBe(true);
    });

    it('detects suffix confusion (tion/sion)', () => {
        const records = makeRecords([
            { word: 'extension', misspellings: ['extention', 'extention'] },
        ]);
        const insights = getMistakeInsights(records);
        expect(insights.some(i => i.label.includes('tion'))).toBe(true);
    });

    it('detects letter transposition', () => {
        const records = makeRecords([
            { word: 'from', misspellings: ['form', 'form'] },
        ]);
        const insights = getMistakeInsights(records);
        expect(insights.some(i => i.label === 'Letter swaps')).toBe(true);
    });

    it('requires count >= 2 to surface', () => {
        // Only 1 instance of each pattern — should be filtered out
        const records = makeRecords([
            { word: 'receive', misspellings: ['recieve'] },
            { word: 'knight', misspellings: ['night'] },
        ]);
        const insights = getMistakeInsights(records);
        expect(insights).toHaveLength(0);
    });

    it('returns at most 3 insights', () => {
        const records = makeRecords([
            { word: 'committee', misspellings: ['comitee', 'comitee', 'comitee'] },
            { word: 'receive', misspellings: ['recieve', 'recieve', 'recieve'] },
            { word: 'knight', misspellings: ['night', 'night', 'night'] },
            { word: 'from', misspellings: ['form', 'form', 'form'] },
            { word: 'definite', misspellings: ['definate', 'definate', 'definate'] },
        ]);
        expect(getMistakeInsights(records).length).toBeLessThanOrEqual(3);
    });
});

// ── getImprovements ──────────────────────────────────────────────────────────

describe('getImprovements', () => {
    it('finds comeback words (high attempts, now progressing)', () => {
        const records = makeRecords([
            { word: 'difficult', attempts: 8, correct: 4, box: 3 }, // 50% accuracy, but box 3
        ]);
        const improvements = getImprovements(records);
        expect(improvements.length).toBe(1);
        expect(improvements[0].word).toBe('difficult');
    });

    it('excludes words with too few attempts', () => {
        const records = makeRecords([
            { word: 'easy', attempts: 2, correct: 1, box: 2 },
        ]);
        expect(getImprovements(records)).toHaveLength(0);
    });

    it('excludes words still at low box', () => {
        const records = makeRecords([
            { word: 'stuck', attempts: 10, correct: 3, box: 1 },
        ]);
        expect(getImprovements(records)).toHaveLength(0);
    });

    it('returns at most 3', () => {
        const records = makeRecords(
            Array.from({ length: 10 }, (_, i) => ({
                word: `word${i}`, attempts: 10, correct: 5, box: 3,
            })),
        );
        expect(getImprovements(records).length).toBeLessThanOrEqual(3);
    });
});

// ── getStudyPlan ─────────────────────────────────────────────────────────────

describe('getStudyPlan', () => {
    it('puts SRS review at top when words are due', () => {
        const records = makeRecords([{ word: 'test', attempts: 1, correct: 1 }]);
        const plan = getStudyPlan(records, 5);
        expect(plan[0].priority).toBe('review');
        expect(plan[0].label).toContain('5');
    });

    it('includes hardest words when provided', () => {
        const records = makeRecords([{ word: 'test' }]);
        const plan = getStudyPlan(records, 0, 3);
        expect(plan.some(r => r.category === 'hardest')).toBe(true);
    });

    it('returns at most 5 recommendations', () => {
        const records = makeRecords(
            Array.from({ length: 50 }, (_, i) => ({
                word: `w${i}`, category: 'cvc', attempts: 10, correct: 5,
            })),
        );
        const plan = getStudyPlan(records, 10, 5);
        expect(plan.length).toBeLessThanOrEqual(5);
    });

    it('suggests etymology quiz after 20+ attempts if not tried', () => {
        const records = makeRecords(
            Array.from({ length: 5 }, (_, i) => ({
                word: `w${i}`, category: 'cvc', attempts: 5, correct: 4,
            })),
        );
        const plan = getStudyPlan(records, 0);
        expect(plan.some(r => r.category === 'etymology')).toBe(true);
    });

    it('does not suggest etymology if already attempted', () => {
        const records = makeRecords([
            ...Array.from({ length: 5 }, (_, i) => ({
                word: `w${i}`, category: 'cvc', attempts: 5, correct: 4,
            })),
            { word: 'etym1', category: 'etymology', attempts: 1, correct: 1 },
        ]);
        const plan = getStudyPlan(records, 0);
        expect(plan.some(r => r.category === 'etymology')).toBe(false);
    });
});

// ── getDifficultyNudge ───────────────────────────────────────────────────────

describe('getDifficultyNudge', () => {
    it('returns null with insufficient data', () => {
        const records = makeRecords([
            { word: 'a', attempts: 5, correct: 5 },
        ]);
        expect(getDifficultyNudge(records)).toBeNull();
    });
});

// ── getInlineErrorTip ───────────────────────────────────────────────────────

describe('getInlineErrorTip', () => {
    it('detects double letter error when misspelling drops a double', () => {
        const tip = getInlineErrorTip('balloon', 'balon');
        expect(tip).not.toBeNull();
        expect(tip!.label).toBe('Double letter');
    });

    it('detects ie/ei confusion', () => {
        const tip = getInlineErrorTip('receive', 'recieve');
        expect(tip).not.toBeNull();
        expect(tip!.label).toBe('ie vs ei');
    });

    it('detects silent letter drop', () => {
        const tip = getInlineErrorTip('knight', 'night');
        expect(tip).not.toBeNull();
        expect(tip!.label).toBe('Silent letter');
    });

    it('detects vowel swap', () => {
        const tip = getInlineErrorTip('definite', 'defanite');
        expect(tip).not.toBeNull();
        expect(tip!.label).toBe('Vowel swap');
    });

    it('returns general double-letter tip for MCQ mode (no misspelling)', () => {
        const tip = getInlineErrorTip('balloon');
        expect(tip).not.toBeNull();
        expect(tip!.label).toBe('Double letter');
    });

    it('returns silent letter tip for MCQ mode (no misspelling)', () => {
        const tip = getInlineErrorTip('knight');
        expect(tip).not.toBeNull();
        expect(tip!.label).toBe('Silent letter');
    });

    it('returns ie/ei tip for MCQ mode', () => {
        const tip = getInlineErrorTip('receive');
        expect(tip).not.toBeNull();
        expect(tip!.label).toBe('ie/ei pattern');
    });

    it('returns tricky ending tip for -tion words', () => {
        const tip = getInlineErrorTip('nation');
        expect(tip).not.toBeNull();
        expect(tip!.label).toBe('Tricky ending');
    });

    it('returns null for simple words with no tricky patterns', () => {
        const tip = getInlineErrorTip('cat');
        expect(tip).toBeNull();
    });
});
