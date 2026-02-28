/**
 * hooks/useGameLoop.ts
 *
 * Engine-level game loop hook.
 * Domain-specific logic is injected via `generateItem` and `config`.
 * Imports scoring from the engine layer; no direct math imports.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { EngineItem, GameConfig, ChalkState, FeedbackFlash } from '../engine/domain';
import { SWIPE_TO_INDEX, DEFAULT_GAME_CONFIG } from '../engine/domain';
import { scoreCorrect, scorePenalty, FAST_ANSWER_MS } from '../engine/scoring';
import { useDifficulty } from './useDifficulty';

// Re-export engine types so callers that import from useGameLoop still work
export type { ChalkState, FeedbackFlash };

// ── Internal state ────────────────────────────────────────────────────────────

interface GameState {
    score: number;
    streak: number;
    bestStreak: number;
    totalCorrect: number;
    totalAnswered: number;
    answerHistory: boolean[];
    chalkState: ChalkState;
    flash: FeedbackFlash;
    frozen: boolean;
    milestone: string;
    speedBonus: boolean;
    wrongStreak: number;
    shieldBroken: boolean;
}

const INITIAL_STATE: GameState = {
    score: 0, streak: 0, bestStreak: 0,
    totalCorrect: 0, totalAnswered: 0, answerHistory: [],
    chalkState: 'idle', flash: 'none', frozen: false,
    milestone: '', speedBonus: false, wrongStreak: 0,
    shieldBroken: false,
};

// ── Generator function type ───────────────────────────────────────────────────

/**
 * Function the domain provides to generate one item.
 * @param difficulty  0-10 adaptive difficulty level
 * @param categoryId  The active question type/category (e.g. 'cvc')
 * @param hardMode    Whether hard mode is active
 * @param rng         Optional seeded RNG for reproducible daily/challenge sets
 */
