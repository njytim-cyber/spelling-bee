/**
 * components/PathPage.tsx
 *
 * Study Dashboard — the "Path" tab. Shows a single clear CTA,
 * compact study plan, and flat 10-level curriculum.
 */
import { memo, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WordRecord } from '../hooks/useWordHistory';
import { evaluateLevelProgress, type LevelProgress } from '../domains/spelling/curriculum';
import { getStudyPlan, getDifficultyNudge, type PracticeRecommendation } from '../utils/errorPatterns';
import { StudyToolsModal, type StudyTab } from './StudyToolsModal';
import { WORD_ROOTS } from '../domains/spelling/words/roots';
import { computeRootMastery } from '../domains/spelling/words/rootUtils';
import { wordsByDifficulty, getRegistryVersion } from '../domains/spelling/words';
import type { DifficultyTier } from '../domains/spelling/words/types';
import { levelIcon, type Level } from '../domains/spelling/spellingCategories';
import { IconBook, IconTree, IconChart, IconLock } from './Icons';
import { STORAGE_KEYS } from '../config';
import { isLevelPremium } from '../hooks/usePremium';

interface Props {
    records: Record<string, WordRecord>;
    onPractice?: (category: string) => void;
    /** Start a structured session: category + word count */
    onStartSession?: (category: string, sessionSize: number) => void;
    reviewDueCount?: number;
    hardestWordCount?: number;
    onDrillHardest?: () => void;
    onDrillRoot?: (rootId: string) => void;
    isPremium?: boolean;
    onUpgrade?: () => void;
    /** True when free user has exhausted daily review cap */
    isReviewLimited?: boolean;
    /** Number of reviews remaining before cap (free users only) */
    reviewsRemaining?: number;
}

// ── Pattern tooltips for phonics abbreviations ──────────────────────────────

const PATTERN_TOOLTIPS: Record<string, string> = {
    'CVC': 'Consonant-Vowel-Consonant, like c-a-t',
    'Blends': 'Two consonants together, like bl- in "black"',
    'Digraphs': 'Two letters making one sound, like sh- in "ship"',
    'Silent E': 'A silent "e" changes the vowel, like "cap" → "cape"',
    'Vowel Teams': 'Two vowels together, like "ea" in "team"',
    'R-Controlled': 'A vowel + r changes the sound, like "ar" in "car"',
    'Diphthongs': 'Vowel sounds that glide, like "oi" in "coin"',
    'Prefixes': 'Letters added before a word, like "un-" in "undo"',
    'Suffixes': 'Letters added after a word, like "-ing" in "running"',
    'Compound': 'Two words joined together, like "sun" + "flower"',
    'Multisyllable': 'Words with many parts, like "but-ter-fly"',
    'Irregular': 'Words that don\'t follow normal rules',
    'Latin Roots': 'Words from Latin, like "rupt" in "erupt"',
    'Greek Roots': 'Words from Greek, like "graph" in "paragraph"',
    'French Origin': 'Words from French, like "ballet"',
};

// ── Priority label/color mapping ────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, { badge: string; border: string; text: string }> = {
    review: { badge: 'bg-[var(--color-gold)]/15 text-[var(--color-gold)]', border: 'border-[var(--color-gold)]/20', text: 'Spaced' },
    weak: { badge: 'bg-[var(--color-gold)]/15 text-[var(--color-gold)]', border: 'border-[var(--color-gold)]/20', text: 'Improve' },
    explore: { badge: 'bg-[var(--color-correct)]/15 text-[var(--color-correct)]', border: 'border-[var(--color-correct)]/20', text: 'New' },
};

// ── Slowly pulsing CTA glow ────────────────────────────────────────────────

const ctaGlow = {
    boxShadow: [
        '0 0 0 0 rgba(251,191,36,0)',
        '0 0 16px 3px rgba(251,191,36,0.35)',
        '0 0 0 0 rgba(251,191,36,0)',
    ],
};

const ctaGlowTransition = { duration: 2.2, repeat: Infinity, ease: 'easeInOut' as const };

