/**
 * 3-2-1-GO countdown overlay for timer-based word games.
 * Full-screen overlay with scale-in/out animation and beep per tick.
 */
import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playCountdownBeep } from '../../utils/soundEffects';

interface Props {
    onComplete: () => void;
}

const STEPS = ['3', '2', '1', 'GO!'];

export const CountdownOverlay = memo(function CountdownOverlay({ onComplete }: Props) {
    const [step, setStep] = useState(0);

    useEffect(() => {
        playCountdownBeep(step);
        if (step >= STEPS.length) { onComplete(); return; }
        const delay = step < STEPS.length - 1 ? 800 : 500; // GO! is shorter
        const t = setTimeout(() => setStep(s => s + 1), delay);
        return () => clearTimeout(t);
    }, [step, onComplete]);

    return (
        <AnimatePresence>
            {step < STEPS.length && (
                <motion.div
                    className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={step}
                            initial={{ scale: 2.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 18,
                            }}
                            className={`chalk font-bold ${
                                step === STEPS.length - 1
                                    ? 'text-6xl text-[var(--color-gold)]'
                                    : 'text-7xl text-[var(--color-chalk)]'
                            }`}
                        >
                            {STEPS[step]}
                        </motion.span>
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