export type ItemGenerator = (
    difficulty: number,
    categoryId: string,
    hardMode: boolean,
    rng?: () => number,
) => EngineItem;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGameLoop(
    generateItem: ItemGenerator,
    categoryId: string = 'cvc',
    hardMode = false,
    challengeId: string | null = null,
    timedMode = false,
    streakShields = 0,
    onConsumeShield?: () => void,
    config: GameConfig = DEFAULT_GAME_CONFIG,
    /**
     * Finite-set generator: when provided and categoryId is in
     * `config.finiteTypeIds`, this is called instead of `generateItem`
     * to produce the entire fixed problem list (daily / challenge).
     */
    generateFiniteSet?: (categoryId: string, challengeId: string | null) => EngineItem[],
    /** Optional callback fired after every answer with the item, correctness, and response time. */
    onAnswer?: (item: EngineItem, correct: boolean, responseTimeMs: number) => void,
    /** Minimum adaptive difficulty level (from grade selection). */
    minLevel = 1,
) {
    const { level, recordAnswer } = useDifficulty(minLevel);
    const [items, setItems] = useState<EngineItem[]>([]);
    const [gs, setGs] = useState<GameState>(INITIAL_STATE);

    const { bufferSize, autoAdvanceMs, failPauseMs, milestones, finiteTypeIds, wrongAnswerTapToDismiss } = config;

    const onAnswerRef = useRef(onAnswer);
    onAnswerRef.current = onAnswer;

    const chalkTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const startedRef = useRef(false);
    const prevCategoryId = useRef(categoryId);
    const prevHard = useRef(hardMode);
    const frozenRef = useRef(false);
    const correctCountRef = useRef(0);
    const dailyRef = useRef<{ dateLabel: string } | null>(null);
    const pendingTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
    const MAX_PENDING_TIMERS = 32;

    /** Schedule a timeout that gets auto-cleared on unmount */
    const safeTimeout = useCallback((fn: () => void, ms: number) => {
        if (frozenRef.current) return;

        // Prune completed timers before adding new ones to prevent unbounded growth
        if (pendingTimers.current.size >= MAX_PENDING_TIMERS) {
            console.warn('Max pending timers reached, clearing oldest');
            const oldest = Array.from(pendingTimers.current)[0];
            clearTimeout(oldest);
            pendingTimers.current.delete(oldest);
        }

        const id = setTimeout(() => {
            pendingTimers.current.delete(id);
            fn();
        }, ms);
        pendingTimers.current.add(id);
        return id;
    }, []);

    // ── Timed mode ────────────────────────────────────────────────────────────
    const [timerProgress, setTimerProgress] = useState(0);
    const timerStartRef = useRef<number>(0);
    const timerRafRef = useRef<number>(0);
    const timedModeRef = useRef(timedMode);
    timedModeRef.current = timedMode;

    // ── Helpers ───────────────────────────────────────────────────────────────

    const isFinite = (id: string) => finiteTypeIds.includes(id);

    const buildInitialSet = useCallback((catId: string, hard: boolean): EngineItem[] => {
        if (isFinite(catId) && generateFiniteSet) {
            return generateFiniteSet(catId, challengeId);
        }
        return Array.from({ length: bufferSize }, () => generateItem(level, catId, hard));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level, bufferSize, challengeId, generateItem, generateFiniteSet]);

    // ── Initialize buffer ─────────────────────────────────────────────────────
    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        const initial = buildInitialSet(categoryId, hardMode);
        if (initial[0]) initial[0].startTime = Date.now();
        if (isFinite(categoryId)) {
            dailyRef.current = { dateLabel: '' }; // populated by generateFiniteSet if needed
        }
        setItems(initial);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Regenerate on category / hard mode change ─────────────────────────────
    useEffect(() => {
        if (prevCategoryId.current === categoryId && prevHard.current === hardMode) return;
        const categoryChanged = prevCategoryId.current !== categoryId;
        prevCategoryId.current = categoryId;
        prevHard.current = hardMode;

        const fresh = buildInitialSet(categoryId, hardMode);
        if (fresh[0]) fresh[0].startTime = Date.now();

        setItems(fresh);
        // Only reset score/stats when category changes; hard mode toggle just refreshes questions
        if (categoryChanged) {
            setGs(INITIAL_STATE);
        }
    }, [categoryId, hardMode, buildInitialSet]);

    // ── Keep infinite buffer full ─────────────────────────────────────────────
    useEffect(() => {
        if (isFinite(categoryId)) return;
        if (items.length < bufferSize) {
            setItems(prev => [...prev, generateItem(level, categoryId, hardMode)]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items.length, level, categoryId, hardMode]);

    // ── Advance to next problem ───────────────────────────────────────────────
    const advanceProblem = useCallback(() => {
        setItems(prev => {
            const next = prev.slice(1);
            if (next[0]) next[0].startTime = Date.now();
            return next;
        });
        if (timedModeRef.current) {
            timerStartRef.current = Date.now();
            setTimerProgress(0);
        }
    }, []);

    // ── Reset chalk state after delay ─────────────────────────────────────────
    const scheduleChalkReset = useCallback((durationMs: number) => {
        if (chalkTimerRef.current) clearTimeout(chalkTimerRef.current);
        chalkTimerRef.current = setTimeout(() => {
            setGs(prev => ({ ...prev, chalkState: prev.chalkState === 'streak' ? 'streak' : 'idle' }));
        }, durationMs);
    }, []);

    // ── Handle swipe ──────────────────────────────────────────────────────────
    const handleSwipe = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
        if (frozenRef.current || items.length === 0) return;
        const current = items[0];
        if (!current) return;
        const tts = Date.now() - (current.startTime ?? Date.now());

        // Up = skip
        if (direction === 'up') {
            frozenRef.current = true;
            setGs(prev => ({ ...prev, streak: 0, chalkState: 'idle', frozen: true }));
            safeTimeout(() => {
                setGs(prev => ({ ...prev, frozen: false }));
                frozenRef.current = false;
                advanceProblem();
            }, 100);
            return;
        }

        const selectedValue = current.options[SWIPE_TO_INDEX[direction]];
        const correct = selectedValue === current.answer;

        if (correct) {
            onAnswerRef.current?.(current, true, tts);
            recordAnswer(tts, true);
            const isFast = tts < FAST_ANSWER_MS;
            correctCountRef.current += 1;
            let newStreak = 0;
            let milestoneEmoji = '';

            setGs(prev => {
                newStreak = prev.streak + 1;
                milestoneEmoji = milestones[newStreak] ?? '';
                return {
                    ...prev,
                    streak: newStreak,
                    bestStreak: Math.max(prev.bestStreak, newStreak),
                    totalCorrect: prev.totalCorrect + 1,
                    totalAnswered: prev.totalAnswered + 1,
                    answerHistory: [...prev.answerHistory, true].slice(-50),
                    score: prev.score + scoreCorrect(newStreak, isFast),
                    flash: 'correct',
                    chalkState: newStreak >= 10 ? 'streak' : (prev.wrongStreak >= 3 ? 'comeback' as ChalkState : 'success'),
                    milestone: milestoneEmoji,
                    speedBonus: isFast,
                    wrongStreak: 0,
                    frozen: true,
                };
            });
            frozenRef.current = true;
            scheduleChalkReset(newStreak >= 10 ? 2000 : 800);
            if (milestoneEmoji) safeTimeout(() => setGs(p => ({ ...p, milestone: '' })), 1300);
            if (isFast) safeTimeout(() => setGs(p => ({ ...p, speedBonus: false })), 900);

            safeTimeout(() => {
                setGs(prev => ({ ...prev, flash: 'none', frozen: false }));
                frozenRef.current = false;
                advanceProblem();
            }, autoAdvanceMs);
        } else {
            onAnswerRef.current?.(current, false, tts);
            setGs(prev => {
                const isTutorial = prev.totalAnswered === 0;
                if (isTutorial) {
                    frozenRef.current = true;
                    scheduleChalkReset(failPauseMs);
                    safeTimeout(() => {
                        setGs(p => ({ ...p, flash: 'none', frozen: false }));
                        frozenRef.current = false;
                    }, failPauseMs);
                    return { ...prev, flash: 'wrong' as const, chalkState: 'fail' as ChalkState, frozen: true };
                }

                recordAnswer(tts, false);

                if (streakShields > 0 && prev.streak > 0 && onConsumeShield) {
                    onConsumeShield();
                    frozenRef.current = true;
                    scheduleChalkReset(failPauseMs);
                    if (!wrongAnswerTapToDismiss) {
                        safeTimeout(() => {
                            setGs(p => ({ ...p, flash: 'none', frozen: false, shieldBroken: false }));
                            frozenRef.current = false;
                            advanceProblem();
                        }, failPauseMs);
                    }
                    return {
                        ...prev,
                        totalAnswered: prev.totalAnswered + 1,
                        answerHistory: [...prev.answerHistory, false].slice(-50),
                        flash: 'wrong' as const,
                        chalkState: 'fail' as ChalkState,
                        frozen: true,
                        shieldBroken: true,
                    };
                }

                // Normal wrong answer
                frozenRef.current = true;
                scheduleChalkReset(failPauseMs);
                if (!wrongAnswerTapToDismiss) {
                    safeTimeout(() => {
                        setGs(p => ({ ...p, flash: 'none', frozen: false }));
                        frozenRef.current = false;
                        advanceProblem();
                    }, failPauseMs);
                }

                const wrongStreak = prev.wrongStreak + 1;
                return {
                    ...prev,
                    streak: 0,
                    totalAnswered: prev.totalAnswered + 1,
                    answerHistory: [...prev.answerHistory, false].slice(-50),
                    score: scorePenalty(prev.score),
                    flash: 'wrong' as const,
                    chalkState: (wrongStreak >= 3 ? 'struggling' : 'fail') as ChalkState,
                    milestone: '',
                    wrongStreak,
                    frozen: true,
                };
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, recordAnswer, scheduleChalkReset, advanceProblem, safeTimeout, categoryId, streakShields, onConsumeShield, hardMode, level, milestones, autoAdvanceMs, failPauseMs, wrongAnswerTapToDismiss, generateItem]);

    // ── Timed mode tick + auto-skip ───────────────────────────────────────────
    useEffect(() => {
        if (!timedMode || gs.frozen || items.length === 0) {
            cancelAnimationFrame(timerRafRef.current);
            if (!timedMode) setTimerProgress(0);
            return;
        }
        timerStartRef.current = Date.now();
        setTimerProgress(0);

        const tick = () => {
            const elapsed = Date.now() - timerStartRef.current;
            const p = Math.min(elapsed / config.timedModeMs, 1);
            setTimerProgress(p);
            if (p >= 1) {
                cancelAnimationFrame(timerRafRef.current);
                frozenRef.current = true;
                setGs(prev => {
                    const wrongStreak = prev.wrongStreak + 1;
                    return {
                        ...prev,
                        streak: 0,
                        totalAnswered: prev.totalAnswered + 1,
                        answerHistory: [...prev.answerHistory, false].slice(-50),
                        score: scorePenalty(prev.score),
                        flash: 'wrong' as const,
                        chalkState: (wrongStreak >= 3 ? 'struggling' : 'fail') as ChalkState,
                        milestone: '',
                        wrongStreak,
                        frozen: true,
                    };
                });
                scheduleChalkReset(failPauseMs);
                safeTimeout(() => {
                    setGs(prev => ({ ...prev, flash: 'none', frozen: false }));
                    advanceProblem();
                }, failPauseMs);
                return;
            }
            timerRafRef.current = requestAnimationFrame(tick);
        };
        timerRafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(timerRafRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timedMode, items[0]?.id, gs.frozen]);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    useEffect(() => {
        const timers = pendingTimers.current;
        return () => {
            if (chalkTimerRef.current) clearTimeout(chalkTimerRef.current);
            timers.forEach(t => clearTimeout(t));
            timers.clear();
        };
    }, []);

    /** Manually dismiss a wrong-answer freeze (tap-to-dismiss mode) */
    const dismissWrongAnswer = useCallback(() => {
        if (!frozenRef.current) return;
        setGs(prev => ({ ...prev, flash: 'none', frozen: false, shieldBroken: false }));
        frozenRef.current = false;
        advanceProblem();
    }, [advanceProblem]);

    const dailyComplete =
        (isFinite(categoryId)) &&
        gs.totalAnswered > 0 &&
        items.length === 0;

    return {
        problems: items,  // alias kept for backward compat with ProblemView/App expectations
        ...gs,
        level,
        handleSwipe,
        dismissWrongAnswer,
        timerProgress,
        dailyComplete,
        dailyDateLabel: dailyRef.current?.dateLabel ?? '',
    };
}
