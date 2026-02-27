import { memo, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import type { SpellingCategory, SpellingGroup } from '../domains/spelling/spellingCategories';
import { SPELLING_CATEGORIES, SPELLING_GROUP_LABELS } from '../domains/spelling/spellingCategories';

interface Props {
    current: SpellingCategory;
    onChange: (type: SpellingCategory) => void;
    reviewQueueCount?: number;
}

type Tab = 'grades' | 'themes' | 'compete' | 'origins';

const GRADE_GROUPS: SpellingGroup[] = ['tier'];
const THEME_GROUPS: SpellingGroup[] = ['themes'];
const ORIGIN_GROUPS: SpellingGroup[] = ['origins'];

/** Competition word-list categories (swipe mode — same game, different word pool) */
const COMP_WORD_IDS: SpellingCategory[] = ['wotc-one', 'wotc-two', 'wotc-three'];
/** Competition game-mode categories (different UI entirely) */
const COMP_MODE_IDS: SpellingCategory[] = ['bee', 'written-test'];

const TABS: Tab[] = ['grades', 'themes', 'compete', 'origins'];
const TAB_LABELS: Record<Tab, string> = { grades: 'Grades', themes: 'Themes', compete: 'Compete', origins: 'Origins' };
const SWIPE_THRESHOLD = 50;

export const QuestionTypePicker = memo(function QuestionTypePicker({ current, onChange, reviewQueueCount }: Props) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<Tab>('grades');

    const gradeGroups = useMemo(() => GRADE_GROUPS.filter(g => SPELLING_CATEGORIES.some(t => t.group === g)), []);
    const themeGroups = useMemo(() => THEME_GROUPS.filter(g => SPELLING_CATEGORIES.some(t => t.group === g)), []);
    const originGroups = useMemo(() => ORIGIN_GROUPS.filter(g => SPELLING_CATEGORIES.some(t => t.group === g)), []);

    const compWords = useMemo(() => SPELLING_CATEGORIES.filter(t => COMP_WORD_IDS.includes(t.id)), []);
    const compModes = useMemo(() => SPELLING_CATEGORIES.filter(t => COMP_MODE_IDS.includes(t.id)), []);

    const currentEntry = SPELLING_CATEGORIES.find(t => t.id === current);

    const handleSwipe = useCallback((_: unknown, info: PanInfo) => {
        const idx = TABS.indexOf(tab);
        if (info.offset.x < -SWIPE_THRESHOLD && idx < TABS.length - 1) setTab(TABS[idx + 1]);
        else if (info.offset.x > SWIPE_THRESHOLD && idx > 0) setTab(TABS[idx - 1]);
    }, [tab]);

    function renderItem(t: (typeof SPELLING_CATEGORIES)[number]) {
        return (
            <motion.button
                key={t.id}
                onClick={() => { onChange(t.id); setOpen(false); }}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-colors ${t.id === current
                    ? 'bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/40'
                    : 'border border-transparent active:bg-[var(--color-surface)]'
                    }`}
                whileTap={{ scale: 0.92 }}
            >
                <div className={`h-8 flex items-center justify-center ${t.id === current ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/70'}`}>
                    {t.icon}
                </div>
                <span className={`text-[10px] ui ${t.id === current ? 'text-[var(--color-gold)]/80' : 'text-[rgb(var(--color-fg))]/40'} relative`}>
                    {t.label}
                    {t.id === 'review' && reviewQueueCount != null && reviewQueueCount > 0 && (
                        <span className="absolute -top-2 -right-3 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[var(--color-streak-fire)] text-white text-[8px] ui font-bold px-0.5">
                            {reviewQueueCount > 99 ? '99+' : reviewQueueCount}
                        </span>
                    )}
                </span>
            </motion.button>
        );
    }

    function renderGrid(groups: SpellingGroup[]) {
        return groups.map(group => {
            const items = SPELLING_CATEGORIES.filter(t => t.group === group);
            return (
                <div key={group} className="mb-3 last:mb-0">
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 uppercase tracking-widest mb-2 px-1">
                        {SPELLING_GROUP_LABELS[group]}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {items.map(renderItem)}
                    </div>
                </div>
            );
        });
    }

    function renderCompete() {
        return (
            <>
                {/* Word lists — same swipe game, different word pools */}
                <div className="mb-4">
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 uppercase tracking-widest mb-0.5 px-1">
                        Scripps Word Lists
                    </div>
                    <div className="text-[8px] ui text-[rgb(var(--color-fg))]/20 mb-2 px-1">Swipe-quiz with competition words</div>
                    <div className="grid grid-cols-3 gap-2">
                        {compWords.map(renderItem)}
                    </div>
                </div>

                {/* Game modes — different UI experience */}
                <div className="mb-3 last:mb-0">
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 uppercase tracking-widest mb-0.5 px-1">
                        Practice Modes
                    </div>
                    <div className="text-[8px] ui text-[rgb(var(--color-fg))]/20 mb-2 px-1">Full spelling practice — type the word</div>
                    <div className="grid grid-cols-3 gap-2">
                        {compModes.map(renderItem)}
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {/* Toggle button — shows current category icon */}
            <motion.button
                onClick={() => setOpen(o => !o)}
                className="w-11 h-11 flex items-center justify-center text-[rgb(var(--color-fg))]/50 active:text-[var(--color-gold)]"
                whileTap={{ scale: 0.88 }}
            >
                {currentEntry?.icon}
            </motion.button>

            {/* Full-screen overlay picker */}
            {createPortal(
                <AnimatePresence>
                    {open && (
                        <>
                            <motion.div
                                className="fixed inset-0 bg-[var(--color-overlay-dim)] z-50"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => setOpen(false)}
                            />

                            <motion.div
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--color-overlay)] border border-[rgb(var(--color-fg))]/15 rounded-2xl w-[300px] overflow-hidden"
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                transition={{ duration: 0.15 }}
                            >
                                {/* Tab bar */}
                                <div className="flex border-b border-[rgb(var(--color-fg))]/10 relative">
                                    {TABS.map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setTab(t)}
                                            className={`flex-1 py-2.5 text-xs ui uppercase tracking-wider transition-colors ${tab === t
                                                ? 'text-[var(--color-gold)]'
                                                : 'text-[rgb(var(--color-fg))]/35'
                                                }`}
                                        >
                                            {TAB_LABELS[t]}
                                        </button>
                                    ))}
                                    {/* Animated underline */}
                                    <motion.div
                                        className="absolute bottom-0 h-[2px] bg-[var(--color-gold)]"
                                        style={{ width: `${100 / TABS.length}%` }}
                                        animate={{ x: `${TABS.indexOf(tab) * 100}%` }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                </div>

                                {/* Swipeable content */}
                                <motion.div
                                    className="px-5 py-4 max-h-[55vh] overflow-y-auto"
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.15}
                                    onDragEnd={handleSwipe}
                                >
                                    <AnimatePresence mode="wait" initial={false}>
                                        <motion.div
                                            key={tab}
                                            initial={{ opacity: 0, x: 30 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -30 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            {tab === 'grades' ? renderGrid(gradeGroups)
                                                : tab === 'themes' ? renderGrid(themeGroups)
                                                : tab === 'compete' ? renderCompete()
                                                : renderGrid(originGroups)}
                                        </motion.div>
                                    </AnimatePresence>
                                </motion.div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
});
