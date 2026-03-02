/**
 * components/ModalShell.tsx
 *
 * Shared modal wrapper — overlay + centered card with animation.
 * Eliminates duplicated overlay/positioning/animation across all modals.
 * Includes focus trapping + Escape key for accessibility.
 */
import { type ReactNode, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Props {
    onClose: () => void;
    children: ReactNode;
    /** Extra classes for the card (e.g. custom width). Defaults include w-[340px] max-h-[80vh]. */
    className?: string;
    /** Accessible label for the modal dialog */
    ariaLabel?: string;
}

export function ModalShell({ onClose, children, className, ariaLabel }: Props) {
    const cardRef = useRef<HTMLDivElement>(null);

    // Escape key closes modal
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Auto-focus the card on mount
    useEffect(() => {
        cardRef.current?.focus();
    }, []);

    // Trap focus inside the modal
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        const el = cardRef.current;
        if (!el) return;
        const focusable = el.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }, []);

    return (
        <>
            <motion.div
                className="fixed inset-0 bg-[var(--color-overlay-dim)] z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.div
                ref={cardRef}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--color-overlay)] border border-[rgb(var(--color-fg))]/15 rounded-2xl px-5 py-5 w-[min(340px,90vw)] max-h-[80vh] overflow-y-auto outline-none ${className ?? ''}`}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2 }}
            >
                {children}
            </motion.div>
        </>
    );
}
