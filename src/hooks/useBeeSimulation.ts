/**
 * hooks/useBeeSimulation.ts
 *
 * State machine for the Bee Simulation mode.
 * Simulates a real spelling bee: hear word → ask questions → spell it.
 */
import { useState, useCallback, useRef } from 'react';
import type { SpellingWord } from '../domains/spelling/words/types';
import { ALL_WORDS, difficultyRange, BAND_DIFFICULTY_CAP } from '../domains/spelling/words';
import type { DifficultyTier } from '../domains/spelling/words/types';
import { usePronunciation } from './usePronunciation';

export type BeePhase = 'listening' | 'asking' | 'spelling' | 'feedback' | 'eliminated' | 'complete';

export type InfoRequest = 'definition' | 'sentence' | 'origin' | 'repeat';

export interface BeeSimState {
    phase: BeePhase;
    currentWord: SpellingWord | null;
    round: number;
    wordsCorrect: number;
    wordsAttempted: number;
    eliminationMode: boolean;
    typedSpelling: string;
    infoRequested: Set<InfoRequest>;
    lastResult: boolean | null;
    infoResponses: Partial<Record<InfoRequest, string>>;
}

const INITIAL_STATE: BeeSimState = {
    phase: 'listening',
    currentWord: null,
    round: 0,
    wordsCorrect: 0,
    wordsAttempted: 0,
    eliminationMode: true,
    typedSpelling: '',
    infoRequested: new Set(),
    lastResult: null,
    infoResponses: {},
};

function pickBeeWord(round: number, band?: string): SpellingWord {
    // Progressive difficulty based on round
    const diffLevel = Math.min(5, 1 + Math.floor(round / 5));
    const [minDiff, maxDiff] = difficultyRange(diffLevel);
    const bandCap = band ? (BAND_DIFFICULTY_CAP[band] ?? 10) : 10;
    const effectiveMax = Math.min(maxDiff, bandCap) as DifficultyTier;
    const effectiveMin = Math.min(minDiff, effectiveMax) as DifficultyTier;

    const pool = ALL_WORDS.filter(w => w.difficulty >= effectiveMin && w.difficulty <= effectiveMax);
    const source = pool.length > 0 ? pool : ALL_WORDS;
    return source[Math.floor(Math.random() * source.length)];
}

export function useBeeSimulation(band?: string) {
    const [state, setState] = useState<BeeSimState>(INITIAL_STATE);
    const { speak, isSupported } = usePronunciation();
    const startTimeRef = useRef(0);

    const startRound = useCallback(() => {
        const word = pickBeeWord(state.round, band);
        setState(prev => ({
            ...prev,
            phase: 'listening',
            currentWord: word,
            typedSpelling: '',
            infoRequested: new Set(),
            lastResult: null,
            infoResponses: {},
        }));
        if (isSupported) speak(word.word);
    }, [state.round, band, speak, isSupported]);

    const startSession = useCallback(() => {
        const word = pickBeeWord(0, band);
        setState({
            ...INITIAL_STATE,
            currentWord: word,
            phase: 'listening',
        });
        if (isSupported) speak(word.word);
    }, [band, speak, isSupported]);

    const pronounce = useCallback(() => {
        if (state.currentWord && isSupported) {
            speak(state.currentWord.word);
        }
    }, [state.currentWord, speak, isSupported]);

    const moveToAsking = useCallback(() => {
        setState(prev => ({ ...prev, phase: 'asking' }));
    }, []);

    const requestInfo = useCallback((type: InfoRequest) => {
        setState(prev => {
            if (prev.infoRequested.has(type) && type !== 'repeat') return prev;

            const newRequested = new Set(prev.infoRequested);
            newRequested.add(type);

            const newResponses = { ...prev.infoResponses };
            const word = prev.currentWord;
            if (!word) return prev;

            switch (type) {
                case 'definition':
                    newResponses.definition = word.definition;
                    break;
                case 'sentence':
                    newResponses.sentence = word.exampleSentence;
                    break;
                case 'origin':
                    newResponses.origin = word.etymology || 'Origin information not available.';
                    break;
                case 'repeat':
                    if (isSupported) speak(word.word);
                    break;
            }

            return { ...prev, infoRequested: newRequested, infoResponses: newResponses };
        });
    }, [speak, isSupported]);

    const moveToSpelling = useCallback(() => {
        startTimeRef.current = Date.now();
        setState(prev => ({ ...prev, phase: 'spelling' }));
    }, []);

    const updateTyping = useCallback((text: string) => {
        setState(prev => ({ ...prev, typedSpelling: text }));
    }, []);

    const submitSpelling = useCallback(() => {
        setState(prev => {
            if (!prev.currentWord) return prev;
            const correct = prev.typedSpelling.trim().toLowerCase() === prev.currentWord.word.toLowerCase();
            const wordsCorrect = prev.wordsCorrect + (correct ? 1 : 0);
            const wordsAttempted = prev.wordsAttempted + 1;

            if (!correct && prev.eliminationMode) {
                return {
                    ...prev,
                    phase: 'eliminated',
                    lastResult: false,
                    wordsCorrect,
                    wordsAttempted,
                };
            }

            return {
                ...prev,
                phase: 'feedback',
                lastResult: correct,
                wordsCorrect,
                wordsAttempted,
            };
        });
    }, []);

    const nextWord = useCallback(() => {
        setState(prev => {
            const newRound = prev.round + 1;
            const word = pickBeeWord(newRound, band);
            if (isSupported) speak(word.word);
            return {
                ...prev,
                phase: 'listening',
                currentWord: word,
                round: newRound,
                typedSpelling: '',
                infoRequested: new Set(),
                lastResult: null,
                infoResponses: {},
            };
        });
    }, [band, speak, isSupported]);

    /** XP earned for the current session */
    const sessionXP = state.wordsCorrect * 15
        + state.wordsCorrect * (state.infoRequested.size === 0 ? 5 : 0);

    return {
        state,
        startSession,
        startRound,
        pronounce,
        moveToAsking,
        requestInfo,
        moveToSpelling,
        updateTyping,
        submitSpelling,
        nextWord,
        sessionXP,
        ttsSupported: isSupported,
    };
}
