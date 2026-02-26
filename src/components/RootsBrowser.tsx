/**
 * components/RootsBrowser.tsx
 *
 * Browsable word roots list grouped by origin (Greek, Latin, French).
 * Each root card shows: root, meaning, type badge, example words.
 */
import { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WORD_ROOTS, type WordRoot } from '../domains/spelling/words/roots';

interface Props {
    onClose: () => void;
}

type OriginFilter = 'all' | 'Greek' | 'Latin' | 'French';
const ORIGINS: OriginFilter[] = ['all', 'Latin', 'Greek', 'French'];

const TYPE_COLORS: Record<string, string> = {
    prefix: 'text-[var(--color-gold)]',
    suffix: 'text-[var(--color-correct)]',
    root: 'text-[rgb(var(--color-fg))]/60',
};

function RootCard({ root, expanded, onToggle }: { root: WordRoot; expanded: boolean; onToggle: () => void }) {
    return (
        <div className="border-b border-[rgb(var(--color-fg))]/5">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between py-2.5 px-1 text-left"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm chalk text-[var(--color-chalk)] font-semibold">{root.root}</span>
                    <span className={`text-[9px] ui shrink-0 ${TYPE_COLORS[root.type] ?? 'text-[rgb(var(--color-fg))]/40'}`}>
                        {root.type}
                    </span>
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
                                        className="px-2 py-0.5 rounded-md bg-[rgb(var(--color-fg))]/5 text-xs chalk text-[var(--color-chalk)]"
                                    >
                                        {word}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export const RootsBrowser = memo(function RootsBrowser({ onClose }: Props) {
    const [filter, setFilter] = useState<OriginFilter>('all');
    const [search, setSearch] = useState('');
    const [expandedRoot, setExpandedRoot] = useState<string | null>(null);

    const filtered = useMemo(() => {
        let list = WORD_ROOTS;
        if (filter !== 'all') {
            list = list.filter(r => r.origin === filter);
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
    }, [filter, search]);

    const originCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const r of WORD_ROOTS) {
            counts[r.origin] = (counts[r.origin] ?? 0) + 1;
        }
        return counts;
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
                <h3 className="text-lg chalk text-[var(--color-gold)] text-center mb-3">Word Roots</h3>

                {/* Search */}
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search roots or words..."
                    className="w-full mb-2 text-xs ui bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/10 rounded-lg px-3 py-2 text-[rgb(var(--color-fg))]/60 placeholder:text-[rgb(var(--color-fg))]/20 outline-none"
                />

                {/* Origin filter */}
                <div className="flex gap-1 mb-3">
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
                            />
                        ))
                    )}
                </div>

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
