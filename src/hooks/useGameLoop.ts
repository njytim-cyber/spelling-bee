/**
 * hooks/useGameLoop.ts
 *
 * Engine-level game loop hook.
 * Domain-specific logic is injected via `generateItem` and `config`.
 * Imports scoring from the engine layer; no direct math imports.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { EngineItem, GameConfig, ChalkState, FeedbackFlash, TimedVariant } from '../engine/domain';
import { DEFAULT_GAME_CONFIG } from '../engine/domain';
import { scoreCorrect, scorePenalty, FAST_ANSWER_MS } from '../engine/scoring';
import { useDifficulty } from './useDifficulty';
import { synthesizeCloud } from '../services/cloudTts';
import { STORAGE_KEYS } from '../config';

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
    /** Whether the forgiving-streak free miss has been used in the current streak */
    streakForgiven: boolean;
}

const INITIAL_STATE: GameState = {
    score: 0, streak: 0, bestStreak: 0,
    totalCorrect: 0, totalAnswered: 0, answerHistory: [],
    chalkState: 'idle', flash: 'none', frozen: false,
    milestone: '', speedBonus: false, wrongStreak: 0,
    shieldBroken: false, streakForgiven: false,
};

// ── Generator function type ───────────────────────────────────────────────────

/**
 * Function the domain provides to generate one item.
 * @param difficulty  0-10 adaptive difficulty level
 * @param categoryId  The active question type/category (e.g. 'cvc')
 * @param rng         Optional seeded RNG for reproducible daily/challenge sets
 */
export interface ItemGenerator {
    (difficulty: number, categoryId: string, rng?: () => number): EngineItem;
    /** Reset dedup tracking and phase counter. Call when starting a fresh buffer. */
    reset?: () => void;
}


// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGameLoop(
    generateItem: ItemGenerator,
    categoryId: string = 'cvc',
    challengeId: string | null = null,
    timedMode = false,
    timedVariant: TimedVariant = 'normal',
    streakShields = 0,
    onConsumeShield?: () => void,
    config: GameConfig = DEFAULT_GAME_CONFIG,
    /**
     * Finite-set generator: when provided and categoryId is in
     * `config.finiteTypeIds`, this is called instead of `generateItem`
     * to produce the entire fixed problem list (daily / challenge).
     */
    generateFiniteSet?: (categoryId: string, challengeId: string | null) => EngineItem[],
    /** Optional callback fired after every answer with the item, correctness, response time, and typed text (if typed mode). */
    onAnswer?: (item: EngineItem, correct: boolean, responseTimeMs: number, typed?: string) => void,
    /** Minimum adaptive difficulty level (from level selection). */
    minLevel = 1,
    /** When true, pauses the timer (e.g. user switched to another tab). */
    paused = false,
) {
    const { level, recordAnswer } = useDifficulty(minLevel);
    const [items, setItems] = useState<EngineItem[]>([]);
    const [gs, setGs] = useState<GameState>(INITIAL_STATE);

    // Ref mirror of items — lets callbacks read current items without
    // recreating on every question advance.
    const itemsRef = useRef(items);
    itemsRef.current = items;

    const { bufferSize, autoAdvanceMs, failPauseMs, milestones, finiteTypeIds, wrongAnswerTapToDismiss } = config;

    const onAnswerRef = useRef(onAnswer);
    onAnswerRef.current = onAnswer;

    const chalkTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    /** Typed text from handleTypedAnswer, consumed by handleAnswer on delegation */
    const pendingTypedText = useRef<string | undefined>(undefined);
    /** Per-word miss count within current session (for hint system) */
    const sessionMisses = useRef(new Map<string, number>());
    const startedRef = useRef(false);
    const prevCategoryId = useRef(categoryId);
    const frozenRef = useRef(false);
    const correctCountRef = useRef(0);
    const dailyRef = useRef<{ dateLabel: string } | null>(null);
    const pendingTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
    const MAX_PENDING_TIMERS = 32;

    /** Schedule a timeout that gets auto-cleared on unmount */
    const safeTimeout = useCallback((fn: () => void, ms: number) => {
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

    const buildInitialSet = useCallback((catId: string): EngineItem[] => {
        // Reset dedup tracking and phase counter for a fresh session
        generateItem.reset?.();
        if (isFinite(catId) && generateFiniteSet) {
            return generateFiniteSet(catId, challengeId);
        }
        return Array.from({ length: bufferSize }, () => generateItem(level, catId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level, bufferSize, challengeId, generateItem, generateFiniteSet]);

    // ── Initialize buffer ─────────────────────────────────────────────────────
    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        const initial = buildInitialSet(categoryId);
        if (initial[0]) initial[0].startTime = Date.now();
        if (isFinite(categoryId)) {
            dailyRef.current = { dateLabel: '' }; // populated by generateFiniteSet if needed
        }
        setItems(initial);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Regenerate on category change ──────────────────────────────────────────
    useEffect(() => {
        if (prevCategoryId.current === categoryId) return;
        prevCategoryId.current = categoryId;

        const fresh = buildInitialSet(categoryId);
        if (fresh[0]) fresh[0].startTime = Date.now();

        setItems(fresh);
        setGs(prev => ({ ...INITIAL_STATE, score: prev.score }));
        sessionMisses.current.clear();
    }, [categoryId, buildInitialSet]);

    // ── Regenerate buffer when word bank changes before user starts playing ──
    // Prevents stale fallback words (e.g. easy words at high levels) that were
    // generated before async tier loading completed.
    // Guard: skip if user already sees the first question (startTime set) to
    // avoid a jarring flash where question A is replaced by question B.
    const generatorVersionRef = useRef(generateItem);
    useEffect(() => {
        if (generatorVersionRef.current === generateItem) return;
        generatorVersionRef.current = generateItem;
        if (gs.totalAnswered > 0 || isFinite(categoryId)) return;
        setItems(prev => {
            if (prev[0]?.startTime) return prev;  // user already sees question — don't replace
            const fresh = buildInitialSet(categoryId);
            if (fresh[0]) fresh[0].startTime = Date.now();
            return fresh;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generateItem, gs.totalAnswered, categoryId, buildInitialSet]);

    // ── Keep infinite buffer full ─────────────────────────────────────────────
    useEffect(() => {
        if (isFinite(categoryId)) return;
        if (items.length < bufferSize) {
            setItems(prev => [...prev, generateItem(level, categoryId)]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items.length, level, categoryId]);

    // ── Prefetch Cloud TTS for next word ─────────────────────────────────────
    // Warms the audioCache so the next word plays instantly after answering.
    const currentId = items[0]?.id;
    useEffect(() => {
        const next = items[1];
        const word = typeof next?.meta?.['word'] === 'string' ? next.meta['word'] as string : null;
        if (!word) return;
        const voice = localStorage.getItem(STORAGE_KEYS.ttsCloudVoice);
        if (!voice) return;
        const rate = parseFloat(localStorage.getItem(STORAGE_KEYS.ttsRate) || '1.0');
        synthesizeCloud(word, voice, rate).catch(() => { /* silent — fallback handles it */ });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentId]);

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

    // ── Skip current problem ───────────────────────────────────────────────────
    const handleSkip = useCallback(() => {
        if (frozenRef.current || itemsRef.current.length === 0) return;
        frozenRef.current = true;
        setGs(prev => ({ ...prev, streak: 0, chalkState: 'idle', frozen: true }));
        safeTimeout(() => {
            setGs(prev => ({ ...prev, frozen: false }));
            frozenRef.current = false;
            advanceProblem();
        }, 100);
    }, [safeTimeout, advanceProblem]);

    // ── Handle answer by option index ────────────────────────────────────────
    const handleAnswer = useCallback((optionIndex: number) => {
        if (frozenRef.current || itemsRef.current.length === 0) return;
        const current = itemsRef.current[0];
        if (!current) return;
        const tts = Date.now() - (current.startTime ?? Date.now());

        const selectedValue = current.options[optionIndex];
        const correct = selectedValue === current.answer;

        if (correct) {
            const typedText = pendingTypedText.current;
            pendingTypedText.current = undefined;
            onAnswerRef.current?.(current, true, tts, typedText);
            recordAnswer(tts, true);
            const isFast = tts < FAST_ANSWER_MS;
            const multiplier = (current.meta?.['bonusMultiplier'] as number) ?? 1;
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
                    score: prev.score + scoreCorrect(newStreak, isFast, multiplier),
                    flash: 'correct',
                    chalkState: newStreak >= 10 ? 'streak' : (prev.wrongStreak >= 3 ? 'comeback' as ChalkState : 'success'),
                    milestone: milestoneEmoji,
                    speedBonus: isFast,
                    wrongStreak: 0,
                    frozen: true,
                    // Reset forgiveness at start of new streak
                    streakForgiven: prev.streak === 0 ? false : prev.streakForgiven,
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
            const typedText = pendingTypedText.current;
            pendingTypedText.current = undefined;
            onAnswerRef.current?.(current, false, tts, typedText);
            // Track per-word misses for hint system
            const missWord = typeof current.meta?.['word'] === 'string' ? current.meta['word'] as string : '';
            if (missWord) sessionMisses.current.set(missWord, (sessionMisses.current.get(missWord) ?? 0) + 1);
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

                // Forgiving streaks for levels 1-3: one free miss per streak
                const canForgive = minLevel <= 3 && !timedMode
                    && prev.streak > 0 && !prev.streakForgiven;

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

                if (canForgive) {
                    // Forgive: keep streak alive, mark as used
                    return {
                        ...prev,
                        totalAnswered: prev.totalAnswered + 1,
                        answerHistory: [...prev.answerHistory, false].slice(-50),
                        score: scorePenalty(prev.score),
                        flash: 'wrong' as const,
                        chalkState: 'fail' as ChalkState,
                        milestone: '',
                        frozen: true,
                        streakForgiven: true,
                    };
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
                    streakForgiven: false,
                };
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recordAnswer, scheduleChalkReset, advanceProblem, safeTimeout, categoryId, streakShields, onConsumeShield, timedMode, minLevel, level, milestones, autoAdvanceMs, failPauseMs, wrongAnswerTapToDismiss, generateItem]);

    // ── Handle typed answer (text-entry / guided mode) ────────────────────────
    const handleTypedAnswer = useCallback((typed: string) => {
        if (frozenRef.current || itemsRef.current.length === 0) return;
        const current = itemsRef.current[0];
        if (!current) return;

        const correctWord = typeof current.meta?.['word'] === 'string'
            ? (current.meta['word'] as string)
            : String(current.options[current.correctIndex]);
        const correct = typed.trim().toLowerCase() === correctWord.toLowerCase();

        if (correct) {
            pendingTypedText.current = typed;
            handleAnswer(current.correctIndex);
        } else {
            // Wrong: trigger the wrong-answer flow
            const tts = Date.now() - (current.startTime ?? Date.now());
            onAnswerRef.current?.(current, false, tts, typed);
            const missWord = typeof current.meta?.['word'] === 'string' ? current.meta['word'] as string : '';
            if (missWord) sessionMisses.current.set(missWord, (sessionMisses.current.get(missWord) ?? 0) + 1);
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

                const canForgive = minLevel <= 3 && !timedMode
                    && prev.streak > 0 && !prev.streakForgiven;

                frozenRef.current = true;
                scheduleChalkReset(failPauseMs);
                if (!wrongAnswerTapToDismiss) {
                    safeTimeout(() => {
                        setGs(p => ({ ...p, flash: 'none', frozen: false }));
                        frozenRef.current = false;
                        advanceProblem();
                    }, failPauseMs);
                }

                if (canForgive) {
                    return {
                        ...prev,
                        totalAnswered: prev.totalAnswered + 1,
                        answerHistory: [...prev.answerHistory, false].slice(-50),
                        score: scorePenalty(prev.score),
                        flash: 'wrong' as const,
                        chalkState: 'fail' as ChalkState,
                        milestone: '',
                        frozen: true,
                        streakForgiven: true,
                    };
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
                    streakForgiven: false,
                };
            });
        }
    }, [handleAnswer, recordAnswer, scheduleChalkReset, safeTimeout, advanceProblem, streakShields, onConsumeShield, timedMode, minLevel, failPauseMs, wrongAnswerTapToDismiss]);

    // ── Timed mode tick + auto-skip ───────────────────────────────────────────
    const pausedRef = useRef(paused);
    pausedRef.current = paused;

    // Also pause when the browser tab is hidden (Page Visibility API)
    const [hidden, setHidden] = useState(false);
    useEffect(() => {
        const handler = () => setHidden(document.hidden);
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
    }, []);

    /** Compute effective timer ms based on variant. Endurance shrinks every 5 correct answers (min 3s). */
    const effectiveTimerMs =
        timedVariant === 'speed' ? 5000 :
        timedVariant === 'endurance' ? Math.max(3000, config.timedModeMs - Math.floor(correctCountRef.current / 5) * 500) :
        config.timedModeMs;

    useEffect(() => {
        if (!timedMode || gs.frozen || items.length === 0 || paused || hidden) {
            cancelAnimationFrame(timerRafRef.current);
            if (!timedMode) setTimerProgress(0);
            return;
        }
        timerStartRef.current = Date.now();
        setTimerProgress(0);

        const timerMs = effectiveTimerMs;
        const tick = () => {
            // Stop ticking if paused between frames
            if (pausedRef.current) { cancelAnimationFrame(timerRafRef.current); return; }
            const elapsed = Date.now() - timerStartRef.current;
            const p = Math.min(elapsed / timerMs, 1);
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
                    frozenRef.current = false;
                    advanceProblem();
                }, failPauseMs);
                return;
            }
            timerRafRef.current = requestAnimationFrame(tick);
        };
        timerRafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(timerRafRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timedMode, timedVariant, effectiveTimerMs, items[0]?.id, gs.frozen, paused, hidden]);

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

    // Hint system: highlight correct answer when a word has been missed 2+ times this session
    const currentWord = typeof items[0]?.meta?.['word'] === 'string' ? items[0].meta['word'] as string : '';
    const hintWord = currentWord !== '' && (sessionMisses.current.get(currentWord) ?? 0) >= 2;

    return {
        problems: items,  // alias kept for backward compat with ProblemView/App expectations
        ...gs,
        level,
        handleAnswer,
        handleSkip,
        handleTypedAnswer,
        dismissWrongAnswer,
        timerProgress,
        dailyComplete,
        dailyDateLabel: dailyRef.current?.dateLabel ?? '',
        hintWord,
    };
}
