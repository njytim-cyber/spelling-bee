import { useState, useCallback, useRef } from 'react';

const MAX_LEVEL = 5;
const FAST_THRESHOLD_MS = 1500;
const SLOW_THRESHOLD_MS = 4000;
const FAST_STREAK_TO_LEVEL_UP = 3;
const SLOW_STREAK_TO_LEVEL_DOWN = 2;

export function useDifficulty(minLevel = 1) {
    const [level, setLevel] = useState(Math.max(2, minLevel));
    const fastCount = useRef(0);
    const slowCount = useRef(0);

    const recordAnswer = useCallback((ttsMs: number, correct: boolean) => {
        if (!correct) {
            // Wrong answer: don't change difficulty, just reset streaks
            fastCount.current = 0;
            slowCount.current = 0;
            return;
        }

        if (ttsMs < FAST_THRESHOLD_MS) {
            slowCount.current = 0;
            fastCount.current += 1;
            if (fastCount.current >= FAST_STREAK_TO_LEVEL_UP) {
                setLevel(l => Math.min(l + 1, MAX_LEVEL));
                fastCount.current = 0;
            }
        } else if (ttsMs > SLOW_THRESHOLD_MS) {
            fastCount.current = 0;
            slowCount.current += 1;
            if (slowCount.current >= SLOW_STREAK_TO_LEVEL_DOWN) {
                setLevel(l => Math.max(l - 1, minLevel));
                slowCount.current = 0;
            }
        } else {
            // In the "flow zone" (1.5–4s): reset both counters
            fastCount.current = 0;
            slowCount.current = 0;
        }
    }, [minLevel]);

    return { level, recordAnswer };
}
