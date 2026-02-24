import { type ReactNode, memo } from 'react';
import { motion } from 'framer-motion';
import { NAV_TABS, type AppTab } from '../config';

type Tab = AppTab;

interface TabDef { id: Tab; label: string; icon?: ReactNode; ariaLabel?: string }

interface Props {
    active: Tab;
    onChange: (tab: Tab) => void;
    /** Override tab definitions (label, icon). Defaults to NAV_TABS from config. */
    tabs?: ReadonlyArray<TabDef>;
}

// Default icons for each nav tab
const DEFAULT_ICONS: Record<Tab, ReactNode> = {
    game: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polygon points="5,3 19,12 5,21" />
        </svg>
    ),
    league: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    ),
    magic: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" />
        </svg>
    ),
    me: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="8" r="5" />
            <path d="M5 21v-1a7 7 0 0 1 14 0v1" />
        </svg>
    ),
};

export const BottomNav = memo(function BottomNav({ active, onChange, tabs: tabsProp }: Props) {
    const resolvedTabs: TabDef[] = (tabsProp ?? NAV_TABS).map(t => ({
        ...t,
        icon: DEFAULT_ICONS[t.id as Tab],
    }));
    return (
        <nav className="landscape-nav mt-auto flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom,4px)] pt-1 z-40 relative">
            {/* Subtle top border */}
            <div className="absolute top-0 left-4 right-4 h-px bg-[rgb(var(--color-fg))]/10" />

            {resolvedTabs.map(tab => {
                const isActive = tab.id === active;
                return (
                    <motion.button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`relative flex flex-col items-center gap-0.5 py-1 px-4 rounded-lg transition-colors ${isActive
                            ? 'text-[var(--color-gold)]'
                            : 'text-[rgb(var(--color-fg))]/60 active:text-[rgb(var(--color-fg))]/80'
                            }`}
                        whileTap={{ scale: 0.92 }}
                    >
                        {tab.icon}
                        <span className="text-[10px] ui tracking-wide">
                            {tab.label}
                        </span>
                        <div
                            className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[var(--color-gold)] transition-transform duration-200"
                            style={{ transform: isActive ? 'scale(1)' : 'scale(0)' }}
                        />
                    </motion.button>
                );
            })}
        </nav>
    );
});
