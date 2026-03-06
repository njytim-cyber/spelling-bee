import { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValueEvent } from 'framer-motion';
import { Button } from './Button';
import { WordReviewList } from './WordReviewList';
import { createChallengeId } from '../utils/dailyChallenge';

interface SessionWord {
    word: string;
    correct: boolean;
    definition?: string;
    mode?: 'mcq' | 'typed';
}

export interface ChallengeTarget {
    score: number;
    accuracy: number;
}

interface Props {
    solved: number;
    correct: number;
    bestStreak: number;
    accuracy: number;
    xpEarned: number;
    answerHistory: boolean[];
    questionType: string;
    visible: boolean;
    onDismiss: () => void;
    timedMode?: boolean;
    onDrillHardest?: () => void;
    hardestWordCount?: number;
    totalXP?: number;
    streakFreezes?: number;
    onPurchaseFreeze?: () => boolean;
    sessionWords?: SessionWord[];
    referralCode?: string;
    challengeTarget?: ChallengeTarget;
    challengeId?: string | null;
    newAchievement?: { name: string; desc: string } | null;
}

function buildShareText(
    xp: number, streak: number, accuracy: number,
    history: boolean[], questionType: string,
    timedMode?: boolean,
    referralCode?: string,
    challengeId?: string | null,
): string {
    const emojis = history.map(ok => ok ? '🟩' : '🟥');
    const emojiRows: string[] = [];
    for (let i = 0; i < emojis.length; i += 10) {
        emojiRows.push(emojis.slice(i, i + 10).join(''));
    }

    const typeLabel = questionType.startsWith('mix-') ? 'Mix' : questionType.charAt(0).toUpperCase() + questionType.slice(1);
    const modeTag = timedMode ? ' ⏱️ TIMED' : '';
    const headline = accuracy === 100
        ? `🐝 Spelling Bee — PERFECT! 💯${modeTag}`
        : `🐝 Spelling Bee — ${typeLabel}${modeTag}`;

    // Use existing challenge ID (if playing a received challenge) or generate new one
    const cid = challengeId ?? createChallengeId();
    const challengeUrl = `${window.location.origin}?c=${cid}&s=${xp}&a=${accuracy}`;

    const subline = `⚡ ${xp} pts · 🔥 ${streak} streak · 🎯 ${accuracy}%`;

    const lines = [
        headline,
        subline,
        '',
        ...emojiRows,
        '',
        `Can you beat me? 👉 ${challengeUrl}`,
    ];

    // Embed referral code if available
    if (referralCode) {
        lines.push(`\nJoin free → ${window.location.origin}?ref=${referralCode}`);
    }

    return lines.join('\n');
}

const PERFECT_CELEBRATIONS = ['🏆 PERFECT', '💯 FLAWLESS', '✨ UNSTOPPABLE', '🎯 BULLSEYE', '👑 NAILED IT'];

/** Encouraging titles for non-perfect sessions — always positive */
function getEncouragingTitle(accuracy: number, streak: number, solved: number): { title: string; subtitle: string } {
    if (accuracy >= 90) return { title: '🌟 Amazing!', subtitle: 'Nearly flawless — keep it up!' };
    if (accuracy >= 70) return { title: '💪 Great work!', subtitle: 'You\'re really improving' };
    if (accuracy >= 50) return { title: '📚 Good practice!', subtitle: `You just practiced ${solved} words — that's progress` };
    if (streak >= 3) return { title: '🔥 Nice streaks!', subtitle: 'Building momentum — try again to beat your score' };
    if (solved >= 10) return { title: '🏃 Good effort!', subtitle: 'The more you practice, the easier it gets' };
    return { title: '🌱 Keep going!', subtitle: 'Every word you see helps you learn' };
}

