/**
 * hooks/useBeeSimulation.ts
 *
 * State machine for the Bee Simulation mode.
 * Simulates a real spelling bee: hear word → ask questions → spell it.
 */
import { useState, useCallback, useRef } from 'react';
import type { SpellingWord } from '../domains/spelling/words/types';
import { difficultyRange } from '../domains/spelling/words';
import { selectWordPool } from '../domains/spelling/spellingGenerator';
import { usePronunciation } from './usePronunciation';
import { parseEtymology } from '../utils/etymologyParser';
import { playDing, playBuzzer, playGasp, playApplause } from '../utils/beeSounds';

export type BeePhase = 'listening' | 'asking' | 'spelling' | 'feedback' | 'eliminated' | 'won' | 'complete';

export type InfoRequest = 'definition' | 'sentence' | 'origin' | 'partOfSpeech' | 'repeat';

/** Bee competition level — controls starting difficulty floor */
export type BeeLevel = 'classroom' | 'district' | 'state' | 'national';

/** Minimum difficulty level per bee level (the floor — rounds still ramp up from here) */
const BEE_LEVEL_FLOOR: Record<BeeLevel, number> = {
    classroom: 1,   // starts at kindergarten, ramps to ~6
    district: 2,    // starts at grade 2-3, ramps to ~8
    state: 3,       // starts at grade 4-5, ramps to ~9
    national: 4,    // starts at grade 6+, ramps to 10
};

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
    /** NPC results for the current round: null = not gone yet, true/false = result. Index 2 is the player. */
    npcResults: (boolean | null)[];
    /** Which pupils are still in the bee */
    npcAlive: boolean[];
    /** Skill levels per pupil (probability of correct answer). Index 2 = player, unused. */
    npcSkill: number[];
    /** Running scores for each pupil (index 2 = player) */
    npcScores: number[];
    /** NPC spelling attempts for the current round (shown in speech bubbles) */
    npcSpellings: (string | null)[];
}

// Stronger NPCs: brainiac lasts ~10 rounds, eager ~6, nervous ~3
const NPC_BASE_SKILL = [0.96, 0.82, 1.0, 0.55]; // brainiac, eager, player(unused), nervous

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
    npcResults: [null, null, null, null],
    npcAlive: [true, true, true, true],
    npcSkill: NPC_BASE_SKILL,
    npcScores: [0, 0, 0, 0],
    npcSpellings: [null, null, null, null],
};

/** Replace the target word in a sentence with underscores so users can't read the answer. */
function redactWord(sentence: string, word: string): string {
    const blank = '_'.repeat(word.length);
    return sentence.replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), blank);
}

function pickBeeWord(round: number, category?: string, hardMode = false, beeLevel: BeeLevel = 'classroom'): SpellingWord {
    // Difficulty ramps from the bee level's floor
    const floor = BEE_LEVEL_FLOOR[beeLevel];
    const diffLevel = Math.min(5, floor + Math.floor(round / 3));
    const effectiveDifficulty = hardMode ? Math.min(5, diffLevel + 1) : diffLevel;
    const [minDiff, maxDiff] = difficultyRange(effectiveDifficulty);

    const pool = selectWordPool(category, minDiff, maxDiff, hardMode);
    return pool[Math.floor(Math.random() * pool.length)];
}

// Per-NPC decay rates: brainiac decays slowly, nervous decays fast
const NPC_DECAY = [0.008, 0.025, 0, 0.045];

/** Generate a plausible misspelling of a word */
function misspell(word: string): string {
    const w = word.split('');
    const strategies = [
        // Swap two adjacent letters
        () => {
            const i = Math.floor(Math.random() * (w.length - 1));
            [w[i], w[i + 1]] = [w[i + 1], w[i]];
        },
        // Double a letter
        () => {
            const i = Math.floor(Math.random() * w.length);
            w.splice(i, 0, w[i]);
        },
        // Drop a letter (not first)
        () => {
            if (w.length > 3) {
                const i = 1 + Math.floor(Math.random() * (w.length - 1));
                w.splice(i, 1);
            }
        },
        // Replace a vowel
        () => {
            const vowels = 'aeiou';
            const vowelIdxs = w.map((c, i) => vowels.includes(c.toLowerCase()) ? i : -1).filter(i => i >= 0);
            if (vowelIdxs.length > 0) {
                const i = vowelIdxs[Math.floor(Math.random() * vowelIdxs.length)];
                const replacement = vowels[Math.floor(Math.random() * vowels.length)];
                if (replacement !== w[i].toLowerCase()) w[i] = replacement;
            }
        },
    ];
    strategies[Math.floor(Math.random() * strategies.length)]();
    const result = w.join('');
    return result === word ? word.slice(0, -1) + 'e' : result;
}

/** Simulate NPC turns for one round. Player is index 2 (always null).
 *  Each NPC gets their own word (like a real bee) for speech bubble display. */
