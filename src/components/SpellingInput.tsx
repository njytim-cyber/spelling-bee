/**
 * components/SpellingInput.tsx
 *
 * Large text input for spelling bee simulation mode.
 * Shows character-by-character display above the input field.
 */
import { memo, useRef, useEffect } from 'react';

interface Props {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    disabled?: boolean;
}

export const SpellingInput = memo(function SpellingInput({ value, onChange, onSubmit, disabled }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus when component mounts
    useEffect(() => {
        const t = setTimeout(() => inputRef.current?.focus(), 100);
        return () => clearTimeout(t);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && value.trim().length > 0) {
            onSubmit();
        }
    };

    return (
        <div className="w-full max-w-[320px] mx-auto">
            {/* Character-by-character display */}
            <div className="flex justify-center gap-1 mb-4 min-h-[48px] flex-wrap">
                {(value || ' ').split('').map((ch, i) => (
                    <div
                        key={i}
                        className="w-8 h-10 border-b-2 border-[rgb(var(--color-fg))]/30 flex items-end justify-center pb-1"
                    >
                        <span className="text-2xl chalk text-[var(--color-chalk)]">
                            {ch === ' ' ? '' : ch}
                        </span>
                    </div>
                ))}
            </div>

            {/* Input field */}
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full bg-transparent border-2 border-[rgb(var(--color-fg))]/20 rounded-xl px-4 py-3 text-lg chalk text-[var(--color-chalk)] text-center focus:border-[var(--color-gold)]/50 focus:outline-none transition-colors"
                placeholder="Type your spelling..."
            />

            {/* Submit button */}
            <button
                onClick={onSubmit}
                disabled={disabled || value.trim().length === 0}
                className="w-full mt-3 py-3 rounded-xl border-2 border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 text-base ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                Submit
            </button>
        </div>
    );
});
