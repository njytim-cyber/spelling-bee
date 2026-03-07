/**
 * utils/sharedDailyWord.ts
 *
 * Deterministic daily word selection — everyone gets the same word.
 * Uses seeded RNG so the word is identical across all clients for a given date.
 */
import { dateSeed, createSeededRng } from './seededRng';
import { wordsByDifficulty } from '../domains/spelling/words';
import type { SpellingWord } from '../domains/spelling/words/types';
import type { DifficultyTier } from '../domains/spelling/words/types';
import { getRarityConfig } from './rarity';
import { appendReferralFooter } from './shareHelper';
import { dateLocale } from './dateHelpers';

/** Epoch for daily word numbering (Jan 1 2026) */
const EPOCH = new Date(2026, 0, 1).getTime();

/**
 * Get the shared daily word for a given date.
 * Same date → same word globally, regardless of user progress.
 * Pool: difficulty 4-7 (interesting but not impossible).
 * Prefers words with etymology for shareability.
 */
export function getSharedDailyWord(date: Date = new Date()): SpellingWord | null {
    // Pool from difficulty 4-7
    const candidates: SpellingWord[] = [];
    for (let d = 4; d <= 7; d++) {
        candidates.push(...wordsByDifficulty(d as DifficultyTier, d as DifficultyTier));
    }
    if (candidates.length === 0) return null;

    // Prefer words with etymology (more interesting to share)
    const withEtymology = candidates.filter(w => w.etymology);
    const pool = withEtymology.length >= 30 ? withEtymology : candidates;

    // Deterministic selection
    const seed = dateSeed(date);
    const rng = createSeededRng(seed);
    const idx = Math.floor(rng() * pool.length);
    return pool[idx];
}

/** Day number since epoch, for display like "Daily Word #127" */
export function getDailyWordNumber(date: Date = new Date()): number {
    return Math.floor((date.getTime() - EPOCH) / 86_400_000) + 1;
}

/** Today's date as YYYY-MM-DD (UTC) for Firestore document IDs */
export function todayKey(date: Date = new Date()): string {
    return date.toISOString().slice(0, 10);
}

/** Format ordinal: 1 → "1st", 2 → "2nd", etc. */
function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Format the share text for a daily word result */
export function formatDailyWordShare(
    word: SpellingWord,
    result: { correct: boolean; attempts: number; timeMs: number },
    wordNumber: number,
    streak: number,
    communityCorrectPct: number | null,
    referralCode?: string,
): string {
    const dateLabel = new Date().toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric' });
    const rc = getRarityConfig(word.difficulty);
    const timeStr = (result.timeMs / 1000).toFixed(1);

    const lines: string[] = [
        `🐝 Daily Word #${wordNumber} · ${dateLabel}`,
        '',
    ];

    if (result.correct) {
        lines.push(`✅ ${word.word} (${rc.emoji} ${rc.label})`);
        lines.push(`${ordinal(result.attempts)} try · ${timeStr}s`);
    } else {
        lines.push(`❌ ${word.word} (${rc.emoji} ${rc.label})`);
    }

    if (communityCorrectPct !== null) {
        lines.push('');
        lines.push(`${Math.round(communityCorrectPct)}% of players got it right`);
    }

    if (streak > 1) {
        lines.push('');
        lines.push(`🔥 ${streak}-day streak`);
    }

    return appendReferralFooter(lines.join('\n'), referralCode);
}
