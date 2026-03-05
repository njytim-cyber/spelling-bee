/** Animated bottom-sheet toast — used for achievements, streak shields, day streaks, unlock celebrations. */
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    visible: boolean;
    icon: string;
    title: string;
    subtitle?: string;
    /** Unique key for AnimatePresence — defaults to title */
    toastKey?: string;
    /** Apply a gold star stamp animation to the icon */
    stampEffect?: boolean;
    /** Optional accent color override — replaces default gold border/title (e.g. chalk theme color) */
    color?: string;
    /** Optional action button (e.g. "Share") */
    actionLabel?: string;
    onAction?: () => void;
}

export function Toast({ visible, icon, title, subtitle, toastKey, stampEffect, color, actionLabel, onAction }: Props) {
    const borderStyle = color
        ? { borderColor: color + '80', boxShadow: `0 0 16px ${color}30` }
        : {};

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key={toastKey ?? title}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 40 }}
                    transition={{ duration: 0.2 }}
                    className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-overlay)] border rounded-2xl px-5 py-3 flex items-center gap-3 ${color ? '' : 'border-[var(--color-gold)]/30'}`}
                    style={borderStyle}
                >
                    <span className={`text-2xl ${stampEffect ? 'star-stamp' : ''}`}>{icon}</span>
                    <div className="flex-1">
                        <div
                            className={`text-sm ui font-bold ${color ? '' : 'text-[var(--color-gold)]'}`}
                            style={color ? { color } : undefined}
                        >{title}</div>
                        {subtitle && <div className="text-xs ui text-[rgb(var(--color-fg))]/40">{subtitle}</div>}
                    </div>
                    {actionLabel && onAction && (
                        <button
                            onClick={onAction}
                            className="text-[10px] ui text-[var(--color-gold)]/60 hover:text-[var(--color-gold)] transition-colors whitespace-nowrap"
                        >
                            {actionLabel}
                        </button>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
