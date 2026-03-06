/**
 * utils/profanityFilter.ts
 *
 * Client-side profanity filter for user-generated content (display names).
 * Extracted from the pipeline's three-layer child safety system.
 *
 * Two matching strategies:
 *  1. PROFANE_ROOTS — substring matching (safe from false positives on common words)
 *  2. EXACT_BLOCKLIST — short words that can't use substring matching
 *
 * Also normalizes leet-speak before checking.
 */

/** Substring patterns — any name containing these is blocked.
 *  Curated to avoid false positives on legitimate English words. */
const PROFANE_ROOTS = [
    'fuck', 'shit', 'cunt', 'nigger', 'nigga', 'faggot', 'kike',
    'wetback', 'beaner', 'gook',
    'whore', 'slut', 'bitch',
    'blowjob', 'handjob', 'rimjob', 'footjob', 'titjob',
    'cocksucker', 'motherfuck', 'clusterfuck',
    'gangbang', 'circlejerk',
    'cumshot', 'creampie',
    'masturbat', 'ejaculat',
    'pornograph', 'porn',
    'piss',
];

/** Exact-match words too short for safe substring matching. */
const EXACT_BLOCKLIST = new Set([
    'ass', 'dick', 'cock', 'tit', 'boob', 'dildo', 'anal',
    'rape', 'rapist', 'cum', 'jizz', 'twat', 'wank', 'pedo',
    'nazi', 'fag', 'hoe', 'thot',
]);

/** Normalize common leet-speak substitutions. */
function normalizeLeet(text: string): string {
    return text
        .replace(/0/g, 'o')
        .replace(/1/g, 'i')
        .replace(/3/g, 'e')
        .replace(/4/g, 'a')
        .replace(/5/g, 's')
        .replace(/7/g, 't')
        .replace(/@/g, 'a')
        .replace(/\$/g, 's');
}

/**
 * Check if text contains profanity.
 * Returns true if the text should be blocked.
 */
export function containsProfanity(text: string): boolean {
    const lower = text.toLowerCase().replace(/[\s_\-.!]/g, '');

    // Check both raw and leet-normalized forms
    for (const form of [lower, normalizeLeet(lower)]) {
        // Exact match
        if (EXACT_BLOCKLIST.has(form)) return true;

        // Substring match
        for (const root of PROFANE_ROOTS) {
            if (form.includes(root)) return true;
        }
    }

    return false;
}
