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
    hardMode: boolean;
    timedMode: boolean;
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
    hardMode: boolean, timedMode: boolean,
) {
    if (answered === 0) return;
    const now = Date.now();
    const date = new Date(now).toISOString().slice(0, 10);
    const record: SessionRecord = {
        date, ts: now, score, correct, answered, bestStreak, category, hardMode, timedMode,
    };
    const records = prune(load());
    records.push(record);
    save(records);
}

export function getSessionHistory(): SessionRecord[] {
    return prune(load());
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
