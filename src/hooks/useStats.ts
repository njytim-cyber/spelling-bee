import { useState, useCallback, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { STORAGE_KEYS, FIRESTORE } from '../config';
import { todayStr, yesterdayStr } from '../utils/dateHelpers';
import { SPELLING_CATEGORIES } from '../domains/spelling/spellingCategories';

interface TypeStat {
    solved: number;
    correct: number;
}

export interface Stats {
    lastDailyDate: string;      // YYYY-MM-DD of the last daily session
    todayDailySolved: number;   // problems answered in today's daily session
    todayDailyCorrect: number;  // correct in today's daily session
    totalXP: number;
    totalSolved: number;
    totalCorrect: number;
    bestStreak: number;
    sessionsPlayed: number;
    dayStreak: number;
    streakShields: number;
    lastPlayedDate: string; // YYYY-MM-DD
    byType: Record<string, TypeStat>;
    // Hard mode tracking
    hardModeSolved: number;
    hardModeCorrect: number;
    hardModeBestStreak: number;
    hardModeSessions: number;
    hardModePerfects: number;
    // Timed mode tracking
    timedModeSolved: number;
    timedModeCorrect: number;
    timedModeBestStreak: number;
    timedModeSessions: number;
    timedModePerfects: number;
    // Ultimate mode (hard + timed) tracking
    ultimateSolved: number;
    ultimateCorrect: number;
    ultimateBestStreak: number;
    ultimateSessions: number;
    ultimatePerfects: number;

    // Bee simulation tracking
    beeSessions: number;
    beeBestRound: number;     // furthest round reached in any bee session
    beeWordsCorrect: number;  // total words spelled correctly across all bees
    beeBestLevel: string;     // highest bee level played (classroom/district/state/national)
    beeWins: number;          // times player won (last one standing)

    // Streak freeze — purchased with XP, consumed before shields on 1-day gap
    streakFreezes: number;

    // Cosmetics for Leaderboard broadcast
    activeThemeId?: string;
    activeCostume?: string;
    activeTrailId?: string;
    activeBadgeId?: string; // Achievement badge shown on leaderboard
}

const STORAGE_KEY = STORAGE_KEYS.stats;

const EMPTY_TYPE: TypeStat = { solved: 0, correct: 0 };

/** Build byType from the authoritative SPELLING_CATEGORIES list — no per-key hardcoding */
function buildEmptyByType(): Record<string, TypeStat> {
    const out: Record<string, TypeStat> = {};
    for (const qt of SPELLING_CATEGORIES) {
        out[qt.id] = { ...EMPTY_TYPE };
    }
    // Add meta types not in the picker list
    for (const id of ['challenge', 'ghost']) {
        out[id] = { ...EMPTY_TYPE };
    }
    return out;
}

const EMPTY_STATS: Stats = {
    lastDailyDate: '',
    todayDailySolved: 0,
    todayDailyCorrect: 0,
    totalXP: 0,
    totalSolved: 0,
    totalCorrect: 0,
    bestStreak: 0,
    sessionsPlayed: 0,
    dayStreak: 0,
    streakShields: 0,
    lastPlayedDate: '',
    byType: buildEmptyByType(),
    hardModeSolved: 0,
    hardModeCorrect: 0,
    hardModeBestStreak: 0,
    hardModeSessions: 0,
    hardModePerfects: 0,
    timedModeSolved: 0,
    timedModeCorrect: 0,
    timedModeBestStreak: 0,
    timedModeSessions: 0,
    timedModePerfects: 0,
    ultimateSolved: 0,
    ultimateCorrect: 0,
    ultimateBestStreak: 0,
    ultimateSessions: 0,
    ultimatePerfects: 0,
    beeSessions: 0,
    beeBestRound: 0,
    beeWordsCorrect: 0,
    beeBestLevel: '',
    beeWins: 0,
    streakFreezes: 0,
};

/** Load from localStorage (fast, synchronous) */
function loadStatsLocal(): Stats {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return EMPTY_STATS;
        const parsed = JSON.parse(raw);
        return {
            ...EMPTY_STATS,
            ...parsed,
            byType: { ...EMPTY_STATS.byType, ...parsed.byType },
        };
    } catch {
        return EMPTY_STATS;
    }
}

