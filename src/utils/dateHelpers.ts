/**
 * utils/dateHelpers.ts
 *
 * Shared date formatting for localStorage keys and Firestore queries.
 * Uses non-padded YYYY-M-D format to match existing stored data.
 */

/** Format a Date as "YYYY-M-D" (non-padded, local time). */
export function formatLocalDate(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Today as "YYYY-M-D" string. */
export function todayStr(): string {
    return formatLocalDate(new Date());
}

/** Yesterday as "YYYY-M-D" string. */
export function yesterdayStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatLocalDate(d);
}

/** Today as ISO "YYYY-MM-DD" string (zero-padded). Used for review counters. */
export function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

/** ISO week key for weekly leaderboard (resets each Monday). Format: "YYYY-WNN". */
export function currentWeekKey(): string {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
