/**
 * hooks/useSharedDailyWord.ts
 *
 * Firestore hook for the Shared Daily Word feature.
 * Handles: attempt state, community stats (live), submission, streak tracking.
 * Offline-first: localStorage for instant state, Firestore for community stats.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, onSnapshot, increment, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import { FIRESTORE, STORAGE_KEYS } from '../config';
import { getSharedDailyWord, getDailyWordNumber, todayKey } from '../utils/sharedDailyWord';
import type { SpellingWord } from '../domains/spelling/words/types';

export interface DailyAttempt {
    correct: boolean;
    attempts: number;
    timeMs: number;
}

export interface CommunityStats {
    totalAttempts: number;
    correctCount: number;
}

export interface SharedDailyWordState {
    word: SpellingWord | null;
    wordNumber: number;
    loading: boolean;
    hasAttempted: boolean;
    myAttempt: DailyAttempt | null;
    communityStats: CommunityStats | null;
    submitAttempt: (correct: boolean, attempts: number, timeMs: number) => Promise<void>;
    streak: number;
}

/** Load today's attempt from localStorage (fast, offline) */
function loadLocalAttempt(today: string): DailyAttempt | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.sharedDailyAttempt);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed.date !== today) return null;
        return parsed.attempt as DailyAttempt;
    } catch {
        return null;
    }
}

/** Save today's attempt to localStorage */
function saveLocalAttempt(today: string, attempt: DailyAttempt): void {
    localStorage.setItem(STORAGE_KEYS.sharedDailyAttempt, JSON.stringify({ date: today, attempt }));
}

/** Load streak from localStorage */
function loadStreak(): { count: number; lastDate: string } {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.sharedDailyStreak);
        if (!raw) return { count: 0, lastDate: '' };
        return JSON.parse(raw);
    } catch {
        return { count: 0, lastDate: '' };
    }
}

/** Update streak after a correct attempt */
function updateStreak(today: string): number {
    const { count, lastDate } = loadStreak();

    // Already counted today
    if (lastDate === today) return count;

    // Check if yesterday was the last streak date
    const todayDate = new Date(today + 'T00:00:00Z');
    const yesterdayDate = new Date(todayDate.getTime() - 86_400_000);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);

    const newCount = lastDate === yesterday ? count + 1 : 1;
    localStorage.setItem(STORAGE_KEYS.sharedDailyStreak, JSON.stringify({ count: newCount, lastDate: today }));
    return newCount;
}

export function useSharedDailyWord(): SharedDailyWordState {
    const today = todayKey();
    const word = useRef(getSharedDailyWord()).current;
    const wordNumber = getDailyWordNumber();

    const [loading, setLoading] = useState(true);
    const [myAttempt, setMyAttempt] = useState<DailyAttempt | null>(null);
    const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
    const [streak, setStreak] = useState(0);
    const submittingRef = useRef(false);
    const unsubRef = useRef<(() => void) | null>(null);

    // Phase 1: Load local state immediately
    useEffect(() => {
        const local = loadLocalAttempt(today);
        if (local) {
            setMyAttempt(local);
            const s = loadStreak();
            setStreak(s.lastDate === today ? s.count : 0);
        }
        setLoading(false);
    }, [today]);

    // Phase 2: Subscribe to community stats (live)
    useEffect(() => {
        if (unsubRef.current) unsubRef.current();

        const docRef = doc(db, FIRESTORE.DAILY_WORDS, today);
        const unsub = onSnapshot(
            docRef,
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    setCommunityStats({
                        totalAttempts: data.totalAttempts ?? 0,
                        correctCount: data.correctCount ?? 0,
                    });
                }
            },
            (err) => {
                console.warn('Daily word listener error:', err);
            },
        );
        unsubRef.current = unsub;

        return () => {
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }
        };
    }, [today]);

    // Phase 3: Verify attempt against Firestore (in case localStorage was cleared)
    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid || myAttempt) return;

        const attemptRef = doc(db, FIRESTORE.DAILY_WORDS, today, 'attempts', uid);
        getDoc(attemptRef).then(snap => {
            if (snap.exists()) {
                const data = snap.data() as DailyAttempt;
                setMyAttempt(data);
                saveLocalAttempt(today, data);
            }
        }).catch(() => { /* offline — localStorage is source of truth */ });
    }, [today, myAttempt]);

    // Submit attempt
    const submitAttempt = useCallback(async (correct: boolean, attempts: number, timeMs: number) => {
        if (submittingRef.current || myAttempt) return;
        submittingRef.current = true;

        const attempt: DailyAttempt = { correct, attempts, timeMs };

        // Optimistic: update UI + localStorage immediately
        setMyAttempt(attempt);
        saveLocalAttempt(today, attempt);

        if (correct) {
            const newStreak = updateStreak(today);
            setStreak(newStreak);
        }

        // Write to Firestore
        const uid = auth.currentUser?.uid;
        if (!uid || !word) {
            submittingRef.current = false;
            return;
        }

        try {
            // Write user's attempt (create only — security rules block updates)
            const attemptRef = doc(db, FIRESTORE.DAILY_WORDS, today, 'attempts', uid);
            await setDoc(attemptRef, {
                correct,
                attempts,
                timeMs,
                completedAt: serverTimestamp(),
            });

            // Update community counters (merge: creates doc if first attempt of the day)
            const dailyRef = doc(db, FIRESTORE.DAILY_WORDS, today);
            await setDoc(dailyRef, {
                word: word.word,
                difficulty: word.difficulty,
                totalAttempts: increment(1),
                correctCount: correct ? increment(1) : increment(0),
                createdAt: serverTimestamp(),
            }, { merge: true });
        } catch (err) {
            console.warn('Failed to sync daily word attempt:', err);
            // Attempt is saved locally — no data loss
        } finally {
            submittingRef.current = false;
        }
    }, [today, word, myAttempt]);

    return {
        word,
        wordNumber,
        loading,
        hasAttempted: myAttempt !== null,
        myAttempt,
        communityStats,
        submitAttempt,
        streak,
    };
}
