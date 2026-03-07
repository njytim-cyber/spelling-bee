/**
 * utils/retentionTracker.ts
 *
 * Measures long-term word retention by checking words that were once mastered
 * (correct >= 4) and haven't been seen in 30+ days. Fires a GA4 event once per day.
 */
import type { WordRecord } from '../hooks/useWordHistory';
import { trackEvent } from './analytics';

const RETENTION_CHECK_KEY = 'sb-retention-check-date';
const THIRTY_DAYS_MS = 30 * 86_400_000;

export function measureRetention(records: Record<string, WordRecord>): void {
    // Run once per UTC day
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(RETENTION_CHECK_KEY) === today) return;

    const now = Date.now();
    let wordsChecked = 0;
    let wordsRetained = 0;

    for (const r of Object.values(records)) {
        // Check words that were once mastered (correct >= 4 implies promoted through boxes)
        // and haven't been answered correctly in 30+ days
        if (r.correct >= 4 && r.lastCorrect > 0 && (now - r.lastCorrect) > THIRTY_DAYS_MS) {
            wordsChecked++;
            if (r.box >= 3) wordsRetained++;
        }
    }

    // Only fire event if there are words to measure
    if (wordsChecked > 0) {
        const retentionRate = Math.round((wordsRetained / wordsChecked) * 100);
        trackEvent('word_retention_check', {
            words_checked: wordsChecked,
            words_retained: wordsRetained,
            retention_rate: retentionRate,
        });
    }

    localStorage.setItem(RETENTION_CHECK_KEY, today);
}
