/**
 * components/OnboardingModal.tsx
 *
 * First-launch welcome screen. Lets the user pick their dialect and level
 * before starting to play. Shows previous choices as highlighted if they exist.
 */
import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Level } from '../domains/spelling/spellingCategories';
import { LEVELS, levelIcon } from '../domains/spelling/spellingCategories';
import type { Dialect } from '../domains/spelling/words/types';
import { isLevelPremium } from '../hooks/usePremium';
import { IconLock } from './Icons';
import { Button } from './Button';

interface Props {
    onComplete: (dialect: Dialect, level: Level) => void;
    currentDialect?: Dialect;
    currentLevel?: Level;
}

export const OnboardingModal = memo(function OnboardingModal({ onComplete, currentDialect, currentLevel }: Props) {
    const isFirstTime = !currentLevel;
    const [step, setStep] = useState<'welcome' | 'age' | 'dialect' | 'level'>(isFirstTime ? 'welcome' : 'dialect');
    const [selectedDialect, setSelectedDialect] = useState<Dialect | null>(currentDialect ?? null);
    const [selectedLevel, setSelectedLevel] = useState<Level | null>(currentLevel ?? (isFirstTime ? 'level-1' : null));

    const handleDialectNext = () => {
        if (selectedDialect) {
            setStep('level');
        }
    };

    const handleComplete = () => {
        if (selectedDialect && selectedLevel) {
            onComplete(selectedDialect, selectedLevel);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[var(--color-board)] px-6">
            <AnimatePresence mode="wait">
                {step === 'welcome' ? (
                    <motion.div
                        key="welcome"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex flex-col items-center w-full max-w-sm"
                    >
                        <div className="text-6xl mb-4">🐝</div>
                        <h1 className="text-2xl chalk text-[var(--color-chalk)] mb-1">Spelling Bee</h1>
                        <p className="text-sm ui text-[rgb(var(--color-fg))]/50 mb-6">Learn to spell 117,000+ words</p>

                        {/* How to play */}
                        <div className="w-full space-y-3 mb-8">
                            {[
                                { icon: '🔊', title: 'Listen', desc: 'Hear a word and read its definition' },
                                { icon: '👆', title: 'Pick the correct spelling', desc: 'Tap one of 3 options' },
                                { icon: '📈', title: 'Build streaks for bonus points', desc: '10 pts + streak bonus + speed bonus' },
                                { icon: '🧠', title: 'Words you miss come back', desc: 'Spaced repetition helps you remember' },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + i * 0.1 }}
                                    className="flex items-start gap-3 px-4 py-2.5 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8"
                                >
                                    <span className="text-xl shrink-0">{item.icon}</span>
                                    <div>
                                        <div className="text-sm ui font-bold text-[var(--color-chalk)]">{item.title}</div>
                                        <div className="text-[11px] ui text-[rgb(var(--color-fg))]/40">{item.desc}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <Button size="lg" onClick={() => setStep('age')}>
                            Get Started
                        </Button>
                    </motion.div>
                ) : step === 'age' ? (
                    <motion.div
                        key="age"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex flex-col items-center w-full max-w-sm"
                    >
                        <div className="text-6xl mb-4">🐝</div>
                        <h1 className="text-2xl chalk text-[var(--color-chalk)] mb-1">Spelling Bee</h1>
                        <p className="text-sm ui text-[rgb(var(--color-fg))]/50 mb-6">One quick question first</p>

                        <div className="w-full bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8 rounded-xl p-5 mb-6">
                            <p className="text-sm ui text-[var(--color-chalk)] text-center leading-relaxed mb-1">
                                Are you 13 years old or older?
                            </p>
                            <p className="text-[10px] ui text-[rgb(var(--color-fg))]/30 text-center">
                                If you&apos;re younger, a parent or guardian should set this up
                            </p>
                        </div>

                        <div className="flex flex-col gap-2.5 w-full">
                            <Button size="lg" className="w-full px-5 py-3.5 text-base" onClick={() => setStep('dialect')}>
                                Yes, I&apos;m 13 or older
                            </Button>
                            <Button variant="secondary" size="lg" className="w-full px-5 py-3.5 text-base border-2 border-[rgb(var(--color-fg))]/15" onClick={() => setStep('dialect')}>
                                I have parent/guardian permission
                            </Button>
                        </div>

                        <p className="text-[9px] ui text-[rgb(var(--color-fg))]/20 text-center mt-4 leading-relaxed max-w-[260px]">
                            Spelling Bee works fully without an account. Sign-in and cloud sync are optional features for users 13+.
                        </p>
                    </motion.div>
                ) : step === 'dialect' ? (
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

                        <div className="flex flex-col gap-3 w-full max-w-[var(--content-w)]">
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

                        <div className="flex gap-3 mt-8">
                            {isFirstTime && (
                                <Button variant="secondary" size="lg" className="px-6 border-2 border-[rgb(var(--color-fg))]/20" onClick={() => setStep('age')}>
                                    Back
                                </Button>
                            )}
                            <Button size="lg" disabled={!selectedDialect} onClick={handleDialectNext}>
                                Next
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="level"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex flex-col items-center w-full"
                    >
                        <div className="text-6xl mb-4">🐝</div>
                        <h1 className="text-2xl chalk text-[var(--color-chalk)] mb-1">Spelling Bee</h1>
                        <p className={`text-sm ui text-[rgb(var(--color-fg))]/50 ${isFirstTime ? 'mb-1' : 'mb-6'}`}>Pick your level</p>
                        {isFirstTime && (
                            <p className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mb-4">Not sure? Start with Level 1!</p>
                        )}

                        <div className="grid grid-cols-2 gap-2 w-full max-w-[var(--content-w)]">
                            {LEVELS.map(g => {
                                const locked = isLevelPremium(g.id);
                                return (
                                    <motion.button
                                        key={g.id}
                                        whileTap={!locked ? { scale: 0.96 } : undefined}
                                        onClick={() => !locked && setSelectedLevel(g.id)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-left ${
                                            locked
                                                ? 'border-[rgb(var(--color-fg))]/8 opacity-50 cursor-not-allowed'
                                                : selectedLevel === g.id
                                                    ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                                                    : 'border-[rgb(var(--color-fg))]/15 hover:border-[rgb(var(--color-fg))]/30'
                                        }`}
                                    >
                                        <span className={`w-6 h-6 flex items-center justify-center shrink-0 ${locked ? 'text-[rgb(var(--color-fg))]/30' : selectedLevel === g.id ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/60'}`}>
                                            {locked ? <IconLock className="w-4 h-4" /> : levelIcon(g.id)}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm ui font-bold text-[var(--color-chalk)]">{g.label}</span>
                                            {locked && <span className="text-[9px] ui text-[var(--color-gold)]/60">Champion</span>}
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>

                        <div className="flex gap-3 mt-8">
                            <Button variant="secondary" size="lg" className="px-6 border-2 border-[rgb(var(--color-fg))]/20" onClick={() => setStep('dialect')}>
                                Back
                            </Button>
                            <Button size="lg" disabled={!selectedLevel} onClick={handleComplete}>
                                Let&apos;s Go!
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
