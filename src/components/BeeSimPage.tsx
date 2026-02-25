/**
 * components/BeeSimPage.tsx
 *
 * Bee Simulation mode — simulates a real spelling bee.
 * Phases: listening → asking → spelling → feedback → [next | eliminated | complete]
 */
import { memo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBeeSimulation } from '../hooks/useBeeSimulation';
import { SpellingInput } from './SpellingInput';
import { BeeClassroom } from './BeeClassroom';

interface Props {
    onExit: () => void;
    onAnswer?: (word: string, correct: boolean, responseTimeMs: number) => void;
    /** Category to filter words (e.g. 'theme-nature', 'prefixes'). Falls back to all words. */
    category?: string;
    /** When true, bias toward harder/longer words in the pool. */
    hardMode?: boolean;
}

/** Compact inline feedback — correct answers advance fast, wrong answers linger */
function InlineFeedback({ correct, word, typed, onNext }: { correct: boolean; word: string; typed: string; onNext: () => void }) {
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => {
        timer.current = setTimeout(onNext, correct ? 600 : 2800);
        return () => clearTimeout(timer.current);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (correct) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center gap-2 py-1"
                onClick={onNext}
            >
                <span className="text-lg text-[var(--color-correct)]">&#10003;</span>
                <span className="text-sm chalk text-[var(--color-correct)]">Correct!</span>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-1 py-2"
        >
            <div className="flex items-center gap-2">
                <span className="text-2xl">&#10007;</span>
                <span className="text-xl chalk text-[var(--color-chalk)]">{word}</span>
            </div>
            <p className="text-sm ui text-[var(--color-wrong)]">
                You spelled: &ldquo;{typed}&rdquo;
            </p>
            <button
                onClick={onNext}
                className="mt-1 text-xs ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50"
            >
                tap to continue
            </button>
        </motion.div>
    );
}

export const BeeSimPage = memo(function BeeSimPage({ onExit, onAnswer, category, hardMode }: Props) {
    const {
        state,
        startSession,
        pronounce,
        moveToSpelling,
        updateTyping,
        submitSpelling,
        nextWord,
        sessionXP,
        ttsSupported,
        npcResults,
        npcAlive,
        npcScores,
        npcSpellings,
    } = useBeeSimulation(category, hardMode);

    const { phase, currentWord, round, wordsCorrect, wordsAttempted, typedSpelling, lastResult, infoResponses } = state;

    // Auto-start session on mount
    useEffect(() => {
        if (!currentWord) startSession();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Still loading first word
    if (!currentWord) return null;

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative">
            {/* Round counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-base ui text-[rgb(var(--color-fg))]/50 font-medium">
                Round {round + 1} · {wordsCorrect}/{wordsAttempted} correct
            </div>
            <button
                onClick={onExit}
                className="absolute top-4 right-4 text-sm ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50"
            >
                Exit
            </button>

            <AnimatePresence mode="wait">
                {/* CLASSROOM — stays visible for listening, spelling, and feedback phases */}
                {(phase === 'listening' || phase === 'asking' || phase === 'spelling' || phase === 'feedback') && (
                    <motion.div
                        key="classroom"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center gap-3 w-full max-w-[320px]"
                    >
                        <BeeClassroom
                            pupilResults={npcResults}
                            npcAlive={npcAlive}
                            npcScores={npcScores}
                            npcSpellings={npcSpellings}
                            phase={phase}
                            onPronounce={pronounce}
                            onPlayerTurn={moveToSpelling}
                            round={round}
                        />

                        {/* Info responses (definition, sentence, origin) */}
                        {Object.keys(infoResponses).length > 0 && phase !== 'feedback' && (
                            <div className="w-full space-y-1.5">
                                {Object.entries(infoResponses).map(([key, value]) => (
                                    <motion.div
                                        key={key}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-[rgb(var(--color-fg))]/5 rounded-xl px-4 py-2.5 text-sm ui text-[rgb(var(--color-fg))]/50"
                                    >
                                        <span className="text-xs text-[rgb(var(--color-fg))]/25 uppercase">{key}: </span>
                                        {value}
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Inline spelling input */}
                        <AnimatePresence>
                            {phase === 'spelling' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: 12, height: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                    className="w-full overflow-hidden"
                                >
                                    <SpellingInput
                                        value={typedSpelling}
                                        onChange={updateTyping}
                                        onSubmit={() => {
                                            submitSpelling();
                                            if (onAnswer && currentWord) {
                                                const correct = typedSpelling.trim().toLowerCase() === currentWord.word.toLowerCase();
                                                onAnswer(currentWord.word, correct, Date.now());
                                            }
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Inline feedback — replaces input after submit, auto-advances */}
                        <AnimatePresence>
                            {phase === 'feedback' && currentWord && (
                                <InlineFeedback
                                    correct={!!lastResult}
                                    word={currentWord.word}
                                    typed={typedSpelling}
                                    onNext={nextWord}
                                />
                            )}
                        </AnimatePresence>

                        {phase === 'listening' && (
                            <p className="text-xs ui text-[rgb(var(--color-fg))]/20">
                                {ttsSupported ? 'Tap teacher to hear word again' : currentWord.word}
                            </p>
                        )}
                    </motion.div>
                )}

                {/* ELIMINATED PHASE */}
                {phase === 'eliminated' && currentWord && (
                    <motion.div
                        key="eliminated"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <div className="text-6xl">🐝</div>
                        <h2 className="text-2xl chalk text-[var(--color-wrong)]">Eliminated!</h2>
                        <div className="text-xl chalk text-[var(--color-chalk)]">
                            The word was: {currentWord.word}
                        </div>
                        <div className="text-base ui text-[rgb(var(--color-fg))]/40 italic text-center max-w-[280px]">
                            {currentWord.definition}
                        </div>
                        <div className="bg-[rgb(var(--color-fg))]/5 rounded-xl px-6 py-4 text-center mt-2">
                            <div className="text-3xl chalk text-[var(--color-gold)]">{wordsCorrect}</div>
                            <div className="text-sm ui text-[rgb(var(--color-fg))]/40">words spelled correctly</div>
                            <div className="text-sm ui text-[rgb(var(--color-fg))]/25 mt-1">+{sessionXP} XP earned</div>
                        </div>
                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={startSession}
                                className="px-6 py-2.5 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={onExit}
                                className="px-6 py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/20 text-sm ui text-[rgb(var(--color-fg))]/50 hover:border-[rgb(var(--color-fg))]/40 transition-colors"
                            >
                                Exit
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
