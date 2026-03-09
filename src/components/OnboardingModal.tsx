/**
 * components/OnboardingModal.tsx
 *
 * First-launch setup: dialect picker + 5-question diagnostic placement test.
 * Returning users see just the dialect picker (no diagnostic).
 */
import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Level } from '../domains/spelling/spellingCategories';
import type { Dialect } from '../domains/spelling/words/types';
import type { EngineItem } from '../engine/domain';
import { ensureAllWords, wordsByDifficulty, setDialect } from '../domains/spelling/words';
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

/** Each diagnostic item carries its actual difficulty for correct placement */
interface DiagnosticItem {
    item: EngineItem;
    difficulty: number;
}

/** Build MCQ items at the diagnostic difficulty levels, tracking actual difficulty */
function buildDiagnosticItems(): DiagnosticItem[] {
    const items: DiagnosticItem[] = [];
    for (const diff of DIAGNOSTIC_DIFFICULTIES) {
        const candidates = wordsByDifficulty(diff, diff);
        if (candidates.length === 0) continue;
        for (let attempt = 0; attempt < 5; attempt++) {
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            const item = generateItemForWord(pick.word, `level-${diff}`);
            if (item) {
                items.push({ item, difficulty: diff });
                break;
            }
        }
    }
    return items;
}

/** Map diagnostic results to the highest level the user should start at.
 *  Uses each item's actual difficulty (not positional index) to avoid
 *  misalignment when some difficulty levels produce no candidates. */
function computePlacementLevel(diagnosticItems: DiagnosticItem[], results: boolean[]): Level {
    let highestCorrectDifficulty = 1;
    for (let i = 0; i < results.length && i < diagnosticItems.length; i++) {
        if (results[i]) {
            highestCorrectDifficulty = diagnosticItems[i].difficulty;
        }
    }
    return `level-${highestCorrectDifficulty}` as Level;
}

export const OnboardingModal = memo(function OnboardingModal({ onComplete, currentDialect, currentLevel }: Props) {
    const isFirstTime = !currentLevel;
    const [selectedDialect, setSelectedDialect] = useState<Dialect | null>(currentDialect ?? null);
    const [phase, setPhase] = useState<Phase>('dialect');

    // Diagnostic state
    const [diagnosticItems, setDiagnosticItems] = useState<DiagnosticItem[]>([]);
    const [diagnosticIndex, setDiagnosticIndex] = useState(0);
    const [diagnosticResults, setDiagnosticResults] = useState<boolean[]>([]);
    const [flashIndex, setFlashIndex] = useState<number | null>(null);
    const [flashCorrect, setFlashCorrect] = useState(false);
    const [beeState, setBeeState] = useState<'idle' | 'success' | 'fail'>('idle');

    // Track the flash timeout so we can clean it up on unmount
    const flashTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        };
    }, []);

    const handleDialectDone = useCallback(async () => {
        if (!selectedDialect) return;

        // Returning users skip diagnostic
        if (!isFirstTime) {
            onComplete(selectedDialect, currentLevel!);
            return;
        }

        // Start diagnostic: apply dialect FIRST so word bank uses correct spellings,
        // then load all tiers and build items
        setPhase('loading');
        if (selectedDialect === 'en-GB') {
            await setDialect(selectedDialect);
        }
        await ensureAllWords();
        if (!mountedRef.current) return;
        const items = buildDiagnosticItems();
        if (items.length === 0) {
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

        const currentItem = diagnosticItems[diagnosticIndex];
        const correct = optionIndex === currentItem.item.correctIndex;

        // Flash feedback
        setFlashIndex(optionIndex);
        setFlashCorrect(correct);
        setBeeState(correct ? 'success' : 'fail');

        flashTimerRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            setFlashIndex(null);
            setBeeState('idle');

            // Use functional updates to avoid stale closure over diagnosticResults/diagnosticIndex
            setDiagnosticResults(prev => {
                const newResults = [...prev, correct];

                // Check completion using captured values from outer scope
                // (diagnosticItems is stable — set once and never mutated)
                const nextIndex = prev.length + 1; // prev.length === diagnosticIndex at call time
                if (nextIndex >= diagnosticItems.length) {
                    setPhase('done');
                    onComplete(selectedDialect!, computePlacementLevel(diagnosticItems, newResults));
                } else {
                    setDiagnosticIndex(nextIndex);
                }

                return newResults;
            });
        }, 400);
    }, [flashIndex, diagnosticItems, diagnosticIndex, selectedDialect, onComplete]);

    const currentDiagnostic = diagnosticItems[diagnosticIndex]?.item;

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
                {phase === 'diagnostic' && currentDiagnostic && (
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
                                    {typeof currentDiagnostic.meta?.['definition'] === 'string' && (
                                        <p className="text-sm ui text-[rgb(var(--color-fg))]/60 italic">
                                            {currentDiagnostic.meta!['definition'] as string}
                                        </p>
                                    )}
                                </div>

                                {/* MCQ options */}
                                <div className="flex flex-col gap-2.5 w-full max-w-[var(--content-w)]">
                                    {currentDiagnostic.options.map((opt, oi) => {
                                        let bgClass = 'border-[rgb(var(--color-fg))]/15 hover:border-[rgb(var(--color-fg))]/30';
                                        if (flashIndex !== null) {
                                            if (oi === flashIndex) {
                                                bgClass = flashCorrect
                                                    ? 'border-[var(--color-correct)] bg-[var(--color-correct)]/10'
                                                    : 'border-[var(--color-wrong)] bg-[var(--color-wrong)]/10';
                                            }
                                            if (!flashCorrect && oi === currentDiagnostic.correctIndex) {
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
