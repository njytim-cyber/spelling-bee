import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { QuestionTypePicker } from './QuestionTypePicker';
import type { SpellingCategory } from '../domains/spelling/spellingCategories';
import { SPELLING_CATEGORIES } from '../domains/spelling/spellingCategories';

interface Props {
    questionType: SpellingCategory;
    onTypeChange: (type: SpellingCategory) => void;
    /** Text-entry (guided) mode toggle */
    guidedMode: boolean;
    onGuidedModeToggle: () => void;
    isPremium?: boolean;
    onUpgrade?: () => void;
    assignedLists?: { id: string; name: string; wordCount: number }[];
    onPracticeList?: (listId: string) => void;
}

const TIMER_DURATION_MS = 10_000;

const TAP = { scale: 0.88 };

const ICON_PROPS = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

const activeColor = (on: boolean) =>
    on ? 'text-[var(--color-gold)]' : 'text-[var(--color-chalk)]/70';

const BTN = 'w-11 h-11 flex items-center justify-center';
const LABEL = 'text-[7px] ui text-[rgb(var(--color-fg))]/30 whitespace-nowrap';

/** Circular countdown ring drawn as an SVG arc centred on the stopwatch face. */
function TimerRing({ progress }: { progress: number }) {
    const r = 19;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - progress);

    return (
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 48">
            {/* Track */}
            <circle
                cx="22" cy="26" r={r}
                fill="none"
                stroke="rgb(var(--color-fg) / 0.12)"
                strokeWidth="2.5"
            />
            {/* Progress arc */}
            {progress > 0 && (
                <circle
                    cx="22" cy="26" r={r}
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

/** Simple 10-second stopwatch timer. Tap to start, tap again to reset+stop. */
function useStopwatch() {
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);      // 0 → 1
    const [secondsLeft, setSecondsLeft] = useState(10);
    const startRef = useRef(0);
    const rafRef = useRef(0);

    const stop = useCallback(() => {
        cancelAnimationFrame(rafRef.current);
        setRunning(false);
        setProgress(0);
        setSecondsLeft(10);
    }, []);

    const toggle = useCallback(() => {
        if (running) {
            stop();
        } else {
            startRef.current = Date.now();
            setRunning(true);
        }
    }, [running, stop]);

    useEffect(() => {
        if (!running) return;
        const tick = () => {
            const elapsed = Date.now() - startRef.current;
            const p = Math.min(elapsed / TIMER_DURATION_MS, 1);
            setProgress(p);
            setSecondsLeft(Math.max(0, Math.ceil((TIMER_DURATION_MS - elapsed) / 1000)));
            if (p >= 1) {
                setRunning(false);
                return;
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [running]);

    return { running, progress, secondsLeft, toggle };
}

export const ActionButtons = memo(function ActionButtons({
    questionType, onTypeChange,
    guidedMode, onGuidedModeToggle,
    isPremium, onUpgrade, assignedLists, onPracticeList,
}: Props) {
    const hideToggles = questionType === 'bee' || questionType === 'guided';
    const categoryLabel = SPELLING_CATEGORIES.find(c => c.id === questionType)?.label ?? '';
    const timer = useStopwatch();

    return (
        <div className="action-buttons-col absolute right-3 top-[25%] -translate-y-1/2 flex flex-col gap-[clamp(0.5rem,2vh,1rem)] z-20">
            {/* Question type */}
            <div className="relative">
                <QuestionTypePicker current={questionType} onChange={onTypeChange} isPremium={isPremium} onUpgrade={onUpgrade} assignedLists={assignedLists} onPracticeList={onPracticeList} />
                <span className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 ${LABEL}`}>{categoryLabel}</span>
            </div>

            {/* MCQ / Text mode toggle */}
            {!hideToggles && <motion.button
                onClick={onGuidedModeToggle}
                className={`${BTN} flex-col ${activeColor(guidedMode)}`}
                whileTap={TAP}
                aria-label={guidedMode ? 'Text entry mode (tap for MCQ)' : 'MCQ mode (tap for text entry)'}
            >
                {guidedMode ? (
                    /* Pencil — text entry mode */
                    <svg {...ICON_PROPS}>
                        <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="M15 5l4 4" />
                    </svg>
                ) : (
                    /* List/checklist — MCQ mode */
                    <svg {...ICON_PROPS}>
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
                <span className={`w-7 text-center -mt-0.5 ${LABEL}`}>{guidedMode ? 'Type' : 'MCQ'}</span>
            </motion.button>}

            {/* Stopwatch — simple 10s countdown timer */}
            {!hideToggles && <motion.button
                onClick={timer.toggle}
                className={`${BTN} relative ${activeColor(timer.running)}`}
                whileTap={TAP}
                aria-label={timer.running ? `Timer running — ${timer.secondsLeft}s left — tap to reset` : 'Start 10s timer'}
            >
                <TimerRing progress={timer.progress} />
                <svg {...ICON_PROPS} className="relative z-10">
                    <circle cx="12" cy="13" r="7" />
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="9" y1="2" x2="15" y2="2" />
                    <line x1="12" y1="13" x2="12" y2="9" />
                </svg>
                <span className={`absolute -bottom-2.5 ${LABEL}`}>
                    {timer.running ? `${timer.secondsLeft}s` : 'Timer'}
                </span>
            </motion.button>}
        </div>
    );
});
