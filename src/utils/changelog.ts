/**
 * utils/changelog.ts
 *
 * Structured changelog entries shown in the "What's New" modal.
 * Add new entries at the TOP of the array — the modal shows the latest version.
 */
import { STORAGE_KEYS } from '../config';

export interface ChangelogEntry {
    version: string;
    date: string;
    highlights: string[];
}

/** Mark the current version as seen so the modal doesn't auto-show again. */
export function markVersionSeen(): void {
    localStorage.setItem(STORAGE_KEYS.lastSeenVersion, __APP_VERSION__);
}

/** Returns true if the user hasn't seen the current version's changelog. */
export function hasUnseenVersion(): boolean {
    const seen = localStorage.getItem(STORAGE_KEYS.lastSeenVersion);
    return seen !== __APP_VERSION__;
}

export const CHANGELOG: ChangelogEntry[] = [
    {
        version: '1.1.0',
        date: '2026-03-15',
        highlights: [
            'New high-quality voices — 4 Cloud Neural voices with CDN caching',
            'Themed crosswords — 14 themes to choose from',
            'Word game combos, cheers, and wave system',
            'Sound effects — tap, snap, freeze, and streak sounds',
            'Word Search upgrade — 8-direction placement and diagonal drag',
            'Security hardening across the board',
        ],
    },
    {
        version: '1.0.0',
        date: '2026-02-01',
        highlights: [
            'Welcome to Spelling Bee!',
            '10-level spelling curriculum with 50,000+ words',
            '6 word games: Spelling Bee, Word Search, Crosswords, Anagrams, Root Constructor, Typing Defender',
            'Cloud Neural TTS pronunciation',
            'Friends, leaderboards, and 1v1 challenges',
            'UK English dialect support',
        ],
    },
];
