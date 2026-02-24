/**
 * components/TournamentSummary.tsx
 *
 * Shows tournament results after elimination.
 */
import { memo } from 'react';
import { motion } from 'framer-motion';

interface Props {
    round: number;
    onRestart: () => void;
    onExit: () => void;
}

function getDifficultyLabel(round: number): string {
    if (round <= 5) return 'CVC';
    if (round <= 10) return 'Blends';
    if (round <= 15) return 'Core';
    if (round <= 20) return 'Advanced';
    return 'Expert';
}

export const TournamentSummary = memo(function TournamentSummary({ round, onRestart, onExit }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center px-6 gap-4"
        >
            <div className="text-6xl">🏆</div>
            <h2 className="text-xl chalk text-[var(--color-gold)]">Tournament Over</h2>

            <div className="bg-[rgb(var(--color-fg))]/5 rounded-xl px-8 py-5 text-center">
                <div className="text-4xl chalk text-[var(--color-chalk)]">{round}</div>
                <div className="text-xs ui text-[rgb(var(--color-fg))]/40 mt-1">rounds survived</div>
                <div className="text-xs ui text-[rgb(var(--color-fg))]/25 mt-2">
                    Difficulty reached: {getDifficultyLabel(round)}
                </div>
            </div>

            {round >= 20 && (
                <div className="text-sm ui text-[var(--color-gold)]">
                    Amazing! You reached Expert level!
                </div>
            )}

            <div className="flex gap-3 mt-2">
                <button
                    onClick={onRestart}
                    className="px-6 py-2.5 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
                >
                    Try Again
                </button>
                <button
                    onClick={onExit}
                    className="px-6 py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/20 text-sm ui text-[rgb(var(--color-fg))]/50 hover:border-[rgb(var(--color-fg))]/40 transition-colors"
                >
                    Exit
                </button>
            </div>
        </motion.div>
    );
});
