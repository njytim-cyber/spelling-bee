/**
 * domains/spelling/curriculum.ts
 *
 * Per-level progress computation. The curriculum is simply 10 levels (1-10),
 * each mapping 1:1 to a difficulty value. No sub-phases, no mastery gates.
 */
import type { WordRecord } from '../../hooks/useWordHistory';
import type { DifficultyTier } from './words/types';
import { LEVELS } from './spellingCategories';
import { getWordMap } from './words';

// ── Level progress ──────────────────────────────────────────────────────────

export interface LevelProgress {
    /** Level number (1-10) */
    level: number;
    /** Display label from LEVELS */
    label: string;
    /** Level ID (e.g. 'level-3') */
    tierId: string;
    /** Total words available at this difficulty */
    totalWords: number;
    /** Words the student has attempted at this difficulty */
    attempted: number;
    /** Words the student has mastered (box >= 3) at this difficulty */
    mastered: number;
    /** Overall accuracy for words at this difficulty */
    accuracy: number;
}

/**
 * Compute per-level progress from word history records.
 * Uses the word map to look up each record's difficulty.
 */
export function evaluateLevelProgress(
    records: Record<string, WordRecord>,
    wordCountByDifficulty: (diff: DifficultyTier) => number,
): LevelProgress[] {
    const wordMap = getWordMap();

    // Bucket records by difficulty
    const byDiff = new Map<number, { attempted: number; correct: number; mastered: number }>();
    for (const rec of Object.values(records)) {
        const entry = wordMap.get(rec.word);
        const diff = entry?.difficulty ?? 0;
        if (diff < 1 || diff > 10) continue;
        const bucket = byDiff.get(diff) ?? { attempted: 0, correct: 0, mastered: 0 };
        bucket.attempted += 1;
        bucket.correct += rec.correct;
        if (rec.box >= 3) bucket.mastered += 1;
        byDiff.set(diff, bucket);
    }

    return LEVELS.map((g, i) => {
        const diff = (i + 1) as DifficultyTier;
        const bucket = byDiff.get(diff);
        const totalWords = wordCountByDifficulty(diff);
        return {
            level: diff,
            label: g.label,
            tierId: g.id,
            totalWords,
            attempted: bucket?.attempted ?? 0,
            mastered: bucket?.mastered ?? 0,
            accuracy: bucket && bucket.attempted > 0
                ? bucket.correct / bucket.attempted
                : 0,
        };
    });
}
