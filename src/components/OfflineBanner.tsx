import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Shows a subtle banner when the browser is offline.
 * Firebase offline persistence still works — this just informs the user.
 */
export const OfflineBanner = memo(function OfflineBanner() {
    const [offline, setOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const goOffline = () => setOffline(true);
        const goOnline = () => setOffline(false);
        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);
        return () => {
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('online', goOnline);
        };
    }, []);

    return (
        <AnimatePresence>
            {offline && (
                <motion.div
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center py-1.5 bg-amber-600/90 text-white text-xs ui font-medium tracking-wide"
                >
                    📡 Offline — your progress is saved locally
                </motion.div>
            )}
        </AnimatePresence>
    );
});
