import { memo, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { SpellingCategory, SpellingBand, SpellingGroup } from '../domains/spelling/spellingCategories';
import { typesForBand, SPELLING_GROUP_LABELS } from '../domains/spelling/spellingCategories';

/** Size class for each icon — keeps the grid visually balanced */
function iconSizeClass(icon: string): string {
    // Emoji
    if (/^[\p{Emoji}\uFE0F]+$/u.test(icon) && !icon.includes('\n')) return 'text-2xl';
    // Multi-char grid — keep compact
    if (icon.includes('\n')) return '';
    // Everything else — medium
    return 'text-xl';
}

interface Props {
    current: SpellingCategory;
    onChange: (type: SpellingCategory) => void;
    ageBand: SpellingBand;
}

const ALL_GROUPS: SpellingGroup[] = ['daily', 'basic', 'core', 'advanced', 'mixed'];

export const QuestionTypePicker = memo(function QuestionTypePicker({ current, onChange, ageBand }: Props) {
    const [open, setOpen] = useState(false);
    const bandTypes = useMemo(() => typesForBand(ageBand), [ageBand]);
    const groups = useMemo(() => ALL_GROUPS.filter(g => bandTypes.some(t => t.group === g)), [bandTypes]);
    const currentEntry = bandTypes.find(t => t.id === current);
    const currentIcon = currentEntry?.icon || '×';

    return (
        <>
            {/* Toggle button */}
            <motion.button
                onClick={() => setOpen(o => !o)}
                className={`w-11 h-11 flex items-center justify-center text-[rgb(var(--color-fg))]/50 chalk active:text-[var(--color-gold)] ${iconSizeClass(currentIcon)}`}
                whileTap={{ scale: 0.88 }}
            >
                {currentIcon.includes('\n') ? (
                    <span className="inline-grid grid-cols-2 gap-x-0.5 text-[14px] leading-tight font-bold">{
                        currentIcon.replace('\n', '').split('').map((ch, i) => (
                            <span key={i}>{ch}</span>
                        ))
                    }</span>
                ) : currentIcon}
            </motion.button>

            {/* Full-screen overlay picker — portaled to body to escape #root's position:fixed */}
            {createPortal(
                <AnimatePresence>
                    {open && (
                        <>
                            {/* Dim backdrop — tap to close */}
                            <motion.div
                                className="fixed inset-0 bg-[var(--color-overlay-dim)] z-50"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => setOpen(false)}
                            />

                            {/* Centered grouped picker */}
                            <motion.div
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--color-overlay)] border border-[rgb(var(--color-fg))]/15 rounded-2xl px-5 py-5 max-h-[70vh] overflow-y-auto w-[300px]"
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                transition={{ duration: 0.15 }}
                            >
                                {groups.map(group => {
                                    const items = bandTypes.filter(t => t.group === group);
                                    return (
                                        <div key={group} className="mb-3 last:mb-0">
                                            {/* Group header */}
                                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 uppercase tracking-widest mb-2 px-1">
                                                {SPELLING_GROUP_LABELS[group]}
                                            </div>
                                            {/* 3-column grid */}
                                            <div className="grid grid-cols-3 gap-2">
                                                {items.map(t => (
                                                    <motion.button
                                                        key={t.id}
                                                        onClick={() => { onChange(t.id); setOpen(false); }}
                                                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-colors ${t.id === current
                                                            ? 'bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/40'
                                                            : 'border border-transparent active:bg-[var(--color-surface)]'
                                                            }`}
                                                        whileTap={{ scale: 0.92 }}
                                                    >
                                                        <div className="h-8 flex items-center justify-center">
                                                            <span className={`chalk ${t.id === current ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/70'} ${iconSizeClass(t.icon)} leading-none`}>
                                                                {t.icon.includes('\n') ? (
                                                                    <span className="inline-grid grid-cols-2 gap-x-1 text-base leading-tight font-bold">{
                                                                        t.icon.replace('\n', '').split('').map((ch, i) => (
                                                                            <span key={i}>{ch}</span>
                                                                        ))
                                                                    }</span>
                                                                ) : t.icon}
                                                            </span>
                                                        </div>
                                                        <span className={`text-[10px] ui ${t.id === current ? 'text-[var(--color-gold)]/80' : 'text-[rgb(var(--color-fg))]/40'}`}>
                                                            {t.label}
                                                        </span>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
});
