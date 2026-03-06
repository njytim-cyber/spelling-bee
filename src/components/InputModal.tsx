/**
 * components/InputModal.tsx
 *
 * On-brand text input modal — replaces native prompt().
 * Uses ModalShell for consistent overlay/animation/focus trapping.
 */
import { useState, useRef, useEffect } from 'react';
import { ModalShell } from './ModalShell';
import { Button } from './Button';

interface Props {
    title: string;
    placeholder?: string;
    onSubmit: (value: string) => void;
    onClose: () => void;
}

export function InputModal({ title, placeholder, onSubmit, onClose }: Props) {
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Small delay so ModalShell's auto-focus doesn't steal it
        const t = setTimeout(() => inputRef.current?.focus(), 50);
        return () => clearTimeout(t);
    }, []);

    const handleSubmit = () => {
        const trimmed = value.trim();
        if (trimmed) onSubmit(trimmed);
    };

    return (
        <ModalShell onClose={onClose} ariaLabel={title}>
            <div className="text-center mb-4">
                <h2 className="text-lg chalk text-[var(--color-gold)]">{title}</h2>
            </div>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/15 text-sm ui text-[rgb(var(--color-fg))] placeholder:text-[rgb(var(--color-fg))]/30 outline-none focus:border-[var(--color-gold)]/50 transition-colors"
            />
            <div className="flex gap-2 mt-4">
                <Button variant="secondary" className="flex-1" onClick={onClose}>
                    Cancel
                </Button>
                <Button variant="goldSolid" className="flex-1" onClick={handleSubmit} disabled={!value.trim()}>
                    OK
                </Button>
            </div>
        </ModalShell>
    );
}
