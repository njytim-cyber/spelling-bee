/**
 * components/ModalShell.tsx
 *
 * Shared modal wrapper — overlay + centered card with animation.
 * Eliminates duplicated overlay/positioning/animation across all modals.
 */
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
    onClose: () => void;
    children: ReactNode;
    /** Extra classes for the card (e.g. custom width). Defaults include w-[340px] max-h-[80vh]. */
    className?: string;
}

export function ModalShell({ onClose, children, className }: Props) {
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
                className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--color-overlay)] border border-[rgb(var(--color-fg))]/15 rounded-2xl px-5 py-5 w-[340px] max-h-[80vh] overflow-y-auto ${className ?? ''}`}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
            >
                {children}
            </motion.div>
        </>
    );
}
