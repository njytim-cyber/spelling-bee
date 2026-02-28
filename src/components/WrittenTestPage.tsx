/**
 * components/WrittenTestPage.tsx
 *
 * Full-page written test simulation (mock Scripps Round 3).
 * 40 MC questions (28 spelling + 12 vocabulary), 15-minute timer.
 */
import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWrittenTest } from '../hooks/useWrittenTest';
import { ChevronLeft } from './ChevronLeft';

interface Props {
    onExit: () => void;
    onComplete?: (score: number, total: number) => void;
}

const DIFFICULTY_LABELS = ['Easy (K-2)', 'Medium (2-4)', 'Standard (3-6)', 'Hard (5-8)', 'Expert (7-10)'];

export const WrittenTestPage = memo(function WrittenTestPage({ onExit, onComplete }: Props) {
    const {
        phase,
        currentIndex,
        currentQuestion,
        answers,
        answeredCount,
        totalQuestions,
        results,
        startTest,
        selectAnswer,
        nextQuestion,
        prevQuestion,
        goToQuestion,
        submitTest,
        reviewTest,
        resetTest,
        test,
    } = useWrittenTest();

    const [difficulty, setDifficulty] = useState(3);

    // ── Timer ──
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef(0);
    const startRef = useRef(0);

    useEffect(() => {
        if (phase !== 'in-progress') {
            cancelAnimationFrame(timerRef.current);
            return;
        }
        startRef.current = Date.now();
        const tick = () => {
            setElapsed(Date.now() - startRef.current);
            timerRef.current = requestAnimationFrame(tick);
        };
        timerRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(timerRef.current);
    }, [phase]);

    // Auto-submit when timer expires
    const timeLimitMs = test?.timeLimitMs ?? 15 * 60 * 1000;
    useEffect(() => {
        if (phase === 'in-progress' && elapsed >= timeLimitMs) {
            submitTest();
        }
    }, [phase, elapsed, timeLimitMs, submitTest]);

    const handleSubmit = useCallback(() => {
        submitTest();
    }, [submitTest]);

    // Report results to parent
    useEffect(() => {
        if (results && onComplete) {
            onComplete(results.total, results.spellingTotal + results.vocabTotal);
        }
    }, [results, onComplete]);

    const timeRemaining = Math.max(0, timeLimitMs - elapsed);
    const remainMin = Math.floor(timeRemaining / 60000);
    const remainSec = Math.floor((timeRemaining % 60000) / 1000);

    // ── SETUP PHASE ──
    if (phase === 'setup') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6">
                <h2 className="text-2xl ui font-bold text-[var(--color-gold)]">Written Test</h2>
                <p className="text-sm ui text-[rgb(var(--color-fg))]/50 text-center max-w-[280px]">
                    Mock Scripps Round 3: 28 spelling + 12 vocabulary = 40 questions. 15-minute timer.
                </p>

                <div className="w-full max-w-[280px] space-y-2">
                    <label className="text-xs ui text-[rgb(var(--color-fg))]/40">Difficulty</label>
                    <div className="flex flex-wrap gap-2">
                        {DIFFICULTY_LABELS.map((label, i) => (
                            <button
                                key={i}
                                onClick={() => setDifficulty(i + 1)}
                                className={`px-3 py-1.5 rounded-lg text-xs ui transition-colors ${
                                    difficulty === i + 1
                                        ? 'bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/40 text-[var(--color-gold)]'
                                        : 'border border-[rgb(var(--color-fg))]/10 text-[rgb(var(--color-fg))]/40'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => startTest(difficulty)}
                    className="px-8 py-3 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-base ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
                >
                    Start Test
                </button>
                <button
                    onClick={onExit}
                    className="text-xs ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50"
                >
                    Back
                </button>
            </div>
        );
    }

    // ── RESULTS PHASE ──
    if (phase === 'results' && results) {
        const percentage = Math.round((results.total / (results.spellingTotal + results.vocabTotal)) * 100);
        return (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-4">
                <h2 className="text-2xl ui font-bold text-[var(--color-gold)]">Test Complete</h2>
                <div className="text-5xl chalk text-[var(--color-chalk)]">{percentage}%</div>
                <div className="text-sm ui text-[rgb(var(--color-fg))]/50">
                    {results.total}/{results.spellingTotal + results.vocabTotal} correct
                </div>

                <div className="w-full max-w-[280px] bg-[rgb(var(--color-fg))]/5 rounded-xl px-5 py-4 space-y-2">
                    <div className="flex justify-between text-xs ui">
                        <span className="text-[rgb(var(--color-fg))]/50">Spelling</span>
                        <span className="text-[var(--color-chalk)]">{results.spellingCorrect}/{results.spellingTotal}</span>
                    </div>
                    <div className="flex justify-between text-xs ui">
                        <span className="text-[rgb(var(--color-fg))]/50">Vocabulary</span>
                        <span className="text-[var(--color-chalk)]">{results.vocabCorrect}/{results.vocabTotal}</span>
                    </div>
                    <div className="flex justify-between text-xs ui">
                        <span className="text-[rgb(var(--color-fg))]/50">Time</span>
                        <span className="text-[var(--color-chalk)]">{Math.floor(results.timeTakenMs / 60000)}:{String(Math.floor((results.timeTakenMs % 60000) / 1000)).padStart(2, '0')}</span>
                    </div>
                </div>

                <div className="flex gap-3 mt-2">
                    <button
                        onClick={reviewTest}
                        className="px-5 py-2 rounded-xl border border-[var(--color-gold)]/40 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 transition-colors"
                    >
                        Review Answers
                    </button>
                    <button
                        onClick={() => { resetTest(); }}
                        className="px-5 py-2 rounded-xl border border-[rgb(var(--color-fg))]/20 text-sm ui text-[rgb(var(--color-fg))]/50 hover:border-[rgb(var(--color-fg))]/40 transition-colors"
                    >
                        New Test
                    </button>
                </div>
                <button onClick={onExit} className="text-xs ui text-[rgb(var(--color-fg))]/30 mt-2 flex items-center gap-1">
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back
                </button>
            </div>
        );
    }

    // ── IN-PROGRESS / REVIEW PHASE ──
    if (!currentQuestion) return null;

    const isReview = phase === 'review';
    const selectedAnswer = answers[currentIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctIndex;

    return (
        <div className="flex-1 flex flex-col items-center px-6 py-6 relative">
            {/* Top bar: progress + timer */}
            <div className="w-full max-w-[340px] flex items-center justify-between mb-4">
                <span className="text-xs ui text-[rgb(var(--color-fg))]/40">
                    {currentIndex + 1}/{totalQuestions}
                    {!isReview && ` \u00b7 ${answeredCount} answered`}
                </span>
                {!isReview && (
                    <span className={`text-xs ui font-mono ${timeRemaining < 120000 ? 'text-[var(--color-wrong)]' : 'text-[rgb(var(--color-fg))]/40'}`}>
                        {remainMin}:{String(remainSec).padStart(2, '0')}
                    </span>
                )}
                {isReview && (
                    <span className="text-xs ui text-[rgb(var(--color-fg))]/40">Review Mode</span>
                )}
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-[340px] h-1 bg-[rgb(var(--color-fg))]/10 rounded-full mb-6 overflow-hidden">
                <motion.div
                    className="h-full bg-[var(--color-gold)] rounded-full"
                    animate={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                    transition={{ duration: 0.2 }}
                />
            </div>

            {/* Question type badge */}
            <div className={`text-[10px] ui uppercase tracking-wider mb-2 ${
                currentQuestion.type === 'spelling' ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/40'
            }`}>
                {currentQuestion.type === 'spelling' ? 'Which is spelled correctly?' : 'Which word matches?'}
            </div>

            {/* Prompt */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                    className="w-full max-w-[340px]"
                >
                    <p className={`text-center ui font-bold text-[var(--color-chalk)] mb-6 ${
                        currentQuestion.prompt.length > 60 ? 'text-sm' : currentQuestion.prompt.length > 35 ? 'text-base' : 'text-lg'
                    }`}>
                        {currentQuestion.prompt}
                    </p>

                    {/* 4 MC buttons */}
                    <div className="space-y-2">
                        {currentQuestion.options.map((opt, i) => {
                            let btnClass = 'border-[rgb(var(--color-fg))]/15 text-[var(--color-chalk)]';
                            if (isReview) {
                                if (i === currentQuestion.correctIndex) {
                                    btnClass = 'border-[var(--color-correct)] bg-[var(--color-correct)]/10 text-[var(--color-correct)]';
                                } else if (i === selectedAnswer && !isCorrect) {
                                    btnClass = 'border-[var(--color-wrong)] bg-[var(--color-wrong)]/10 text-[var(--color-wrong)]';
                                }
                            } else if (i === selectedAnswer) {
                                btnClass = 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]';
                            }

                            return (
                                <button
                                    key={i}
                                    onClick={() => !isReview && selectAnswer(currentIndex, i)}
                                    disabled={isReview}
                                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm ui font-bold transition-colors ${btnClass}`}
                                >
                                    <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mr-2">
                                        {String.fromCharCode(65 + i)}.
                                    </span>
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center gap-3 mt-6">
                <button
                    onClick={prevQuestion}
                    disabled={currentIndex === 0}
                    className="px-4 py-2 rounded-lg text-xs ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 disabled:opacity-20"
                >
                    Prev
                </button>

                {/* Question dots - show up to 10 nearest */}
                <div className="flex gap-1">
                    {Array.from({ length: Math.min(10, totalQuestions) }, (_, i) => {
                        const qIdx = Math.max(0, Math.min(totalQuestions - 10, currentIndex - 5)) + i;
                        const answered = answers[qIdx] !== null;
                        const active = qIdx === currentIndex;
                        return (
                            <button
                                key={qIdx}
                                onClick={() => goToQuestion(qIdx)}
                                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                                    active ? 'bg-[var(--color-gold)]'
                                        : answered ? 'bg-[rgb(var(--color-fg))]/30'
                                            : 'bg-[rgb(var(--color-fg))]/10'
                                }`}
                            />
                        );
                    })}
                </div>

                {currentIndex < totalQuestions - 1 ? (
                    <button
                        onClick={nextQuestion}
                        className="px-4 py-2 rounded-lg text-xs ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10"
                    >
                        Next
                    </button>
                ) : !isReview ? (
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 rounded-lg text-xs ui bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/40"
                    >
                        Submit
                    </button>
                ) : (
                    <button
                        onClick={resetTest}
                        className="px-4 py-2 rounded-lg text-xs ui text-[rgb(var(--color-fg))]/40"
                    >
                        Done
                    </button>
                )}
            </div>

            {/* Back button */}
            <button
                onClick={onExit}
                className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                aria-label="Back"
            >
                <ChevronLeft />
            </button>
        </div>
    );
});
