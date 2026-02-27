import { memo, useMemo } from 'react';
import { parseEtymology, type LanguageOfOrigin } from '../utils/etymologyParser';
import { WORD_ROOTS } from '../domains/spelling/words/roots';

/** Colour for each language-of-origin pill */
const LANG_COLORS: Record<LanguageOfOrigin, string> = {
    Latin: 'bg-blue-500/20 text-blue-300',
    Greek: 'bg-emerald-500/20 text-emerald-300',
    French: 'bg-purple-500/20 text-purple-300',
    German: 'bg-amber-500/20 text-amber-300',
    Italian: 'bg-rose-500/20 text-rose-300',
    Spanish: 'bg-orange-500/20 text-orange-300',
    English: 'bg-slate-500/20 text-slate-300',
    Other: 'bg-gray-500/20 text-gray-300',
};

interface Props {
    etymology: string;
    word?: string;
}

/** Inline etymology explainer — parses origin, shows roots, finds related words. */
export const EtymologyExplainer = memo(function EtymologyExplainer({ etymology, word }: Props) {
    const parsed = useMemo(() => parseEtymology(etymology), [etymology]);

    // Find matching roots from WORD_ROOTS for this word
    const relatedRoots = useMemo(() => {
        if (!word) return [];
        const lw = word.toLowerCase();
        return WORD_ROOTS.filter(r =>
            r.examples.some(e => e.toLowerCase() === lw),
        );
    }, [word]);

    if (!etymology) return null;

    return (
        <div className="space-y-2.5">
            {/* Language origin badges */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {parsed.allLanguages.map(lang => (
                    <span
                        key={lang}
                        className={`text-[10px] ui font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${LANG_COLORS[lang]}`}
                    >
                        {lang}
                    </span>
                ))}
                {parsed.isCompound && (
                    <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30 uppercase tracking-wider">
                        compound
                    </span>
                )}
            </div>

            {/* Raw etymology text */}
            <div className="text-xs ui text-[rgb(var(--color-fg))]/45 text-center italic">
                {etymology}
            </div>

            {/* Root morpheme cards */}
            {relatedRoots.length > 0 && (
                <div className="space-y-1.5">
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 uppercase tracking-wider text-center">
                        Root morphemes
                    </div>
                    {relatedRoots.map(r => (
                        <div
                            key={r.root}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgb(var(--color-fg))]/5"
                        >
                            <span className="text-sm chalk text-[var(--color-gold)] font-bold shrink-0">
                                {r.root}
                            </span>
                            <span className="text-xs ui text-[rgb(var(--color-fg))]/40 flex-1">
                                &ldquo;{r.meaning}&rdquo;
                            </span>
                            <span className={`text-[9px] ui font-semibold uppercase px-1.5 py-0.5 rounded-full ${LANG_COLORS[r.origin]}`}>
                                {r.type}
                            </span>
                        </div>
                    ))}

                    {/* Related words from same roots */}
                    {(() => {
                        const related = [...new Set(
                            relatedRoots.flatMap(r => r.examples).filter(e => e.toLowerCase() !== word?.toLowerCase()),
                        )].slice(0, 6);
                        if (related.length === 0) return null;
                        return (
                            <div className="text-center">
                                <span className="text-[10px] ui text-[rgb(var(--color-fg))]/25 uppercase tracking-wider">
                                    Related:{' '}
                                </span>
                                <span className="text-xs ui text-[rgb(var(--color-fg))]/40">
                                    {related.join(', ')}
                                </span>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
});
