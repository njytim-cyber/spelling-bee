/**
 * components/BeeSimPage.tsx
 *
 * Bee Simulation mode — simulates a real spelling bee.
 * Phases: listening → asking → spelling → feedback → [next | eliminated | complete]
 */
import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBeeSimulation } from '../hooks/useBeeSimulation';
import type { BeeLevel } from '../hooks/useBeeSimulation';
import { SpellingInput } from './SpellingInput';
import { SpellingDiffView } from './SpellingDiffView';
import { BeeClassroom } from './BeeClassroom';

const BEE_LEVELS: { id: BeeLevel; label: string; desc: string }[] = [
    { id: 'classroom', label: 'Classroom', desc: 'Grades K-3' },
    { id: 'district', label: 'District', desc: 'Grades 2-5' },
    { id: 'state', label: 'State', desc: 'Grades 4-8' },
    { id: 'national', label: 'National', desc: 'Competition' },
];

const BEE_TIMER_MS = 30_000;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * 18; // radius 18

interface Props {
    onExit: () => void;
    onAnswer?: (word: string, correct: boolean, responseTimeMs: number, typed?: string) => void;
    onBeeResult?: (round: number, wordsCorrect: number, won: boolean, beeLevel: string, xp: number) => void;
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
                <span className="text-sm ui font-bold text-[var(--color-correct)]">Correct!</span>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-1 py-2 w-full"
        >
            <SpellingDiffView typed={typed} correct={word} />
            <button
                onClick={onNext}
                className="mt-1 text-xs ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50"
            >
                tap to continue
            </button>
        </motion.div>
    );
}