// ── Compact recommendation card ─────────────────────────────────────────────

function RecCard({ rec, onPractice }: { rec: PracticeRecommendation; onPractice?: (category: string) => void }) {
    const style = PRIORITY_STYLES[rec.priority ?? 'weak'];
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltip = PATTERN_TOOLTIPS[rec.label];
    return (
        <div className={`py-2 px-3 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border ${style.border}`}>
            <div className="flex items-center justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] ui px-1.5 py-0.5 rounded-full font-semibold ${style.badge}`}>
                            {style.text}
                        </span>
                        <span
                            className={`text-sm ui text-[rgb(var(--color-fg))]/70 font-medium ${tooltip ? 'underline decoration-dotted decoration-[rgb(var(--color-fg))]/20 cursor-help' : ''}`}
                            onClick={tooltip ? (e) => { e.stopPropagation(); setShowTooltip(v => !v); } : undefined}
                        >
                            {rec.label}
                        </span>
                    </div>
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 mt-0.5">{rec.reason}</div>
                </div>
                {onPractice && (
                    <button
                        onClick={() => onPractice(rec.category)}
                        className="shrink-0 ml-2 px-3 py-1 rounded-lg text-[10px] ui text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-colors"
                    >
                        Practice
                    </button>
                )}
            </div>
            {showTooltip && tooltip && (
                <div className="mt-1.5 text-[10px] ui text-[rgb(var(--color-fg))]/50 bg-[rgb(var(--color-fg))]/[0.04] rounded-lg px-2.5 py-1.5">
                    {tooltip}
                </div>
            )}
        </div>
    );
}

// ── Session size picker modal ────────────────────────────────────────────────

const SESSION_SIZES = [10, 20, 50] as const;

