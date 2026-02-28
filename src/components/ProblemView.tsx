import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useMotionTemplate, animate, type MotionValue } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { EngineItem } from '../engine/domain';
import { usePronunciation } from '../hooks/usePronunciation';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { EtymologyExplainer } from './EtymologyExplainer';

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
    wrongAnswer?: boolean;
    onDismissWrong?: () => void;
    onSwipe: (dir: 'left' | 'right' | 'up' | 'down') => void;
}

const DIRS: Array<'left' | 'down' | 'right'> = ['left', 'down', 'right'];

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
    value, label, dir, glow, frozen, onSwipe, highlighted, correctFlash, reducedMotion,
}: {
    value: number | string; label?: string; dir: 'left' | 'down' | 'right';
    glow: MotionValue<number>; frozen: boolean;
    onSwipe: (d: 'left' | 'right' | 'up' | 'down') => void;
    highlighted?: boolean;
    correctFlash?: boolean;
    reducedMotion?: boolean;
}) {
    const scale = useTransform(glow, [0, 0.3, 1], [1, 1.03, 1.12]);
    const opacity = useTransform(glow, [0, 1], [0.95, 1]);
    // Gold border + text intensity driven by drag distance
    const borderAlpha = useTransform(glow, [0, 0.3, 1], [0, 0.3, 1]);
    const borderColor = useMotionTemplate`rgba(251,191,36,${borderAlpha})`;
    const shadowSpread = useTransform(glow, [0, 1], [0, 16]);
    const boxShadow = useMotionTemplate`0 0 ${shadowSpread}px 2px rgba(251,191,36,0.4)`;

    const text = String(label ?? value);

    return (
        <motion.button
            className="gpu-layer w-full"
            style={{ scale, opacity }}
            onClick={() => !frozen && onSwipe(dir)}
        >
            {/* Answer pill — adapts width to word length */}
            <motion.div
                className={`w-full px-4 py-3.5 rounded-2xl border-2 bg-[var(--color-surface)] flex items-center justify-center ui font-bold active:scale-[0.97] transition-transform ${
                    text.length > 10 ? 'text-[17px]' : text.length > 7 ? 'text-[20px]' : 'text-[24px]'
                } ${correctFlash ? 'border-[var(--color-correct)] text-[var(--color-correct)]'
                    : highlighted ? 'border-[var(--color-gold)] text-[var(--color-gold)]'
                        : 'border-[rgb(var(--color-fg))]/20 text-[var(--color-chalk)]'
                    }`}
                style={!correctFlash && !highlighted ? { borderColor, boxShadow } : {}}
                animate={reducedMotion ? {} : correctFlash ? correctFlashAnim : highlighted ? glowAnim : {}}
                transition={reducedMotion ? {} : correctFlash ? { duration: 0.35 } : highlighted ? glowTransition : {}}
            >
                {text}
            </motion.div>
        </motion.button>
    );
});

