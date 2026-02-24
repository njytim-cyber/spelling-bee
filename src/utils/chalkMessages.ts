/**
 * utils/chalkMessages.ts
 *
 * Generic companion message picker.
 * Domain-specific quips are injected via `ChalkMessageOverrides`.
 * The spelling domain's overrides live in src/domains/spelling/spellingMessages.ts.
 */
import type { ChalkState } from '../engine/domain';

// ── Public types ──────────────────────────────────────────────────────────────

/** Context passed to the message picker so the companion can be smart */
export interface ChalkContext {
    state: ChalkState;
    streak: number;
    totalAnswered: number;
    /** The active category/type ID — domain interprets this string */
    categoryId: string;
    hardMode: boolean;
    timedMode: boolean;
}

/**
 * Domain-injectable overrides.
 * Return `null` to fall through to default generic messages.
 */
export interface ChalkMessageOverrides {
    topicSuccess?: (categoryId: string) => string[] | null;
    topicFail?: (categoryId: string) => string[] | null;
    easterEggs?: string[];
}

// ── Generic message pools ─────────────────────────────────────────────────────

const BASE_IDLE = [
    'You got this! 💪', 'Take your time 🌟', 'I believe in you!',
    'Focus mode: ON 🎯', 'Ready when you are!',
    'Let\'s gooo! 🚀', 'Deep breaths… here we go 🧘',
    'Your brain is warming up 🔥', 'Every problem is a win 🏅',
    'You\'re getting sharper! ✏️',
];

const BASE_SUCCESS = [
    'AMAZING! 🎉', 'You\'re a genius! 🧠', 'Nailed it! ✅',
    'Brilliant work! ⭐', 'Unstoppable! 🔥', 'That was fast! ⚡',
    'Big brain energy! 🧠✨', 'Proud of you! 🥹',
    'Beautiful solve! 🎨', 'Smooth! 🧈', 'Chef\'s kiss! 👨‍🍳',
    'Poetry in motion! 📝', 'Textbook perfect! 📖',
];

const BASE_FAIL = [
    'Almost! Try again 💙', 'You\'ll get it! 🌈', 'Mistakes = learning! 📚',
    'Don\'t give up! 💪', 'So close! 🤏', 'Next one is yours! 🎯',
    'That\'s OK! Keep going 🌻', 'Learning moment! 💡',
    'Every mistake makes you stronger 🏋️', 'Shake it off! 🐕',
];

const BASE_STREAK = [
    'ON FIRE! 🔥🔥🔥', 'LEGENDARY! 👑', 'Can\'t be stopped! 🚀',
    'Streeeeak! 🎸', 'Hall of fame material! 🏆',
    'You\'re INCREDIBLE! 💥', 'This is YOUR moment! 🌟',
    'The crowd goes wild! 📣', 'On a roll! 🎳',
];

const STREAK_EARLY = ['Great start! 🌱', 'Here we go! 🎯', 'Warming up! 🌤️', 'Off to a great start! 🏃'];
const STREAK_MID = ['Five strong! ✋', 'You\'re building something! 🧱', 'Momentum! 🎢', 'Look at you go! 👀'];
const STREAK_HIGH = ['DOUBLE DIGITS! 🔟🔥', 'You\'re on fire! 🔥', 'Nothing can stop you! 🛡️', 'This is incredible! 🤩'];
const STREAK_LEGENDARY = ['Are you even human?! 🤖✨', 'Absolute legend! 👑', 'They\'ll write songs about this! 🎵', 'This is a masterclass! 🎓'];

const COMEBACK = [
    'COMEBACK! Never gave up! 💪🔥', 'That\'s what resilience looks like! 🦁',
    'Back in the game! 🎮✨', 'You just powered through! 💥',
    'REDEMPTION ARC! 🌈', 'Fall down 7 times, stand up 8! 🥊',
    'The comeback is always greater! 👑', 'From the ashes! 🔥🔥🔥',
];

const HARD_MODE = ['Brave soul! 💀💪', 'Hard mode hero! 🦸', 'No fear! 🛡️', 'Courage level: MAX! 🏔️'];
const TIMED_MODE = ['Beat the clock! ⏱️', 'Speed demon! 🏎️', 'Time is ticking! ⚡', 'Racing the stopwatch! 🏃‍♂️💨'];

