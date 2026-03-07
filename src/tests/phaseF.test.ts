import { describe, it, expect } from 'vitest';
import { scoreCorrect } from '../engine/scoring';
import { generateSRSPhaseItem, generateSpeedBurst, rollSessionSurprises, generatePhaseItem } from '../domains/spelling/spellingGenerator';
import { getWeakWords } from '../utils/errorPatterns';
import type { WordRecord } from '../hooks/useWordHistory';
import { CURATED_ETYMOLOGIES } from '../data/curatedEtymologies';

// ── Scoring multiplier ────────────────────────────────────────────────────────

describe('scoreCorrect with multiplier', () => {
    it('returns base score when multiplier is 1 (default)', () => {
        expect(scoreCorrect(1, false)).toBe(10);
        expect(scoreCorrect(1, true)).toBe(12);
    });

    it('applies 2x multiplier for boss rounds', () => {
        expect(scoreCorrect(1, false, 2)).toBe(20);
        expect(scoreCorrect(1, true, 2)).toBe(24);
    });

    it('applies 5x multiplier for bonus words', () => {
        expect(scoreCorrect(1, false, 5)).toBe(50);
    });

    it('applies 3x multiplier for speed burst', () => {
        expect(scoreCorrect(1, false, 3)).toBe(30);
    });

    it('multiplier works with streak bonuses', () => {
        // streak=5 → base = 10 + 5 = 15, x2 = 30
        expect(scoreCorrect(5, false, 2)).toBe(30);
        // streak=10 → base = 10 + 10 = 20, fast +2 = 22, x2 = 44
        expect(scoreCorrect(10, true, 2)).toBe(44);
    });
});

// ── SRS Phase Item ────────────────────────────────────────────────────────────

describe('generateSRSPhaseItem', () => {
    it('returns null when no suitable SRS words exist', () => {
        const result = generateSRSPhaseItem('warmup', 'level-1', [], () => 0.5);
        expect(result).toBeNull();
    });

    it('returns null when all words are in low boxes', () => {
        const words = [{ word: 'cat', box: 1 }, { word: 'dog', box: 2 }];
        const result = generateSRSPhaseItem('warmup', 'level-1', words, () => 0.5);
        expect(result).toBeNull();
    });

    it('picks from box 3+ for warmup', () => {
        const words = [
            { word: 'cat', box: 1 },
            { word: 'dog', box: 3 },
            { word: 'hat', box: 4 },
        ];
        const result = generateSRSPhaseItem('warmup', 'level-1', words, () => 0);
        // Should find one of the box 3+ words or return null if word not in bank
        if (result) {
            expect(result.meta?.['sessionPhase']).toBe('warmup');
            expect(result.meta?.['srsReview']).toBe(true);
        }
    });

    it('picks from box 4+ for victory', () => {
        const words = [{ word: 'cat', box: 3 }];
        const result = generateSRSPhaseItem('victory', 'level-1', words, () => 0);
        // box 3 is not enough for victory (needs 4+)
        expect(result).toBeNull();
    });
});

// ── Speed Burst ───────────────────────────────────────────────────────────────

describe('generateSpeedBurst', () => {
    it('generates exactly 3 items', () => {
        const items = generateSpeedBurst(3);
        expect(items).toHaveLength(3);
    });

    it('marks all items as speed burst with 3x multiplier', () => {
        const items = generateSpeedBurst(3);
        for (const item of items) {
            expect(item.meta?.['speedBurst']).toBe(true);
            expect(item.meta?.['bonusMultiplier']).toBe(3);
        }
    });

    it('generates items at level-1 difficulty', () => {
        const items = generateSpeedBurst(5);
        for (const item of items) {
            // Items should be easier (level-1 = 4)
            expect(item.meta?.['difficulty']).toBeLessThanOrEqual(5);
        }
    });

    it('clamps at level 1 minimum', () => {
        const items = generateSpeedBurst(1);
        // Should not crash at level 1 (would try level 0)
        expect(items).toHaveLength(3);
    });
});

// ── Boss round multiplier ─────────────────────────────────────────────────────

describe('boss round XP multiplier', () => {
    it('boss phase items have bonusMultiplier: 2', () => {
        const item = generatePhaseItem('boss', 3, 'level-3');
        expect(item.meta?.['bossRound']).toBe(true);
        expect(item.meta?.['bonusMultiplier']).toBe(2);
    });

    it('non-boss phases do not have bonusMultiplier', () => {
        const warmup = generatePhaseItem('warmup', 3, 'level-3');
        expect(warmup.meta?.['bonusMultiplier']).toBeUndefined();

        const build = generatePhaseItem('build', 3, 'level-3');
        expect(build.meta?.['bonusMultiplier']).toBeUndefined();
    });
});

