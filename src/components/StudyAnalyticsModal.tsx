/**
 * components/StudyAnalyticsModal.tsx
 *
 * Shows personalized coaching cards, error patterns, and category trends.
 * Sub-tabs: Overview | Patterns | Origins | Themes.
 * Opens from tapping the accuracy stat on MePage or from Study Tools on PathPage.
 */
import { memo, useMemo, useState } from 'react';
import type { WordRecord } from '../hooks/useWordHistory';
import {
    getCategoryAccuracy,
    getPatternAccuracy,
    getOriginAccuracy,
    getThemeAccuracy,
    getCoachingCards,
    type AccuracyBar,
    type CoachingCard,
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

const CARD_STYLES: Record<CoachingCard['type'], { icon: string; border: string; bg: string; accent: string }> = {
    improved: { icon: '\u2728', border: 'border-[var(--color-correct)]/25', bg: 'bg-[var(--color-correct)]/5', accent: 'text-[var(--color-correct)]' },
    trap:     { icon: '\u26A0\uFE0F', border: 'border-[var(--color-gold)]/25', bg: 'bg-[var(--color-gold)]/5', accent: 'text-[var(--color-gold)]' },
    weakness: { icon: '\uD83C\uDFAF', border: 'border-[var(--color-wrong)]/25', bg: 'bg-[var(--color-wrong)]/5', accent: 'text-[var(--color-wrong)]' },
    levelup:  { icon: '\uD83D\uDE80', border: 'border-[var(--color-timed)]/25', bg: 'bg-[var(--color-timed)]/5', accent: 'text-[var(--color-timed)]' },
};

function CoachingCardView({ card, onPractice }: { card: CoachingCard; onPractice?: (category: string) => void }) {
    const style = CARD_STYLES[card.type];
    return (
        <div className={`rounded-xl px-4 py-3 ${style.bg} border ${style.border}`}>
            <div className="flex items-start gap-2.5">
                <span className="text-base shrink-0 mt-0.5">{style.icon}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-sm ui font-bold ${style.accent}`}>{card.title}</span>
                        {card.stat && (
                            <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30 shrink-0">{card.stat}</span>
                        )}
                    </div>
                    <p className="text-xs ui text-[rgb(var(--color-fg))]/50 mt-0.5">{card.detail}</p>
                    {card.tip && (
                        <p className="text-[10px] ui text-[rgb(var(--color-fg))]/35 italic mt-1">{card.tip}</p>
                    )}
                    {card.cta && onPractice && (
                        <button
                            onClick={() => onPractice(card.cta!.category)}
                            className="mt-2 px-3 py-1 rounded-lg text-[10px] ui font-medium text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-colors"
                        >
                            {card.cta.label}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

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

interface AnalyticsContentProps {
    records: Record<string, WordRecord>;
    onPractice?: (category: string) => void;
}

export const AnalyticsContent = memo(function AnalyticsContent({ records, onPractice }: AnalyticsContentProps) {
    const [tab, setTab] = useState<AnalyticsTab>('overview');

    const coachingCards = useMemo(() => getCoachingCards(records), [records]);
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
                    {/* Coaching cards */}
                    {coachingCards.length > 0 && (
                        <section className="mb-4 space-y-2.5">
                            <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-1">Your Coach</h4>
                            {coachingCards.map(card => (
                                <CoachingCardView key={card.id} card={card} onPractice={onPractice} />
                            ))}
                        </section>
                    )}

                    {/* No coaching cards yet — early encouragement */}
                    {coachingCards.length === 0 && (
                        <div className="text-center py-4 mb-4">
                            <p className="text-sm ui text-[rgb(var(--color-fg))]/50">Keep practicing! Personalized tips will appear as you learn more words.</p>
                        </div>
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
