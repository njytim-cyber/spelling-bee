/**
 * components/BeeSimPage.tsx
 *
 * Bee Simulation mode — simulates a real spelling bee.
 * Phases: listening → asking → spelling → feedback → [next | eliminated | complete]
 */
import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBeeSimulation, type InfoRequest } from '../hooks/useBeeSimulation';
import { SpellingInput } from './SpellingInput';

interface Props {
    band?: string;
    onExit: () => void;
    onAnswer?: (word: string, correct: boolean, responseTimeMs: number) => void;
}

const INFO_BUTTONS: { type: InfoRequest; label: string; icon: string }[] = [
    { type: 'definition', label: 'Definition', icon: '📖' },
    { type: 'sentence', label: 'Sentence', icon: '💬' },
    { type: 'origin', label: 'Origin', icon: '🌍' },
    { type: 'repeat', label: 'Repeat', icon: '🔊' },
];

export const BeeSimPage = memo(function BeeSimPage({ band, onExit, onAnswer }: Props) {
    const {
        state,
        startSession,
        pronounce,
        moveToAsking,
        requestInfo,
        moveToSpelling,
        updateTyping,
        submitSpelling,
        nextWord,
        sessionXP,
        ttsSupported,
    } = useBeeSimulation(band);

    const { phase, currentWord, round, wordsCorrect, wordsAttempted, typedSpelling, infoRequested, lastResult, infoResponses } = state;

    // If no word yet, show start screen
    if (!currentWord) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
                <div className="text-6xl">🐝</div>
                <h2 className="text-2xl chalk text-[var(--color-chalk)]">Spelling Bee</h2>
                <p className="text-sm ui text-[rgb(var(--color-fg))]/40 text-center max-w-[260px]">
                    Listen to the word, ask questions, then spell it. One wrong answer and you&apos;re eliminated!
                </p>
                {!ttsSupported && (
                    <p className="text-xs ui text-[var(--color-wrong)] text-center">
                        Text-to-speech not available in this browser. Words will be shown instead.
                    </p>
                )}
                <button
                    onClick={startSession}
                    className="px-8 py-3 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-lg ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
                >
                    Start Bee
                </button>
                <button
                    onClick={onExit}
                    className="text-xs ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50 transition-colors"
                >
                    Back to game
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative">
            {/* Round counter */}
            <div className="absolute top-4 left-4 text-xs ui text-[rgb(var(--color-fg))]/30">
                Round {round + 1} · {wordsCorrect}/{wordsAttempted} correct
            </div>
            <button
                onClick={onExit}
                className="absolute top-4 right-4 text-xs ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50"
            >
                Exit
            </button>

            <AnimatePresence mode="wait">
                {/* LISTENING PHASE */}
                {phase === 'listening' && (
                    <motion.div
                        key="listening"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center gap-6"
                    >
                        <button
                            onClick={pronounce}
                            className="w-24 h-24 rounded-full border-2 border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 flex items-center justify-center text-4xl hover:bg-[var(--color-gold)]/15 transition-colors"
                        >
                            🔊
                        </button>
                        <p className="text-sm ui text-[rgb(var(--color-fg))]/40">
                            {ttsSupported ? 'Tap to hear again' : currentWord.word}
                        </p>
                        <button
                            onClick={moveToAsking}
                            className="px-6 py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/20 text-sm ui text-[rgb(var(--color-fg))]/60 hover:border-[rgb(var(--color-fg))]/40 transition-colors"
                        >
                            Ask a question
                        </button>
                        <button
                            onClick={moveToSpelling}
                            className="px-8 py-3 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-base ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
                        >
                            Ready to spell
                        </button>
                    </motion.div>
                )}

                {/* ASKING PHASE */}
                {phase === 'asking' && (
                    <motion.div
                        key="asking"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center gap-4 w-full max-w-[320px]"
                    >
                        <p className="text-sm ui text-[rgb(var(--color-fg))]/50 mb-2">Ask about the word:</p>
                        <div className="grid grid-cols-2 gap-2 w-full">
                            {INFO_BUTTONS.map(btn => {
                                const used = infoRequested.has(btn.type) && btn.type !== 'repeat';
                                return (
                                    <button
                                        key={btn.type}
                                        onClick={() => requestInfo(btn.type)}
                                        disabled={used}
                                        className={`py-2.5 px-3 rounded-xl border text-sm ui transition-colors ${
                                            used
                                                ? 'border-[rgb(var(--color-fg))]/5 text-[rgb(var(--color-fg))]/20 cursor-not-allowed'
                                                : 'border-[rgb(var(--color-fg))]/20 text-[rgb(var(--color-fg))]/60 hover:border-[rgb(var(--color-fg))]/40'
                                        }`}
                                    >
                                        {btn.icon} {btn.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Info responses */}
                        <div className="w-full space-y-2 mt-2">
                            {Object.entries(infoResponses).map(([key, value]) => (
                                <motion.div
                                    key={key}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-[rgb(var(--color-fg))]/5 rounded-xl px-4 py-3 text-sm ui text-[rgb(var(--color-fg))]/60"
                                >
                                    <span className="text-xs text-[rgb(var(--color-fg))]/30 uppercase">{key}: </span>
                                    {value}
                                </motion.div>
                            ))}
                        </div>

                        <button
                            onClick={moveToSpelling}
                            className="mt-2 px-8 py-3 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-base ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
                        >
                            Ready to spell
                        </button>
                    </motion.div>
                )}

                {/* SPELLING PHASE */}
                {phase === 'spelling' && (
                    <motion.div
                        key="spelling"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center gap-4 w-full"
                    >
                        <p className="text-sm ui text-[rgb(var(--color-fg))]/50">Spell the word:</p>
                        <button
                            onClick={pronounce}
                            className="text-2xl opacity-40 hover:opacity-80 transition-opacity"
                        >
                            🔊
                        </button>
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

                {/* FEEDBACK PHASE */}
                {phase === 'feedback' && currentWord && (
                    <motion.div
                        key="feedback"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <div className={`text-6xl ${lastResult ? '' : ''}`}>
                            {lastResult ? '✅' : '❌'}
                        </div>
                        <div className="text-2xl chalk text-[var(--color-chalk)]">
                            {currentWord.word}
                        </div>
                        <div className="text-sm ui text-[rgb(var(--color-fg))]/40 italic text-center max-w-[280px]">
                            {currentWord.definition}
                        </div>
                        {!lastResult && (
                            <div className="text-xs ui text-[var(--color-wrong)]">
                                You spelled: &ldquo;{typedSpelling}&rdquo;
                            </div>
                        )}
                        <button
                            onClick={nextWord}
                            className="mt-2 px-8 py-3 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-base ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
                        >
                            Next Word
                        </button>
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
                        <h2 className="text-xl chalk text-[var(--color-wrong)]">Eliminated!</h2>
                        <div className="text-lg chalk text-[var(--color-chalk)]">
                            The word was: {currentWord.word}
                        </div>
                        <div className="text-sm ui text-[rgb(var(--color-fg))]/40 italic text-center max-w-[280px]">
                            {currentWord.definition}
                        </div>
                        <div className="bg-[rgb(var(--color-fg))]/5 rounded-xl px-6 py-4 text-center mt-2">
                            <div className="text-2xl chalk text-[var(--color-gold)]">{wordsCorrect}</div>
                            <div className="text-xs ui text-[rgb(var(--color-fg))]/40">words spelled correctly</div>
                            <div className="text-xs ui text-[rgb(var(--color-fg))]/25 mt-1">+{sessionXP} XP earned</div>
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
