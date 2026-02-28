/**
 * components/PathPage.tsx
 *
 * Study Dashboard — the "Path" tab. Shows a single clear CTA,
 * compact study plan, and accordion-style curriculum grouped by tier.
 */
import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WordRecord } from '../hooks/useWordHistory';
import { evaluateCurriculum, type PhaseProgress } from '../domains/spelling/curriculum';
import { getStudyPlan, getDifficultyNudge, type PracticeRecommendation } from '../utils/errorPatterns';
import { StudyToolsModal, type StudyTab } from './StudyToolsModal';
import { WORD_ROOTS } from '../domains/spelling/words/roots';
import { computeRootMastery } from '../domains/spelling/words/rootUtils';

interface Props {
    records: Record<string, WordRecord>;
    onPractice?: (category: string) => void;
    reviewDueCount?: number;
    hardestWordCount?: number;
    onDrillHardest?: () => void;
    onDrillRoot?: (rootId: string) => void;
}

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
    return (
        <div className={`flex items-center justify-between py-2 px-3 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border ${style.border}`}>
            <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] ui px-1.5 py-0.5 rounded-full font-semibold ${style.badge}`}>
                        {style.text}
                    </span>
                    <span className="text-sm ui text-[rgb(var(--color-fg))]/70 font-medium">{rec.label}</span>
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
    );
}

// ── Tier group labels ───────────────────────────────────────────────────────

const TIER_LABELS: Record<string, { label: string; grades: string }> = {
    'tier-1': { label: 'Seedling', grades: 'K \u2013 1st' },
    'tier-2': { label: 'Sprout', grades: '2nd \u2013 3rd' },
    'tier-3': { label: 'Growing', grades: '4th \u2013 5th' },
    'tier-4': { label: 'Climbing', grades: '6th \u2013 8th' },
    'tier-5': { label: 'Summit', grades: '8th+' },
};

interface TierGroup {
    grade: string;
    label: string;
    grades: string;
    phases: Array<PhaseProgress & { index: number }>;
    /** Is the current active phase inside this tier? */
    isCurrent: boolean;
    /** Are all phases in this tier complete? */
    isComplete: boolean;
    /** Are all phases locked? */
    isLocked: boolean;
    /** 0-1 progress across the tier's mastery gates */
    progress: number;
}

function groupByTier(phases: PhaseProgress[], currentPhaseIndex: number): TierGroup[] {
    const groups = new Map<string, TierGroup>();

    phases.forEach((pp, i) => {
        const g = pp.phase.grade;
        if (!groups.has(g)) {
            const info = TIER_LABELS[g] ?? { label: g, grades: '' };
            groups.set(g, {
                grade: g,
                label: info.label,
                grades: info.grades,
                phases: [],
                isCurrent: false,
                isComplete: true,
                isLocked: true,
                progress: 0,
            });
        }
        const group = groups.get(g)!;
        group.phases.push({ ...pp, index: i });
        if (i === currentPhaseIndex) group.isCurrent = true;
        if (pp.unlocked) group.isLocked = false;
        const phaseComplete = pp.unlocked && pp.masteredWords >= pp.phase.masteryGate && pp.accuracy >= pp.phase.accuracyGate;
        if (!phaseComplete) group.isComplete = false;
    });

    // Compute tier-level progress: average of phase progresses within the tier
    for (const group of groups.values()) {
        const lastPhase = group.phases[group.phases.length - 1];
        group.progress = lastPhase ? lastPhase.progress : 0;
    }

    return Array.from(groups.values());
}

// ── Accordion tier header ───────────────────────────────────────────────────

function TierAccordion({ group, expanded, onToggle, onPractice }: {
    group: TierGroup;
    expanded: boolean;
    onToggle: () => void;
    onPractice?: (category: string) => void;
}) {
    return (
        <div className="mb-2">
            {/* Header row */}
            <button
                onClick={onToggle}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors relative overflow-hidden ${
                    group.isCurrent
                        ? 'bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30'
                        : group.isComplete
                        ? 'bg-[var(--color-correct)]/5 border border-[var(--color-correct)]/15'
                        : group.isLocked
                        ? 'bg-[rgb(var(--color-fg))]/[0.02] border border-[rgb(var(--color-fg))]/5'
                        : 'bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8'
                }`}
            >
                {/* Subtle progress bar at bottom of header */}
                {!group.isLocked && group.progress > 0 && group.progress < 1 && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[rgb(var(--color-fg))]/5">
                        <div
                            className={`h-full transition-all ${group.isCurrent ? 'bg-[var(--color-gold)]/60' : 'bg-[var(--color-correct)]/40'}`}
                            style={{ width: `${Math.round(group.progress * 100)}%` }}
                        />
                    </div>
                )}

                {/* Status icon */}
                <span className={`text-base shrink-0 ${
                    group.isComplete ? 'text-[var(--color-correct)]' :
                    group.isCurrent ? 'text-[var(--color-gold)]' :
                    group.isLocked ? 'text-[rgb(var(--color-fg))]/15' :
                    'text-[rgb(var(--color-fg))]/25'
                }`}>
                    {group.isComplete ? '\u2713' : group.isLocked ? '\uD83D\uDD12' : '\u25B6'}
                </span>

                {/* Tier label */}
                <div className="flex-1 min-w-0 text-left">
                    <span className={`text-sm ui font-medium ${
                        group.isCurrent ? 'text-[var(--color-gold)]' :
                        group.isComplete ? 'text-[var(--color-correct)]' :
                        group.isLocked ? 'text-[rgb(var(--color-fg))]/25' :
                        'text-[rgb(var(--color-fg))]/60'
                    }`}>
                        {group.label}
                    </span>
                    <span className={`text-[10px] ui ml-1.5 ${
                        group.isLocked ? 'text-[rgb(var(--color-fg))]/12' : 'text-[rgb(var(--color-fg))]/30'
                    }`}>
                        {group.grades}
                    </span>
                </div>

                {/* Chevron */}
                <span className={`text-[rgb(var(--color-fg))]/30 text-xs transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
                    {'\u25B6'}
                </span>
            </button>

            {/* Expandable phase list */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        <div className="pl-4 pt-1.5 space-y-1.5">
                            {group.phases.map(pp => {
                                const isComplete = pp.unlocked && pp.masteredWords >= pp.phase.masteryGate && pp.accuracy >= pp.phase.accuracyGate;
                                const isLocked = !pp.unlocked;
                                const isCurrent = group.isCurrent && pp.index === group.phases.find(p =>
                                    p.unlocked && p.masteredWords < p.phase.masteryGate)?.index;

                                return (
                                    <div
                                        key={pp.phase.id}
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${
                                            isCurrent ? 'bg-[var(--color-gold)]/5' : ''
                                        }`}
                                    >
                                        <span className={`text-xs shrink-0 ${
                                            isComplete ? 'text-[var(--color-correct)]' :
                                            isCurrent ? 'text-[var(--color-gold)]' :
                                            'text-[rgb(var(--color-fg))]/15'
                                        }`}>
                                            {isComplete ? '\u2713' : isLocked ? '\uD83D\uDD12' : '\u25B6'}
                                        </span>

                                        <div className="flex-1 min-w-0">
                                            <span className={`text-xs ui font-medium ${
                                                isCurrent ? 'text-[var(--color-gold)]' :
                                                isComplete ? 'text-[var(--color-correct)]/80' :
                                                isLocked ? 'text-[rgb(var(--color-fg))]/20' :
                                                'text-[rgb(var(--color-fg))]/50'
                                            }`}>
                                                {pp.phase.name}
                                            </span>
                                            <span className={`text-[9px] ui ml-1.5 ${
                                                isLocked ? 'text-[rgb(var(--color-fg))]/10' : 'text-[rgb(var(--color-fg))]/25'
                                            }`}>
                                                {pp.phase.description}
                                            </span>

                                            {!isLocked && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex-1 h-1 bg-[rgb(var(--color-fg))]/8 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${
                                                                isComplete ? 'bg-[var(--color-correct)]' :
                                                                isCurrent ? 'bg-[var(--color-gold)]' :
                                                                'bg-[rgb(var(--color-fg))]/15'
                                                            }`}
                                                            style={{ width: `${Math.round(pp.progress * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] ui text-[rgb(var(--color-fg))]/25 shrink-0 tabular-nums">
                                                        {pp.masteredWords}/{pp.phase.masteryGate}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {isCurrent && onPractice && pp.phase.categories[0] && (
                                            <button
                                                onClick={() => onPractice(pp.phase.categories[0])}
                                                className="shrink-0 px-2.5 py-1 rounded-lg text-[9px] ui font-medium text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-colors"
                                            >
                                                Go
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Main component ───────────────────────────────────────────────────────────

export const PathPage = memo(function PathPage({ records, onPractice, reviewDueCount = 0, hardestWordCount = 0, onDrillHardest, onDrillRoot }: Props) {
    const curriculum = useMemo(() => evaluateCurriculum(records), [records]);
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

    // Accordion: expand the tier containing the current phase by default
    const tierGroups = useMemo(() => groupByTier(curriculum.phases, curriculum.currentPhaseIndex), [curriculum]);
    const currentTierGrade = curriculum.phases[curriculum.currentPhaseIndex]?.phase.grade ?? '';
    const [expandedTier, setExpandedTier] = useState<string | null>(currentTierGrade);

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
                    <p className="text-[10px] ui text-[rgb(var(--color-fg))]/30 max-w-[240px]">
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

            {/* ── Curriculum (accordion by tier) ── */}
            <section>
                <h3 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Curriculum</h3>
                {tierGroups.map(group => (
                    <TierAccordion
                        key={group.grade}
                        group={group}
                        expanded={expandedTier === group.grade}
                        onToggle={() => setExpandedTier(prev => prev === group.grade ? null : group.grade)}
                        onPractice={onPractice}
                    />
                ))}
            </section>
        </div>

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
