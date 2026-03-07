/**
 * utils/surpriseHistory.ts
 *
 * Tracks which mid-session surprises the user has seen to avoid repetition fatigue.
 * Stored in localStorage as a map of surprise type → count.
 */
import { STORAGE_KEYS } from '../config';
import type { SurpriseType } from '../domains/spelling/spellingGenerator';

export interface SurpriseHistory {
    /** Count of times each surprise type has been triggered */
    counts: Record<string, number>;
    /** Timestamp of the last surprise (any type) */
    lastSurpriseAt: number;
}

/** Load surprise history from localStorage */
export function getSurpriseHistory(): SurpriseHistory {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.surpriseHistory);
        if (raw) return JSON.parse(raw);
    } catch { /* use default */ }
    return { counts: {}, lastSurpriseAt: 0 };
}

/** Record that a surprise was triggered */
export function recordSurprise(type: SurpriseType): void {
    const history = getSurpriseHistory();
    history.counts[type] = (history.counts[type] || 0) + 1;
    history.lastSurpriseAt = Date.now();
    localStorage.setItem(STORAGE_KEYS.surpriseHistory, JSON.stringify(history));
}

/** Get count of times a surprise type has been seen */
export function getSurpriseCount(type: SurpriseType): number {
    return getSurpriseHistory().counts[type] || 0;
}

/** Get total surprise count across all types */
export function getTotalSurpriseCount(): number {
    const { counts } = getSurpriseHistory();
    return Object.values(counts).reduce((sum, c) => sum + c, 0);
}
