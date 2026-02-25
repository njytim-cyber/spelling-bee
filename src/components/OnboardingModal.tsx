/**
 * components/OnboardingModal.tsx
 *
 * First-launch welcome screen. Lets the user pick their grade level
 * before starting to play.
 */
import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import type { GradeLevel } from '../domains/spelling/spellingCategories';
import { GRADE_LEVELS, gradeIcon } from '../domains/spelling/spellingCategories';

interface Props {
    onSelect: (grade: GradeLevel) => void;
}

export const OnboardingModal = memo(function OnboardingModal({ onSelect }: Props) {
    const [selected, setSelected] = useState<GradeLevel | null>(null);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[var(--color-board)] px-6"
        >
            <div className="text-6xl mb-4">🐝</div>
            <h1 className="text-2xl chalk text-[var(--color-chalk)] mb-1">Spelling Bee</h1>
            <p className="text-sm ui text-[rgb(var(--color-fg))]/50 mb-6">Pick your grade level</p>

            <div className="flex flex-col gap-3 w-full max-w-[320px]">
                {GRADE_LEVELS.map(g => (
                    <motion.button
                        key={g.id}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setSelected(g.id)}
                        className={`flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-colors text-left ${
                            selected === g.id
                                ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                                : 'border-[rgb(var(--color-fg))]/15 hover:border-[rgb(var(--color-fg))]/30'
                        }`}
                    >
                        <span className={`w-7 h-7 flex items-center justify-center ${selected === g.id ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/60'}`}>
                            {gradeIcon(g.id)}
                        </span>
                        <div className="flex-1">
                            <div className="text-base chalk text-[var(--color-chalk)]">{g.label}</div>
                            <div className="text-xs ui text-[var(--color-gold)]">{g.grades}</div>
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
