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
    grade: `${STORAGE_PREFIX}-grade`,
    onboarded: `${STORAGE_PREFIX}-onboarded`,
    ttsVoice: `${STORAGE_PREFIX}-tts-voice`,
    ttsRate: `${STORAGE_PREFIX}-tts-rate`,
    dialect: `${STORAGE_PREFIX}-dialect`,
    ttsEngine: `${STORAGE_PREFIX}-tts-engine`,
    ttsCloudVoice: `${STORAGE_PREFIX}-tts-cloud-voice`,
    customLists: `${STORAGE_PREFIX}-custom-lists`,
} as const;

// ── Firestore collection names ────────────────────────────────────────────────

export const FIRESTORE = {
    USERS: 'users',
    PINGS: 'pings',
    ROOMS: 'rooms',
} as const;

// ── Bottom navigation tabs ────────────────────────────────────────────────────

export const NAV_TABS = [
    { id: 'game' as const, label: "Spell!", ariaLabel: 'Play' },
    { id: 'bee' as const, label: 'Bee', ariaLabel: 'Spelling Bee' },
    { id: 'league' as const, label: 'Leaderboard', ariaLabel: 'Leaderboard' },
    { id: 'me' as const, label: 'Me', ariaLabel: 'Profile' },
] as const;

export type AppTab = typeof NAV_TABS[number]['id'];
