import { useState, useEffect, useCallback } from 'react';
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
    type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { STORAGE_KEYS } from '../config';

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

                // Background: sync display name with Firestore (non-blocking)
                const userRef = doc(db, 'users', fbUser.uid);
                getDoc(userRef).then(snap => {
                    if (snap.exists()) {
                        const cloudName = snap.data().displayName || tempName;
                        localStorage.setItem(STORAGE_KEYS.displayName, cloudName);
                        setUser(prev => prev ? { ...prev, displayName: cloudName } : null);
                    } else {
                        // First time — create user doc
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
                        }).catch(err => console.warn('Failed to create user doc:', err));
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
        if (!isSignInWithEmailLink(auth, window.location.href)) return;
        const email = localStorage.getItem(STORAGE_KEYS.emailForSignin);
        if (!email) return;
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
                .catch(err => console.warn('Email link linking failed:', err));
        } else {
            signInWithEmailLink(auth, email, window.location.href)
                .then(() => {
                    localStorage.removeItem(STORAGE_KEYS.emailForSignin);
                    window.history.replaceState(null, '', window.location.pathname);
                })
                .catch(err => console.warn('Email link sign-in failed:', err));
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
                const displayName = result.user.displayName || user?.displayName || randomName();
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
            }
        }
    }, [user]);

    /** Send email magic link for sign-in / account linking */
    const sendEmailLink = useCallback(async (email: string) => {
        const actionCodeSettings = {
            url: window.location.origin,
            handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        localStorage.setItem(STORAGE_KEYS.emailForSignin, email);
    }, []);

    return { user, loading, setDisplayName, linkGoogle, sendEmailLink };
}
