/**
 * components/CertificatePreview.tsx
 *
 * Modal showing a certificate preview with Print and Download actions.
 * Renders the certificate off-screen for html-to-image capture.
 */
import { memo, useRef, useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ModalShell } from './ModalShell';
import {
    buildCertificateElement,
    printCertificate,
    downloadCertificateImage,
} from '../utils/certificateGenerator';
import type { AnyCertificateData } from '../utils/certificateGenerator';
import { trackEvent } from '../utils/analytics';

interface Props {
    data: AnyCertificateData | null;
    onClose: () => void;
}

export const CertificatePreview = memo(function CertificatePreview({ data, onClose }: Props) {
    const certRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);

    // Build the certificate element into the hidden container when data changes
    useEffect(() => {
        if (!data || !certRef.current) return;
        certRef.current.replaceChildren();
        const el = buildCertificateElement(data);
        certRef.current.appendChild(el);
    }, [data]);

    if (!data) return null;

    const handlePrint = () => {
        printCertificate(data);
        trackEvent('certificate_downloaded', { type: data.type, method: 'print' });
    };

    const handleDownload = async () => {
        if (downloading || !certRef.current?.firstElementChild) return;
        setDownloading(true);
        try {
            await downloadCertificateImage(
                certRef.current.firstElementChild as HTMLElement,
                data.playerName,
            );
            trackEvent('certificate_downloaded', { type: data.type, method: 'image' });
        } catch {
            // Silent fail
        } finally {
            setDownloading(false);
        }
    };

    return (
        <AnimatePresence>
            <ModalShell onClose={onClose} ariaLabel="Certificate preview" className="w-[min(380px,90vw)]">
                {/* Scaled-down preview */}
                <div className="mb-4">
                    <div className="text-sm chalk text-[var(--color-gold)] text-center mb-3">
                        {data.type === 'level-completion' && '\uD83C\uDF93 Level Certificate'}
                        {data.type === 'bee-win' && '\uD83D\uDC1D Bee Champion Certificate'}
                        {data.type === 'weekly-champion' && '\uD83D\uDC51 Weekly Champion Certificate'}
                    </div>

                    {/* Mini preview card */}
                    <div className="mx-auto w-full aspect-[1080/1520] bg-[#1a1a24] rounded-xl overflow-hidden border border-[rgb(var(--color-fg))]/10 flex items-center justify-center p-6">
                        <div className="text-center">
                            <div className="text-4xl mb-2">
                                {data.type === 'level-completion' && '\uD83C\uDF93'}
                                {data.type === 'bee-win' && '\uD83D\uDC1D'}
                                {data.type === 'weekly-champion' && '\uD83D\uDC51'}
                            </div>
                            <div className="text-xs chalk text-[var(--color-gold)] mb-1">
                                {data.type === 'level-completion' && 'Certificate of Achievement'}
                                {data.type === 'bee-win' && 'Spelling Bee Champion'}
                                {data.type === 'weekly-champion' && 'Weekly Champion'}
                            </div>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/50 mb-2">
                                {data.type === 'level-completion' && `Level ${data.level}`}
                                {data.type === 'bee-win' && `${data.beeLevel} Bee`}
                                {data.type === 'weekly-champion' && data.weekLabel}
                            </div>
                            <div className="text-xs ui text-[rgb(var(--color-fg))]/70">{data.playerName}</div>
                            <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30 mt-1">{data.date}</div>
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-2.5 rounded-xl bg-[rgb(var(--color-fg))]/10 text-sm ui font-medium text-[rgb(var(--color-fg))]/80 active:scale-95 transition-transform"
                    >
                        🖨️ Print
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex-1 py-2.5 rounded-xl bg-[var(--color-gold)]/15 text-sm ui font-medium text-[var(--color-gold)] active:scale-95 transition-transform disabled:opacity-50"
                    >
                        {downloading ? 'Saving...' : '📥 Download'}
                    </button>
                </div>

                {/* Hidden off-screen render target for html-to-image */}
                <div ref={certRef} className="absolute left-[-9999px] top-[-9999px]" />
            </ModalShell>
        </AnimatePresence>
    );
});
