import { memo, useState, useEffect, useRef } from 'react';
import { motion, useSpring, useMotionValueEvent, useAnimate } from 'framer-motion';

/**
 * Animated score counter that "rolls" up to the new value.
 * Uses a spring-driven animation so points visibly count up —
 * feels way more satisfying than an instant jump.
 */
export const ScoreCounter = memo(function ScoreCounter({ value }: { value: number }) {
    const spring = useSpring(0, { stiffness: 100, damping: 18 });
    const [display, setDisplay] = useState(0);
    const prevValue = useRef(0);
    const [scope, animate] = useAnimate();

    useEffect(() => {
        // Pop animation only when score actually increases
        if (value > prevValue.current) {
            animate(scope.current, { scale: [1, 1.2, 1] }, { duration: 0.3 });
        }
        prevValue.current = value;
        spring.set(value);
    }, [value, spring, animate, scope]);

    // Drive visible number from the spring motion value
    useMotionValueEvent(spring, 'change', (v) => {
        setDisplay(Math.round(v));
    });

    return (
        <motion.div
            ref={scope}
            className="chalk text-[var(--color-gold)] text-7xl leading-none tabular-nums text-center"
            role="status"
            aria-live="polite"
            aria-label={`Score: ${value}`}
        >
            {display}
        </motion.div>
    );
});
