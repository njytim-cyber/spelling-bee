import { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValueEvent } from 'framer-motion';
import { createChallengeId } from '../utils/dailyChallenge';

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
    hardMode?: boolean;
    timedMode?: boolean;
    onDrillHardest?: () => void;
    hardestWordCount?: number;
    totalXP?: number;
    streakFreezes?: number;
    onPurchaseFreeze?: () => boolean;
}

function buildShareText(
    xp: number, streak: number, accuracy: number,
    history: boolean[], questionType: string,
    hardMode?: boolean, timedMode?: boolean,
): string {
    const emojis = history.map(ok => ok ? '🟩' : '🟥');
    const emojiRows: string[] = [];
    for (let i = 0; i < emojis.length; i += 10) {
        emojiRows.push(emojis.slice(i, i + 10).join(''));
    }

    const typeLabel = questionType.startsWith('mix-') ? 'Mix' : questionType.charAt(0).toUpperCase() + questionType.slice(1);
    const modeTag = hardMode && timedMode ? ' 💀⏱️ ULTIMATE' : hardMode ? ' 💀 HARD' : timedMode ? ' ⏱️ TIMED' : '';
    const headline = accuracy === 100
        ? `🐝 Spelling Bee — PERFECT! 💯${modeTag}`
        : `🐝 Spelling Bee — ${typeLabel}${modeTag}`;

    // Generate a challenge link so the recipient can play the same set
    const challengeUrl = `${window.location.origin}?c=${createChallengeId()}`;

    const subline = `⚡ ${xp} pts · 🔥 ${streak} streak · 🎯 ${accuracy}%`;

    return [
        headline,
        subline,
        '',
        ...emojiRows,
        '',
        `Can you beat me? 👉 ${challengeUrl}`,
    ].join('\n');
}

export const SessionSummary = memo(function SessionSummary({
    solved, bestStreak: streak, accuracy, xpEarned, answerHistory, questionType, visible, onDismiss,
    hardMode, timedMode, onDrillHardest, hardestWordCount,
    totalXP, streakFreezes, onPurchaseFreeze,
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
        const text = buildShareText(xpEarned, streak, accuracy, answerHistory, questionType, hardMode, timedMode);

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
                                        {hardMode && timedMode ? '💀⏱️ ULTIMATE' : hardMode ? '💀 HARD MODE' : timedMode ? '⏱️ TIMED MODE' : questionType.toUpperCase()}
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
                                        spellingbee.pages.dev
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
                                🏆 PERFECT
                            </motion.div>
                        ) : (
                            <h3 className="text-xl ui font-bold text-[var(--color-gold)] mb-4">
                                {hardMode && timedMode ? '💀⏱️ ' : hardMode ? '💀 ' : timedMode ? '⏱️ ' : ''}Done
                            </h3>
                        )}

                        <div className="flex justify-center gap-6 mb-4">
                            <div className="text-center">
                                <div className="text-2xl ui font-bold text-[rgb(var(--color-fg))]/80">{solved}</div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">solved</div>
                            </div>
                            <div className="text-center min-w-[60px]">
                                <div className="text-2xl ui font-bold text-[var(--color-correct)]">{accuracy}%</div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">accuracy</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl ui font-bold text-[var(--color-streak-fire)]">{streak}🔥</div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">best streak</div>
                            </div>
                        </div>

                        <div className="text-lg ui font-bold text-[var(--color-gold)] mb-4 tabular-nums">+{xpDisplay} pts</div>

                        {/* Answer history grid — compact */}
                        {answerHistory.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-[3px] mb-4 max-w-[220px] mx-auto">
                                {answerHistory.map((ok, i) => (
                                    <div
                                        key={i}
                                        className={`w-3 h-3 rounded-sm ${ok ? 'bg-[var(--color-correct)]' : 'bg-[var(--color-wrong)]'}`}
                                    />
                                ))}
                            </div>
                        )}

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
                                Drill {hardestWordCount} Hardest Words
                            </motion.button>
                        )}

                        {/* Streak freeze purchase */}
                        {onPurchaseFreeze && (totalXP ?? 0) >= 500 && (
                            <button
                                onClick={onPurchaseFreeze}
                                className="w-full py-2 rounded-xl text-xs ui text-[rgb(var(--color-fg))]/40 hover:text-[var(--color-gold)] border border-[rgb(var(--color-fg))]/10 hover:border-[var(--color-gold)]/30 transition-colors mb-3"
                            >
                                Buy Streak Freeze (500 XP){(streakFreezes ?? 0) > 0 ? ` · ${streakFreezes} owned` : ''}
                            </button>
                        )}

                        <button
                            onClick={onDismiss}
                            className="text-xs ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50 transition-colors"
                        >
                            continue
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
