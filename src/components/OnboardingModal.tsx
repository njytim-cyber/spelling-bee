/**
 * components/OnboardingModal.tsx
 *
 * First-launch setup: dialect picker + 5-question diagnostic placement test.
 * Returning users see just the dialect picker (no diagnostic).
 */
import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Level } from '../domains/spelling/spellingCategories';
import type { Dialect } from '../domains/spelling/words/types';
import type { EngineItem } from '../engine/domain';
import { ensureAllWords, wordsByDifficulty } from '../domains/spelling/words';
import { generateItemForWord } from '../domains/spelling/spellingGenerator';
import { Button } from './Button';
import { BeeGraphic } from './BeeBuddy';

interface Props {
    onComplete: (dialect: Dialect, level: Level) => void;
    currentDialect?: Dialect;
    currentLevel?: Level;
}

type Phase = 'dialect' | 'loading' | 'diagnostic' | 'done';

/** Difficulty levels tested in the diagnostic (easy → hard) */
const DIAGNOSTIC_DIFFICULTIES = [2, 4, 6, 7, 8] as const;

/** Build 5 MCQ items at the diagnostic difficulty levels */
function buildDiagnosticItems(): EngineItem[] {
    const items: EngineItem[] = [];
    for (const diff of DIAGNOSTIC_DIFFICULTIES) {
        const candidates = wordsByDifficulty(diff, diff);
        if (candidates.length === 0) continue;
        // Try a few times to get a valid item with distractors
        for (let attempt = 0; attempt < 5; attempt++) {
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            const item = generateItemForWord(pick.word, `level-${diff}`);
            if (item) {
                items.push(item);
                break;
            }
        }
    }
    return items;
}

/** Map diagnostic results to the highest level the user should start at */
function computePlacementLevel(results: boolean[]): Level {
    // Find highest difficulty where user answered correctly
    let highestCorrectDifficulty = 1;
    for (let i = 0; i < results.length && i < DIAGNOSTIC_DIFFICULTIES.length; i++) {
        if (results[i]) {
            highestCorrectDifficulty = DIAGNOSTIC_DIFFICULTIES[i];
        }
    }
    return `level-${highestCorrectDifficulty}` as Level;
}

