/**
 * components/MasteryCelebration.tsx
 *
 * Rarity-scaled celebration overlay for newly mastered words.
 * Rare+ words get a full-screen card reveal with confetti.
 * Common/Uncommon words use an enhanced toast (handled in App.tsx).
 */
import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Confetti } from './Confetti';
import { WordCard } from './WordCard';
import { Button } from './Button';
import type { SpellingWord } from '../domains/spelling/words/types';
import { getRarityConfig, type RarityConfig } from '../utils/rarity';

interface Props {
    /** The word that was just mastered (null = hidden) */
    word: SpellingWord | null;
    masteredAt?: number;
    onDismiss: () => void;
}

const RARITY_HEADERS: Record<string, string> = {
    rare: 'NEW WORD COLLECTED!',
    epic: 'EPIC WORD!',
    legendary: 'LEGENDARY!',
};

export const MasteryCelebration = memo(function MasteryCelebration({ word, masteredAt, onDismiss }: Props) {
    const rc: RarityConfig | null = word ? getRarityConfig(word.difficulty) : null;

    return (
        <AnimatePresence>
            {word && rc && (
                <motion.div
                    key="mastery-celebration"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center"
                    style={{ backgroundColor: `${rc.color}18` }}
                    onClick={onDismiss}
                >
                    {rc.confettiIntensity !== 'none' && (
                        <Confetti trigger={true} intensity={rc.confettiIntensity} />
                    )}

                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                        className="flex flex-col items-center gap-4 px-6 max-w-[340px] w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                            className="text-center"
                        >
                            <div className="text-3xl mb-1">{rc.emoji}</div>
                            <div
                                className="text-lg chalk font-bold"
                                style={{ color: rc.color }}
                            >
                                {RARITY_HEADERS[rc.rarity] ?? 'WORD COLLECTED!'}
                            </div>
                        </motion.div>

                        {/* Card reveal */}
                        <motion.div
                            initial={{ scale: 0, rotateY: 90 }}
                            animate={{ scale: 1, rotateY: 0 }}
                            transition={{ delay: 0.3, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                            className="w-full"
                        >
                            <WordCard word={word} masteredAt={masteredAt} />
                        </motion.div>

                        {/* Dismiss button */}
                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.3 }}
                        >
                            <Button className="px-8" onClick={onDismiss}>
                                Nice!
                            </Button>
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
