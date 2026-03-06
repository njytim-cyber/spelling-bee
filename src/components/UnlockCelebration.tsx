/**
 * components/UnlockCelebration.tsx
 *
 * Full-screen rank-up celebration overlay with confetti burst,
 * bouncing rank emoji, and list of newly unlocked cosmetics.
 */
import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Confetti } from './Confetti';
import { Button } from './Button';
import { RankIcon } from './Icons';
import type { Rank } from '../utils/ranks';
import { appendReferralFooter, shareOrCopy } from '../utils/shareHelper';

interface Props {
    rank: Rank | null;
    newThemes?: string[];
    newTrails?: string[];
    onDismiss: () => void;
    referralCode?: string;
}

export const UnlockCelebration = memo(function UnlockCelebration({
    rank, newThemes, newTrails, onDismiss, referralCode,
}: Props) {
    const unlockItems = [
        ...(newThemes?.map(n => `🎨 ${n}`) ?? []),
        ...(newTrails?.map(n => `✨ ${n}`) ?? []),
    ];

    return (
        <AnimatePresence>
            {rank && (
                <motion.div
                    key="rank-celebration"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
                    onClick={onDismiss}
                >
                    <Confetti trigger={true} intensity="epic" />

                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                        className="flex flex-col items-center gap-4 px-8"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Rank icon with stamp effect */}
                        <motion.div
                            className="text-[var(--color-gold)] star-stamp"
                            initial={{ scale: 3, rotate: -15, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                        >
                            <RankIcon rank={rank.name} className="w-20 h-20" />
                        </motion.div>

                        {/* Rank name */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                            className="text-center"
                        >
                            <div className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-1">Rank Up!</div>
                            <div className="text-3xl chalk text-[var(--color-gold)] font-bold">
                                {rank.name}
                            </div>
                        </motion.div>

                        {/* Newly unlocked items */}
                        {unlockItems.length > 0 && (
                            <motion.div
                                initial={{ y: 15, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5, duration: 0.4 }}
                                className="text-center"
                            >
                                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mb-1.5">
                                    New unlocks available!
                                </div>
                                <div className="space-y-0.5">
                                    {unlockItems.map(item => (
                                        <div key={item} className="text-xs ui text-[rgb(var(--color-fg))]/50">
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Action buttons */}
                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.3 }}
                            className="mt-2 flex items-center gap-3"
                        >
                            <Button
                                variant="ghost"
                                onClick={async () => {
                                    const unlocks = unlockItems.length > 0 ? `\nUnlocked: ${unlockItems.join(', ')}` : '';
                                    const text = appendReferralFooter(
                                        `🏆 Just ranked up to ${rank.name} in Spelling Bee!\n${rank.emoji}${unlocks}`,
                                        referralCode,
                                    );
                                    await shareOrCopy(text);
                                }}
                            >
                                📤 Share
                            </Button>
                            <Button className="px-8" onClick={onDismiss}>
                                Awesome!
                            </Button>
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
