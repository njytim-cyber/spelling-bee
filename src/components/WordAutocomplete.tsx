/**
 * components/WordAutocomplete.tsx
 *
 * Search-as-you-type input that queries the 117K word bank.
 * Shows up to 8 suggestions with word, difficulty, POS, and truncated definition.
 * Tap a suggestion to add it (enriched). Enter on non-matching text adds unenriched.
 */
import { memo, useState, useRef, useCallback, useEffect } from 'react';
import type { CustomWord } from '../types/customList';
import type { SpellingWord } from '../domains/spelling/words/types';
import { getWordMap } from '../domains/spelling/words';
import { enrichWord } from '../hooks/useCustomLists';
import { IconSearch } from './Icons';

const MAX_SUGGESTIONS = 8;
const DEBOUNCE_MS = 150;

const DIFFICULTY_COLORS: Record<number, string> = {
    1: 'bg-green-400/20 text-green-400',
    2: 'bg-green-400/20 text-green-400',
    3: 'bg-yellow-400/20 text-yellow-400',
    4: 'bg-yellow-400/20 text-yellow-400',
    5: 'bg-orange-400/20 text-orange-400',
    6: 'bg-orange-400/20 text-orange-400',
    7: 'bg-red-400/20 text-red-400',
    8: 'bg-red-400/20 text-red-400',
    9: 'bg-purple-400/20 text-purple-400',
    10: 'bg-purple-400/20 text-purple-400',
};

interface Props {
    onAddWord: (word: CustomWord) => void;
    existingWords: Set<string>;
    placeholder?: string;
}

export const WordAutocomplete = memo(function WordAutocomplete({
    onAddWord,
    existingWords,
    placeholder = 'Search words to add...',
}: Props) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<SpellingWord[]>([]);
    const [selectedIdx, setSelectedIdx] = useState(-1);
    const timerRef = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const search = useCallback((q: string) => {
        if (q.length < 2) {
            setSuggestions([]);
            return;
        }
        const wordMap = getWordMap();
        const lower = q.toLowerCase();
        const matches: SpellingWord[] = [];
        for (const [key, val] of wordMap) {
            if (key.startsWith(lower) && !existingWords.has(key)) {
                matches.push(val);
                if (matches.length >= MAX_SUGGESTIONS) break;
            }
        }
        setSuggestions(matches);
        setSelectedIdx(-1);
    }, [existingWords]);

    const handleChange = useCallback((value: string) => {
        setQuery(value);
        clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => search(value), DEBOUNCE_MS);
    }, [search]);

    // Cleanup timer on unmount
    useEffect(() => () => clearTimeout(timerRef.current), []);

    const addFromSuggestion = useCallback((sw: SpellingWord) => {
        onAddWord(enrichWord(sw.word));
        setQuery('');
        setSuggestions([]);
        inputRef.current?.focus();
    }, [onAddWord]);

    const addFreeText = useCallback(() => {
        const trimmed = query.trim();
        if (!trimmed) return;
        if (existingWords.has(trimmed.toLowerCase())) return;
        onAddWord(enrichWord(trimmed));
        setQuery('');
        setSuggestions([]);
    }, [query, existingWords, onAddWord]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIdx >= 0 && selectedIdx < suggestions.length) {
                addFromSuggestion(suggestions[selectedIdx]);
            } else {
                addFreeText();
            }
        } else if (e.key === 'Escape') {
            setSuggestions([]);
        }
    }, [suggestions, selectedIdx, addFromSuggestion, addFreeText]);

    return (
        <div className="relative mb-3">
            <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--color-fg))]/20" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-full bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/10 rounded-xl pl-9 pr-3 py-2.5 text-sm ui text-[var(--color-chalk)] placeholder:text-[rgb(var(--color-fg))]/15 outline-none"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                />
            </div>

            {/* Suggestion dropdown */}
            {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--color-overlay)] border border-[rgb(var(--color-fg))]/15 rounded-xl overflow-hidden z-10 shadow-lg max-h-[280px] overflow-y-auto custom-scrollbar">
                    {suggestions.map((sw, i) => (
                        <button
                            key={sw.word}
                            onClick={() => addFromSuggestion(sw)}
                            className={`w-full px-3 py-2 flex items-start gap-2 text-left transition-colors ${
                                i === selectedIdx
                                    ? 'bg-[var(--color-gold)]/10'
                                    : 'hover:bg-[rgb(var(--color-fg))]/5'
                            }`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm ui font-bold text-[var(--color-chalk)]">{sw.word}</span>
                                    <span className={`text-[8px] ui font-bold px-1.5 py-0.5 rounded-full ${DIFFICULTY_COLORS[sw.difficulty] ?? 'bg-[rgb(var(--color-fg))]/10 text-[rgb(var(--color-fg))]/40'}`}>
                                        {sw.difficulty}
                                    </span>
                                    {sw.partOfSpeech && (
                                        <span className="text-[9px] ui italic text-[rgb(var(--color-fg))]/30">{sw.partOfSpeech}</span>
                                    )}
                                </div>
                                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/35 truncate">
                                    {sw.definition}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});
