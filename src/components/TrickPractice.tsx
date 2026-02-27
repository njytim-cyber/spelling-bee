import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SpellingTrick } from '../utils/spellingTricks';
import type { EngineItem } from '../engine/domain';
import { ProblemView } from './ProblemView';
import { BeeBuddy } from './BeeBuddy';
import type { ChalkState } from '../engine/domain';
import { STORAGE_KEYS } from '../config';

const MASTERY_KEY = STORAGE_KEYS.masteredTricks;

/** Load mastered trick IDs from localStorage */
// eslint-disable-next-line react-refresh/only-export-components
export function loadMastered(): Set<string> {
    try {
        const raw = localStorage.getItem(MASTERY_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
}

/** Save a newly mastered trick */
function saveMastered(trickId: string) {
    const set = loadMastered();
    set.add(trickId);
    localStorage.setItem(MASTERY_KEY, JSON.stringify([...set]));
}

/** Convert a trick's generatePractice result to an EngineItem for ProblemView */
function trickToItem(trick: SpellingTrick): EngineItem {
    const p = trick.generatePractice();
    return {
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        prompt: p.prompt,
        answer: p.answer,
        options: p.options,
        correctIndex: p.correctIndex,
    };
}

const TOTAL_QUESTIONS = 5;

interface Props {
    trick: SpellingTrick;
    onClose: () => void;
}


export function TrickPractice({ trick, onClose }: Props) {
    const [questions, setQuestions] = useState(() =>
        Array.from({ length: TOTAL_QUESTIONS }, () => trickToItem(trick))
    );
    const [progress, setProgress] = useState(0);
    const [frozen, setFrozen] = useState(false);
    const [flash, setFlash] = useState('');
    const [chalkState, setChalkState] = useState<ChalkState>('idle');
    const [highlightCorrect, setHighlightCorrect] = useState(false);

    const current = questions[progress] ?? null;
    const isComplete = progress >= TOTAL_QUESTIONS;

    // Persist mastery on completion
    useMemo(() => {
        if (isComplete) saveMastered(trick.id);
    }, [isComplete, trick.id]);

    const handleSwipe = useCallback((dir: 'left' | 'right' | 'up' | 'down') => {
        if (frozen || !current) return;
        const DIRS = ['left', 'down', 'right'];
        const idx = DIRS.indexOf(dir);
        if (idx === -1) return; // skip 'up' (skip)

        const selectedAnswer = current.options[idx];
        const isCorrect = selectedAnswer === current.answer;

        if (isCorrect) {
            setFrozen(true);
            setFlash('correct');
            setChalkState('success');
            setHighlightCorrect(true);
            setTimeout(() => {
                setFlash('');
                setFrozen(false);
                setHighlightCorrect(false);
                setChalkState('idle');
                setProgress(p => p + 1);
            }, 400);
        } else {
            setFrozen(true);
            setFlash('wrong');
            setChalkState('fail');
            setHighlightCorrect(true);
            setTimeout(() => setChalkState('idle'), 400);
            setTimeout(() => {
                setFlash('');
                setFrozen(false);
                setHighlightCorrect(false);
            }, 500);
            // Add extra question on wrong answer
            if (questions.length < TOTAL_QUESTIONS + 5) {
                setQuestions(q => [...q, trickToItem(trick)]);
            }
        }
    }, [frozen, current, questions.length, trick]);

    return (
        <motion.div
            className="flex-1 flex flex-col relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Flash overlay */}
            <AnimatePresence>
                {flash && (
                    <motion.div
                        key={flash}
                        className={`absolute inset-0 z-40 pointer-events-none ${flash === 'correct' ? 'bg-[var(--color-correct)]' : 'bg-[var(--color-wrong)]'}`}
                        initial={{ opacity: 0.25 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    />
                )}
            </AnimatePresence>

            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute left-3 top-3 z-30 w-8 h-8 rounded-full bg-[rgb(var(--color-fg))]/10 flex items-center justify-center text-[rgb(var(--color-fg))]/50 hover:text-[rgb(var(--color-fg))]/80 transition-colors"
            >
                ✕
            </button>

            {/* Header */}
            <div className="text-center pt-3">
                <div className="text-xs ui text-[var(--color-gold)]/60 uppercase tracking-wider">Practice Blitz</div>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mt-2 mb-4">
                {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
                    <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${i < progress
                            ? 'bg-[var(--color-correct)]'
                            : i === progress
                                ? 'bg-[var(--color-gold)]'
                                : 'bg-[rgb(var(--color-fg))]/15'
                            }`}
                    />
                ))}
            </div>

            {isComplete ? (
                /* ── Completion screen ── */
                <motion.div
                    className="flex-1 flex flex-col items-center justify-center gap-4 px-8"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                >
                    <div className="text-4xl">🎉</div>
                    <h2 className="text-2xl ui font-bold text-[var(--color-gold)]">Mastered!</h2>
                    <p className="text-sm ui text-[rgb(var(--color-fg))]/50 text-center">
                        You've learned the <span className="text-[var(--color-gold)]">{trick.title}</span> spelling rule
                    </p>
                    <motion.button
                        onClick={onClose}
                        className="mt-4 px-8 py-3 rounded-2xl bg-[var(--color-gold)]/20 border border-[var(--color-gold)]/30 text-[var(--color-gold)] ui font-semibold text-sm"
                        whileTap={{ scale: 0.95 }}
                    >
                        Continue →
                    </motion.button>
                </motion.div>
            ) : current ? (
                /* ── Problem view (reused from game tab!) ── */
                <div className="flex-1 flex flex-col">
                    <ProblemView
                        problem={current}
                        frozen={frozen}
                        highlightCorrect={highlightCorrect}
                        onSwipe={handleSwipe}
                    />
                </div>
            ) : null}

            {/* Bee Buddy mascot — same as game tab, just render directly */}
            {!isComplete && (
                <BeeBuddy state={chalkState} streak={progress} totalAnswered={progress} />
            )}
        </motion.div>
    );
}
