/**
 * components/PathPage.tsx
 *
 * Study Dashboard — the "Path" tab. Shows study plan recommendations,
 * competition training shortcuts, a Study Tools button, and the 14-phase
 * curriculum with mastery gates and progress bars.
 */
import { memo, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { WordRecord } from '../hooks/useWordHistory';
import { evaluateCurriculum } from '../domains/spelling/curriculum';
import { getStudyPlan, getMistakeInsights, getGradeLevelProgress, getDifficultyNudge, type PracticeRecommendation } from '../utils/errorPatterns';
import { SPELLING_CATEGORIES } from '../domains/spelling/spellingCategories';
import { StudyToolsModal, type StudyTab } from './StudyToolsModal';

interface Props {
    records: Record<string, WordRecord>;
    onPractice?: (category: string) => void;
    reviewDueCount?: number;
    hardestWordCount?: number;
    onDrillHardest?: () => void;
    gradeLabel?: string;
}

// ── Recommendation card (same pattern as StudyAnalyticsModal) ────────────────

const PRIORITY_STYLES: Record<string, { badge: string; border: string; text: string }> = {
    review: { badge: 'bg-[var(--color-wrong)]/15 text-[var(--color-wrong)]', border: 'border-[var(--color-wrong)]/20', text: 'Due' },
    weak: { badge: 'bg-[var(--color-gold)]/15 text-[var(--color-gold)]', border: 'border-[var(--color-gold)]/20', text: 'Weak' },
    explore: { badge: 'bg-[var(--color-correct)]/15 text-[var(--color-correct)]', border: 'border-[var(--color-correct)]/20', text: 'New' },
};

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

// ── Competition categories (static) ─────────────────────────────────────────

const COMPETITION_CATS = SPELLING_CATEGORIES.filter(c => c.group === 'competition');

// ── Main component ───────────────────────────────────────────────────────────

export const PathPage = memo(function PathPage({ records, onPractice, reviewDueCount = 0, hardestWordCount = 0, onDrillHardest, gradeLabel }: Props) {
    const curriculum = useMemo(() => evaluateCurriculum(records), [records]);
    const recommendations = useMemo(() => getStudyPlan(records, reviewDueCount), [records, reviewDueCount]);
    const mistakeInsights = useMemo(() => getMistakeInsights(records), [records]);
    const gradeProgress = useMemo(() => getGradeLevelProgress(records), [records]);
    const difficultyNudge = useMemo(() => getDifficultyNudge(records), [records]);

    const recordArr = useMemo(() => Object.values(records), [records]);
    const totalMastered = useMemo(() => recordArr.filter(r => r.box >= 3).length, [recordArr]);
    const totalAttempts = useMemo(() => recordArr.reduce((s, r) => s + r.attempts, 0), [recordArr]);
    const totalCorrect = useMemo(() => recordArr.reduce((s, r) => s + r.correct, 0), [recordArr]);
    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    // Study Tools modal
    const [studyToolsTab, setStudyToolsTab] = useState<StudyTab | null>(null);

    const totalWords = Object.keys(records).length;

    return (
        <>
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top,12px)+16px)] pb-4">
            {/* Header */}
            <h2 className="text-xl ui font-bold text-[var(--color-gold)] text-center mb-1">
                Path to Champion
            </h2>
            <div className="flex justify-center gap-4 text-[10px] ui text-[rgb(var(--color-fg))]/40 mb-4">
                {gradeLabel && <span>{gradeLabel}</span>}
                <span>{totalMastered} mastered</span>
                <span>{accuracy}% accuracy</span>
                {reviewDueCount > 0 && (
                    <span className="text-[var(--color-wrong)]">{reviewDueCount} due</span>
                )}
            </div>

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

            {/* Study plan recommendations */}
            {recommendations.length > 0 && (
                <section className="mb-4 space-y-2">
                    <h3 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-1">Study Plan</h3>
                    {recommendations.map(rec => (
                        <RecCard key={rec.category} rec={rec} onPractice={onPractice} />
                    ))}
                </section>
            )}

            {/* Mistake pattern insights */}
            {mistakeInsights.length > 0 && (
                <section className="mb-4 space-y-1.5">
                    <h3 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-1">Your Patterns</h3>
                    {mistakeInsights.map(ins => (
                        <div key={ins.label} className="flex items-start gap-2.5 py-2 px-3 rounded-xl bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/15">
                            <span className="text-sm shrink-0 mt-0.5">&#128269;</span>
                            <div className="min-w-0">
                                <div className="text-sm ui text-[rgb(var(--color-fg))]/70 font-medium">{ins.label} <span className="text-[10px] text-[rgb(var(--color-fg))]/30">({ins.count}x)</span></div>
                                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 mt-0.5">{ins.detail}</div>
                            </div>
                        </div>
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

            {/* Hardest Words quick drill */}
            {hardestWordCount > 0 && onDrillHardest && (
                <button
                    onClick={onDrillHardest}
                    className="w-full flex items-center gap-3 py-3 px-4 mb-4 rounded-xl bg-[var(--color-wrong)]/5 border border-[var(--color-wrong)]/20 hover:bg-[var(--color-wrong)]/10 transition-colors"
                >
                    <span className="text-base shrink-0">&#9888;&#65039;</span>
                    <div className="flex-1 min-w-0">
                        <span className="text-sm ui font-medium text-[rgb(var(--color-fg))]/70">My Hardest Words</span>
                        <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40 ml-1.5">
                            {hardestWordCount} word{hardestWordCount === 1 ? '' : 's'} below 50%
                        </span>
                    </div>
                    <span className="text-[10px] ui text-[var(--color-gold)] shrink-0">Drill</span>
                </button>
            )}

            {/* Competition Training */}
            {onPractice && (
                <section className="mb-4">
                    <h3 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Competition Training</h3>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {COMPETITION_CATS.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => onPractice(cat.id)}
                                className="shrink-0 flex flex-col items-center gap-1.5 py-3 px-4 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/10 hover:border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/5 transition-colors min-w-[72px]"
                            >
                                <span className="text-[rgb(var(--color-fg))]/50">{cat.icon}</span>
                                <span className="text-[10px] ui text-[rgb(var(--color-fg))]/50">{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </section>
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

            {/* Grade-level progress */}
            {gradeProgress.length > 0 && (
                <section className="mb-4">
                    <h3 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Grade Progress</h3>
                    <div className="space-y-2">
                        {gradeProgress.map(g => (
                            <div key={g.gradeId} className="px-3 py-2 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/5">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] ui text-[rgb(var(--color-fg))]/60 font-medium">{g.label} <span className="text-[rgb(var(--color-fg))]/30">{g.grades}</span></span>
                                    <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40 tabular-nums">{g.masteredWords}/{g.totalWords}</span>
                                </div>
                                <div className="h-1.5 bg-[rgb(var(--color-fg))]/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-[var(--color-gold)] transition-all"
                                        style={{ width: `${Math.round(g.progress * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Curriculum phases */}
            <section>
                <h3 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Curriculum</h3>
                <div className="space-y-2">
                    {curriculum.phases.map((pp, i) => {
                        const isCurrent = i === curriculum.currentPhaseIndex;
                        const isComplete = pp.unlocked && pp.masteredWords >= pp.phase.masteryGate && pp.accuracy >= pp.phase.accuracyGate;
                        const isLocked = !pp.unlocked;

                        return (
                            <div
                                key={pp.phase.id}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${
                                    isCurrent
                                        ? 'bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30'
                                        : isComplete
                                        ? 'bg-[var(--color-correct)]/5 border border-[var(--color-correct)]/15'
                                        : 'bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/5'
                                }`}
                            >
                                {/* Status icon */}
                                <span className={`text-base shrink-0 ${
                                    isComplete ? 'text-[var(--color-correct)]' :
                                    isCurrent ? 'text-[var(--color-gold)]' :
                                    'text-[rgb(var(--color-fg))]/20'
                                }`}>
                                    {isComplete ? '\u2713' : isLocked ? '\uD83D\uDD12' : '\u25B6'}
                                </span>

                                {/* Phase info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm ui font-medium ${
                                            isCurrent ? 'text-[var(--color-gold)]' :
                                            isComplete ? 'text-[var(--color-correct)]' :
                                            isLocked ? 'text-[rgb(var(--color-fg))]/30' :
                                            'text-[rgb(var(--color-fg))]/60'
                                        }`}>
                                            {pp.phase.name}
                                        </span>
                                        <span className={`text-[10px] ui ${
                                            isLocked ? 'text-[rgb(var(--color-fg))]/15' : 'text-[rgb(var(--color-fg))]/30'
                                        }`}>
                                            {pp.phase.description}
                                        </span>
                                    </div>

                                    {/* Progress bar */}
                                    {!isLocked && (
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <div className="flex-1 h-1.5 bg-[rgb(var(--color-fg))]/10 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        isComplete ? 'bg-[var(--color-correct)]' :
                                                        isCurrent ? 'bg-[var(--color-gold)]' :
                                                        'bg-[rgb(var(--color-fg))]/20'
                                                    }`}
                                                    style={{ width: `${Math.round(pp.progress * 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30 shrink-0 tabular-nums">
                                                {pp.masteredWords}/{pp.phase.masteryGate}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Go button on current phase */}
                                {isCurrent && onPractice && pp.phase.categories[0] && (
                                    <button
                                        onClick={() => onPractice(pp.phase.categories[0])}
                                        className="shrink-0 px-3 py-1.5 rounded-xl text-xs ui font-medium text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-colors"
                                    >
                                        Practice
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>

        {/* Study Tools Modal */}
        <AnimatePresence>
            {studyToolsTab && (
                <StudyToolsModal
                    records={records}
                    onClose={() => setStudyToolsTab(null)}
                    defaultTab={studyToolsTab}
                />
            )}
        </AnimatePresence>
        </>
    );
});
