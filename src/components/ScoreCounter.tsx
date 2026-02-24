import { memo, useState, useEffect, useRef } from 'react';
import { motion, useSpring, useMotionValueEvent } from 'framer-motion';

/**
 * Animated score counter that "rolls" up to the new value.
 * Uses a spring-driven animation so points visibly count up —
 * feels way more satisfying than an instant jump.
 */
export const ScoreCounter = memo(function ScoreCounter({ value }: { value: number }) {
    const spring = useSpring(0, { stiffness: 100, damping: 18 });
    const [display, setDisplay] = useState(0);
    const prevValue = useRef(0);

    useEffect(() => {
        prevValue.current = value;
        spring.set(value);
    }, [value, spring]);

    // Drive visible number from the spring motion value
    useMotionValueEvent(spring, 'change', (v) => {
        setDisplay(Math.round(v));
    });

    return (
        <motion.div
            className="chalk text-[var(--color-gold)] text-7xl leading-none tabular-nums"
            key={value}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.3 }}
            role="status"
            aria-live="polite"
            aria-label={`Score: ${value}`}
        >
            {value === 0 ? (
                <span className="text-5xl leading-tight">Let's<br />Goooooooo!</span>
            ) : display}
        </motion.div>
    );
});
