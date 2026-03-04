/**
 * domains/spelling/spellingAchievements.ts
 *
 * Spelling-flavoured achievement definitions.
 */
import type { Achievement } from '../../utils/achievements';

/** Stats snapshot used for spelling achievement checks */
export interface SpellingAchievementStats {
    totalXP: number;
    totalSolved: number;
    totalCorrect: number;
    bestStreak: number;
    dayStreak: number;
    sessionsPlayed: number;
    byType: Record<string, { solved: number; correct: number }>;
    // Timed mode
    timedModeSolved: number;
    timedModeCorrect: number;
    timedModeBestStreak: number;
    timedModeSessions: number;
    timedModePerfects: number;
    // Adaptive learning
    masteredWordCount: number;
    reviewedWords: number;
    // Bee simulation
    beeSessions: number;
    beeNoHelpStreak: number;
    beeBestRun: number;
    // Tournament
    bestTournamentRound: number;
    tournamentSessions: number;
}

// ── Core achievements ─────────────────────────────────────────────────────────

const CORE_ACHIEVEMENTS: Achievement<SpellingAchievementStats>[] = [
    {
        id: 'first-word',
        name: 'First Word',
        desc: 'Spell your first word correctly',
        check: s => s.totalSolved >= 1,
    },
    {
        id: 'streak-5',
        name: 'Spelling Spree',
        desc: 'Get a 5× streak',
        check: s => s.bestStreak >= 5,
    },
    {
        id: 'streak-20',
        name: 'Word Wizard',
        desc: 'Get a 20× streak',
        check: s => s.bestStreak >= 20,
    },
    {
        id: 'century',
        name: 'Century Speller',
        desc: 'Spell 100 words',
        check: s => s.totalSolved >= 100,
    },
    {
        id: 'math-machine',         // id kept for stat-key compatibility
        name: 'Spelling Machine',
        desc: 'Spell 500 words',
        check: s => s.totalSolved >= 500,
    },
    {
        id: 'sharpshooter',
        name: 'Sharp Speller',
        desc: '90%+ accuracy (50+ words)',
        check: s => s.totalSolved >= 50 && (s.totalCorrect / s.totalSolved) >= 0.9,
    },
    {
        id: 'dedicated',
        name: 'Daily Bee',
        desc: 'Play 7 days in a row',
        check: s => s.dayStreak >= 7,
    },
    {
        id: 'all-rounder',
        name: 'All-Category Champion',
        desc: 'Spell 10+ words in every category',
        check: s => {
            const META = ['daily', 'challenge', 'ghost', 'review'];
            const entries = Object.entries(s.byType).filter(([k]) => !META.includes(k) && !k.startsWith('tier-'));
            if (entries.length < 4) return false;
            return entries.every(([, t]) => t.solved >= 10);
        },
    },
];

// ── Timed mode achievements ───────────────────────────────────────────────────

const TIMED_MODE_ACHIEVEMENTS: Achievement<SpellingAchievementStats>[] = [
    { id: 'speed-demon', name: 'Speed Speller', desc: 'Complete 1 timed session', check: s => s.timedModeSessions >= 1 },
    { id: 'blitz-master', name: 'Blitz Speller', desc: 'Spell 50 words on timed mode', check: s => s.timedModeSolved >= 50 },
    { id: 'lightning', name: 'Lightning Fingers', desc: '5× streak on timed mode', check: s => s.timedModeBestStreak >= 5 },
    { id: 'time-lord', name: 'Bee Time Lord', desc: 'Perfect timed session', check: s => s.timedModePerfects >= 1 },
];

// ── Learning achievements ─────────────────────────────────────────────────────

const LEARNING_ACHIEVEMENTS: Achievement<SpellingAchievementStats>[] = [
    { id: 'reviewer', name: 'Reviewer', desc: 'Complete a review session', check: s => s.reviewedWords >= 1 },
    { id: 'memory-master', name: 'Memory Master', desc: 'Master 20 words (Leitner box 4)', check: s => s.masteredWordCount >= 20 },
    { id: 'comeback-kid', name: 'Comeback Kid', desc: 'Review 50 words', check: s => s.reviewedWords >= 50 },
];

// ── Bee simulation achievements ──────────────────────────────────────────────

const BEE_SIM_ACHIEVEMENTS: Achievement<SpellingAchievementStats>[] = [
    { id: 'bee-debut', name: 'Bee Debut', desc: 'Complete a bee simulation session', check: s => s.beeSessions >= 1 },
    { id: 'no-help', name: 'No Help Needed', desc: 'Spell 5 words without using hints', check: s => s.beeNoHelpStreak >= 5 },
    { id: 'bee-champion', name: 'Bee Champion', desc: 'Survive 20 rounds in bee mode', check: s => s.beeBestRun >= 20 },
];

// ── Tournament achievements ──────────────────────────────────────────────────

const TOURNAMENT_ACHIEVEMENTS: Achievement<SpellingAchievementStats>[] = [
    { id: 'tournament-enter', name: 'Tournament Entry', desc: 'Enter your first tournament', check: s => s.tournamentSessions >= 1 },
    { id: 'tournament-10', name: 'Tournament Survivor', desc: 'Survive 10 tournament rounds', check: s => s.bestTournamentRound >= 10 },
    { id: 'tournament-20', name: 'Spelling Gladiator', desc: 'Survive 20 tournament rounds', check: s => s.bestTournamentRound >= 20 },
];

// ── Word mastery milestones ──────────────────────────────────────────────────

const MASTERY_MILESTONE_ACHIEVEMENTS: Achievement<SpellingAchievementStats>[] = [
    { id: 'word-explorer', name: 'Word Explorer', desc: 'Master 100 words', check: s => s.masteredWordCount >= 100 },
    { id: 'word-scholar', name: 'Word Scholar', desc: 'Master 500 words', check: s => s.masteredWordCount >= 500 },
    { id: 'word-professor', name: 'Word Professor', desc: 'Master 1,000 words', check: s => s.masteredWordCount >= 1000 },
    { id: 'word-savant', name: 'Word Savant', desc: 'Master 5,000 words', check: s => s.masteredWordCount >= 5000 },
    { id: 'word-omniscient', name: 'Word Omniscient', desc: 'Master 10,000 words', check: s => s.masteredWordCount >= 10000 },
];

// ── Public export ─────────────────────────────────────────────────────────────

export const EVERY_SPELLING_ACHIEVEMENT: Achievement<SpellingAchievementStats>[] = [
    ...CORE_ACHIEVEMENTS,
    ...TIMED_MODE_ACHIEVEMENTS,
    ...LEARNING_ACHIEVEMENTS,
    ...MASTERY_MILESTONE_ACHIEVEMENTS,
    ...BEE_SIM_ACHIEVEMENTS,
    ...TOURNAMENT_ACHIEVEMENTS,
];
