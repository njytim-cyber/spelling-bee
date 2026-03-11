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
}

export const GameShell = memo(function GameShell({ title, score, onExit, children, topRight }: Props) {
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
                className="fixed inset-0 z-50 bg-[var(--color-board)] flex flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
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
                    <h2 className="text-lg chalk text-[var(--color-gold)]">{title}</h2>
                    <div className="flex items-center gap-3">
                        {topRight}
                        <motion.div
                            animate={scorePop ? { scale: [1, 1.3, 1] } : {}}
                            transition={{ duration: 0.3 }}
                            className="text-sm chalk text-[var(--color-gold)] tabular-nums"
                        >
                            {displayVal} <span className="text-[10px] ui opacity-60">XP</span>
                        </motion.div>
                    </div>
                </div>

                {/* Game content */}
                <div className="flex-1 flex flex-col items-center overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)]">
                    {children}
                </div>
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
}

export const GameOverScreen = memo(function GameOverScreen({
    emoji, title, score, subtitle, isNewHigh, highScore, onPlayAgain, onExit,
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

            {/* XP added to leaderboard note */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-[9px] ui text-[rgb(var(--color-fg))]/25"
            >
                XP added to your leaderboard total
            </motion.p>
        </div>
    );
});
