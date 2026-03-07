/**
 * components/WordCard.tsx
 *
 * Collectible word card with rarity-colored border and metadata display.
 * Full variant shows definition, example, etymology. Compact variant for grids.
 */
import { memo } from 'react';
import type { SpellingWord } from '../domains/spelling/words/types';
import { getRarityConfig } from '../utils/rarity';
import { dateLocale } from '../utils/dateHelpers';

interface Props {
    word: SpellingWord;
    masteredAt?: number;
    /** Compact mode for grid layout */
    compact?: boolean;
    /** Apply card-reveal entrance animation */
    animate?: boolean;
}

export const WordCard = memo(function WordCard({ word, masteredAt, compact, animate }: Props) {
    const rc = getRarityConfig(word.difficulty);
    const isShiny = rc.rarity === 'rare' || rc.rarity === 'epic' || rc.rarity === 'legendary';

    if (compact) {
        return (
            <div
                className="relative rounded-xl border-2 px-3 py-2.5 bg-[rgb(var(--color-fg))]/[0.03] overflow-hidden"
                style={{ borderColor: rc.color }}
            >
                {isShiny && <div className="card-shimmer absolute inset-0 pointer-events-none" />}
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm chalk text-[var(--color-chalk)] font-bold truncate">{word.word}</span>
                    <span
                        className="shrink-0 text-[9px] ui font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ color: rc.color, backgroundColor: `${rc.color}20` }}
                    >
                        {rc.emoji} {rc.label}
                    </span>
                </div>
                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 mt-0.5 truncate">
                    {word.partOfSpeech} · Level {word.difficulty}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`relative rounded-2xl border-2 p-5 bg-[rgb(var(--color-fg))]/[0.03] overflow-hidden ${animate ? 'card-reveal' : ''}`}
            style={{ borderColor: rc.color, boxShadow: isShiny ? `0 0 20px 2px ${rc.bgGlow}` : undefined }}
        >
            {isShiny && <div className="card-shimmer absolute inset-0 pointer-events-none" />}
            {rc.rarity === 'legendary' && (
                <div
                    className="glow-pulse absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ '--glow-color': rc.color } as React.CSSProperties}
                />
            )}

            {/* Header: word + rarity badge */}
            <div className="relative flex items-start justify-between gap-3 mb-3">
                <div>
                    <div className="text-2xl chalk text-[var(--color-chalk)] font-bold leading-tight">{word.word}</div>
                    <div className="text-[11px] ui text-[rgb(var(--color-fg))]/40 mt-0.5">
                        /{word.pronunciation}/ · {word.partOfSpeech}
                    </div>
                </div>
                <span
                    className="shrink-0 text-[10px] ui font-semibold px-2 py-1 rounded-full"
                    style={{ color: rc.color, backgroundColor: `${rc.color}20` }}
                >
                    {rc.emoji} {rc.label}
                </span>
            </div>

            {/* Definition */}
            <div className="text-sm ui text-[rgb(var(--color-fg))]/60 mb-2">
                {word.definition}
            </div>

            {/* Example sentence */}
            <div className="text-xs ui text-[rgb(var(--color-fg))]/40 italic mb-2">
                &ldquo;{word.exampleSentence}&rdquo;
            </div>

            {/* Etymology (if available) */}
            {word.etymology && (
                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mb-2">
                    Origin: {word.etymology}
                </div>
            )}

            {/* Footer: mastered date + difficulty */}
            <div className="flex items-center justify-between text-[10px] ui text-[rgb(var(--color-fg))]/25 mt-3 pt-2 border-t border-[rgb(var(--color-fg))]/5">
                {masteredAt ? (
                    <span>Mastered {new Date(masteredAt).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric' })}</span>
                ) : (
                    <span>Level {word.difficulty}</span>
                )}
                <span>Level {word.difficulty}</span>
            </div>
        </div>
    );
});
