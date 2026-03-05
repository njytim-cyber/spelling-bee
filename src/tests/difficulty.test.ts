/**
 * Tests for the difficulty adaptation algorithm used in useDifficulty.
 *
 * Since the hook is a thin React wrapper (useState + useRef), we test the
 * core algorithm directly via a plain-JS simulation — no DOM needed.
 */
import { describe, it, expect } from 'vitest';

// ── Algorithm constants (mirror useDifficulty.ts) ────────────────────────────

const MAX_LEVEL = 10;
const FAST_THRESHOLD_MS = 1500;
const SLOW_THRESHOLD_MS = 4000;
const FAST_STREAK_TO_LEVEL_UP = 3;
const SLOW_STREAK_TO_LEVEL_DOWN = 2;

// ── Pure simulation of the hook logic ────────────────────────────────────────

function createDifficulty(minLevel = 1) {
    let level = minLevel;
    let fastCount = 0;
    let slowCount = 0;

    function recordAnswer(ttsMs: number, correct: boolean) {
        if (!correct) {
            fastCount = 0;
            slowCount = 0;
            return;
        }
        if (ttsMs < FAST_THRESHOLD_MS) {
            slowCount = 0;
            fastCount += 1;
            if (fastCount >= FAST_STREAK_TO_LEVEL_UP) {
                level = Math.min(level + 1, MAX_LEVEL);
                fastCount = 0;
            }
        } else if (ttsMs > SLOW_THRESHOLD_MS) {
            fastCount = 0;
            slowCount += 1;
            if (slowCount >= SLOW_STREAK_TO_LEVEL_DOWN) {
                level = Math.max(level - 1, minLevel);
                slowCount = 0;
            }
        } else {
            fastCount = 0;
            slowCount = 0;
        }
    }

    return { get level() { return level; }, recordAnswer };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useDifficulty algorithm', () => {
    it('starts at minLevel', () => {
        expect(createDifficulty(3).level).toBe(3);
    });

    it('defaults to level 1', () => {
        expect(createDifficulty().level).toBe(1);
    });

    it('levels up after 3 consecutive fast correct answers', () => {
        const d = createDifficulty(1);
        d.recordAnswer(1000, true);
        d.recordAnswer(1000, true);
        d.recordAnswer(1000, true);
        expect(d.level).toBe(2);
    });

    it('levels down after 2 consecutive slow correct answers', () => {
        const d = createDifficulty(1);
        // Level up first
        d.recordAnswer(1000, true);
        d.recordAnswer(1000, true);
        d.recordAnswer(1000, true); // → level 2
        expect(d.level).toBe(2);
        d.recordAnswer(5000, true);
        d.recordAnswer(5000, true); // → level down
        expect(d.level).toBe(1);
    });

    it('does not go below minLevel', () => {
        const d = createDifficulty(3);
        d.recordAnswer(5000, true);
        d.recordAnswer(5000, true);
        expect(d.level).toBe(3);
    });

    it('does not go above level 10', () => {
        const d = createDifficulty(9);
        d.recordAnswer(1000, true);
        d.recordAnswer(1000, true);
        d.recordAnswer(1000, true); // → 10
        expect(d.level).toBe(10);
        d.recordAnswer(1000, true);
        d.recordAnswer(1000, true);
        d.recordAnswer(1000, true); // still 10
        expect(d.level).toBe(10);
    });

    it('wrong answer resets fast streak', () => {
        const d = createDifficulty(1);
        d.recordAnswer(1000, true); // fast (1)
        d.recordAnswer(1000, true); // fast (2)
        d.recordAnswer(1000, false); // wrong → reset
        d.recordAnswer(1000, true); // fast (1 again)
        d.recordAnswer(1000, true); // fast (2)
        expect(d.level).toBe(1); // no level up
    });

    it('wrong answer resets slow streak', () => {
        const d = createDifficulty(1);
        // Level up first
        d.recordAnswer(1000, true);
        d.recordAnswer(1000, true);
        d.recordAnswer(1000, true); // → 2
        d.recordAnswer(5000, true); // slow (1)
        d.recordAnswer(5000, false); // wrong → reset
        d.recordAnswer(5000, true); // slow (1 again)
        expect(d.level).toBe(2); // no level down
    });

    it('"flow zone" answers (1.5s-4s) reset both streaks', () => {
        const d = createDifficulty(1);
        d.recordAnswer(1000, true); // fast (1)
        d.recordAnswer(1000, true); // fast (2)
        d.recordAnswer(2500, true); // flow zone → reset
        d.recordAnswer(1000, true); // fast (1 again)
        d.recordAnswer(1000, true); // fast (2)
        expect(d.level).toBe(1); // no level up
    });

    it('level boundary: 1499ms is fast', () => {
        const d = createDifficulty(1);
        d.recordAnswer(1499, true);
        d.recordAnswer(1499, true);
        d.recordAnswer(1499, true);
        expect(d.level).toBe(2);
    });

    it('level boundary: 1500ms is NOT fast (flow zone)', () => {
        const d = createDifficulty(1);
        d.recordAnswer(1500, true);
        d.recordAnswer(1500, true);
        d.recordAnswer(1500, true);
        expect(d.level).toBe(1); // no level up — 1500 is in flow zone
    });

    it('level boundary: 4001ms is slow', () => {
        const d = createDifficulty(1);
        d.recordAnswer(1000, true);
        d.recordAnswer(1000, true);
        d.recordAnswer(1000, true); // → 2
        d.recordAnswer(4001, true);
        d.recordAnswer(4001, true);
        expect(d.level).toBe(1);
    });

    it('level boundary: 4000ms is NOT slow (flow zone)', () => {
        const d = createDifficulty(1);
        d.recordAnswer(1000, true);
        d.recordAnswer(1000, true);
        d.recordAnswer(1000, true); // → 2
        d.recordAnswer(4000, true);
        d.recordAnswer(4000, true);
        expect(d.level).toBe(2); // no level down — 4000 is flow zone
    });
});
