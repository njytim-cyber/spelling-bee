import { useRegisterSW } from 'virtual:pwa-register/react';
import { AnimatePresence, motion } from 'framer-motion';

interface ReloadPromptProps {
    /** When true (e.g. user is mid-game), the toast is hidden until they navigate away */
    suppress?: boolean;
}

/**
 * Non-intrusive toast that appears when a new version of the app is available.
 * Hidden during active gameplay. Shows on Me/League/Magic tabs or before first answer.
 */
export function ReloadPrompt({ suppress = false }: ReloadPromptProps) {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(_swUrl: string, registration: ServiceWorkerRegistration | undefined) {
            // Check for updates every 60 minutes
            if (registration) {
                setInterval(() => { registration.update(); }, 60 * 60 * 1000);
            }
        },
        onRegisterError(error: Error) {
            console.warn('SW registration error:', error);
        },
    });

    const visible = needRefresh && !suppress;

    function close() {
        setNeedRefresh(false);
    }

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 60 }}
                    transition={{ duration: 0.3 }}
                    className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[999] bg-[var(--color-overlay)] border border-[var(--color-gold)]/30 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-lg backdrop-blur-sm"
                >
                    <span className="text-xl">✨</span>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs ui text-[rgb(var(--color-fg))]/60">New version available</div>
                        <div className="text-sm chalk text-[var(--color-chalk)]">Tap update to get the latest!</div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={close}
                            className="text-xs ui text-[rgb(var(--color-fg))]/40 px-2 py-1 rounded-lg active:bg-white/5 transition-colors"
                        >
                            Later
                        </button>
                        <button
                            onClick={() => {
                                updateServiceWorker(true);
                                // Fallback: if SW update doesn't trigger page reload, force it
                                setTimeout(() => window.location.reload(), 2000);
                            }}
                            className="text-xs ui font-semibold text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-3 py-1 rounded-lg active:bg-[var(--color-gold)]/20 transition-colors"
                        >
                            Update
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
