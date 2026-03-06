import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { EngineItem } from '../engine/domain';
import { usePronunciation } from '../hooks/usePronunciation';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { EtymologyExplainer } from './EtymologyExplainer';
import { SpellingInput } from './SpellingInput';
import { SpellingDiffView } from './SpellingDiffView';
import { IconSpeaker } from './Icons';

/** Keyboard shortcuts: number keys select answer options */
const ANSWER_KEYS: Record<string, number> = { '1': 0, '2': 1, '3': 2 };

interface Props {
    problem: EngineItem;
    frozen: boolean;
    highlightCorrect?: boolean;
    wrongAnswer?: boolean;
    onDismissWrong?: () => void;
    onAnswer: (index: number) => void;
    onSkip: () => void;
    /** Current difficulty level (1-10). Used to simplify wrong-answer panel for beginners. */
    level?: number;
    /** Text-entry mode: show SpellingInput instead of MCQ pills */
    guidedMode?: boolean;
    /** Handler for typed answers (text-entry mode) */
    onTypedAnswer?: (typed: string) => void;
}

const pulseAnim = {
    scale: [1, 1.03, 1],
    transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' as const },
};

/** Glow animation for the highlighted correct answer */
const glowAnim = {
    boxShadow: [
        '0 0 0 0 rgba(255,255,255,0)',
        '0 0 20px 4px rgba(251,191,36,0.5)',
        '0 0 0 0 rgba(255,255,255,0)',
    ],
    scale: [1, 1.08, 1],
};

const glowTransition = { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const };

/** Single answer option — correct flash animation with stronger glow for visibility */
const correctFlashAnim = {
    scale: [1, 1.15, 1],
    boxShadow: [
        '0 0 0 0 rgba(34,197,94,0)',
        '0 0 24px 8px rgba(34,197,94,0.7)',
        '0 0 0 0 rgba(34,197,94,0)',
    ],
};

const AnswerOption = memo(function AnswerOption({
    value, label, index, frozen, onAnswer, highlighted, correctFlash, reducedMotion,
}: {
    value: number | string; label?: string; index: number;
    frozen: boolean;
    onAnswer: (i: number) => void;
    highlighted?: boolean;
    correctFlash?: boolean;
    reducedMotion?: boolean;
}) {
    const text = String(label ?? value);

    return (
        <button
            className="gpu-layer w-full"
            onClick={() => !frozen && onAnswer(index)}
            onKeyDown={(e) => { if (frozen && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); }}
            aria-label={`Answer: ${text}`}
            aria-disabled={frozen}
            tabIndex={frozen ? -1 : 0}
        >
            {/* Answer pill — adapts font size to word length */}
            <motion.div
                className={`w-full px-4 py-3.5 rounded-2xl border-2 bg-[var(--color-surface)] flex items-center justify-center ui font-bold active:scale-[0.97] transition-transform ${
                    text.length > 10 ? 'text-[17px]' : text.length > 7 ? 'text-[20px]' : 'text-[24px]'
                } ${correctFlash ? 'border-[var(--color-correct)] text-[var(--color-correct)] bg-[var(--color-correct)]/10'
                    : highlighted ? 'border-[var(--color-gold)] text-[var(--color-gold)]'
                        : 'border-[rgb(var(--color-fg))]/20 text-[var(--color-chalk)]'
                    }`}
                animate={reducedMotion ? {} : correctFlash ? correctFlashAnim : highlighted ? glowAnim : {}}
                transition={reducedMotion ? {} : correctFlash ? { duration: 0.35 } : highlighted ? glowTransition : {}}
            >
                {text}
            </motion.div>
        </button>
    );
});

