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
}

interface WordHistory {
    records: Record<string, WordRecord>;
    recentAttempts: WordAttempt[];
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
        if (raw) return JSON.parse(raw) as WordHistory;
    } catch { /* corrupt data — start fresh */ }
    return { records: {}, recentAttempts: [] };
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
    ) => {
        setHistory(prev => {
            const now = Date.now();
            const key = word.toLowerCase();
            const existing = prev.records[key];

            const newBox = existing
                ? (correct ? Math.min(existing.box + 1, 4) : 0)
                : (correct ? 1 : 0);

            const record: WordRecord = {
                word: key,
                category,
                attempts: (existing?.attempts ?? 0) + 1,
                correct: (existing?.correct ?? 0) + (correct ? 1 : 0),
                lastSeen: now,
                lastCorrect: correct ? now : (existing?.lastCorrect ?? 0),
                box: newBox,
                nextReview: now + (BOX_DELAY_MS[newBox] ?? 0),
            };

            const attempt: WordAttempt = { word: key, category, correct, timestamp: now, responseTimeMs };

            const next: WordHistory = {
                records: { ...prev.records, [key]: record },
                recentAttempts: [attempt, ...prev.recentAttempts].slice(0, MAX_RECENT),
            };

            saveHistory(next);
            return next;
        });
    }, []);

    /**
     * Words due for review: box < 4 and nextReview ≤ lastAttemptTime.
     * Uses the latest attempt timestamp as "now" to avoid impure Date.now() in useMemo.
     * Falls back to 0 (showing all non-mastered words) if no attempts yet.
     */
    const latestTs = history.recentAttempts[0]?.timestamp ?? 0;
    const reviewQueue = useMemo(() => {
        // Use latest recorded timestamp as a pure proxy for "now"
        const asOf = latestTs || 0;
        return Object.values(history.records)
            .filter(r => r.box < 4 && r.nextReview <= asOf)
            .sort((a, b) => {
                // Prioritize lower boxes (harder words) and lower accuracy
                if (a.box !== b.box) return a.box - b.box;
                const aAcc = a.attempts > 0 ? a.correct / a.attempts : 0;
                const bAcc = b.attempts > 0 ? b.correct / b.attempts : 0;
                return aAcc - bAcc;
            });
    }, [history.records, latestTs]);

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
        masteredCount,
    };
}
