/**
 * components/WhatsNewModal.tsx
 *
 * Shows the latest changelog entry after an app update.
 * Auto-shown once per version; also accessible from Settings.
 */
import { memo } from 'react';
import { ModalShell } from './ModalShell';
import { IconClose } from './Icons';
import { CHANGELOG, markVersionSeen } from '../utils/changelog';

interface Props {
    onClose: () => void;
}

export const WhatsNewModal = memo(function WhatsNewModal({ onClose }: Props) {
    const latest = CHANGELOG[0];
    if (!latest) return null;

    const handleClose = () => {
        markVersionSeen();
        onClose();
    };

    return (
        <ModalShell onClose={handleClose} ariaLabel="What's new">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg ui font-bold text-[var(--color-chalk)]">What&apos;s New</h3>
                <button onClick={handleClose} className="opacity-40 hover:opacity-70 transition-opacity" aria-label="Close">
                    <IconClose className="w-5 h-5" />
                </button>
            </div>

            <div className="mb-4">
                <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-sm ui font-semibold text-[var(--color-gold)]">v{latest.version}</span>
                    <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30">{latest.date}</span>
                </div>
                <ul className="space-y-2">
                    {latest.highlights.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm ui text-[rgb(var(--color-fg))]/70 leading-relaxed">
                            <span className="text-[var(--color-gold)] shrink-0 mt-0.5">+</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {CHANGELOG.length > 1 && (
                <details className="group">
                    <summary className="text-xs ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50 cursor-pointer transition-colors mb-2">
                        Previous versions
                    </summary>
                    <div className="space-y-4 pt-2 border-t border-[rgb(var(--color-fg))]/10">
                        {CHANGELOG.slice(1).map(entry => (
                            <div key={entry.version}>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-xs ui font-semibold text-[rgb(var(--color-fg))]/50">v{entry.version}</span>
                                    <span className="text-[10px] ui text-[rgb(var(--color-fg))]/20">{entry.date}</span>
                                </div>
                                <ul className="space-y-1">
                                    {entry.highlights.map((item, i) => (
                                        <li key={i} className="text-xs ui text-[rgb(var(--color-fg))]/40 leading-relaxed pl-3">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </details>
            )}

            <div className="text-center mt-4 text-[9px] ui text-[rgb(var(--color-fg))]/15">
                v{__APP_VERSION__}
            </div>
        </ModalShell>
    );
});