/** Save to localStorage (fast, synchronous) */
function saveStatsLocal(s: Stats) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/** Save to Firestore (async, background — includes leaderboard fields at top level) */
async function saveStatsCloud(uid: string, s: Stats) {
    try {
        const accuracy = s.totalSolved > 0 ? Math.round((s.totalCorrect / s.totalSolved) * 100) : 0;
        const version = Date.now();
        await setDoc(doc(db, FIRESTORE.USERS, uid), {
            // Top-level leaderboard-queryable fields
            totalXP: s.totalXP,
            bestStreak: Math.max(s.bestStreak || 0, s.hardModeBestStreak || 0, s.timedModeBestStreak || 0, s.ultimateBestStreak || 0),
            totalSolved: s.totalSolved,
            accuracy,
            activeThemeId: s.activeThemeId || 'classic',
            activeCostume: s.activeCostume || '',
            activeTrailId: s.activeTrailId || '',
            activeBadgeId: s.activeBadgeId || '',
            streakShields: s.streakShields || 0,
            // Full stats blob — strip undefined values (Firestore rejects them)
            stats: JSON.parse(JSON.stringify(s)),
            _statsVersion: version, // Version field to prevent stale overwrites
            updatedAt: serverTimestamp(),
        }, { merge: true });
        // Save version to localStorage for comparison on next load
        localStorage.setItem('stats-version', String(version));
    } catch (err) {
        console.warn('Failed to sync stats to cloud:', err);
    }
}

/** Load from Firestore (async fallback) */
async function loadStatsCloud(uid: string): Promise<Stats | null> {
    try {
        const snap = await getDoc(doc(db, FIRESTORE.USERS, uid));
        if (snap.exists() && snap.data().stats) {
            const data = snap.data();
            const cloud = data.stats;

            // Check version to prevent overwriting newer local data with stale cloud data
            const localVersion = localStorage.getItem('stats-version');
            const cloudVersion = data._statsVersion;

            if (localVersion && cloudVersion && parseInt(localVersion) > cloudVersion) {
                // Local is newer, skip cloud merge
                console.log('Local stats are newer than cloud, skipping merge');
                return null;
            }

            // Update local version if cloud is newer
            if (cloudVersion) {
                localStorage.setItem('stats-version', String(cloudVersion));
            }

            return {
                ...EMPTY_STATS,
                ...cloud,
                byType: { ...EMPTY_STATS.byType, ...cloud.byType },
            };
        }
    } catch (err) {
        console.warn('Failed to load stats from cloud:', err);
    }
    return null;
}

