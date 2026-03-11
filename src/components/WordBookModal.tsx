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
import { STORAGE_KEYS } from '../config';
import { EtymologyExplainer } from './EtymologyExplainer';
import { extractLanguage, type LanguageOfOrigin } from '../utils/etymologyParser';

const MASTERY_LABELS = ['Practicing', 'New', 'Learning', 'Reviewing', 'Familiar', 'Mastered'];
const MASTERY_COLORS = [
    'text-[var(--color-gold)]/50',   // 0: Practicing
    'text-[var(--color-wrong)]',      // 1: New
    'text-[var(--color-wrong)]/70',   // 2: Learning
    'text-[var(--color-gold)]',       // 3: Reviewing
    'text-[var(--color-correct)]/60', // 4: Familiar (distinct from both Reviewing and Mastered)
    'text-[var(--color-correct)]',    // 5: Mastered
];

/** Classify a word record into a mastery bucket (matches Analytics logic).
 *  0=Practicing, 1=New, 2=Learning, 3=Reviewing, 4=Familiar, 5=Mastered */
function classifyMastery(r: WordRecord): number {
    if (r.box >= 4 && (r.typedAttempts ?? 0) >= 1) return 5; // Mastered
    if (r.box >= 3) return 4; // Familiar
    if (r.box === 2) return 3; // Reviewing
    if (r.attempts >= 3 && r.correct / r.attempts < 0.5) return 0; // Practicing
    if (r.attempts === 0) return 1; // New
    return 2; // Learning
}