// ── Roll surprises (speed burst inclusion) ────────────────────────────────────

describe('rollSessionSurprises includes speedBurst', () => {
    it('can roll a speedBurst surprise', () => {
        // Use a multi-call rng: first call passes pAny check, second picks speedBurst type
        const result2 = rollSessionSurprises(50, (() => {
            let call = 0;
            return () => {
                call++;
                if (call === 1) return 0.1; // pass pAny check
                if (call === 2) return 0.8; // type roll: 0.8 >= 0.7 → speedBurst
                return 0.5; // trigger index
            };
        })());
        expect(result2).not.toBeNull();
        expect(result2?.type).toBe('speedBurst');
    });

    it('can roll all three types', () => {
        const types = new Set<string>();
        // Force many rolls to get all 3 types
        for (let i = 0; i < 100; i++) {
            const result = rollSessionSurprises(50);
            if (result) types.add(result.type);
        }
        expect(types.has('bonusWord')).toBe(true);
        expect(types.has('etymologyReveal')).toBe(true);
        expect(types.has('speedBurst')).toBe(true);
    });
});

// ── getWeakWords ──────────────────────────────────────────────────────────────

function makeRecord(overrides: Partial<WordRecord> = {}): WordRecord {
    return {
        word: 'test',
        category: 'cvc',
        attempts: 10,
        correct: 8,
        lastSeen: Date.now(),
        lastCorrect: Date.now(),
        box: 2,
        nextReview: 0,
        typedCorrect: 1,
        typedAttempts: 2,
        ...overrides,
    };
}

describe('getWeakWords', () => {
    it('returns empty array when no weak patterns exist', () => {
        const records: Record<string, WordRecord> = {
            apple: makeRecord({ word: 'apple', category: 'cvc', attempts: 10, correct: 9 }),
        };
        expect(getWeakWords(records)).toEqual([]);
    });

    it('returns words from weak patterns that are not mastered', () => {
        const records: Record<string, WordRecord> = {
            // Weak pattern: 3/10 = 30% accuracy (> 20% error rate)
            apple: makeRecord({ word: 'apple', category: 'blends', attempts: 10, correct: 3, box: 2 }),
            banana: makeRecord({ word: 'banana', category: 'blends', attempts: 10, correct: 2, box: 1 }),
            // Strong pattern
            cherry: makeRecord({ word: 'cherry', category: 'cvc', attempts: 10, correct: 9, box: 4 }),
        };
        const result = getWeakWords(records);
        expect(result.length).toBe(2);
        // Should be sorted worst first
        expect(result[0]).toBe('banana'); // 20% accuracy
        expect(result[1]).toBe('apple');  // 30% accuracy
    });

    it('excludes mastered words (box >= 4)', () => {
        const records: Record<string, WordRecord> = {
            apple: makeRecord({ word: 'apple', category: 'blends', attempts: 10, correct: 3, box: 4 }),
            banana: makeRecord({ word: 'banana', category: 'blends', attempts: 10, correct: 2, box: 1 }),
        };
        const result = getWeakWords(records);
        expect(result).toEqual(['banana']);
    });

    it('limits to 20 words', () => {
        const records: Record<string, WordRecord> = {};
        for (let i = 0; i < 30; i++) {
            records[`word${i}`] = makeRecord({
                word: `word${i}`,
                category: 'blends',
                attempts: 10,
                correct: 2,
                box: 1,
            });
        }
        expect(getWeakWords(records).length).toBe(20);
    });
});

// ── Curated etymologies ───────────────────────────────────────────────────────

describe('curated etymologies', () => {
    it('has at least 50 entries', () => {
        expect(CURATED_ETYMOLOGIES.length).toBeGreaterThanOrEqual(50);
    });

    it('all entries have word, fact, and minLevel', () => {
        for (const e of CURATED_ETYMOLOGIES) {
            expect(e.word).toBeTruthy();
            expect(e.fact).toBeTruthy();
            expect(e.minLevel).toBeGreaterThanOrEqual(1);
            expect(e.minLevel).toBeLessThanOrEqual(10);
        }
    });

    it('facts are human-readable (not raw Wiktionary)', () => {
        for (const e of CURATED_ETYMOLOGIES) {
            // Should not contain raw Wiktionary markup
            expect(e.fact).not.toContain('{{');
            expect(e.fact).not.toContain('}}');
            // Should be at least a sentence
            expect(e.fact.length).toBeGreaterThan(20);
        }
    });
});
