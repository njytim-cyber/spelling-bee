/**
 * Lightweight error monitor — catches unhandled errors and rejections,
 * logs them to Firestore for visibility into prod crashes.
 * Capped at 10 reports per session to avoid spamming.
 */
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

let reportCount = 0;
const MAX_REPORTS = 10;
let initialized = false;

/** Strip sensitive query params (auth tokens, API keys) from URLs before logging. */
function sanitizeUrl(url: string): string {
    try {
        const parsed = new URL(url);
        const sensitiveParams = ['oobCode', 'apiKey', 'code', 'token', 'key', 'secret'];
        for (const param of sensitiveParams) {
            if (parsed.searchParams.has(param)) {
                parsed.searchParams.set(param, '[REDACTED]');
            }
        }
        return parsed.toString();
    } catch {
        // If URL parsing fails, strip everything after '?'
        return url.split('?')[0] || url;
    }
}

export function reportError(error: { message: string; stack?: string; source?: string }) {
    if (reportCount >= MAX_REPORTS) return;
    reportCount++;

    const errorId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Fire and forget — don't block the main thread
    setDoc(doc(db, 'errors', errorId), {
        message: error.message.slice(0, 500),
        stack: (error.stack || '').replace(/[A-Z]:\\Users\\[^\s:)]+/gi, '[path]').replace(/\/home\/[^\s:)]+/g, '[path]').slice(0, 2000),
        source: error.source || 'unknown',
        userAgent: navigator.userAgent.slice(0, 200),
        url: sanitizeUrl(window.location.href),
        timestamp: serverTimestamp(),
    }).catch(() => {
        // Silently fail — error monitoring shouldn't cause more errors
    });
}

export function initErrorMonitor() {
    if (initialized) return;
    initialized = true;

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
