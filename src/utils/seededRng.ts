/**
 * Seeded pseudo-random number generator (mulberry32).
 * Deterministic: same seed → same sequence every time.
 */
export function createSeededRng(seed: number) {
    let state = seed | 0;
    return function next(): number {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** DJB2-style hash for any string */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash;
}

/** Generate a seed from a date string like "2026-02-19" */
export function dateSeed(date: Date = new Date()): number {
    return hashString(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
}

/** Generate a seed from an arbitrary string (e.g., challenge ID) */
export function stringSeed(str: string): number {
    return hashString(str);
}