export const ProblemView = memo(function ProblemView({ problem, frozen, highlightCorrect, wrongAnswer, onDismissWrong, onAnswer, onSkip, level = 5, guidedMode, onTypedAnswer }: Props) {
    const p = problem;
    const displayText = String(p.prompt ?? '');
    const { speak, isSupported: ttsSupported, ttsFailed } = usePronunciation();
    const { reducedMotion } = useReducedMotion();
    const [showEtymology, setShowEtymology] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Text-entry mode state
    const [typed, setTyped] = useState('');
    const [lastTyped, setLastTyped] = useState('');

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setShowEtymology(false); setTyped(''); setLastTyped(''); }, [p.id]);

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

    // Desktop keyboard support (stable listener — no churn)
    const onAnswerRef = useRef(onAnswer);
    const onSkipRef = useRef(onSkip);
    const frozenRef = useRef(frozen);
    useEffect(() => { onAnswerRef.current = onAnswer; }, [onAnswer]);
    useEffect(() => { onSkipRef.current = onSkip; }, [onSkip]);
    useEffect(() => { frozenRef.current = frozen; }, [frozen]);

    const speakRef = useRef(handleSpeak);
    useEffect(() => { speakRef.current = handleSpeak; }, [handleSpeak]);

    const onDismissWrongRef = useRef(onDismissWrong);
    useEffect(() => { onDismissWrongRef.current = onDismissWrong; }, [onDismissWrong]);

    const guidedModeRef = useRef(guidedMode);
    useEffect(() => { guidedModeRef.current = guidedMode; }, [guidedMode]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // In guided mode, SpellingInput handles its own keyboard — only intercept dismiss
            if (guidedModeRef.current) {
                if ((e.key === 'Escape') && frozenRef.current) {
                    e.preventDefault();
                    onDismissWrongRef.current?.();
                }
                return;
            }
            // Enter/Escape dismiss wrong-answer panel when frozen
            if ((e.key === 'Enter' || e.key === 'Escape') && frozenRef.current) {
                e.preventDefault();
                onDismissWrongRef.current?.();
                return;
            }
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
            // Skip
            if (e.key === 'ArrowUp' && !frozenRef.current) {
                e.preventDefault();
                onSkipRef.current();
                return;
            }
            // Answer by number key
            const idx = ANSWER_KEYS[e.key];
            if (idx !== undefined && !frozenRef.current) {
                e.preventDefault();
                onAnswerRef.current(idx);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Text-entry submit handler
    const handleTypedSubmit = useCallback(() => {
        if (!onTypedAnswer || typed.trim().length === 0) return;
        setLastTyped(typed.trim());
        onTypedAnswer(typed);
    }, [typed, onTypedAnswer]);

    return (
        <div className="landscape-answers flex-1 overflow-y-auto overscroll-contain min-h-0 relative z-10">
        <div
            className="flex flex-col items-center justify-center min-h-full px-4 pb-20 landscape-compact-pb gpu-layer"
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

            {/* Answer area: text input (guided) or MCQ pills */}
            {guidedMode && !frozen ? (
                <div className="w-full max-w-[var(--content-w)]">
                    <SpellingInput
                        value={typed}
                        onChange={setTyped}
                        onSubmit={handleTypedSubmit}
                        disabled={frozen}
                    />
                </div>
            ) : guidedMode && frozen ? (
                /* In guided mode when frozen (after answer), show the correct word prominently */
                <div className="flex flex-col items-center gap-2 w-full max-w-[var(--content-w)]">
                    <div className={`text-2xl ui font-bold tracking-widest uppercase ${wrongAnswer ? 'text-[var(--color-correct)]' : 'text-[var(--color-correct)]'}`}>
                        {typeof p.meta?.['word'] === 'string' ? p.meta['word'] : String(p.options[p.correctIndex])}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-3 w-full max-w-[var(--content-w)]">
                    {p.options.map((opt, i) => (
                        <div key={`${opt}-${i}`} className="w-full">
                            <AnswerOption
                                value={opt}
                                label={p.optionLabels?.[i]}
                                index={i}
                                frozen={frozen}
                                onAnswer={onAnswer}
                                highlighted={highlightCorrect && i === p.correctIndex}
                                correctFlash={frozen && i === p.correctIndex}
                                reducedMotion={reducedMotion}
                            />
                        </div>
                    ))}
                </div>
            )}

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

                    {/* Spelling diff — show what the user typed vs correct (guided mode only) */}
                    {guidedMode && lastTyped && (
                        <div className="mb-2">
                            <SpellingDiffView
                                typed={lastTyped}
                                correct={typeof p.meta?.['word'] === 'string' ? p.meta['word'] : String(p.options[p.correctIndex])}
                            />
                        </div>
                    )}

                    {/* Definition */}
                    {typeof p.meta?.['definition'] === 'string' && p.meta['mode'] !== 'vocab' && (
                        <div className="text-xs ui text-[rgb(var(--color-fg))]/50 text-center mb-1.5">
                            {p.meta['definition']}
                        </div>
                    )}

                    {/* Etymology — toggle between simple and full explainer (hidden for levels 1-3) */}
                    {level >= 4 && typeof p.meta?.['etymology'] === 'string' && (
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
                        {level >= 4 && typeof p.meta?.['etymology'] === 'string' && !showEtymology && (
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

            {/* Keyboard shortcut overlay */}
            {showShortcuts && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
                    onClick={() => setShowShortcuts(false)}
                >
                    <div
                        className="w-[280px] bg-[var(--color-board)] rounded-2xl p-5 border border-[rgb(var(--color-fg))]/15 shadow-lg"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-sm ui font-bold text-[var(--color-chalk)] mb-3 text-center">Keyboard Shortcuts</h3>
                        <div className="space-y-2.5 text-xs ui text-[rgb(var(--color-fg))]/60">
                            {[
                                ['1', 'Option 1'],
                                ['2', 'Option 2'],
                                ['3', 'Option 3'],
                                ['↑', 'Skip word'],
                                ['Enter / Esc', 'Continue after wrong'],
                                ['Space / R', 'Replay audio'],
                                ['?', 'Toggle this help'],
                            ].map(([key, desc]) => (
                                <div key={key} className="flex items-center justify-between gap-3">
                                    <kbd className="font-mono text-[var(--color-gold)] text-[11px] bg-[rgb(var(--color-fg))]/[0.06] px-1.5 py-0.5 rounded">{key}</kbd>
                                    <span className="text-right">{desc}</span>
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
        </div>
        </div>
    );
});