export const BeeSimPage = memo(function BeeSimPage({ onExit, onAnswer, onBeeResult }: Props) {
    const [dictationMode, setDictationMode] = useState(false);
    const [beeLevel, setBeeLevel] = useState<BeeLevel>('national');
    const {
        state,
        startSession,
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
        ttsSupported,
        npcResults,
        npcAlive,
        npcScores,
        npcSpellings,
    } = useBeeSimulation(undefined, false, dictationMode, beeLevel);

    const { phase, currentWord, round, wordsCorrect, wordsAttempted, typedSpelling, lastResult, infoResponses } = state;

    // Screen shake on wrong answer
    const [shakeClass, setShakeClass] = useState('');
    const prevPhaseRef = useRef(phase);
    useEffect(() => {
        if (phase === 'feedback' && prevPhaseRef.current === 'spelling' && lastResult === false) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- animation trigger on phase transition
            setShakeClass('wrong-shake');
            const t = setTimeout(() => setShakeClass(''), 300);
            prevPhaseRef.current = phase;
            return () => clearTimeout(t);
        }
        prevPhaseRef.current = phase;
    }, [phase, lastResult]);

    // Report bee result when session ends
    const beeResultFired = useRef(false);
    useEffect(() => {
        if ((phase === 'eliminated' || phase === 'won') && !beeResultFired.current) {
            beeResultFired.current = true;
            onBeeResult?.(round, wordsCorrect, phase === 'won', beeLevel, sessionXP);
        }
        if (phase === 'listening') beeResultFired.current = false;
    }, [phase, round, wordsCorrect, beeLevel, sessionXP, onBeeResult]);

    // Auto-start session on mount and when dictation mode toggles
    const prevDictation = useRef(dictationMode);
    useEffect(() => {
        if (!currentWord || prevDictation.current !== dictationMode) {
            prevDictation.current = dictationMode;
            startSession();
        }
    }, [dictationMode]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── 30s Timer ──
    const [beeTimedMode, setBeeTimedMode] = useState(false);
    const [timerProgress, setTimerProgress] = useState(0); // 0..1
    const timerStartRef = useRef(0);
    const rafRef = useRef(0);

    const toggleBeeTimer = useCallback(() => setBeeTimedMode(t => !t), []);

    // Start/stop timer based on phase
    const isTimerPhase = phase === 'asking' || phase === 'spelling';
    useEffect(() => {
        if (!beeTimedMode || !isTimerPhase) {
            cancelAnimationFrame(rafRef.current);
            queueMicrotask(() => setTimerProgress(0));
            return;
        }
        timerStartRef.current = performance.now();
        const tick = () => {
            const elapsed = performance.now() - timerStartRef.current;
            const progress = Math.min(1, elapsed / BEE_TIMER_MS);
            setTimerProgress(progress);
            if (progress >= 1) {
                forceSubmit();
            } else {
                rafRef.current = requestAnimationFrame(tick);
            }
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [beeTimedMode, isTimerPhase, forceSubmit]);

    // Still loading first word
    if (!currentWord) return null;

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative">
            {/* Top bar — round counter + controls in a single row */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                <div className="text-sm ui text-[rgb(var(--color-fg))]/50 font-medium truncate mr-2">
                    Round {round + 1} · {wordsCorrect}/{wordsAttempted} correct
                </div>
                {phase !== 'eliminated' && phase !== 'won' && (
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Bee level selector */}
                        <select
                            value={beeLevel}
                            onChange={e => setBeeLevel(e.target.value as BeeLevel)}
                            className="text-xs ui px-2 py-1 rounded-lg bg-transparent border border-[var(--color-gold)]/40 text-[var(--color-gold)] cursor-pointer outline-none"
                        >
                            {BEE_LEVELS.map(l => (
                                <option key={l.id} value={l.id} className="bg-[var(--color-bg,#1a1a2e)] text-[var(--color-chalk)]">
                                    {l.label}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => { setDictationMode(d => !d); }}
                            className={`text-xs ui px-2 py-1 rounded-lg transition-colors ${
                                dictationMode
                                    ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/40'
                                    : 'text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50'
                            }`}
                            title="Dictation mode — hear & spell, no classroom"
                        >
                            Dictation
                        </button>
                        <button
                            onClick={toggleBeeTimer}
                            className={`text-xs ui px-2 py-1 rounded-lg transition-colors ${
                                beeTimedMode
                                    ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/40'
                                    : 'text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50'
                            }`}
                        >
                            30s
                        </button>
                        <button
                            onClick={onExit}
                            className="text-sm ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50"
                        >
                            Exit
                        </button>
                    </div>
                )}
            </div>

            {/* Timer ring — shown during asking/spelling when timed */}
            {beeTimedMode && isTimerPhase && (
                <div className="absolute top-12 right-4">
                    <svg width="40" height="40" viewBox="0 0 40 40" className="transform -rotate-90">
                        <circle cx="20" cy="20" r="18" fill="none" stroke="rgb(var(--color-fg))" strokeWidth="2" opacity="0.2" />
                        <circle
                            cx="20" cy="20" r="18"
                            fill="none"
                            stroke={timerProgress > 0.75 ? 'var(--color-wrong)' : 'var(--color-gold)'}
                            strokeWidth="2.5"
                            strokeDasharray={TIMER_CIRCUMFERENCE}
                            strokeDashoffset={TIMER_CIRCUMFERENCE * timerProgress}
                            strokeLinecap="round"
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] ui text-[rgb(var(--color-fg))]/40">
                        {Math.ceil(BEE_TIMER_MS / 1000 * (1 - timerProgress))}
                    </span>
                </div>
            )}

            <AnimatePresence mode="wait">
                {/* DICTATION MODE — minimal UI: hear word, spell it */}
                {dictationMode && (phase === 'spelling' || phase === 'feedback') && (
                    <motion.div
                        key="dictation"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`flex flex-col items-center gap-4 w-full max-w-[320px] ${shakeClass}`}
                    >
                        {/* Pronounce button */}
                        <button
                            onClick={pronounce}
                            className="w-16 h-16 rounded-full bg-[var(--color-gold)]/10 border-2 border-[var(--color-gold)]/40 flex items-center justify-center hover:bg-[var(--color-gold)]/20 transition-colors"
                            title="Hear word again"
                        >
                            <span className="text-2xl">&#128266;</span>
                        </button>
                        <p className="text-xs ui text-[rgb(var(--color-fg))]/40">
                            {ttsSupported ? 'Tap to hear again' : 'Audio not available'}
                        </p>

                        <AnimatePresence>
                            {phase === 'spelling' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 12 }}
                                    className="w-full"
                                >
                                    <SpellingInput
                                        value={typedSpelling}
                                        onChange={updateTyping}
                                        onSubmit={() => {
                                            submitSpelling();
                                            if (onAnswer && currentWord) {
                                                const correct = typedSpelling.trim().toLowerCase() === currentWord.word.toLowerCase();
                                                onAnswer(currentWord.word, correct, Date.now(), correct ? undefined : typedSpelling.trim());
                                            }
                                        }}
                                    />
                                    {ttsSupported && typedSpelling.trim().length > 0 && (
                                        <button
                                            onClick={readBackSpelling}
                                            className="mt-2 w-full text-center text-xs ui text-[rgb(var(--color-fg))]/30 hover:text-[var(--color-gold)] transition-colors"
                                        >
                                            Hear My Spelling
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

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
                    </motion.div>
                )}

                {/* CLASSROOM — stays visible for listening, spelling, and feedback phases */}
                {!dictationMode && (phase === 'listening' || phase === 'asking' || phase === 'spelling' || phase === 'feedback') && (
                    <motion.div
                        key="classroom"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`flex flex-col items-center gap-3 w-full max-w-[320px] ${shakeClass}`}
                    >
                        <BeeClassroom
                            pupilResults={npcResults}
                            npcAlive={npcAlive}
                            npcScores={npcScores}
                            npcSpellings={npcSpellings}
                            phase={phase}
                            onPronounce={pronounce}
                            onPlayerTurn={moveToAsking}
                            round={round}
                            isTyping={phase === 'spelling' && typedSpelling.length > 0}
                            lastResult={phase === 'feedback' ? lastResult : null}
                        />

                        {/* Asking phase — player requests info one at a time */}
                        <AnimatePresence>
                            {phase === 'asking' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="w-full flex flex-col items-center gap-2"
                                >
                                    {/* Info request buttons */}
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {([
                                            ['definition', 'Definition'],
                                            ['sentence', 'Example Sentence'],
                                            ['partOfSpeech', 'Part of Speech'],
                                            ['origin', 'Language of Origin'],
                                            ['repeat', 'Repeat Word'],
                                        ] as const).map(([type, label]) => {
                                            const alreadyAsked = state.infoRequested.has(type) && type !== 'repeat';
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => requestInfo(type)}
                                                    disabled={alreadyAsked}
                                                    className={`px-3 py-1.5 rounded-lg text-xs ui transition-colors ${
                                                        alreadyAsked
                                                            ? 'bg-[rgb(var(--color-fg))]/5 text-[rgb(var(--color-fg))]/25 cursor-default'
                                                            : 'border border-[var(--color-gold)]/40 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10'
                                                    }`}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Revealed info cards */}
                                    <div className="w-full space-y-1.5">
                                        <AnimatePresence>
                                            {Object.entries(infoResponses).map(([key, value], idx) => (
                                                <motion.div
                                                    key={key}
                                                    initial={{ opacity: 0, y: 10, height: 0 }}
                                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                    exit={{ opacity: 0 }}
                                                    className={`bg-[rgb(var(--color-fg))]/5 px-4 py-2.5 text-sm ui text-[rgb(var(--color-fg))]/60 overflow-hidden ${idx % 2 === 0 ? 'hand-drawn-box' : 'hand-drawn-box-alt'}`}
                                                >
                                                    <span className="text-xs text-[var(--color-gold)] uppercase font-bold">
                                                        {key === 'partOfSpeech' ? 'Part of Speech' : key}:{' '}
                                                    </span>
                                                    {value}
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>

                                    {/* Ready to spell button */}
                                    <button
                                        onClick={moveToSpelling}
                                        className="mt-1 px-6 py-2 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
                                    >
                                        Ready to Spell
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

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
                                    {/* Show any previously requested info during spelling */}
                                    {Object.keys(infoResponses).length > 0 && (
                                        <div className="w-full space-y-1 mb-2">
                                            {Object.entries(infoResponses).map(([key, value], idx) => (
                                                <div
                                                    key={key}
                                                    className={`bg-[rgb(var(--color-fg))]/5 px-3 py-1.5 text-xs ui text-[rgb(var(--color-fg))]/50 ${idx % 2 === 0 ? 'hand-drawn-box' : 'hand-drawn-box-alt'}`}
                                                >
                                                    <span className="text-[10px] text-[var(--color-gold)] uppercase font-bold">
                                                        {key === 'partOfSpeech' ? 'POS' : key}:{' '}
                                                    </span>
                                                    {value}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <SpellingInput
                                        value={typedSpelling}
                                        onChange={updateTyping}
                                        onSubmit={() => {
                                            submitSpelling();
                                            if (onAnswer && currentWord) {
                                                const correct = typedSpelling.trim().toLowerCase() === currentWord.word.toLowerCase();
                                                onAnswer(currentWord.word, correct, Date.now(), correct ? undefined : typedSpelling.trim());
                                            }
                                        }}
                                    />
                                    {/* Hear My Spelling — reads back letter-by-letter like speaking into the mic */}
                                    {ttsSupported && typedSpelling.trim().length > 0 && (
                                        <button
                                            onClick={readBackSpelling}
                                            className="mt-2 w-full text-center text-xs ui text-[rgb(var(--color-fg))]/30 hover:text-[var(--color-gold)] transition-colors"
                                        >
                                            Hear My Spelling
                                        </button>
                                    )}
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
                            <p className="text-xs ui text-[rgb(var(--color-fg))]/40">
                                {ttsSupported ? 'Tap the Pronouncer to hear word again' : 'Audio not available — tap the Pronouncer'}
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
                        <h2 className="text-2xl ui font-bold text-[var(--color-wrong)]">Eliminated!</h2>
                        <div className="text-xl ui font-bold text-[var(--color-chalk)]">
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

                {/* VICTORY PHASE — last one standing! */}
                {phase === 'won' && (
                    <motion.div
                        key="won"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="flex flex-col items-center gap-4"
                    >
                        <motion.div
                            className="text-6xl"
                            animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                        >
                            🏆
                        </motion.div>
                        <motion.h2
                            className="text-3xl chalk text-[var(--color-gold)]"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            Champion!
                        </motion.h2>
                        <motion.p
                            className="text-base ui text-[rgb(var(--color-fg))]/60 text-center max-w-[280px]"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            You&rsquo;re the last one standing!
                        </motion.p>
                        <motion.div
                            className="bg-[rgb(var(--color-fg))]/5 rounded-xl px-6 py-4 text-center mt-2"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <div className="text-3xl chalk text-[var(--color-gold)]">{wordsCorrect}</div>
                            <div className="text-sm ui text-[rgb(var(--color-fg))]/40">words spelled correctly</div>
                            <div className="text-sm ui text-[rgb(var(--color-fg))]/25 mt-1">Survived {round + 1} rounds</div>
                            <div className="text-sm ui text-[rgb(var(--color-fg))]/25 mt-1">+{sessionXP} XP earned</div>
                        </motion.div>
                        <motion.div
                            className="flex gap-3 mt-2"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            <button
                                onClick={startSession}
                                className="px-6 py-2.5 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
                            >
                                Play Again
                            </button>
                            <button
                                onClick={onExit}
                                className="px-6 py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/20 text-sm ui text-[rgb(var(--color-fg))]/50 hover:border-[rgb(var(--color-fg))]/40 transition-colors"
                            >
                                Exit
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
