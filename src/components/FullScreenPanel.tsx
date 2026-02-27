/**
 * components/FullScreenPanel.tsx
 *
 * Full-viewport slide-up panel for immersive browsing experiences.
 * Used by Study Tools (and any future feature that needs more space than ModalShell).
 */
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
    title: string;
    onClose: () => void;
    children: ReactNode;
}

export function FullScreenPanel({ title, onClose, children }: Props) {
    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed inset-0 z-50 flex flex-col bg-[var(--color-board)]"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,12px)+12px)] pb-3">
                <div className="w-9" />
                <h3 className="text-lg ui font-bold text-[var(--color-gold)]">{title}</h3>
                <button
                    onClick={onClose}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-[rgb(var(--color-fg))]/60 hover:text-[rgb(var(--color-fg))]/80 transition-colors"
                >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6L6 18" />
                        <path d="M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,16px)+16px)]">
                {children}
            </div>
        </motion.div>
    );
}
