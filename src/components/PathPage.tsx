/**
 * components/PathPage.tsx
 *
 * Study Dashboard — the "Path" tab. Shows a single clear CTA,
 * compact study plan, and flat 10-level curriculum.
 */
import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WordRecord } from '../hooks/useWordHistory';
import { evaluateLevelProgress, type LevelProgress } from '../domains/spelling/curriculum';
import { getStudyPlan, getDifficultyNudge, getPatternAccuracy, type PracticeRecommendation, type AccuracyBar } from '../utils/errorPatterns';
import { StudyToolsModal, type StudyTab } from './StudyToolsModal';
import { WORD_ROOTS } from '../domains/spelling/words/roots';
import { computeRootMastery } from '../domains/spelling/words/rootUtils';
import { wordsByDifficulty, wordsByList, getRegistryVersion, COMPETITION_LISTS } from '../domains/spelling/words';
import type { DifficultyTier } from '../domains/spelling/words/types';
import { levelIcon, type Level } from '../domains/spelling/spellingCategories';

interface Props {
    records: Record<string, WordRecord>;
    onPractice?: (category: string) => void;
    /** Start a structured session: category + word count */
    onStartSession?: (category: string, sessionSize: number) => void;
    reviewDueCount?: number;
    hardestWordCount?: number;
    onDrillHardest?: () => void;
    onDrillRoot?: (rootId: string) => void;
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

function LevelRow({ lp, onClick }: { lp: LevelProgress; onClick: () => void }) {
    const pct = lp.totalWords > 0 ? lp.mastered / lp.totalWords : 0;
    const icon = levelIcon(lp.tierId as Level);

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8 hover:border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/5 transition-colors mb-2"
        >
            {/* Icon */}
            <span className="shrink-0 w-6 h-6 text-[rgb(var(--color-fg))]/50">{icon}</span>

            {/* Label + progress */}
            <div className="flex-1 min-w-0 text-left">
                <div className="flex items-baseline gap-1.5">
                    <span className="text-sm ui font-medium text-[rgb(var(--color-fg))]/70">
                        {lp.label}
                    </span>
                    <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40">
                        {lp.totalWords.toLocaleString()} words
                    </span>
                </div>
                {/* Progress bar */}
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
            </div>

            {/* Play indicator */}
            <span className="text-[rgb(var(--color-fg))]/30 text-xs shrink-0">{'\u25B6'}</span>
        </button>
    );
}

// ── Helper: word count by single difficulty ──────────────────────────────────

function wordCountByDifficulty(diff: DifficultyTier): number {
    return wordsByDifficulty(diff, diff).length;
}

// ── Competition prep cards ─────────────────────────────────────────────────

/** Show featured competition lists: Scripps, State Bee, WOTC tiers */
const FEATURED_LISTS = ['scripps-historical', 'state-bee', 'one-bee', 'two-bee', 'three-bee', 'school-bee-study'];

