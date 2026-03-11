/**
 * components/GuidedSpellingPage.tsx
 *
 * Guided spelling practice — the bridge between MCQ and full Bee Simulation.
 * Flow: hear word → type it → correct? celebrate : show spelling → retype.
 * Fully integrated with Leitner SRS via onAnswer callback.
 *
 * Features: streak tracking with celebrations, session goal (10 words),
 * progress ring, etymology cards for competition words, difficulty indicator.
 */
import { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpellingInput } from './SpellingInput';
import { ChevronLeft } from './ChevronLeft';
import { SpellingDiffView } from './SpellingDiffView';
import { Confetti } from './Confetti';
import { IconSpeaker, IconCheck } from './Icons';
import { usePronunciation } from '../hooks/usePronunciation';
import { getRootsForWord, formatRootHint } from '../domains/spelling/words/rootUtils';
import { playDing, playBuzzer } from '../utils/beeSounds';
import { playStreakSound } from '../utils/soundEffects';
import { Button } from './Button';
import { selectWordPool } from '../domains/spelling/spellingGenerator';
import { difficultyRange, getWordMap } from '../domains/spelling/words';
import type { SpellingWord } from '../domains/spelling/words/types';
import type { WordRecord } from '../hooks/useWordHistory';

type Phase = 'typing' | 'correct' | 'showing' | 'retyping' | 'retype-correct' | 'summary';

interface Props {
    onExit: () => void;
    onAnswer?: (word: string, correct: boolean, responseTimeMs: number, typed?: string) => void;
    /** Review queue from Leitner SRS — guided mode prioritizes these words */
    reviewQueue?: WordRecord[];
    /** Count of mastered words — used for 'ready for bee?' prompt */
    masteredCount?: number;
    onOpenBee?: () => void;
}

function pickRandomWord(round: number): SpellingWord {
    const diffLevel = Math.min(5, 1 + Math.floor(round / 4));
    const [minDiff, maxDiff] = difficultyRange(diffLevel);
    const pool = selectWordPool(undefined, minDiff, maxDiff);
    return pool[Math.floor(Math.random() * pool.length)];
}

/** Pick next word: prioritize review queue, fall back to random */
function pickWord(round: number, reviewQueue?: WordRecord[], usedWords?: Set<string>): SpellingWord {
    const wordMap = getWordMap();
    if (reviewQueue && reviewQueue.length > 0) {
        // Find a review word we haven't used this session
        for (const r of reviewQueue) {
            if (usedWords?.has(r.word)) continue;
            const sw = wordMap.get(r.word);
            if (sw) return sw;
        }
    }
    // Fall back to random word selection
    return pickRandomWord(round);
}

const SHOW_DURATION_MS = 3500;
const SESSION_TARGET = 10;
const CELEBRATION_TEXTS = ['Perfect!', 'Nailed it!', 'Nice!', 'You got it!'];

