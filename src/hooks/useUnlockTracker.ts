/**
 * hooks/useUnlockTracker.ts
 *
 * Detects new unlocks within a session: rank-ups, chalk themes, swipe trails,
 * mastery levels. Returns derived state that App.tsx uses to show celebrations.
 *
 * Uses lazy-initialized state for the "baseline" snapshot — only detects
 * changes within a session, so returning users aren't bombarded with old unlocks.
 */
import { useState, useMemo, useCallback } from 'react';
import { RANKS, getMasteryInfo, checkUnlock, type Rank } from '../utils/ranks';
import { CHALK_THEMES, type ChalkTheme } from '../utils/chalkThemes';
import { SWIPE_TRAILS, type TrailConfig } from '../utils/trails';
import type { Stats } from './useStats';

interface Snapshot {
    rankIdx: number;
    themeIds: Set<string>;
    trailIds: Set<string>;
    masteryLevel: number;
}

function computeRankIdx(xp: number): number {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (xp >= RANKS[i].xp) return i;
    }
    return 0;
}

function getUnlockedIds<T extends { id: string; minLevel?: number; minStreak?: number; minSolved?: number }>(
    items: readonly T[], rankIdx: number, bestStreak: number, totalSolved: number,
): Set<string> {
    const ids = new Set<string>();
    for (const item of items) {
        if (checkUnlock(rankIdx, bestStreak, totalSolved, item).available) {
            ids.add(item.id);
        }
    }
    return ids;
}

function takeSnapshot(xp: number, bestStreak: number, totalSolved: number): Snapshot {
    const rankIdx = computeRankIdx(xp);
    return {
        rankIdx,
        themeIds: getUnlockedIds(CHALK_THEMES, rankIdx, bestStreak, totalSolved),
        trailIds: getUnlockedIds(SWIPE_TRAILS, rankIdx, bestStreak, totalSolved),
        masteryLevel: getMasteryInfo(xp)?.level ?? 0,
    };
}

export function useUnlockTracker(stats: Stats, bestStreak: number) {
    const effectiveStreak = Math.max(stats.bestStreak, bestStreak);

    // Baseline snapshot: captured once on first render, never updated
    const [baseline] = useState<Snapshot>(
        () => takeSnapshot(stats.totalXP, effectiveStreak, stats.totalSolved),
    );

    // Track what the user has dismissed
    const [clearedRankXp, setClearedRankXp] = useState<number | null>(null);
    const [clearedThemeIds, setClearedThemeIds] = useState<Set<string>>(new Set());
    const [clearedTrailIds, setClearedTrailIds] = useState<Set<string>>(new Set());
    const [clearedMastery, setClearedMastery] = useState<number | null>(null);

    // Compute current unlock state
    const current = useMemo(
        () => takeSnapshot(stats.totalXP, effectiveStreak, stats.totalSolved),
        [stats.totalXP, stats.totalSolved, effectiveStreak],
    );

    // Derive new unlocks: current minus baseline, minus cleared
    const newRank: Rank | null = useMemo(() => {
        if (current.rankIdx > baseline.rankIdx) {
            const rank = RANKS[current.rankIdx];
            if (clearedRankXp !== null && rank.xp <= clearedRankXp) return null;
            return rank;
        }
        return null;
    }, [current.rankIdx, baseline.rankIdx, clearedRankXp]);

    const newThemes: ChalkTheme[] = useMemo(() => {
        const fresh: ChalkTheme[] = [];
        for (const id of current.themeIds) {
            if (!baseline.themeIds.has(id) && !clearedThemeIds.has(id)) {
                const theme = CHALK_THEMES.find(t => t.id === id);
                if (theme) fresh.push(theme);
            }
        }
        return fresh;
    }, [current.themeIds, baseline.themeIds, clearedThemeIds]);

    const newTrails: TrailConfig[] = useMemo(() => {
        const fresh: TrailConfig[] = [];
        for (const id of current.trailIds) {
            if (!baseline.trailIds.has(id) && !clearedTrailIds.has(id)) {
                const trail = SWIPE_TRAILS.find(t => t.id === id);
                if (trail) fresh.push(trail);
            }
        }
        return fresh;
    }, [current.trailIds, baseline.trailIds, clearedTrailIds]);

    const newMastery: number | null = useMemo(() => {
        if (current.masteryLevel > baseline.masteryLevel && baseline.masteryLevel > 0) {
            if (clearedMastery !== null && current.masteryLevel <= clearedMastery) return null;
            return current.masteryLevel;
        }
        return null;
    }, [current.masteryLevel, baseline.masteryLevel, clearedMastery]);

    const clearRank = useCallback(() => {
        setClearedRankXp(RANKS[current.rankIdx]?.xp ?? 0);
    }, [current.rankIdx]);

    const clearThemes = useCallback(() => {
        setClearedThemeIds(prev => {
            const next = new Set(prev);
            for (const id of current.themeIds) {
                if (!baseline.themeIds.has(id)) next.add(id);
            }
            return next;
        });
    }, [current.themeIds, baseline.themeIds]);

    const clearTrails = useCallback(() => {
        setClearedTrailIds(prev => {
            const next = new Set(prev);
            for (const id of current.trailIds) {
                if (!baseline.trailIds.has(id)) next.add(id);
            }
            return next;
        });
    }, [current.trailIds, baseline.trailIds]);

    const clearMastery = useCallback(() => {
        setClearedMastery(current.masteryLevel);
    }, [current.masteryLevel]);

    return { newRank, newThemes, newTrails, newMastery, clearRank, clearThemes, clearTrails, clearMastery };
}
