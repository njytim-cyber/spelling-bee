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
    wordHistory: `${STORAGE_PREFIX}-word-history`,
    dailyResults: `${STORAGE_PREFIX}-daily-results`,
    displayName: `${STORAGE_PREFIX}-displayName`,
    emailForSignin: `${STORAGE_PREFIX}-email-for-signin`,
    loginDismiss: `${STORAGE_PREFIX}-login-dismiss`,
    lastRecapWeek: `${STORAGE_PREFIX}-last-recap-week`,
    masteredTricks: `${STORAGE_PREFIX}-mastered-tricks`,
    uid: `${STORAGE_PREFIX}-uid`,
    reducedMotion: `${STORAGE_PREFIX}-reduced-motion`,
    seasonalTheme: `${STORAGE_PREFIX}-seasonal-theme`,
    stickFigureStyle: `${STORAGE_PREFIX}-stick-figure-style`,
    weeklySnapshot: `${STORAGE_PREFIX}-weekly-snapshot`,
    weeklyGoal: `${STORAGE_PREFIX}-weekly-goal`,
    reviewExplained: `${STORAGE_PREFIX}-review-explained`,
    sessionHistory: `${STORAGE_PREFIX}-session-history`,
    referralCode: `${STORAGE_PREFIX}-referral-code`,
    championPassExpiry: `${STORAGE_PREFIX}-champion-pass-expiry`,
    pendingReferral: `${STORAGE_PREFIX}-pending-referral`,
    reviewsToday: `${STORAGE_PREFIX}-reviews-today`,
    trialUsed: `${STORAGE_PREFIX}-trial-used`,
    referralMilestonesClaimed: `${STORAGE_PREFIX}-referral-milestones-claimed`,
    subscriptionStatus: `${STORAGE_PREFIX}-subscription-status`,
    purchasedPacks: `${STORAGE_PREFIX}-purchased-packs`,
} as const;

/**
 * Maps localStorage keys to Firestore `users/{uid}.preferences` field names.
 * Single source of truth for cloud sync field mapping.
 */
export const STORAGE_TO_FIRESTORE: Record<string, string> = {
    [STORAGE_KEYS.costume]: 'costume',
    [STORAGE_KEYS.chalkTheme]: 'chalkTheme',
    [STORAGE_KEYS.theme]: 'themeMode',
    [STORAGE_KEYS.grade]: 'grade',
    [STORAGE_KEYS.trail]: 'trailId',
    [STORAGE_KEYS.dialect]: 'dialect',
    [STORAGE_KEYS.seasonalTheme]: 'seasonalTheme',
    [STORAGE_KEYS.stickFigureStyle]: 'stickFigureStyle',
    [STORAGE_KEYS.customLists]: 'customLists',
    [STORAGE_KEYS.purchasedPacks]: 'purchasedPacks',
};

// ── Firestore collection names ────────────────────────────────────────────────

export const FIRESTORE = {
    USERS: 'users',
    PINGS: 'pings',
    ROOMS: 'rooms',
    REFERRALS: 'referrals',
} as const;

/** Levels at or below this number are free. Levels above require Champion Pass. */
export const FREE_LEVEL_CAP = 3;

/** Free users can review at most this many SRS words per day. Champion Pass = unlimited. */
export const FREE_DAILY_REVIEW_CAP = 30;

/** Free users can create at most this many custom lists. Champion = PREMIUM_CUSTOM_LIST_CAP. */
export const FREE_CUSTOM_LIST_CAP = 10;
export const PREMIUM_CUSTOM_LIST_CAP = 20;

/** Streak day counts that trigger a celebratory share prompt. */
export const STREAK_MILESTONES = [7, 14, 30, 60, 100] as const;

/** Referral milestone rewards: reach N referrals → earn extra Champion Pass days. */
export const REFERRAL_MILESTONES = [
    { count: 3, days: 14, label: '2 weeks' },
    { count: 5, days: 30, label: '1 month' },
    { count: 10, days: 90, label: '3 months' },
] as const;

// ── Bottom navigation tabs ────────────────────────────────────────────────────

export const NAV_TABS = [
    { id: 'game' as const, label: "Freeplay!", ariaLabel: 'Play' },
    { id: 'path' as const, label: 'Path', ariaLabel: 'Study Dashboard' },
    { id: 'league' as const, label: 'Compete', ariaLabel: 'Compete' },
    { id: 'me' as const, label: 'Me', ariaLabel: 'Profile' },
] as const;

export type AppTab = typeof NAV_TABS[number]['id'];
