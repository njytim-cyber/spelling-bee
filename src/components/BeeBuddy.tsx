/**
 * components/BeeBuddy.tsx
 *
 * Cute cartoon bee mascot — the app's companion character.
 * Chalk-line aesthetic (stroke only, currentColor, no fills).
 * Same animation system and message bubble as the original MrChalk.
 */
import { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type TargetAndTransition } from 'framer-motion';
import type { ChalkState } from '../engine/domain';
import { pickChalkMessage, type ChalkContext, type ChalkMessageOverrides } from '../utils/chalkMessages';

// ── Component-level animations (bounce/shake) ────────────────────────────────
// Same timing as the original — the whole character moves with these

const ANIMS: Record<ChalkState, TargetAndTransition> = {
    idle: { y: [0, -6, 0], rotate: [0, 2, -2, 0], transition: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' as const } },
    success: { scale: [1, 1.25, 1], y: [0, -14, 0], transition: { duration: 0.45 } },
    fail: { x: [-6, 6, -6, 6, 0], transition: { duration: 0.4 } },
    streak: { y: [0, -8, 0], scale: [1, 1.1, 1], rotate: [0, -3, 3, 0], transition: { repeat: Infinity, duration: 0.7, ease: 'easeInOut' as const } },
    comeback: { scale: [1, 1.2, 1], y: [0, -10, 0], transition: { duration: 0.5 } },
    struggling: { x: [-8, 8, -6, 6, -3, 3, 0], y: [0, 3, 0], transition: { duration: 0.55 } },
};

// ── Wing flutter speeds per state ─────────────────────────────────────────────

const WING_FLUTTER: Record<ChalkState, TargetAndTransition> = {
    idle: { scaleX: [1, 0.5, 1], transition: { repeat: Infinity, duration: 0.4, ease: 'easeInOut' as const } },
    success: { scaleX: [1, 0.2, 1], transition: { repeat: Infinity, duration: 0.15, ease: 'easeInOut' as const } },
    fail: { scaleX: [1, 0.7, 1], transition: { repeat: Infinity, duration: 0.8, ease: 'easeInOut' as const } },
    streak: { scaleX: [1, 0.15, 1], transition: { repeat: Infinity, duration: 0.1, ease: 'easeInOut' as const } },
    comeback: { scaleX: [1, 0.3, 1], transition: { repeat: Infinity, duration: 0.2, ease: 'easeInOut' as const } },
    struggling: { scaleX: [1, 0.85, 1], transition: { repeat: Infinity, duration: 1.0, ease: 'easeInOut' as const } },
};

// ── Bee body parts (static SVG) ───────────────────────────────────────────────

/** Oval torso with horizontal stripes */
const BeeBody = () => (
    <g>
        {/* Torso */}
        <ellipse cx="50" cy="82" rx="20" ry="26" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.8" />
        {/* Stripes */}
        <path d="M 32 74 Q 50 71 68 74" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M 31 82 Q 50 79 69 82" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M 32 90 Q 50 87 68 90" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
        {/* Stinger */}
        <path d="M 46 107 L 50 116 L 54 107" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
    </g>
);

/** Three pairs of tiny legs */
const BeeLegs = () => (
    <g opacity="0.5">
        <line x1="36" y1="95" x2="28" y2="108" stroke="currentColor" strokeWidth="1.5" />
        <line x1="64" y1="95" x2="72" y2="108" stroke="currentColor" strokeWidth="1.5" />
        <line x1="33" y1="86" x2="24" y2="96" stroke="currentColor" strokeWidth="1.5" />
        <line x1="67" y1="86" x2="76" y2="96" stroke="currentColor" strokeWidth="1.5" />
        <line x1="34" y1="78" x2="26" y2="84" stroke="currentColor" strokeWidth="1.5" />
        <line x1="66" y1="78" x2="74" y2="84" stroke="currentColor" strokeWidth="1.5" />
    </g>
);

// ── Face expressions ──────────────────────────────────────────────────────────

const FACES: Record<ChalkState, React.ReactNode> = {
    idle: (
        <>
            <circle cx="42" cy="40" r="2.5" fill="currentColor" opacity="0.8" />
            <circle cx="58" cy="40" r="2.5" fill="currentColor" opacity="0.8" />
            <path d="M 42 50 Q 50 56 58 50" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.7" />
        </>
    ),
    success: (
        <>
            {/* Happy arched eyes */}
            <path d="M 38 40 Q 42 35 46 40" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M 54 40 Q 58 35 62 40" stroke="currentColor" strokeWidth="2" fill="none" />
            {/* Big grin */}
            <path d="M 40 50 Q 50 62 60 50" stroke="currentColor" strokeWidth="2.5" fill="none" />
            {/* Rosy cheeks */}
            <circle cx="36" cy="48" r="3.5" fill="currentColor" opacity="0.1" />
            <circle cx="64" cy="48" r="3.5" fill="currentColor" opacity="0.1" />
        </>
    ),
    fail: (
        <>
            {/* X eyes */}
            <line x1="38" y1="36" x2="46" y2="44" stroke="currentColor" strokeWidth="2" />
            <line x1="46" y1="36" x2="38" y2="44" stroke="currentColor" strokeWidth="2" />
            <line x1="54" y1="36" x2="62" y2="44" stroke="currentColor" strokeWidth="2" />
            <line x1="62" y1="36" x2="54" y2="44" stroke="currentColor" strokeWidth="2" />
            {/* O mouth */}
            <circle cx="50" cy="53" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
            {/* Sweat drop */}
            <ellipse cx="68" cy="34" rx="2" ry="3.5" fill="currentColor" opacity="0.3" />
        </>
    ),
    streak: (
        <>
            {/* Cool sunglasses */}
            <rect x="33" y="36" width="14" height="7" rx="3" fill="currentColor" opacity="0.85" />
            <rect x="53" y="36" width="14" height="7" rx="3" fill="currentColor" opacity="0.85" />
            <line x1="47" y1="39" x2="53" y2="39" stroke="currentColor" strokeWidth="1.5" />
            {/* Cool smirk */}
            <path d="M 44 53 Q 52 57 58 51" stroke="currentColor" strokeWidth="2" fill="none" />
        </>
    ),
    comeback: (
        <>
            {/* Determined eyes */}
            <circle cx="42" cy="40" r="3" fill="currentColor" opacity="0.8" />
            <circle cx="58" cy="40" r="3" fill="currentColor" opacity="0.8" />
            {/* Determined grin */}
            <path d="M 40 50 Q 50 60 60 50" stroke="currentColor" strokeWidth="2.5" fill="none" />
        </>
    ),
    struggling: (
        <>
            {/* X eyes with droopy brows */}
            <line x1="38" y1="37" x2="46" y2="44" stroke="currentColor" strokeWidth="2" opacity="0.9" />
            <line x1="46" y1="37" x2="38" y2="44" stroke="currentColor" strokeWidth="2" opacity="0.9" />
            <line x1="54" y1="37" x2="62" y2="44" stroke="currentColor" strokeWidth="2" opacity="0.9" />
            <line x1="62" y1="37" x2="54" y2="44" stroke="currentColor" strokeWidth="2" opacity="0.9" />
            {/* Droopy brows */}
            <line x1="36" y1="33" x2="48" y2="35" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <line x1="64" y1="33" x2="52" y2="35" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            {/* Flat mouth */}
            <line x1="42" y1="53" x2="58" y2="53" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            {/* Sweat drop */}
            <ellipse cx="70" cy="36" rx="2" ry="3.5" fill="currentColor" opacity="0.4" />
        </>
    ),
};

// ── Costumes ──────────────────────────────────────────────────────────────────

import { COSTUMES } from '../utils/costumes';

// ── Main Component ────────────────────────────────────────────────────────────

export const BeeBuddy = memo(function BeeBuddy({
    state, costume, streak = 0, totalAnswered = 0,
    questionType = 'cvc', hardMode = false, timedMode = false,
    pingMessage = null,
    messageOverrides,
}: {
    state: ChalkState;
    costume?: string;
    streak?: number;
    totalAnswered?: number;
    questionType?: string;
    hardMode?: boolean;
    timedMode?: boolean;
    pingMessage?: string | null;
    messageOverrides?: ChalkMessageOverrides;
}) {
    const [message, setMessage] = useState('');
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const ctxRef = useRef<{ state: ChalkState; streak: number; totalAnswered: number; categoryId: string; hardMode: boolean; timedMode: boolean }>(
        { state, streak, totalAnswered, categoryId: questionType, hardMode, timedMode }
    );
    useEffect(() => {
        ctxRef.current = { state, streak, totalAnswered, categoryId: questionType, hardMode, timedMode };
    });

    // Pick message when deps change (React-recommended setState-in-render pattern)
    const depsKey = `${state}-${streak}-${totalAnswered}-${questionType}-${hardMode}-${timedMode}`;
    const [prevDepsKey, setPrevDepsKey] = useState('');
    if (depsKey !== prevDepsKey) {
        setPrevDepsKey(depsKey);
        const ctx: ChalkContext = { state, streak, totalAnswered, categoryId: questionType, hardMode, timedMode };
        setMessage(pickChalkMessage(ctx, messageOverrides ?? {}));
    }

    // Auto-clear message after timeout
    useEffect(() => {
        if (!message || pingMessage !== null) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setMessage(''), state === 'idle' ? 4000 : 2500);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [message, state, pingMessage]);

    // Idle message rotation
    useEffect(() => {
        if (state !== 'idle') return;
        const ctx: ChalkContext = { state, streak, totalAnswered, categoryId: questionType, hardMode, timedMode };
        const interval = setInterval(() => setMessage(pickChalkMessage({ ...ctx, state: 'idle' }, messageOverrides ?? {})), 5000);
        return () => clearInterval(interval);
    }, [state, questionType, streak, totalAnswered, hardMode, timedMode, messageOverrides]);

    const displayState = pingMessage ? 'comeback' : state;
    const currentMessage = pingMessage || message;

    return (
        <motion.div
            className={`absolute bottom-20 right-2 pointer-events-none z-30 ${displayState === 'streak' ? 'on-fire' : ''}`}
            animate={ANIMS[displayState]}
        >
            {/* Speech bubble */}
            <AnimatePresence mode="wait">
                {currentMessage && (
                    <motion.div
                        key={currentMessage}
                        initial={{ opacity: 0, y: 8, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.8 }}
                        transition={{ duration: 0.25 }}
                        className="absolute bottom-full mb-2 right-0 w-max max-w-[200px] text-right bg-[var(--color-surface)] border border-[rgb(var(--color-fg))]/15 rounded-xl px-3 py-1.5 text-[12px] ui text-[rgb(var(--color-fg))]/80 leading-snug"
                    >
                        {currentMessage}
                        <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-[var(--color-overlay)] border-b border-r border-[rgb(var(--color-fg))]/15 rotate-45" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bee SVG */}
            <svg viewBox="0 0 100 130" className="w-[72px] h-[115px]" style={{ color: 'var(--color-chalk)' }}>
                {/* Antennae — bounce with state */}
                <motion.g
                    animate={{ rotate: [-3, 3, -3], transition: { repeat: Infinity, duration: displayState === 'struggling' ? 2.5 : 1.2, ease: 'easeInOut' } }}
                    style={{ originX: '50px', originY: '25px' }}
                >
                    {/* Left antenna */}
                    <path d="M 42 25 Q 34 8 28 12" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
                    <circle cx="28" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
                    {/* Right antenna */}
                    <path d="M 58 25 Q 66 8 72 12" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
                    <circle cx="72" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
                </motion.g>

                {/* Head */}
                <circle cx="50" cy="38" r="18" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.8" />

                {/* Face expressions */}
                {FACES[displayState] || FACES.idle}

                {/* Wings — flutter speed varies by state */}
                <motion.ellipse
                    cx="24" cy="68"
                    rx="16" ry="20"
                    stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"
                    style={{ originX: '35px', originY: '68px' }}
                    animate={WING_FLUTTER[displayState]}
                />
                <motion.ellipse
                    cx="76" cy="68"
                    rx="16" ry="20"
                    stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"
                    style={{ originX: '65px', originY: '68px' }}
                    animate={WING_FLUTTER[displayState]}
                />

                {/* Body + stripes + stinger */}
                <BeeBody />

                {/* Legs */}
                <BeeLegs />

                {/* Costume overlay */}
                {costume && COSTUMES[costume]}
            </svg>

            {/* Honey pot emoji on streak (instead of fire) */}
            {displayState === 'streak' && (
                <span className="absolute -top-1 right-0 text-xl pointer-events-none">🍯</span>
            )}
        </motion.div>
    );
});
