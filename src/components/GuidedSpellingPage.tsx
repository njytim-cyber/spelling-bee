/**
 * components/GuidedSpellingPage.tsx
 *
 * Guided spelling practice — the bridge between MCQ and full Bee Simulation.
 * Flow: hear word → type it → correct? celebrate : show spelling → retype.
 * Fully integrated with Leitner SRS via onAnswer callback.
 */
import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpellingInput } from './SpellingInput';
import { usePronunciation } from '../hooks/usePronunciation';
import { playDing, playBuzzer } from '../utils/beeSounds';
import { selectWordPool } from '../domains/spelling/spellingGenerator';
import { difficultyRange } from '../domains/spelling/words';
import type { SpellingWord } from '../domains/spelling/words/types';

type Phase = 'typing' | 'correct' | 'showing' | 'retyping' | 'retype-correct';

interface Props {
    onExit: () => void;
    onAnswer?: (word: string, correct: boolean, responseTimeMs: number) => void;
    category?: string;
    hardMode?: boolean;
}

function pickWord(round: number, category?: string, hardMode = false): SpellingWord {
    const diffLevel = Math.min(5, 1 + Math.floor(round / 4));
    const effective = hardMode ? Math.min(5, diffLevel + 1) : diffLevel;
    const [minDiff, maxDiff] = difficultyRange(effective);
    const pool = selectWordPool(category, minDiff, maxDiff, hardMode);
    return pool[Math.floor(Math.random() * pool.length)];
}

const SHOW_DURATION_MS = 3500;

