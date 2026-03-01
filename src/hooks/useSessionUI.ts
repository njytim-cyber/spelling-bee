import { useState, useEffect, useRef } from 'react';

/**
 * Auto-shows session summary when daily challenge finishes.
 * Calls the provided setShowSummary callback when daily completes.
 */
export function useAutoSummary(dailyComplete: boolean, setShowSummary: (value: boolean) => void) {
    // Track previous state using ref to avoid cascading renders
    const prevDailyCompleteRef = useRef(false);

    useEffect(() => {
        if (dailyComplete && !prevDailyCompleteRef.current) {
            prevDailyCompleteRef.current = true;
            setShowSummary(true);
        } else if (!dailyComplete && prevDailyCompleteRef.current) {
            prevDailyCompleteRef.current = false;
        }
    }, [dailyComplete, setShowSummary]);
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
