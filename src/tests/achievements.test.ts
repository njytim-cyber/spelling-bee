import { describe, it, expect } from 'vitest';
import { checkAchievements } from '../utils/achievements';
import { EVERY_SPELLING_ACHIEVEMENT, type SpellingAchievementStats } from '../domains/spelling/spellingAchievements';

// Convenience wrapper
function checkSpellingAchievements(stats: SpellingAchievementStats, unlocked: Set<string>): string[] {
    return checkAchievements(EVERY_SPELLING_ACHIEVEMENT, stats, unlocked);
}

describe('achievements.ts', () => {

    const baseStats: SpellingAchievementStats = {
        totalCorrect: 0,
        totalSolved: 0,
        totalXP: 0,
        bestStreak: 0,
        dayStreak: 0,
        sessionsPlayed: 1,
        byType: {} as Record<string, { solved: number; correct: number }>,
        timedModeSolved: 0,
        timedModeCorrect: 0,
        timedModeBestStreak: 0,
        timedModeSessions: 0,
        timedModePerfects: 0,
        masteredWordCount: 0,
        reviewedWords: 0,
        typedCorrect: 0,
        beeSessions: 0,
        beeNoHelpStreak: 0,
        beeBestRun: 0,
        bestTournamentRound: 0,
        tournamentSessions: 0,
    };

    it('awards streak-20 when best streak hits 20', () => {
        const stats: SpellingAchievementStats = { ...baseStats, bestStreak: 20 };
        const unlocked = checkSpellingAchievements(stats, new Set());
        expect(unlocked).toContain('streak-20');
        expect(unlocked).toContain('streak-5'); // Also checks off previous milestones
    });

    it('awards sharpshooter badge (90%+ over 50 questions)', () => {
        const stats: SpellingAchievementStats = { ...baseStats, totalSolved: 50, totalCorrect: 50 };
        const unlocked = checkSpellingAchievements(stats, new Set());
        expect(unlocked).toContain('sharpshooter');
    });

    it('does not re-award already unlocked badges', () => {
        const stats: SpellingAchievementStats = { ...baseStats, bestStreak: 10 };
        const prevUnlocked = new Set(['streak-10', 'streak-5']);
        const newlyUnlocked = checkSpellingAchievements(stats, prevUnlocked);
        expect(newlyUnlocked).toHaveLength(0);
    });

    it('awards dedicated badge for 7 days played', () => {
        const stats: SpellingAchievementStats = { ...baseStats, dayStreak: 7 };
        const unlocked = checkSpellingAchievements(stats, new Set());
        expect(unlocked).toContain('dedicated');
    });

    it('awards word-explorer at 100 mastered words', () => {
        const stats: SpellingAchievementStats = { ...baseStats, masteredWordCount: 100 };
        const unlocked = checkSpellingAchievements(stats, new Set());
        expect(unlocked).toContain('word-explorer');
        expect(unlocked).not.toContain('word-scholar');
    });

    it('awards word-scholar at 500 mastered words', () => {
        const stats: SpellingAchievementStats = { ...baseStats, masteredWordCount: 500 };
        const unlocked = checkSpellingAchievements(stats, new Set());
        expect(unlocked).toContain('word-explorer');
        expect(unlocked).toContain('word-scholar');
        expect(unlocked).not.toContain('word-professor');
    });

    it('awards word-professor at 1000 mastered words', () => {
        const stats: SpellingAchievementStats = { ...baseStats, masteredWordCount: 1000 };
        const unlocked = checkSpellingAchievements(stats, new Set());
        expect(unlocked).toContain('word-professor');
    });

    it('awards word-savant at 5000 mastered words', () => {
        const stats: SpellingAchievementStats = { ...baseStats, masteredWordCount: 5000 };
        const unlocked = checkSpellingAchievements(stats, new Set());
        expect(unlocked).toContain('word-savant');
        expect(unlocked).not.toContain('word-omniscient');
    });

    it('awards word-omniscient at 10000 mastered words', () => {
        const stats: SpellingAchievementStats = { ...baseStats, masteredWordCount: 10000 };
        const unlocked = checkSpellingAchievements(stats, new Set());
        expect(unlocked).toContain('word-omniscient');
    });

    it('does not award word-explorer below 100 mastered words', () => {
        const stats: SpellingAchievementStats = { ...baseStats, masteredWordCount: 99 };
        const unlocked = checkSpellingAchievements(stats, new Set());
        expect(unlocked).not.toContain('word-explorer');
    });

    // ── Core: first-word, century, machine ──────────────────────────────────

    it('awards first-word on first solve', () => {
        const stats = { ...baseStats, totalSolved: 1 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('first-word');
    });

    it('awards century at 100 solved', () => {
        const stats = { ...baseStats, totalSolved: 100 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('century');
    });

    it('awards spelling machine at 500 solved', () => {
        const stats = { ...baseStats, totalSolved: 500 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('math-machine');
    });

    it('awards streak-5 at 5-streak', () => {
        const stats = { ...baseStats, bestStreak: 5 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('streak-5');
    });

    it('does not award sharpshooter below 50 solved', () => {
        const stats = { ...baseStats, totalSolved: 49, totalCorrect: 49 };
        expect(checkSpellingAchievements(stats, new Set())).not.toContain('sharpshooter');
    });

    it('does not award sharpshooter below 90% accuracy', () => {
        const stats = { ...baseStats, totalSolved: 100, totalCorrect: 89 };
        expect(checkSpellingAchievements(stats, new Set())).not.toContain('sharpshooter');
    });

    it('awards all-rounder when 4+ categories each have 10+ solved', () => {
        const byType: Record<string, { solved: number; correct: number }> = {
            cvc: { solved: 10, correct: 10 },
            blends: { solved: 10, correct: 10 },
            digraphs: { solved: 10, correct: 10 },
            'silent-e': { solved: 10, correct: 10 },
        };
        const stats = { ...baseStats, byType };
        expect(checkSpellingAchievements(stats, new Set())).toContain('all-rounder');
    });

    it('does not award all-rounder with fewer than 4 categories', () => {
        const byType: Record<string, { solved: number; correct: number }> = {
            cvc: { solved: 10, correct: 10 },
            blends: { solved: 10, correct: 10 },
        };
        const stats = { ...baseStats, byType };
        expect(checkSpellingAchievements(stats, new Set())).not.toContain('all-rounder');
    });

    // ── Timed mode ──────────────────────────────────────────────────────────

    it('awards speed-demon on first timed session', () => {
        const stats = { ...baseStats, timedModeSessions: 1 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('speed-demon');
    });

    it('awards blitz-master at 50 timed words', () => {
        const stats = { ...baseStats, timedModeSolved: 50 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('blitz-master');
    });

    it('awards lightning at 5-streak timed', () => {
        const stats = { ...baseStats, timedModeBestStreak: 5 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('lightning');
    });

    it('awards time-lord for perfect timed session', () => {
        const stats = { ...baseStats, timedModePerfects: 1 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('time-lord');
    });

    // ── Learning ────────────────────────────────────────────────────────────

    it('awards reviewer after first review', () => {
        const stats = { ...baseStats, reviewedWords: 1 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('reviewer');
    });

    it('awards memory-master at 20 mastered words', () => {
        const stats = { ...baseStats, masteredWordCount: 20 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('memory-master');
    });

    it('awards comeback-kid at 50 reviewed words', () => {
        const stats = { ...baseStats, reviewedWords: 50 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('comeback-kid');
    });

    it('awards true-speller at 50 typed correct', () => {
        const stats = { ...baseStats, typedCorrect: 50 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('true-speller');
    });

    // ── Bee simulation ──────────────────────────────────────────────────────

    it('awards bee-debut on first bee session', () => {
        const stats = { ...baseStats, beeSessions: 1 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('bee-debut');
    });

    it('awards no-help at 5 no-help streak', () => {
        const stats = { ...baseStats, beeNoHelpStreak: 5 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('no-help');
    });

    it('awards bee-champion at 20 rounds survived', () => {
        const stats = { ...baseStats, beeBestRun: 20 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('bee-champion');
    });

    // ── Tournament ──────────────────────────────────────────────────────────

    it('awards tournament-enter on first tournament', () => {
        const stats = { ...baseStats, tournamentSessions: 1 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('tournament-enter');
    });

    it('awards tournament-10 at 10 rounds survived', () => {
        const stats = { ...baseStats, bestTournamentRound: 10 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('tournament-10');
    });

    it('awards tournament-20 at 20 rounds survived', () => {
        const stats = { ...baseStats, bestTournamentRound: 20 };
        expect(checkSpellingAchievements(stats, new Set())).toContain('tournament-20');
    });

    // ── Meta: all 21 achievements are exercised ─────────────────────────────

    it('EVERY_SPELLING_ACHIEVEMENT has 27 entries', () => {
        expect(EVERY_SPELLING_ACHIEVEMENT).toHaveLength(27);
    });
});
