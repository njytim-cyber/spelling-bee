/**
 * components/BeeSimPage.tsx
 *
 * Bee Simulation mode — simulates a real spelling bee.
 * Phases: listening → asking → spelling → feedback → [next | eliminated | complete]
 */
import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBeeSimulation } from '../hooks/useBeeSimulation';
import type { BeeLevel } from '../hooks/useBeeSimulation';
import { usePronunciation } from '../hooks/usePronunciation';
import { SpellingInput } from './SpellingInput';
import { SpellingDiffView } from './SpellingDiffView';
import { BeeClassroom } from './BeeClassroom';
import { ChevronLeft } from './ChevronLeft';
import { Confetti } from './Confetti';
import {
    IconCheck,
    IconMessageSquare,
    IconFileText,
    IconType,
    IconGlobe,
    IconGitBranch,
    IconGrid,
    IconRepeat,
    IconSpeaker,
} from './Icons';
import {
    playSuccessSound,
    playWrongSound,
    playVictorySound,
    playStreakSound,
    getSoundEnabled,
    setSoundEnabled,
} from '../utils/soundEffects';
import { STORAGE_KEYS } from '../config';
import type { SeasonalTheme } from '../utils/seasonalThemes';
import type { CharacterStyle } from '../utils/characterStyles';
import type { SpellingWord } from '../domains/spelling/words/types';

const BEE_LEVELS: { id: BeeLevel; label: string; desc: string; emoji: string }[] = [
    { id: 'classroom', label: 'Classroom', desc: 'Grades K-3 · Easy words, generous timer', emoji: '🏫' },
    { id: 'district', label: 'District', desc: 'Grades 2-5 · Moderate difficulty', emoji: '🏙️' },
    { id: 'state', label: 'State', desc: 'Grades 4-8 · Tough words, faster pace', emoji: '🗺️' },
    { id: 'national', label: 'National', desc: 'Competition level · Hardest words', emoji: '🏆' },
];

/** Primary info buttons always visible; secondary hidden behind "More..." */
const PRIMARY_INFO = [
    ['definition', 'Definition', IconMessageSquare],
    ['sentence', 'Sentence', IconFileText],
    ['repeat', 'Repeat', IconRepeat],
] as const;

const SECONDARY_INFO = [
    ['partOfSpeech', 'Part of Speech', IconType],
    ['origin', 'Origin', IconGlobe],
    ['roots', 'Roots', IconGitBranch],
    ['spellInSections', 'Sections', IconGrid],
] as const;

