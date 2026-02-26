/**
 * components/StudyAnalyticsModal.tsx
 *
 * Shows error patterns, per-word accuracy, and category trends.
 * Sub-tabs: Overview | Patterns | Origins | Themes.
 * Opens from tapping the accuracy stat on MePage.
 */
import { memo, useMemo, useState } from 'react';
import type { WordRecord } from '../hooks/useWordHistory';
import { ModalShell } from './ModalShell';
import {
    getErrorPatterns,
    getCategoryAccuracy,
    getWordDrillDown,
    getPatternAccuracy,
    getOriginAccuracy,
    getThemeAccuracy,
    getStudyPlan,
    type AccuracyBar,
    type PracticeRecommendation,
} from '../utils/errorPatterns';
import { printStudySheet } from '../utils/printStudySheet';
import { getWordMap } from '../domains/spelling/words';
import { evaluateCurriculum } from '../domains/spelling/curriculum';

interface Props {
    records: Record<string, WordRecord>;
    onClose: () => void;
    onPractice?: (category: string) => void;
    /** Number of words due for Leitner review right now */
    reviewDueCount?: number;
}

type AnalyticsTab = 'overview' | 'curriculum' | 'patterns' | 'origins' | 'themes';

const BOX_LABELS = ['New', 'Learning', 'Reviewing', 'Almost', 'Mastered'];
const TABS: { id: AnalyticsTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'curriculum', label: 'Path' },
    { id: 'patterns', label: 'Patterns' },
    { id: 'origins', label: 'Origins' },
    { id: 'themes', label: 'Themes' },
];