/** Merge stats from local + cloud — take the best of each field */
function mergeStats(local: Stats, cloud: Stats): Stats {
    // Build set of valid categories from SPELLING_CATEGORIES
    const validCategories = new Set<string>(SPELLING_CATEGORIES.map(c => c.id));
    // Add meta types not in the picker list
    validCategories.add('challenge');
    validCategories.add('ghost');

    // Merge byType per-key (take max of each), filtering out deleted categories
    const mergedByType = { ...EMPTY_STATS.byType };
    const allKeys = new Set([
        ...Object.keys(local.byType),
        ...Object.keys(cloud.byType)
    ]);

    for (const key of allKeys) {
        // Skip categories that have been removed from the app
        if (!validCategories.has(key)) continue;

        const l = local.byType[key] || EMPTY_TYPE;
        const c = cloud.byType[key] || EMPTY_TYPE;
        mergedByType[key] = {
            solved: Math.max(l.solved, c.solved),
            correct: Math.max(l.correct, c.correct),
        };
    }

    return {
        ...EMPTY_STATS,
        lastDailyDate: local.lastDailyDate > cloud.lastDailyDate ? local.lastDailyDate : cloud.lastDailyDate,
        todayDailySolved: local.lastDailyDate > cloud.lastDailyDate ? local.todayDailySolved : cloud.todayDailySolved,
        todayDailyCorrect: local.lastDailyDate > cloud.lastDailyDate ? local.todayDailyCorrect : cloud.todayDailyCorrect,
        totalXP: Math.max(local.totalXP, cloud.totalXP),
        totalSolved: Math.max(local.totalSolved, cloud.totalSolved),
        totalCorrect: Math.max(local.totalCorrect, cloud.totalCorrect),
        bestStreak: Math.max(local.bestStreak, cloud.bestStreak),
        sessionsPlayed: Math.max(local.sessionsPlayed, cloud.sessionsPlayed),
        dayStreak: Math.max(local.dayStreak, cloud.dayStreak),
        streakShields: Math.max(local.streakShields, cloud.streakShields),
        lastPlayedDate: local.lastPlayedDate > cloud.lastPlayedDate ? local.lastPlayedDate : cloud.lastPlayedDate,
        byType: mergedByType,
        hardModeSolved: Math.max(local.hardModeSolved, cloud.hardModeSolved),
        hardModeCorrect: Math.max(local.hardModeCorrect, cloud.hardModeCorrect),
        hardModeBestStreak: Math.max(local.hardModeBestStreak, cloud.hardModeBestStreak),
        hardModeSessions: Math.max(local.hardModeSessions, cloud.hardModeSessions),
        hardModePerfects: Math.max(local.hardModePerfects, cloud.hardModePerfects),
        timedModeSolved: Math.max(local.timedModeSolved, cloud.timedModeSolved),
        timedModeCorrect: Math.max(local.timedModeCorrect, cloud.timedModeCorrect),
        timedModeBestStreak: Math.max(local.timedModeBestStreak, cloud.timedModeBestStreak),
        timedModeSessions: Math.max(local.timedModeSessions, cloud.timedModeSessions),
        timedModePerfects: Math.max(local.timedModePerfects, cloud.timedModePerfects),
        ultimateSolved: Math.max(local.ultimateSolved, cloud.ultimateSolved),
        ultimateCorrect: Math.max(local.ultimateCorrect, cloud.ultimateCorrect),
        ultimateBestStreak: Math.max(local.ultimateBestStreak, cloud.ultimateBestStreak),
        ultimateSessions: Math.max(local.ultimateSessions, cloud.ultimateSessions),
        ultimatePerfects: Math.max(local.ultimatePerfects, cloud.ultimatePerfects),
        beeSessions: Math.max(local.beeSessions, cloud.beeSessions),
        beeBestRound: Math.max(local.beeBestRound, cloud.beeBestRound),
        beeWordsCorrect: Math.max(local.beeWordsCorrect, cloud.beeWordsCorrect),
        beeBestLevel: (local.beeBestLevel || '') >= (cloud.beeBestLevel || '') ? local.beeBestLevel : cloud.beeBestLevel,
        beeWins: Math.max(local.beeWins, cloud.beeWins),
        streakFreezes: Math.max(local.streakFreezes || 0, cloud.streakFreezes || 0),
        // Preserve cosmetics from whichever side has them
        activeThemeId: local.activeThemeId || cloud.activeThemeId,
        activeCostume: local.activeCostume || cloud.activeCostume,
        activeTrailId: local.activeTrailId || cloud.activeTrailId,
        activeBadgeId: local.activeBadgeId || cloud.activeBadgeId,
    };
}

