/**
 * components/StudyToolsModal.tsx
 *
 * Unified study tools panel with 3 top-level tabs:
 * Words (vocabulary browser) | Roots (etymology roots) | Analytics (accuracy patterns).
 */
import { memo, useState } from 'react';
import type { WordRecord } from '../hooks/useWordHistory';
import { FullScreenPanel } from './FullScreenPanel';
import { WordBookContent } from './WordBookModal';
import { RootsContent } from './RootsBrowser';
import { AnalyticsContent } from './StudyAnalyticsModal';

export type StudyTab = 'words' | 'roots' | 'analytics';

interface Props {
    records: Record<string, WordRecord>;
    onClose: () => void;
    defaultTab?: StudyTab;
    onDrillRoot?: (rootId: string) => void;
    rootMastery?: Map<string, { mastered: number; total: number }>;
}

const TABS: { id: StudyTab; label: string; icon: string }[] = [
    { id: 'words', label: 'Words', icon: '\uD83D\uDCD6' },
    { id: 'roots', label: 'Roots', icon: '\uD83C\uDF33' },
    { id: 'analytics', label: 'Analytics', icon: '\uD83D\uDCCA' },
];

export const StudyToolsModal = memo(function StudyToolsModal({
    records, onClose, defaultTab = 'words', onDrillRoot, rootMastery,
}: Props) {
    const [tab, setTab] = useState<StudyTab>(defaultTab);

    return (
        <FullScreenPanel title="Study Tools" onClose={onClose}>
            {/* Top-level tab bar */}
            <div className="flex gap-2 mb-4">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs ui transition-colors ${
                            tab === t.id
                                ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] font-semibold border border-[var(--color-gold)]/30'
                                : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 border border-[rgb(var(--color-fg))]/10'
                        }`}
                    >
                        <span className="text-sm">{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'words' && <WordBookContent records={records} />}
            {tab === 'roots' && <RootsContent onDrillRoot={onDrillRoot} rootMastery={rootMastery} />}
            {tab === 'analytics' && <AnalyticsContent records={records} />}
        </FullScreenPanel>
    );
});