const SESSION_MILESTONES: Record<number, string[]> = {
    10: ['10 problems down! Just getting started! 🎬'],
    25: ['25 already! You\'re in the zone! 🎯'],
    50: ['FIFTY! Half a century of challenges! 🎉'],
    100: ['💯 ONE HUNDRED! You\'re a legend! 👑'],
    200: ['200!! Marathon champion! 🏃‍♂️🏆'],
};

const STREAK_MILESTONES: Record<number, string[]> = {
    3: ['Three in a row! 🎯'],
    5: ['High five! ✋🔥'],
    10: ['TEN!! Double digits! 🔟🎉'],
    15: ['Fifteen! Halfway to greatness! 🌟'],
    20: ['TWENTY! You\'re a legend! 👑'],
    30: ['THIRTY?! This is unreal! 🤯'],
    50: ['FIFTY STREAK?! I\'m speechless! 🏆✨'],
};

function getTimeMessages(): string[] {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return ['Morning session! ☀️', 'Rise and shine! 🌅', 'Brain fuel! 🧇'];
    if (h >= 12 && h < 17) return ['Afternoon vibes! 🌤️', 'Post-lunch power! 🍱✨'];
    if (h >= 17 && h < 22) return ['Evening practice! 🌆', 'Golden hour! 🌅'];
    return ['Night owl vibes! 🦉', 'Burning the midnight oil! 🕯️'];
}

// ── Internal picker helper ────────────────────────────────────────────────────

let lastMessage = '';

function pick(arr: string[]): string {
    const filtered = arr.filter(m => m !== lastMessage);
    const choice = filtered[Math.floor(Math.random() * filtered.length)] || arr[0];
    lastMessage = choice;
    return choice;
}

function chance(pct: number): boolean { return Math.random() * 100 < pct; }

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Context-aware message picker.
 * Pass domain-specific `overrides` to inject subject-flavoured quips.
 */
export function pickChalkMessage(ctx: ChalkContext, overrides?: ChalkMessageOverrides): string {
    const { state, streak, totalAnswered, categoryId, hardMode, timedMode } = ctx;
    const eggs = overrides?.easterEggs ?? [];

    // 1. Easter eggs (2% chance, any state)
    if (eggs.length > 0 && chance(2)) return pick(eggs);

    // 2. Session milestones (exact thresholds, on success only)
    if (state === 'success' && SESSION_MILESTONES[totalAnswered]) {
        return pick(SESSION_MILESTONES[totalAnswered]);
    }

    // 3. Streak milestones (exact thresholds)
    if ((state === 'success' || state === 'streak') && STREAK_MILESTONES[streak]) {
        return pick(STREAK_MILESTONES[streak]);
    }

    // 4. Time-of-day (10% chance on idle)
    if (state === 'idle' && chance(10)) return pick(getTimeMessages());

    // 5. Hard/timed mode acknowledgement (15% chance)
    if (state === 'success' && hardMode && chance(15)) return pick(HARD_MODE);
    if (state === 'success' && timedMode && chance(15)) return pick(TIMED_MODE);

    // 6. Domain topic-specific (25% chance on success/fail)
    if (state === 'success' && chance(25) && overrides?.topicSuccess) {
        const pool = overrides.topicSuccess(categoryId);
        if (pool) return pick(pool);
    }
    if (state === 'fail' && chance(25) && overrides?.topicFail) {
        const pool = overrides.topicFail(categoryId);
        if (pool) return pick(pool);
    }

    // 7. Streak-scaled success messages
    if (state === 'success') {
        if (streak >= 20) return pick(STREAK_LEGENDARY);
        if (streak >= 10) return pick(STREAK_HIGH);
        if (streak >= 5) return pick(STREAK_MID);
        if (streak >= 1) return chance(40) ? pick(STREAK_EARLY) : pick(BASE_SUCCESS);
    }

    // 8. Comeback
    if (state === 'comeback') return pick(COMEBACK);

    // 9. Base pools fallback
    switch (state) {
        case 'idle': return pick(BASE_IDLE);
        case 'success': return pick(BASE_SUCCESS);
        case 'fail': return pick(BASE_FAIL);
        case 'streak': return pick(BASE_STREAK);
        default: return pick(BASE_IDLE);
    }
}