/** Positive insight about typed vs MCQ in this session. Returns null if not applicable. */
function getModeInsight(words: SessionWord[]): string | null {
    let typedCount = 0, typedCorrect = 0, mcqCount = 0, mcqCorrect = 0;
    for (const w of words) {
        if (w.mode === 'typed') { typedCount++; if (w.correct) typedCorrect++; }
        else { mcqCount++; if (w.correct) mcqCorrect++; }
    }
    if (typedCount === 0) return null;
    if (mcqCount === 0) return null; // Pure typed session — no comparison to make
    const typedAcc = typedCount > 0 ? typedCorrect / typedCount : 0;
    const mcqAcc = mcqCount > 0 ? mcqCorrect / mcqCount : 0;
    if (typedAcc >= mcqAcc) return 'Your spelling is even better than your recognition!';
    if (typedAcc >= 0.6) return 'Good typing practice — you\'re building real spelling muscle!';
    return 'Every typed word builds muscle memory — keep at it!';
}

export const SessionSummary = memo(function SessionSummary({
    solved, correct, bestStreak: streak, accuracy, xpEarned, answerHistory, questionType, visible, onDismiss,
    timedMode, onDrillHardest, hardestWordCount,
    totalXP, streakFreezes, onPurchaseFreeze, sessionWords = [],
    referralCode, challengeTarget, challengeId, newAchievement,
}: Props) {
    const [copied, setCopied] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    // Rolling count-up for XP
    const xpSpring = useSpring(0, { stiffness: 60, damping: 20 });
    const [xpDisplay, setXpDisplay] = useState(0);

    useMotionValueEvent(xpSpring, 'change', (v) => {
        setXpDisplay(Math.round(v));
    });

    useEffect(() => {
        if (visible) {
            xpSpring.jump(0);
            // Small delay so the modal animates in first
            const t = setTimeout(() => xpSpring.set(xpEarned), 300);
            return () => clearTimeout(t);
        }
    }, [visible, xpEarned, xpSpring]);

    const handleShare = async () => {
        if (isSharing) return;
        setIsSharing(true);
        const text = buildShareText(xpEarned, streak, accuracy, answerHistory, questionType, timedMode, referralCode, challengeId);

        try {
            // Attempt Rich Media Image Generation
            if (cardRef.current) {
                const { toBlob } = await import('html-to-image');
                const blob = await toBlob(cardRef.current, {
                    cacheBust: true,
                    type: 'image/png',
                    pixelRatio: 2,
                    filter: (node: Node) => {
                        // Skip cross-origin <link> stylesheets (e.g. Google Fonts)
                        // to avoid SecurityError when reading cssRules
                        if (node instanceof HTMLLinkElement && node.rel === 'stylesheet' && node.href) {
                            try { return new URL(node.href).origin === window.location.origin; }
                            catch { return true; }
                        }
                        return true;
                    },
                });

                if (blob) {
                    const file = new File([blob], 'share-card.png', { type: 'image/png' });

                    // Check if OS supports files in navigator.share
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            text: text,
                        });
                        setIsSharing(false);
                        return; // Success
                    } else if (navigator.share) {
                        // Fallback to text-only native share if files unsupported
                        await navigator.share({ text });
                        setIsSharing(false);
                        return;
                    }
                }
            }

            // Fallback for desktop / unsupported browsers
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // User cancelled share or other error, fallback to clipboard just in case
            try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch {
                // Silent fail
            }
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay-dim)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onDismiss}
                >
                    <motion.div
                        className="bg-[var(--color-board)] border border-[rgb(var(--color-fg))]/15 rounded-3xl px-8 py-6 max-w-xs w-[calc(100vw-2rem)] text-center relative overflow-hidden"
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Hidden Share Card for Image Generation */}
                        <div className="absolute left-[-9999px] top-[-9999px]">
                            <div
                                ref={cardRef}
                                className="w-[1080px] h-[1920px] flex flex-col items-center justify-center relative overflow-hidden chalkboard-bg p-16"
                                style={{ background: '#1a1a24' /* fallback solid for html-to-image */ }}
                            >
                                <div className="absolute inset-0 opacity-10 blur-[80px] bg-gradient-to-br from-[#FF00FF] via-transparent to-[#00FFFF]" />

                                <div className="z-10 text-center flex flex-col items-center w-full">
                                    <h1 className="text-8xl chalk text-[var(--color-gold)] mb-8">Spelling Bee</h1>
                                    <div className="text-4xl ui text-white/50 mb-16 tracking-widest uppercase">
                                        {timedMode ? '⏱️ TIMED MODE' : questionType.toUpperCase()}
                                    </div>

                                    <div className="text-[200px] mb-8">
                                        {accuracy === 100 ? '🏆' : '📝'}
                                    </div>
                                    <div className="text-8xl chalk text-white mb-16">
                                        {accuracy === 100 ? 'PERFECT SCORE' : 'SESSION COMPLETED'}
                                    </div>

                                    <div className="flex justify-between w-[80%] mb-16 px-8 py-12 border-2 border-white/20 rounded-[3rem] bg-black/20">
                                        <div className="text-center">
                                            <div className="text-9xl chalk text-white/80">{solved}</div>
                                            <div className="text-3xl ui text-white/40 mt-4">SOLVED</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-9xl chalk text-[var(--color-correct)]">{accuracy}%</div>
                                            <div className="text-3xl ui text-white/40 mt-4">ACCURACY</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-9xl chalk text-[var(--color-streak-fire)]">{streak}🔥</div>
                                            <div className="text-3xl ui text-white/40 mt-4">STREAK</div>
                                        </div>
                                    </div>

                                    {/* Answer history grid */}
                                    {answerHistory.length > 0 && (
                                        <div className="flex flex-wrap justify-center gap-[12px] mb-16 max-w-[800px] mx-auto">
                                            {answerHistory.map((ok, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-[24px] h-[24px] rounded-md ${ok ? 'bg-[var(--color-correct)]' : 'bg-[var(--color-wrong)]'}`}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <div className="text-7xl chalk text-[var(--color-gold)] tabular-nums mb-32">
                                        + {xpEarned} XP
                                    </div>

                                    <div className="text-4xl ui text-white/60 tracking-wider">
                                        {referralCode
                                            ? `${window.location.host}?ref=${referralCode}`
                                            : 'spellingbee.pages.dev'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {accuracy === 100 ? (
                            <motion.div
                                className="text-2xl ui font-bold text-[var(--color-gold)] mb-4"
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.3, 1] }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                {PERFECT_CELEBRATIONS[solved % PERFECT_CELEBRATIONS.length]}
                            </motion.div>
                        ) : (() => {
                            const msg = getEncouragingTitle(accuracy, streak, solved);
                            return (
                                <div className="mb-4 text-center">
                                    <h3 className="text-xl ui font-bold text-[var(--color-gold)]">
                                        {timedMode ? '⏱️ ' : ''}{msg.title}
                                    </h3>
                                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 mt-0.5">{msg.subtitle}</div>
                                </div>
                            );
                        })()}

                        {/* Challenge comparison */}
                        {challengeTarget && (
                            <div className="mb-4 px-3 py-2.5 rounded-xl border border-[var(--color-gold)]/20 bg-[var(--color-gold)]/5">
                                <div className="flex justify-center gap-4 text-center mb-1.5">
                                    <div>
                                        <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">Their score</div>
                                        <div className="text-sm ui font-bold text-[rgb(var(--color-fg))]/50">{challengeTarget.score} pts · {challengeTarget.accuracy}%</div>
                                    </div>
                                    <div className="text-lg ui text-[rgb(var(--color-fg))]/20">vs</div>
                                    <div>
                                        <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">Your score</div>
                                        <div className="text-sm ui font-bold text-[var(--color-gold)]">{xpEarned} pts · {accuracy}%</div>
                                    </div>
                                </div>
                                <div className="text-center text-xs ui font-semibold">
                                    {xpEarned > challengeTarget.score
                                        ? <span className="text-[var(--color-correct)]">You won! 🏆</span>
                                        : xpEarned === challengeTarget.score
                                            ? <span className="text-[var(--color-gold)]">It's a tie! 🤝</span>
                                            : <span className="text-[var(--color-streak-fire)]">Almost! Try again 💪</span>
                                    }
                                </div>
                            </div>
                        )}

                        <div className="flex justify-center gap-6 mb-4">
                            <div className="text-center">
                                <div className="text-2xl ui font-bold text-[var(--color-correct)]">{correct}</div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">correct</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl ui font-bold text-[rgb(var(--color-fg))]/80">{solved}</div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">answered</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl ui font-bold text-[var(--color-streak-fire)]">{streak}🔥</div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">best streak</div>
                            </div>
                        </div>

                        <div className="text-lg ui font-bold text-[var(--color-gold)] mb-4 tabular-nums">+{xpDisplay} pts</div>

                        {/* Answer history grid — compact */}
                        {answerHistory.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-[3px] mb-2 max-w-[220px] mx-auto">
                                {answerHistory.map((ok, i) => (
                                    <div
                                        key={i}
                                        className={`w-3 h-3 rounded-sm ${ok ? 'bg-[var(--color-correct)]' : 'bg-[var(--color-wrong)]'}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Mode insight */}
                        {(() => {
                            const insight = getModeInsight(sessionWords);
                            return insight ? (
                                <p className="text-[10px] ui text-[rgb(var(--color-fg))]/40 mb-3">{insight}</p>
                            ) : null;
                        })()}

                        {/* Achievement unlocked banner */}
                        {newAchievement && (
                            <motion.div
                                className="mb-3 px-3 py-2.5 rounded-xl border border-[var(--color-gold)]/20 bg-[var(--color-gold)]/5 text-center"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                <div className="text-[10px] ui text-[var(--color-gold)]/60 uppercase tracking-wider mb-0.5">
                                    Achievement Unlocked!
                                </div>
                                <div className="text-sm ui font-semibold text-[var(--color-gold)]">
                                    {newAchievement.name}
                                </div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/40 mt-0.5">
                                    {newAchievement.desc}
                                </div>
                            </motion.div>
                        )}

                        {/* Word review toggle */}
                        <WordReviewList words={sessionWords} />

                        {/* Share button */}
                        <motion.button
                            onClick={handleShare}
                            disabled={isSharing}
                            className={`w-full py-2.5 rounded-xl border text-sm ui mb-3 transition-colors ${isSharing ? 'bg-[var(--color-gold)]/10 border-[var(--color-gold)]/10 text-[var(--color-gold)]/50' :
                                'bg-[var(--color-gold)]/20 border-[var(--color-gold)]/30 text-[var(--color-gold)] active:bg-[var(--color-gold)]/30'
                                }`}
                            whileTap={!isSharing ? { scale: 0.95 } : undefined}
                        >
                            {isSharing ? 'Sharing...' : copied ? '✅ Copied!' : '📤 Share'}
                        </motion.button>

                        {accuracy < 80 && (hardestWordCount ?? 0) > 0 && onDrillHardest && (
                            <motion.button
                                onClick={onDrillHardest}
                                className="w-full py-2.5 rounded-xl border text-sm ui mb-3 bg-[var(--color-streak-fire)]/10 border-[var(--color-streak-fire)]/30 text-[var(--color-streak-fire)] active:bg-[var(--color-streak-fire)]/20"
                                whileTap={{ scale: 0.95 }}
                            >
                                Drill {hardestWordCount} Hardest {hardestWordCount === 1 ? 'Word' : 'Words'}
                            </motion.button>
                        )}

                        {/* Streak freeze purchase */}
                        {onPurchaseFreeze && (totalXP ?? 0) >= 500 ? (
                            <button
                                onClick={onPurchaseFreeze}
                                className="w-full py-2 rounded-xl text-xs ui text-[rgb(var(--color-fg))]/40 hover:text-[var(--color-gold)] border border-[rgb(var(--color-fg))]/10 hover:border-[var(--color-gold)]/30 transition-colors mb-3"
                            >
                                ❄️ Streak Freeze · skip a day (500 XP){(streakFreezes ?? 0) > 0 ? ` · ${streakFreezes} owned` : ''}
                            </button>
                        ) : onPurchaseFreeze ? (
                            <div className="w-full py-2 rounded-xl text-xs ui text-[rgb(var(--color-fg))]/20 border border-[rgb(var(--color-fg))]/5 text-center mb-3">
                                ❄️ Streak Freeze · need {500 - (totalXP ?? 0)} more XP
                            </div>
                        ) : null}

                        <Button variant="ghost" size="sm" className="text-xs" onClick={onDismiss}>
                            continue
                        </Button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
