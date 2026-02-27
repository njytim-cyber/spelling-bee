/**
 * components/SpellingInput.tsx
 *
 * Letter-by-letter spelling display for bee simulation mode.
 * A hidden input captures keyboard input while animated letters
 * appear one at a time in a chalk-style display.
 */
import { memo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    disabled?: boolean;
}

export const SpellingInput = memo(function SpellingInput({ value, onChange, onSubmit, disabled }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

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

    // Tap anywhere on the display area to focus the hidden input
    const focusInput = () => {
        inputRef.current?.focus();
    };

    const letters = value.split('');

    return (
        <div
            ref={wrapperRef}
            className="w-full max-w-[320px] mx-auto relative cursor-text"
            onClick={focusInput}
        >
            {/* Hidden input — captures keyboard, invisible but overlays the display */}
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
                className="absolute inset-0 opacity-0 w-full h-full z-10"
                style={{ caretColor: 'transparent' }}
            />

            {/* Letter display area */}
            <div className="flex items-center justify-center gap-1 min-h-[60px] px-4 py-3 rounded-2xl border-2 border-[rgb(var(--color-fg))]/20 bg-[var(--color-surface)] transition-colors"
                style={{ borderColor: value.length > 0 ? 'rgba(var(--color-fg), 0.2)' : undefined }}
            >
                <AnimatePresence mode="popLayout">
                    {letters.map((letter, i) => (
                        <motion.span
                            key={`${i}-${letter}`}
                            initial={{ opacity: 0, scale: 0.8, y: 6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.6, y: -6 }}
                            transition={{
                                duration: 0.15,
                                ease: [0.34, 1.56, 0.64, 1],
                                scale: { duration: 0.15, ease: [0.34, 1.56, 0.64, 1] },
                            }}
                            className="text-2xl ui font-bold text-[var(--color-chalk)] tracking-[0.15em] uppercase inline-block"
                        >
                            {letter}
                        </motion.span>
                    ))}
                </AnimatePresence>

                {/* Blinking cursor */}
                <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 0.5], ease: 'linear' }}
                    className="text-2xl ui font-bold text-[var(--color-gold)] ml-0.5"
                >
                    _
                </motion.span>
            </div>

            {/* Hint text */}
            <p className="text-center mt-1.5 text-xs ui text-[rgb(var(--color-fg))]/25">
                {value.length === 0 ? 'start typing...' : 'press Enter to submit'}
            </p>
        </div>
    );
});
