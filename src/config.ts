/**
 * config.ts
 *
 * App-level identity and configuration.
 * This is the ONLY file a fork needs to edit to rebrand the app.
 *
 * All localStorage keys, Firestore collection names, and navigation labels
 * are derived from this single source of truth.
 */

// ── App identity ──────────────────────────────────────────────────────────────

export const APP_ID = 'spell-bee';

/**
 * Prefix for all localStorage keys.
 * All localStorage keys use this prefix.
 */
export const STORAGE_PREFIX = 'spell-bee';

// ── localStorage keys ─────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
    stats: `${STORAGE_PREFIX}-stats`,
    achievements: `${STORAGE_PREFIX}-achievements`,
    costume: `${STORAGE_PREFIX}-costume`,
    trail: `${STORAGE_PREFIX}-trail`,
    chalkTheme: `${STORAGE_PREFIX}-chalk-theme`,
    theme: `${STORAGE_PREFIX}-theme`,
    ageBand: `${STORAGE_PREFIX}-age-band`,
} as const;

// ── Firestore collection names ────────────────────────────────────────────────

export const FIRESTORE = {
    USERS: 'users',
    PINGS: 'pings',
} as const;

// ── Bottom navigation tabs ────────────────────────────────────────────────────

export const NAV_TABS = [
    { id: 'game' as const, label: "Spell!", ariaLabel: 'Play' },
    { id: 'league' as const, label: 'League', ariaLabel: 'Leaderboard' },
    { id: 'magic' as const, label: 'Word Lab', ariaLabel: 'Lessons' },
    { id: 'me' as const, label: 'Me', ariaLabel: 'Profile' },
] as const;

export type AppTab = typeof NAV_TABS[number]['id'];