export const GuidedSpellingPage = memo(function GuidedSpellingPage({ onExit, onAnswer, category, hardMode }: Props) {
    const [round, setRound] = useState(0);
    const [word, setWord] = useState<SpellingWord>(() => pickWord(0, category, hardMode));
    const [typed, setTyped] = useState('');
    const [phase, setPhase] = useState<Phase>('typing');
    const [wordsCorrect, setWordsCorrect] = useState(0);
    const [wordsAttempted, setWordsAttempted] = useState(0);
    const startTimeRef = useRef(0);
    const showTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const { speak, speakLetters, speakWord, isSupported, cancel } = usePronunciation();

    // Announce word on mount and when word changes
    useEffect(() => {
        if (isSupported) speakWord(word.word);
        startTimeRef.current = Date.now();
    }, [word]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup timer on unmount
    useEffect(() => () => clearTimeout(showTimerRef.current), []);

    const handleRepeat = useCallback(() => {
        if (isSupported) speak(word.word);
    }, [word, speak, isSupported]);

    const handleSubmit = useCallback(() => {
        const correct = typed.trim().toLowerCase() === word.word.toLowerCase();
        const ms = Date.now() - startTimeRef.current;

        if (correct) {
            playDing();
            // Record as correct
            onAnswer?.(word.word, true, ms);
            setWordsCorrect(c => c + 1);
            setWordsAttempted(a => a + 1);
            setPhase('correct');
            // Read back letter-by-letter like a real speller
            if (isSupported) {
                setTimeout(() => speakLetters(word.word), 200);
            }
        } else {
            playBuzzer();
            // Record as incorrect for SRS
            onAnswer?.(word.word, false, ms);
            setWordsAttempted(a => a + 1);
            setPhase('showing');
            if (isSupported) {
                speak(`The correct spelling is ${word.word}`);
            }
            // Show correct spelling, then hide and ask to retype
            showTimerRef.current = setTimeout(() => {
                setTyped('');
                setPhase('retyping');
                if (isSupported) speak(`Now spell ${word.word}`);
            }, SHOW_DURATION_MS);
        }
    }, [typed, word, onAnswer, isSupported, speak, speakLetters]);

    const handleRetypeSubmit = useCallback(() => {
        const correct = typed.trim().toLowerCase() === word.word.toLowerCase();
        if (correct) {
            playDing();
            setPhase('retype-correct');
            if (isSupported) speakLetters(word.word);
        } else {
            // Still wrong — show again
            playBuzzer();
            setPhase('showing');
            showTimerRef.current = setTimeout(() => {
                setTyped('');
                setPhase('retyping');
                if (isSupported) speak(`Try again. Spell ${word.word}`);
            }, SHOW_DURATION_MS);
        }
    }, [typed, word, isSupported, speak, speakLetters]);

    const advanceWord = useCallback(() => {
        cancel();
        const nextRound = round + 1;
        setRound(nextRound);
        setWord(pickWord(nextRound, category, hardMode));
        setTyped('');
        setPhase('typing');
    }, [round, category, hardMode, cancel]);

    // Auto-advance after correct celebration
    useEffect(() => {
        if (phase === 'correct' || phase === 'retype-correct') {
            const t = setTimeout(advanceWord, phase === 'correct' ? 2000 : 1800);
            return () => clearTimeout(t);
        }
    }, [phase, advanceWord]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative">
            {/* Top bar */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                <div className="text-sm ui text-[rgb(var(--color-fg))]/50 font-medium">
                    Word {wordsAttempted + (phase === 'typing' || phase === 'showing' || phase === 'retyping' ? 1 : 0)} · {wordsCorrect}/{wordsAttempted} correct
                </div>
                <button
                    onClick={onExit}
                    className="text-sm ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50"
                >
                    Exit
                </button>
            </div>

            <div className="flex flex-col items-center gap-4 w-full max-w-[320px]">
                {/* Pronounce button */}
                <button
                    onClick={handleRepeat}
                    className="w-16 h-16 rounded-full bg-[var(--color-gold)]/10 border-2 border-[var(--color-gold)]/40 flex items-center justify-center hover:bg-[var(--color-gold)]/20 transition-colors"
                    title="Hear word again"
                >
                    <span className="text-2xl">&#128266;</span>
                </button>
                <p className="text-xs ui text-[rgb(var(--color-fg))]/40">
                    {isSupported ? 'Tap to hear again' : 'Audio not available'}
                </p>

                {/* Definition hint — always visible */}
                <div className="w-full bg-[rgb(var(--color-fg))]/5 px-4 py-2.5 rounded-xl text-sm ui text-[rgb(var(--color-fg))]/50">
                    <span className="text-[10px] text-[var(--color-gold)] uppercase font-bold">Definition: </span>
                    {word.definition}
                </div>

                <AnimatePresence mode="wait">
                    {/* TYPING phase — first attempt */}
                    {phase === 'typing' && (
                        <motion.div
                            key="typing"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="w-full"
                        >
                            <SpellingInput
                                value={typed}
                                onChange={setTyped}
                                onSubmit={handleSubmit}
                            />
                        </motion.div>
                    )}

                    {/* CORRECT celebration */}
                    {phase === 'correct' && (
                        <motion.div
                            key="correct"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-2 py-4"
                            onClick={advanceWord}
                        >
                            <span className="text-3xl text-[var(--color-correct)]">&#10003;</span>
                            <span className="text-xl chalk text-[var(--color-correct)]">Correct!</span>
                            <span className="text-lg ui font-bold text-[var(--color-chalk)] tracking-widest uppercase">
                                {word.word}
                            </span>
                        </motion.div>
                    )}

                    {/* SHOWING phase — display correct spelling */}
                    {phase === 'showing' && (
                        <motion.div
                            key="showing"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="flex flex-col items-center gap-3 py-4 w-full"
                        >
                            <span className="text-sm ui text-[var(--color-wrong)]">Not quite. Study the spelling:</span>
                            <motion.div
                                className="text-3xl chalk text-[var(--color-chalk)] tracking-[0.2em] uppercase text-center"
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                            >
                                {word.word}
                            </motion.div>
                            {/* Progress bar showing time remaining */}
                            <div className="w-full max-w-[200px] h-1 bg-[rgb(var(--color-fg))]/10 rounded-full overflow-hidden mt-2">
                                <motion.div
                                    className="h-full bg-[var(--color-gold)]/60 rounded-full"
                                    initial={{ width: '100%' }}
                                    animate={{ width: '0%' }}
                                    transition={{ duration: SHOW_DURATION_MS / 1000, ease: 'linear' }}
                                />
                            </div>
                            <span className="text-xs ui text-[rgb(var(--color-fg))]/30">Memorize it...</span>
                        </motion.div>
                    )}

                    {/* RETYPING phase — second chance */}
                    {phase === 'retyping' && (
                        <motion.div
                            key="retyping"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="w-full flex flex-col items-center gap-2"
                        >
                            <span className="text-sm ui text-[var(--color-gold)]">Now type it from memory:</span>
                            <SpellingInput
                                value={typed}
                                onChange={setTyped}
                                onSubmit={handleRetypeSubmit}
                            />
                        </motion.div>
                    )}

                    {/* RETYPE-CORRECT — got it on second try */}
                    {phase === 'retype-correct' && (
                        <motion.div
                            key="retype-correct"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-2 py-4"
                            onClick={advanceWord}
                        >
                            <span className="text-2xl text-[var(--color-gold)]">&#10003;</span>
                            <span className="text-lg chalk text-[var(--color-gold)]">Got it!</span>
                            <span className="text-lg ui font-bold text-[var(--color-chalk)] tracking-widest uppercase">
                                {word.word}
                            </span>
                            <span className="text-xs ui text-[rgb(var(--color-fg))]/30">You'll see this one again soon</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
});