/** Difficulty dots: 5 pips filled proportionally to difficulty 1-10 */
function DifficultyDots({ difficulty }: { difficulty: number }) {
    const filled = Math.ceil(difficulty / 2);
    return (
        <div className="flex items-center gap-1" aria-label={`Difficulty ${difficulty} out of 10`}>
            <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mr-0.5">Difficulty</span>
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= filled ? 'bg-[var(--color-gold)]' : 'bg-[rgb(var(--color-fg))]/15'}`} />
            ))}
        </div>
    );
}

/** Timer countdown bar — shrinks from full to empty, gold → red under 10s */
function TimerBar({ remaining, total }: { remaining: number; total: number }) {
    if (!total) return null;
    const fraction = Math.max(0, remaining / total);
    const urgent = remaining <= 10;
    return (
        <div className="w-full h-2 rounded-full bg-[rgb(var(--color-fg))]/10 overflow-hidden">
            <motion.div
                className={`h-full rounded-full ${urgent ? 'bg-[var(--color-wrong)]' : 'bg-[var(--color-gold)]'}`}
                style={{ width: `${fraction * 100}%` }}
                animate={urgent ? { opacity: [1, 0.5, 1] } : undefined}
                transition={urgent ? { repeat: Infinity, duration: 0.5 } : undefined}
            />
        </div>
    );
}

interface Props {
    onExit: () => void;
    onAnswer?: (word: string, correct: boolean, responseTimeMs: number, typed?: string) => void;
    onBeeResult?: (round: number, wordsCorrect: number, won: boolean, beeLevel: string, xp: number) => void;
}

/** Compact inline feedback — correct answers advance fast, wrong answers wait for TTS spelling to finish */
function InlineFeedback({ correct, word, typed, onNext, isSpeaking }: { correct: boolean; word: string; typed: string; onNext: () => void; isSpeaking: boolean }) {
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const hasFired = useRef(false);

    // Correct answers: advance after 600ms (TTS just says "That is correct!" — short)
    useEffect(() => {
        if (correct) {
            timer.current = setTimeout(onNext, 600);
            return () => clearTimeout(timer.current);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Wrong answers: wait for TTS (letter-by-letter spelling) to finish, then linger briefly
    useEffect(() => {
        if (correct || hasFired.current) return;
        if (!isSpeaking) {
            hasFired.current = true;
            timer.current = setTimeout(onNext, 1200);
            return () => clearTimeout(timer.current);
        }
    }, [correct, isSpeaking, onNext]);

    if (correct) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center gap-2 py-2"
                onClick={onNext}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
                >
                    <IconCheck className="w-6 h-6 text-[var(--color-correct)]" />
                </motion.div>
                <span className="text-base ui font-bold text-[var(--color-correct)]">Correct!</span>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-2 py-2 w-full"
        >
            <SpellingDiffView typed={typed} correct={word} />
            <button
                onClick={onNext}
                className="mt-2 px-4 py-2 rounded-lg border border-[rgb(var(--color-fg))]/20 bg-[rgb(var(--color-fg))]/5 text-sm ui text-[rgb(var(--color-fg))]/60 hover:text-[rgb(var(--color-fg))]/80 hover:border-[rgb(var(--color-fg))]/30 transition-colors"
            >
                Continue
            </button>
        </motion.div>
    );
}

export const BeeSimPage = memo(function BeeSimPage({ onExit, onAnswer, onBeeResult }: Props) {
    const [beeLevel, setBeeLevel] = useState<BeeLevel | null>(null);

    // Level selection screen — shown before the bee starts
    if (!beeLevel) {
        return (
            <div className="flex-1 flex flex-col items-center relative overflow-hidden min-h-0">
                <div className="w-full flex items-center gap-3 pt-3 pb-2 px-6 shrink-0">
                    <button
                        onClick={onExit}
                        className="w-8 h-8 flex items-center justify-center text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/70 transition-colors shrink-0"
                        aria-label="Back"
                    >
                        <ChevronLeft />
                    </button>
                    <div className="text-sm ui text-[rgb(var(--color-fg))]/50 font-medium">Spelling Bee</div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-6 w-full max-w-[var(--content-w)]"
                    >
                        <div className="text-6xl">🐝</div>
                        <h2 className="text-2xl chalk text-[var(--color-chalk)] font-bold text-center">
                            Choose Your Bee
                        </h2>
                        <p className="text-sm ui text-[rgb(var(--color-fg))]/40 text-center -mt-2">
                            Pick a competition level to begin
                        </p>

                        <div className="w-full flex flex-col gap-2">
                            {BEE_LEVELS.map((level, i) => (
                                <motion.button
                                    key={level.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + i * 0.08 }}
                                    onClick={() => setBeeLevel(level.id)}
                                    className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-[rgb(var(--color-fg))]/10 hover:border-[var(--color-gold)]/50 hover:bg-[var(--color-gold)]/5 transition-all text-left group"
                                >
                                    <span className="text-2xl group-hover:scale-110 transition-transform">{level.emoji}</span>
                                    <div className="flex-1">
                                        <div className="text-base ui font-bold text-[var(--color-chalk)] group-hover:text-[var(--color-gold)] transition-colors">
                                            {level.label}
                                        </div>
                                        <div className="text-xs ui text-[rgb(var(--color-fg))]/35">{level.desc}</div>
                                    </div>
                                    <ChevronLeft className="w-4 h-4 text-[rgb(var(--color-fg))]/20 rotate-180 group-hover:text-[var(--color-gold)]/50 transition-colors" />
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    return <BeeSimGame beeLevel={beeLevel} onExit={onExit} onAnswer={onAnswer} onBeeResult={onBeeResult} onChangeLevel={() => setBeeLevel(null)} />;
});

/** Track missed words and session stats for richer summaries */
interface MissedWord {
    word: SpellingWord;
    typed: string;
}

/** The actual bee game — only renders after a level has been chosen */
const BeeSimGame = memo(function BeeSimGame({ beeLevel, onExit, onAnswer, onBeeResult, onChangeLevel }: Props & { beeLevel: BeeLevel; onChangeLevel: () => void }) {
    // Load user preferences from localStorage
    const [seasonalTheme] = useState<SeasonalTheme>(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.seasonalTheme);
        return (stored as SeasonalTheme) || 'auto';
    });

    const [characterStyle] = useState<CharacterStyle>(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.stickFigureStyle);
        return (stored as CharacterStyle) || 'classic';
    });

    const {
        state,
        startSession,
        pronounce,
        moveToAsking,
        requestInfo,
        moveToSpelling,
        updateTyping,
        submitSpelling,
        nextWord,
        readBackSpelling,
        sessionXP,
        isSpeaking,
        ttsSupported,
        npcResults,
        npcAlive,
        npcScores,
        npcSpellings,
        timerRemaining,
        timerTotal,
    } = useBeeSimulation(undefined, false, false, beeLevel);

    const { phase, currentWord, round, wordsCorrect, wordsAttempted, typedSpelling, lastResult, infoResponses } = state;

    // Festive features state
    const [showConfetti, setShowConfetti] = useState(false);
    const [confettiIntensity, setConfettiIntensity] = useState<'normal' | 'epic'>('normal');
    const [soundOn, setSoundOn] = useState(getSoundEnabled());
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [showRoundBanner, setShowRoundBanner] = useState(false);
    const [showStreakBadge, setShowStreakBadge] = useState(false);
    const [motivationalMessage, setMotivationalMessage] = useState('');
    const [showMoreInfo, setShowMoreInfo] = useState(false);

    // Session tracking for richer summaries (state, not refs, since used in render)
    const [missedWords, setMissedWords] = useState<MissedWord[]>([]);
    const [correctWords, setCorrectWords] = useState<SpellingWord[]>([]);
    const [diffRange, setDiffRange] = useState<[number, number]>([10, 1]); // [min, max]

    // Track difficulty range
    const trackDifficulty = useCallback((d: number) => {
        setDiffRange(prev => [Math.min(prev[0], d), Math.max(prev[1], d)]);
    }, []);

    // Screen shake on wrong answer + festive effects
    const [shakeClass, setShakeClass] = useState('');
    const prevPhaseRef = useRef(phase);
    const prevRoundRef = useRef(round);

    // Handle feedback phase transitions
    useEffect(() => {
        if (phase === 'feedback' && prevPhaseRef.current === 'spelling') {
            // Use queueMicrotask to defer state updates after render
            queueMicrotask(() => {
                if (currentWord) trackDifficulty(currentWord.difficulty);

                if (lastResult === true) {
                    // Correct answer celebrations
                    const newStreak = streak + 1;
                    setStreak(newStreak);
                    if (newStreak > bestStreak) setBestStreak(newStreak);
                    if (currentWord) setCorrectWords(prev => [...prev, currentWord]);

                    // More intense confetti for streaks
                    setConfettiIntensity(newStreak >= 5 ? 'epic' : 'normal');
                    setShowConfetti(true);
                    setTimeout(() => setShowConfetti(false), newStreak >= 5 ? 2500 : 1500);

                    if (soundOn) playSuccessSound();

                    // Streak milestones with enhanced effects
                    if (newStreak === 3 || newStreak === 5 || newStreak === 10) {
                        setShowStreakBadge(true);
                        setTimeout(() => setShowStreakBadge(false), 2500);
                        if (soundOn) playStreakSound(newStreak);
                    }
                } else {
                    // Wrong answer
                    if (currentWord) {
                        setMissedWords(prev => [...prev, { word: currentWord, typed: typedSpelling }]);
                    }
                    setStreak(0);
                    setShakeClass('wrong-shake');
                    setTimeout(() => setShakeClass(''), 300);
                    if (soundOn) playWrongSound();
                }
            });
        }
        // Also track forced eliminations (timer expiry goes directly to eliminated)
        if (phase === 'eliminated' && prevPhaseRef.current !== 'feedback') {
            queueMicrotask(() => {
                if (currentWord) {
                    trackDifficulty(currentWord.difficulty);
                    setMissedWords(prev => [...prev, { word: currentWord, typed: typedSpelling }]);
                }
            });
        }
        prevPhaseRef.current = phase;
    }, [phase, lastResult, streak, bestStreak, soundOn, currentWord, typedSpelling, trackDifficulty]);

    // Reset showMoreInfo when phase changes to asking (new word)
    useEffect(() => {
        if (phase === 'asking') queueMicrotask(() => setShowMoreInfo(false));
    }, [phase]);

    // Round transitions with banner
    useEffect(() => {
        if (round !== prevRoundRef.current && round > 0) {
            queueMicrotask(() => {
                setShowRoundBanner(true);
                setTimeout(() => setShowRoundBanner(false), 2000);

                // Motivational messages every few rounds
                const messages = [
                    "You're doing great! 🎯",
                    "Keep it up! ⭐",
                    "Fantastic spelling! 🌟",
                    "You're on fire! 🔥",
                    "Impressive! 💫",
                ];
                if (round % 3 === 0) {
                    setMotivationalMessage(messages[Math.floor(Math.random() * messages.length)]);
                    setTimeout(() => setMotivationalMessage(''), 3000);
                }
            });
        }
        prevRoundRef.current = round;
    }, [round]);

    // Report bee result when session ends + victory sound
    const beeResultFired = useRef(false);
    useEffect(() => {
        if ((phase === 'eliminated' || phase === 'won') && !beeResultFired.current) {
            beeResultFired.current = true;
            onBeeResult?.(round, wordsCorrect, phase === 'won', beeLevel, sessionXP);

            if (phase === 'won') {
                queueMicrotask(() => {
                    // Epic confetti for championship win
                    setConfettiIntensity('epic');
                    setShowConfetti(true);
                    if (soundOn) playVictorySound();
                    setTimeout(() => setShowConfetti(false), 4000);
                });
            }
        }
        if (phase === 'listening') {
            beeResultFired.current = false;
            queueMicrotask(() => setStreak(0));
        }
    }, [phase, round, wordsCorrect, beeLevel, sessionXP, onBeeResult, soundOn]);

    // Welcome greeting + auto-start session on mount
    const { speak: speakGreeting } = usePronunciation();
    const greetedRef = useRef(false);
    useEffect(() => {
        if (!currentWord && !greetedRef.current) {
            greetedRef.current = true;
            const levelLabel = BEE_LEVELS.find(l => l.id === beeLevel)?.label ?? 'Spelling';
            speakGreeting(`Welcome to the ${levelLabel} Spelling Bee!`);
            // Start session after a short delay so greeting plays first
            const id = setTimeout(() => startSession(), 1800);
            return () => clearTimeout(id);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Hardest correct word for victory screen
    const hardestCorrect = correctWords.length > 0
        ? correctWords.reduce((a, b) => a.difficulty > b.difficulty ? a : b)
        : null;

    const [diffMin, diffMax] = diffRange;

    // Still loading first word
    if (!currentWord) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
                <div className="flex flex-col items-center gap-4 w-full max-w-[var(--content-w)]">
                    {/* Skeleton classroom */}
                    <div className="w-full h-[280px] bg-[rgb(var(--color-fg))]/5 rounded-xl animate-pulse" />
                    {/* Skeleton buttons */}
                    <div className="flex gap-2">
                        <div className="w-24 h-10 bg-[rgb(var(--color-fg))]/5 rounded-xl animate-pulse" />
                        <div className="w-32 h-10 bg-[rgb(var(--color-fg))]/5 rounded-xl animate-pulse" />
                        <div className="w-24 h-10 bg-[rgb(var(--color-fg))]/5 rounded-xl animate-pulse" />
                    </div>
                    <p className="text-sm ui text-[rgb(var(--color-fg))]/40 animate-pulse">
                        Loading spelling bee...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center relative overflow-hidden min-h-0">
            {/* Confetti effect with variable intensity */}
            <Confetti trigger={showConfetti} intensity={confettiIntensity} />

            {/* Round transition banner */}
            <AnimatePresence>
                {showRoundBanner && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: -50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -50 }}
                        className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                    >
                        <div className="bg-[var(--color-gold)]/95 text-[var(--color-board)] px-8 py-4 rounded-2xl shadow-lg hand-drawn-box">
                            <div className="text-3xl chalk font-bold text-center">Round {round + 1}!</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Streak badge */}
            <AnimatePresence>
                {showStreakBadge && streak >= 3 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
                    >
                        <div className="bg-[var(--color-streak-fire)]/95 text-white px-6 py-3 rounded-xl shadow-lg">
                            <div className="text-2xl ui font-bold text-center">{streak} IN A ROW! 🔥</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Motivational message */}
            <AnimatePresence>
                {motivationalMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
                    >
                        <div className="bg-[var(--color-correct)]/90 text-white px-4 py-2 rounded-lg shadow-md">
                            <div className="text-sm ui font-semibold">{motivationalMessage}</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top bar — back arrow + round counter + sound toggle + level selector */}
            <div className="w-full flex items-center gap-3 pt-3 pb-2 px-6 shrink-0">
                <button
                    onClick={onExit}
                    className="w-8 h-8 flex items-center justify-center text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/70 transition-colors shrink-0"
                    aria-label="Back"
                >
                    <ChevronLeft />
                </button>
                <div className="text-sm ui text-[rgb(var(--color-fg))]/50 font-medium truncate flex-1">
                    Round {round + 1} · {wordsCorrect}/{wordsAttempted} correct
                    {streak >= 2 && <span className="ml-2 text-[var(--color-streak-fire)]">🔥{streak}</span>}
                </div>
                {/* Sound toggle */}
                <button
                    onClick={() => {
                        const newState = !soundOn;
                        setSoundOn(newState);
                        setSoundEnabled(newState);
                    }}
                    className="w-8 h-8 flex items-center justify-center text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/70 transition-colors shrink-0"
                    aria-label={soundOn ? 'Mute sounds' : 'Enable sounds'}
                    title={soundOn ? 'Mute sounds' : 'Enable sounds'}
                >
                    <span className="text-lg">{soundOn ? '🔊' : '🔇'}</span>
                </button>
                <span className="text-xs ui px-2 py-1 text-[var(--color-gold)]/60 shrink-0">
                    {BEE_LEVELS.find(l => l.id === beeLevel)?.label}
                </span>
            </div>

            {/* Timer bar — shown during asking/spelling for district+ */}
            {timerTotal > 0 && (phase === 'asking' || phase === 'spelling') && (
                <div className="w-full px-6 pb-1 shrink-0">
                    <TimerBar remaining={timerRemaining} total={timerTotal} />
                    <div className="text-center text-[10px] ui text-[rgb(var(--color-fg))]/30 mt-0.5">
                        {Math.ceil(timerRemaining)}s
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col items-center w-full overflow-y-auto overflow-x-hidden px-4 pt-12 pb-24 min-h-0">
            <div className="w-full max-w-[360px] flex flex-col gap-8">
            <AnimatePresence mode="wait">
                {/* CLASSROOM — stays visible for listening, spelling, and feedback phases */}
                {(phase === 'listening' || phase === 'asking' || phase === 'spelling' || phase === 'feedback') && (
                    <motion.div
                        key="classroom"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`flex flex-col items-center gap-3 w-full ${shakeClass}`}
                    >
                        <BeeClassroom
                            pupilResults={npcResults}
                            npcAlive={npcAlive}
                            npcScores={npcScores}
                            npcSpellings={npcSpellings}
                            phase={phase}
                            onPronounce={pronounce}
                            onPlayerTurn={moveToAsking}
                            round={round}
                            isTyping={phase === 'spelling' && typedSpelling.length > 0}
                            lastResult={phase === 'feedback' ? lastResult : null}
                            currentWord={currentWord?.word}
                            seasonalTheme={seasonalTheme}
                            characterStyle={characterStyle}
                            wordDifficulty={currentWord?.difficulty || 5}
                        />

                        {/* Asking phase — player requests info one at a time */}
                        <AnimatePresence>
                            {phase === 'asking' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="w-full flex flex-col items-center gap-2"
                                >
                                    {/* Difficulty indicator */}
                                    <DifficultyDots difficulty={currentWord.difficulty} />

                                    {/* Primary info buttons — always visible */}
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {PRIMARY_INFO.map(([type, label, Icon]) => {
                                            const alreadyAsked = state.infoRequested.has(type) && type !== 'repeat';
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => requestInfo(type)}
                                                    disabled={alreadyAsked}
                                                    aria-label={`Request ${label.toLowerCase()}`}
                                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs ui font-medium transition-colors ${
                                                        alreadyAsked
                                                            ? 'bg-[rgb(var(--color-fg))]/5 text-[rgb(var(--color-fg))]/25 cursor-default border border-transparent'
                                                            : 'border border-[var(--color-gold)]/30 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 hover:border-[var(--color-gold)]/50'
                                                    }`}
                                                >
                                                    <Icon className="w-3.5 h-3.5" />
                                                    {label}
                                                </button>
                                            );
                                        })}

                                        {/* More/Less toggle */}
                                        <button
                                            onClick={() => setShowMoreInfo(v => !v)}
                                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs ui font-medium border border-[rgb(var(--color-fg))]/15 text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 hover:border-[rgb(var(--color-fg))]/30 transition-colors"
                                        >
                                            {showMoreInfo ? 'Less' : 'More...'}
                                        </button>
                                    </div>

                                    {/* Secondary info buttons — expanded */}
                                    <AnimatePresence>
                                        {showMoreInfo && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="flex flex-wrap justify-center gap-2 overflow-hidden"
                                            >
                                                {SECONDARY_INFO.map(([type, label, Icon]) => {
                                                    const alreadyAsked = state.infoRequested.has(type) && type !== 'spellInSections';
                                                    return (
                                                        <button
                                                            key={type}
                                                            onClick={() => requestInfo(type)}
                                                            disabled={alreadyAsked}
                                                            aria-label={`Request ${label.toLowerCase()}`}
                                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs ui font-medium transition-colors ${
                                                                alreadyAsked
                                                                    ? 'bg-[rgb(var(--color-fg))]/5 text-[rgb(var(--color-fg))]/25 cursor-default border border-transparent'
                                                                    : 'border border-[var(--color-gold)]/30 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 hover:border-[var(--color-gold)]/50'
                                                            }`}
                                                        >
                                                            <Icon className="w-3.5 h-3.5" />
                                                            {label}
                                                        </button>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Revealed info cards */}
                                    <div className="w-full space-y-2">
                                        <AnimatePresence>
                                            {Object.entries(infoResponses).map(([key, value], idx) => (
                                                <motion.div
                                                    key={key}
                                                    initial={{ opacity: 0, y: 10, height: 0 }}
                                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                    exit={{ opacity: 0 }}
                                                    className={`bg-[rgb(var(--color-fg))]/8 px-4 py-3 text-sm ui text-[rgb(var(--color-fg))]/70 overflow-hidden ${idx % 2 === 0 ? 'hand-drawn-box' : 'hand-drawn-box-alt'}`}
                                                >
                                                    <span className="text-xs text-[var(--color-gold)] uppercase font-bold tracking-wide">
                                                        {key === 'partOfSpeech' ? 'Part of Speech' : key === 'spellInSections' ? 'Sections' : key === 'roots' ? 'Roots' : key}:{' '}
                                                    </span>
                                                    {value}
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>

                                    {/* Ready to spell button - primary CTA */}
                                    <button
                                        onClick={moveToSpelling}
                                        className="mt-4 px-8 py-3 rounded-xl border-[3px] border-[var(--color-gold)]/60 bg-[var(--color-gold)]/15 text-sm ui font-bold text-[var(--color-gold)] hover:bg-[var(--color-gold)]/25 hover:border-[var(--color-gold)]/80 transition-colors"
                                    >
                                        Ready to Spell
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Inline spelling input */}
                        <AnimatePresence>
                            {phase === 'spelling' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: 12, height: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                    className="w-full overflow-hidden"
                                >
                                    {/* Show any previously requested info during spelling */}
                                    {Object.keys(infoResponses).length > 0 && (
                                        <div className="w-full space-y-1.5 mb-3">
                                            {Object.entries(infoResponses).map(([key, value], idx) => (
                                                <div
                                                    key={key}
                                                    className={`bg-[rgb(var(--color-fg))]/8 px-3 py-2 text-xs ui text-[rgb(var(--color-fg))]/65 ${idx % 2 === 0 ? 'hand-drawn-box' : 'hand-drawn-box-alt'}`}
                                                >
                                                    <span className="text-[11px] text-[var(--color-gold)] uppercase font-bold tracking-wide">
                                                        {key === 'partOfSpeech' ? 'POS' : key}:{' '}
                                                    </span>
                                                    {value}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* Pronounce Again — available during spelling phase */}
                                    {ttsSupported && (
                                        <button
                                            onClick={() => requestInfo('pronounceAgain')}
                                            className="mb-2 w-full flex items-center justify-center gap-1.5 text-xs ui font-medium border border-[var(--color-gold)]/40 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 rounded-lg px-3 py-2 transition-colors"
                                        >
                                            <IconSpeaker className="w-3.5 h-3.5" />
                                            Pronounce Again
                                        </button>
                                    )}
                                    <SpellingInput
                                        value={typedSpelling}
                                        onChange={updateTyping}
                                        onSubmit={() => {
                                            submitSpelling();
                                            if (onAnswer && currentWord) {
                                                const correct = typedSpelling.trim().toLowerCase() === currentWord.word.toLowerCase();
                                                onAnswer(currentWord.word, correct, Date.now(), correct ? undefined : typedSpelling.trim());
                                            }
                                        }}
                                    />
                                    {/* Hear My Spelling — reads back letter-by-letter like speaking into the mic */}
                                    {ttsSupported && typedSpelling.trim().length > 0 && (
                                        <button
                                            onClick={readBackSpelling}
                                            className="mt-2 w-full text-center text-xs ui text-[rgb(var(--color-fg))]/30 hover:text-[var(--color-gold)] transition-colors"
                                        >
                                            Hear My Spelling
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Inline feedback — replaces input after submit, auto-advances */}
                        <AnimatePresence>
                            {phase === 'feedback' && currentWord && (
                                <InlineFeedback
                                    correct={!!lastResult}
                                    word={currentWord.word}
                                    typed={typedSpelling}
                                    onNext={nextWord}
                                    isSpeaking={isSpeaking}
                                />
                            )}
                        </AnimatePresence>

                        {phase === 'listening' && (
                            <p className="text-xs ui text-[rgb(var(--color-fg))]/40">
                                {ttsSupported ? 'Tap the Pronouncer to hear word again' : 'Audio not available — tap the Pronouncer'}
                            </p>
                        )}
                    </motion.div>
                )}

                {/* ELIMINATED PHASE — richer summary */}
                {phase === 'eliminated' && currentWord && (
                    <motion.div
                        key="eliminated"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <motion.div
                            className="text-7xl"
                            animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            🐝
                        </motion.div>
                        <motion.h2
                            className="text-2xl ui font-bold text-[var(--color-wrong)]"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            Nice Try!
                        </motion.h2>

                        {/* What you typed vs correct */}
                        <motion.div
                            className="w-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <SpellingDiffView typed={typedSpelling || '(no answer)'} correct={currentWord.word} />
                        </motion.div>

                        <motion.div
                            className="text-sm ui text-[rgb(var(--color-fg))]/60 italic text-center max-w-[var(--content-w-sm)]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            {currentWord.definition}
                        </motion.div>

                        {/* Session stats card */}
                        <motion.div
                            className="bg-[rgb(var(--color-fg))]/8 rounded-xl px-6 py-4 w-full mt-2 hand-drawn-box"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            <div className="text-center mb-3">
                                <div className="text-4xl chalk text-[var(--color-gold)] mb-1">{wordsCorrect}</div>
                                <div className="text-sm ui text-[rgb(var(--color-fg))]/60 font-medium">words spelled correctly</div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div>
                                    <div className="text-lg chalk text-[var(--color-streak-fire)]">{bestStreak}</div>
                                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">Best Streak</div>
                                </div>
                                <div>
                                    <div className="text-lg chalk text-[var(--color-gold)]">+{sessionXP}</div>
                                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">XP Earned</div>
                                </div>
                                <div>
                                    <div className="text-lg chalk text-[rgb(var(--color-fg))]/70">{diffMin !== 10 ? `${diffMin}-${diffMax}` : '-'}</div>
                                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">Difficulty</div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Missed words section */}
                        {missedWords.length > 0 && (
                            <motion.div
                                className="w-full"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 }}
                            >
                                <div className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase font-bold tracking-wide mb-2">
                                    Words to Practice
                                </div>
                                <div className="space-y-1.5">
                                    {missedWords.slice(-5).map((m, i) => (
                                        <div key={i} className="bg-[rgb(var(--color-fg))]/5 px-3 py-2 rounded-lg flex items-center justify-between">
                                            <div>
                                                <span className="text-sm ui font-bold text-[var(--color-gold)]">{m.word.word}</span>
                                                {m.typed && m.typed !== '(no answer)' && (
                                                    <span className="text-xs ui text-[var(--color-wrong)]/60 ml-2">you typed: {m.typed}</span>
                                                )}
                                            </div>
                                            <DifficultyDots difficulty={m.word.difficulty} />
                                        </div>
                                    ))}
                                    {missedWords.length > 5 && (
                                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 text-center pt-1">
                                            and {missedWords.length - 5} more
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        <motion.div
                            className="flex gap-3 mt-2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                        >
                            <button
                                onClick={onChangeLevel}
                                className="px-6 py-2.5 rounded-xl border-2 border-[var(--color-gold)]/50 bg-[var(--color-gold)]/15 text-sm ui font-semibold text-[var(--color-gold)] hover:bg-[var(--color-gold)]/25 transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={onExit}
                                className="px-6 py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/20 text-sm ui text-[rgb(var(--color-fg))]/50 hover:border-[rgb(var(--color-fg))]/40 transition-colors flex items-center gap-1.5"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </button>
                        </motion.div>
                    </motion.div>
                )}

                {/* VICTORY PHASE — last one standing! */}
                {phase === 'won' && (
                    <motion.div
                        key="won"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="flex flex-col items-center gap-4"
                    >
                        {/* Animated trophy with sparkles */}
                        <div className="relative">
                            <motion.div
                                className="text-8xl"
                                animate={{
                                    rotate: [0, -12, 12, -8, 8, -4, 4, 0],
                                    scale: [1, 1.3, 1.1, 1.25, 1],
                                    y: [0, -10, 0, -5, 0]
                                }}
                                transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                            >
                                🏆
                            </motion.div>
                            {/* Sparkles around trophy */}
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute text-2xl"
                                    style={{
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                    }}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{
                                        opacity: [0, 1, 0],
                                        scale: [0, 1.5, 0],
                                        x: [0, Math.cos((i / 6) * Math.PI * 2) * 60],
                                        y: [0, Math.sin((i / 6) * Math.PI * 2) * 60],
                                    }}
                                    transition={{
                                        duration: 1,
                                        delay: 0.5 + i * 0.1,
                                        ease: 'easeOut',
                                    }}
                                >
                                    ⭐
                                </motion.div>
                            ))}
                        </div>
                        <motion.h2
                            className="text-4xl chalk text-[var(--color-gold)] font-bold"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            Champion! 🎉
                        </motion.h2>
                        <motion.p
                            className="text-base ui text-[rgb(var(--color-fg))]/70 font-medium text-center max-w-[var(--content-w-sm)]"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            You&rsquo;re the last one standing!<br />
                            <span className="text-[var(--color-gold)]">Perfect spelling!</span>
                        </motion.p>

                        {/* Session stats card */}
                        <motion.div
                            className="bg-gradient-to-br from-[var(--color-gold)]/10 to-[var(--color-gold)]/5 rounded-xl px-8 py-5 w-full text-center mt-2 hand-drawn-box border-2 border-[var(--color-gold)]/20"
                            initial={{ y: 10, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <div className="text-5xl chalk text-[var(--color-gold)] mb-2 font-bold">{wordsCorrect}</div>
                            <div className="text-sm ui text-[rgb(var(--color-fg))]/70 font-semibold">words spelled perfectly</div>

                            <div className="grid grid-cols-3 gap-3 text-center mt-4">
                                <div>
                                    <div className="text-lg chalk text-[var(--color-streak-fire)]">{bestStreak}</div>
                                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">Best Streak</div>
                                </div>
                                <div>
                                    <div className="text-lg chalk text-[var(--color-gold)]">{round + 1}</div>
                                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">Rounds</div>
                                </div>
                                <div>
                                    <div className="text-lg chalk text-[rgb(var(--color-fg))]/70">{diffMin !== 10 ? `${diffMin}-${diffMax}` : '-'}</div>
                                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">Difficulty</div>
                                </div>
                            </div>

                            <div className="text-base ui text-[var(--color-gold)] mt-3 font-bold">+{sessionXP} XP earned ⚡</div>
                        </motion.div>

                        {/* Hardest word nailed */}
                        {hardestCorrect && (
                            <motion.div
                                className="w-full bg-[rgb(var(--color-fg))]/5 rounded-xl px-4 py-3"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                            >
                                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 uppercase font-bold tracking-wide mb-1">
                                    Hardest Word Nailed
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-base ui font-bold text-[var(--color-gold)]">{hardestCorrect.word}</span>
                                    <DifficultyDots difficulty={hardestCorrect.difficulty} />
                                </div>
                                <div className="text-xs ui text-[rgb(var(--color-fg))]/50 italic mt-0.5">{hardestCorrect.definition}</div>
                            </motion.div>
                        )}

                        <motion.div
                            className="flex gap-3 mt-4"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7 }}
                        >
                            <button
                                onClick={onChangeLevel}
                                className="px-8 py-3 rounded-xl border-[3px] border-[var(--color-gold)]/60 bg-[var(--color-gold)]/20 text-sm ui font-bold text-[var(--color-gold)] hover:bg-[var(--color-gold)]/30 hover:scale-105 transition-all"
                            >
                                Play Again
                            </button>
                            <button
                                onClick={onExit}
                                className="px-6 py-3 rounded-xl border border-[rgb(var(--color-fg))]/30 text-sm ui text-[rgb(var(--color-fg))]/60 hover:border-[rgb(var(--color-fg))]/50 transition-colors flex items-center gap-1.5"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>
            </div>
        </div>
    );
});
