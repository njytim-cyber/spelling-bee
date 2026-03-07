/**
 * engine/scoring.ts
 *
 * Pure scoring functions — no React, no subject knowledge.
 * Extracted from useGameLoop so forks can override easily.
 */

/**
 * Points awarded for a correct answer.
 * @param streak     Current consecutive-correct count (after this answer)
 * @param isFast     true if answered within the "fast" threshold (~1200 ms)
 * @param multiplier XP multiplier (e.g. 2 for boss round, 5 for bonus word)
 */
export function scoreCorrect(streak: number, isFast: boolean, multiplier = 1): number {
    return Math.round((10 + Math.floor(streak / 5) * 5 + (isFast ? 2 : 0)) * multiplier);
}

/**
 * Score after a wrong answer (no penalty — score stays the same).
 */
export function scorePenalty(current: number): number {
    return current;
}

/** Ms threshold below which an answer is considered "fast" */
export const FAST_ANSWER_MS = 1200;
