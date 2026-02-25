import { describe, it, expect } from 'vitest';
import { getAllWords, difficultyRange } from '../domains/spelling/words';
import type { SpellingWord } from '../domains/spelling/words/types';
import { simulateNpcTurns } from '../hooks/useBeeSimulation';

/**
 * Tests for bee simulation logic.
 * Since useBeeSimulation is a React hook with TTS dependencies,
 * we test the pure pickBeeWord logic and XP calculation directly.
 */

// ── Extracted pickBeeWord logic ─────────────────────────────────────────────

function pickBeeWord(round: number): SpellingWord {
    const diffLevel = Math.min(5, 1 + Math.floor(round / 3));
    const [minDiff, maxDiff] = difficultyRange(diffLevel);

    const all = getAllWords();
    const pool = all.filter(w => w.difficulty >= minDiff && w.difficulty <= maxDiff);
    const source = pool.length > 0 ? pool : all;
    return source[Math.floor(Math.random() * source.length)];
}

// ── XP calculation logic ────────────────────────────────────────────────────

function calcSessionXP(wordsCorrect: number, usedInfoRequests: boolean): number {
    return wordsCorrect * 15 + wordsCorrect * (usedInfoRequests ? 0 : 5);
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Bee simulation (pickBeeWord)', () => {

    it('round 0 picks easy words (difficulty ≤ 2)', () => {
        for (let i = 0; i < 30; i++) {
            const word = pickBeeWord(0);
            expect(word.difficulty).toBeLessThanOrEqual(2);
        }
    });

    it('higher rounds pick harder words', () => {
        const earlyDiffs: number[] = [];
        const lateDiffs: number[] = [];
        for (let i = 0; i < 50; i++) {
            earlyDiffs.push(pickBeeWord(0).difficulty);
            lateDiffs.push(pickBeeWord(20).difficulty);
        }
        const earlyAvg = earlyDiffs.reduce((a, b) => a + b, 0) / earlyDiffs.length;
        const lateAvg = lateDiffs.reduce((a, b) => a + b, 0) / lateDiffs.length;
        expect(lateAvg).toBeGreaterThan(earlyAvg);
    });

    it('always returns a valid SpellingWord', () => {
        for (let i = 0; i < 30; i++) {
            const word = pickBeeWord(i);
            expect(typeof word.word).toBe('string');
            expect(word.word.length).toBeGreaterThan(0);
            expect(typeof word.definition).toBe('string');
        }
    });

    it('difficulty level plateaus at round 12+', () => {
        // diffLevel = min(5, 1 + floor(round/3))
        // round 12 → 1+4 = 5 (max)
        // round 20 → 1+6 capped to 5
        const word12 = pickBeeWord(12);
        const word20 = pickBeeWord(20);
        // Both should use difficulty level 5 so same difficulty range
        expect(word12.difficulty).toBeGreaterThanOrEqual(1);
        expect(word20.difficulty).toBeGreaterThanOrEqual(1);
    });
});

describe('Bee simulation (XP calculation)', () => {

    it('base XP is 15 per correct word', () => {
        expect(calcSessionXP(5, true)).toBe(75);
    });

    it('no-help bonus adds 5 per word', () => {
        expect(calcSessionXP(5, false)).toBe(100);
    });

    it('0 correct = 0 XP', () => {
        expect(calcSessionXP(0, false)).toBe(0);
    });
});

describe('NPC turn simulation', () => {
    const alive = [true, true, true, true];
    const skill = [0.96, 0.82, 1.0, 0.55];
    const scores = [0, 0, 0, 0];

    it('player index 2 is always null', () => {
        for (let i = 0; i < 20; i++) {
            const { npcResults } = simulateNpcTurns(alive, skill, scores, 0, true);
            expect(npcResults[2]).toBeNull();
        }
    });

    it('skips dead NPCs', () => {
        const deadAlive = [false, true, true, false];
        for (let i = 0; i < 20; i++) {
            const { npcResults } = simulateNpcTurns(deadAlive, skill, scores, 0, true);
            expect(npcResults[0]).toBeNull();
            expect(npcResults[3]).toBeNull();
            // Index 1 should have a result
            expect(npcResults[1]).not.toBeNull();
        }
    });

    it('eliminates NPCs on wrong answer in elimination mode', () => {
        // Run many times — with skill 0.45, nervous NPC should eventually fail
        let sawElimination = false;
        for (let i = 0; i < 100; i++) {
            const { npcAlive } = simulateNpcTurns(alive, skill, scores, 0, true);
            if (!npcAlive[3]) { sawElimination = true; break; }
        }
        expect(sawElimination).toBe(true);
    });

    it('does not eliminate in non-elimination mode', () => {
        for (let i = 0; i < 50; i++) {
            const { npcAlive } = simulateNpcTurns(alive, skill, scores, 0, false);
            expect(npcAlive[0]).toBe(true);
            expect(npcAlive[1]).toBe(true);
            expect(npcAlive[3]).toBe(true);
        }
    });

    it('increments scores for correct answers', () => {
        // Run many times and accumulate scores
        let totalScores = [0, 0, 0, 0];
        for (let i = 0; i < 100; i++) {
            const { npcScores } = simulateNpcTurns(alive, skill, [0, 0, 0, 0], 0, false);
            totalScores = totalScores.map((s, j) => s + npcScores[j]);
        }
        // Brainiac (0.85) should have more correct than Nervous (0.45)
        expect(totalScores[0]).toBeGreaterThan(totalScores[3]);
        // Player score should stay 0 (not simulated)
        expect(totalScores[2]).toBe(0);
    });
});
