/**
 * Lightweight error monitor — catches unhandled errors and rejections,
 * logs them to Firestore for visibility into prod crashes.
 * Capped at 10 reports per session to avoid spamming.
 */
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { STORAGE_KEYS } from '../config';

let reportCount = 0;
const MAX_REPORTS = 10;

function reportError(error: { message: string; stack?: string; source?: string }) {
    if (reportCount >= MAX_REPORTS) return;
    reportCount++;

    const errorId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Fire and forget — don't block the main thread
    setDoc(doc(db, 'errors', errorId), {
        message: error.message.slice(0, 500),
        stack: (error.stack || '').slice(0, 2000),
        source: error.source || 'unknown',
        user: localStorage.getItem(STORAGE_KEYS.displayName) || 'anonymous',
        userAgent: navigator.userAgent.slice(0, 200),
        url: window.location.href,
        timestamp: serverTimestamp(),
    }).catch(() => {
        // Silently fail — error monitoring shouldn't cause more errors
    });
}

export function initErrorMonitor() {
    window.addEventListener('error', (event) => {
        reportError({
            message: event.message || 'Unknown error',
            stack: event.error?.stack,
            source: `${event.filename}:${event.lineno}:${event.colno}`,
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        reportError({
            message: reason?.message || String(reason).slice(0, 500),
            stack: reason?.stack,
            source: 'unhandledrejection',
        });
    });
}
