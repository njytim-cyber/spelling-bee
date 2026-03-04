/**
 * components/StudyAnalyticsModal.tsx
 *
 * Synthesized "report card" — strengths, areas for improvement, and spelling traps.
 * Updates live as the student plays. No raw data dumps or drill buttons.
 */
import { memo, useMemo } from 'react';
import type { WordRecord } from '../hooks/useWordHistory';
import { getPatternAccuracy, getMistakeInsights, type AccuracyBar } from '../utils/errorPatterns';
import { getWordMap } from '../domains/spelling/words';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Classify words by Leitner box into mastery buckets.
 *  Box 4 with no typed attempts = "familiar" (recognition only, not true mastery). */
function getMasterySnapshot(records: Record<string, WordRecord>) {
    let total = 0, mastered = 0, familiar = 0, reviewing = 0, learning = 0, struggling = 0;
    for (const r of Object.values(records)) {
        total++;
        if (r.box >= 4 && (r.typedAttempts ?? 0) >= 1) mastered++;
        else if (r.box >= 3) familiar++;
        else if (r.box === 2) reviewing++;
        else if (r.attempts >= 3 && r.correct / r.attempts < 0.5) struggling++;
        else learning++;
    }
    return { total, mastered, familiar, reviewing, learning, struggling };
}

/** Split patterns into strengths (≥80%) and weaknesses (<80%). */
function splitPatterns(patterns: AccuracyBar[]): { strengths: AccuracyBar[]; weaknesses: AccuracyBar[] } {
    const strengths: AccuracyBar[] = [];
    const weaknesses: AccuracyBar[] = [];
    for (const p of patterns) {
        if (p.accuracy >= 0.8) strengths.push(p);
        else weaknesses.push(p);
    }
    // Strengths: best first. Weaknesses: worst first (already sorted that way).
    strengths.sort((a, b) => b.accuracy - a.accuracy);
    return { strengths, weaknesses };
}

/** Aggregate MCQ vs Typed accuracy across all word records. */
function getModeBreakdown(records: Record<string, WordRecord>) {
    let mcqAttempts = 0, mcqCorrect = 0, typedAttempts = 0, typedCorrect = 0;
    for (const r of Object.values(records)) {
        mcqAttempts += r.mcqAttempts ?? 0;
        mcqCorrect += r.mcqCorrect ?? 0;
        typedAttempts += r.typedAttempts ?? 0;
        typedCorrect += r.typedCorrect ?? 0;
    }
    return { mcqAttempts, mcqCorrect, typedAttempts, typedCorrect };
}

/** Count how many words in a pattern are progressing (box 2+). */
function patternProgress(records: Record<string, WordRecord>, patternKey: string): { improving: number; total: number } {
    const wordMap = getWordMap();
    let improving = 0, total = 0;
    for (const r of Object.values(records)) {
        const detail = wordMap.get(r.word);
        if (detail?.pattern === patternKey) {
            total++;
            if (r.box >= 2) improving++;
        }
    }
    return { improving, total };
}

// ── Components ───────────────────────────────────────────────────────────────

function SnapshotBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className="flex items-center gap-2">
            <span className="text-[11px] ui text-[rgb(var(--color-fg))]/50 w-20 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-[rgb(var(--color-fg))]/8 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] ui text-[rgb(var(--color-fg))]/35 tabular-nums w-8 text-right shrink-0">{count}</span>
        </div>
    );
}

