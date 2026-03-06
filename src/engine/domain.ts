/**
 * engine/domain.ts
 *
 * Domain-agnostic types for the game engine.
 * Any educational subject (math, spelling, geography…) implements these interfaces.
 * Subject-specific logic lives in src/domains/<subject>/.
 */

// ── Core data item ───────────────────────────────────────────────────────────

/**
 * A single question / challenge item presented to the player.
 * Replaces the math-specific `Problem` at the engine layer.
 * Subject generators produce `EngineItem`; the rest of the engine never
 * needs to know whether it's a math problem, a spelling word, or a flag.
 */
export interface EngineItem {
    id: string;
    /**
     * Primary display string, e.g. "9 × 8", "acompañar", "🇫🇷"
     * Optional so existing Problem (which uses `expression`) can be cast without error.
     */
    prompt?: string;
    /** Canonical correct answer value — used for equality check only */
    answer: number | string;
    /** Exactly 3 shuffled choices */
    options: (number | string)[];
    /** Optional display labels when options need pretty-printing (e.g. fractions) */
    optionLabels?: string[];
    /** Index into `options[]` that equals `answer` */
    correctIndex: number;
    /** Set by the engine when the item becomes active — do not set in generators */
    startTime?: number;
    /**
     * Optional rich metadata for subject-specific visuals.
     * e.g. math bonds: { visual: 'bond', bondTotal: 10, bondPart: 3 }
     * e.g. KaTeX:       { latex: '\\frac{1}{2} + \\frac{1}{3}' }
     * The game engine is entirely blind to this — only the subject's
     * `renderPrompt` / `renderVisual` renderers use it.
     */
    meta?: Record<string, unknown>;
}

// ── Timed mode variants ──────────────────────────────────────────────────

/** Timed mode difficulty variants. Speed + Endurance are Champion-only. */
export type TimedVariant = 'normal' | 'speed' | 'endurance';

// ── Companion / mascot states ─────────────────────────────────────────────────

export type ChalkState =
    | 'idle'
    | 'success'
    | 'fail'
    | 'streak'
    | 'comeback'
    | 'struggling'
    | 'celebrate';

export type FeedbackFlash = 'none' | 'correct' | 'wrong';

// ── Engine configuration ──────────────────────────────────────────────────────

/**
 * All engine-level knobs in one object.
 * Pass to `useGameLoop` to override defaults.
 * Forks that want different timing / speedrun length just change this.
 */
export interface GameConfig {
    /** Pre-generated problem buffer (infinite mode only) */
    bufferSize: number;
    /** Ms before advancing to next problem after a correct answer */
    autoAdvanceMs: number;
    /** Ms before advancing to next problem after a wrong answer */
    failPauseMs: number;
    /** Ms per question in timed mode (timer expires = auto-wrong) */
    timedModeMs: number;
    /** Streak thresholds → emoji displayed centre screen */
    milestones: Record<number, string>;
    /** Question-type IDs that are "finite sets" (daily, challenge).
     *  The engine will not refill the buffer for these types. */
    finiteTypeIds: string[];
    /** When true, wrong answers require a tap to dismiss (no auto-advance) */
    wrongAnswerTapToDismiss?: boolean;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
    bufferSize: 8,
    autoAdvanceMs: 500,
    failPauseMs: 400,
    timedModeMs: 10_000,
    milestones: { 5: '🔥', 10: '⚡', 20: '👑', 50: '🏆' },
    finiteTypeIds: ['daily', 'challenge', 'review'],
};