/** Difficulty dots: 5 pips, filled proportionally to 1-10 scale */
function DifficultyDots({ difficulty }: { difficulty: number }) {
    const filled = Math.ceil(difficulty / 2); // 1-2→1, 3-4→2, 5-6→3, 7-8→4, 9-10→5
    return (
        <div className="flex items-center gap-1" aria-label={`Difficulty ${difficulty} out of 10`}>
            {[1, 2, 3, 4, 5].map(i => (
                <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${i <= filled ? 'bg-[var(--color-gold)]' : 'bg-[rgb(var(--color-fg))]/15'}`}
                />
            ))}
        </div>
    );
}

/** SVG progress ring around the speaker button */
function ProgressRing({ progress, size = 72, strokeWidth = 3 }: { progress: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - Math.min(1, progress));
    return (
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
            {/* Background track */}
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(var(--color-fg))" strokeOpacity="0.08" strokeWidth={strokeWidth} />
            {/* Progress arc */}
            <circle
                cx={size / 2} cy={size / 2} r={radius} fill="none"
                stroke="var(--color-gold)" strokeOpacity="0.6" strokeWidth={strokeWidth}
                strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
            />
        </svg>
    );
}

export const GuidedSpellingPage = memo(function GuidedSpellingPage({ onExit, onAnswer, reviewQueue, masteredCount, onOpenBee }: Props) {
    const [round, setRound] = useState(0);
    const usedWordsRef = useRef(new Set<string>());
    const [word, setWord] = useState<SpellingWord>(() => pickWord(0, reviewQueue));
    const [typed, setTyped] = useState('');
    const [lastTyped, setLastTyped] = useState(''); // preserve first attempt for diff display
    const [phase, setPhase] = useState<Phase>('typing');
    const [wordsCorrect, setWordsCorrect] = useState(0);
    const [wordsAttempted, setWordsAttempted] = useState(0);
    const startTimeRef = useRef(0);
    const sessionStartRef = useRef(0);
    useEffect(() => { sessionStartRef.current = Date.now(); }, []);
    const showTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Streak tracking
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [showStreakBadge, setShowStreakBadge] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [confettiIntensity, setConfettiIntensity] = useState<'normal' | 'epic'>('normal');

    // Session goal tracking — count within current set of 10
    const [sessionWordsAttempted, setSessionWordsAttempted] = useState(0);
    const [sessionWordsCorrect, setSessionWordsCorrect] = useState(0);
    const [sessionTime, setSessionTime] = useState(0);

    const { speak, speakWord, isSupported, cancel, usedFallback, ttsFailed } = usePronunciation();
    const wordRoots = useMemo(() => getRootsForWord(word.word), [word]);

    // Celebration text cycles through variety
    const celebrationText = useMemo(() => CELEBRATION_TEXTS[wordsCorrect % CELEBRATION_TEXTS.length], [wordsCorrect]);

    // Whether to show etymology (competition words difficulty 7+)
    const showEtymology = !!(word.etymology && word.difficulty >= 7);

    // Announce word on mount and when word changes
    useEffect(() => {
        if (isSupported && phase !== 'summary') speakWord(word.word);
        startTimeRef.current = Date.now();
    }, [word]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup timer on unmount
    useEffect(() => () => clearTimeout(showTimerRef.current), []);

    const handleRepeat = useCallback(() => {
        if (isSupported) speak(word.word, word.pronunciation);
    }, [word, speak, isSupported]);

    const handleSubmit = useCallback(() => {
        const correct = typed.trim().toLowerCase() === word.word.toLowerCase();
        const ms = Date.now() - startTimeRef.current;

        if (correct) {
            playDing();
            onAnswer?.(word.word, true, ms);
            setWordsCorrect(c => c + 1);
            setWordsAttempted(a => a + 1);
            setSessionWordsCorrect(c => c + 1);
            setSessionWordsAttempted(a => a + 1);
            setPhase('correct');

            // Streak logic
            setStreak(prev => {
                const newStreak = prev + 1;
                setBestStreak(b => Math.max(b, newStreak));
                // Confetti
                setConfettiIntensity(newStreak >= 5 ? 'epic' : 'normal');
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), newStreak >= 5 ? 2500 : 1500);
                // Streak milestones
                if (newStreak === 3 || newStreak === 5 || newStreak === 10) {
                    playStreakSound(newStreak);
                    setShowStreakBadge(true);
                    setTimeout(() => setShowStreakBadge(false), 2500);
                }
                return newStreak;
            });

            if (isSupported) {
                setTimeout(() => speak(word.word, word.pronunciation), 200);
            }
        } else {
            playBuzzer();
            onAnswer?.(word.word, false, ms, typed.trim());
            setWordsAttempted(a => a + 1);
            setSessionWordsAttempted(a => a + 1);
            setLastTyped(typed.trim());
            setPhase('showing');
            setStreak(0);
            if (isSupported) {
                speak(`The correct spelling is ${word.word}`);
            }
            showTimerRef.current = setTimeout(() => {
                setTyped('');
                setPhase('retyping');
                if (isSupported) speak(`Now spell ${word.word}`);
            }, SHOW_DURATION_MS);
        }
    }, [typed, word, onAnswer, isSupported, speak]);

    const handleRetypeSubmit = useCallback(() => {
        const correct = typed.trim().toLowerCase() === word.word.toLowerCase();
        if (correct) {
            playDing();
            setPhase('retype-correct');
            if (isSupported) speak(word.word, word.pronunciation);
        } else {
            playBuzzer();
            setPhase('showing');
            showTimerRef.current = setTimeout(() => {
                setTyped('');
                setPhase('retyping');
                if (isSupported) speak(`Try again. Spell ${word.word}`);
            }, SHOW_DURATION_MS);
        }
    }, [typed, word, isSupported, speak]);

    const advanceWord = useCallback(() => {
        cancel();
        usedWordsRef.current.add(word.word.toLowerCase());

        // Check if session target reached
        if (sessionWordsAttempted >= SESSION_TARGET) {
            setSessionTime(Math.round((Date.now() - sessionStartRef.current) / 1000));
            setPhase('summary');
            return;
        }

        const nextRound = round + 1;
        setRound(nextRound);
        setWord(pickWord(nextRound, reviewQueue, usedWordsRef.current));
        setTyped('');
        setPhase('typing');
    }, [round, word, reviewQueue, cancel, sessionWordsAttempted]);

    const handleKeepGoing = useCallback(() => {
        setSessionWordsAttempted(0);
        setSessionWordsCorrect(0);
        sessionStartRef.current = Date.now();
        const nextRound = round + 1;
        setRound(nextRound);
        setWord(pickWord(nextRound, reviewQueue, usedWordsRef.current));
        setTyped('');
        setPhase('typing');
    }, [round, reviewQueue]);

    // Auto-advance after correct celebration
    useEffect(() => {
        if (phase === 'correct' || phase === 'retype-correct') {
            // Longer pause when etymology is shown so user can read it
            const delay = phase === 'correct'
                ? (showEtymology ? 3000 : 2000)
                : 1800;
            const t = setTimeout(advanceWord, delay);
            return () => clearTimeout(t);
        }
    }, [phase, advanceWord, showEtymology]);

    const sessionProgress = sessionWordsAttempted / SESSION_TARGET;

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 landscape-compact-py relative">
            {/* Confetti overlay */}
            <Confetti trigger={showConfetti} intensity={confettiIntensity} />

            {/* Streak badge overlay */}
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

            {/* Top bar */}
            <div className="absolute top-4 left-4 right-4 flex items-center gap-3 z-10">
                <button
                    onClick={onExit}
                    className="w-8 h-8 flex items-center justify-center text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/70 transition-colors shrink-0"
                    aria-label="Back"
                >
                    <ChevronLeft />
                </button>
                <div className="text-sm ui text-[rgb(var(--color-fg))]/50 font-medium flex-1">
                    {sessionWordsAttempted + (phase === 'typing' || phase === 'showing' || phase === 'retyping' ? 1 : 0)}/{SESSION_TARGET} · {wordsCorrect}/{wordsAttempted}
                    {streak >= 2 && <span className="ml-1 text-[var(--color-streak-fire)]">🔥{streak}</span>}
                    {reviewQueue && reviewQueue.length > 0 && (
                        <span className="text-[var(--color-gold)]"> · {reviewQueue.length} to review</span>
                    )}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {/* SESSION SUMMARY */}
                {phase === 'summary' ? (
                    <motion.div
                        key="summary"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-4 w-full max-w-[var(--content-w)]"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                            className="text-5xl"
                        >
                            {sessionWordsCorrect >= 8 ? '🌟' : sessionWordsCorrect >= 5 ? '⭐' : '💪'}
                        </motion.div>
                        <h2 className="text-2xl chalk text-[var(--color-chalk)] font-bold">Session Complete!</h2>
                        <div className="bg-[rgb(var(--color-fg))]/8 rounded-xl px-6 py-4 w-full text-center hand-drawn-box">
                            <div className="text-4xl chalk text-[var(--color-gold)] mb-1">{sessionWordsCorrect}/{SESSION_TARGET}</div>
                            <div className="text-sm ui text-[rgb(var(--color-fg))]/60 font-medium">words spelled correctly</div>
                            {bestStreak >= 3 && (
                                <div className="text-sm ui text-[var(--color-streak-fire)]/70 mt-2">Best streak: {bestStreak} 🔥</div>
                            )}
                            <div className="text-xs ui text-[rgb(var(--color-fg))]/40 mt-2">
                                {Math.floor(sessionTime / 60)}:{String(sessionTime % 60).padStart(2, '0')} elapsed
                            </div>
                        </div>
                        <div className="flex gap-3 mt-2">
                            <Button className="px-6" onClick={handleKeepGoing}>
                                Keep Going
                            </Button>
                            <Button variant="secondary" className="px-6 flex items-center gap-1.5" onClick={onExit}>
                                <ChevronLeft className="w-4 h-4" />
                                Back to Play
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="game" className="flex flex-col items-center gap-4 w-full max-w-[var(--content-w)]">
                        {/* Pronounce button with progress ring */}
                        <div className="relative w-[72px] h-[72px] flex items-center justify-center">
                            <ProgressRing progress={sessionProgress} size={72} />
                            <button
                                onClick={handleRepeat}
                                className="w-16 h-16 rounded-full bg-[var(--color-gold)]/10 border-2 border-[var(--color-gold)]/40 flex items-center justify-center hover:bg-[var(--color-gold)]/20 transition-colors z-10"
                                aria-label="Hear word again"
                            >
                                <IconSpeaker className="w-7 h-7 text-[var(--color-gold)]" />
                            </button>
                        </div>
                        <p className="text-xs ui text-[rgb(var(--color-fg))]/40">
                            {ttsFailed ? 'Audio unavailable' : !isSupported ? 'Audio not available' : usedFallback ? 'Using device voice' : 'Tap to hear again'}
                        </p>
                        {wordsAttempted === 0 && phase === 'typing' && (
                            <div className="text-[10px] ui text-[var(--color-gold)]/50 text-center">
                                Listen, then type the full spelling below
                            </div>
                        )}

                        {/* Definition hint + difficulty dots */}
                        <div className="w-full bg-[rgb(var(--color-fg))]/5 px-4 py-2.5 rounded-xl text-sm ui text-[rgb(var(--color-fg))]/50">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-[var(--color-gold)] uppercase font-bold">Definition</span>
                                <DifficultyDots difficulty={word.difficulty} />
                            </div>
                            {word.definition}
                        </div>

                        {/* Root hint — shown when word has known roots */}
                        {wordRoots.length > 0 && (
                            <div className="w-full bg-[rgb(var(--color-fg))]/5 px-4 py-2 rounded-xl text-xs ui text-[rgb(var(--color-fg))]/45">
                                <span className="text-[10px] text-[var(--color-gold)] uppercase font-bold">Roots: </span>
                                {formatRootHint(wordRoots)}
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {/* TYPING phase — first attempt */}
                            {phase === 'typing' && (
                                <motion.div
                                    key="typing"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                    className="w-full"
                                >
                                    <SpellingInput
                                        value={typed}
                                        onChange={setTyped}
                                        onSubmit={handleSubmit}
                                    />
                                </motion.div>
                            )}

                            {/* CORRECT celebration */}
                            {phase === 'correct' && (
                                <motion.div
                                    key="correct"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center gap-2 py-4"
                                    onClick={advanceWord}
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                                        transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
                                    >
                                        <IconCheck className="w-8 h-8 text-[var(--color-correct)]" />
                                    </motion.div>
                                    <span className="text-xl chalk text-[var(--color-correct)]">{celebrationText}</span>
                                    <span className="text-lg ui font-bold text-[var(--color-chalk)] tracking-widest uppercase">
                                        {word.word}
                                    </span>
                                    {/* Etymology card for competition words */}
                                    {showEtymology && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 }}
                                            className="w-full bg-[rgb(var(--color-fg))]/5 px-4 py-2 rounded-xl text-xs ui text-[rgb(var(--color-fg))]/50 mt-1"
                                        >
                                            <span className="text-[10px] text-[var(--color-gold)] uppercase font-bold">Origin: </span>
                                            {word.etymology}
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}

                            {/* SHOWING phase — display correct spelling with diff */}
                            {phase === 'showing' && (
                                <motion.div
                                    key="showing"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                    className="flex flex-col items-center gap-3 py-4 w-full"
                                >
                                    <SpellingDiffView typed={lastTyped} correct={word.word} />
                                    <div className="w-full max-w-[200px] h-1 bg-[rgb(var(--color-fg))]/10 rounded-full overflow-hidden mt-2">
                                        <motion.div
                                            className="h-full bg-[var(--color-gold)]/60 rounded-full"
                                            initial={{ width: '100%' }}
                                            animate={{ width: '0%' }}
                                            transition={{ duration: SHOW_DURATION_MS / 1000, ease: 'linear' }}
                                        />
                                    </div>
                                    <span className="text-xs ui text-[rgb(var(--color-fg))]/30">Remember it...</span>
                                </motion.div>
                            )}

                            {/* RETYPING phase — second chance */}
                            {phase === 'retyping' && (
                                <motion.div
                                    key="retyping"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                    className="w-full flex flex-col items-center gap-2"
                                >
                                    <span className="text-sm ui text-[var(--color-gold)]">Now type it from memory:</span>
                                    <SpellingInput
                                        value={typed}
                                        onChange={setTyped}
                                        onSubmit={handleRetypeSubmit}
                                    />
                                </motion.div>
                            )}

                            {/* RETYPE-CORRECT — got it on second try */}
                            {phase === 'retype-correct' && (
                                <motion.div
                                    key="retype-correct"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center gap-2 py-4"
                                    onClick={advanceWord}
                                >
                                    <IconCheck className="w-6 h-6 text-[var(--color-gold)]" />
                                    <span className="text-lg chalk text-[var(--color-gold)]">Got it!</span>
                                    <span className="text-lg ui font-bold text-[var(--color-chalk)] tracking-widest uppercase">
                                        {word.word}
                                    </span>
                                    <span className="text-xs ui text-[rgb(var(--color-fg))]/30">You'll see this one again soon</span>
                                    {/* Etymology card for retype-correct too */}
                                    {showEtymology && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 }}
                                            className="w-full bg-[rgb(var(--color-fg))]/5 px-4 py-2 rounded-xl text-xs ui text-[rgb(var(--color-fg))]/50 mt-1"
                                        >
                                            <span className="text-[10px] text-[var(--color-gold)] uppercase font-bold">Origin: </span>
                                            {word.etymology}
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Ready for the Bee? — shown when user has mastered enough words */}
                        {onOpenBee && masteredCount != null && masteredCount >= 20 && wordsCorrect >= 5 && (
                            <Button
                                className="mt-4 w-full py-3"
                                onClick={onOpenBee}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                Ready for the Spelling Bee? 🏆
                            </Button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
