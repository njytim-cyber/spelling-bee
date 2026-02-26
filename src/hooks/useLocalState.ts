import { useState, useCallback, useEffect, useRef } from 'react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { STORAGE_TO_FIRESTORE } from '../config';

/**
 * useState backed by localStorage + Firestore cloud sync.
 * Reads localStorage on mount (fast), restores from Firestore if local is empty.
 * Every set writes to both localStorage and Firestore preferences.
 */
export function useLocalState(
    key: string,
    defaultValue: string,
    uid?: string | null,
): [string, (value: string) => void] {
    const [state, setInner] = useState<string>(
        () => localStorage.getItem(key) || defaultValue,
    );

    // Restore from Firestore if localStorage is empty or UID changed
    const prevUidRef = useRef(uid);
    useEffect(() => {
        if (!uid) return;
        const uidChanged = prevUidRef.current !== uid;
        prevUidRef.current = uid;
        const localVal = localStorage.getItem(key);
        if (localVal && !uidChanged) return; // already have local data and same user
        getDoc(doc(db, 'users', uid)).then(snap => {
            if (snap.exists() && snap.data().preferences) {
                const prefs = snap.data().preferences;
                const field = STORAGE_TO_FIRESTORE[key];
                if (field && prefs[field]) {
                    setInner(prefs[field]);
                    localStorage.setItem(key, prefs[field]);
                }
            }
        }).catch(() => { /* silent */ });
    }, [uid, key]);

    const setState = useCallback((value: string) => {
        setInner(value);
        localStorage.setItem(key, value);
        // Async cloud sync
        if (uid) {
            const field = STORAGE_TO_FIRESTORE[key];
            if (field) {
                setDoc(doc(db, 'users', uid), {
                    preferences: { [field]: value },
                    updatedAt: serverTimestamp(),
                }, { merge: true }).catch(() => { /* silent */ });
            }
        }
    }, [key, uid]);

    return [state, setState];
}
