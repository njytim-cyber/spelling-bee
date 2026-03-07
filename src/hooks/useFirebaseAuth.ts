import { useState, useEffect, useCallback, useRef } from 'react';
import {
    onAuthStateChanged,
    signInAnonymously,
    GoogleAuthProvider,
    signInWithPopup,
    linkWithPopup,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    linkWithCredential,
    EmailAuthProvider,
    deleteUser,
    type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { STORAGE_KEYS } from '../config';
import { showErrorToast } from '../utils/errorToast';
import { containsProfanity } from '../utils/profanityFilter';
import { setAnalyticsUserId, setAnalyticsUserProperties, trackEvent } from '../utils/analytics';

/** Random display name generator */
const ADJECTIVES = ['Swift', 'Clever', 'Bold', 'Quick', 'Bright', 'Sharp', 'Keen', 'Cool', 'Lucky', 'Epic'];
const NOUNS = ['Tiger', 'Eagle', 'Wizard', 'Ninja', 'Panda', 'Fox', 'Falcon', 'Lion', 'Wolf', 'Otter'];
function randomName(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
}

export interface FirebaseUser {
    uid: string;
    displayName: string;
    isAnonymous: boolean;
}

export function useFirebaseAuth() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const authLockRef = useRef(false);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (fbUser: User | null) => {
            if (fbUser) {
                // Auth succeeded — set user immediately with a temporary name
                // Don't block on Firestore read
                const tempName = localStorage.getItem(STORAGE_KEYS.displayName) || randomName();
                setUser({
                    uid: fbUser.uid,
                    displayName: tempName,
                    isAnonymous: fbUser.isAnonymous,
                });
                setLoading(false);

                // Analytics: identify user for retention tracking
                setAnalyticsUserId(fbUser.uid);
                setAnalyticsUserProperties({
                    account_type: fbUser.isAnonymous ? 'anonymous' : 'signed_in',
                });
                trackEvent('app_open');

                // Background: sync display name with Firestore (non-blocking)
                const userRef = doc(db, 'users', fbUser.uid);
                getDoc(userRef).then(snap => {
                    if (snap.exists()) {
                        const cloudName = snap.data().displayName || tempName;
                        localStorage.setItem(STORAGE_KEYS.displayName, cloudName);
                        setUser(prev => prev ? { ...prev, displayName: cloudName } : null);
                    } else {
                        // First time — create user doc with merge:true (idempotent)
                        const name = tempName;
                        localStorage.setItem(STORAGE_KEYS.displayName, name);
                        setDoc(userRef, {
                            displayName: name,
                            totalXP: 0,
                            bestStreak: 0,
                            totalSolved: 0,
                            accuracy: 0,
                            isAnonymous: fbUser.isAnonymous,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                        }, { merge: true }).catch(err => console.warn('Failed to create user doc:', err));
                    }
                }).catch(err => {
                    console.warn('Failed to fetch user doc:', err);
                    // Still functional — we have auth, just no cloud name sync
                });
            } else {
                // No user — sign in anonymously
                signInAnonymously(auth).catch(err => {
                    console.error('Anonymous auth failed:', err);
                    // Allow app to load even if auth fails
                    setLoading(false);
                });
            }
        });
        return unsub;
    }, []);

    // ── Email link sign-in completion (runs once on page load) ──
    useEffect(() => {
        if (authLockRef.current) return; // Skip if auth operation in progress
        if (!isSignInWithEmailLink(auth, window.location.href)) return;
        const email = localStorage.getItem(STORAGE_KEYS.emailForSignin);
        if (!email) return;
        authLockRef.current = true;

        const currentUser = auth.currentUser;
        if (currentUser?.isAnonymous) {
            const credential = EmailAuthProvider.credentialWithLink(email, window.location.href);
            linkWithCredential(currentUser, credential)
                .then(() => {
                    localStorage.removeItem(STORAGE_KEYS.emailForSignin);
                    setUser(prev => prev ? { ...prev, isAnonymous: false } : null);
                    setDoc(doc(db, 'users', currentUser.uid), { isAnonymous: false, updatedAt: serverTimestamp() }, { merge: true }).catch(() => { });
                    // Clean the URL
                    window.history.replaceState(null, '', window.location.pathname);
                })
                .catch(err => console.warn('Email link linking failed:', err))
                .finally(() => { authLockRef.current = false; });
        } else {
            signInWithEmailLink(auth, email, window.location.href)
                .then(() => {
                    localStorage.removeItem(STORAGE_KEYS.emailForSignin);
                    window.history.replaceState(null, '', window.location.pathname);
                })
                .catch(err => console.warn('Email link sign-in failed:', err))
                .finally(() => { authLockRef.current = false; });
        }
    }, []);

    /** Update display name in Firestore */
    const setDisplayName = useCallback(async (name: string) => {
        if (!user) return;
        // Sanitize: strip HTML, limit charset to printable, enforce max length
        const sanitized = name
            .replace(/<[^>]*>/g, '')           // Strip any HTML tags
            .replace(/[^\w\s\-_.!]/g, '')      // Allow only word chars, spaces, hyphens, dots, underscores, bangs
            .trim()
            .slice(0, 20);
        if (!sanitized) return;
        if (containsProfanity(sanitized)) {
            console.warn('Display name rejected: contains profanity');
            return;
        }
        localStorage.setItem(STORAGE_KEYS.displayName, sanitized);
        setUser(prev => prev ? { ...prev, displayName: sanitized } : null);
        try {
            await setDoc(doc(db, 'users', user.uid), { displayName: sanitized, updatedAt: serverTimestamp() }, { merge: true });
        } catch (err) {
            console.warn('Failed to update display name:', err);
        }
    }, [user]);

    /** Link anonymous account to Google for cross-device sync (Phase 3) */
    const linkGoogle = useCallback(async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const provider = new GoogleAuthProvider();
        try {
            if (currentUser.isAnonymous) {
                // Link anonymous account to Google
                const result = await linkWithPopup(currentUser, provider);
                const rawName = result.user.displayName || user?.displayName || randomName();
                // Sanitize Google display name the same way as manual entry
                const sanitizedGoogle = rawName.replace(/<[^>]*>/g, '').replace(/[^\w\s\-_.!]/g, '').trim().slice(0, 20) || randomName();
                const displayName = containsProfanity(sanitizedGoogle) ? randomName() : sanitizedGoogle;
                localStorage.setItem(STORAGE_KEYS.displayName, displayName);
                setUser(prev => prev ? { ...prev, displayName, isAnonymous: false } : null);
                await setDoc(doc(db, 'users', currentUser.uid), {
                    displayName,
                    isAnonymous: false,
                    updatedAt: serverTimestamp(),
                }, { merge: true });
            } else {
                // Already linked — just sign in
                await signInWithPopup(auth, provider);
            }
        } catch (err: unknown) {
            const error = err as { code?: string };
            if (error.code === 'auth/credential-already-in-use') {
                // Google account already linked to a different anonymous account
                await signInWithPopup(auth, provider);
            } else {
                console.error('Google link failed:', err);
                showErrorToast('Google sign-in failed');
            }
        }
    }, [user]);

    /** Send email magic link for sign-in / account linking */
    const sendEmailLink = useCallback(async (email: string) => {
        const actionCodeSettings = {
            url: window.location.origin,
            handleCodeInApp: true,
        };
        try {
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            localStorage.setItem(STORAGE_KEYS.emailForSignin, email);
        } catch (err) {
            console.warn('Failed to send email link:', err);
            throw err; // Re-throw so callers can show error UI
        }
    }, []);

    /** Permanently delete account and all associated cloud data */
    const deleteAccount = useCallback(async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Not signed in');

        const uid = currentUser.uid;

        try {
            // 1. Delete user profile document
            await deleteDoc(doc(db, 'users', uid));

            // 2. Delete pings targeted at this user
            const pingsQ = query(collection(db, 'pings'), where('targetUid', '==', uid));
            const pingsSnap = await getDocs(pingsQ);
            if (!pingsSnap.empty) {
                const batch = writeBatch(db);
                pingsSnap.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
            }

            // 3. Clear all local storage keys with our prefix
            const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('spell-bee'));
            keysToRemove.forEach(k => localStorage.removeItem(k));

            // 4. Delete Firebase Auth account
            await deleteUser(currentUser);

            // State will reset via onAuthStateChanged → new anonymous sign-in
        } catch (err) {
            console.warn('Account deletion failed:', err);
            throw err;
        }
    }, []);

    return { user, loading, setDisplayName, linkGoogle, sendEmailLink, deleteAccount };
}
