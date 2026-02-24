/**
 * engine/scoring.ts
 *
 * Pure scoring functions — no React, no subject knowledge.
 * Extracted from useGameLoop so forks can override easily.
 */

/**
 * Points awarded for a correct answer.
 * @param streak  Current consecutive-correct count (after this answer)
 * @param isFast  true if answered within the "fast" threshold (~1200 ms)
 */
export function scoreCorrect(streak: number, isFast: boolean): number {
    return 10 + Math.floor(streak / 5) * 5 + (isFast ? 2 : 0);
}

/**
 * Score after a wrong answer (never below 0).
 */
export function scorePenalty(current: number): number {
    return Math.max(0, current - 5);
}

/** Ms threshold below which an answer is considered "fast" */
export const FAST_ANSWER_MS = 1200;
