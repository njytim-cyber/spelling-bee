import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../config';

export type MotionPreference = 'system' | 'always' | 'never';

const MQ = '(prefers-reduced-motion: reduce)';

function readPref(): MotionPreference {
    const v = localStorage.getItem(STORAGE_KEYS.reducedMotion);
    if (v === 'always' || v === 'never') return v;
    return 'system';
}

function systemWantsReduced(): boolean {
    return typeof window !== 'undefined' && window.matchMedia(MQ).matches;
}

export function useReducedMotion() {
    const [preference, setPreferenceState] = useState<MotionPreference>(readPref);
    const [systemReduced, setSystemReduced] = useState(systemWantsReduced);

    // Listen for OS-level changes
    useEffect(() => {
        const mql = window.matchMedia(MQ);
        const handler = (e: MediaQueryListEvent) => setSystemReduced(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    const setPreference = useCallback((p: MotionPreference) => {
        setPreferenceState(p);
        if (p === 'system') localStorage.removeItem(STORAGE_KEYS.reducedMotion);
        else localStorage.setItem(STORAGE_KEYS.reducedMotion, p);
    }, []);

    const reducedMotion =
        preference === 'always' ? true
            : preference === 'never' ? false
                : systemReduced;

    return { reducedMotion, preference, setPreference } as const;
}
