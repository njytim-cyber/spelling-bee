/**
 * hooks/useProfiles.ts
 *
 * Manages learner profiles for Bee Team tier.
 * Up to 5 profiles per account, stored in localStorage keyed by UID.
 * Each profile isolates stats, word history, and settings via profileId suffix.
 */
import { useState, useCallback } from 'react';
import { STORAGE_KEYS } from '../config';

const MAX_PROFILES = 5;

export interface LearnerProfile {
    id: string;
    name: string;
    avatarConfig: string;
    level: string;
    createdAt: string;
}

export interface ProfilesState {
    profiles: LearnerProfile[];
    activeProfileId: string | null; // null = parent/admin mode
}

function storageKey(uid: string): string {
    return `${STORAGE_KEYS.profiles}-${uid}`;
}

function loadProfiles(uid: string | null): ProfilesState {
    if (!uid) return { profiles: [], activeProfileId: null };
    try {
        const raw = localStorage.getItem(storageKey(uid));
        if (raw) return JSON.parse(raw);
    } catch { /* corrupt data */ }
    return { profiles: [], activeProfileId: null };
}

function saveProfiles(uid: string | null, state: ProfilesState): void {
    if (!uid) return;
    localStorage.setItem(storageKey(uid), JSON.stringify(state));
}

/** Generate a short random ID (8 chars) */
function nanoid8(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    for (let i = 0; i < 8; i++) result += chars[bytes[i] % chars.length];
    return result;
}

export function useProfiles(uid: string | null) {
    const [state, setStateRaw] = useState<ProfilesState>(() => loadProfiles(uid));

    const setState = useCallback((updater: (prev: ProfilesState) => ProfilesState) => {
        setStateRaw(prev => {
            const next = updater(prev);
            saveProfiles(uid, next);
            return next;
        });
    }, [uid]);

    const addProfile = useCallback((name: string, avatarConfig: string, level: string): LearnerProfile | null => {
        let created: LearnerProfile | null = null;
        setState(prev => {
            if (prev.profiles.length >= MAX_PROFILES) return prev;
            const profile: LearnerProfile = {
                id: nanoid8(),
                name: name.slice(0, 20),
                avatarConfig,
                level,
                createdAt: new Date().toISOString(),
            };
            created = profile;
            return { ...prev, profiles: [...prev.profiles, profile] };
        });
        return created;
    }, [setState]);

    const removeProfile = useCallback((profileId: string) => {
        setState(prev => ({
            profiles: prev.profiles.filter(p => p.id !== profileId),
            activeProfileId: prev.activeProfileId === profileId ? null : prev.activeProfileId,
        }));
    }, [setState]);

    const switchProfile = useCallback((profileId: string | null) => {
        setState(prev => ({ ...prev, activeProfileId: profileId }));
    }, [setState]);

    const updateProfile = useCallback((profileId: string, updates: Partial<Pick<LearnerProfile, 'name' | 'avatarConfig' | 'level'>>) => {
        setState(prev => ({
            ...prev,
            profiles: prev.profiles.map(p =>
                p.id === profileId ? { ...p, ...updates } : p,
            ),
        }));
    }, [setState]);

    return {
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        activeProfile: state.profiles.find(p => p.id === state.activeProfileId) ?? null,
        isParentMode: state.activeProfileId === null,
        canAddProfile: state.profiles.length < MAX_PROFILES,
        addProfile,
        removeProfile,
        switchProfile,
        updateProfile,
    };
}