function CompetitionPrep({ records, registryVersion }: { records: Record<string, WordRecord>; registryVersion: number }) {
    const listStats = useMemo(() => {
        return FEATURED_LISTS.map(listId => {
            const list = COMPETITION_LISTS.find(l => l.id === listId);
            if (!list) return null;
            const words = wordsByList(listId);
            if (words.length === 0) return null;
            const mastered = words.filter(w => {
                const rec = records[w.word.toLowerCase()];
                return rec && rec.box >= 4;
            }).length;
            const attempted = words.filter(w => {
                const rec = records[w.word.toLowerCase()];
                return rec && rec.attempts > 0;
            }).length;
            return { list, total: words.length, mastered, attempted };
        }).filter(Boolean) as Array<{ list: { id: string; name: string; description: string }; total: number; mastered: number; attempted: number }>;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [records, registryVersion]);

    if (listStats.length === 0) return null;

    return (
        <section className="mt-4">
            <h3 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Competition Prep</h3>
            <div className="space-y-2">
                {listStats.map(({ list, total, mastered, attempted }) => {
                    const pct = total > 0 ? Math.round(mastered / total * 100) : 0;
                    return (
                        <div
                            key={list.id}
                            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-sm ui font-medium text-[rgb(var(--color-fg))]/70">{list.name}</span>
                                    <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{total} words</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 h-1 bg-[rgb(var(--color-fg))]/8 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-[var(--color-gold)] transition-all"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] ui text-[rgb(var(--color-fg))]/25 shrink-0 tabular-nums">
                                        {mastered}/{total} ({pct}%)
                                    </span>
                                </div>
                                {attempted > 0 && attempted > mastered && (
                                    <div className="text-[9px] ui text-[rgb(var(--color-fg))]/20 mt-0.5">
                                        {attempted} attempted
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

// ── Weak patterns section ────────────────────────────────────────────────────

function WeakPatterns({ patterns, onPractice }: { patterns: AccuracyBar[]; onPractice?: (category: string) => void }) {
    // Show top 5 weakest patterns (already sorted by accuracy ascending)
    const weak = patterns.filter(p => p.attempts >= 5).slice(0, 5);
    if (weak.length === 0) return null;

    return (
        <section className="mb-4">
            <h3 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Weak Spots</h3>
            <div className="space-y-1.5">
                {weak.map(p => {
                    const pct = Math.round(p.accuracy * 100);
                    const barColor = pct >= 80 ? 'bg-[var(--color-correct)]' : pct >= 60 ? 'bg-[var(--color-gold)]' : 'bg-[var(--color-wrong)]';
                    const tooltip = PATTERN_TOOLTIPS[p.label];
                    return (
                        <div key={p.key} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xs ui text-[rgb(var(--color-fg))]/70 font-medium">{p.label}</span>
                                    <span className="text-[9px] ui text-[rgb(var(--color-fg))]/30">{p.attempts} words</span>
                                    {tooltip && (
                                        <span className="text-[9px] ui text-[rgb(var(--color-fg))]/20" title={tooltip}>?</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="flex-1 h-1 bg-[rgb(var(--color-fg))]/8 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-[9px] ui text-[rgb(var(--color-fg))]/25 shrink-0 tabular-nums w-[30px] text-right">
                                        {pct}%
                                    </span>
                                </div>
                            </div>
                            {onPractice && pct < 80 && (
                                <button
                                    onClick={() => onPractice(p.key)}
                                    className="shrink-0 px-2 py-1 rounded-lg text-[9px] ui text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-colors"
                                >
                                    Drill
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

// ── Main component ───────────────────────────────────────────────────────────

export const PathPage = memo(function PathPage({ records, onPractice, onStartSession, reviewDueCount = 0, hardestWordCount = 0, onDrillHardest, onDrillRoot }: Props) {
    const registryVersion = getRegistryVersion();
    const levelProgress = useMemo(
        () => evaluateLevelProgress(records, wordCountByDifficulty),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [records, registryVersion],
    );
    const recommendations = useMemo(() => getStudyPlan(records, reviewDueCount, hardestWordCount), [records, reviewDueCount, hardestWordCount]);
    const difficultyNudge = useMemo(() => getDifficultyNudge(records), [records]);
    const patternAccuracy = useMemo(() => getPatternAccuracy(records), [records]);

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

    return (
        <>
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top,12px)+16px)] pb-4">
            {/* Header */}
            <h2 className="text-xl ui font-bold text-[var(--color-gold)] text-center mb-1">
                Path to Champion
            </h2>
            <div className="mb-4" />

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
                <motion.button
                    onClick={handleCtaClick}
                    className="w-full flex items-center justify-between py-3.5 px-4 mb-3 rounded-2xl bg-[var(--color-gold)]/10 border-2 border-[var(--color-gold)]/40 hover:bg-[var(--color-gold)]/15 transition-colors"
                    animate={ctaGlow}
                    transition={ctaGlowTransition}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[9px] ui px-1.5 py-0.5 rounded-full font-semibold ${PRIORITY_STYLES[ctaRec.priority ?? 'weak'].badge}`}>
                            {PRIORITY_STYLES[ctaRec.priority ?? 'weak'].text}
                        </span>
                        <span className="text-sm ui text-[var(--color-gold)] font-bold">{ctaRec.label}</span>
                    </div>
                    <span className="text-xs ui text-[var(--color-gold)] font-medium shrink-0 ml-2">Go</span>
                </motion.button>
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
                            { tab: 'words' as StudyTab, icon: '\uD83D\uDCD6', label: 'Words', desc: `${totalWords} studied` },
                            { tab: 'roots' as StudyTab, icon: '\uD83C\uDF33', label: 'Roots', desc: 'Etymology' },
                            { tab: 'analytics' as StudyTab, icon: '\uD83D\uDCCA', label: 'Analytics', desc: 'Patterns' },
                        ]).map(t => (
                            <button
                                key={t.tab}
                                onClick={() => setStudyToolsTab(t.tab)}
                                className="flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/10 hover:border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/5 transition-colors"
                            >
                                <span className="text-base">{t.icon}</span>
                                <span className="text-[11px] ui text-[rgb(var(--color-fg))]/60 font-medium">{t.label}</span>
                                <span className="text-[9px] ui text-[rgb(var(--color-fg))]/30">{t.desc}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Weak patterns dashboard ── */}
            {totalWords >= 10 && <WeakPatterns patterns={patternAccuracy} onPractice={onPractice} />}

            {/* ── Curriculum — flat 10-level list ── */}
            <section>
                <h3 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Curriculum</h3>
                {levelProgress.map(lp => (
                    <LevelRow
                        key={lp.tierId}
                        lp={lp}
                        onClick={() => handleLevelClick(lp)}
                    />
                ))}
            </section>

            {/* ── Competition Prep ── */}
            {totalWords > 0 && <CompetitionPrep records={records} registryVersion={registryVersion} />}
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
                    onPractice={onPractice}
                />
            )}
        </AnimatePresence>
        </>
    );
});
