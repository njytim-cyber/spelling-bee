/**
 * Shared full-screen game shell for all word games.
 * Provides back button, title, animated score counter, and fade-in/out.
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';

interface Props {
    title: string;
    score: number;
    onExit: () => void;
    children: ReactNode;
    /** Optional top-right widget (lives, timer, etc.) */
    topRight?: ReactNode;
    /** Green/red screen flash overlay */
    screenFlash?: 'correct' | 'wrong' | null;
    /** Screen shake on wrong answer */
    shake?: boolean;
    /** Player level (shown as badge) */
    level?: number;
    /** Combo multiplier (shows badge when > 1) */
    combo?: number;
    /** Pause state — renders overlay */
    paused?: boolean;
    /** Resume callback */
    onResume?: () => void;
}

export const GameShell = memo(function GameShell({ title, score, onExit, children, topRight, screenFlash, shake, level, combo, paused, onResume }: Props) {
    // Animated score counter
    const springScore = useSpring(0, { stiffness: 100, damping: 18 });
    const displayScore = useTransform(springScore, v => Math.round(v));
    const [displayVal, setDisplayVal] = useState(0);
    const [scorePop, setScorePop] = useState(false);
    const prevScore = useRef(0);

    useEffect(() => {
        springScore.set(score);
        if (score > prevScore.current) {
            setScorePop(true); // eslint-disable-line react-hooks/set-state-in-effect
            setTimeout(() => setScorePop(false), 300);
        }
        prevScore.current = score;
    }, [score, springScore]);

    useEffect(() => {
        const unsub = displayScore.on('change', v => setDisplayVal(Math.round(v)));
        return unsub;
    }, [displayScore]);

    return (
        <AnimatePresence>
            <motion.div
                className={`fixed inset-0 z-50 bg-[var(--color-board)] flex flex-col${shake ? ' animate-[wrong-shake_0.3s]' : ''}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Screen flash overlay */}
                {screenFlash && (
                    <div
                        className="absolute inset-0 z-50 pointer-events-none"
                        style={{
                            background: screenFlash === 'correct'
                                ? 'radial-gradient(circle, rgba(74,222,128,0.15) 0%, transparent 70%)'
                                : 'radial-gradient(circle, rgba(248,113,113,0.12) 0%, transparent 70%)',
                            animation: screenFlash === 'correct'
                                ? 'screen-flash-correct 0.4s ease-out forwards'
                                : 'screen-flash-wrong 0.4s ease-out forwards',
                        }}
                    />
                )}
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,16px)+12px)] pb-2">
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={onExit}
                        className="flex items-center gap-1 text-[rgb(var(--color-fg))]/50 hover:text-[var(--color-gold)] transition-colors"
                    >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        <span className="text-sm ui">Back</span>
                    </motion.button>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg chalk text-[var(--color-gold)]">{title}</h2>
                        {level != null && (
                            <span className="text-[9px] ui font-bold text-[var(--color-gold)]/60 border border-[var(--color-gold)]/30 px-1.5 py-0.5 rounded-full">
                                Lv.{level}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {topRight}
                        <div className="flex items-center gap-1.5">
                            {combo != null && combo > 1 && (
                                <motion.span
                                    key={combo}
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-[10px] ui font-bold text-[var(--color-streak-fire)] animate-[combo-pop_0.3s_ease-out]"
                                >
                                    x{combo}
                                </motion.span>
                            )}
                            <motion.div
                                animate={scorePop ? { scale: [1, 1.3, 1] } : {}}
                                transition={{ duration: 0.3 }}
                                className="text-sm chalk text-[var(--color-gold)] tabular-nums"
                            >
                                {displayVal} <span className="text-[10px] ui opacity-60">XP</span>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Game content */}
                <div className="flex-1 flex flex-col items-center overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)]">
                    {children}
                </div>

                {/* Pause overlay */}
                {paused && (
                    <div
                        className="absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black/70 cursor-pointer"
                        onClick={onResume}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center"
                        >
                            <p className="text-3xl chalk text-[var(--color-gold)] mb-2">Paused</p>
                            <p className="text-xs ui text-[rgb(var(--color-fg))]/40">Tap to resume</p>
                        </motion.div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
});

/**
 * Shared game-over celebration screen.
 * Shows emoji, score, high score, and Play Again / Done buttons.
 */
interface GameOverProps {
    emoji: string;
    title: string;
    score: number;
    subtitle?: string;
    isNewHigh: boolean;
    highScore: number;
    onPlayAgain: () => void;
    onExit: () => void;
    /** Optional stats row */
    stats?: { label: string; value: string | number }[];
    /** Game name for share */
    gameName?: string;
    /** 1-3 star rating (0 = no stars shown) */
    stars?: number;
}

export const GameOverScreen = memo(function GameOverScreen({
    emoji, title, score, subtitle, isNewHigh, highScore, onPlayAgain, onExit,
    stats, gameName, stars,
}: GameOverProps) {
    // Generate sparkle particles (stable across re-renders)
    const particles = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 200 - 100, // eslint-disable-line react-hooks/purity
        delay: Math.random() * 0.5, // eslint-disable-line react-hooks/purity
        duration: 1.5 + Math.random(), // eslint-disable-line react-hooks/purity
        size: 3 + Math.random() * 4, // eslint-disable-line react-hooks/purity
    })), []);

    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 relative overflow-hidden">
            {/* Floating sparkle particles */}
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 40, x: p.x, scale: 0 }}
                    animate={{ opacity: [0, 1, 0], y: -120, scale: [0, 1, 0.5] }}
                    transition={{ delay: p.delay, duration: p.duration, ease: 'easeOut' }}
                    className="absolute rounded-full bg-[var(--color-gold)]"
                    style={{ width: p.size, height: p.size }}
                />
            ))}

            {/* Celebration burst */}
            <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                className="text-5xl"
            >
                {emoji}
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-center"
            >
                <h3 className="text-2xl chalk text-[var(--color-gold)] mb-1">{title}</h3>
                <motion.p
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.25 }}
                    className="text-xl chalk text-[var(--color-gold)]"
                >
                    +{score} XP
                </motion.p>
                {subtitle && (
                    <p className="text-sm ui text-[rgb(var(--color-fg))]/50 mt-1">{subtitle}</p>
                )}
            </motion.div>

            {/* High score badge */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 }}
            >
                {isNewHigh ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-correct)]/15 border border-[var(--color-correct)]/30">
                        <span className="text-sm">🏆</span>
                        <span className="text-xs ui font-bold text-[var(--color-correct)]">New High Score!</span>
                    </div>
                ) : highScore > 0 ? (
                    <p className="text-[10px] ui text-[rgb(var(--color-fg))]/35">Best: {highScore} XP</p>
                ) : null}
            </motion.div>

            {/* Star rating */}
            {stars != null && stars > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex gap-1"
                >
                    {[1, 2, 3].map(i => (
                        <motion.span
                            key={i}
                            initial={{ scale: 0, rotate: -30 }}
                            animate={i <= stars ? { scale: 1, rotate: 0 } : { scale: 1, rotate: 0, opacity: 0.2 }}
                            transition={{ delay: 0.35 + i * 0.15, type: 'spring', stiffness: 300, damping: 12 }}
                            className="text-2xl"
                        >
                            {i <= stars ? '⭐' : '☆'}
                        </motion.span>
                    ))}
                </motion.div>
            )}

            {/* Stats row */}
            {stats && stats.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-4"
                >
                    {stats.map(s => (
                        <div key={s.label} className="text-center">
                            <div className="text-sm chalk text-[var(--color-gold)]">{s.value}</div>
                            <div className="text-[8px] ui text-[rgb(var(--color-fg))]/35">{s.label}</div>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* Action buttons */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="flex gap-3"
            >
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onPlayAgain}
                    className="py-3 px-6 rounded-xl font-bold ui text-[#422006] bg-[var(--color-gold)]"
                >
                    Play Again
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onExit}
                    className="py-3 px-6 rounded-xl font-bold ui border-2 border-[rgb(var(--color-fg))]/20 text-[rgb(var(--color-fg))]/60"
                >
                    Done
                </motion.button>
            </motion.div>

            {/* Share + leaderboard note */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col items-center gap-1.5"
            >
                {gameName && (
                    <button
                        onClick={() => {
                            const text = `I scored ${score} XP on ${gameName}! 🐝`;
                            if (navigator.share) navigator.share({ text }).catch(() => {});
                            else navigator.clipboard?.writeText(text).catch(() => {});
                        }}
                        className="text-[10px] ui text-[rgb(var(--color-fg))]/35 hover:text-[var(--color-gold)] transition-colors"
                    >
                        📤 Share Score
                    </button>
                )}
                <p className="text-[9px] ui text-[rgb(var(--color-fg))]/25">
                    XP added to your leaderboard total
                </p>
            </motion.div>
        </div>
    );
});