function AccuracyBarRow({ bar }: { bar: AccuracyBar }) {
    return (
        <div className="mb-2">
            <div className="flex justify-between text-xs ui text-[rgb(var(--color-fg))]/60 mb-0.5">
                <span>{bar.label}</span>
                <span>{Math.round(bar.accuracy * 100)}% ({bar.attempts})</span>
            </div>
            <div className="h-1.5 bg-[rgb(var(--color-fg))]/10 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${
                        bar.accuracy >= 0.8 ? 'bg-[var(--color-correct)]' :
                        bar.accuracy >= 0.5 ? 'bg-[var(--color-gold)]' :
                        'bg-[var(--color-wrong)]'
                    }`}
                    style={{ width: `${Math.round(bar.accuracy * 100)}%` }}
                />
            </div>
        </div>
    );
}

const PRIORITY_STYLES: Record<string, { badge: string; border: string; text: string }> = {
    review: { badge: 'bg-[var(--color-wrong)]/15 text-[var(--color-wrong)]', border: 'border-[var(--color-wrong)]/20', text: 'Due' },
    weak: { badge: 'bg-[var(--color-gold)]/15 text-[var(--color-gold)]', border: 'border-[var(--color-gold)]/20', text: 'Weak' },
    explore: { badge: 'bg-[var(--color-correct)]/15 text-[var(--color-correct)]', border: 'border-[var(--color-correct)]/20', text: 'New' },
};

function RecommendationCard({ rec, onPractice }: { rec: PracticeRecommendation; onPractice?: (category: string) => void }) {
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

export const StudyAnalyticsModal = memo(function StudyAnalyticsModal({ records, onClose, onPractice, reviewDueCount = 0 }: Props) {
    const [tab, setTab] = useState<AnalyticsTab>('overview');

    const errorPatterns = useMemo(() => getErrorPatterns(records), [records]);
    const categoryAccuracy = useMemo(() => getCategoryAccuracy(records), [records]);
    const wordDrillDown = useMemo(() => getWordDrillDown(records), [records]);
    const patternAccuracy = useMemo(() => getPatternAccuracy(records), [records]);
    const originAccuracy = useMemo(() => getOriginAccuracy(records), [records]);
    const themeAccuracy = useMemo(() => getThemeAccuracy(records), [records]);
    const recommendations = useMemo(() => getStudyPlan(records, reviewDueCount), [records, reviewDueCount]);
    const curriculum = useMemo(() => evaluateCurriculum(records), [records]);

    const totalWords = Object.keys(records).length;

    return (
        <ModalShell onClose={onClose}>
                <div className="flex items-center justify-between mb-3">
                    <div className="w-8" />
                    <h3 className="text-lg chalk text-[var(--color-gold)]">Study Analytics</h3>
                    {totalWords > 0 ? (
                        <button
                            onClick={() => printStudySheet('Study Analytics', Object.values(records), getWordMap())}
                            className="w-8 text-center text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/60 transition-colors text-sm"
                            title="Print"
                        >
                            🖨️
                        </button>
                    ) : <div className="w-8" />}
                </div>

                {totalWords === 0 ? (
                    <div className="text-center text-sm ui text-[rgb(var(--color-fg))]/40 py-8">
                        Play some rounds to see your analytics!
                    </div>
                ) : (
                    <>
                        {/* Sub-tab bar */}
                        <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-none">
                            {TABS.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id)}
                                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] ui transition-colors ${
                                        tab === t.id
                                            ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)] font-semibold'
                                            : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Overview */}
                        <div className="flex justify-between text-xs ui text-[rgb(var(--color-fg))]/50 mb-3">
                            <span>{totalWords} words attempted</span>
                            <span>{Object.values(records).filter(r => r.box >= 4).length} mastered</span>
                        </div>

                        {/* ── OVERVIEW TAB ── */}
                        {tab === 'overview' && (
                            <>
                                {/* Study Plan */}
                                {recommendations.length > 0 && (
                                    <section className="mb-4 space-y-2">
                                        <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-1">Study Plan</h4>
                                        {recommendations.map(rec => (
                                            <RecommendationCard key={rec.category} rec={rec} onPractice={onPractice} />
                                        ))}
                                    </section>
                                )}

                                {/* Error Patterns */}
                                {errorPatterns.length > 0 && (
                                    <section className="mb-4">
                                        <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Needs Practice</h4>
                                        {errorPatterns.slice(0, 3).map(p => (
                                            <div key={p.category} className="flex items-center justify-between py-1.5">
                                                <span className="text-sm ui text-[rgb(var(--color-fg))]/70">{p.category}</span>
                                                <span className="text-sm ui text-[var(--color-wrong)]">
                                                    {Math.round(p.errorRate * 100)}% error rate
                                                </span>
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {/* Category Accuracy */}
                                {categoryAccuracy.length > 0 && (
                                    <section className="mb-4">
                                        <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Category Accuracy</h4>
                                        {categoryAccuracy.map(c => (
                                            <div key={c.category} className="mb-2">
                                                <div className="flex justify-between text-xs ui text-[rgb(var(--color-fg))]/60 mb-0.5">
                                                    <span>{c.category}</span>
                                                    <span>{Math.round(c.accuracy * 100)}% ({c.attempts})</span>
                                                </div>
                                                <div className="h-1.5 bg-[rgb(var(--color-fg))]/10 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            c.accuracy >= 0.8 ? 'bg-[var(--color-correct)]' :
                                                            c.accuracy >= 0.5 ? 'bg-[var(--color-gold)]' :
                                                            'bg-[var(--color-wrong)]'
                                                        }`}
                                                        style={{ width: `${Math.round(c.accuracy * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {/* Word Drill-Down */}
                                {wordDrillDown.length > 0 && (
                                    <section className="mb-2">
                                        <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Words</h4>
                                        <div className="max-h-[200px] overflow-y-auto">
                                            {wordDrillDown.slice(0, 30).map(w => (
                                                <div key={w.word} className="flex items-center justify-between py-1 border-b border-[rgb(var(--color-fg))]/5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm chalk text-[var(--color-chalk)]">{w.word}</span>
                                                        <span className="text-[9px] ui text-[rgb(var(--color-fg))]/25">
                                                            {BOX_LABELS[w.box] ?? 'New'}
                                                        </span>
                                                    </div>
                                                    <span className={`text-xs ui ${
                                                        w.accuracy >= 0.8 ? 'text-[var(--color-correct)]' :
                                                        w.accuracy >= 0.5 ? 'text-[var(--color-gold)]' :
                                                        'text-[var(--color-wrong)]'
                                                    }`}>
                                                        {Math.round(w.accuracy * 100)}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </>
                        )}

                        {/* ── CURRICULUM TAB ── */}
                        {tab === 'curriculum' && (
                            <section className="space-y-1.5">
                                <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">
                                    Your Path to Champion
                                </h4>
                                {curriculum.phases.map((pp, i) => {
                                    const isCurrent = i === curriculum.currentPhaseIndex;
                                    const isComplete = pp.unlocked && pp.masteredWords >= pp.phase.masteryGate && pp.accuracy >= pp.phase.accuracyGate;
                                    const isLocked = !pp.unlocked;
                                    return (
                                        <div
                                            key={pp.phase.id}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                                                isCurrent
                                                    ? 'bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30'
                                                    : isComplete
                                                    ? 'bg-[var(--color-correct)]/5 border border-[var(--color-correct)]/15'
                                                    : 'bg-[rgb(var(--color-fg))]/[0.02] border border-[rgb(var(--color-fg))]/5'
                                            }`}
                                        >
                                            <span className="text-sm shrink-0">
                                                {isComplete ? '\u2713' : isLocked ? '\uD83D\uDD12' : '\u25B6'}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-xs ui font-medium ${
                                                        isCurrent ? 'text-[var(--color-gold)]' :
                                                        isComplete ? 'text-[var(--color-correct)]' :
                                                        'text-[rgb(var(--color-fg))]/40'
                                                    }`}>
                                                        {pp.phase.name}
                                                    </span>
                                                    <span className="text-[9px] ui text-[rgb(var(--color-fg))]/25">
                                                        {pp.phase.description}
                                                    </span>
                                                </div>
                                                {!isLocked && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex-1 h-1 bg-[rgb(var(--color-fg))]/10 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${
                                                                    isComplete ? 'bg-[var(--color-correct)]' :
                                                                    isCurrent ? 'bg-[var(--color-gold)]' :
                                                                    'bg-[rgb(var(--color-fg))]/20'
                                                                }`}
                                                                style={{ width: `${Math.round(pp.progress * 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] ui text-[rgb(var(--color-fg))]/30 shrink-0">
                                                            {pp.masteredWords}/{pp.phase.masteryGate}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            {isCurrent && onPractice && pp.phase.categories[0] && (
                                                <button
                                                    onClick={() => onPractice(pp.phase.categories[0])}
                                                    className="shrink-0 px-2 py-1 rounded-lg text-[9px] ui text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30"
                                                >
                                                    Go
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </section>
                        )}

                        {/* ── PATTERNS TAB ── */}
                        {tab === 'patterns' && (
                            <section>
                                <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Accuracy by Phonics Pattern</h4>
                                {patternAccuracy.length === 0 ? (
                                    <div className="text-center text-xs ui text-[rgb(var(--color-fg))]/30 py-6">
                                        Need more data (3+ attempts per pattern)
                                    </div>
                                ) : (
                                    patternAccuracy.map(bar => <AccuracyBarRow key={bar.key} bar={bar} />)
                                )}
                            </section>
                        )}

                        {/* ── ORIGINS TAB ── */}
                        {tab === 'origins' && (
                            <section>
                                <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Accuracy by Language of Origin</h4>
                                {originAccuracy.length === 0 ? (
                                    <div className="text-center text-xs ui text-[rgb(var(--color-fg))]/30 py-6">
                                        Need more data (3+ attempts per origin)
                                    </div>
                                ) : (
                                    originAccuracy.map(bar => <AccuracyBarRow key={bar.key} bar={bar} />)
                                )}
                            </section>
                        )}

                        {/* ── THEMES TAB ── */}
                        {tab === 'themes' && (
                            <section>
                                <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Accuracy by Theme</h4>
                                {themeAccuracy.length === 0 ? (
                                    <div className="text-center text-xs ui text-[rgb(var(--color-fg))]/30 py-6">
                                        Need more data (3+ attempts per theme)
                                    </div>
                                ) : (
                                    themeAccuracy.map(bar => <AccuracyBarRow key={bar.key} bar={bar} />)
                                )}
                            </section>
                        )}
                    </>
                )}

                <button
                    onClick={onClose}
                    className="w-full mt-3 py-2 text-sm ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                >
                    close
                </button>
        </ModalShell>
    );
});
