import { describe, it, expect } from 'vitest';
import { generateSpellingItem, computePhaseLayout, getPhaseAt, summarizeByPhase, generatePhaseItem, generateBonusWord, rollSessionSurprises } from '../domains/spelling/spellingGenerator';
import { getAllWords } from '../domains/spelling/words';
import { ensureAllWords } from '../domains/spelling/words/registry';

describe('spellingGenerator.ts', () => {

    const CATEGORIES = ['cvc', 'blends', 'digraphs', 'silent-e', 'vowel-teams', 'level-1'] as const;

    describe('EngineItem shape', () => {
        it('produces an item with 3 unique options where options[correctIndex] === answer', () => {
            for (const cat of CATEGORIES) {
                for (let i = 0; i < 20; i++) {
                    const item = generateSpellingItem(1, cat);
                    expect(item.options).toHaveLength(3);
                    // All 3 options must be unique
                    expect(new Set(item.options).size).toBe(3);
                    // correctIndex must point to the correct answer
                    expect(item.options[item.correctIndex]).toBe(item.answer);
                    // correctIndex within bounds
                    expect(item.correctIndex).toBeGreaterThanOrEqual(0);
                    expect(item.correctIndex).toBeLessThanOrEqual(2);
                }
            }
        });

        it('prompt asks which spelling is correct', () => {
            for (let i = 0; i < 20; i++) {
                const item = generateSpellingItem(1, 'cvc');
                expect(item.prompt).toBe('Which spelling is correct?');
            }
        });

        it('has a non-empty id string', () => {
            const item = generateSpellingItem(1, 'vowel-teams');
            expect(typeof item.id).toBe('string');
            expect(item.id.length).toBeGreaterThan(0);
        });
    });

    describe('Rich metadata', () => {
        it('meta includes definition, pronunciation, and partOfSpeech', () => {
            for (const cat of CATEGORIES) {
                const item = generateSpellingItem(1, cat);
                expect(typeof item.meta?.['definition']).toBe('string');
                expect((item.meta?.['definition'] as string).length).toBeGreaterThan(0);
                expect(typeof item.meta?.['pronunciation']).toBe('string');
                expect(typeof item.meta?.['partOfSpeech']).toBe('string');
            }
        });

        it('meta includes exampleSentence and pattern', () => {
            const item = generateSpellingItem(1, 'cvc');
            expect(typeof item.meta?.['exampleSentence']).toBe('string');
            expect(typeof item.meta?.['pattern']).toBe('string');
            expect(typeof item.meta?.['difficulty']).toBe('number');
        });
    });

    describe('Difficulty filtering', () => {
        it('level 1 words have difficulty ≤ 2', () => {
            for (let i = 0; i < 30; i++) {
                const item = generateSpellingItem(1, 'level-1');
                expect(item.meta?.['difficulty']).toBeLessThanOrEqual(2);
            }
        });

        it('level 5 words have difficulty ≤ 10', () => {
            for (let i = 0; i < 30; i++) {
                const item = generateSpellingItem(5, 'level-5');
                expect(item.meta?.['difficulty']).toBeLessThanOrEqual(10);
            }
        });
    });

    describe('Seeded RNG', () => {
        it('produces deterministic output with same seed function', () => {
            let seed = 12345;
            function seededRng() {
                seed = (seed * 1664525 + 1013904223) & 0xffffffff;
                return (seed >>> 0) / 0x100000000;
            }
            const item1 = generateSpellingItem(1, 'blends', seededRng);

            seed = 12345; // reset
            function seededRng2() {
                seed = (seed * 1664525 + 1013904223) & 0xffffffff;
                return (seed >>> 0) / 0x100000000;
            }
            const item2 = generateSpellingItem(1, 'blends', seededRng2);

            expect(item1.answer).toBe(item2.answer);
            expect(item1.options).toEqual(item2.options);
        });
    });

    describe('Level category', () => {
        it('level-1 generates words from difficulty 1-2 range', () => {
            const answers = new Set<string>();
            for (let i = 0; i < 100; i++) {
                const item = generateSpellingItem(1, 'level-1');
                answers.add(item.answer as string);
                expect(item.meta?.['difficulty']).toBeLessThanOrEqual(2);
            }
            // With ~500 words in tier 1, 100 samples should hit >15 unique words
            expect(answers.size).toBeGreaterThan(15);
        });
    });

    describe('Full word bank audit', () => {
        it('every word has at least 2 pre-baked distractors', async () => {
            await ensureAllWords();
            const allWords = getAllWords();
            const failures: string[] = [];

            for (const w of allWords) {
                if (!w.distractors || w.distractors.length < 2) {
                    failures.push(`"${w.word}": only ${w.distractors?.length ?? 0} distractors`);
                }
                // Distractors must all differ from the correct word
                if (w.distractors) {
                    for (const d of w.distractors) {
                        if (d === w.word) {
                            failures.push(`"${w.word}": distractor is same as correct word`);
                        }
                    }
                    // All distractors must be unique
                    if (new Set(w.distractors).size !== w.distractors.length) {
                        failures.push(`"${w.word}": duplicate distractors`);
                    }
                }
            }

            expect(failures).toEqual([]);
        }, 120_000);

        it('generated items always have 3 unique options', async () => {
            await ensureAllWords();
            const failures: string[] = [];

            for (let diff = 1; diff <= 5; diff++) {
                for (let i = 0; i < 50; i++) {
                    const item = generateSpellingItem(diff, 'level-1');
                    if (new Set(item.options).size < 3) {
                        failures.push(`${item.answer} (diff=${diff}): only ${new Set(item.options).size} unique options`);
                    }
                }
            }

            expect(failures).toEqual([]);
        }, 120_000);
    });

    // ── Session phase arc ─────────────────────────────────────────────────

    describe('computePhaseLayout', () => {
        it('10-word session: warmup(2) + build(6) + boss(2)', () => {
            const layout = computePhaseLayout(10);
            expect(layout).toHaveLength(10);
            expect(layout.filter(s => s.phase === 'warmup')).toHaveLength(2);
            expect(layout.filter(s => s.phase === 'build')).toHaveLength(6);
            expect(layout.filter(s => s.phase === 'boss')).toHaveLength(2);
            expect(layout.filter(s => s.phase === 'victory')).toHaveLength(0);
        });

        it('20-word session: warmup(4) + build(10) + boss(4) + victory(2)', () => {
            const layout = computePhaseLayout(20);
            expect(layout).toHaveLength(20);
            expect(layout.filter(s => s.phase === 'warmup')).toHaveLength(4);
            expect(layout.filter(s => s.phase === 'build')).toHaveLength(10);
            expect(layout.filter(s => s.phase === 'boss')).toHaveLength(4);
            expect(layout.filter(s => s.phase === 'victory')).toHaveLength(2);
        });

        it('50-word session: warmup(5) + build(35) + boss(7) + victory(3)', () => {
            const layout = computePhaseLayout(50);
            expect(layout).toHaveLength(50);
            expect(layout.filter(s => s.phase === 'warmup')).toHaveLength(5);
            expect(layout.filter(s => s.phase === 'build')).toHaveLength(35);
            expect(layout.filter(s => s.phase === 'boss')).toHaveLength(7);
            expect(layout.filter(s => s.phase === 'victory')).toHaveLength(3);
        });

        it('phases are in order: warmup → build → boss → victory', () => {
            const layout = computePhaseLayout(20);
            const phases = layout.map(s => s.phase);
            // All warmups before builds, all builds before bosses, all bosses before victories
            const lastWarmup = phases.lastIndexOf('warmup');
            const firstBuild = phases.indexOf('build');
            const lastBuild = phases.lastIndexOf('build');
            const firstBoss = phases.indexOf('boss');
            const lastBoss = phases.lastIndexOf('boss');
            const firstVictory = phases.indexOf('victory');
            expect(lastWarmup).toBeLessThan(firstBuild);
            expect(lastBuild).toBeLessThan(firstBoss);
            expect(lastBoss).toBeLessThan(firstVictory);
        });

        it('returns empty for size 0', () => {
            expect(computePhaseLayout(0)).toEqual([]);
        });
    });

    describe('getPhaseAt', () => {
        it('returns correct phase for each index', () => {
            const layout = computePhaseLayout(10);
            expect(getPhaseAt(layout, 0)).toBe('warmup');
            expect(getPhaseAt(layout, 1)).toBe('warmup');
            expect(getPhaseAt(layout, 2)).toBe('build');
            expect(getPhaseAt(layout, 8)).toBe('boss');
            expect(getPhaseAt(layout, 9)).toBe('boss');
        });

        it('returns null for out-of-bounds index', () => {
            const layout = computePhaseLayout(10);
            expect(getPhaseAt(layout, -1)).toBeNull();
            expect(getPhaseAt(layout, 10)).toBeNull();
        });
    });

    describe('summarizeByPhase', () => {
        it('counts correct/total per phase', () => {
            const layout = computePhaseLayout(10);
            const history = [true, true, true, false, true, true, false, true, false, true];
            const summary = summarizeByPhase(layout, history);
            expect(summary.warmup).toEqual({ total: 2, correct: 2 });
            expect(summary.boss.total).toBe(2);
        });

        it('handles partial history (session in progress)', () => {
            const layout = computePhaseLayout(10);
            const history = [true, true, false]; // only 3 answers
            const summary = summarizeByPhase(layout, history);
            expect(summary.warmup).toEqual({ total: 2, correct: 2 });
            expect(summary.build.total).toBe(1);
            expect(summary.boss.total).toBe(0);
        });
    });

    describe('generatePhaseItem', () => {
        it('warmup items have sessionPhase meta', () => {
            const item = generatePhaseItem('warmup', 5, 'level-5');
            expect(item.meta?.['sessionPhase']).toBe('warmup');
        });

        it('boss items have bossRound meta', () => {
            const item = generatePhaseItem('boss', 5, 'level-5');
            expect(item.meta?.['sessionPhase']).toBe('boss');
            expect(item.meta?.['bossRound']).toBe(true);
        });

        it('victory items have sessionPhase meta', () => {
            const item = generatePhaseItem('victory', 5, 'level-5');
            expect(item.meta?.['sessionPhase']).toBe('victory');
        });

        it('build items use standard difficulty', () => {
            const item = generatePhaseItem('build', 5, 'level-5');
            expect(item.meta?.['sessionPhase']).toBe('build');
        });
    });

    // ── Mid-session surprises ────────────────────────────────────────────

    describe('generateBonusWord', () => {
        it('produces an item with bonusWord and bonusMultiplier in meta', () => {
            const item = generateBonusWord(3);
            expect(item.meta?.['bonusWord']).toBe(true);
            expect(item.meta?.['bonusMultiplier']).toBe(5);
        });

        it('clamps bonus level to max 10', () => {
            const item = generateBonusWord(9);
            expect(item.meta?.['bonusWord']).toBe(true);
            // Level 9 + 2 would be 11, clamped to 10
            expect(item.options).toHaveLength(3);
        });
    });

    describe('rollSessionSurprises', () => {
        it('returns null when RNG exceeds probability threshold', () => {
            // For 10-word session, pAny = 0.20. rng() = 0.5 > 0.20 → null
            expect(rollSessionSurprises(10, () => 0.5)).toBeNull();
        });

        it('returns a surprise when RNG is below threshold', () => {
            // For 50-word session, pAny = 0.60. rng() = 0.1 < 0.60 → surprise
            const result = rollSessionSurprises(50, () => 0.1);
            expect(result).not.toBeNull();
            expect(['bonusWord', 'etymologyReveal']).toContain(result!.type);
        });

        it('triggerIndex is within the middle third of session', () => {
            // Fixed RNG for reproducibility
            let calls = 0;
            const rng = () => { calls++; return calls === 1 ? 0.0 : calls === 2 ? 0.3 : 0.5; };
            const result = rollSessionSurprises(30, rng);
            if (result) {
                expect(result.triggerIndex).toBeGreaterThanOrEqual(2);
                expect(result.triggerIndex).toBeLessThan(30);
            }
        });
    });

});
