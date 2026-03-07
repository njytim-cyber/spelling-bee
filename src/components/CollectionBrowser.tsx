/**
 * components/CollectionBrowser.tsx
 *
 * Grid browser for mastered word cards, organized by rarity.
 * Shown as a tab in StudyToolsModal.
 */
import { memo, useState, useMemo } from 'react';
import type { WordRecord } from '../hooks/useWordHistory';
import { getWordMap } from '../domains/spelling/words';
import type { SpellingWord } from '../domains/spelling/words/types';
import { WordCard } from './WordCard';
import { ALL_RARITIES, RARITY_CONFIGS, getRarityConfig, RARITY_ORDER, type Rarity } from '../utils/rarity';

interface Props {
    records: Record<string, WordRecord>;
}

const PAGE_SIZE = 20;

type SortMode = 'recent' | 'rarest';

export const CollectionContent = memo(function CollectionContent({ records }: Props) {
    const [filterRarity, setFilterRarity] = useState<Rarity | 'all'>('all');
    const [sortMode, setSortMode] = useState<SortMode>('recent');
    const [showCount, setShowCount] = useState(PAGE_SIZE);

    const wordMap = useMemo(() => getWordMap(), []);

    // Build collection: mastered words with their SpellingWord metadata
    const collection = useMemo(() => {
        const items: { record: WordRecord; word: SpellingWord; rarity: Rarity }[] = [];
        for (const r of Object.values(records)) {
            if (r.box >= 4 && (r.typedAttempts ?? 0) >= 1) {
                const sw = wordMap.get(r.word);
                if (sw) {
                    items.push({ record: r, word: sw, rarity: getRarityConfig(sw.difficulty).rarity });
                }
            }
        }
        return items;
    }, [records, wordMap]);

    // Rarity counts
    const rarityCounts = useMemo(() => {
        const counts: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
        for (const item of collection) counts[item.rarity]++;
        return counts;
    }, [collection]);

    // Filter + sort
    const displayed = useMemo(() => {
        let items = filterRarity === 'all' ? collection : collection.filter(i => i.rarity === filterRarity);
        if (sortMode === 'recent') {
            items = [...items].sort((a, b) => b.record.lastCorrect - a.record.lastCorrect);
        } else {
            items = [...items].sort((a, b) => {
                const rd = RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
                return rd !== 0 ? rd : b.record.lastCorrect - a.record.lastCorrect;
            });
        }
        return items;
    }, [collection, filterRarity, sortMode]);

    const visible = displayed.slice(0, showCount);
    const hasMore = showCount < displayed.length;

    if (collection.length === 0) {
        return (
            <div className="flex flex-col items-center py-12 px-4 text-center">
                <span className="text-3xl mb-3">📗</span>
                <p className="text-sm ui text-[rgb(var(--color-fg))]/60 mb-1">No words collected yet</p>
                <p className="text-[10px] ui text-[rgb(var(--color-fg))]/40 max-w-[240px]">
                    Master words by getting them right in MCQ and typing mode. Each mastered word becomes a collectible card!
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Header: total + rarity pills */}
            <div className="text-center mb-3">
                <div className="text-sm ui text-[rgb(var(--color-fg))]/60 font-medium mb-2">
                    {collection.length} word{collection.length !== 1 ? 's' : ''} collected
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                    {ALL_RARITIES.map(r => {
                        const count = rarityCounts[r];
                        if (count === 0) return null;
                        const cfg = RARITY_CONFIGS[r];
                        return (
                            <span
                                key={r}
                                className="text-[10px] ui font-medium px-2 py-0.5 rounded-full"
                                style={{ color: cfg.color, backgroundColor: `${cfg.color}15` }}
                            >
                                {cfg.emoji} {count}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Rarity progress bars */}
            <div className="space-y-1.5 mb-4">
                {ALL_RARITIES.map(r => {
                    const cfg = RARITY_CONFIGS[r];
                    // Total possible words at this rarity (count words in bank at matching difficulties)
                    const totalInBank = collection.length > 0 ? rarityCounts[r] : 0;
                    if (totalInBank === 0 && rarityCounts[r] === 0) return null;
                    return (
                        <div key={r} className="flex items-center gap-2">
                            <span className="text-[10px] ui w-20 text-right" style={{ color: cfg.color }}>
                                {cfg.emoji} {cfg.label}
                            </span>
                            <div className="flex-1 h-1.5 bg-[rgb(var(--color-fg))]/8 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        backgroundColor: cfg.color,
                                        width: `${Math.min(100, rarityCounts[r] > 0 ? Math.max(5, (rarityCounts[r] / Math.max(1, collection.length)) * 100) : 0)}%`,
                                    }}
                                />
                            </div>
                            <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30 w-8 tabular-nums">
                                {rarityCounts[r]}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Filter + sort controls */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex gap-1.5 overflow-x-auto">
                    <button
                        onClick={() => { setFilterRarity('all'); setShowCount(PAGE_SIZE); }}
                        className={`shrink-0 text-[10px] ui px-2 py-1 rounded-lg transition-colors ${
                            filterRarity === 'all'
                                ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] font-semibold'
                                : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60'
                        }`}
                    >
                        All
                    </button>
                    {ALL_RARITIES.map(r => {
                        if (rarityCounts[r] === 0) return null;
                        const cfg = RARITY_CONFIGS[r];
                        return (
                            <button
                                key={r}
                                onClick={() => { setFilterRarity(r); setShowCount(PAGE_SIZE); }}
                                className={`shrink-0 text-[10px] ui px-2 py-1 rounded-lg transition-colors ${
                                    filterRarity === r
                                        ? 'font-semibold'
                                        : 'opacity-60 hover:opacity-100'
                                }`}
                                style={{ color: cfg.color, backgroundColor: filterRarity === r ? `${cfg.color}15` : undefined }}
                            >
                                {cfg.emoji} {cfg.label}
                            </button>
                        );
                    })}
                </div>
                <button
                    onClick={() => setSortMode(s => s === 'recent' ? 'rarest' : 'recent')}
                    className="shrink-0 text-[9px] ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50 transition-colors ml-2"
                >
                    {sortMode === 'recent' ? '⏱ Recent' : '💎 Rarest'}
                </button>
            </div>

            {/* Card grid */}
            <div className="grid grid-cols-2 gap-2">
                {visible.map(item => (
                    <WordCard
                        key={item.word.word}
                        word={item.word}
                        masteredAt={item.record.lastCorrect}
                        compact
                    />
                ))}
            </div>

            {/* Show more */}
            {hasMore && (
                <button
                    onClick={() => setShowCount(c => c + PAGE_SIZE)}
                    className="w-full mt-3 py-2 text-xs ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                >
                    Show more ({displayed.length - showCount} remaining)
                </button>
            )}
        </div>
    );
});
