/**
 * Auto-pause when tab becomes hidden. Timer-based games use this
 * to freeze intervals while the user is away.
 */
import { useState, useEffect, useCallback } from 'react';

export function useVisibilityPause() {
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        const handler = () => {
            if (document.hidden) setPaused(true);
        };
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
    }, []);

    const resume = useCallback(() => setPaused(false), []);

    return { paused, setPaused, resume };
}
