/**
 * components/StudyAnalyticsModal.tsx
 *
 * Shows error patterns, per-word accuracy, and category trends.
 * Sub-tabs: Overview | Patterns | Origins | Themes.
 * Opens from tapping the accuracy stat on MePage.
 */
import { memo, useMemo, useState } from 'react';
import type { WordRecord } from '../hooks/useWordHistory';
import {
    getErrorPatterns,
    getCategoryAccuracy,
    getPatternAccuracy,
    getOriginAccuracy,
    getThemeAccuracy,
    type AccuracyBar,
} from '../utils/errorPatterns';
import { printStudySheet } from '../utils/printStudySheet';
import { getWordMap } from '../domains/spelling/words';

type AnalyticsTab = 'overview' | 'patterns' | 'origins' | 'themes';

const TABS: { id: AnalyticsTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
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

export const AnalyticsContent = memo(function AnalyticsContent({ records }: { records: Record<string, WordRecord> }) {
    const [tab, setTab] = useState<AnalyticsTab>('overview');

    const errorPatterns = useMemo(() => getErrorPatterns(records), [records]);
    const categoryAccuracy = useMemo(() => getCategoryAccuracy(records), [records]);
    const patternAccuracy = useMemo(() => getPatternAccuracy(records), [records]);
    const originAccuracy = useMemo(() => getOriginAccuracy(records), [records]);
    const themeAccuracy = useMemo(() => getThemeAccuracy(records), [records]);

    const totalWords = Object.keys(records).length;

    if (totalWords === 0) {
        return (
            <div className="text-center text-sm ui text-[rgb(var(--color-fg))]/40 py-8">
                Play some rounds to see your analytics!
            </div>
        );
    }

    return (
        <>
            {/* Print */}
            <div className="flex justify-end mb-2">
                <button
                    onClick={() => printStudySheet('Study Analytics', Object.values(records), getWordMap())}
                    className="text-xs ui text-[rgb(var(--color-fg))]/30 hover:text-[var(--color-gold)] transition-colors"
                >
                    Print
                </button>
            </div>

            {/* Sub-tab bar */}
            <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-none">
                {TABS.map(t => {
                    const hasData = t.id === 'overview' ? true :
                        t.id === 'patterns' ? patternAccuracy.length > 0 :
                        t.id === 'origins' ? originAccuracy.length > 0 :
                        themeAccuracy.length > 0;

                    return (
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
                            {!hasData && <span className="ml-1 text-[8px] text-[rgb(var(--color-fg))]/20">&ndash;&ndash;</span>}
                        </button>
                    );
                })}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {tab === 'overview' && (
                <>
                    {errorPatterns.length > 0 && (
                        <section className="mb-4">
                            <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Needs Practice</h4>
                            {errorPatterns.slice(0, 3).map(p => (
                                <div key={p.category} className="flex items-center justify-between py-1.5">
                                    <div className="min-w-0">
                                        <span className="text-sm ui text-[rgb(var(--color-fg))]/70">{p.category}</span>
                                        <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30 ml-2">
                                            {p.correct}/{p.attempts} correct
                                        </span>
                                    </div>
                                    <span className="text-sm ui text-[var(--color-wrong)] shrink-0">
                                        {Math.round(p.errorRate * 100)}% errors
                                    </span>
                                </div>
                            ))}
                        </section>
                    )}

                    {categoryAccuracy.length > 0 && (
                        <section className="mb-4">
                            <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Category Accuracy</h4>
                            {categoryAccuracy.map(c => (
                                <AccuracyBarRow
                                    key={c.category}
                                    bar={{
                                        label: c.category,
                                        key: c.category,
                                        accuracy: c.accuracy,
                                        attempts: c.attempts,
                                        correct: Math.round(c.accuracy * c.attempts),
                                    }}
                                />
                            ))}
                        </section>
                    )}
                </>
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
    );
});

