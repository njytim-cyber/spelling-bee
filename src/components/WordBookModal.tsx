/**
 * components/WordBookModal.tsx
 *
 * Browsable vocabulary list showing all attempted words with mastery status,
 * accuracy, review schedule, and expandable definitions/pronunciation.
 */
import { memo, useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WordRecord } from '../hooks/useWordHistory';
import { getWordMap } from '../domains/spelling/words';
import type { SpellingWord } from '../domains/spelling/words';

interface Props {
    records: Record<string, WordRecord>;
    onClose: () => void;
}

const BOX_LABELS = ['New', 'Learning', 'Reviewing', 'Almost', 'Mastered'];
const BOX_COLORS = [
    'text-[var(--color-wrong)]',
    'text-[var(--color-wrong)]/70',
    'text-[var(--color-gold)]',
    'text-[var(--color-gold)]/70',
    'text-[var(--color-correct)]',
];

function formatNextReview(nextReview: number, box: number): string {
    if (box >= 4) return 'Mastered';
    const now = Date.now();
    if (nextReview <= now) return 'Due now';
    const hoursLeft = Math.ceil((nextReview - now) / (1000 * 60 * 60));
    if (hoursLeft < 24) return `${hoursLeft}h`;
    return `${Math.ceil(hoursLeft / 24)}d`;
}

function accuracyColor(acc: number): string {
    if (acc >= 0.8) return 'text-[var(--color-correct)]';
    if (acc >= 0.5) return 'text-[var(--color-gold)]';
    return 'text-[var(--color-wrong)]';
}

function speak(word: string) {
    if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(word);
        u.rate = 0.85;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
    }
}