function PatternRow({ bar, progress }: { bar: AccuracyBar; progress?: { improving: number; total: number } }) {
    const pct = Math.round(bar.accuracy * 100);
    return (
        <div className="flex items-center gap-2 py-1.5">
            <span className="text-xs ui text-[rgb(var(--color-fg))]/60 w-28 shrink-0 truncate">{bar.label}</span>
            <div className="flex-1 h-1 bg-[rgb(var(--color-fg))]/8 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${pct >= 80 ? 'bg-[var(--color-correct)]' : pct >= 50 ? 'bg-[var(--color-gold)]' : 'bg-[var(--color-wrong)]'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-[10px] ui text-[rgb(var(--color-fg))]/35 tabular-nums w-9 text-right shrink-0">{pct}%</span>
            {progress && progress.total > 0 && (
                <span className="text-[9px] ui text-[rgb(var(--color-fg))]/25 w-12 text-right shrink-0">
                    {progress.improving}/{progress.total}
                </span>
            )}
        </div>
    );
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface AnalyticsContentProps {
    records: Record<string, WordRecord>;
    onPractice?: (category: string) => void;
}

export const AnalyticsContent = memo(function AnalyticsContent({ records }: AnalyticsContentProps) {
    const patterns = useMemo(() => getPatternAccuracy(records), [records]);
    const { strengths, weaknesses } = useMemo(() => splitPatterns(patterns), [patterns]);
    const snapshot = useMemo(() => getMasterySnapshot(records), [records]);
    const mistakeInsights = useMemo(() => getMistakeInsights(records), [records]);
    const modeBreakdown = useMemo(() => getModeBreakdown(records), [records]);
    const hasModeData = modeBreakdown.mcqAttempts > 0 || modeBreakdown.typedAttempts > 0;

    // Pre-compute progress for weaknesses
    const weaknessProgress = useMemo(() => {
        const map = new Map<string, { improving: number; total: number }>();
        for (const w of weaknesses) {
            map.set(w.key, patternProgress(records, w.key));
        }
        return map;
    }, [weaknesses, records]);

    const totalWords = Object.keys(records).length;

    if (totalWords === 0) {
        return (
            <div className="text-center text-sm ui text-[rgb(var(--color-fg))]/40 py-8">
                Play some rounds to see your report card!
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Mastery snapshot */}
            <section>
                <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">Overall</h4>
                <div className="space-y-1.5 px-1">
                    <SnapshotBar label="Mastered" count={snapshot.mastered} total={snapshot.total} color="bg-[var(--color-correct)]" />
                    <SnapshotBar label="Familiar" count={snapshot.familiar} total={snapshot.total} color="bg-[var(--color-correct)]/60" />
                    <SnapshotBar label="Reviewing" count={snapshot.reviewing} total={snapshot.total} color="bg-[var(--color-gold)]" />
                    <SnapshotBar label="Learning" count={snapshot.learning} total={snapshot.total} color="bg-[var(--color-gold)]/60" />
                    {snapshot.struggling > 0 && (
                        <SnapshotBar label="Struggling" count={snapshot.struggling} total={snapshot.total} color="bg-[var(--color-wrong)]" />
                    )}
                </div>
                <p className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mt-1.5 px-1">
                    {snapshot.total} word{snapshot.total !== 1 ? 's' : ''} practiced
                </p>
            </section>

            {/* MCQ vs Typed breakdown */}
            {hasModeData && (
                <section>
                    <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-2">By Answer Mode</h4>
                    <div className="space-y-1.5 px-1">
                        {modeBreakdown.mcqAttempts > 0 && (
                            <SnapshotBar label="Swipe" count={modeBreakdown.mcqCorrect} total={modeBreakdown.mcqAttempts} color="bg-[var(--color-gold)]" />
                        )}
                        {modeBreakdown.typedAttempts > 0 && (
                            <SnapshotBar label="Typed" count={modeBreakdown.typedCorrect} total={modeBreakdown.typedAttempts} color="bg-[var(--color-correct)]" />
                        )}
                    </div>
                </section>
            )}

            {/* Strengths */}
            {strengths.length > 0 && (
                <section>
                    <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-1">Strengths</h4>
                    <div className="px-1">
                        {strengths.map(s => (
                            <PatternRow key={s.key} bar={s} />
                        ))}
                    </div>
                </section>
            )}

            {/* Working on */}
            {weaknesses.length > 0 && (
                <section>
                    <div className="flex items-baseline justify-between mb-1">
                        <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider">Working On</h4>
                        <span className="text-[9px] ui text-[rgb(var(--color-fg))]/25">progressing</span>
                    </div>
                    <div className="px-1">
                        {weaknesses.map(w => (
                            <PatternRow key={w.key} bar={w} progress={weaknessProgress.get(w.key)} />
                        ))}
                    </div>
                </section>
            )}

            {/* Spelling traps */}
            {mistakeInsights.length > 0 && (
                <section>
                    <h4 className="text-xs ui text-[rgb(var(--color-fg))]/60 uppercase tracking-wider mb-1.5">Spelling Traps</h4>
                    <div className="space-y-1.5 px-1">
                        {mistakeInsights.map(ins => (
                            <div key={ins.label} className="py-2 px-3 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs ui font-medium text-[rgb(var(--color-fg))]/60">{ins.label}</span>
                                    <span className="text-[9px] ui text-[rgb(var(--color-fg))]/25">{ins.count}x</span>
                                </div>
                                <p className="text-[10px] ui text-[rgb(var(--color-fg))]/40 leading-relaxed">{ins.detail}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Nothing notable yet */}
            {strengths.length === 0 && weaknesses.length === 0 && mistakeInsights.length === 0 && (
                <div className="text-center py-6">
                    <p className="text-sm ui text-[rgb(var(--color-fg))]/50">Keep practicing!</p>
                    <p className="text-[11px] ui text-[rgb(var(--color-fg))]/35 mt-1">
                        Your report card fills in as you learn more words.
                    </p>
                </div>
            )}
        </div>
    );
});
