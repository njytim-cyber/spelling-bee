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

    // Build positive messages
    const messages: string[] = [];
    if (stats.totalSolved > 0) messages.push(`You've solved ${stats.totalSolved.toLocaleString()} problems! 🧠`);
    if (acc >= 80) messages.push(`${acc}% accuracy — impressive! 🎯`);
    else if (acc >= 50) messages.push(`${acc}% accuracy — keep it up! 📈`);
    else if (stats.totalSolved > 0) messages.push(`Every mistake is a lesson learned 💪`);
    if (stats.bestStreak >= 10) messages.push(`Your best streak: ${stats.bestStreak} in a row! 🔥`);
    if (stats.dayStreak >= 3) messages.push(`${stats.dayStreak}-day streak and counting! 🌟`);
    if (stats.sessionsPlayed >= 5) messages.push(`${stats.sessionsPlayed} sessions played — you're dedicated! 💎`);

    // Ensure at least one message
    if (messages.length === 0) messages.push(`Great start! Keep playing to see your progress 🚀`);

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
                        <div className="text-3xl mb-2">📊</div>
                        <h3 className="text-lg chalk text-[var(--color-gold)] mb-4">Your Week So Far</h3>

                        <div className="space-y-2 mb-5">
                            {messages.slice(0, 4).map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + i * 0.15 }}
                                    className="text-sm ui text-[rgb(var(--color-fg))]/60"
                                >
                                    {msg}
                                </motion.div>
                            ))}
                        </div>

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
