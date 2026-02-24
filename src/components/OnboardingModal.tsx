/**
 * components/OnboardingModal.tsx
 *
 * First-launch welcome screen. Lets the user pick their age band
 * before starting to play.
 */
import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import type { SpellingBand } from '../domains/spelling/spellingCategories';

interface Props {
    onSelect: (band: SpellingBand) => void;
}

const BANDS: { id: SpellingBand; emoji: string; label: string; grades: string; desc: string }[] = [
    { id: 'starter', emoji: '🐣', label: 'Starter', grades: 'K – 1st', desc: 'Short words, basic phonics (CVC, blends, digraphs)' },
    { id: 'rising', emoji: '📚', label: 'Rising', grades: '2nd – 5th', desc: 'Longer words, silent-e, vowel teams, prefixes & suffixes' },
    { id: 'sigma', emoji: '🚀', label: 'Sigma', grades: '6th+', desc: 'Latin/Greek roots, competition-level, all categories' },
];

export const OnboardingModal = memo(function OnboardingModal({ onSelect }: Props) {
    const [selected, setSelected] = useState<SpellingBand | null>(null);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[var(--color-bg)] px-6"
        >
            <div className="text-6xl mb-4">🐝</div>
            <h1 className="text-2xl chalk text-[var(--color-chalk)] mb-2">Welcome to Spelling Bee!</h1>
            <p className="text-sm ui text-[rgb(var(--color-fg))]/40 text-center mb-8 max-w-[280px]">
                Choose your level to get started. You can change this later in Settings.
            </p>

            <div className="flex flex-col gap-3 w-full max-w-[320px]">
                {BANDS.map(b => (
                    <motion.button
                        key={b.id}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setSelected(b.id)}
                        className={`flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-colors text-left ${
                            selected === b.id
                                ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                                : 'border-[rgb(var(--color-fg))]/15 hover:border-[rgb(var(--color-fg))]/30'
                        }`}
                    >
                        <span className="text-3xl">{b.emoji}</span>
                        <div className="flex-1">
                            <div className="text-base chalk text-[var(--color-chalk)]">{b.label}</div>
                            <div className="text-xs ui text-[var(--color-gold)]">{b.grades}</div>
                            <div className="text-xs ui text-[rgb(var(--color-fg))]/35 mt-0.5">{b.desc}</div>
                        </div>
                    </motion.button>
                ))}
            </div>

            <motion.button
                whileTap={{ scale: 0.92 }}
                disabled={!selected}
                onClick={() => selected && onSelect(selected)}
                className="mt-8 px-10 py-3 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-lg ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                Let&apos;s Go!
            </motion.button>
        </motion.div>
    );
});
