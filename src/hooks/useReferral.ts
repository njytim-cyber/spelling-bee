/**
 * hooks/useReferral.ts
 *
 * Manages referral codes: generation, deep link detection, redemption via Cloud Function.
 * Each user gets a unique SPELL-XXXX code. Sharing it grants both parties 7-day Champion Pass.
 */
import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../config';
import { trackEvent, trackLatency } from '../utils/analytics';

/** Characters used for referral code generation (uppercase alphanumeric, no confusing chars) */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function generateCode(): string {
    let code = '';
    const arr = crypto.getRandomValues(new Uint8Array(4));
    for (let i = 0; i < 4; i++) {
        code += CODE_CHARS[arr[i] % CODE_CHARS.length];
    }
    return `SPELL-${code}`;
}

function readCode(uid: string | null): string {
    if (!uid) return '';
    return localStorage.getItem(`${STORAGE_KEYS.referralCode}-${uid}`) || '';
}

function writeCode(uid: string | null, code: string) {
    if (!uid) return;
    localStorage.setItem(`${STORAGE_KEYS.referralCode}-${uid}`, code);
}

/** Read pending referral from URL or storage (not yet redeemed). */
function readPendingReferral(): string {
    // Check URL first
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
        // Clean URL
        params.delete('ref');
        const remaining = params.toString();
        const newUrl = remaining
            ? `${window.location.pathname}?${remaining}`
            : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        // Validate format: must be SPELL-XXXX (4 alphanumeric chars)
        const upper = ref.toUpperCase();
        if (!/^SPELL-[A-Z0-9]{4}$/.test(upper)) return '';
        // Store it so it survives auth flow
        localStorage.setItem(STORAGE_KEYS.pendingReferral, upper);
        return upper;
    }
    // Check localStorage
    return localStorage.getItem(STORAGE_KEYS.pendingReferral) || '';
}

export interface ReferralState {
    referralCode: string;
    referralCount: number;
    pendingReferral: string;
    referralRedeemed: boolean;
    /** The referral code that was just redeemed (for auto-friend-add). Empty if none. */
    redeemedCode: string;
    referralError: string;
    redeemReferral: () => Promise<void>;
    getReferralUrl: () => string;
    shareReferral: () => Promise<void>;
}

export function useReferral(uid: string | null): ReferralState {
    const [referralCode, setReferralCode] = useState(() => readCode(uid));
    const [referralCount, setReferralCount] = useState(0);
    const [pendingReferral, setPendingReferral] = useState(() => readPendingReferral());
    const [referralRedeemed, setReferralRedeemed] = useState(false);
    const [redeemedCode, setRedeemedCode] = useState('');
    const [referralError, setReferralError] = useState('');

    // Generate code on first mount if user doesn't have one
    useEffect(() => {
        if (!uid) return;
        let code = readCode(uid);
        if (!code) {
            code = generateCode();
            writeCode(uid, code);
        }
        setReferralCode(code);
    }, [uid]);

    // Sync referral code + count from Firestore when available
    useEffect(() => {
        if (!uid) return;
        let cancelled = false;

        (async () => {
            try {
                const { db } = await import('../utils/firebase');
                const { doc, getDoc, setDoc } = await import('firebase/firestore');
                const userRef = doc(db, 'users', uid);
                const snap = await getDoc(userRef);
                if (cancelled) return;

                if (snap.exists()) {
                    const data = snap.data();
                    // If server has a code, prefer it (canonical)
                    if (data.referralCode) {
                        writeCode(uid, data.referralCode);
                        setReferralCode(data.referralCode);
                    } else if (referralCode) {
                        // Push local code to server
                        await setDoc(userRef, { referralCode }, { merge: true });
                    }
                    setReferralCount(data.referralCount || 0);
                }
            } catch {
                // Offline or not yet authenticated — local code is fine
            }
        })();

        return () => { cancelled = true; };
    }, [uid, referralCode]);

    const redeemReferral = useCallback(async () => {
        if (!uid || !pendingReferral) return;

        // Don't redeem own code
        if (pendingReferral === referralCode) {
            setReferralError("Can't use your own referral code");
            localStorage.removeItem(STORAGE_KEYS.pendingReferral);
            setPendingReferral('');
            return;
        }

        setReferralError('');
        try {
            const { app } = await import('../utils/firebase');
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const functions = getFunctions(app, 'us-central1');
            const redeem = httpsCallable<
                { referralCode: string },
                { success: boolean; expiresAt: string; error?: string }
            >(functions, 'redeemReferral');

            const result = await trackLatency('referral', 'redeem', () => redeem({ referralCode: pendingReferral }));

            if (result.data.success) {
                setReferralRedeemed(true);
                setRedeemedCode(pendingReferral);
                // Clear pending
                localStorage.removeItem(STORAGE_KEYS.pendingReferral);
                setPendingReferral('');
            } else {
                setReferralError(result.data.error || 'Referral failed');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Referral failed';
            setReferralError(message);
        }
    }, [uid, pendingReferral, referralCode]);

    const getReferralUrl = useCallback(() => {
        return `${window.location.origin}?ref=${referralCode}`;
    }, [referralCode]);

    const shareReferral = useCallback(async () => {
        const url = getReferralUrl();
        const text = `Join me on Spelling Bee! Use my code ${referralCode} and we both get a free week of Champion Pass.\n\n${url}`;

        try {
            if (navigator.share) {
                await navigator.share({ text });
            } else {
                await navigator.clipboard.writeText(text);
            }
            trackEvent('referral_shared');
        } catch {
            // User cancelled — silent fail
        }
    }, [referralCode, getReferralUrl]);

    return {
        referralCode,
        referralCount,
        pendingReferral,
        referralRedeemed,
        redeemedCode,
        referralError,
        redeemReferral,
        getReferralUrl,
        shareReferral,
    };
}
