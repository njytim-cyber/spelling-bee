/**
 * components/SpellingDiffView.tsx
 *
 * Visual comparison showing what the student typed vs the correct spelling,
 * with character-level color coding: correct=chalk, wrong/extra=red, missing=gold.
 */
import { memo } from 'react';
import { spellingDiff, spellingHint } from '../utils/spellingDiff';

interface Props {
    typed: string;
    correct: string;
}

export const SpellingDiffView = memo(function SpellingDiffView({ typed, correct }: Props) {
    const { correctChars, typedChars } = spellingDiff(typed, correct);
    const hint = spellingHint(typed, correct);

    return (
        <div className="w-full flex flex-col items-center gap-1.5">
            {/* What you typed */}
            <div className="flex items-center gap-1">
                <span className="text-[9px] ui text-[rgb(var(--color-fg))]/30 w-12 text-right shrink-0">yours</span>
                <div className="flex flex-wrap justify-center">
                    {typedChars.map((ch, i) => (
                        <span
                            key={i}
                            className={`text-lg ui font-mono font-bold tracking-wider ${
                                ch.kind === 'correct'
                                    ? 'text-[var(--color-chalk)]'
                                    : 'text-[var(--color-wrong)] line-through decoration-[var(--color-wrong)]/40'
                            }`}
                        >
                            {ch.char}
                        </span>
                    ))}
                </div>
            </div>
            {/* Correct spelling */}
            <div className="flex items-center gap-1">
                <span className="text-[9px] ui text-[rgb(var(--color-fg))]/30 w-12 text-right shrink-0">correct</span>
                <div className="flex flex-wrap justify-center">
                    {correctChars.map((ch, i) => (
                        <span
                            key={i}
                            className={`text-lg ui font-mono font-bold tracking-wider ${
                                ch.kind === 'correct'
                                    ? 'text-[var(--color-chalk)]'
                                    : 'text-[var(--color-gold)] underline decoration-[var(--color-gold)]/60 underline-offset-4'
                            }`}
                        >
                            {ch.char}
                        </span>
                    ))}
                </div>
            </div>
            {/* Concise hint */}
            {hint && (
                <span className="text-[10px] ui text-[var(--color-gold)]/70 mt-0.5">{hint}</span>
            )}
        </div>
    );
});
