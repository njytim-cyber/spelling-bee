/**
 * hooks/usePremium.ts
 *
 * Manages Champion Pass premium state.
 * Offline-first: expiry stored in localStorage, synced to Firestore.
 * Premium = championPassExpiry is a future ISO date string.
 */
import { useState, useCallback } from 'react';
import { STORAGE_KEYS, FREE_LEVEL_CAP } from '../config';
import type { Level } from '../domains/spelling/spellingCategories';

type SubStatus = 'none' | 'trial' | 'active' | 'canceled';

function readExpiry(uid: string | null): string {
    if (!uid) return '';
    return localStorage.getItem(`${STORAGE_KEYS.championPassExpiry}-${uid}`) || '';
}

function writeExpiry(uid: string | null, expiry: string) {
    if (!uid) return;
    localStorage.setItem(`${STORAGE_KEYS.championPassExpiry}-${uid}`, expiry);
}

function readSubStatus(): SubStatus {
    return (localStorage.getItem(STORAGE_KEYS.subscriptionStatus) as SubStatus) || 'none';
}

function writeSubStatus(status: SubStatus) {
    localStorage.setItem(STORAGE_KEYS.subscriptionStatus, status);
}

export function usePremium(uid: string | null) {
    const [championPassExpiry, setChampionPassExpiry] = useState(() => readExpiry(uid));
    const [trialUsed, setTrialUsed] = useState(() => localStorage.getItem(STORAGE_KEYS.trialUsed) === '1');
    const [subscriptionStatus, setSubscriptionStatus] = useState<SubStatus>(readSubStatus);

    // eslint-disable-next-line react-hooks/purity -- checking current time is inherent to expiry logic
    const now = Date.now();
    const isPremium = championPassExpiry !== '' && new Date(championPassExpiry).getTime() > now;

    const daysRemaining = (() => {
        if (!championPassExpiry) return 0;
        const diff = new Date(championPassExpiry).getTime() - now;
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    })();

    const activateTrial = useCallback((days: number) => {
        const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        writeExpiry(uid, expiry);
        setChampionPassExpiry(expiry);
        localStorage.setItem(STORAGE_KEYS.trialUsed, '1');
        setTrialUsed(true);
        writeSubStatus('trial');
        setSubscriptionStatus('trial');
        return expiry;
    }, [uid]);

    /** Extend pass (e.g., from referral reward). Takes the later of current expiry or now + days. */
    const extendPass = useCallback((days: number) => {
        const base = championPassExpiry && new Date(championPassExpiry) > new Date()
            ? new Date(championPassExpiry)
            : new Date();
        const expiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
        writeExpiry(uid, expiry);
        setChampionPassExpiry(expiry);
        return expiry;
    }, [uid, championPassExpiry]);

    /** Update expiry from server (e.g., after referral redemption). */
    const setExpiryFromServer = useCallback((expiry: string) => {
        // Take the later of local or server expiry
        const current = readExpiry(uid);
        const best = current && new Date(current) > new Date(expiry) ? current : expiry;
        writeExpiry(uid, best);
        setChampionPassExpiry(best);
    }, [uid]);

    /** Set paid subscription status (called after Stripe checkout or restore). */
    const setPaidSubscription = useCallback((expiry: string, status: 'active' | 'canceled') => {
        writeExpiry(uid, expiry);
        setChampionPassExpiry(expiry);
        writeSubStatus(status);
        setSubscriptionStatus(status);
    }, [uid]);

    /** True if this is a trial (not paid via Stripe). */
    const isTrial = isPremium && subscriptionStatus !== 'active' && subscriptionStatus !== 'canceled' && trialUsed;

    /** True if user has an active Stripe subscription. */
    const isPaidSubscriber = subscriptionStatus === 'active' || subscriptionStatus === 'canceled';

    return {
        isPremium,
        championPassExpiry,
        daysRemaining,
        activateTrial,
        extendPass,
        setExpiryFromServer,
        setPaidSubscription,
        trialUsed,
        isTrial,
        isPaidSubscriber,
        subscriptionStatus,
    };
}

/** Check if a level number requires Champion Pass. */
export function isLevelPremium(level: Level | string): boolean {
    const num = parseInt(String(level).replace('level-', ''), 10);
    return !isNaN(num) && num > FREE_LEVEL_CAP;
}
