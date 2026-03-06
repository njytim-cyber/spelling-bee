/**
 * hooks/useWordHistory.ts
 *
 * Tracks per-word spelling accuracy with Leitner spaced repetition.
 * Data lives in localStorage only (too granular for Firestore in MVP).
 */
import { useState, useCallback, useMemo } from 'react';
import { STORAGE_KEYS, FREE_DAILY_REVIEW_CAP } from '../config';
import { getWordMap } from '../domains/spelling/words';

// ── Types ────────────────────────────────────────────────────────────────────

export type AnswerMode = 'mcq' | 'typed';

export interface WordAttempt {
    word: string;
    category: string;
    correct: boolean;
    timestamp: number;
    responseTimeMs: number;
    /** What the student actually typed (only stored on incorrect attempts) */
    typed?: string;
    /** Answer mode: 'mcq' for swipe/multiple-choice, 'typed' for text entry */
    mode?: AnswerMode;
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
    /** MCQ/swipe attempt and correct counts */
    mcqAttempts?: number;
    mcqCorrect?: number;
    /** Typed-answer attempt and correct counts */
    typedAttempts?: number;
    typedCorrect?: number;
}

interface WordHistory {
    records: Record<string, WordRecord>;
    recentAttempts: WordAttempt[];
    /** Sorted index for O(log n) review queue lookups - array of {key, nextReview, box} sorted by nextReview */
    nextReviewIndex: Array<{ key: string; nextReview: number; box: number }>;
}

// ── Constants ────────────────────────────────────────────────────────────────

const BASE_STORAGE_KEY = STORAGE_KEYS.wordHistory;
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

function loadHistory(storageKey: string): WordHistory {
    try {
        const raw = localStorage.getItem(storageKey);
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

function saveHistory(storageKey: string, h: WordHistory): void {
    try {
        localStorage.setItem(storageKey, JSON.stringify(h));
    } catch { /* quota exceeded — best effort */ }
}

// ── Daily review counter (localStorage, resets each calendar day) ─────────

function todayKey(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function readReviewsToday(): { date: string; count: number } {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.reviewsToday);
        if (raw) {
            const parsed = JSON.parse(raw) as { date: string; count: number };
            if (parsed.date === todayKey()) return parsed;
        }
    } catch { /* corrupt — reset */ }
    return { date: todayKey(), count: 0 };
}

function writeReviewsToday(count: number): void {
    try {
        localStorage.setItem(STORAGE_KEYS.reviewsToday, JSON.stringify({ date: todayKey(), count }));
    } catch { /* best effort */ }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useWordHistory(isPremium = false, profileId?: string | null) {
    const storageKey = profileId ? `${BASE_STORAGE_KEY}-${profileId}` : BASE_STORAGE_KEY;
    const [history, setHistory] = useState<WordHistory>(() => loadHistory(storageKey));
    const [reviewsUsedToday, setReviewsUsedToday] = useState(() => readReviewsToday().count);
    const [prevKey, setPrevKey] = useState(storageKey);

    // Reload history when profile changes
    if (storageKey !== prevKey) {
        setPrevKey(storageKey);
        setHistory(loadHistory(storageKey));
    }

    const recordAttempt = useCallback((
        word: string,
        category: string,
        correct: boolean,
        responseTimeMs: number,
        typed?: string,
        mode?: AnswerMode,
    ) => {
        setHistory(prev => {
            const now = Date.now();
            const key = word.toLowerCase();
            const existing = prev.records[key];
            const isMcq = mode !== 'typed';

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
                mcqAttempts: (existing?.mcqAttempts ?? 0) + (isMcq ? 1 : 0),
                mcqCorrect: (existing?.mcqCorrect ?? 0) + (isMcq && correct ? 1 : 0),
                typedAttempts: (existing?.typedAttempts ?? 0) + (!isMcq ? 1 : 0),
                typedCorrect: (existing?.typedCorrect ?? 0) + (!isMcq && correct ? 1 : 0),
            };

            const attempt: WordAttempt = {
                word: key, category, correct, timestamp: now, responseTimeMs,
                ...((!correct && typed) ? { typed: typed.trim().toLowerCase() } : {}),
                mode: isMcq ? 'mcq' : 'typed',
            };

            // Update sorted index: remove old entry, binary-insert new entry
            const filtered = prev.nextReviewIndex.filter(item => item.key !== key);
            const entry = { key, nextReview: record.nextReview, box: record.box };
            // Binary search for insertion point to maintain sort order (O(log n) vs O(n log n) re-sort)
            let lo = 0, hi = filtered.length;
            while (lo < hi) {
                const mid = (lo + hi) >>> 1;
                if (filtered[mid].nextReview <= entry.nextReview) lo = mid + 1;
                else hi = mid;
            }
            const newIndex = [...filtered.slice(0, lo), entry, ...filtered.slice(lo)];

            const next: WordHistory = {
                records: { ...prev.records, [key]: record },
                recentAttempts: [attempt, ...prev.recentAttempts].slice(0, MAX_RECENT),
                nextReviewIndex: newIndex,
            };

            saveHistory(storageKey, next);
            return next;
        });
    }, [storageKey]);

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

    /** Count of truly mastered words: box 4 AND at least one typed attempt */
    const masteredCount = useMemo(() =>
        Object.values(history.records).filter(r => r.box >= 4 && (r.typedAttempts ?? 0) >= 1).length,
    [history.records]);

    /** Count of mastered words at difficulty 5+ (for Verified Speller achievement) */
    const masteredWordsLevel5Plus = useMemo(() => {
        const wordMap = getWordMap();
        return Object.values(history.records).filter(r => {
            if (r.box < 4 || (r.typedAttempts ?? 0) < 1) return false;
            const detail = wordMap.get(r.word);
            return detail != null && detail.difficulty >= 5;
        }).length;
    }, [history.records]);

    /** Count of unique words the student has ever attempted */
    const uniqueWordsAttempted = Object.keys(history.records).length;

    // ── Daily review cap ──────────────────────────────────────────────────
    const reviewCap = isPremium ? Infinity : FREE_DAILY_REVIEW_CAP;
    const reviewsRemaining = Math.max(0, reviewCap - reviewsUsedToday);
    const isReviewLimited = !isPremium && reviewsUsedToday >= FREE_DAILY_REVIEW_CAP;

    /** Capped review queue for free users (30/day); unlimited for Champion Pass. */
    const cappedReviewQueue = useMemo(() => {
        if (isPremium) return reviewQueue;
        const remaining = Math.max(0, FREE_DAILY_REVIEW_CAP - reviewsUsedToday);
        return reviewQueue.slice(0, remaining);
    }, [reviewQueue, isPremium, reviewsUsedToday]);

    /** Call after each review word is answered to increment daily counter. */
    const incrementReviewCount = useCallback(() => {
        setReviewsUsedToday(prev => {
            const next = prev + 1;
            writeReviewsToday(next);
            return next;
        });
    }, []);

    return {
        records: history.records,
        recentAttempts: history.recentAttempts,
        recordAttempt,
        /** Full uncapped review queue (use cappedReviewQueue for display). */
        reviewQueue,
        /** Review queue capped by daily limit for free users. */
        cappedReviewQueue,
        weakCategories,
        hardestWords,
        masteredCount,
        masteredWordsLevel5Plus,
        uniqueWordsAttempted,
        reviewsUsedToday,
        reviewsRemaining,
        isReviewLimited,
        incrementReviewCount,
    };
}
