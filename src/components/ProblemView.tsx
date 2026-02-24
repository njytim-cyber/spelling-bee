import { memo, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useMotionTemplate, animate, type MotionValue } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { EngineItem } from '../engine/domain';
import { usePronunciation } from '../hooks/usePronunciation';

/** Arrow-key → swipe direction map for desktop play */
const KEY_MAP: Record<string, 'left' | 'right' | 'up' | 'down'> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowDown: 'down',
    ArrowUp: 'up',
};
interface Props {
    problem: EngineItem;
    frozen: boolean;
    highlightCorrect?: boolean;
    showHints?: boolean;
    onSwipe: (dir: 'left' | 'right' | 'up' | 'down') => void;
}

const DIRS: Array<'left' | 'down' | 'right'> = ['left', 'down', 'right'];
const DIR_LABELS = ['<', 'v', '>'];

const pulseAnim = {
    scale: [1, 1.03, 1],
    transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' as const },
};

/** Glow animation for the tutorial-highlighted answer */
const glowAnim = {
    boxShadow: [
        '0 0 0 0 rgba(255,255,255,0)',
        '0 0 20px 4px rgba(251,191,36,0.5)',
        '0 0 0 0 rgba(255,255,255,0)',
    ],
    scale: [1, 1.08, 1],
};

const glowTransition = { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const };

/** Single answer option */
const correctFlashAnim = {
    scale: [1, 1.15, 1],
    boxShadow: [
        '0 0 0 0 rgba(74,222,128,0)',
        '0 0 20px 6px rgba(74,222,128,0.6)',
        '0 0 0 0 rgba(74,222,128,0)',
    ],
};

const AnswerOption = memo(function AnswerOption({
    value, label, dir, dirLabel, glow, frozen, onSwipe, highlighted, correctFlash, showHint,
}: {
    value: number | string; label?: string; dir: 'left' | 'down' | 'right'; dirLabel: string;
    glow: MotionValue<number>; frozen: boolean;
    onSwipe: (d: 'left' | 'right' | 'up' | 'down') => void;
    highlighted?: boolean;
    correctFlash?: boolean;
    showHint?: boolean;
}) {
    const scale = useTransform(glow, [0, 0.3, 1], [1, 1.05, 1.35]);
    const opacity = useTransform(glow, [0, 1], [0.95, 1]);
    // Gold border + text intensity driven by drag distance
    const borderAlpha = useTransform(glow, [0, 0.3, 1], [0, 0.3, 1]);
    const borderColor = useMotionTemplate`rgba(251,191,36,${borderAlpha})`;
    const shadowSpread = useTransform(glow, [0, 1], [0, 16]);
    const boxShadow = useMotionTemplate`0 0 ${shadowSpread}px 2px rgba(251,191,36,0.4)`;

    return (
        <motion.button
            className="flex flex-col items-center gap-2 flex-1 gpu-layer"
            style={{ scale, opacity }}
            onClick={() => !frozen && onSwipe(dir)}
        >
            {/* Direction chevron — glows gold if highlighted, hidden after first swipes */}
            {showHint !== false && (
                <motion.div
                    className={`text-xl tracking-widest font-bold ui ${highlighted ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/80'}`}
                    animate={highlighted ? { opacity: [0.5, 1, 0.5] } : {}}
                    transition={highlighted ? { duration: 1, repeat: Infinity } : {}}
                >
                    {dirLabel}
                </motion.div>
            )}
            {/* Answer bubble — lights up gold as you drag toward it */}
            <motion.div
                className={`w-[80px] h-[80px] rounded-full border-2 bg-[var(--color-surface)] flex items-center justify-center text-[28px] chalk active:scale-90 transition-transform ${correctFlash ? 'border-[var(--color-correct)] text-[var(--color-correct)]'
                    : highlighted ? 'border-[var(--color-gold)] text-[var(--color-gold)]'
                        : 'border-[rgb(var(--color-fg))]/50 text-[var(--color-chalk)]'
                    }`}
                style={!correctFlash && !highlighted ? { borderColor, boxShadow } : {}}
                animate={correctFlash ? correctFlashAnim : highlighted ? glowAnim : {}}
                transition={correctFlash ? { duration: 0.35 } : highlighted ? glowTransition : {}}
            >
                {label ?? value}
            </motion.div>
        </motion.button>
    );
});

