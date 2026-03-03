/**
 * components/DailyChallengeComplete.tsx
 *
 * Shown after completing the daily 10-word challenge.
 */
import { memo } from 'react';
import { motion } from 'framer-motion';
import { getDailyStreak, getTodayLabel } from '../utils/dailyTracking';
import { createChallengeId } from '../utils/dailyChallenge';

interface Props {
    correct: number;
    total: number;
    score: number;
    onExit: () => void;
    mode?: 'daily' | 'review' | 'challenge';
}

const MODE_CONFIG = {
    daily: { icon: '📅', title: 'Daily Complete!', exitLabel: 'Back to Play' },
    review: { icon: '📖', title: 'Review Complete!', exitLabel: 'Back to Play' },
    challenge: { icon: '🏆', title: 'Challenge Complete!', exitLabel: 'Back to Play' },
};

export const DailyChallengeComplete = memo(function DailyChallengeComplete({ correct, total, score, onExit, mode = 'daily' }: Props) {
    const streak = getDailyStreak();
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const dateLabel = getTodayLabel();
    const { icon, title, exitLabel } = MODE_CONFIG[mode];

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

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center px-6 gap-4"
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