function formatNextReview(r: WordRecord): string {
    if (r.box >= 4 && (r.typedAttempts ?? 0) >= 1) return 'Mastered';
    if (r.box >= 4) return '—'; // Box 4 but not typed yet — no review scheduled
    const now = Date.now();
    if (r.nextReview <= now) return 'Ready';
    const hoursLeft = Math.ceil((r.nextReview - now) / (1000 * 60 * 60));
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
        const storedRate = localStorage.getItem(STORAGE_KEYS.ttsRate);
        u.rate = storedRate ? parseFloat(storedRate) : 1.0;
        const dialect = localStorage.getItem(STORAGE_KEYS.dialect) || 'en-US';
        u.lang = dialect === 'en-GB' ? 'en-GB' : 'en-US';
        // Respect user's preferred voice
        const storedURI = localStorage.getItem(STORAGE_KEYS.ttsVoice);
        if (storedURI) {
            const voice = speechSynthesis.getVoices().find(v => v.voiceURI === storedURI);
            if (voice) u.voice = voice;
        }
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
    const review = formatNextReview(record);

    return (
        <div className="border-b border-[rgb(var(--color-fg))]/5">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between py-2 px-1 text-left"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm ui font-bold text-[var(--color-chalk)] truncate">{record.word}</span>
                    <span className={`text-[9px] ui shrink-0 ${MASTERY_COLORS[classifyMastery(record)]}`}>
                        {MASTERY_LABELS[classifyMastery(record)]}
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
                        <div className="px-3 py-2.5 space-y-1.5 bg-[rgb(var(--color-fg))]/[0.02] rounded-lg mb-1">
                            {detail ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs ui text-[rgb(var(--color-fg))]/40">/{detail.pronunciation}/</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); speak(detail.word); }}
                                            aria-label={`Pronounce ${detail.word}`}
                                            className="text-sm hover:opacity-70 transition-opacity"
                                        >
                                            🔊
                                        </button>
                                        <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30 italic">{detail.partOfSpeech}</span>
                                    </div>
                                    <p className="text-xs ui text-[rgb(var(--color-fg))]/60">{detail.definition}</p>
                                    <p className="text-[11px] ui text-[rgb(var(--color-fg))]/35 italic">&ldquo;{detail.exampleSentence}&rdquo;</p>
                                    {detail.etymology && (
                                        <EtymologyExplainer etymology={detail.etymology} word={detail.word} />
                                    )}
                                    <div className="flex gap-3 text-[10px] ui text-[rgb(var(--color-fg))]/30 pt-1.5 mt-1 border-t border-[rgb(var(--color-fg))]/5">
                                        <span>{record.attempts} attempt{record.attempts !== 1 ? 's' : ''}</span>
                                        <span>{record.correct} correct</span>
                                        <span>Tier {detail.difficulty}</span>
                                    </div>
                                </>
                            ) : (
                                <p className="text-[11px] ui text-[rgb(var(--color-fg))]/30">
                                    Word details unavailable. Try switching to a higher level.
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

const ORIGIN_TABS: { key: LanguageOfOrigin | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'Latin', label: 'Latin' },
    { key: 'Greek', label: 'Greek' },
    { key: 'French', label: 'French' },
    { key: 'German', label: 'Germanic' },
    { key: 'English', label: 'English' },
    { key: 'Other', label: 'Other' },
];

export const WordBookContent = memo(function WordBookContent({ records }: { records: Record<string, WordRecord> }) {
    const [boxFilter, setBoxFilter] = useState<number | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [originFilter, setOriginFilter] = useState<LanguageOfOrigin | 'all'>('all');
    const [diffMin, setDiffMin] = useState(1);
    const [diffMax, setDiffMax] = useState(10);
    const [search, setSearch] = useState('');
    const [expandedWord, setExpandedWord] = useState<string | null>(null);
    const [displayLimit, setDisplayLimit] = useState(50);

    const wordMap = useMemo(() => getWordMap(), []);

    // Reset display limit on filter change
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setDisplayLimit(50); }, [boxFilter, categoryFilter, search, originFilter, diffMin, diffMax]);

    const allRecords = useMemo(() => Object.values(records), [records]);
    const totalWords = allRecords.length;
    const masteredWords = useMemo(() => allRecords.filter(r => classifyMastery(r) === 5).length, [allRecords]);

    const masteryCounts = useMemo(() => {
        const counts = [0, 0, 0, 0, 0, 0];
        for (const r of allRecords) counts[classifyMastery(r)]++;
        return counts;
    }, [allRecords]);

    const categories = useMemo(() => {
        const cats = new Set<string>();
        for (const r of allRecords) cats.add(r.category);
        return Array.from(cats).sort();
    }, [allRecords]);

    const filteredWords = useMemo(() => {
        let list = allRecords;
        if (boxFilter !== null) list = list.filter(r => classifyMastery(r) === boxFilter);
        if (categoryFilter !== null) list = list.filter(r => r.category === categoryFilter);
        if (originFilter !== 'all') {
            list = list.filter(r => {
                const detail = wordMap.get(r.word);
                return detail && extractLanguage(detail.etymology) === originFilter;
            });
        }
        if (diffMin > 1 || diffMax < 10) {
            list = list.filter(r => {
                const detail = wordMap.get(r.word);
                return detail && detail.difficulty >= diffMin && detail.difficulty <= diffMax;
            });
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(r => r.word.toLowerCase().includes(q));
        }
        return list.sort((a, b) => {
            if (a.box !== b.box) return a.box - b.box;
            const aAcc = a.attempts > 0 ? a.correct / a.attempts : 0;
            const bAcc = b.attempts > 0 ? b.correct / b.attempts : 0;
            return aAcc - bAcc;
        });
    }, [allRecords, boxFilter, categoryFilter, search, originFilter, diffMin, diffMax, wordMap]);

    const toggleWord = useCallback((word: string) => {
        setExpandedWord(prev => prev === word ? null : word);
    }, []);

    if (totalWords === 0) {
        return (
            <div className="flex flex-col items-center text-center py-8 gap-2">
                <span className="text-3xl">📖</span>
                <div className="text-sm ui text-[rgb(var(--color-fg))]/40">
                    No words yet — play a round to start collecting!
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Search */}
            <div className="relative mb-2">
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search words..."
                    className="w-full text-xs ui bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/10 rounded-lg px-3 py-2 pr-8 text-[rgb(var(--color-fg))]/60 placeholder:text-[rgb(var(--color-fg))]/20 outline-none"
                />
                {search && (
                    <button
                        onClick={() => setSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                        aria-label="Clear search"
                    >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Summary */}
            <div className="text-xs ui text-[rgb(var(--color-fg))]/50 mb-3">
                <span>{totalWords} word{totalWords !== 1 ? 's' : ''} &middot; {masteredWords} mastered</span>
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
                {MASTERY_LABELS.map((label, i) => {
                    if (masteryCounts[i] === 0) return null;
                    return (
                        <button
                            key={i}
                            onClick={() => setBoxFilter(boxFilter === i ? null : i)}
                            className={`shrink-0 px-2 py-1 rounded-lg text-[10px] ui transition-colors ${boxFilter === i
                                    ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)] font-semibold'
                                    : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60'
                                }`}
                        >
                            {label} ({masteryCounts[i]})
                        </button>
                    );
                })}
            </div>

            {/* Origin filter tabs */}
            <div className="flex gap-1 overflow-x-auto mb-2 pb-1 scrollbar-none">
                {ORIGIN_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setOriginFilter(originFilter === tab.key ? 'all' : tab.key)}
                        className={`shrink-0 px-2 py-1 rounded-lg text-[10px] ui transition-colors ${originFilter === tab.key
                                ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)] font-semibold'
                                : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Difficulty range chips */}
            <div className="flex gap-1 overflow-x-auto mb-2 pb-1 scrollbar-none">
                <button
                    onClick={() => { setDiffMin(1); setDiffMax(10); }}
                    className={`shrink-0 px-2 py-1 rounded-lg text-[10px] ui transition-colors ${diffMin === 1 && diffMax === 10
                        ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)] font-semibold'
                        : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60'
                    }`}
                >
                    All levels
                </button>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(d => (
                    <button
                        key={d}
                        onClick={() => { setDiffMin(d); setDiffMax(d); }}
                        className={`shrink-0 px-2 py-1 rounded-lg text-[10px] ui transition-colors ${diffMin === d && diffMax === d
                            ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)] font-semibold'
                            : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60'
                        }`}
                    >
                        Lv {d}
                    </button>
                ))}
            </div>

            {/* Category filter chips */}
            {categories.length > 1 && (
                <div className="flex gap-1 overflow-x-auto mb-2 pb-1 scrollbar-none">
                    <button
                        onClick={() => setCategoryFilter(null)}
                        className={`shrink-0 px-2 py-1 rounded-lg text-[10px] ui transition-colors ${categoryFilter === null
                            ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)] font-semibold'
                            : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60'
                        }`}
                    >
                        All categories
                    </button>
                    {categories.map(c => (
                        <button
                            key={c}
                            onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}
                            className={`shrink-0 px-2 py-1 rounded-lg text-[10px] ui transition-colors ${categoryFilter === c
                                ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)] font-semibold'
                                : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60'
                            }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            )}

            {/* Word list */}
            <div className="mt-1">
                {filteredWords.length === 0 ? (
                    <div className="text-center text-xs ui text-[rgb(var(--color-fg))]/40 py-6">
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
    );
});

