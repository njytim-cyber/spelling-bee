/** Animated bottom-sheet toast — used for achievements, streak shields, day streaks. */
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    visible: boolean;
    icon: string;
    title: string;
    subtitle?: string;
    /** Unique key for AnimatePresence — defaults to title */
    toastKey?: string;
}

export function Toast({ visible, icon, title, subtitle, toastKey }: Props) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key={toastKey ?? title}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 40 }}
                    transition={{ duration: 0.3 }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-overlay)] border border-[var(--color-gold)]/30 rounded-2xl px-5 py-3 flex items-center gap-3"
                >
                    <span className="text-2xl">{icon}</span>
                    <div>
                        <div className="text-sm ui font-bold text-[var(--color-gold)]">{title}</div>
                        {subtitle && <div className="text-xs ui text-[rgb(var(--color-fg))]/40">{subtitle}</div>}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
