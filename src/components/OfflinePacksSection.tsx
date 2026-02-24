/**
 * components/OfflinePacksSection.tsx
 *
 * Shows word pack download status and lets users pre-cache
 * word tiers for offline use.
 */
import { memo, useState, useCallback, useEffect } from 'react';
import { getPackStatus, downloadPack, type WordPack } from '../utils/offlinePacks';

export const OfflinePacksSection = memo(function OfflinePacksSection() {
    const [packs, setPacks] = useState<WordPack[]>(() => getPackStatus());
    const [downloading, setDownloading] = useState<string | null>(null);

    // Refresh status when component mounts or downloading completes
    useEffect(() => {
        setPacks(getPackStatus());
    }, [downloading]);

    const handleDownload = useCallback(async (packId: string) => {
        setDownloading(packId);
        try {
            await downloadPack(packId);
        } finally {
            setDownloading(null);
        }
    }, []);

    const handleDownloadAll = useCallback(async () => {
        setDownloading('all');
        try {
            for (const pack of packs) {
                if (!pack.downloaded) {
                    await downloadPack(pack.id);
                }
            }
        } finally {
            setDownloading(null);
        }
    }, [packs]);

    const allDownloaded = packs.every(p => p.downloaded);

    return (
        <section>
            <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Offline Word Packs</h4>
            <p className="text-[10px] ui text-[rgb(var(--color-fg))]/25 mb-3">
                Download packs so words are available offline.
            </p>

            <div className="space-y-2">
                {packs.map(pack => (
                    <div
                        key={pack.id}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/10"
                    >
                        <div>
                            <div className="text-sm ui text-[var(--color-chalk)]">
                                {pack.downloaded ? '✅' : '📦'} {pack.label}
                            </div>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/25">{pack.description}</div>
                        </div>
                        {pack.downloaded ? (
                            <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30">Ready</span>
                        ) : (
                            <button
                                onClick={() => handleDownload(pack.id)}
                                disabled={downloading !== null}
                                className="px-3 py-1.5 rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 text-xs ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/15 disabled:opacity-40 transition-colors"
                            >
                                {downloading === pack.id ? 'Loading...' : 'Download'}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {!allDownloaded && (
                <button
                    onClick={handleDownloadAll}
                    disabled={downloading !== null}
                    className="w-full mt-3 py-2 rounded-xl border border-[var(--color-gold)]/20 bg-[var(--color-gold)]/5 text-xs ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 disabled:opacity-40 transition-colors"
                >
                    {downloading === 'all' ? 'Downloading...' : 'Download All'}
                </button>
            )}
        </section>
    );
});
