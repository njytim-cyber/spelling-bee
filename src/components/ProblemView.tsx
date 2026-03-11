import { memo, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { EngineItem } from '../engine/domain';
import { usePronunciation } from '../hooks/usePronunciation';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { SpellingInput } from './SpellingInput';
import { IconSpeaker } from './Icons';
import { getInlineErrorTip } from '../utils/errorPatterns';
import { trackEvent } from '../utils/analytics';
import type { WordRecord } from '../hooks/useWordHistory';

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
    /** Word history records for "similar words" suggestions on wrong answers */
    wordRecords?: Record<string, WordRecord>;
    /** Number of wrong answers so far in this session (for SRS promise display) */
    sessionWrongCount?: number;
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

/** Wrong-answer flash animation — brief red pulse before showing correct */
const wrongFlashAnim = {
    scale: [1, 1.05, 1],
    boxShadow: [
        '0 0 0 0 rgba(239,68,68,0)',
        '0 0 16px 4px rgba(239,68,68,0.5)',
        '0 0 0 0 rgba(239,68,68,0)',
    ],
};

const AnswerOption = memo(function AnswerOption({
    value, label, index, frozen, onAnswer, highlighted, correctFlash, wrongFlash, reducedMotion,
}: {
    value: number | string; label?: string; index: number;
    frozen: boolean;
    onAnswer: (i: number) => void;
    highlighted?: boolean;
    correctFlash?: boolean;
    wrongFlash?: boolean;
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
                    : wrongFlash ? 'border-[var(--color-wrong)] text-[var(--color-wrong)] bg-[var(--color-wrong)]/10'
                    : highlighted ? 'border-[var(--color-gold)] text-[var(--color-gold)]'
                        : 'border-[rgb(var(--color-fg))]/20 text-[var(--color-chalk)]'
                    }`}
                animate={reducedMotion ? {} : correctFlash ? correctFlashAnim : wrongFlash ? wrongFlashAnim : highlighted ? glowAnim : {}}
                transition={reducedMotion ? {} : correctFlash ? { duration: 0.35 } : wrongFlash ? { duration: 0.3 } : highlighted ? glowTransition : {}}
            >
                {text}
            </motion.div>
        </button>
    );
});

export const ProblemView = memo(function ProblemView({ problem, frozen, highlightCorrect, wrongAnswer, onDismissWrong, onAnswer, onSkip, guidedMode, onTypedAnswer, sessionWrongCount }: Props) {
    const p = problem;
    const displayText = String(p.prompt ?? '');
    const { speak, isSupported: ttsSupported, ttsFailed } = usePronunciation();
    const { reducedMotion } = useReducedMotion();
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Track which option was tapped (for wrong-flash on MCQ pills)
    const [tappedIndex, setTappedIndex] = useState<number | null>(null);

    // Suppress "audio unavailable" for a grace period on mount (TTS cold start)
    const [ttsGrace, setTtsGrace] = useState(true);
    useEffect(() => { const t = setTimeout(() => setTtsGrace(false), 2000); return () => clearTimeout(t); }, []);

    // Text-entry mode state
    const [typed, setTyped] = useState('');
    const [lastTyped, setLastTyped] = useState('');

    // Example sentence with the word blanked out (stable per question)
    const redactedSentence = useMemo(() => {
        const sentence = p.meta?.['exampleSentence'];
        const word = p.meta?.['word'];
        if (typeof sentence !== 'string' || typeof word !== 'string') return null;
        return sentence.replace(
            new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
            '___',
        );
    }, [p.meta]);

    // Inline error tip for wrong-answer panel
    const errorTip = useMemo(() => {
        if (!wrongAnswer) return null;
        const word = typeof p.meta?.['word'] === 'string' ? p.meta['word'] as string : null;
        if (!word) return null;
        return getInlineErrorTip(word, lastTyped || undefined);
    }, [wrongAnswer, p.meta, lastTyped]);

    // Track error pattern detection for analytics
    useEffect(() => {
        if (errorTip) {
            trackEvent('error_pattern_detected', { pattern: errorTip.label });
        }
    }, [errorTip]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setTyped(''); setLastTyped(''); setTappedIndex(null); }, [p.id]);

    const handleSpeak = useCallback(() => {
        const word = p.meta?.['word'];
        const ipa = p.meta?.['pronunciation'];
        if (typeof word === 'string') speak(word, typeof ipa === 'string' ? ipa : undefined);
    }, [p.meta, speak]);

    // Auto-speak word when problem appears (critical for spelling app!)
    useEffect(() => {
        const word = p.meta?.['word'];
        const ipa = p.meta?.['pronunciation'];
        if (typeof word === 'string' && ttsSupported) {
            // Near-instant — just enough for React to commit the DOM
            const timer = setTimeout(() => speak(word, typeof ipa === 'string' ? ipa : undefined), 50);
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

    // MCQ answer handler — tracks tapped index for wrong-flash
    const handleMcqAnswer = useCallback((index: number) => {
        setTappedIndex(index);
        onAnswer(index);
    }, [onAnswer]);

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
                {ttsFailed && !ttsGrace && (
                    <span className="text-[9px] ui text-[var(--color-wrong)]/50 mt-1 block">audio unavailable</span>
                )}
                {/* Example sentence — word blanked out before answering, revealed after */}
                {redactedSentence && (
                    <div className="mt-2 text-[11px] ui italic text-[rgb(var(--color-fg))]/25 max-w-[var(--content-w)] mx-auto leading-relaxed">
                        &ldquo;{frozen ? p.meta!['exampleSentence'] as string : redactedSentence}&rdquo;
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
                                onAnswer={handleMcqAnswer}
                                highlighted={highlightCorrect && i === p.correctIndex}
                                correctFlash={frozen && i === p.correctIndex}
                                wrongFlash={frozen && wrongAnswer && tappedIndex === i && i !== p.correctIndex}
                                reducedMotion={reducedMotion}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Wrong-answer dismiss — tap to continue */}
            {frozen && wrongAnswer && onDismissWrong && (
                <motion.div
                    className="mt-4 w-full max-w-[var(--content-w)]"
                    initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    {/* Error tip — pattern-based hint for what went wrong */}
                    {errorTip && (
                        <div className="text-[11px] ui text-[var(--color-streak-fire)] text-center mb-2 px-2">
                            <span className="font-semibold">{errorTip.label}:</span>{' '}{errorTip.detail}
                        </div>
                    )}
                    {/* SRS promise — shown for the first 3 wrong answers in a session */}
                    {sessionWrongCount !== undefined && sessionWrongCount <= 3 && (
                        <div className="text-[10px] ui text-[var(--color-gold)]/60 text-center mb-2">
                            This word will come back until you get it right
                        </div>
                    )}
                    <motion.button
                        type="button"
                        onClick={onDismissWrong}
                        className="w-full py-2.5 rounded-xl bg-[rgb(var(--color-fg))]/10 text-sm ui font-medium text-[rgb(var(--color-fg))]/60 hover:bg-[rgb(var(--color-fg))]/15 transition-colors"
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
