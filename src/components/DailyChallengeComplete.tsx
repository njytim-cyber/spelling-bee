/**
 * components/DailyChallengeComplete.tsx
 *
 * Shown after completing the daily/review/challenge set.
 * Includes a collapsible word-by-word review.
 */
import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDailyStreak, getTodayLabel } from '../utils/dailyTracking';
import { createChallengeId } from '../utils/dailyChallenge';

interface SessionWord {
    word: string;
    correct: boolean;
    definition?: string;
}

interface Props {
    correct: number;
    total: number;
    score: number;
    onExit: () => void;
    mode?: 'daily' | 'review' | 'challenge';
    sessionWords?: SessionWord[];
}

const MODE_CONFIG = {
    daily: { icon: '📅', title: 'Daily Complete!', exitLabel: 'Back to Play' },
    review: { icon: '📖', title: 'Review Complete!', exitLabel: 'Back to Play' },
    challenge: { icon: '🏆', title: 'Challenge Complete!', exitLabel: 'Back to Play' },
};

export const DailyChallengeComplete = memo(function DailyChallengeComplete({ correct, total, score, onExit, mode = 'daily', sessionWords = [] }: Props) {
    const streak = getDailyStreak();
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const dateLabel = getTodayLabel();
    const { icon, title, exitLabel } = MODE_CONFIG[mode];
    const [showReview, setShowReview] = useState(false);

    const challengeUrl = `${window.location.origin}?c=${createChallengeId()}`;
    const shareText = mode === 'daily'
        ? `🐝 Spelling Bee Daily ${dateLabel} — ${correct}/${total} (${pct}%)${streak > 1 ? ` | 🔥 ${streak}-day streak` : ''}\n\nCan you beat me? 👉 ${challengeUrl}`
        : `🐝 Spelling Bee ${title.replace('!', '')} — ${correct}/${total} (${pct}%)\n\nCan you beat me? 👉 ${challengeUrl}`;

    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({ text: shareText }).catch(() => {});
        } else {
            await navigator.clipboard.writeText(shareText).catch(() => {});
        }
    };

    const missedWords = sessionWords.filter(w => !w.correct);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center px-6 gap-4 overflow-y-auto"
        >
            <div className="text-6xl">{icon}</div>
            <h2 className="text-xl chalk text-[var(--color-gold)]">{title}</h2>
            {mode === 'daily' && <div className="text-xs ui text-[rgb(var(--color-fg))]/40">{dateLabel}</div>}

            <div className="bg-[rgb(var(--color-fg))]/5 rounded-xl px-8 py-5 text-center">
                <div className="text-4xl chalk text-[var(--color-chalk)]">{correct}/{total}</div>
                <div className="text-xs ui text-[rgb(var(--color-fg))]/40 mt-1">{pct}% accuracy</div>
                <div className="text-xs ui text-[rgb(var(--color-fg))]/25 mt-2">+{score} XP</div>
            </div>

            {mode === 'daily' && streak > 0 && (
                <div className="flex items-center gap-2 text-sm ui text-[var(--color-gold)]">
                    <span className="text-lg">🔥</span>
                    {streak}-day streak!
                </div>
            )}

            {/* Word review toggle */}
            {sessionWords.length > 0 && (
                <button
                    onClick={() => setShowReview(r => !r)}
                    className="text-xs ui text-[rgb(var(--color-fg))]/40 hover:text-[var(--color-gold)] transition-colors"
                >
                    {showReview ? 'Hide' : 'Review'} {sessionWords.length} words {missedWords.length > 0 ? `(${missedWords.length} missed)` : ''}
                </button>
            )}

            <AnimatePresence>
                {showReview && sessionWords.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="w-full max-w-[300px] overflow-hidden"
                    >
                        <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-[rgb(var(--color-fg))]/10 divide-y divide-[rgb(var(--color-fg))]/5">
                            {sessionWords.map((w, i) => (
                                <div key={i} className="flex items-start gap-2 px-3 py-2">
                                    <span className={`text-xs mt-0.5 ${w.correct ? 'text-[var(--color-correct)]' : 'text-[var(--color-wrong)]'}`}>
                                        {w.correct ? '✓' : '✗'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm ui font-medium ${w.correct ? 'text-[rgb(var(--color-fg))]/60' : 'text-[var(--color-wrong)]'}`}>
                                            {w.word}
                                        </div>
                                        {w.definition && (
                                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 truncate">
                                                {w.definition}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex gap-3 mt-2">
                <button
                    onClick={handleShare}
                    className="px-6 py-2.5 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
                >
                    Share
                </button>
                <button
                    onClick={onExit}
                    className="px-6 py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/20 text-sm ui text-[rgb(var(--color-fg))]/50 hover:border-[rgb(var(--color-fg))]/40 transition-colors"
                >
                    {exitLabel}
                </button>
            </div>
        </motion.div>
    );
});
