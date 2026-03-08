/**
 * components/OnboardingModal.tsx
 *
 * Single-screen first-launch setup: how it works + dialect picker.
 * Starts at Level 1 by default. Returning users see just the dialect picker.
 */
import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Level } from '../domains/spelling/spellingCategories';
import type { Dialect } from '../domains/spelling/words/types';
import { Button } from './Button';

interface Props {
    onComplete: (dialect: Dialect, level: Level) => void;
    currentDialect?: Dialect;
    currentLevel?: Level;
}

export const OnboardingModal = memo(function OnboardingModal({ onComplete, currentDialect, currentLevel }: Props) {
    const isFirstTime = !currentLevel;
    const [selectedDialect, setSelectedDialect] = useState<Dialect | null>(currentDialect ?? null);

    const handleComplete = () => {
        if (selectedDialect) {
            onComplete(selectedDialect, currentLevel ?? 'level-1');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[var(--color-board)] px-6 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center w-full max-w-sm py-8"
            >
                <div className="text-6xl mb-3">🐝</div>
                <h1 className="text-2xl chalk text-[var(--color-chalk)] mb-1">Spelling Bee</h1>

                {isFirstTime && (
                    <>
                        {/* Mini demo: simulated error analysis */}
                        <div className="w-full rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8 p-4 mb-4 mt-5">
                            <div className="text-xs ui text-[rgb(var(--color-fg))]/30 mb-2">You spell &ldquo;necessary&rdquo; as:</div>
                            <div className="text-lg chalk text-[var(--color-chalk)] mb-1 tracking-wide">
                                nece<span className="text-red-400 line-through">ss</span>ary
                            </div>
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20"
                            >
                                <span className="text-[11px] ui text-[var(--color-gold)]">Double letter confusion: <strong>ss</strong> &rarr; just <strong>s</strong></span>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mt-2"
                            >
                                We track this pattern &mdash; and bring the word back until it sticks.
                            </motion.div>
                        </div>

                        {/* Trust signals */}
                        <div className="w-full space-y-2 mb-5">
                            {[
                                { icon: '✓', text: '51,000+ words with real dictionary citations' },
                                { icon: '✓', text: 'No AI-generated content — human-curated' },
                                { icon: '✓', text: 'Works offline — no account required' },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.1 }}
                                    className="flex items-center gap-2.5 px-3"
                                >
                                    <span className="text-xs text-[var(--color-gold)] font-bold shrink-0">{item.icon}</span>
                                    <span className="text-[11px] ui text-[rgb(var(--color-fg))]/50">{item.text}</span>
                                </motion.div>
                            ))}
                        </div>
                    </>
                )}

                {/* Dialect picker */}
                <p className="text-sm ui text-[rgb(var(--color-fg))]/50 mb-3 mt-1">Choose your spelling dialect</p>
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

                <Button size="lg" className="mt-6" disabled={!selectedDialect} onClick={handleComplete}>
                    Let&apos;s Go!
                </Button>
            </motion.div>
        </div>
    );
});
