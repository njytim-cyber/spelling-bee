import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuestionTypePicker } from './QuestionTypePicker';
import type { SpellingCategory } from '../domains/spelling/spellingCategories';
import { SPELLING_CATEGORIES } from '../domains/spelling/spellingCategories';
import type { TimedVariant } from '../engine/domain';
import { trackEvent } from '../utils/analytics';

interface Props {
    questionType: SpellingCategory;
    onTypeChange: (type: SpellingCategory) => void;
    timedMode: boolean;
    onTimedModeToggle: () => void;
    timerProgress: number; // 0 → 1
    timedVariant: TimedVariant;
    onTimedVariantChange: (v: TimedVariant) => void;
    /** Text-entry (guided) mode toggle */
    guidedMode: boolean;
    onGuidedModeToggle: () => void;
    isPremium?: boolean;
    onUpgrade?: () => void;
    assignedLists?: { id: string; name: string; wordCount: number }[];
    onPracticeList?: (listId: string) => void;
}

const VARIANT_OPTIONS: { id: TimedVariant; label: string; sub: string; premium: boolean }[] = [
    { id: 'normal', label: '10s', sub: 'Normal', premium: false },
    { id: 'speed', label: '5s', sub: 'Speed', premium: true },
    { id: 'endurance', label: '⏬', sub: 'Endurance', premium: true },
];

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
    questionType, onTypeChange,
    timedMode, onTimedModeToggle, timerProgress,
    timedVariant, onTimedVariantChange,
    guidedMode, onGuidedModeToggle,
    isPremium, onUpgrade, assignedLists, onPracticeList,
}: Props) {
    const [showVariantPicker, setShowVariantPicker] = useState(false);
    // Hide hard/timed toggles during full-screen modes that have their own controls
    const hideToggles = questionType === 'bee' || questionType === 'guided';
    const categoryLabel = SPELLING_CATEGORIES.find(c => c.id === questionType)?.label ?? '';
    const variantLabel = timedVariant === 'speed' ? '5s' : timedVariant === 'endurance' ? '⏬' : '10s';

    return (
        <div className="action-buttons-col absolute right-2 top-[25%] -translate-y-1/2 flex flex-col gap-[clamp(0.5rem,2vh,1rem)] z-20">
            {/* Question type */}
            <div className="relative">
                <QuestionTypePicker current={questionType} onChange={onTypeChange} isPremium={isPremium} onUpgrade={onUpgrade} assignedLists={assignedLists} onPracticeList={onPracticeList} />
                <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 ${LABEL}`}>{categoryLabel}</span>
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

            {/* Stopwatch / timed mode */}
            {!hideToggles && <div className="relative">
                <motion.button
                    onClick={() => {
                        if (timedMode) {
                            setShowVariantPicker(v => !v);
                        } else {
                            onTimedModeToggle();
                        }
                    }}
                    onDoubleClick={() => {
                        if (timedMode) onTimedModeToggle();
                    }}
                    className={`${BTN} relative ${activeColor(timedMode)}`}
                    whileTap={TAP}
                    aria-label={timedMode ? `Timer on (${variantLabel}) — tap to change, double-tap to turn off` : 'Timer off'}
                >
                    <TimerRing progress={timerProgress} active={timedMode} />
                    <motion.svg
                        {...ICON_PROPS}
                        className="relative z-10"
                        animate={timedMode ? { rotate: [0, -6, 6, -3, 3, 0] } : {}}
                        transition={timedMode ? {
                            duration: 1.8,
                            repeat: Infinity,
                            repeatDelay: 3,
                            ease: 'easeInOut',
                        } : {}}
                    >
                        <circle cx="12" cy="13" r="7" />
                        <line x1="12" y1="2" x2="12" y2="6" />
                        <line x1="9" y1="2" x2="15" y2="2" />
                        <line x1="12" y1="13" x2="12" y2="9" />
                    </motion.svg>
                    <span className={`absolute -bottom-2.5 ${LABEL}`}>
                        {timedMode ? variantLabel : 'Timer'}
                    </span>
                </motion.button>

                {/* Variant picker popup */}
                <AnimatePresence>
                    {showVariantPicker && timedMode && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                className="fixed inset-0 z-30"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowVariantPicker(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, x: 10, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 10, scale: 0.9 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-14 top-0 z-40 bg-[var(--color-board)] border border-[rgb(var(--color-fg))]/15 rounded-xl shadow-lg p-1.5 min-w-[120px]"
                            >
                                {VARIANT_OPTIONS.map(opt => {
                                    const locked = opt.premium && !isPremium;
                                    const active = timedVariant === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => {
                                                if (locked) {
                                                    onUpgrade?.();
                                                } else {
                                                    onTimedVariantChange(opt.id);
                                                    trackEvent('timed_variant_selected', { variant: opt.id });
                                                    setShowVariantPicker(false);
                                                }
                                            }}
                                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                                                active
                                                    ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)]'
                                                    : locked
                                                        ? 'text-[rgb(var(--color-fg))]/25'
                                                        : 'text-[rgb(var(--color-fg))]/60 hover:bg-[rgb(var(--color-fg))]/5'
                                            }`}
                                        >
                                            <span className="text-xs ui font-semibold w-5">{opt.label}</span>
                                            <span className="text-[10px] ui flex-1">{opt.sub}</span>
                                            {locked && <span className="text-[8px]">🔒</span>}
                                            {active && <span className="text-[8px]">✓</span>}
                                        </button>
                                    );
                                })}
                                {/* Turn off option */}
                                <button
                                    onClick={() => {
                                        onTimedModeToggle();
                                        setShowVariantPicker(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50 transition-colors mt-0.5 border-t border-[rgb(var(--color-fg))]/5 pt-1.5"
                                >
                                    <span className="text-[10px] ui">Turn off timer</span>
                                </button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>}
        </div>
    );
});
