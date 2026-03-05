/**
 * components/ChallengeBanner.tsx
 *
 * Animated banner shown at the start of a challenge session
 * when the user arrives via a `?c=` link with score target.
 */
import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    targetScore?: number;
    targetAccuracy?: number;
}

export const ChallengeBanner = memo(function ChallengeBanner({ targetScore, targetAccuracy }: Props) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setVisible(false), 4000);
        return () => clearTimeout(t);
    }, []);

    if (!targetScore && !targetAccuracy) return null;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="absolute top-2 left-4 right-4 z-40 px-4 py-2.5 rounded-2xl bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/30 text-center"
                >
                    <div className="text-xs ui font-semibold text-[var(--color-gold)]">
                        ⚔️ Challenge received!
                    </div>
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/50 mt-0.5">
                        Beat their score of {targetScore} pts{targetAccuracy != null ? ` · ${targetAccuracy}%` : ''}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
