import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Stats } from '../hooks/useStats';

interface Props {
    stats: Stats;
}

const RECAP_KEY = 'spell-bee-last-recap-week';

function getWeekId(): string {
    const now = new Date();
    // ISO week: Monday-based
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${weekNum}`;
}

/** Always-positive weekly recap card shown on first open of the week */
export function WeeklyRecap({ stats }: Props) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const currentWeek = getWeekId();
        const lastShown = localStorage.getItem(RECAP_KEY);
        // Only show if it's a new week AND user has played at least one session
        if (lastShown !== currentWeek && stats.sessionsPlayed > 0) {
            queueMicrotask(() => setVisible(true));
        }
    }, [stats.sessionsPlayed]);

    const dismiss = () => {
        setVisible(false);
        localStorage.setItem(RECAP_KEY, getWeekId());
    };

    const acc = stats.totalSolved > 0 ? Math.round((stats.totalCorrect / stats.totalSolved) * 100) : 0;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay-dim)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={dismiss}
                >
                    <motion.div
                        className="bg-[var(--color-board)] border border-[var(--color-gold)]/20 rounded-3xl px-8 py-6 max-w-xs w-full text-center"
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg chalk text-[var(--color-gold)] mb-4">This Week</h3>

                        <div className="flex justify-center gap-6 mb-4">
                            <div className="text-center">
                                <div className="text-xl chalk text-[var(--color-gold)]">{stats.totalXP.toLocaleString()}</div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">total XP</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl chalk text-[var(--color-correct)]">{acc}%</div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">accuracy</div>
                            </div>
                            {stats.dayStreak >= 3 && (
                                <div className="text-center">
                                    <div className="text-xl chalk text-[var(--color-streak-fire)]">{stats.dayStreak}🔥</div>
                                    <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">day streak</div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={dismiss}
                            className="text-xs ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50 transition-colors"
                        >
                            Let's go! →
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