function SessionPicker({ level, onPick, onClose }: {
    level: LevelProgress;
    onPick: (size: number) => void;
    onClose: () => void;
}) {
    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="w-[300px] bg-[var(--color-surface)] rounded-2xl p-5 border border-[rgb(var(--color-fg))]/10"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center mb-4">
                    <div className="text-lg chalk text-[var(--color-gold)] font-bold">{level.label}</div>
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 mt-1">
                        {level.totalWords.toLocaleString()} words available
                    </div>
                </div>
                <div className="text-xs ui text-[rgb(var(--color-fg))]/50 text-center mb-3">
                    How many words?
                </div>
                <div className="flex gap-2">
                    {SESSION_SIZES.map(size => (
                        <button
                            key={size}
                            onClick={() => onPick(size)}
                            className="flex-1 py-3 rounded-xl text-sm ui font-bold text-[var(--color-chalk)] bg-[rgb(var(--color-fg))]/[0.05] border border-[rgb(var(--color-fg))]/15 hover:border-[var(--color-gold)]/40 hover:bg-[var(--color-gold)]/10 transition-colors"
                        >
                            {size}
                        </button>
                    ))}
                </div>
                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30 text-center mt-3">
                    Words to master make up to 20% of each session
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Level row ────────────────────────────────────────────────────────────────

function LevelRow({ lp, onClick, locked = false }: { lp: LevelProgress; onClick: () => void; locked?: boolean }) {
    const pct = lp.totalWords > 0 ? lp.mastered / lp.totalWords : 0;
    const icon = levelIcon(lp.tierId as Level);

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors mb-2 ${
                locked
                    ? 'bg-[rgb(var(--color-fg))]/[0.02] border-[rgb(var(--color-fg))]/5 opacity-60'
                    : 'bg-[rgb(var(--color-fg))]/[0.03] border-[rgb(var(--color-fg))]/8 hover:border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/5'
            }`}
        >
            {/* Icon */}
            <span className={`shrink-0 w-6 h-6 ${locked ? 'text-[rgb(var(--color-fg))]/25' : 'text-[rgb(var(--color-fg))]/50'}`}>
                {locked ? <IconLock className="w-5 h-5" /> : icon}
            </span>

            {/* Label + progress */}
            <div className="flex-1 min-w-0 text-left">
                <div className="flex items-baseline gap-1.5">
                    <span className={`text-sm ui font-medium ${locked ? 'text-[rgb(var(--color-fg))]/40' : 'text-[rgb(var(--color-fg))]/70'}`}>
                        {lp.label}
                    </span>
                    {locked ? (
                        <span className="text-[9px] ui text-[var(--color-gold)]/50 font-medium">Champion Pass</span>
                    ) : (
                        <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40">
                            {lp.totalWords.toLocaleString()} words
                        </span>
                    )}
                </div>
                {/* Progress bar */}
                {!locked && (
                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-[rgb(var(--color-fg))]/8 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-[var(--color-gold)] transition-all"
                                style={{ width: `${Math.round(pct * 100)}%` }}
                            />
                        </div>
                        <span className="text-[9px] ui text-[rgb(var(--color-fg))]/25 shrink-0 tabular-nums">
                            {lp.mastered}/{lp.totalWords > 999 ? `${(lp.totalWords / 1000).toFixed(1)}k` : lp.totalWords}
                        </span>
                    </div>
                )}
            </div>

            {/* Play indicator or lock */}
            <span className="text-[rgb(var(--color-fg))]/30 text-xs shrink-0">
                {locked ? <IconLock className="w-3.5 h-3.5 text-[var(--color-gold)]/40" /> : '\u25B6'}
            </span>
        </button>
    );
}

// ── Helper: word count by single difficulty ──────────────────────────────────

function wordCountByDifficulty(diff: DifficultyTier): number {
    return wordsByDifficulty(diff, diff).length;
}

// ── Weekly goal tracker ────────────────────────────────────────────────────────

function getWeekKey(): string {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

interface WeeklyGoalData {
    weekKey: string;
    target: number;
    progress: number;
}

function loadWeeklyGoal(): WeeklyGoalData | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.weeklyGoal);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (data.weekKey !== getWeekKey()) {
            // New week — reset progress but keep target
            return { weekKey: getWeekKey(), target: data.target, progress: 0 };
        }
        return data;
    } catch { return null; }
}

function saveWeeklyGoal(data: WeeklyGoalData): void {
    localStorage.setItem(STORAGE_KEYS.weeklyGoal, JSON.stringify(data));
}

const GOAL_OPTIONS = [50, 100, 200, 500];

function WeeklyGoalTracker({ totalWords }: { totalWords: number }) {
    const [goal, setGoal] = useState<WeeklyGoalData | null>(() => loadWeeklyGoal());
    const [showPicker, setShowPicker] = useState(false);

    // Update progress based on total words studied
    const currentProgress = totalWords;
    if (goal && goal.progress !== currentProgress) {
        const updated = { ...goal, progress: currentProgress, weekKey: getWeekKey() };
        saveWeeklyGoal(updated);
        // Don't call setGoal here to avoid render loop — it will pick up next render
    }

    const handleSetGoal = useCallback((target: number) => {
        const data: WeeklyGoalData = { weekKey: getWeekKey(), target, progress: currentProgress };
        saveWeeklyGoal(data);
        setGoal(data);
        setShowPicker(false);
    }, [currentProgress]);

    if (!goal) {
        return (
            <button
                onClick={() => setShowPicker(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 mb-3 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border border-dashed border-[rgb(var(--color-fg))]/15 hover:border-[var(--color-gold)]/30 transition-colors"
            >
                <span className="text-base">🎯</span>
                <span className="text-xs ui text-[rgb(var(--color-fg))]/40">Set a weekly goal</span>
                {showPicker && (
                    <div className="flex gap-2 ml-2">
                        {GOAL_OPTIONS.map(n => (
                            <button
                                key={n}
                                onClick={(e) => { e.stopPropagation(); handleSetGoal(n); }}
                                className="px-2 py-1 rounded-lg text-[10px] ui text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-colors"
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                )}
            </button>
        );
    }

    const pct = Math.min(100, Math.round((currentProgress / goal.target) * 100));
    const complete = currentProgress >= goal.target;

    return (
        <div className="mb-3 px-3 py-2.5 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8">
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm">{complete ? '🎉' : '🎯'}</span>
                    <span className="text-xs ui text-[rgb(var(--color-fg))]/60 font-medium">
                        {complete ? 'Goal complete!' : `${currentProgress}/${goal.target} this week`}
                    </span>
                </div>
                <button
                    onClick={() => setShowPicker(true)}
                    className="text-[9px] ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50 transition-colors"
                >
                    change
                </button>
            </div>
            <div className="h-1.5 bg-[rgb(var(--color-fg))]/8 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${complete ? 'bg-[var(--color-correct)]' : 'bg-[var(--color-gold)]'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <AnimatePresence>
                {showPicker && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex gap-2 mt-2 pt-2 border-t border-[rgb(var(--color-fg))]/5">
                            {GOAL_OPTIONS.map(n => (
                                <button
                                    key={n}
                                    onClick={() => handleSetGoal(n)}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] ui transition-colors ${goal.target === n
                                        ? 'text-[var(--color-gold)] bg-[var(--color-gold)]/15 font-semibold'
                                        : 'text-[rgb(var(--color-fg))]/40 bg-[rgb(var(--color-fg))]/5 hover:bg-[rgb(var(--color-fg))]/10'
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Main component ───────────────────────────────────────────────────────────

export const PathPage = memo(function PathPage({ records, onPractice, onStartSession, reviewDueCount = 0, hardestWordCount = 0, onDrillHardest, onDrillRoot, isPremium = false, onUpgrade, isReviewLimited = false, reviewsRemaining }: Props) {
    const registryVersion = getRegistryVersion();
    const levelProgress = useMemo(
        () => evaluateLevelProgress(records, wordCountByDifficulty),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [records, registryVersion],
    );
    const recommendations = useMemo(() => getStudyPlan(records, reviewDueCount, hardestWordCount), [records, reviewDueCount, hardestWordCount]);
    const difficultyNudge = useMemo(() => getDifficultyNudge(records), [records]);
    // Root mastery data
    const rootMasteryData = useMemo(() => computeRootMastery(records, WORD_ROOTS), [records]);
    const rootMasteryMap = useMemo(() => {
        const map = new Map<string, { mastered: number; total: number }>();
        for (const d of rootMasteryData) map.set(d.root.root, { mastered: d.mastered, total: d.total });
        return map;
    }, [rootMasteryData]);

    // Study Tools modal
    const [studyToolsTab, setStudyToolsTab] = useState<StudyTab | null>(null);

    // Session picker
    const [pickerLevel, setPickerLevel] = useState<LevelProgress | null>(null);

    const totalWords = Object.keys(records).length;

    // CTA: first recommendation is the primary action
    const ctaRec = recommendations[0] ?? null;
    const otherRecs = recommendations.slice(1);

    // Figure out which callback to use for the CTA
    const handleCtaClick = () => {
        if (!ctaRec) return;
        if (ctaRec.category === 'hardest' && onDrillHardest) {
            onDrillHardest();
        } else if (onPractice) {
            onPractice(ctaRec.category);
        }
    };

    // Also handle "hardest" category in RecCard clicks
    const handleRecPractice = (category: string) => {
        if (category === 'hardest' && onDrillHardest) {
            onDrillHardest();
        } else if (onPractice) {
            onPractice(category);
        }
    };

    const handleLevelClick = (lp: LevelProgress) => {
        // Gate premium levels
        if (isLevelPremium(lp.tierId) && !isPremium) {
            onUpgrade?.();
            return;
        }
        if (onStartSession) {
            setPickerLevel(lp);
        } else if (onPractice) {
            // Fallback: just start freeplay at this tier
            onPractice(lp.tierId);
        }
    };

    const handleSessionPick = (size: number) => {
        if (pickerLevel && onStartSession) {
            onStartSession(pickerLevel.tierId, size);
        }
        setPickerLevel(null);
    };

    // Review explainer — show once when user first sees review words
    const REVIEW_EXPLAINED_KEY = STORAGE_KEYS.reviewExplained;
    const [reviewExplainerDismissed, setReviewExplainerDismissed] = useState(() => !!localStorage.getItem(REVIEW_EXPLAINED_KEY));
    const showReviewExplainer = reviewDueCount > 0 && !reviewExplainerDismissed;
    const dismissReviewExplainer = useCallback(() => {
        localStorage.setItem(REVIEW_EXPLAINED_KEY, '1');
        setReviewExplainerDismissed(true);
    }, [REVIEW_EXPLAINED_KEY]);

    return (
        <>
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top,12px)+48px)] pb-4">
            {/* Header */}
            <h2 className="text-xl ui font-bold text-[var(--color-gold)] text-center mb-1">
                Path to Champion
            </h2>
            {/* Weekly goal tracker */}
            {totalWords > 0 && <WeeklyGoalTracker totalWords={totalWords} />}

            {/* Review system explainer — shows once */}
            {showReviewExplainer && (
                <div className="mb-3 p-3 rounded-xl bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/20 relative">
                    <button
                        onClick={dismissReviewExplainer}
                        className="absolute top-2 right-2 text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50 transition-colors text-xs"
                        aria-label="Dismiss"
                    >
                        &times;
                    </button>
                    <div className="text-sm ui font-bold text-[var(--color-gold)] mb-1">🧠 What&apos;s &ldquo;Words to Master&rdquo;?</div>
                    <div className="text-[11px] ui text-[rgb(var(--color-fg))]/50 leading-relaxed pr-4">
                        Words you&apos;ve missed are scheduled for review using <span className="font-semibold">spaced repetition</span>. Each time you get a word right, it moves up a learning box. After 4 correct reviews, it&apos;s fully mastered. This is the most effective way to build lasting memory.
                    </div>
                </div>
            )}

            {/* First-time empty state */}
            {totalWords === 0 && (
                <div className="flex flex-col items-center py-8 px-4 text-center">
                    <span className="text-3xl mb-3">&#127891;</span>
                    <p className="text-sm ui text-[rgb(var(--color-fg))]/60 mb-1">Start practicing to see your progress!</p>
                    <p className="text-[10px] ui text-[rgb(var(--color-fg))]/40 max-w-[240px]">
                        Go to the Game tab and swipe right for correct, left for wrong. Your study plan, progress, and insights will appear here.
                    </p>
                    {onPractice && (
                        <button
                            onClick={() => onPractice('cvc')}
                            className="mt-4 px-5 py-2 rounded-xl text-sm ui font-medium text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-colors"
                        >
                            Start Practicing
                        </button>
                    )}
                </div>
            )}

            {/* ── Single blinking CTA ── */}
            {ctaRec && (
                <>
                <motion.button
                    onClick={isReviewLimited && ctaRec.category === 'review' ? onUpgrade : handleCtaClick}
                    className="w-full flex items-center justify-between py-3.5 px-4 mb-3 rounded-2xl bg-[var(--color-gold)]/10 border-2 border-[var(--color-gold)]/40 hover:bg-[var(--color-gold)]/15 transition-colors"
                    animate={ctaGlow}
                    transition={ctaGlowTransition}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[9px] ui px-1.5 py-0.5 rounded-full font-semibold ${PRIORITY_STYLES[ctaRec.priority ?? 'weak'].badge}`}>
                            {PRIORITY_STYLES[ctaRec.priority ?? 'weak'].text}
                        </span>
                        <span className="text-sm ui text-[var(--color-gold)] font-bold">
                            {isReviewLimited && ctaRec.category === 'review' ? '🔒 Daily Limit Reached' : ctaRec.label}
                        </span>
                    </div>
                    <span className="text-xs ui text-[var(--color-gold)] font-medium shrink-0 ml-2">
                        {isReviewLimited && ctaRec.category === 'review' ? 'Upgrade' : 'Go'}
                    </span>
                </motion.button>
                {!isPremium && ctaRec.category === 'review' && !isReviewLimited && reviewsRemaining != null && (
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 text-center -mt-2 mb-2">
                        {reviewsRemaining} free review{reviewsRemaining === 1 ? '' : 's'} remaining today
                    </div>
                )}
                </>
            )}

            {/* ── Remaining study plan items (compact) ── */}
            {otherRecs.length > 0 && (
                <section className="mb-4 space-y-2">
                    <h3 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-1">Study Plan</h3>
                    {otherRecs.map(rec => (
                        <RecCard key={rec.category} rec={rec} onPractice={handleRecPractice} />
                    ))}
                </section>
            )}

            {/* Difficulty nudge */}
            {difficultyNudge && onPractice && (
                <button
                    onClick={() => onPractice(difficultyNudge.nextCategory)}
                    className="w-full flex items-center gap-3 py-3 px-4 mb-4 rounded-xl bg-[var(--color-correct)]/5 border border-[var(--color-correct)]/20 hover:bg-[var(--color-correct)]/10 transition-colors"
                >
                    <span className="text-base shrink-0">&#9889;</span>
                    <div className="flex-1 min-w-0">
                        <span className="text-sm ui font-medium text-[rgb(var(--color-fg))]/70">Ready for harder words!</span>
                        <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40 ml-1.5">
                            {Math.round(difficultyNudge.accuracy * 100)}% on {difficultyNudge.wordCount} words
                        </span>
                    </div>
                    <span className="text-[10px] ui text-[var(--color-correct)] shrink-0 font-medium">{difficultyNudge.nextLabel.split(' ')[0]}</span>
                </button>
            )}

            {/* Study Tools */}
            {totalWords > 0 && (
                <section className="mb-4">
                    <h3 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Study Tools</h3>
                    <div className="flex gap-2">
                        {([
                            { tab: 'words' as StudyTab, Icon: IconBook, label: 'Words', desc: `${totalWords} studied` },
                            { tab: 'roots' as StudyTab, Icon: IconTree, label: 'Roots', desc: 'Etymology' },
                            { tab: 'analytics' as StudyTab, Icon: IconChart, label: 'Analytics', desc: 'Report card' },
                        ]).map(t => (
                            <button
                                key={t.tab}
                                onClick={() => setStudyToolsTab(t.tab)}
                                className="flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/10 hover:border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/5 transition-colors"
                            >
                                <t.Icon className="w-5 h-5 text-[rgb(var(--color-fg))]/50" />
                                <span className="text-[11px] ui text-[rgb(var(--color-fg))]/60 font-medium">{t.label}</span>
                                <span className="text-[9px] ui text-[rgb(var(--color-fg))]/30">{t.desc}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Curriculum — flat 10-level list ── */}
            <section>
                <h3 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Curriculum</h3>
                {levelProgress.map(lp => (
                    <LevelRow
                        key={lp.tierId}
                        lp={lp}
                        onClick={() => handleLevelClick(lp)}
                        locked={isLevelPremium(lp.tierId) && !isPremium}
                    />
                ))}
            </section>

        </div>

        {/* Session picker modal */}
        <AnimatePresence>
            {pickerLevel && (
                <SessionPicker
                    level={pickerLevel}
                    onPick={handleSessionPick}
                    onClose={() => setPickerLevel(null)}
                />
            )}
        </AnimatePresence>

        {/* Study Tools Modal */}
        <AnimatePresence>
            {studyToolsTab && (
                <StudyToolsModal
                    records={records}
                    onClose={() => setStudyToolsTab(null)}
                    defaultTab={studyToolsTab}
                    onDrillRoot={onDrillRoot ? (rootId) => {
                        setStudyToolsTab(null);
                        onDrillRoot(rootId);
                    } : undefined}
                    rootMastery={rootMasteryMap}
                />
            )}
        </AnimatePresence>
        </>
    );
});
