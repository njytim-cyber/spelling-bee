import { useState, useEffect } from 'react';

/**
 * Auto-shows session summary when daily challenge finishes.
 * Returns showSummary state + setter.
 */
export function useAutoSummary(dailyComplete: boolean) {
    const [showSummary, setShowSummary] = useState(false);

    // Daily challenge auto-show
    const [prevDailyComplete, setPrevDailyComplete] = useState(false);
    if (dailyComplete && !prevDailyComplete) {
        setPrevDailyComplete(true);
        setShowSummary(true);
    }
    if (!dailyComplete && prevDailyComplete) {
        setPrevDailyComplete(false);
    }

    return { showSummary, setShowSummary };
}

/**
 * Detects when session streak exceeds all-time best and shows a toast.
 */
export function usePersonalBest(sessionBest: number, allTimeBest: number) {
    const [showPB, setShowPB] = useState(false);
    const [pbShown, setPbShown] = useState(false);

    if (!pbShown && sessionBest > allTimeBest && sessionBest > 0) {
        setPbShown(true);
        setShowPB(true);
    }

    useEffect(() => {
        if (!showPB) return;
        const t = setTimeout(() => setShowPB(false), 2000);
        return () => clearTimeout(t);
    }, [showPB]);

    return showPB;
}
