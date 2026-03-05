/**
 * components/AvatarBuilder.tsx
 *
 * Mix-and-match stick-figure avatar builder.
 * Live preview with bounce animation + 6 free category rows + 1 earned flair row.
 * Each option button shows the full avatar with that part swapped,
 * so users can see exactly what they're picking.
 */
import { memo, useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AvatarSvg } from './AvatarSvg';
import {
    parseAvatar,
    encodeAvatar,
    AVATAR_CATEGORIES,
    FLAIR_ITEMS,
} from '../utils/avatarParts';
import type { AvatarConfig, FlairStats } from '../utils/avatarParts';

interface Props {
    config: string;
    onChange: (config: string) => void;
    flairStats: FlairStats;
}

export const AvatarBuilder = memo(function AvatarBuilder({ config, onChange, flairStats }: Props) {
    const parsed = parseAvatar(config);
    // Bounce key increments on every change to trigger the spring animation
    const [bounceKey, setBounceKey] = useState(0);

    const updatePart = useCallback((key: keyof AvatarConfig, value: number) => {
        const next = { ...parseAvatar(config), [key]: value };
        onChange(encodeAvatar(next));
        setBounceKey(k => k + 1);
    }, [config, onChange]);

    // Pre-compute which flair items are unlocked
    const flairUnlocked = useMemo(() =>
        FLAIR_ITEMS.map(f => f.isUnlocked(flairStats)),
    [flairStats]);

    const unlockedFlairCount = useMemo(() =>
        flairUnlocked.filter(Boolean).length,
    [flairUnlocked]);

    const randomize = useCallback(() => {
        // Only randomize among unlocked flair
        const availableFlair = FLAIR_ITEMS
            .filter(f => f.isUnlocked(flairStats))
            .map(f => f.index);
        const next: AvatarConfig = {
            head: Math.floor(Math.random() * 5),
            hair: Math.floor(Math.random() * 5),
            expression: Math.floor(Math.random() * 5),
            body: Math.floor(Math.random() * 5),
            clothing: Math.floor(Math.random() * 5),
            accessory: Math.floor(Math.random() * 5),
            flair: availableFlair[Math.floor(Math.random() * availableFlair.length)],
        };
        onChange(encodeAvatar(next));
        setBounceKey(k => k + 1);
    }, [onChange, flairStats]);

    return (
        <div className="w-full max-w-sm">
            {/* Live preview with bounce */}
            <div className="flex justify-center mb-4">
                <div className="relative p-3 rounded-2xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/5">
                    <AnimatePresence mode="popLayout">
                        <motion.div
                            key={bounceKey}
                            initial={{ scale: 0.9, rotate: -3 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                        >
                            <AvatarSvg
                                config={parsed}
                                size={100}
                                className="text-[var(--color-chalk)]"
                                animate
                            />
                        </motion.div>
                    </AnimatePresence>

                    {/* Shuffle button */}
                    <button
                        onClick={randomize}
                        aria-label="Randomize avatar"
                        title="Randomize"
                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/30 flex items-center justify-center text-sm hover:bg-[var(--color-gold)]/25 active:scale-90 transition-all"
                    >
                        🎲
                    </button>
                </div>
            </div>

            {/* Category pickers */}
            <div className="space-y-3">
                {AVATAR_CATEGORIES.map(cat => {
                    const selectedIdx = parsed[cat.configKey];
                    return (
                        <div key={cat.key}>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 uppercase tracking-widest mb-1.5 text-center">
                                {cat.label}
                            </div>
                            <div className="flex gap-2 justify-center">
                                {cat.parts.map(part => {
                                    const isSelected = part.index === selectedIdx;
                                    // Build a preview config with this part swapped in
                                    const previewConfig = { ...parsed, [cat.configKey]: part.index };
                                    return (
                                        <button
                                            key={part.index}
                                            onClick={() => updatePart(cat.configKey, part.index)}
                                            aria-label={`${cat.label}: ${part.name}${isSelected ? ', selected' : ''}`}
                                            aria-pressed={isSelected}
                                            title={part.name}
                                            className={`w-11 h-11 rounded-xl border-2 transition-all flex items-center justify-center p-0.5
                                                ${isSelected
                                                    ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 scale-110'
                                                    : 'border-[rgb(var(--color-fg))]/15 hover:border-[rgb(var(--color-fg))]/30'
                                                }`}
                                        >
                                            <AvatarSvg
                                                config={previewConfig}
                                                size={28}
                                                className="text-[var(--color-chalk)]"
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Flair — earned items row */}
                <div>
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 uppercase tracking-widest mb-1.5 text-center">
                        flair · {unlockedFlairCount}/{FLAIR_ITEMS.length}
                    </div>
                    <div className="flex gap-2 justify-center flex-wrap">
                        {FLAIR_ITEMS.map(flair => {
                            const isUnlocked = flairUnlocked[flair.index];
                            const isSelected = flair.index === parsed.flair;
                            const previewConfig = { ...parsed, flair: flair.index };
                            return (
                                <button
                                    key={flair.index}
                                    onClick={() => isUnlocked && updatePart('flair', flair.index)}
                                    aria-label={`Flair: ${flair.name}${isSelected ? ', selected' : ''}${!isUnlocked ? `, locked — ${flair.hint}` : ''}`}
                                    aria-pressed={isSelected}
                                    title={isUnlocked ? flair.name : `🔒 ${flair.hint}`}
                                    className={`w-11 h-11 rounded-xl border-2 transition-all flex items-center justify-center p-0.5
                                        ${isSelected && isUnlocked
                                            ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 scale-110'
                                            : isUnlocked
                                                ? 'border-[rgb(var(--color-fg))]/15 hover:border-[rgb(var(--color-fg))]/30'
                                                : 'border-[rgb(var(--color-fg))]/8 opacity-30 cursor-not-allowed'
                                        }`}
                                >
                                    <AvatarSvg
                                        config={previewConfig}
                                        size={28}
                                        className="text-[var(--color-chalk)]"
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
});
