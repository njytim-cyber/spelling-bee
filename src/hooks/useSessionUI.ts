import { useState, useEffect } from 'react';

/**
 * Auto-shows session summary when daily challenge or speedrun finishes.
 * Returns showSummary state + setter, plus isNewSpeedrunRecord flag.
 */
export function useAutoSummary(
    dailyComplete: boolean,
    speedrunFinalTime: number | null,
    bestSpeedrunTime: number,
    updateBestSpeedrunTime: (time: number, hardMode?: boolean) => void,
    hardMode: boolean,
) {
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

    // Speedrun auto-show
    const [prevSpeedrunTime, setPrevSpeedrunTime] = useState<number | null>(null);
    const isNewSpeedrunRecord = !!(speedrunFinalTime && (bestSpeedrunTime === 0 || speedrunFinalTime < bestSpeedrunTime));

    if (speedrunFinalTime && speedrunFinalTime !== prevSpeedrunTime) {
        setPrevSpeedrunTime(speedrunFinalTime);
        setShowSummary(true);
        updateBestSpeedrunTime(speedrunFinalTime, hardMode);
    }
    if (!speedrunFinalTime && prevSpeedrunTime) {
        setPrevSpeedrunTime(null);
    }

    return { showSummary, setShowSummary, isNewSpeedrunRecord };
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