export function useStats(uid: string | null) {
    const [stats, setStats] = useState<Stats>(loadStatsLocal);
    const uidRef = useRef(uid);
    const statsRef = useRef(stats);

    useEffect(() => {
        uidRef.current = uid;
    }, [uid]);

    useEffect(() => {
        statsRef.current = stats;
    }, [stats]);

    // Phase 2: On mount, try to restore from Firestore if localStorage is stale
    useEffect(() => {
        if (!uid) return;
        loadStatsCloud(uid).then(cloud => {
            if (!cloud) return;
            setStats(prev => {
                const merged = mergeStats(prev, cloud);
                saveStatsLocal(merged); // update local cache
                return merged;
            });
        });
    }, [uid]);

    // Save to localStorage on every change + debounced Firestore sync
    const cloudTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => {
        saveStatsLocal(stats);
        if (uidRef.current) {
            // Debounce Firestore writes to reduce costs during rapid gameplay
            clearTimeout(cloudTimerRef.current);
            cloudTimerRef.current = setTimeout(() => {
                if (uidRef.current) saveStatsCloud(uidRef.current, stats);
            }, 2000);
        }
        return () => clearTimeout(cloudTimerRef.current);
    }, [stats]);

    // Flush pending cloud write immediately on unmount to prevent data loss
    useEffect(() => {
        return () => {
            if (uidRef.current && cloudTimerRef.current) {
                clearTimeout(cloudTimerRef.current);
                // Fire immediately instead of waiting for debounce
                saveStatsCloud(uidRef.current, statsRef.current).catch(console.error);
            }
        };
    }, []);

    const updateCosmetics = useCallback((themeId: string, costumeId: string, trailId: string) => {
        setStats(prev => ({
            ...prev,
            activeThemeId: themeId,
            activeCostume: costumeId,
            activeTrailId: trailId,
        }));
    }, []);

    const recordSession = useCallback((
        score: number, correct: number, answered: number,
        bestStreak: number, questionType: string, hardMode = false, timedMode = false
    ) => {
        setStats(prev => {
            const prevType = prev.byType[questionType] || { ...EMPTY_TYPE };
            const todayDate = todayStr();
            let dayStreak = prev.dayStreak;
            let streakShields = prev.streakShields || 0;

            let streakFreezes = prev.streakFreezes || 0;

            if (prev.lastPlayedDate !== todayDate) {
                const yesterdayDate = yesterdayStr();

                if (prev.lastPlayedDate === yesterdayDate) {
                    dayStreak = prev.dayStreak + 1;
                    if (dayStreak % 7 === 0) {
                        streakShields = Math.min(3, streakShields + 1);
                    }
                } else if (prev.lastPlayedDate !== '') {
                    // Missed one or more days (and not very first session ever)
                    // Calculate exact gap in days
                    const lastParts = prev.lastPlayedDate.split('-').map(Number);
                    const lastDate = new Date(lastParts[0], lastParts[1] - 1, lastParts[2]);
                    const gap = Math.round((Date.now() - lastDate.getTime()) / 86400000) - 1;

                    if (gap <= 1 && streakFreezes > 0) {
                        // Consume freeze first (purchased protection)
                        streakFreezes -= 1;
                        dayStreak = prev.dayStreak + 1;
                        if (dayStreak % 7 === 0) {
                            streakShields = Math.min(3, streakShields + 1);
                        }
                    } else if (gap <= 1 && streakShields > 0) {
                        streakShields -= 1;
                        dayStreak = prev.dayStreak + 1; // Shield consumed! Forgive and extend.
                        if (dayStreak % 7 === 0) {
                            streakShields = Math.min(3, streakShields + 1);
                        }
                    } else {
                        dayStreak = 1; // Streak broken (gap too large or no protection)
                    }
                } else {
                    dayStreak = 1; // First session ever
                }
            }
            // Track today's daily progress (reset each new day)
            const isDaily = questionType === 'daily';
            const dailySameDay = prev.lastDailyDate === todayDate;
            const todayDailySolved = isDaily ? (dailySameDay ? prev.todayDailySolved : 0) + answered : prev.todayDailySolved;
            const todayDailyCorrect = isDaily ? (dailySameDay ? prev.todayDailyCorrect : 0) + correct : prev.todayDailyCorrect;
            const lastDailyDate = isDaily ? todayDate : prev.lastDailyDate;

            const isPerfect = answered > 0 && correct === answered;
            const isUltimate = hardMode && timedMode;
            return {
                ...prev,
                lastDailyDate,
                todayDailySolved,
                todayDailyCorrect,
                totalXP: prev.totalXP + score,
                totalSolved: prev.totalSolved + answered,
                totalCorrect: prev.totalCorrect + correct,
                bestStreak: Math.max(prev.bestStreak, bestStreak),
                sessionsPlayed: prev.sessionsPlayed + 1,
                dayStreak,
                streakShields,
                streakFreezes,
                lastPlayedDate: todayDate,
                byType: {
                    ...prev.byType,
                    [questionType]: {
                        solved: prevType.solved + answered,
                        correct: prevType.correct + correct,
                    },
                },
                hardModeSolved: prev.hardModeSolved + (hardMode ? answered : 0),
                hardModeCorrect: prev.hardModeCorrect + (hardMode ? correct : 0),
                hardModeBestStreak: hardMode ? Math.max(prev.hardModeBestStreak, bestStreak) : prev.hardModeBestStreak,
                hardModeSessions: prev.hardModeSessions + (hardMode ? 1 : 0),
                hardModePerfects: prev.hardModePerfects + (hardMode && isPerfect ? 1 : 0),
                timedModeSolved: prev.timedModeSolved + (timedMode ? answered : 0),
                timedModeCorrect: prev.timedModeCorrect + (timedMode ? correct : 0),
                timedModeBestStreak: timedMode ? Math.max(prev.timedModeBestStreak, bestStreak) : prev.timedModeBestStreak,
                timedModeSessions: prev.timedModeSessions + (timedMode ? 1 : 0),
                timedModePerfects: prev.timedModePerfects + (timedMode && isPerfect ? 1 : 0),
                ultimateSolved: prev.ultimateSolved + (isUltimate ? answered : 0),
                ultimateCorrect: prev.ultimateCorrect + (isUltimate ? correct : 0),
                ultimateBestStreak: isUltimate ? Math.max(prev.ultimateBestStreak, bestStreak) : prev.ultimateBestStreak,
                ultimateSessions: prev.ultimateSessions + (isUltimate ? 1 : 0),
                ultimatePerfects: prev.ultimatePerfects + (isUltimate && isPerfect ? 1 : 0),
            };
        });
    }, []);

    const resetStats = useCallback(() => {
        setStats(EMPTY_STATS);
    }, []);

    const updateBadge = useCallback((badgeId: string) => {
        setStats(prev => ({ ...prev, activeBadgeId: badgeId }));
    }, []);

    const recordBeeResult = useCallback((round: number, wordsCorrect: number, won: boolean, beeLevel: string, xp: number) => {
        setStats(prev => ({
            ...prev,
            totalXP: prev.totalXP + xp,
            beeSessions: prev.beeSessions + 1,
            beeBestRound: Math.max(prev.beeBestRound, round),
            beeWordsCorrect: prev.beeWordsCorrect + wordsCorrect,
            beeBestLevel: beeLevel >= (prev.beeBestLevel || '') ? beeLevel : prev.beeBestLevel,
            beeWins: prev.beeWins + (won ? 1 : 0),
        }));
    }, []);

    const consumeShield = useCallback(() => {
        setStats(prev => ({
            ...prev,
            streakShields: Math.max(0, prev.streakShields - 1),
        }));
    }, []);

    /** Purchase a streak freeze for 500 XP. Returns false if insufficient XP. */
    const purchaseStreakFreeze = useCallback((): boolean => {
        let success = false;
        setStats(prev => {
            if (prev.totalXP < 500) return prev;
            success = true;
            return {
                ...prev,
                totalXP: prev.totalXP - 500,
                streakFreezes: (prev.streakFreezes || 0) + 1,
            };
        });
        return success;
    }, []);

    const accuracy = stats.totalSolved > 0
        ? Math.round((stats.totalCorrect / stats.totalSolved) * 100)
        : 0;

    return { stats, accuracy, recordSession, recordBeeResult, resetStats, updateCosmetics, updateBadge, consumeShield, purchaseStreakFreeze };
}
