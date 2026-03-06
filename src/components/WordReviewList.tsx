/**
 * components/WordReviewList.tsx
 *
 * Collapsible word review toggle + list used in session summaries.
 * Shows correct/incorrect status per word, with optional definitions.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReviewWord {
    word: string;
    correct: boolean;
    definition?: string;
}

interface Props {
    words: ReviewWord[];
    /** Show definition under each word. Default false. */
    showDefinitions?: boolean;
    /** Max height of scrollable list. Default '30vh'. */
    maxHeight?: string;
}

export function WordReviewList({ words, showDefinitions = false, maxHeight = '30vh' }: Props) {
    const [showReview, setShowReview] = useState(false);
    const missed = words.filter(w => !w.correct);

    if (words.length === 0) return null;

    return (
        <>
            <button
                onClick={() => setShowReview(r => !r)}
                className="text-[10px] ui text-[rgb(var(--color-fg))]/30 hover:text-[var(--color-gold)] transition-colors mb-3"
            >
                {showReview ? 'Hide' : 'Review'} {showDefinitions ? `${words.length} words` : 'words'}{missed.length > 0 ? ` (${missed.length} missed)` : ''}
            </button>
            <AnimatePresence>
                {showReview && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={`w-full overflow-hidden ${showDefinitions ? 'max-w-[300px]' : 'mb-3'}`}
                    >
                        <div className={`overflow-y-auto rounded-xl border border-[rgb(var(--color-fg))]/10 divide-y divide-[rgb(var(--color-fg))]/5`} style={{ maxHeight }}>
                            {words.map((w, i) => (
                                <div key={i} className={`flex ${showDefinitions ? 'items-start gap-2 px-3 py-2' : 'items-center gap-1.5 px-2.5 py-1.5'}`}>
                                    <span className={`text-${showDefinitions ? 'xs mt-0.5' : '[10px]'} ${w.correct ? 'text-[var(--color-correct)]' : 'text-[var(--color-wrong)]'}`}>
                                        {w.correct ? '✓' : '✗'}
                                    </span>
                                    {showDefinitions ? (
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm ui font-medium ${w.correct ? 'text-[rgb(var(--color-fg))]/60' : 'text-[var(--color-wrong)]'}`}>
                                                {w.word}
                                            </div>
                                            {w.definition && (
                                                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 truncate">
                                                    {w.definition}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className={`text-xs ui ${w.correct ? 'text-[rgb(var(--color-fg))]/50' : 'text-[var(--color-wrong)]'}`}>
                                            {w.word}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
