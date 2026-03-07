/**
 * components/SharedDailyWord.tsx
 *
 * "The Wordle of spelling" — one word a day, same for everyone.
 * Three states: pre-attempt card → attempt modal → post-attempt card.
 */
import { memo, useState, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ModalShell } from './ModalShell';
import { ProblemView } from './ProblemView';
import { Confetti } from './Confetti';
import { useSharedDailyWord } from '../hooks/useSharedDailyWord';
import { getRarityConfig } from '../utils/rarity';
import { formatDailyWordShare } from '../utils/sharedDailyWord';
import { generateItemForWord } from '../domains/spelling/spellingGenerator';
import { shareOrCopy } from '../utils/shareHelper';
import { createSeededRng, dateSeed } from '../utils/seededRng';
import { STORAGE_KEYS } from '../config';

interface Props {
    /** Referral code for share footer */
    referralCode?: string;
}

export const SharedDailyWord = memo(function SharedDailyWord({ referralCode }: Props) {
    const {
        word, wordNumber, loading, hasAttempted, myAttempt,
        communityStats, submitAttempt, streak,
    } = useSharedDailyWord();

    const [showModal, setShowModal] = useState(false);
    const [frozen, setFrozen] = useState(false);
    const [wrongAnswer, setWrongAnswer] = useState(false);
    const [highlightCorrect, setHighlightCorrect] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [shareStatus, setShareStatus] = useState<string | null>(null);
    const [attemptsUsed, setAttemptsUsed] = useState(0);
    const attemptCountRef = useRef(0);
    const startTimeRef = useRef(0);

    // Generate the quiz item (deterministic RNG for consistent distractors)
    const problem = useMemo(() => {
        if (!word) return null;
        const rng = createSeededRng(dateSeed());
        return generateItemForWord(word.word, 'daily-word', rng);
    }, [word]);

    const rarity = useMemo(() => word ? getRarityConfig(word.difficulty) : null, [word]);

    const communityCorrectPct = communityStats && communityStats.totalAttempts > 0
        ? (communityStats.correctCount / communityStats.totalAttempts) * 100
        : null;

    // Open modal → start timer, auto-speak
    const handleReveal = useCallback(() => {
        if (!word || hasAttempted) return;
        attemptCountRef.current = 0;
        setAttemptsUsed(0);
        startTimeRef.current = Date.now();
        setFrozen(false);
        setWrongAnswer(false);
        setHighlightCorrect(false);
        setShowModal(true);
        // TTS will auto-play from ProblemView
    }, [word, hasAttempted]);

    // MCQ answer handler
    const handleAnswer = useCallback((index: number) => {
        if (!problem || frozen) return;
        attemptCountRef.current += 1;
        setAttemptsUsed(attemptCountRef.current);

        if (index === problem.correctIndex) {
            // Correct
            setFrozen(true);
            setHighlightCorrect(true);
            const timeMs = Date.now() - startTimeRef.current;

            // Fire confetti for rare+ words
            if (rarity && ['rare', 'epic', 'legendary'].includes(rarity.rarity)) {
                setShowConfetti(true);
            }

            // Close modal after brief celebration, then submit
            setTimeout(() => {
                setShowModal(false);
                setShowConfetti(false);
                submitAttempt(true, attemptCountRef.current, timeMs);
            }, 1500);
        } else {
            // Wrong — freeze, show correct answer panel
            setFrozen(true);
            setWrongAnswer(true);
        }
    }, [problem, frozen, rarity, submitAttempt]);

    // Text-entry handler
    const handleTypedAnswer = useCallback((typed: string) => {
        if (!word || frozen) return;
        attemptCountRef.current += 1;
        setAttemptsUsed(attemptCountRef.current);

        if (typed.trim().toLowerCase() === word.word.toLowerCase()) {
            // Correct
            setFrozen(true);
            setHighlightCorrect(true);
            const timeMs = Date.now() - startTimeRef.current;

            if (rarity && ['rare', 'epic', 'legendary'].includes(rarity.rarity)) {
                setShowConfetti(true);
            }

            setTimeout(() => {
                setShowModal(false);
                setShowConfetti(false);
                submitAttempt(true, attemptCountRef.current, timeMs);
            }, 1500);
        } else {
            setFrozen(true);
            setWrongAnswer(true);
        }
    }, [word, frozen, rarity, submitAttempt]);

    // Dismiss wrong answer — allow retry or give up
    const handleDismissWrong = useCallback(() => {
        // After 3 wrong attempts, count as failed
        if (attemptCountRef.current >= 3) {
            const timeMs = Date.now() - startTimeRef.current;
            setShowModal(false);
            submitAttempt(false, attemptCountRef.current, timeMs);
            return;
        }
        // Otherwise let them try again
        setFrozen(false);
        setWrongAnswer(false);
    }, [submitAttempt]);

    // Close modal = give up (if not yet answered correctly)
    const handleCloseModal = useCallback(() => {
        if (!frozen && attemptCountRef.current === 0) {
            // Haven't answered yet — just close without recording
            setShowModal(false);
            return;
        }
        if (!hasAttempted && !frozen) {
            // Mid-attempt, close = give up
            const timeMs = Date.now() - startTimeRef.current;
            submitAttempt(false, Math.max(1, attemptCountRef.current), timeMs);
        }
        setShowModal(false);
        setShowConfetti(false);
    }, [frozen, hasAttempted, submitAttempt]);

    // Share handler
    const handleShare = useCallback(async () => {
        if (!word || !myAttempt) return;
        const text = formatDailyWordShare(
            word,
            myAttempt,
            wordNumber,
            streak,
            communityCorrectPct,
            referralCode ?? localStorage.getItem(STORAGE_KEYS.referralCode) ?? undefined,
        );
        const result = await shareOrCopy(text);
        setShareStatus(result === 'copied' ? 'Copied!' : result === 'shared' ? 'Shared!' : null);
        if (result !== 'failed') {
            setTimeout(() => setShareStatus(null), 2000);
        }
    }, [word, myAttempt, wordNumber, streak, communityCorrectPct, referralCode]);

    // Don't render if no word or still loading
    if (loading || !word || !rarity) return null;

    const ordinal = (n: number) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // ── POST-ATTEMPT CARD ───────────────────────────────────────────
    if (hasAttempted && myAttempt) {
        const timeStr = (myAttempt.timeMs / 1000).toFixed(1);
        return (
            <div
                className="w-full mb-4 px-4 py-3 rounded-2xl border-l-4 bg-[rgb(var(--color-fg))]/[0.03]"
                style={{ borderLeftColor: rarity.color }}
            >
                {/* Word + rarity */}
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{rarity.emoji}</span>
                    <span className="text-lg chalk text-[var(--color-chalk)] font-bold">{word.word}</span>
                    <span className="text-[9px] ui px-1.5 py-0.5 rounded-full font-medium" style={{ color: rarity.color, background: `${rarity.color}15` }}>
                        {rarity.label}
                    </span>
                </div>

                {/* Result */}
                <div className="flex items-center gap-2 text-xs ui text-[rgb(var(--color-fg))]/60 mb-2">
                    {myAttempt.correct ? (
                        <span className="text-[var(--color-correct)] font-medium">
                            {'\u2705'} {ordinal(myAttempt.attempts)} try {'\u00B7'} {timeStr}s
                        </span>
                    ) : (
                        <span className="text-[var(--color-wrong)] font-medium">
                            {'\u274C'} Not this time
                        </span>
                    )}
                </div>

                {/* Community stats */}
                {communityStats && communityStats.totalAttempts > 0 && (
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 mb-2">
                        {'\uD83D\uDCCA'} {communityStats.totalAttempts.toLocaleString()} attempted {'\u00B7'} {communityCorrectPct !== null ? `${Math.round(communityCorrectPct)}% correct` : ''}
                    </div>
                )}

                {/* Streak */}
                {streak > 1 && (
                    <div className="text-[10px] ui text-[var(--color-gold)] font-medium mb-2">
                        {'\uD83D\uDD25'} {streak}-day streak
                    </div>
                )}

                {/* Share button */}
                <button
                    onClick={handleShare}
                    className="w-full py-2 rounded-xl text-xs ui font-medium text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-colors"
                >
                    {shareStatus ?? '\uD83D\uDCE4 Share Result'}
                </button>
            </div>
        );
    }

    // ── PRE-ATTEMPT CARD ────────────────────────────────────────────
    return (
        <>
            <button
                onClick={handleReveal}
                className="w-full mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[rgb(var(--color-fg))]/[0.03] border-l-4 hover:bg-[rgb(var(--color-fg))]/[0.06] transition-colors"
                style={{ borderLeftColor: rarity.color }}
            >
                <span className="text-2xl shrink-0">{'\uD83C\uDFAF'}</span>
                <div className="flex-1 min-w-0 text-left">
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 mb-0.5">
                        Today&apos;s Word #{wordNumber}
                    </div>
                    <div className="text-sm ui text-[var(--color-chalk)] font-bold leading-tight">
                        Everyone gets the same word!
                    </div>
                    {communityStats && communityStats.totalAttempts > 0 && (
                        <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30 mt-0.5">
                            {communityStats.totalAttempts.toLocaleString()} attempted {'\u00B7'} {communityCorrectPct !== null ? `${Math.round(communityCorrectPct)}% correct` : ''}
                        </div>
                    )}
                </div>
                <span className="text-xs ui text-[var(--color-gold)] font-medium shrink-0">Reveal {'\u25B6'}</span>
            </button>

            {/* ── ATTEMPT MODAL ─────────────────────────────────────── */}
            <AnimatePresence>
                {showModal && problem && (
                    <ModalShell
                        onClose={handleCloseModal}
                        ariaLabel={`Daily Word #${wordNumber}`}
                        className="w-[min(380px,90vw)] max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="text-center mb-3">
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 uppercase tracking-wider">
                                Daily Word #{wordNumber}
                            </div>
                            {rarity && (
                                <div className="flex items-center justify-center gap-1 mt-0.5">
                                    <span className="text-sm">{rarity.emoji}</span>
                                    <span className="text-[10px] ui font-medium" style={{ color: rarity.color }}>{rarity.label}</span>
                                </div>
                            )}
                        </div>

                        {/* Reuse ProblemView for the actual quiz */}
                        <ProblemView
                            problem={problem}
                            frozen={frozen}
                            highlightCorrect={highlightCorrect}
                            wrongAnswer={wrongAnswer}
                            onDismissWrong={handleDismissWrong}
                            onAnswer={handleAnswer}
                            onSkip={() => { /* no skip for daily word */ }}
                            level={word.difficulty}
                            onTypedAnswer={handleTypedAnswer}
                        />

                        {/* Attempt counter */}
                        {wrongAnswer && attemptsUsed < 3 && (
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 text-center mt-2">
                                {3 - attemptsUsed} attempt{3 - attemptsUsed === 1 ? '' : 's'} remaining
                            </div>
                        )}

                        {/* Confetti overlay */}
                        <Confetti
                            trigger={showConfetti}
                            intensity={rarity?.rarity === 'legendary' || rarity?.rarity === 'epic' ? 'epic' : 'normal'}
                        />
                    </ModalShell>
                )}
            </AnimatePresence>
        </>
    );
});