export function simulateNpcTurns(
    npcAlive: boolean[],
    npcSkill: number[],
    npcScores: number[],
    round: number,
    eliminationMode: boolean,
    pickWord?: () => string,
): { npcResults: (boolean | null)[]; npcAlive: boolean[]; npcScores: number[]; npcSpellings: (string | null)[] } {
    const results: (boolean | null)[] = [null, null, null, null];
    const alive = [...npcAlive];
    const scores = [...npcScores];
    const spellings: (string | null)[] = [null, null, null, null];

    for (const idx of [0, 1, 3]) {
        if (!alive[idx]) continue;
        const adjusted = Math.max(0.15, npcSkill[idx] - round * NPC_DECAY[idx]);
        const correct = Math.random() < adjusted;
        results[idx] = correct;
        if (pickWord) {
            const npcWord = pickWord();
            spellings[idx] = correct ? npcWord : misspell(npcWord);
        }
        if (correct) scores[idx]++;
        if (!correct && eliminationMode) alive[idx] = false;
    }
    // Index 2 (player) stays null — determined by actual spelling
    return { npcResults: results, npcAlive: alive, npcScores: scores, npcSpellings: spellings };
}

export function useBeeSimulation(category?: string, hardMode = false, dictationMode = false, beeLevel: BeeLevel = 'classroom') {
    const [state, setState] = useState<BeeSimState>(INITIAL_STATE);
    const { speak, speakWordNumber, speakLetters, isSupported } = usePronunciation();
    const startTimeRef = useRef(0);

    // In dictation mode: no NPCs, no elimination, go straight to spelling
    const dictationInitial: Partial<BeeSimState> = dictationMode ? {
        eliminationMode: false,
        npcAlive: [false, false, false, false],
    } : {};

    const startRound = useCallback(() => {
        const word = pickBeeWord(state.round, category, hardMode, beeLevel);
        if (dictationMode) {
            // Dictation: skip classroom, go straight to spelling
            setState(prev => ({
                ...prev,
                ...dictationInitial,
                phase: 'spelling',
                currentWord: word,
                typedSpelling: '',
                infoRequested: new Set(),
                infoResponses: {},
                lastResult: null,
                npcResults: [null, null, null, null],
                npcSpellings: [null, null, null, null],
            }));
        } else {
            setState(prev => {
                const npc = simulateNpcTurns(prev.npcAlive, prev.npcSkill, prev.npcScores, prev.round, prev.eliminationMode, () => pickBeeWord(prev.round, category, hardMode, beeLevel).word);
                const anyNpcLeft = npc.npcAlive.some((alive, i) => alive && i !== 2);
                return {
                    ...prev,
                    phase: anyNpcLeft ? 'listening' : 'won',
                    currentWord: word,
                    typedSpelling: '',
                    infoRequested: new Set(),
                    infoResponses: {},
                    lastResult: null,
                    npcResults: npc.npcResults,
                    npcAlive: npc.npcAlive,
                    npcScores: npc.npcScores,
                    npcSpellings: npc.npcSpellings,
                };
            });
        }
        if (isSupported) speakWordNumber(word.word, state.round + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.round, category, hardMode, beeLevel, dictationMode, speakWordNumber, isSupported]);

    const startSession = useCallback(() => {
        const word = pickBeeWord(0, category, hardMode, beeLevel);
        if (dictationMode) {
            setState({
                ...INITIAL_STATE,
                ...dictationInitial,
                currentWord: word,
                phase: 'spelling',
            });
        } else {
            const npc = simulateNpcTurns(INITIAL_STATE.npcAlive, INITIAL_STATE.npcSkill, INITIAL_STATE.npcScores, 0, true, () => pickBeeWord(0, category, hardMode, beeLevel).word);
            setState({
                ...INITIAL_STATE,
                currentWord: word,
                phase: 'listening',
                npcResults: npc.npcResults,
                npcAlive: npc.npcAlive,
                npcScores: npc.npcScores,
                npcSpellings: npc.npcSpellings,
            });
        }
        if (isSupported) speakWordNumber(word.word, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category, hardMode, beeLevel, dictationMode, speakWordNumber, isSupported]);

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

            let spokenText: string | null = null;

            switch (type) {
                case 'definition': {
                    const def = redactWord(word.definition, word.word);
                    newResponses.definition = def;
                    // Speak the FULL definition (hearing the word doesn't reveal the spelling)
                    spokenText = `The definition is: ${word.definition}`;
                    break;
                }
                case 'sentence': {
                    const sent = redactWord(word.exampleSentence, word.word);
                    newResponses.sentence = sent;
                    // Speak the FULL sentence (hearing the word doesn't reveal the spelling)
                    spokenText = word.exampleSentence;
                    break;
                }
                case 'origin':
                    if (word.etymology) {
                        const parsed = parseEtymology(word.etymology);
                        const rootPart = parsed.roots.length > 0 ? ` — ${parsed.roots.join(', ')}` : '';
                        const text = `Language: ${parsed.language}${rootPart}`;
                        newResponses.origin = text;
                        spokenText = `The language of origin is ${parsed.language}`;
                    } else {
                        newResponses.origin = 'Origin information not available.';
                        spokenText = 'Origin information is not available.';
                    }
                    break;
                case 'partOfSpeech': {
                    const pos = word.partOfSpeech ?? 'Part of speech not available.';
                    newResponses.partOfSpeech = pos;
                    spokenText = `It is ${pos === 'noun' || pos === 'adjective' || pos === 'adverb' || pos === 'interjection'
                        ? `a ${pos}` : `a ${pos}`}`;
                    break;
                }
                case 'repeat':
                    if (isSupported) speak(word.word);
                    break;
            }

            // Speak the info response aloud (like a real bee pronouncer)
            if (spokenText && type !== 'repeat' && isSupported) {
                // Use setTimeout to avoid speaking inside setState
                setTimeout(() => speak(spokenText!), 50);
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
            const npcScores = [...prev.npcScores];
            if (correct) npcScores[2]++;

            // Sound effects + pronouncer confirmation (after setState completes)
            const word = prev.currentWord.word;
            setTimeout(() => {
                if (correct) {
                    playDing();
                    playApplause();
                    if (isSupported) speak(`That is correct!`);
                } else {
                    playBuzzer();
                    playGasp();
                    if (isSupported) {
                        const letters = word.split('').join(', ');
                        speak(`I'm sorry, that is incorrect. The correct spelling is ${letters}`);
                    }
                }
            }, 100);

            // Check if any NPC is still alive (player is index 2)
            const anyNpcAlive = prev.npcAlive.some((alive, i) => alive && i !== 2);

            // Only eliminate if other NPCs are still in the game
            if (!correct && prev.eliminationMode && anyNpcAlive) {
                return {
                    ...prev,
                    phase: 'eliminated',
                    lastResult: false,
                    wordsCorrect,
                    wordsAttempted,
                    npcScores,
                };
            }

            return {
                ...prev,
                phase: 'feedback',
                lastResult: correct,
                wordsCorrect,
                wordsAttempted,
                npcScores,
            };
        });
    }, [speak, isSupported]);

    const nextWord = useCallback(() => {
        // Pick word outside setState so we can speak it *after* — speaking inside
        // setState causes the browser to play the previous word on some platforms.
        const newRound = state.round + 1;
        const word = pickBeeWord(newRound, category, hardMode, beeLevel);

        if (dictationMode) {
            setState(prev => ({
                ...prev,
                eliminationMode: false,
                npcAlive: [false, false, false, false],
                phase: 'spelling',
                currentWord: word,
                round: newRound,
                typedSpelling: '',
                infoRequested: new Set(),
                infoResponses: {},
                lastResult: null,
                npcResults: [null, null, null, null],
                npcSpellings: [null, null, null, null],
            }));
            if (isSupported) speakWordNumber(word.word, newRound + 1);
        } else {
            let won = false;
            setState(prev => {
                const npc = simulateNpcTurns(prev.npcAlive, prev.npcSkill, prev.npcScores, newRound, prev.eliminationMode, () => pickBeeWord(newRound, category, hardMode, beeLevel).word);
                const anyNpcLeft = npc.npcAlive.some((alive, i) => alive && i !== 2);
                won = !anyNpcLeft;
                return {
                    ...prev,
                    phase: anyNpcLeft ? 'listening' : 'won',
                    currentWord: word,
                    round: newRound,
                    typedSpelling: '',
                    infoRequested: new Set(),
                    infoResponses: {},
                    lastResult: null,
                    npcResults: npc.npcResults,
                    npcAlive: npc.npcAlive,
                    npcScores: npc.npcScores,
                    npcSpellings: npc.npcSpellings,
                };
            });
            if (!won && isSupported) speakWordNumber(word.word, newRound + 1);
        }
    }, [state.round, category, hardMode, beeLevel, dictationMode, speakWordNumber, isSupported]);

    /** Force-submit an empty answer (used by timer expiry). Transitions asking→spelling→submit. */
    const forceSubmit = useCallback(() => {
        setState(prev => {
            if (!prev.currentWord) return prev;
            const wordsAttempted = prev.wordsAttempted + 1;
            const anyNpcAlive = prev.npcAlive.some((alive, i) => alive && i !== 2);
            if (prev.eliminationMode && anyNpcAlive) {
                return { ...prev, phase: 'eliminated', lastResult: false, wordsAttempted, typedSpelling: '' };
            }
            return { ...prev, phase: 'feedback', lastResult: false, wordsAttempted, typedSpelling: '' };
        });
    }, []);

    /** XP earned for the current session */
    const sessionXP = state.wordsCorrect * 20;

    /** Read back the player's typed spelling letter-by-letter (like speaking into the mic) */
    const readBackSpelling = useCallback(() => {
        if (state.typedSpelling && isSupported) {
            speakLetters(state.typedSpelling.trim());
        }
    }, [state.typedSpelling, speakLetters, isSupported]);

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
        forceSubmit,
        nextWord,
        readBackSpelling,
        sessionXP,
        ttsSupported: isSupported,
        npcResults: state.npcResults,
        npcAlive: state.npcAlive,
        npcScores: state.npcScores,
        npcSpellings: state.npcSpellings,
    };
}
