/**
 * Integration test: full session flow
 *
 * Tests the chain: word generation → answer recording → stats update →
 * achievement check → SRS progression, using real modules (no mocks).
 */
import { describe, it, expect } from 'vitest';
import type { WordRecord } from '../hooks/useWordHistory';
import { generateSpellingItem } from '../domains/spelling/spellingGenerator';
import { checkAchievements } from '../utils/achievements';
import { EVERY_SPELLING_ACHIEVEMENT, type SpellingAchievementStats } from '../domains/spelling/spellingAchievements';
import { getErrorPatterns, getCategoryAccuracy } from '../utils/errorPatterns';
import { evaluateLevelProgress } from '../domains/spelling/curriculum';
import { createSeededRng } from '../utils/seededRng';
// Tier 1-2 core words are eager-loaded — no explicit init needed

// ── Leitner simulation helpers (mirroring useWordHistory logic) ──────────────

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
    typed = false,
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
        mcqAttempts: (existing?.mcqAttempts ?? 0) + (typed ? 0 : 1),
        mcqCorrect: (existing?.mcqCorrect ?? 0) + (!typed && correct ? 1 : 0),
        typedAttempts: (existing?.typedAttempts ?? 0) + (typed ? 1 : 0),
        typedCorrect: (existing?.typedCorrect ?? 0) + (typed && correct ? 1 : 0),
        misspellings: !correct && typed ? [...(existing?.misspellings ?? []), 'wrong'].slice(-5) : existing?.misspellings,
    };
}

function buildStats(records: Record<string, WordRecord>, sessions: number): SpellingAchievementStats {
    let totalSolved = 0, totalCorrect = 0, totalXP = 0, bestStreak = 0;
    let typedCorrect = 0, masteredWordCount = 0;
    const reviewedWords = 0;
    const byType: Record<string, { solved: number; correct: number }> = {};

    for (const r of Object.values(records)) {
        totalSolved += r.attempts;
        totalCorrect += r.correct;
        typedCorrect += r.typedCorrect ?? 0;
        if (r.box >= 4 && (r.typedAttempts ?? 0) >= 1) masteredWordCount++;
        if (!byType[r.category]) byType[r.category] = { solved: 0, correct: 0 };
        byType[r.category].solved += r.attempts;
        byType[r.category].correct += r.correct;
    }
    totalXP = totalCorrect * 10;
    bestStreak = Math.min(totalCorrect, 20);

    return {
        totalXP, totalSolved, totalCorrect, bestStreak,
        dayStreak: 1, sessionsPlayed: sessions, byType,
        timedModeSolved: 0, timedModeCorrect: 0, timedModeBestStreak: 0,
        timedModeSessions: 0, timedModePerfects: 0,
        masteredWordCount, reviewedWords, typedCorrect,
        beeSessions: 0, beeNoHelpStreak: 0, beeBestRun: 0,
        bestTournamentRound: 0, tournamentSessions: 0,
    };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: full session flow', () => {
    it('generates words → records answers → computes stats → checks achievements', () => {
        const rng = createSeededRng(42);
        const records: Record<string, WordRecord> = {};
        const now = Date.now();

        // Simulate a 10-word session
        for (let i = 0; i < 10; i++) {
            const item = generateSpellingItem(1, 'level-1', rng);
            expect(item.options.length).toBe(3);
            expect(item.answer).toBeTruthy();

            // Simulate answering correctly
            const word = String(item.answer);
            records[word] = recordAttempt(records[word], word, 'level-1', true, now + i * 1000);
        }

        // Verify records were created
        expect(Object.keys(records).length).toBeGreaterThanOrEqual(1);

        // Build stats and check achievements
        const stats = buildStats(records, 1);
        expect(stats.totalSolved).toBeGreaterThanOrEqual(10);
        expect(stats.totalCorrect).toBeGreaterThanOrEqual(10);

        const newAchievements = checkAchievements(EVERY_SPELLING_ACHIEVEMENT, stats, new Set());
        expect(newAchievements).toContain('first-word');
    });

    it('word history feeds error patterns correctly', () => {
        const records: Record<string, WordRecord> = {};
        const now = Date.now();

        // Create words in different categories with varying accuracy
        for (let i = 0; i < 10; i++) {
            const word = `good${i}`;
            records[word] = recordAttempt(undefined, word, 'easy-cat', true, now + i);
        }
        for (let i = 0; i < 10; i++) {
            const word = `bad${i}`;
            records[word] = recordAttempt(undefined, word, 'hard-cat', false, now + i);
        }

        const patterns = getErrorPatterns(records);
        const catAccuracy = getCategoryAccuracy(records);

        // hard-cat should appear as an error pattern (100% error rate, 10 attempts)
        expect(patterns.some(p => p.category === 'hard-cat')).toBe(true);
        // Category accuracy should have both categories
        expect(catAccuracy.length).toBe(2);
    });

    it('SRS lifecycle: new → box 1 → box 2 → box 3 → box 4 (mastered)', () => {
        let rec: WordRecord | undefined;
        const now = Date.now();
        const DAY = 24 * 60 * 60 * 1000;

        // First correct answer: box 0 → 1
        rec = recordAttempt(rec, 'difficult', 'cvc', true, now, true);
        expect(rec.box).toBe(1);

        // After 1 day, review correct: box 1 → 2
        rec = recordAttempt(rec, 'difficult', 'cvc', true, now + 1 * DAY, true);
        expect(rec.box).toBe(2);

        // After 3 days, review correct: box 2 → 3
        rec = recordAttempt(rec, 'difficult', 'cvc', true, now + 4 * DAY, true);
        expect(rec.box).toBe(3);

        // After 7 days, review correct: box 3 → 4 (mastered!)
        rec = recordAttempt(rec, 'difficult', 'cvc', true, now + 11 * DAY, true);
        expect(rec.box).toBe(4);
        expect(rec.typedAttempts).toBe(4);

        // Verify it counts as mastered
        const records = { difficult: rec };
        const stats = buildStats(records, 4);
        expect(stats.masteredWordCount).toBe(1);
    });

    it('wrong answer resets box to 0, requiring full re-climb', () => {
        let rec: WordRecord | undefined;
        const now = Date.now();
        const DAY = 24 * 60 * 60 * 1000;

        // Climb to box 3
        rec = recordAttempt(rec, 'tricky', 'cvc', true, now, true);
        rec = recordAttempt(rec, 'tricky', 'cvc', true, now + 1 * DAY, true);
        rec = recordAttempt(rec, 'tricky', 'cvc', true, now + 4 * DAY, true);
        expect(rec.box).toBe(3);

        // Wrong answer — back to 0
        rec = recordAttempt(rec, 'tricky', 'cvc', false, now + 11 * DAY, true);
        expect(rec.box).toBe(0);
        expect(rec.attempts).toBe(4);
    });

    it('curriculum progress reflects word history', () => {
        const records: Record<string, WordRecord> = {};
        const now = Date.now();

        // Build up 5 words that are in the word bank at difficulty 1
        // Use the generator to get real words
        const rng = createSeededRng(99);
        for (let i = 0; i < 5; i++) {
            const item = generateSpellingItem(1, 'level-1', rng);
            const word = String(item.answer);
            records[word] = recordAttempt(records[word], word, 'level-1', true, now + i, true);
        }

        const progress = evaluateLevelProgress(records, () => 1000);
        // Level 1 should have some attempted words
        const level1 = progress[0];
        expect(level1.attempted).toBeGreaterThan(0);
        expect(level1.accuracy).toBeGreaterThan(0);
    });
});
