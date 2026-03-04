import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useMotionTemplate, animate, type MotionValue } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { EngineItem } from '../engine/domain';
import { usePronunciation } from '../hooks/usePronunciation';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { EtymologyExplainer } from './EtymologyExplainer';
import { IconSpeaker } from './Icons';

/** Arrow-key → swipe direction map for desktop play */
const KEY_MAP: Record<string, 'left' | 'right' | 'up' | 'down'> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowDown: 'down',
    ArrowUp: 'up',
    '1': 'left',
    '2': 'down',
    '3': 'right',
};
interface Props {
    problem: EngineItem;
    frozen: boolean;
    highlightCorrect?: boolean;
    showHints?: boolean;
    /** Show directional swipe tutorial on the very first question */
    showTutorial?: boolean;
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
            onKeyDown={(e) => { if (frozen && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); }}
            aria-label={`Answer: ${text}`}
            aria-disabled={frozen}
            tabIndex={frozen ? -1 : 0}
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

const DIR_HINTS = ['← swipe left', 'swipe down ↓', 'swipe right →'];

export const ProblemView = memo(function ProblemView({ problem, frozen, highlightCorrect, showHints = true, showTutorial, wrongAnswer, onDismissWrong, onSwipe }: Props) {
    const p = problem;
    const displayText = String(p.prompt ?? '');
    const { speak, isSupported: ttsSupported, ttsFailed } = usePronunciation();
    const { reducedMotion } = useReducedMotion();
    const [showEtymology, setShowEtymology] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
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

    const speakRef = useRef(handleSpeak);
    useEffect(() => { speakRef.current = handleSpeak; }, [handleSpeak]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Replay audio
            if (e.key === ' ' || e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                speakRef.current();
                return;
            }
            // Toggle shortcut help
            if (e.key === '?') {
                e.preventDefault();
                setShowShortcuts(prev => !prev);
                return;
            }
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
            className="flex flex-col items-center justify-center min-h-full px-4 pb-20 landscape-compact-pb gpu-layer touch-none"
            onPan={handlePan}
            onPanEnd={handlePanEnd}
        >
            {/* Problem expression / prompt */}
            <motion.div className="text-center mb-8 landscape-compact-mb px-14" animate={reducedMotion ? {} : pulseAnim}>
                {/* Vocab mode label */}
                {p.meta?.['mode'] === 'vocab' && (
                    <div className="text-xs ui text-[var(--color-gold)] uppercase tracking-wider mb-2 font-semibold">
                        Which word matches?
                    </div>
                )}
                {/* Speaker icon — own line above pill */}
                {ttsSupported && typeof p.meta?.['word'] === 'string' && (
                    <button
                        type="button"
                        onClick={handleSpeak}
                        className="mb-2 w-10 h-10 mx-auto flex items-center justify-center opacity-40 hover:opacity-80 transition-opacity"
                        aria-label="Hear pronunciation"
                    >
                        <IconSpeaker className="w-5 h-5" />
                    </button>
                )}
                {/* Part of speech tag — above definition */}
                {typeof p.meta?.['partOfSpeech'] === 'string' && (
                    <div className="mb-2">
                        <span className="text-[10px] ui uppercase tracking-widest text-[rgb(var(--color-fg))]/30 border border-[rgb(var(--color-fg))]/15 rounded-full px-2.5 py-0.5">
                            {p.meta['partOfSpeech']}
                        </span>
                    </div>
                )}
                {/* Definition */}
                {typeof p.meta?.['definition'] === 'string' ? (
                    <div className={`landscape-question ui font-bold leading-tight tracking-wider text-[var(--color-chalk)] max-w-full break-words ${(p.meta['definition'] as string).length > 40 ? 'text-lg' : (p.meta['definition'] as string).length > 25 ? 'text-xl' : 'text-2xl'}`}>
                        {p.meta['definition']}
                    </div>
                ) : (
                    <div className={`landscape-question ui font-bold leading-tight tracking-wider text-[var(--color-chalk)] max-w-full break-words ${displayText.length > 15 ? 'text-xl' : displayText.length > 10 ? 'text-2xl' : 'text-3xl'}`}>
                        {displayText}
                    </div>
                )}
                {ttsFailed && (
                    <span className="text-[9px] ui text-[var(--color-wrong)]/50 mt-1 block">audio unavailable</span>
                )}
                {/* Example sentence — shown after answering (frozen state) */}
                {frozen && typeof p.meta?.['exampleSentence'] === 'string' && (
                    <div className="mt-2 text-xs ui text-[rgb(var(--color-fg))]/30 max-w-[var(--content-w)] mx-auto">
                        &ldquo;{p.meta['exampleSentence']}&rdquo;
                    </div>
                )}
            </motion.div>

            {/* Answer options */}
            <div className="flex flex-col items-center gap-3 w-full max-w-[var(--content-w)]">
                {p.options.map((opt, i) => (
                    <div key={`${opt}-${i}`} className="w-full">
                        <AnswerOption
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
                        {showTutorial && !frozen && (
                            <div className={`text-[9px] ui mt-0.5 ${
                                highlightCorrect && i === p.correctIndex
                                    ? 'text-[var(--color-gold)]/60 font-medium text-center'
                                    : `text-[rgb(var(--color-fg))]/25 ${i === 0 ? 'text-left pl-2' : i === 2 ? 'text-right pr-2' : 'text-center'}`
                            }`}>
                                {highlightCorrect && i === p.correctIndex ? '↑ tap or swipe this one' : DIR_HINTS[i]}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Wrong-answer detail panel — tap to dismiss */}
            {frozen && wrongAnswer && onDismissWrong && (
                <motion.div
                    className="mt-4 w-full max-w-[var(--content-w)] max-h-[60vh] overflow-y-auto rounded-2xl border border-[var(--color-wrong)]/30 bg-[var(--color-wrong)]/5 px-4 py-3"
                    initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    {/* Correct word — chalk write-in animation */}
                    <div className="text-center mb-2">
                        <span className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase tracking-wider">Correct spelling</span>
                        <div className={`text-lg chalk text-[var(--color-correct)] font-bold ${reducedMotion ? '' : 'chalk-write-in'}`}>
                            {(() => {
                                const word = typeof p.meta?.['word'] === 'string' ? p.meta['word'] : String(p.options[p.correctIndex]);
                                if (reducedMotion) return word;
                                return word.split('').map((ch, i) => (
                                    <span key={i} style={{ animationDelay: `${i * 60}ms` }}>{ch}</span>
                                ));
                            })()}
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
                                aria-label="Hear pronunciation"
                                className="flex items-center gap-1 text-xs ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/70 transition-colors"
                            >
                                <IconSpeaker className="w-3.5 h-3.5" />
                                <span>Hear it</span>
                            </button>
                        )}
                        {typeof p.meta?.['etymology'] === 'string' && !showEtymology && (
                            <button
                                type="button"
                                onClick={() => setShowEtymology(true)}
                                aria-label="Show word etymology"
                                className="text-xs ui text-[var(--color-gold)]/60 hover:text-[var(--color-gold)] transition-colors"
                            >
                                Explore origin
                            </button>
                        )}
                    </div>

                    {/* Tap to continue */}
                    <motion.button
                        type="button"
                        onClick={onDismissWrong}
                        className="w-full mt-2 py-2.5 rounded-xl bg-[rgb(var(--color-fg))]/10 text-sm ui font-medium text-[rgb(var(--color-fg))]/60 hover:bg-[rgb(var(--color-fg))]/15 transition-colors"
                        animate={reducedMotion ? {} : { opacity: [0.5, 1, 0.5] }}
                        transition={reducedMotion ? {} : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        Tap to continue →
                    </motion.button>
                </motion.div>
            )}

            {/* Hints — swipe/tap instructions for early questions */}
            {showHints && !wrongAnswer && !frozen && (
                <div className="mt-6 flex flex-col items-center text-[rgb(var(--color-fg))]/20">
                    <span className="text-[10px] ui tracking-wider">{showTutorial ? 'swipe or tap your answer · swipe ↑ to skip' : 'swipe ↑ to skip'}</span>
                </div>
            )}

            {/* Keyboard shortcut overlay */}
            {showShortcuts && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
                    onClick={() => setShowShortcuts(false)}
                >
                    <div
                        className="w-[280px] bg-[var(--color-surface)] rounded-2xl p-5 border border-[rgb(var(--color-fg))]/10"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-sm ui font-bold text-[var(--color-chalk)] mb-3 text-center">Keyboard Shortcuts</h3>
                        <div className="space-y-2 text-xs ui text-[rgb(var(--color-fg))]/60">
                            {[
                                ['←  or  1', 'Option 1 (left)'],
                                ['↓  or  2', 'Option 2 (center)'],
                                ['→  or  3', 'Option 3 (right)'],
                                ['↑', 'Skip word'],
                                ['Space / R', 'Replay audio'],
                                ['?', 'Toggle this help'],
                            ].map(([key, desc]) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="font-mono text-[var(--color-gold)] text-[11px]">{key}</span>
                                    <span>{desc}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowShortcuts(false)}
                            className="w-full mt-4 py-2 rounded-xl text-xs ui text-[rgb(var(--color-fg))]/40 bg-[rgb(var(--color-fg))]/5 hover:bg-[rgb(var(--color-fg))]/10 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
        </div>
    );
});