export const ProblemView = memo(function ProblemView({ problem, frozen, highlightCorrect, showHints = true, onSwipe }: Props) {
    const p = problem;
    const displayText = String(p.prompt ?? '');
    const { speak, isSupported: ttsSupported } = usePronunciation();

    const handleSpeak = useCallback(() => {
        const word = p.meta?.['word'];
        if (typeof word === 'string') speak(word);
    }, [p.meta, speak]);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Desktop arrow-key support (stable listener — no churn)
    const onSwipeRef = useRef(onSwipe);
    const frozenRef = useRef(frozen);
    useEffect(() => { onSwipeRef.current = onSwipe; }, [onSwipe]);
    useEffect(() => { frozenRef.current = frozen; }, [frozen]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const dir = KEY_MAP[e.key];
            if (dir && !frozenRef.current) {
                e.preventDefault();
                onSwipeRef.current(dir);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const leftGlow = useTransform(x, [-140, -50, 0], [1, 0.3, 0]);
    const rightGlow = useTransform(x, [0, 50, 140], [0, 0.3, 1]);
    const downGlow = useTransform(y, [0, 50, 140], [0, 0.3, 1]);
    const glows = [leftGlow, downGlow, rightGlow];



    const handlePan = (_: unknown, info: PanInfo) => {
        if (!frozen) {
            x.set(info.offset.x);
            y.set(info.offset.y);
        }
    };

    const handlePanEnd = (_: unknown, info: PanInfo) => {
        if (frozen) return;
        // Snap the local touch point back to 0 so the answer glows recede naturally
        animate(x, 0, { duration: 0.3, bounce: 0 });
        animate(y, 0, { duration: 0.3, bounce: 0 });

        const t = 80;
        if (info.offset.y < -t || info.velocity.y < -400) onSwipe('up');
        else if (info.offset.y > t || info.velocity.y > 400) onSwipe('down');
        else if (info.offset.x > t || info.velocity.x > 400) onSwipe('right');
        else if (info.offset.x < -t || info.velocity.x < -400) onSwipe('left');
    };

    return (
        <motion.div
            className="landscape-answers flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-24 relative z-10 gpu-layer touch-none"
            onPan={handlePan}
            onPanEnd={handlePanEnd}
        >
            {/* Problem expression / prompt */}
            <motion.div className="text-center mb-12" animate={pulseAnim}>
                <div className={`landscape-question chalk leading-tight tracking-wider text-[var(--color-chalk)] max-w-full px-2 ${displayText.length > 15 ? 'text-2xl' : displayText.length > 10 ? 'text-4xl' : 'text-6xl'}`}>
                    {displayText}
                </div>
                {/* Rich metadata row: part of speech + pronunciation button */}
                {(typeof p.meta?.['partOfSpeech'] === 'string' || ttsSupported) && (
                    <div className="mt-2 flex items-center justify-center gap-2">
                        {typeof p.meta?.['partOfSpeech'] === 'string' && (
                            <span className="text-xs ui text-[rgb(var(--color-fg))]/30 italic">
                                ({p.meta['partOfSpeech']})
                            </span>
                        )}
                        {ttsSupported && typeof p.meta?.['word'] === 'string' && (
                            <button
                                type="button"
                                onClick={handleSpeak}
                                className="text-base opacity-40 hover:opacity-80 transition-opacity"
                                aria-label="Hear pronunciation"
                            >
                                🔊
                            </button>
                        )}
                    </div>
                )}
                {/* Definition hint from meta */}
                {typeof p.meta?.['definition'] === 'string' && (
                    <div className="mt-2 text-sm ui text-[rgb(var(--color-fg))]/40 italic max-w-[300px] mx-auto">
                        {p.meta['definition']}
                    </div>
                )}
                {/* Example sentence — shown after answering (frozen state) */}
                {frozen && typeof p.meta?.['exampleSentence'] === 'string' && (
                    <div className="mt-2 text-xs ui text-[rgb(var(--color-fg))]/30 max-w-[300px] mx-auto">
                        &ldquo;{p.meta['exampleSentence']}&rdquo;
                    </div>
                )}
            </motion.div>

            {/* Answer options */}
            <div className="flex items-center justify-center gap-3 w-full max-w-[380px]">
                {p.options.map((opt, i) => (
                    <AnswerOption
                        key={`${opt}-${i}`}
                        value={opt}
                        label={p.optionLabels?.[i]}
                        dir={DIRS[i]}
                        dirLabel={DIR_LABELS[i]}
                        glow={glows[i]}
                        frozen={frozen}
                        onSwipe={onSwipe}
                        highlighted={highlightCorrect && i === p.correctIndex}
                        correctFlash={frozen && i === p.correctIndex}
                        showHint={showHints}
                    />
                ))}
            </div>

            {/* Skip hint */}
            {showHints && (
                <div className="mt-8 flex flex-col items-center text-[rgb(var(--color-fg))]/60">
                    <div className="text-xl font-bold tracking-wider ui">^</div>
                    <span className="text-xs ui mt-1 tracking-wider">skip</span>
                </div>
            )}
        </motion.div>
    );
});
