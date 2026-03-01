/**
 * hooks/useWordHistory.ts
 *
 * Tracks per-word spelling accuracy with Leitner spaced repetition.
 * Data lives in localStorage only (too granular for Firestore in MVP).
 */
import { useState, useCallback, useMemo } from 'react';
import { STORAGE_KEYS } from '../config';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WordAttempt {
    word: string;
    category: string;
    correct: boolean;
    timestamp: number;
    responseTimeMs: number;
    /** What the student actually typed (only stored on incorrect attempts) */
    typed?: string;
}

export interface WordRecord {
    word: string;
    category: string;
    attempts: number;
    correct: number;
    lastSeen: number;
    lastCorrect: number;
    /** Leitner box: 0 = immediate, 1 = 1d, 2 = 3d, 3 = 7d, 4 = mastered */
    box: number;
    /** Timestamp when word should next be reviewed */
    nextReview: number;
    /** Recent misspellings (last 5) for mistake-pattern analysis */
    misspellings?: string[];
}

interface WordHistory {
    records: Record<string, WordRecord>;
    recentAttempts: WordAttempt[];
    /** Sorted index for O(log n) review queue lookups - array of {key, nextReview, box} sorted by nextReview */
    nextReviewIndex: Array<{ key: string; nextReview: number; box: number }>;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = STORAGE_KEYS.wordHistory;
const MAX_RECENT = 200;

/** Leitner box → review delay in milliseconds */
const BOX_DELAY_MS: Record<number, number> = {
    0: 0,                        // immediate
    1: 1 * 24 * 60 * 60 * 1000,  // 1 day
    2: 3 * 24 * 60 * 60 * 1000,  // 3 days
    3: 7 * 24 * 60 * 60 * 1000,  // 7 days
    4: 14 * 24 * 60 * 60 * 1000, // 14 days (mastered)
};

// ── Persistence ──────────────────────────────────────────────────────────────

function loadHistory(): WordHistory {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const loaded = JSON.parse(raw) as WordHistory;
            // Rebuild index if missing (backward compatibility)
            if (!loaded.nextReviewIndex) {
                loaded.nextReviewIndex = Object.entries(loaded.records)
                    .map(([key, r]) => ({ key, nextReview: r.nextReview, box: r.box }))
                    .sort((a, b) => a.nextReview - b.nextReview);
            }
            return loaded;
        }
    } catch { /* corrupt data — start fresh */ }
    return { records: {}, recentAttempts: [], nextReviewIndex: [] };
}

function saveHistory(h: WordHistory): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
    } catch { /* quota exceeded — best effort */ }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useWordHistory() {
    const [history, setHistory] = useState<WordHistory>(loadHistory);

    const recordAttempt = useCallback((
        word: string,
        category: string,
        correct: boolean,
        responseTimeMs: number,
        typed?: string,
    ) => {
        setHistory(prev => {
            const now = Date.now();
            const key = word.toLowerCase();
            const existing = prev.records[key];

            const newBox = existing
                ? (correct ? Math.min(existing.box + 1, 4) : 0)
                : (correct ? 1 : 0);

            // Keep last 5 misspellings per word for pattern analysis
            const misspellings = existing?.misspellings ?? [];
            const nextMisspellings = (!correct && typed)
                ? [typed.trim().toLowerCase(), ...misspellings].slice(0, 5)
                : misspellings;

            const record: WordRecord = {
                word: key,
                category,
                attempts: (existing?.attempts ?? 0) + 1,
                correct: (existing?.correct ?? 0) + (correct ? 1 : 0),
                lastSeen: now,
                lastCorrect: correct ? now : (existing?.lastCorrect ?? 0),
                box: newBox,
                nextReview: now + (BOX_DELAY_MS[newBox] ?? 0),
                ...(nextMisspellings.length > 0 ? { misspellings: nextMisspellings } : {}),
            };

            const attempt: WordAttempt = {
                word: key, category, correct, timestamp: now, responseTimeMs,
                ...((!correct && typed) ? { typed: typed.trim().toLowerCase() } : {}),
            };

            // Update sorted index: remove old entry, add new, re-sort
            const newIndex = [
                ...prev.nextReviewIndex.filter(item => item.key !== key),
                { key, nextReview: record.nextReview, box: record.box }
            ].sort((a, b) => a.nextReview - b.nextReview);

            const next: WordHistory = {
                records: { ...prev.records, [key]: record },
                recentAttempts: [attempt, ...prev.recentAttempts].slice(0, MAX_RECENT),
                nextReviewIndex: newIndex,
            };

            saveHistory(next);
            return next;
        });
    }, []);

    /**
     * Words due for review: box < 4 and nextReview ≤ lastAttemptTime.
     * Uses binary search on sorted nextReviewIndex for O(log n) performance.
     * Falls back to 0 (showing all non-mastered words) if no attempts yet.
     */
    const latestTs = history.recentAttempts[0]?.timestamp ?? 0;
    const reviewQueue = useMemo(() => {
        // Use latest timestamp or 0 (shows all non-mastered words if no attempts yet)
        const asOf = latestTs || 0;

        // Binary search to find first index where nextReview > asOf
        let left = 0, right = history.nextReviewIndex.length - 1;
        let splitPoint = 0;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (history.nextReviewIndex[mid].nextReview <= asOf) {
                splitPoint = mid + 1; // All items <= mid are due
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        // All words from [0, splitPoint) are due for review
        const dueWords = history.nextReviewIndex
            .slice(0, splitPoint)
            .filter(item => item.box < 4) // Exclude mastered words
            .map(item => history.records[item.key])
            .filter(Boolean); // Safety filter for missing records

        // Sort by priority: lower box first, then lower accuracy
        return dueWords.sort((a, b) => {
            if (a.box !== b.box) return a.box - b.box;
            const aAcc = a.attempts > 0 ? a.correct / a.attempts : 0;
            const bAcc = b.attempts > 0 ? b.correct / b.attempts : 0;
            return aAcc - bAcc;
        });
    }, [history.nextReviewIndex, history.records, latestTs]);

    /** Categories with > 20% error rate and at least 5 attempts */
    const weakCategories = useMemo(() => {
        const cats: Record<string, { attempts: number; correct: number }> = {};
        for (const r of Object.values(history.records)) {
            if (!cats[r.category]) cats[r.category] = { attempts: 0, correct: 0 };
            cats[r.category].attempts += r.attempts;
            cats[r.category].correct += r.correct;
        }
        return Object.entries(cats)
            .filter(([, s]) => s.attempts >= 5 && (s.correct / s.attempts) < 0.8)
            .map(([cat, s]) => ({ category: cat, accuracy: s.correct / s.attempts, attempts: s.attempts }))
            .sort((a, b) => a.accuracy - b.accuracy);
    }, [history.records]);

    /** Words with <50% accuracy and 3+ attempts, sorted by worst first */
    const hardestWords = useMemo(() =>
        Object.values(history.records)
            .filter(r => r.attempts >= 3 && (r.correct / r.attempts) < 0.5)
            .sort((a, b) => (a.correct / a.attempts) - (b.correct / b.attempts)),
    [history.records]);

    /** Count of words at Leitner box 4 (mastered) */
    const masteredCount = useMemo(() =>
        Object.values(history.records).filter(r => r.box >= 4).length,
    [history.records]);

    return {
        records: history.records,
        recentAttempts: history.recentAttempts,
        recordAttempt,
        reviewQueue,
        weakCategories,
        hardestWords,
        masteredCount,
    };
}
