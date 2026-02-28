/**
 * components/OnboardingModal.tsx
 *
 * First-launch welcome screen. Lets the user pick their dialect and grade level
 * before starting to play. Shows previous choices as highlighted if they exist.
 */
import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GradeLevel } from '../domains/spelling/spellingCategories';
import { GRADE_LEVELS, gradeIcon } from '../domains/spelling/spellingCategories';
import type { Dialect } from '../domains/spelling/words/types';

interface Props {
    onComplete: (dialect: Dialect, grade: GradeLevel) => void;
    currentDialect?: Dialect;
    currentGrade?: GradeLevel;
}

export const OnboardingModal = memo(function OnboardingModal({ onComplete, currentDialect, currentGrade }: Props) {
    const [step, setStep] = useState<'dialect' | 'grade'>('dialect');
    const [selectedDialect, setSelectedDialect] = useState<Dialect | null>(currentDialect ?? null);
    const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(currentGrade ?? null);

    const handleDialectNext = () => {
        if (selectedDialect) {
            setStep('grade');
        }
    };

    const handleComplete = () => {
        if (selectedDialect && selectedGrade) {
            onComplete(selectedDialect, selectedGrade);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[var(--color-board)] px-6">
            <AnimatePresence mode="wait">
                {step === 'dialect' ? (
                    <motion.div
                        key="dialect"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex flex-col items-center w-full"
                    >
                        <div className="text-6xl mb-4">🐝</div>
                        <h1 className="text-2xl chalk text-[var(--color-chalk)] mb-1">Spelling Bee</h1>
                        <p className="text-sm ui text-[rgb(var(--color-fg))]/50 mb-6">Choose your spelling dialect</p>

                        <div className="flex flex-col gap-3 w-full max-w-[320px]">
                            {([
                                ['en-US', 'US English', 'color, center'],
                                ['en-GB', 'UK English', 'colour, centre']
                            ] as const).map(([d, label, examples]) => (
                                <motion.button
                                    key={d}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => setSelectedDialect(d)}
                                    className={`px-5 py-4 rounded-xl border-2 transition-colors text-left ${
                                        selectedDialect === d
                                            ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                                            : 'border-[rgb(var(--color-fg))]/15 hover:border-[rgb(var(--color-fg))]/30'
                                    }`}
                                >
                                    <div className={`text-base ui font-bold ${selectedDialect === d ? 'text-[var(--color-gold)]' : 'text-[var(--color-chalk)]'}`}>{label}</div>
                                    <div className="text-xs ui text-[rgb(var(--color-fg))]/40 mt-0.5">{examples}</div>
                                </motion.button>
                            ))}
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.92 }}
                            disabled={!selectedDialect}
                            onClick={handleDialectNext}
                            className="mt-8 px-10 py-3 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-lg ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </motion.button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="grade"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex flex-col items-center w-full"
                    >
                        <div className="text-6xl mb-4">🐝</div>
                        <h1 className="text-2xl chalk text-[var(--color-chalk)] mb-1">Spelling Bee</h1>
                        <p className="text-sm ui text-[rgb(var(--color-fg))]/50 mb-6">Pick your grade level</p>

                        <div className="flex flex-col gap-3 w-full max-w-[320px]">
                            {GRADE_LEVELS.map(g => (
                                <motion.button
                                    key={g.id}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => setSelectedGrade(g.id)}
                                    className={`flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-colors text-left ${
                                        selectedGrade === g.id
                                            ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                                            : 'border-[rgb(var(--color-fg))]/15 hover:border-[rgb(var(--color-fg))]/30'
                                    }`}
                                >
                                    <span className={`w-7 h-7 flex items-center justify-center ${selectedGrade === g.id ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/60'}`}>
                                        {gradeIcon(g.id)}
                                    </span>
                                    <div className="flex-1">
                                        <div className="text-base ui font-bold text-[var(--color-chalk)]">{g.label}</div>
                                        <div className="text-xs ui text-[var(--color-gold)]">{g.grades}</div>
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        <div className="flex gap-3 mt-8">
                            <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={() => setStep('dialect')}
                                className="px-6 py-3 rounded-xl border-2 border-[rgb(var(--color-fg))]/20 bg-[rgb(var(--color-fg))]/5 text-base ui text-[rgb(var(--color-fg))]/60 hover:bg-[rgb(var(--color-fg))]/10 transition-colors"
                            >
                                Back
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.92 }}
                                disabled={!selectedGrade}
                                onClick={handleComplete}
                                className="px-10 py-3 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-lg ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Let&apos;s Go!
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
