/**
 * components/FullScreenPanel.tsx
 *
 * Full-viewport slide-up panel for immersive browsing experiences.
 * Used by Study Tools (and any future feature that needs more space than ModalShell).
 */
import { type ReactNode, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from './ChevronLeft';

interface Props {
    title: string;
    onClose: () => void;
    children: ReactNode;
}

export function FullScreenPanel({ title, onClose, children }: Props) {
    // Escape key closes panel (matches ModalShell behavior)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed inset-0 z-50 flex flex-col bg-[var(--color-board)]"
        >
            <div className="w-full max-w-lg mx-auto flex flex-col flex-1 min-h-0">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,12px)+12px)] pb-3">
                    <button
                        onClick={onClose}
                        aria-label="Back"
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-[rgb(var(--color-fg))]/60 hover:text-[rgb(var(--color-fg))]/80 transition-colors"
                    >
                        <ChevronLeft />
                    </button>
                    <h3 className="text-lg ui font-bold text-[var(--color-gold)]">{title}</h3>
                    <div className="w-9" />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,16px)+16px)]">
                    {children}
                </div>
            </div>
        </motion.div>
    );
}