/** Single word row with expandable detail */
const WordRow = memo(function WordRow({
    record, detail, expanded, onToggle,
}: {
    record: WordRecord;
    detail: SpellingWord | undefined;
    expanded: boolean;
    onToggle: () => void;
}) {
    const acc = record.attempts > 0 ? record.correct / record.attempts : 0;
    const review = formatNextReview(record.nextReview, record.box);

    return (
        <div className="border-b border-[rgb(var(--color-fg))]/5">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between py-2 px-1 text-left"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm chalk text-[var(--color-chalk)] truncate">{record.word}</span>
                    <span className={`text-[9px] ui shrink-0 ${BOX_COLORS[Math.min(record.box, 4)]}`}>
                        {BOX_LABELS[Math.min(record.box, 4)]}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs ui ${accuracyColor(acc)}`}>
                        {Math.round(acc * 100)}%
                    </span>
                    <span className="text-[9px] ui text-[rgb(var(--color-fg))]/20 w-12 text-right">
                        {review}
                    </span>
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        <div className="px-2 pb-3 space-y-1.5">
                            {detail ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs ui text-[rgb(var(--color-fg))]/40">/{detail.pronunciation}/</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); speak(detail.word); }}
                                            className="text-sm hover:opacity-70 transition-opacity"
                                        >
                                            🔊
                                        </button>
                                        <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30 italic">{detail.partOfSpeech}</span>
                                    </div>
                                    <p className="text-xs ui text-[rgb(var(--color-fg))]/60">{detail.definition}</p>
                                    <p className="text-[11px] ui text-[rgb(var(--color-fg))]/35 italic">&ldquo;{detail.exampleSentence}&rdquo;</p>
                                    {detail.etymology && (
                                        <p className="text-[10px] ui text-[rgb(var(--color-fg))]/25">Origin: {detail.etymology}</p>
                                    )}
                                    <div className="flex gap-3 text-[10px] ui text-[rgb(var(--color-fg))]/30 pt-0.5">
                                        <span>{record.attempts} attempt{record.attempts !== 1 ? 's' : ''}</span>
                                        <span>{record.correct} correct</span>
                                        <span>Tier {detail.difficulty}</span>
                                    </div>
                                </>
                            ) : (
                                <p className="text-[11px] ui text-[rgb(var(--color-fg))]/30">
                                    Word details unavailable. Try switching to a higher grade level.
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

export const WordBookModal = memo(function WordBookModal({ records, onClose }: Props) {
    const [boxFilter, setBoxFilter] = useState<number | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [expandedWord, setExpandedWord] = useState<string | null>(null);
    const [displayLimit, setDisplayLimit] = useState(50);

    const wordMap = useMemo(() => getWordMap(), []);

    // Reset display limit on filter change
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setDisplayLimit(50); }, [boxFilter, categoryFilter]);

    const allRecords = useMemo(() => Object.values(records), [records]);
    const totalWords = allRecords.length;
    const masteredWords = useMemo(() => allRecords.filter(r => r.box >= 4).length, [allRecords]);

    const boxCounts = useMemo(() => {
        const counts = [0, 0, 0, 0, 0];
        for (const r of allRecords) counts[Math.min(r.box, 4)]++;
        return counts;
    }, [allRecords]);

    const categories = useMemo(() => {
        const cats = new Set<string>();
        for (const r of allRecords) cats.add(r.category);
        return Array.from(cats).sort();
    }, [allRecords]);

    const filteredWords = useMemo(() => {
        let list = allRecords;
        if (boxFilter !== null) list = list.filter(r => Math.min(r.box, 4) === boxFilter);
        if (categoryFilter !== null) list = list.filter(r => r.category === categoryFilter);
        return list.sort((a, b) => {
            if (a.box !== b.box) return a.box - b.box;
            const aAcc = a.attempts > 0 ? a.correct / a.attempts : 0;
            const bAcc = b.attempts > 0 ? b.correct / b.attempts : 0;
            return aAcc - bAcc;
        });
    }, [allRecords, boxFilter, categoryFilter]);

    const toggleWord = useCallback((word: string) => {
        setExpandedWord(prev => prev === word ? null : word);
    }, []);

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
                <h3 className="text-lg chalk text-[var(--color-gold)] text-center mb-3">Word Book</h3>

                {totalWords === 0 ? (
                    <div className="text-center text-sm ui text-[rgb(var(--color-fg))]/40 py-8">
                        No words yet
                    </div>
                ) : (
                    <>
                        {/* Summary */}
                        <div className="flex justify-between text-xs ui text-[rgb(var(--color-fg))]/50 mb-3">
                            <span>{totalWords} word{totalWords !== 1 ? 's' : ''}</span>
                            <span>{masteredWords} mastered</span>
                        </div>

                        {/* Box filter chips */}
                        <div className="flex gap-1 overflow-x-auto mb-2 pb-1 scrollbar-none">
                            <button
                                onClick={() => setBoxFilter(null)}
                                className={`shrink-0 px-2 py-1 rounded-lg text-[10px] ui transition-colors ${boxFilter === null
                                        ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)] font-semibold'
                                        : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60'
                                    }`}
                            >
                                All ({totalWords})
                            </button>
                            {BOX_LABELS.map((label, i) => (
                                <button
                                    key={i}
                                    onClick={() => setBoxFilter(boxFilter === i ? null : i)}
                                    className={`shrink-0 px-2 py-1 rounded-lg text-[10px] ui transition-colors ${boxFilter === i
                                            ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)] font-semibold'
                                            : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60'
                                        }`}
                                >
                                    {label} ({boxCounts[i]})
                                </button>
                            ))}
                        </div>

                        {/* Category filter */}
                        {categories.length > 1 && (
                            <select
                                value={categoryFilter ?? ''}
                                onChange={e => setCategoryFilter(e.target.value || null)}
                                className="w-full mb-3 text-[11px] ui bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/10 rounded-lg px-2 py-1.5 text-[rgb(var(--color-fg))]/60 outline-none appearance-none"
                            >
                                <option value="">All categories</option>
                                {categories.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        )}

                        {/* Word list */}
                        <div className="mt-1">
                            {filteredWords.length === 0 ? (
                                <div className="text-center text-xs ui text-[rgb(var(--color-fg))]/30 py-6">
                                    No words match this filter
                                </div>
                            ) : (
                                <>
                                    {filteredWords.slice(0, displayLimit).map(record => (
                                        <WordRow
                                            key={record.word}
                                            record={record}
                                            detail={wordMap.get(record.word)}
                                            expanded={expandedWord === record.word}
                                            onToggle={() => toggleWord(record.word)}
                                        />
                                    ))}
                                    {displayLimit < filteredWords.length && (
                                        <button
                                            onClick={() => setDisplayLimit(l => l + 50)}
                                            className="w-full py-2 mt-1 text-[11px] ui text-[var(--color-gold)]/60 hover:text-[var(--color-gold)] transition-colors"
                                        >
                                            Show {Math.min(50, filteredWords.length - displayLimit)} more...
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
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