export const ProblemView = memo(function ProblemView({ problem, frozen, highlightCorrect, showHints = true, wrongAnswer, onDismissWrong, onSwipe }: Props) {
    const p = problem;
    const displayText = String(p.prompt ?? '');
    const { speak, isSupported: ttsSupported } = usePronunciation();
    const { reducedMotion } = useReducedMotion();
    const [showEtymology, setShowEtymology] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setShowEtymology(false); }, [p.id]);

    const handleSpeak = useCallback(() => {
        const word = p.meta?.['word'];
        if (typeof word === 'string') speak(word);
    }, [p.meta, speak]);

    // Auto-speak word when problem appears (critical for spelling app!)
    useEffect(() => {
        const word = p.meta?.['word'];
        if (typeof word === 'string' && ttsSupported) {
            // Small delay to let the problem render first
            const timer = setTimeout(() => speak(word), 300);
            return () => clearTimeout(timer);
        }
    }, [p.id, p.meta, speak, ttsSupported]);

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
        <div className="landscape-answers flex-1 overflow-y-auto overscroll-contain min-h-0 relative z-10" style={{ touchAction: 'pan-y' }}>
        <motion.div
            className="flex flex-col items-center justify-center min-h-full px-4 pb-20 gpu-layer touch-none"
            onPan={handlePan}
            onPanEnd={handlePanEnd}
        >
            {/* Problem expression / prompt */}
            <motion.div className="text-center mb-8 pr-12" animate={reducedMotion ? {} : pulseAnim}>
                {/* Vocab mode label */}
                {p.meta?.['mode'] === 'vocab' && (
                    <div className="text-xs ui text-[var(--color-gold)] uppercase tracking-wider mb-2 font-semibold">
                        Which word matches?
                    </div>
                )}
                {typeof p.meta?.['definition'] === 'string' ? (
                    <div className={`landscape-question ui font-bold leading-tight tracking-wider text-[var(--color-chalk)] max-w-full px-2 break-words ${(p.meta['definition'] as string).length > 40 ? 'text-lg' : (p.meta['definition'] as string).length > 25 ? 'text-xl' : 'text-2xl'}`}>
                        {p.meta['definition']}
                    </div>
                ) : (
                    <div className={`landscape-question ui font-bold leading-tight tracking-wider text-[var(--color-chalk)] max-w-full px-2 break-words ${displayText.length > 15 ? 'text-xl' : displayText.length > 10 ? 'text-2xl' : 'text-3xl'}`}>
                        {displayText}
                    </div>
                )}
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
                                className="w-10 h-10 flex items-center justify-center text-base opacity-40 hover:opacity-80 transition-opacity"
                                aria-label="Hear pronunciation"
                            >
                                🔊
                            </button>
                        )}
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
            <div className="flex flex-col items-center gap-3 w-full max-w-[320px]">
                {p.options.map((opt, i) => (
                    <AnswerOption
                        key={`${opt}-${i}`}
                        value={opt}
                        label={p.optionLabels?.[i]}
                        dir={DIRS[i]}
                        glow={glows[i]}
                        frozen={frozen}
                        onSwipe={onSwipe}
                        highlighted={highlightCorrect && i === p.correctIndex}
                        correctFlash={frozen && i === p.correctIndex}
                        reducedMotion={reducedMotion}
                    />
                ))}
            </div>

            {/* Wrong-answer detail panel — tap to dismiss */}
            {frozen && wrongAnswer && onDismissWrong && (
                <motion.div
                    className="mt-4 w-full max-w-[320px] rounded-2xl border border-[var(--color-wrong)]/30 bg-[var(--color-wrong)]/5 px-4 py-3"
                    initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    {/* Correct word */}
                    <div className="text-center mb-2">
                        <span className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase tracking-wider">Correct spelling</span>
                        <div className="text-lg chalk text-[var(--color-correct)] font-bold">
                            {typeof p.meta?.['word'] === 'string' ? p.meta['word'] : String(p.options[p.correctIndex])}
                        </div>
                    </div>

                    {/* Definition */}
                    {typeof p.meta?.['definition'] === 'string' && p.meta['mode'] !== 'vocab' && (
                        <div className="text-xs ui text-[rgb(var(--color-fg))]/50 text-center mb-1.5">
                            {p.meta['definition']}
                        </div>
                    )}

                    {/* Etymology — toggle between simple and full explainer */}
                    {typeof p.meta?.['etymology'] === 'string' && (
                        showEtymology ? (
                            <div className="mb-2">
                                <EtymologyExplainer
                                    etymology={p.meta['etymology'] as string}
                                    word={typeof p.meta?.['word'] === 'string' ? p.meta['word'] as string : undefined}
                                />
                            </div>
                        ) : (
                            <div className="text-xs ui text-[rgb(var(--color-fg))]/35 text-center italic mb-1.5">
                                {p.meta['etymology']}
                            </div>
                        )
                    )}

                    {/* Action row: pronunciation + explore origin */}
                    <div className="flex items-center justify-center gap-3 mb-2">
                        {ttsSupported && typeof p.meta?.['word'] === 'string' && (
                            <button
                                type="button"
                                onClick={handleSpeak}
                                className="flex items-center gap-1 text-xs ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/70 transition-colors"
                            >
                                <span>🔊</span> Hear it
                            </button>
                        )}
                        {typeof p.meta?.['etymology'] === 'string' && !showEtymology && (
                            <button
                                type="button"
                                onClick={() => setShowEtymology(true)}
                                className="text-xs ui text-[var(--color-gold)]/60 hover:text-[var(--color-gold)] transition-colors"
                            >
                                Explore origin
                            </button>
                        )}
                    </div>

                    {/* Tap to continue */}
                    <button
                        type="button"
                        onClick={onDismissWrong}
                        className="w-full mt-1 py-2 rounded-xl bg-[rgb(var(--color-fg))]/10 text-xs ui text-[rgb(var(--color-fg))]/50 hover:bg-[rgb(var(--color-fg))]/15 transition-colors"
                    >
                        tap to continue
                    </button>
                </motion.div>
            )}

            {/* Skip hint — only on the very first question */}
            {showHints && !wrongAnswer && (
                <div className="mt-6 flex flex-col items-center text-[rgb(var(--color-fg))]/20">
                    <span className="text-[10px] ui tracking-wider">swipe up to skip</span>
                </div>
            )}
        </motion.div>
        </div>
    );
});
