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
        hardModeSolved: 0,
        hardModeCorrect: 0,
        hardModeBestStreak: 0,
        hardModeSessions: 0,
        hardModePerfects: 0,
        timedModeSolved: 0,
        timedModeCorrect: 0,
        timedModeBestStreak: 0,
        timedModeSessions: 0,
        timedModePerfects: 0,
        ultimateSolved: 0,
        ultimateCorrect: 0,
        ultimateBestStreak: 0,
        ultimateSessions: 0,
        ultimatePerfects: 0,
        masteredWordCount: 0,
        reviewedWords: 0,
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
});