export const OnboardingModal = memo(function OnboardingModal({ onComplete, currentDialect, currentLevel }: Props) {
    const isFirstTime = !currentLevel;
    const [selectedDialect, setSelectedDialect] = useState<Dialect | null>(currentDialect ?? null);
    const [phase, setPhase] = useState<Phase>('dialect');

    // Diagnostic state
    const [diagnosticItems, setDiagnosticItems] = useState<EngineItem[]>([]);
    const [diagnosticIndex, setDiagnosticIndex] = useState(0);
    const [diagnosticResults, setDiagnosticResults] = useState<boolean[]>([]);
    const [flashIndex, setFlashIndex] = useState<number | null>(null); // which option is flashing
    const [flashCorrect, setFlashCorrect] = useState(false); // green or red
    const [beeState, setBeeState] = useState<'idle' | 'success' | 'fail'>('idle');

    const handleDialectDone = useCallback(async () => {
        if (!selectedDialect) return;

        // Returning users skip diagnostic
        if (!isFirstTime) {
            onComplete(selectedDialect, currentLevel!);
            return;
        }

        // Start diagnostic: load all tiers then build items
        setPhase('loading');
        await ensureAllWords();
        const items = buildDiagnosticItems();
        if (items.length === 0) {
            // Fallback: if no items could be built, just start at level 1
            onComplete(selectedDialect, 'level-1');
            return;
        }
        setDiagnosticItems(items);
        setDiagnosticIndex(0);
        setDiagnosticResults([]);
        setPhase('diagnostic');
    }, [selectedDialect, isFirstTime, currentLevel, onComplete]);

    const handleDiagnosticAnswer = useCallback((optionIndex: number) => {
        if (flashIndex !== null) return; // already flashing
        const item = diagnosticItems[diagnosticIndex];
        const correct = optionIndex === item.correctIndex;

        // Flash feedback
        setFlashIndex(optionIndex);
        setFlashCorrect(correct);
        setBeeState(correct ? 'success' : 'fail');

        setTimeout(() => {
            setFlashIndex(null);
            setBeeState('idle');
            const newResults = [...diagnosticResults, correct];
            setDiagnosticResults(newResults);

            if (diagnosticIndex + 1 >= diagnosticItems.length) {
                // Done — compute placement
                const level = computePlacementLevel(newResults);
                setPhase('done');
                onComplete(selectedDialect!, level);
            } else {
                setDiagnosticIndex(diagnosticIndex + 1);
            }
        }, 400);
    }, [flashIndex, diagnosticItems, diagnosticIndex, diagnosticResults, selectedDialect, onComplete]);

    return (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[var(--color-board)] px-6 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center w-full max-w-sm py-8"
            >
                {/* --- Dialect picker phase --- */}
                {phase === 'dialect' && (
                    <>
                        <BeeGraphic state="idle" className="w-20 h-[100px] mb-2" />
                        <h1 className="text-2xl chalk text-[var(--color-chalk)] mb-1">Spelling Bee</h1>

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

                        <Button size="lg" className="mt-6" disabled={!selectedDialect} onClick={handleDialectDone}>
                            Let&apos;s Go!
                        </Button>
                    </>
                )}

                {/* --- Loading phase --- */}
                {phase === 'loading' && (
                    <div className="flex flex-col items-center gap-3">
                        <BeeGraphic state="idle" className="w-16 h-[82px]" />
                        <p className="text-sm ui text-[rgb(var(--color-fg))]/50">Preparing your placement test&hellip;</p>
                    </div>
                )}

                {/* --- Diagnostic phase --- */}
                {phase === 'diagnostic' && diagnosticItems.length > 0 && (
                    <>
                        <BeeGraphic state={beeState} className="w-14 h-[72px] mb-2" />

                        {/* Progress dots */}
                        <div className="flex items-center gap-2 mb-4">
                            {diagnosticItems.map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                                        i < diagnosticIndex
                                            ? (diagnosticResults[i] ? 'bg-[var(--color-correct)]' : 'bg-[var(--color-wrong)]')
                                            : i === diagnosticIndex
                                                ? 'bg-[var(--color-gold)]'
                                                : 'bg-[rgb(var(--color-fg))]/15'
                                    }`}
                                />
                            ))}
                        </div>

                        <p className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-1">
                            Question {diagnosticIndex + 1} of {diagnosticItems.length}
                        </p>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={diagnosticIndex}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="w-full"
                            >
                                {/* Definition prompt */}
                                <div className="text-center mb-4">
                                    <p className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-1">Which spelling is correct?</p>
                                    {typeof diagnosticItems[diagnosticIndex].meta?.['definition'] === 'string' && (
                                        <p className="text-sm ui text-[rgb(var(--color-fg))]/60 italic">
                                            {diagnosticItems[diagnosticIndex].meta!['definition'] as string}
                                        </p>
                                    )}
                                </div>

                                {/* MCQ options */}
                                <div className="flex flex-col gap-2.5 w-full max-w-[var(--content-w)]">
                                    {diagnosticItems[diagnosticIndex].options.map((opt, oi) => {
                                        let bgClass = 'border-[rgb(var(--color-fg))]/15 hover:border-[rgb(var(--color-fg))]/30';
                                        if (flashIndex !== null) {
                                            if (oi === flashIndex) {
                                                bgClass = flashCorrect
                                                    ? 'border-[var(--color-correct)] bg-[var(--color-correct)]/10'
                                                    : 'border-[var(--color-wrong)] bg-[var(--color-wrong)]/10';
                                            }
                                            // Also highlight the correct answer on wrong
                                            if (!flashCorrect && oi === diagnosticItems[diagnosticIndex].correctIndex) {
                                                bgClass = 'border-[var(--color-correct)] bg-[var(--color-correct)]/10';
                                            }
                                        }
                                        return (
                                            <motion.button
                                                key={oi}
                                                whileTap={flashIndex === null ? { scale: 0.96 } : undefined}
                                                onClick={() => handleDiagnosticAnswer(oi)}
                                                disabled={flashIndex !== null}
                                                className={`px-4 py-3 rounded-xl border-2 transition-colors text-center ${bgClass}`}
                                            >
                                                <span className="text-base chalk text-[var(--color-chalk)]">{String(opt)}</span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </>
                )}
            </motion.div>
        </div>
    );
});
