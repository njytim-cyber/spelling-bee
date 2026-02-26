/**
 * hooks/useMultiplayerRoom.ts
 *
 * Real-time 1v1 multiplayer spelling match via Firestore.
 * Create room → share code → join → 10 rounds → score.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { collection, doc, setDoc, updateDoc, onSnapshot, query, where, getDocs, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { generateSpellingItem } from '../domains/spelling/spellingGenerator';
import type { EngineItem } from '../engine/domain';

export type RoomPhase = 'idle' | 'creating' | 'lobby' | 'playing' | 'round-result' | 'finished';

export interface PlayerData {
    displayName: string;
    ready: boolean;
    score: number;
    answers: (string | null)[];
    results: (boolean | null)[];
}

export interface RoomData {
    roomCode: string;
    hostUid: string;
    status: 'waiting' | 'playing' | 'finished';
    currentRound: number;
    roundCount: number;
    turnTimeMs: number;
    words: { word: string; prompt: string; options: string[]; correctIndex: number }[];
    players: Record<string, PlayerData>;
    createdAt: ReturnType<typeof serverTimestamp>;
}

function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function generateMatchWords(count: number): RoomData['words'] {
    const items: EngineItem[] = [];
    for (let i = 0; i < count; i++) {
        const diff = 2 + Math.floor(i / 3); // gradually harder
        items.push(generateSpellingItem(diff, 'cvc', false));
    }
    return items.map(item => ({
        word: String(item.answer),
        prompt: item.prompt ?? '',
        options: item.options.map(String),
        correctIndex: item.correctIndex,
    }));
}

export function useMultiplayerRoom(uid: string | null, displayName: string) {
    const [phase, setPhase] = useState<RoomPhase>('idle');
    const [roomId, setRoomId] = useState<string | null>(null);
    const [roomCode, setRoomCode] = useState('');
    const [roomData, setRoomData] = useState<RoomData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentRound, setCurrentRound] = useState(0);
    const [roundTimeLeft, setRoundTimeLeft] = useState(0);
    const timerRef = useRef(0);
    const unsubRef = useRef<(() => void) | null>(null);

    // Clean up listener on unmount
    useEffect(() => {
        return () => {
            if (unsubRef.current) unsubRef.current();
            cancelAnimationFrame(timerRef.current);
        };
    }, []);

    const subscribeToRoom = useCallback((id: string) => {
        if (unsubRef.current) unsubRef.current();
        const unsub = onSnapshot(doc(db, 'rooms', id), (snap) => {
            if (!snap.exists()) {
                setError('Room no longer exists');
                setPhase('idle');
                return;
            }
            const data = snap.data() as RoomData;
            setRoomData(data);
            setCurrentRound(data.currentRound);

            if (data.status === 'playing' && phase !== 'finished') {
                setPhase('playing');
            } else if (data.status === 'finished') {
                setPhase('finished');
            }
        });
        unsubRef.current = unsub;
    }, [phase]);

    const createRoom = useCallback(async () => {
        if (!uid) { setError('Must be signed in'); return; }
        setPhase('creating');
        setError(null);

        const code = generateRoomCode();
        const words = generateMatchWords(10);
        const roomRef = doc(collection(db, 'rooms'));

        const room: RoomData = {
            roomCode: code,
            hostUid: uid,
            status: 'waiting',
            currentRound: 0,
            roundCount: 10,
            turnTimeMs: 15000,
            words,
            players: {
                [uid]: {
                    displayName,
                    ready: false,
                    score: 0,
                    answers: new Array(10).fill(null),
                    results: new Array(10).fill(null),
                },
            },
            createdAt: serverTimestamp(),
        };

        await setDoc(roomRef, room);
        setRoomId(roomRef.id);
        setRoomCode(code);
        setPhase('lobby');
        subscribeToRoom(roomRef.id);
    }, [uid, displayName, subscribeToRoom]);

    const joinRoom = useCallback(async (code: string) => {
        if (!uid) { setError('Must be signed in'); return; }
        setError(null);

        const q = query(collection(db, 'rooms'), where('roomCode', '==', code.toUpperCase()), where('status', '==', 'waiting'));
        const snap = await getDocs(q);

        if (snap.empty) {
            setError('Room not found or already started');
            return;
        }

        const roomDoc = snap.docs[0];
        const data = roomDoc.data() as RoomData;

        if (Object.keys(data.players).length >= 2) {
            setError('Room is full');
            return;
        }

        if (data.players[uid]) {
            // Already in this room
            setRoomId(roomDoc.id);
            setRoomCode(code.toUpperCase());
            setPhase('lobby');
            subscribeToRoom(roomDoc.id);
            return;
        }

        await updateDoc(roomDoc.ref, {
            [`players.${uid}`]: {
                displayName,
                ready: false,
                score: 0,
                answers: new Array(10).fill(null),
                results: new Array(10).fill(null),
            },
        });

        setRoomId(roomDoc.id);
        setRoomCode(code.toUpperCase());
        setPhase('lobby');
        subscribeToRoom(roomDoc.id);
    }, [uid, displayName, subscribeToRoom]);

    const setReady = useCallback(async () => {
        if (!roomId || !uid) return;
        await updateDoc(doc(db, 'rooms', roomId), {
            [`players.${uid}.ready`]: true,
        });
    }, [roomId, uid]);

    const startMatch = useCallback(async () => {
        if (!roomId || !uid) return;
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, {
            status: 'playing',
            currentRound: 0,
        });
    }, [roomId, uid]);

    const submitAnswer = useCallback(async (round: number, spelling: string) => {
        if (!roomId || !uid || !roomData) return;

        const word = roomData.words[round];
        const isCorrect = spelling.toLowerCase() === word.word.toLowerCase();

        await runTransaction(db, async (tx) => {
            const roomRef = doc(db, 'rooms', roomId);
            const snap = await tx.get(roomRef);
            if (!snap.exists()) return;

            const data = snap.data() as RoomData;
            const player = data.players[uid];
            if (!player) return;

            const newAnswers = [...player.answers];
            newAnswers[round] = spelling;
            const newResults = [...player.results];
            newResults[round] = isCorrect;
            const newScore = player.score + (isCorrect ? 1 : 0);

            tx.update(roomRef, {
                [`players.${uid}.answers.${round}`]: spelling,
                [`players.${uid}.results.${round}`]: isCorrect,
                [`players.${uid}.score`]: newScore,
            });

            // Check if both players have answered this round
            const otherPlayers = Object.entries(data.players).filter(([id]) => id !== uid);
            const allAnswered = otherPlayers.every(([, p]) => p.answers[round] !== null);

            if (allAnswered) {
                // Advance round
                const nextRound = round + 1;
                if (nextRound >= data.roundCount) {
                    tx.update(roomRef, { status: 'finished', currentRound: nextRound });
                } else {
                    tx.update(roomRef, { currentRound: nextRound });
                }
            }
        });
    }, [roomId, uid, roomData]);

    const forceSubmitEmpty = useCallback(async (round: number) => {
        await submitAnswer(round, '');
    }, [submitAnswer]);

    const leaveRoom = useCallback(() => {
        if (unsubRef.current) unsubRef.current();
        cancelAnimationFrame(timerRef.current);
        setPhase('idle');
        setRoomId(null);
        setRoomCode('');
        setRoomData(null);
        setError(null);
    }, []);

    // Round timer
    useEffect(() => {
        if (phase !== 'playing' || !roomData) return;
        const turnTime = roomData.turnTimeMs;
        const startTime = Date.now();
        const tick = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, turnTime - elapsed);
            setRoundTimeLeft(remaining);
            if (remaining > 0) {
                timerRef.current = requestAnimationFrame(tick);
            } else {
                // Auto-submit empty on timeout
                const myAnswer = roomData.players[uid ?? '']?.answers[currentRound];
                if (myAnswer === null) {
                    forceSubmitEmpty(currentRound);
                }
            }
        };
        timerRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(timerRef.current);
    }, [phase, currentRound, roomData, uid, forceSubmitEmpty]);

    return {
        phase,
        roomCode,
        roomData,
        currentRound,
        roundTimeLeft,
        error,
        createRoom,
        joinRoom,
        setReady,
        startMatch,
        submitAnswer,
        leaveRoom,
        isHost: roomData?.hostUid === uid,
    };
}
