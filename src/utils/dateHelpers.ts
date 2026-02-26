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
