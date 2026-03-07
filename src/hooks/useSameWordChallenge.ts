/**
 * hooks/useSameWordChallenge.ts
 *
 * Async same-word challenges: create a frozen word set, opponent plays independently,
 * compare results per-word. Reuses the `rooms` Firestore collection with mode: 'async'.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    doc, setDoc, updateDoc, getDoc,
    collection, query, where, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { FIRESTORE } from '../config';
import { generateSpellingItem } from '../domains/spelling/spellingGenerator';
import { trackEvent } from '../utils/analytics';
import type { EngineItem } from '../engine/domain';
import type { RoomData, PlayerData } from './useMultiplayerRoom';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WordResult {
    word: string;
    correct: boolean;
    timeMs: number;
}

export interface ChallengeInfo {
    roomId: string;
    roomCode: string;
    opponentName: string;
    opponentUid: string;
    wordCount: number;
    myCompleted: boolean;
    theirCompleted: boolean;
    myResults: WordResult[] | null;
    theirResults: WordResult[] | null;
    createdAt: Date;
    expiresAt: Date;
    isCreator: boolean;
}

export interface UseSameWordChallengeReturn {
    challenges: ChallengeInfo[];
    loading: boolean;
    createChallenge: (friendUid: string, friendName: string, wordCount?: number) => Promise<string | null>;
    submitResults: (roomId: string, results: WordResult[]) => Promise<void>;
    getChallengeWords: (roomId: string) => Promise<RoomData['words'] | null>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
    let code = '';
    for (let i = 0; i < 6; i++) code += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
    return code;
}

function generateChallengeWords(count: number): RoomData['words'] {
    const items: EngineItem[] = [];
    for (let i = 0; i < count; i++) {
        const diff = 2 + Math.floor(i * 8 / count); // ramp from 2 to ~10
        items.push(generateSpellingItem(diff, 'cvc'));
    }
    return items.map(item => ({
        word: String(item.answer),
        prompt: item.prompt ?? '',
        options: item.options.map(String),
        correctIndex: item.correctIndex,
    }));
}

function toDate(ts: unknown): Date {
    if (ts instanceof Timestamp) return ts.toDate();
    if (ts instanceof Date) return ts;
    return new Date();
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSameWordChallenge(
    uid: string | null,
    displayName: string,
): UseSameWordChallengeReturn {
    const [challenges, setChallenges] = useState<ChallengeInfo[]>([]);
    const [loading, setLoading] = useState(!!uid);
    const unsubRef = useRef<(() => void) | null>(null);

    // ── Listen for my async rooms ────────────────────────────────────────────

    useEffect(() => {
        if (!uid) return;

        if (unsubRef.current) unsubRef.current();

        // Query rooms where I'm a player and mode is async
        const q = query(
            collection(db, FIRESTORE.ROOMS),
            where('mode', '==', 'async'),
            where('status', 'in', ['playing', 'finished']),
        );

        const unsub = onSnapshot(
            q,
            (snap) => {
                const entries: ChallengeInfo[] = [];
                snap.forEach((d) => {
                    const data = d.data() as RoomData;
                    if (!data.players[uid]) return; // Not my room

                    const playerUids = Object.keys(data.players);
                    const opponentUid = playerUids.find(u => u !== uid);
                    if (!opponentUid) return;

                    const myPlayer = data.players[uid];
                    const theirPlayer = data.players[opponentUid];

                    const myCompleted = (myPlayer.completedAt !== undefined && myPlayer.completedAt !== null);
                    const theirCompleted = (theirPlayer.completedAt !== undefined && theirPlayer.completedAt !== null);

                    const createdAt = toDate(data.createdAt);
                    const expiresAt = data.expiresAt ? toDate(data.expiresAt) : new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);

                    // Skip expired challenges
                    if (expiresAt < new Date()) return;

                    entries.push({
                        roomId: d.id,
                        roomCode: data.roomCode,
                        opponentName: theirPlayer.displayName,
                        opponentUid,
                        wordCount: data.words.length,
                        myCompleted,
                        theirCompleted,
                        myResults: myCompleted && myPlayer.timePerWord
                            ? data.words.map((w, i) => ({
                                word: w.word,
                                correct: myPlayer.results[i] === true,
                                timeMs: myPlayer.timePerWord![i] ?? 0,
                            }))
                            : null,
                        theirResults: theirCompleted && theirPlayer.timePerWord
                            ? data.words.map((w, i) => ({
                                word: w.word,
                                correct: theirPlayer.results[i] === true,
                                timeMs: theirPlayer.timePerWord![i] ?? 0,
                            }))
                            : null,
                        createdAt,
                        expiresAt,
                        isCreator: data.hostUid === uid,
                    });
                });
                // Sort: incomplete first, then by creation date descending
                entries.sort((a, b) => {
                    const aComplete = a.myCompleted && a.theirCompleted;
                    const bComplete = b.myCompleted && b.theirCompleted;
                    if (aComplete !== bComplete) return aComplete ? 1 : -1;
                    return b.createdAt.getTime() - a.createdAt.getTime();
                });
                setChallenges(entries);
                setLoading(false);
            },
            (err) => {
                console.warn('Same-word challenge listener error:', err);
                setLoading(false);
            },
        );
        unsubRef.current = unsub;

        return () => {
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }
        };
    }, [uid]);

    // ── Create a challenge ───────────────────────────────────────────────────

    const createChallenge = useCallback(async (
        friendUid: string,
        friendName: string,
        wordCount = 10,
    ): Promise<string | null> => {
        if (!uid) return null;

        try {
            const roomCode = generateRoomCode();
            const roomId = `async_${uid}_${Date.now()}`;
            const words = generateChallengeWords(wordCount);

            const emptyPlayer: PlayerData = {
                displayName: '',
                ready: true,
                score: 0,
                answers: new Array(wordCount).fill(null),
                results: new Array(wordCount).fill(null),
            };

            const now = new Date();
            const expiresAt = Timestamp.fromDate(new Date(now.getTime() + 48 * 60 * 60 * 1000));

            const roomData: RoomData = {
                roomCode,
                hostUid: uid,
                status: 'playing',
                currentRound: 0,
                roundCount: wordCount,
                turnTimeMs: 0, // No time limit for async
                words,
                players: {
                    [uid]: { ...emptyPlayer, displayName },
                    [friendUid]: { ...emptyPlayer, displayName: friendName },
                },
                createdAt: serverTimestamp(),
                mode: 'async',
                expiresAt,
            };

            await setDoc(doc(db, FIRESTORE.ROOMS, roomId), roomData);

            // Send a ping to the opponent
            const pingId = `challenge_${uid}_${Date.now()}`;
            await setDoc(doc(db, 'pings', pingId), {
                targetUid: friendUid,
                senderUid: uid,
                senderName: displayName,
                createdAt: serverTimestamp(),
                read: false,
                type: 'challenge',
                roomCode,
            });

            // Update lastPingAt to satisfy rate limiting rules
            await updateDoc(doc(db, FIRESTORE.USERS, uid), {
                lastPingAt: serverTimestamp(),
            });

            trackEvent('challenge_created', { wordCount });
            return roomCode;
        } catch (err) {
            console.warn('Failed to create challenge:', err);
            return null;
        }
    }, [uid, displayName]);

    // ── Submit my results ────────────────────────────────────────────────────

    const submitResults = useCallback(async (roomId: string, results: WordResult[]) => {
        if (!uid) return;

        try {
            const roomRef = doc(db, FIRESTORE.ROOMS, roomId);
            const snap = await getDoc(roomRef);
            if (!snap.exists()) return;

            const data = snap.data() as RoomData;
            if (!data.players[uid]) return;

            const score = results.filter(r => r.correct).length * 10;
            const answers = results.map(r => r.correct ? r.word : null);
            const resultBools = results.map(r => r.correct);
            const timePerWord = results.map(r => r.timeMs);

            await updateDoc(roomRef, {
                [`players.${uid}.score`]: score,
                [`players.${uid}.answers`]: answers,
                [`players.${uid}.results`]: resultBools,
                [`players.${uid}.completedAt`]: serverTimestamp(),
                [`players.${uid}.timePerWord`]: timePerWord,
            });

            // Check if both players are done → mark room finished
            const otherUid = Object.keys(data.players).find(u => u !== uid);
            if (otherUid && data.players[otherUid].completedAt) {
                await updateDoc(roomRef, { status: 'finished' });
            }

            trackEvent('challenge_completed', { won: score > (data.players[otherUid!]?.score ?? 0) });
        } catch (err) {
            console.warn('Failed to submit challenge results:', err);
        }
    }, [uid]);

    // ── Get challenge words (for playing) ────────────────────────────────────

    const getChallengeWords = useCallback(async (roomId: string): Promise<RoomData['words'] | null> => {
        try {
            const snap = await getDoc(doc(db, FIRESTORE.ROOMS, roomId));
            if (!snap.exists()) return null;
            return (snap.data() as RoomData).words;
        } catch {
            return null;
        }
    }, []);

    return {
        challenges,
        loading,
        createChallenge,
        submitResults,
        getChallengeWords,
    };
}
