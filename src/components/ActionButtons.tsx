import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuestionTypePicker } from './QuestionTypePicker';
import type { SpellingCategory } from '../domains/spelling/spellingCategories';

interface Props {
    questionType: SpellingCategory;
    onTypeChange: (type: SpellingCategory) => void;
    hardMode: boolean;
    onHardModeToggle: () => void;
    timedMode: boolean;
    onTimedModeToggle: () => void;
    timerProgress: number; // 0 → 1
    reviewQueueCount?: number;
    /** Text-entry (guided) mode toggle */
    guidedMode: boolean;
    onGuidedModeToggle: () => void;
}

/** Circular countdown ring drawn as an SVG arc */
function TimerRing({ progress, active }: { progress: number; active: boolean }) {
    const r = 19;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - progress);

    return (
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
            {/* Track */}
            <circle
                cx="22" cy="22" r={r}
                fill="none"
                stroke={active ? 'rgb(var(--color-fg) / 0.12)' : 'rgb(var(--color-fg) / 0.15)'}
                strokeWidth="2.5"
            />
            {/* Progress arc */}
            {active && (
                <circle
                    cx="22" cy="22" r={r}
                    fill="none"
                    stroke={progress > 0.75 ? 'var(--color-streak-fire)' : 'var(--color-gold)'}
                    strokeWidth="2.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke 0.3s' }}
                />
            )}
        </svg>
    );
}

export const ActionButtons = memo(function ActionButtons({
    questionType, onTypeChange, hardMode, onHardModeToggle,
    timedMode, onTimedModeToggle, timerProgress,
    reviewQueueCount, guidedMode, onGuidedModeToggle,
}: Props) {
    // Hide hard/timed toggles during full-screen modes that have their own controls
    const hideToggles = questionType === 'bee' || questionType === 'guided' || questionType === 'written-test';

    return (
        <div className="absolute right-3 top-[25%] -translate-y-1/2 flex flex-col gap-4 z-20">
            {/* Question type */}
            <div className="relative">
                <QuestionTypePicker current={questionType} onChange={onTypeChange} reviewQueueCount={reviewQueueCount} />
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[7px] ui text-[rgb(var(--color-fg))]/30 whitespace-nowrap">Topic</span>
            </div>

            {/* MCQ / Text mode toggle */}
            {!hideToggles && <motion.button
                onClick={onGuidedModeToggle}
                className={`w-11 h-11 flex flex-col items-center justify-center ${guidedMode
                    ? 'text-[var(--color-gold)]'
                    : 'text-[rgb(var(--color-fg))]/70'
                }`}
                whileTap={{ scale: 0.88 }}
                aria-label={guidedMode ? 'Text entry mode (tap for MCQ)' : 'MCQ mode (tap for text entry)'}
            >
                {guidedMode ? (
                    /* Pencil — text entry mode */
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="M15 5l4 4" />
                    </svg>
                ) : (
                    /* List/checklist — MCQ mode */
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 6h9" />
                        <path d="M11 12h9" />
                        <path d="M11 18h9" />
                        <rect x="3" y="4" width="4" height="4" rx="1" />
                        <rect x="3" y="10" width="4" height="4" rx="1" />
                        <rect x="3" y="16" width="4" height="4" rx="1" />
                    </svg>
                )}
                {guidedMode && (
                    <span className="w-1 h-1 rounded-full bg-[var(--color-gold)] mt-0.5" />
                )}
                <span className="text-[7px] ui text-[rgb(var(--color-fg))]/30 whitespace-nowrap -mt-0.5">{guidedMode ? 'Type' : 'MCQ'}</span>
            </motion.button>}

            {/* Stopwatch / timed mode */}
            {!hideToggles && <motion.button
                onClick={onTimedModeToggle}
                className={`w-11 h-11 relative flex items-center justify-center ${timedMode
                    ? 'text-[var(--color-gold)]'
                    : 'text-[rgb(var(--color-fg))]/70'
                    }`}
                whileTap={{ scale: 0.88 }}
                aria-label={timedMode ? 'Timer on' : 'Timer off'}
            >
                <TimerRing progress={timerProgress} active={timedMode} />
                <motion.svg
                    viewBox="0 0 24 24"
                    className="w-6 h-6 relative z-10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    animate={timedMode ? { rotate: [0, -6, 6, -3, 3, 0] } : {}}
                    transition={timedMode ? {
                        duration: 1.8,
                        repeat: Infinity,
                        repeatDelay: 3,
                        ease: 'easeInOut',
                    } : {}}
                >
                    <circle cx="12" cy="14" r="7" />
                    <line x1="12" y1="3" x2="12" y2="7" />
                    <line x1="9" y1="3" x2="15" y2="3" />
                    <line x1="12" y1="14" x2="12" y2="10" />
                </motion.svg>
                <span className="absolute -bottom-2.5 text-[7px] ui text-[rgb(var(--color-fg))]/30 whitespace-nowrap">Timer</span>
            </motion.button>}

            {/* Hard mode skull */}
            {!hideToggles && <motion.button
                onClick={onHardModeToggle}
                className={`w-11 h-11 flex flex-col items-center justify-center text-xl ${hardMode
                    ? 'opacity-100'
                    : 'opacity-50'
                    }`}
                whileTap={{ scale: 0.88 }}
                animate={hardMode ? {
                    rotate: [0, -8, 8, -5, 5, 0],
                    scale: [1, 1.1, 1, 1.05, 1],
                } : {}}
                transition={hardMode ? {
                    duration: 1.5,
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: 'easeInOut' as const,
                } : {}}
                aria-label={hardMode ? 'Hard mode on' : 'Hard mode off'}
            >
                💀
                {hardMode && (
                    <span className="w-1 h-1 rounded-full bg-[var(--color-gold)] mt-0.5" />
                )}
                <span className="text-[7px] ui text-[rgb(var(--color-fg))]/30 whitespace-nowrap -mt-0.5">Hard</span>
            </motion.button>}

            {/* Review queue */}
            <AnimatePresence>
                {reviewQueueCount != null && reviewQueueCount > 0 && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => onTypeChange('review' as SpellingCategory)}
                        className={`w-11 h-11 flex flex-col items-center justify-center relative ${questionType === 'review' ? 'opacity-100' : 'opacity-60'}`}
                        whileTap={{ scale: 0.88 }}
                    >
                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            <path d="M9 7h7M9 11h5" />
                        </svg>
                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-[var(--color-streak-fire)] text-white text-[8px] ui font-bold px-0.5">
                            {reviewQueueCount > 99 ? '99+' : reviewQueueCount}
                        </span>
                        {questionType === 'review' && (
                            <span className="w-1 h-1 rounded-full bg-[var(--color-gold)] mt-0.5" />
                        )}
                        <span className="absolute -bottom-2.5 text-[7px] ui text-[rgb(var(--color-fg))]/30 whitespace-nowrap">Review</span>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
});
