import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPELLING_TRICKS, SPELLING_TRICK_CATEGORIES, getRecommendedTrick, type SpellingTrick } from '../utils/spellingTricks';
import { TrickLesson } from './TrickLesson';
import { loadMastered } from './TrickPractice';

interface Props {
    onLessonActive: (active: boolean) => void;
}

export function TricksPage({ onLessonActive }: Props) {
    const [selectedTrick, setSelectedTrick] = useState<SpellingTrick | null>(null);
    const [mastered, setMastered] = useState(() => loadMastered());
    const [previewTrick, setPreviewTrick] = useState<SpellingTrick | null>(null);
    const [openCats, setOpenCats] = useState<Set<string>>(() => new Set([SPELLING_TRICK_CATEGORIES[0]?.id]));
    const longPressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        if (!selectedTrick) queueMicrotask(() => setMastered(loadMastered()));
    }, [selectedTrick]);

    useEffect(() => {
        onLessonActive(!!selectedTrick);
    }, [selectedTrick, onLessonActive]);

    const startLongPress = useCallback((trick: SpellingTrick) => {
        longPressTimer.current = setTimeout(() => setPreviewTrick(trick), 500);
    }, []);

    const cancelLongPress = useCallback(() => {
        clearTimeout(longPressTimer.current);
    }, []);

    const toggleCat = useCallback((id: string) => {
        setOpenCats(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const recommended = useMemo(() => getRecommendedTrick(mastered), [mastered]);

    if (selectedTrick) {
        return (
            <AnimatePresence mode="wait">
                <TrickLesson trick={selectedTrick} onClose={() => setSelectedTrick(null)} />
            </AnimatePresence>
        );
    }

    const masteredCount = SPELLING_TRICKS.filter(t => mastered.has(t.id)).length;
    const trickMap = Object.fromEntries(SPELLING_TRICKS.map(t => [t.id, t]));

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col pt-[max(env(safe-area-inset-top,12px),12px)] px-4 pb-24 overflow-y-auto"
        >
            <div className="text-center mb-5">
                <h1 className="text-3xl chalk text-[var(--color-gold)] mb-1">Word Lab</h1>
                <p className="text-xs ui text-[rgb(var(--color-fg))]/50">
                    Master spelling patterns & rules · <span className="text-[var(--color-gold)]">{masteredCount}/{SPELLING_TRICKS.length}</span>
                </p>
            </div>

            {/* Recommended next trick spotlight */}
            {recommended && (
                <motion.button
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedTrick(recommended)}
                    className="max-w-sm mx-auto w-full mb-5 bg-[var(--color-gold)]/8 border border-[var(--color-gold)]/20 rounded-2xl p-4 flex items-center gap-4 text-left group hover:bg-[var(--color-gold)]/12 transition-colors"
                >
                    <div className="w-14 h-14 rounded-full bg-[var(--color-gold)]/15 flex items-center justify-center text-2xl shrink-0">
                        {recommended.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] ui text-[var(--color-gold)]/60 mb-0.5">Recommended for you</div>
                        <div className="text-sm ui font-bold text-[rgb(var(--color-fg))]/90 group-hover:text-[var(--color-gold)] transition-colors truncate">
                            {recommended.title}
                        </div>
                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 truncate">{recommended.description}</div>
                    </div>
                    <div className="text-[var(--color-gold)]/50 text-lg">→</div>
                </motion.button>
            )}

            {/* Accordion categories with progress */}
            <div className="space-y-2 max-w-sm mx-auto w-full">
                {SPELLING_TRICK_CATEGORIES.map(cat => {
                    const tricks = cat.trickIds.map(id => trickMap[id]).filter(Boolean);
                    const catMastered = tricks.filter(t => mastered.has(t.id)).length;
                    const progress = tricks.length > 0 ? catMastered / tricks.length : 0;
                    const isOpen = openCats.has(cat.id);

                    return (
                        <div key={cat.id} className="rounded-2xl border border-[rgb(var(--color-fg))]/8 overflow-hidden">
                            {/* Accordion header — tappable */}
                            <button
                                onClick={() => toggleCat(cat.id)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-[rgb(var(--color-fg))]/[0.03] transition-colors"
                            >
                                {/* Mini progress ring */}
                                <div className="relative w-8 h-8 shrink-0">
                                    <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
                                        <circle cx="16" cy="16" r="13" fill="none" stroke="rgb(var(--color-fg) / 0.08)" strokeWidth="2.5" />
                                        {progress > 0 && (
                                            <circle
                                                cx="16" cy="16" r="13" fill="none"
                                                stroke="var(--color-gold)"
                                                strokeWidth="2.5"
                                                strokeDasharray={`${progress * 81.68} 81.68`}
                                                strokeLinecap="round"
                                                opacity={0.7}
                                            />
                                        )}
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-xs">{cat.emoji}</span>
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="text-sm ui font-bold text-[rgb(var(--color-fg))]/70">{cat.label}</div>
                                    <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">{catMastered}/{tricks.length} mastered</div>
                                </div>
                                {/* Chevron */}
                                <motion.div
                                    animate={{ rotate: isOpen ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-[rgb(var(--color-fg))]/25 text-sm"
                                >
                                    ▾
                                </motion.div>
                            </button>

                            {/* Collapsible body */}
                            <AnimatePresence initial={false}>
                                {isOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-1.5 px-3 pb-3">
                                            {tricks.map(trick => {
                                                const isMastered = mastered.has(trick.id);
                                                return (
                                                    <div key={trick.id} className="relative">
                                                        <motion.button
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => {
                                                                if (previewTrick) { setPreviewTrick(null); return; }
                                                                setSelectedTrick(trick);
                                                            }}
                                                            onPointerDown={() => startLongPress(trick)}
                                                            onPointerUp={cancelLongPress}
                                                            onPointerLeave={cancelLongPress}
                                                            className={`w-full text-left bg-[rgb(var(--color-fg))]/[0.02] border rounded-xl p-3 flex items-center gap-3 transition-colors hover:bg-[rgb(var(--color-fg))]/5 relative overflow-hidden group
                                                                ${isMastered ? 'border-[var(--color-gold)]/30' : 'border-[rgb(var(--color-fg))]/10'}`}
                                                        >
                                                            <div className={`absolute left-0 top-0 bottom-0 w-1 transition-opacity ${isMastered ? 'bg-[var(--color-gold)] opacity-70' : 'bg-[var(--color-gold)] opacity-30 group-hover:opacity-100'}`} />
                                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${isMastered ? 'bg-[var(--color-gold)]/15' : 'bg-[rgb(var(--color-fg))]/5'}`}>
                                                                {trick.icon}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="ui font-bold text-sm text-[rgb(var(--color-fg))]/90 group-hover:text-[var(--color-gold)] transition-colors truncate">
                                                                    {trick.title}
                                                                </h3>
                                                                <p className="ui text-[10px] text-[rgb(var(--color-fg))]/50 leading-tight mt-0.5 truncate">
                                                                    {trick.description}
                                                                </p>
                                                            </div>
                                                            {isMastered ? (
                                                                <div className="text-[var(--color-gold)] text-base" title="Mastered">✓</div>
                                                            ) : (
                                                                <div className="ui text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-gold)]/10 text-[var(--color-gold)]/70">
                                                                    Lv.{trick.difficulty}
                                                                </div>
                                                            )}
                                                        </motion.button>

                                                        {/* Long-press preview tooltip */}
                                                        <AnimatePresence>
                                                            {previewTrick?.id === trick.id && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                                                    onClick={() => setPreviewTrick(null)}
                                                                    className="mt-1 bg-[var(--color-overlay)] border border-[var(--color-gold)]/20 rounded-xl p-4 text-center"
                                                                >
                                                                    <div className="mb-1 flex items-center justify-center">
                                                                        <span className="text-2xl ui font-bold text-[var(--color-chalk)]">{trick.lesson.word}</span>
                                                                    </div>
                                                                    <div className="text-[11px] ui text-[rgb(var(--color-fg))]/50 leading-relaxed">{trick.lesson.steps[0]}</div>
                                                                    <div className="text-[9px] ui text-[rgb(var(--color-fg))]/25 mt-2">Tap to dismiss · Tap card to start lesson</div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}
