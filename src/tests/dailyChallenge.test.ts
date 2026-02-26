import { describe, it, expect, beforeEach } from 'vitest';
import { generateDailyChallenge, generateChallenge, createChallengeId } from '../utils/dailyChallenge';
import { isDailyComplete, saveDailyResult, getDailyStreak, getTodayResult } from '../utils/dailyTracking';
import { STORAGE_KEYS } from '../config';

// ── dailyChallenge.ts ────────────────────────────────────────────────────────

describe('dailyChallenge.ts', () => {

    it('generates exactly 10 problems', () => {
        const { problems } = generateDailyChallenge();
        expect(problems).toHaveLength(10);
    });

    it('each problem has a daily-prefixed id', () => {
        const { problems } = generateDailyChallenge();
        for (const p of problems) {
            expect(p.id).toMatch(/^daily-/);
        }
    });

    it('same date produces same words (deterministic)', () => {
        const result1 = generateDailyChallenge();
        const result2 = generateDailyChallenge();
        expect(result1.problems.map(p => p.answer)).toEqual(
            result2.problems.map(p => p.answer),
        );
    });

    it('returns a human-readable dateLabel', () => {
        const { dateLabel } = generateDailyChallenge();
        // Should be something like "Feb 24"
        expect(typeof dateLabel).toBe('string');
        expect(dateLabel.length).toBeGreaterThan(2);
    });

    it('problems have increasing difficulty', () => {
        const { problems } = generateDailyChallenge();
        // Last problem's requested difficulty (5) > first problem's (2),
        // so max difficulty in second half should be >= max in first half
        const firstMax = Math.max(...problems.slice(0, 5).map(p => p.meta?.['difficulty'] as number));
        const secondMax = Math.max(...problems.slice(5).map(p => p.meta?.['difficulty'] as number));
        expect(secondMax).toBeGreaterThanOrEqual(firstMax);
    });
});

describe('generateChallenge', () => {

    it('same challengeId produces same words', () => {
        const a = generateChallenge('test-challenge-42');
        const b = generateChallenge('test-challenge-42');
        expect(a.map(p => p.answer)).toEqual(b.map(p => p.answer));
    });

    it('different challengeIds produce different words', () => {
        const a = generateChallenge('alpha');
        const b = generateChallenge('beta');
        // With high probability, at least one answer differs
        const aAnswers = a.map(p => p.answer).join(',');
        const bAnswers = b.map(p => p.answer).join(',');
        expect(aAnswers).not.toBe(bAnswers);
    });

    it('challenge problems have challenge-prefixed ids', () => {
        const problems = generateChallenge('xyz');
        for (const p of problems) {
            expect(p.id).toMatch(/^challenge-/);
        }
    });
});

describe('createChallengeId', () => {
    it('returns a non-empty base-36 string', () => {
        const id = createChallengeId();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
        expect(/^[0-9a-z]+$/.test(id)).toBe(true);
    });
});

// ── dailyTracking.ts ────────────────────────────────────────────────────────

describe('dailyTracking.ts', () => {

    beforeEach(() => {
        localStorage.clear();
    });

    it('isDailyComplete returns false when no results saved', () => {
        expect(isDailyComplete()).toBe(false);
    });

    it('saveDailyResult + isDailyComplete round-trip', () => {
        saveDailyResult({ score: 100, correct: 9, total: 10, timeMs: 30000 });
        expect(isDailyComplete()).toBe(true);
    });

    it('getTodayResult returns null when empty, result after save', () => {
        expect(getTodayResult()).toBeNull();
        saveDailyResult({ score: 80, correct: 8, total: 10, timeMs: 25000 });
        const result = getTodayResult();
        expect(result).not.toBeNull();
        expect(result!.correct).toBe(8);
        expect(result!.total).toBe(10);
    });

    it('getDailyStreak returns 1 after first daily completion', () => {
        saveDailyResult({ score: 100, correct: 10, total: 10, timeMs: 20000 });
        expect(getDailyStreak()).toBe(1);
    });

    it('trims results to 30 entries', () => {
        // Save 35 results with different dates
        for (let i = 0; i < 35; i++) {
            const key = STORAGE_KEYS.dailyResults;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            existing.push({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, score: 100, correct: 10, total: 10, timeMs: 20000 });
            localStorage.setItem(key, JSON.stringify(existing));
        }
        // Now save one more via the function (triggers trim)
        saveDailyResult({ score: 100, correct: 10, total: 10, timeMs: 20000 });
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.dailyResults)!);
        expect(raw.length).toBeLessThanOrEqual(30);
    });
});
