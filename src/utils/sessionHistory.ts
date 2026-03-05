/**
 * utils/sessionHistory.ts
 *
 * Persists per-session records for historical analytics.
 * Stored in localStorage only (not synced to Firestore).
 * Retains last 90 days, auto-prunes older entries.
 */
import { STORAGE_KEYS } from '../config';

export interface SessionRecord {
    date: string;       // YYYY-MM-DD
    ts: number;         // timestamp (ms) for ordering within a day
    score: number;      // XP earned
    correct: number;
    answered: number;
    bestStreak: number;
    category: string;   // questionType
    timedMode: boolean;
    timedVariant?: string; // 'normal' | 'speed' | 'endurance'
}

const MAX_AGE_DAYS = 90;
const KEY = STORAGE_KEYS.sessionHistory;

function load(): SessionRecord[] {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function save(records: SessionRecord[]) {
    localStorage.setItem(KEY, JSON.stringify(records));
}

function prune(records: SessionRecord[]): SessionRecord[] {
    const cutoff = Date.now() - MAX_AGE_DAYS * 86400000;
    return records.filter(r => r.ts > cutoff);
}

export function recordSessionHistory(
    score: number, correct: number, answered: number,
    bestStreak: number, category: string,
    timedMode: boolean,
    timedVariant?: string,
) {
    if (answered === 0) return;
    const now = Date.now();
    const date = new Date(now).toISOString().slice(0, 10);
    const record: SessionRecord = {
        date, ts: now, score, correct, answered, bestStreak, category, timedMode,
        ...(timedVariant && timedVariant !== 'normal' ? { timedVariant } : {}),
    };
    const records = prune(load());
    records.push(record);
    save(records);
}

export function getSessionHistory(): SessionRecord[] {
    return prune(load());
}

/** Aggregate sessions by category for heatmap */
export function getSessionsByCategory(): Array<{
    category: string;
    sessions: number;
    correct: number;
    answered: number;
    accuracy: number;
    xp: number;
}> {
    const records = getSessionHistory();
    const byCat = new Map<string, { sessions: number; correct: number; answered: number; xp: number }>();

    for (const r of records) {
        const existing = byCat.get(r.category) ?? { sessions: 0, correct: 0, answered: 0, xp: 0 };
        existing.sessions += 1;
        existing.correct += r.correct;
        existing.answered += r.answered;
        existing.xp += r.score;
        byCat.set(r.category, existing);
    }

    return Array.from(byCat.entries())
        .map(([category, data]) => ({
            category,
            ...data,
            accuracy: data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0,
        }))
        .sort((a, b) => b.sessions - a.sessions);
}

/** Personal records computed from session history */
export function getPersonalRecords(allTimeBestStreak: number): {
    bestAccuracyByCategory: Array<{ category: string; accuracy: number }>;
    longestStreak: number;
    fastestSession: { xpPerMin: number; category: string } | null;
    mostImproved: { category: string; earlyAccuracy: number; recentAccuracy: number } | null;
} {
    const records = getSessionHistory();
    // Best accuracy per category (min 5 answered)
    const catBest = new Map<string, number>();
    for (const r of records) {
        if (r.answered >= 5) {
            const acc = Math.round((r.correct / r.answered) * 100);
            catBest.set(r.category, Math.max(catBest.get(r.category) ?? 0, acc));
        }
    }
    const bestAccuracyByCategory = Array.from(catBest.entries())
        .map(([category, accuracy]) => ({ category, accuracy }))
        .sort((a, b) => b.accuracy - a.accuracy)
        .slice(0, 5);

    // Fastest session (best XP per minute — estimate 30s per question)
    let fastestSession: { xpPerMin: number; category: string } | null = null;
    for (const r of records) {
        if (r.answered >= 5 && r.score > 0) {
            const estMins = (r.answered * 30) / 60; // ~30s per question
            const xpPerMin = Math.round(r.score / estMins);
            if (!fastestSession || xpPerMin > fastestSession.xpPerMin) {
                fastestSession = { xpPerMin, category: r.category };
            }
        }
    }

    // Most improved category (compare first-half accuracy vs second-half)
    const catSessions = new Map<string, SessionRecord[]>();
    for (const r of records) {
        const arr = catSessions.get(r.category) ?? [];
        arr.push(r);
        catSessions.set(r.category, arr);
    }
    let mostImproved: { category: string; earlyAccuracy: number; recentAccuracy: number } | null = null;
    let bestDelta = 0;
    for (const [cat, sessions] of catSessions) {
        if (sessions.length < 4) continue;
        sessions.sort((a, b) => a.ts - b.ts);
        const mid = Math.floor(sessions.length / 2);
        const early = sessions.slice(0, mid);
        const recent = sessions.slice(mid);
        const earlyAcc = early.reduce((s, r) => s + r.correct, 0) / early.reduce((s, r) => s + r.answered, 0);
        const recentAcc = recent.reduce((s, r) => s + r.correct, 0) / recent.reduce((s, r) => s + r.answered, 0);
        const delta = recentAcc - earlyAcc;
        if (delta > bestDelta) {
            bestDelta = delta;
            mostImproved = {
                category: cat,
                earlyAccuracy: Math.round(earlyAcc * 100),
                recentAccuracy: Math.round(recentAcc * 100),
            };
        }
    }

    return { bestAccuracyByCategory, longestStreak: allTimeBestStreak, fastestSession, mostImproved };
}

/** Speed performance stats from timed sessions */
export function getTimedStats(): {
    timedSessions: number;
    untimedSessions: number;
    timedAccuracy: number;
    untimedAccuracy: number;
    byVariant: Array<{ variant: string; sessions: number; accuracy: number }>;
} {
    const records = getSessionHistory();
    let timedCorrect = 0, timedAnswered = 0, timedCount = 0;
    let untimedCorrect = 0, untimedAnswered = 0, untimedCount = 0;
    const variantMap = new Map<string, { correct: number; answered: number; count: number }>();

    for (const r of records) {
        if (r.timedMode) {
            timedCorrect += r.correct;
            timedAnswered += r.answered;
            timedCount++;
            const v = r.timedVariant ?? 'normal';
            const ex = variantMap.get(v) ?? { correct: 0, answered: 0, count: 0 };
            ex.correct += r.correct;
            ex.answered += r.answered;
            ex.count++;
            variantMap.set(v, ex);
        } else {
            untimedCorrect += r.correct;
            untimedAnswered += r.answered;
            untimedCount++;
        }
    }

    return {
        timedSessions: timedCount,
        untimedSessions: untimedCount,
        timedAccuracy: timedAnswered > 0 ? Math.round((timedCorrect / timedAnswered) * 100) : 0,
        untimedAccuracy: untimedAnswered > 0 ? Math.round((untimedCorrect / untimedAnswered) * 100) : 0,
        byVariant: Array.from(variantMap.entries())
            .map(([variant, d]) => ({
                variant,
                sessions: d.count,
                accuracy: d.answered > 0 ? Math.round((d.correct / d.answered) * 100) : 0,
            }))
            .sort((a, b) => b.sessions - a.sessions),
    };
}

/** Aggregate sessions by date for charting */
export function getSessionsByDay(days = 30): Array<{
    date: string;
    sessions: number;
    correct: number;
    answered: number;
    accuracy: number;
    xp: number;
}> {
    const records = getSessionHistory();
    const byDate = new Map<string, { sessions: number; correct: number; answered: number; xp: number }>();

    for (const r of records) {
        const existing = byDate.get(r.date) ?? { sessions: 0, correct: 0, answered: 0, xp: 0 };
        existing.sessions += 1;
        existing.correct += r.correct;
        existing.answered += r.answered;
        existing.xp += r.score;
        byDate.set(r.date, existing);
    }

    // Fill in missing dates with zeros for the last N days
    const result: Array<{ date: string; sessions: number; correct: number; answered: number; accuracy: number; xp: number }> = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const data = byDate.get(dateStr) ?? { sessions: 0, correct: 0, answered: 0, xp: 0 };
        result.push({
            date: dateStr,
            ...data,
            accuracy: data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0,
        });
    }

    return result;
}
