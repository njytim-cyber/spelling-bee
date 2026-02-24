/**
 * components/StudyAnalyticsModal.tsx
 *
 * Shows error patterns, per-word accuracy, and category trends.
 * Opens from tapping the accuracy stat on MePage.
 */
import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { WordRecord } from '../hooks/useWordHistory';
import { getErrorPatterns, getCategoryAccuracy, getWordDrillDown } from '../utils/errorPatterns';

interface Props {
    records: Record<string, WordRecord>;
    onClose: () => void;
}

const BOX_LABELS = ['New', 'Learning', 'Reviewing', 'Almost', 'Mastered'];

export const StudyAnalyticsModal = memo(function StudyAnalyticsModal({ records, onClose }: Props) {
    const errorPatterns = useMemo(() => getErrorPatterns(records), [records]);
    const categoryAccuracy = useMemo(() => getCategoryAccuracy(records), [records]);
    const wordDrillDown = useMemo(() => getWordDrillDown(records), [records]);

    const totalWords = Object.keys(records).length;
    const masteredWords = Object.values(records).filter(r => r.box >= 4).length;

    return (
        <>
            <motion.div
                className="fixed inset-0 bg-[var(--color-overlay-dim)] z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.div
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--color-overlay)] border border-[rgb(var(--color-fg))]/15 rounded-2xl px-5 py-5 max-h-[80vh] overflow-y-auto w-[340px]"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
            >
                <h3 className="text-lg chalk text-[var(--color-gold)] text-center mb-4">Study Analytics</h3>

                {totalWords === 0 ? (
                    <div className="text-center text-sm ui text-[rgb(var(--color-fg))]/40 py-8">
                        Play some rounds to see your analytics!
                    </div>
                ) : (
                    <>
                        {/* Overview */}
                        <div className="flex justify-between text-xs ui text-[rgb(var(--color-fg))]/50 mb-4">
                            <span>{totalWords} words attempted</span>
                            <span>{masteredWords} mastered</span>
                        </div>

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

                <button
                    onClick={onClose}
                    className="w-full mt-3 py-2 text-sm ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                >
                    close
                </button>
            </motion.div>
        </>
    );
});
