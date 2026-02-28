/**
 * components/RootsBrowser.tsx
 *
 * Browsable word roots list grouped by origin (Greek, Latin, French).
 * Each root card shows: root, meaning, type badge, example words,
 * mastery progress, and a "Practice" drill button.
 */
import { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WORD_ROOTS, type WordRoot } from '../domains/spelling/words/roots';
import { highlightRoot } from '../domains/spelling/words/rootUtils';

const DISMISS_KEY = 'sb-roots-intro-dismissed';

type OriginFilter = 'all' | 'Greek' | 'Latin' | 'French' | 'German' | 'Italian';
const ORIGINS: OriginFilter[] = ['all', 'Latin', 'Greek', 'French', 'German', 'Italian'];

type TypeFilter = 'all' | 'prefix' | 'suffix' | 'root';
const TYPES: TypeFilter[] = ['all', 'prefix', 'suffix', 'root'];

const TYPE_BADGE: Record<string, string> = {
    prefix: 'bg-[var(--color-gold)]/15 text-[var(--color-gold)]',
    suffix: 'bg-[var(--color-correct)]/15 text-[var(--color-correct)]',
    root: 'bg-[rgb(var(--color-fg))]/5 text-[rgb(var(--color-fg))]/50',
};

interface RootCardProps {
    root: WordRoot;
    expanded: boolean;
    onToggle: () => void;
    onDrill?: () => void;
    mastery?: { mastered: number; total: number };
}

function RootCard({ root, expanded, onToggle, onDrill, mastery }: RootCardProps) {
    return (
        <div className="border-b border-[rgb(var(--color-fg))]/5">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between py-2.5 px-1 text-left"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm ui text-[var(--color-chalk)] font-semibold">{root.root}</span>
                    <span className={`text-[10px] ui px-1.5 py-0.5 rounded-full font-medium shrink-0 ${TYPE_BADGE[root.type] ?? 'bg-[rgb(var(--color-fg))]/5 text-[rgb(var(--color-fg))]/40'}`}>
                        {root.type}
                    </span>
                    {mastery && mastery.mastered > 0 && (
                        <span className="text-[10px] ui text-[var(--color-correct)]/60 shrink-0">
                            {mastery.mastered}/{mastery.total}
                        </span>
                    )}
                </div>
                <span className="text-xs ui text-[rgb(var(--color-fg))]/50 shrink-0">{root.meaning}</span>
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
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/35">
                                Origin: {root.origin}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {root.examples.map(word => (
                                    <span
                                        key={word}
                                        className="px-2 py-0.5 rounded-md bg-[rgb(var(--color-fg))]/5 text-xs ui text-[var(--color-chalk)]"
                                    >
                                        {highlightRoot(word, root.root)}
                                    </span>
                                ))}
                            </div>
                            {onDrill && root.examples.length >= 3 && (
                                <button
                                    onClick={onDrill}
                                    className="mt-1 w-full py-1.5 rounded-lg text-xs ui text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-colors"
                                >
                                    Practice these words
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface RootsContentProps {
    onDrillRoot?: (rootId: string) => void;
    rootMastery?: Map<string, { mastered: number; total: number }>;
}

export const RootsContent = memo(function RootsContent({ onDrillRoot, rootMastery }: RootsContentProps) {
    const [filter, setFilter] = useState<OriginFilter>('all');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [search, setSearch] = useState('');
    const [expandedRoot, setExpandedRoot] = useState<string | null>(null);
    const [introDismissed, setIntroDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

    const filtered = useMemo(() => {
        let list = WORD_ROOTS;
        if (filter !== 'all') {
            list = list.filter(r => r.origin === filter);
        }
        if (typeFilter !== 'all') {
            list = list.filter(r => r.type === typeFilter);
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(r =>
                r.root.toLowerCase().includes(q) ||
                r.meaning.toLowerCase().includes(q) ||
                r.examples.some(e => e.toLowerCase().includes(q))
            );
        }
        return list;
    }, [filter, typeFilter, search]);

    const originCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const r of WORD_ROOTS) {
            counts[r.origin] = (counts[r.origin] ?? 0) + 1;
        }
        return counts;
    }, []);

    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const r of WORD_ROOTS) {
            counts[r.type] = (counts[r.type] ?? 0) + 1;
        }
        return counts;
    }, []);

    const dismissIntro = () => {
        localStorage.setItem(DISMISS_KEY, '1');
        setIntroDismissed(true);
    };

    return (
        <>
            {/* Intro explainer */}
            {!introDismissed && (
                <div className="relative mb-3 px-3 py-2.5 rounded-xl bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/15">
                    <button
                        onClick={dismissIntro}
                        className="absolute top-1.5 right-2 text-[rgb(var(--color-fg))]/25 hover:text-[rgb(var(--color-fg))]/50 text-sm"
                        aria-label="Dismiss"
                    >&times;</button>
                    <p className="text-xs ui text-[rgb(var(--color-fg))]/60 leading-relaxed pr-4">
                        <span className="font-semibold text-[var(--color-gold)]">Why learn roots?</span>{' '}
                        Knowing word roots is like a cheat code — when you see an unfamiliar word, you can break it apart
                        and figure out what it means. If you know <em>spect</em> means "to look," you can
                        decode <em>spectacle</em>, <em>inspector</em>, and <em>retrospective</em>.
                    </p>
                </div>
            )}

            {/* Summary line */}
            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mb-2">
                {WORD_ROOTS.length} roots from Latin, Greek, French, German &amp; Italian — tap any to see examples
            </div>

            {/* Search */}
            <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search roots or words..."
                className="w-full mb-2 text-xs ui bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/10 rounded-lg px-3 py-2 text-[rgb(var(--color-fg))]/60 placeholder:text-[rgb(var(--color-fg))]/20 outline-none"
            />

            {/* Origin filter */}
            <div className="flex gap-1 mb-2">
                {ORIGINS.map(o => (
                    <button
                        key={o}
                        onClick={() => setFilter(o)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] ui transition-colors ${
                            filter === o
                                ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)] font-semibold'
                                : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60'
                        }`}
                    >
                        {o === 'all' ? `All (${WORD_ROOTS.length})` : `${o} (${originCounts[o] ?? 0})`}
                    </button>
                ))}
            </div>

            {/* Type filter */}
            <div className="flex gap-1 mb-3">
                {TYPES.map(t => (
                    <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] ui transition-colors ${
                            typeFilter === t
                                ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)] font-semibold'
                                : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60'
                        }`}
                    >
                        {t === 'all' ? `All types` : `${t === 'prefix' ? 'Prefixes' : t === 'suffix' ? 'Suffixes' : 'Roots'} (${typeCounts[t] ?? 0})`}
                    </button>
                ))}
            </div>

            {/* Root list */}
            <div className="mt-1">
                {filtered.length === 0 ? (
                    <div className="text-center text-xs ui text-[rgb(var(--color-fg))]/30 py-6">
                        No roots match this filter
                    </div>
                ) : (
                    filtered.map(root => (
                        <RootCard
                            key={root.root}
                            root={root}
                            expanded={expandedRoot === root.root}
                            onToggle={() => setExpandedRoot(prev => prev === root.root ? null : root.root)}
                            onDrill={onDrillRoot ? () => onDrillRoot(root.root) : undefined}
                            mastery={rootMastery?.get(root.root)}
                        />
                    ))
                )}
            </div>
        </>
    );
});
