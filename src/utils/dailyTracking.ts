/**
 * utils/dailyTracking.ts
 *
 * Tracks daily challenge completion and streaks.
 * Stored in localStorage (last 30 days).
 */

import { STORAGE_KEYS } from '../config';

const STORAGE_KEY = STORAGE_KEYS.dailyResults;

export interface DailyResult {
    date: string;     // YYYY-MM-DD
    score: number;
    correct: number;
    total: number;
    timeMs: number;
}

function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

function loadResults(): DailyResult[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveResults(results: DailyResult[]): void {
    // Keep last 30 entries
    const trimmed = results.slice(-30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/** Check if today's daily challenge has been completed. */
export function isDailyComplete(date?: string): boolean {
    const d = date ?? todayStr();
    return loadResults().some(r => r.date === d);
}

/** Save a daily result. */
export function saveDailyResult(result: Omit<DailyResult, 'date'>): void {
    const results = loadResults();
    results.push({ ...result, date: todayStr() });
    saveResults(results);
}

/** Get today's result (if completed). */
export function getTodayResult(): DailyResult | null {
    const today = todayStr();
    return loadResults().find(r => r.date === today) ?? null;
}

/** Get the current daily streak (consecutive days). */
export function getDailyStreak(): number {
    const results = loadResults();
    if (results.length === 0) return 0;

    const dateSet = new Set(results.map(r => r.date));
    let streak = 0;
    const d = new Date();

    // Count backwards from today
    for (let i = 0; i < 365; i++) {
        const ds = d.toISOString().slice(0, 10);
        if (dateSet.has(ds)) {
            streak++;
            d.setDate(d.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

/** Get the date label for today (e.g., "Feb 24"). */
export function getTodayLabel(): string {
    return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
