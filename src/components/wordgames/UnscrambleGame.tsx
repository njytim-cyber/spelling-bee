import { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell, GameOverScreen } from './GameShell';
import { pickProgressiveWords, scrambleWord, saveHighScore, getHighScore } from './wordGameUtils';
import { useGameJuice } from './useGameJuice';
import { CountdownOverlay } from './CountdownOverlay';
import { useVisibilityPause } from './useVisibilityPause';
import { Confetti } from '../Confetti';
import type { SpellingWord } from '../../domains/spelling/words';

interface Props { level: number; onExit: (xpEarned: number) => void }

const TIMER_SECS = 60;
const POOL_SIZE = 30;

export const UnscrambleGame = memo(function UnscrambleGame({ level, onExit }: Props) {
    const wordPool = useMemo(() => pickProgressiveWords(Math.max(1, level - 1), POOL_SIZE, 0.3), [level]);
    const [idx, setIdx] = useState(0);
    const [input, setInput] = useState('');
    const [score, setScore] = useState(0);
    const [wordsCorrect, setWordsCorrect] = useState(0);
    const [timeLeft, setTimeLeft] = useState(TIMER_SECS);
    const [gameOver, setGameOver] = useState(false);
    const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
    const [scrambled, setScrambled] = useState('');
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [combo, setCombo] = useState(1);
    const [counting, setCounting] = useState(true);
    const [skipReveal, setSkipReveal] = useState<string | null>(null);
    const juice = useGameJuice();
    const { paused, resume } = useVisibilityPause();
    const inputRef = useRef<HTMLInputElement>(null);
    // eslint-disable-next-line react-hooks/purity
    const wordStartTime = useRef(Date.now());

    const current: SpellingWord | undefined = wordPool[idx];

    // Scramble on word change
    useEffect(() => {
        if (!current) return;
        setScrambled(scrambleWord(current.word));
        wordStartTime.current = Date.now();
    }, [current]);

    // Timer countdown — pauses during countdown or tab blur
    useEffect(() => {
        if (gameOver || counting || paused) return;
        const t = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setGameOver(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [gameOver, counting, paused]);

    // Focus input after countdown
    useEffect(() => {
        if (!counting) inputRef.current?.focus();
    }, [counting]);

    const handleSubmit = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();
        if (!current || gameOver || counting || paused) return;
        const attempt = input.trim().toLowerCase();

        if (attempt === current.word) {
            const elapsed = (Date.now() - wordStartTime.current) / 1000;
            const speedBonus = elapsed < 3 ? 2 : 0;
            const newStreak = streak + 1;
            const newCombo = Math.min(3, 1 + Math.floor(newStreak / 3));
            const basePts = 5 + speedBonus;
            const pts = Math.round(basePts * newCombo);
            setScore(s => s + pts);
            setWordsCorrect(w => w + 1);
            setStreak(newStreak);
            setBestStreak(s => Math.max(s, newStreak));
            setCombo(newCombo);
            setFlash('correct');
            setInput('');
            juice.onCorrect();
            juice.showXpFloat(newCombo > 1 ? `+${pts} x${newCombo}!` : speedBonus ? `+${pts} Fast!` : `+${pts} XP`);
            if (newStreak % 3 === 0) juice.onStreak(newStreak);
            setTimeout(() => {
                setFlash(null);
                setIdx(i => i + 1);
            }, 300);
        } else {
            setFlash('wrong');
            setStreak(0);
            setCombo(1);
            juice.onWrong();
            setTimeout(() => setFlash(null), 300);
        }
    }, [input, current, gameOver, counting, paused, streak, juice]);

    const handleSkip = useCallback(() => {
        if (!current || gameOver || counting || paused) return;
        setSkipReveal(current.word);
        setStreak(0);
        setCombo(1);
        setFlash(null);
        setInput('');
        setTimeout(() => {
            setSkipReveal(null);
            setIdx(i => i + 1);
        }, 800);
    }, [current, gameOver, counting, paused]);

    const timerPct = timeLeft / TIMER_SECS * 100;
    const timerColor = timeLeft <= 5 ? 'var(--color-wrong)' : timeLeft <= 10 ? 'var(--color-streak-fire)' : 'var(--color-gold)';

    const handlePlayAgain = useCallback(() => {
        setScore(0); setWordsCorrect(0); setIdx(0); setTimeLeft(TIMER_SECS);
        setGameOver(false); setInput(''); setStreak(0); setBestStreak(0);
        setCombo(1); setCounting(true);
    }, []);
    const handleExit = useCallback(() => onExit(score), [onExit, score]);

    const handleCountdownDone = useCallback(() => setCounting(false), []);

    // Star rating: 1 star = any, 2 = 10+ words, 3 = 15+ words
    const starCount = wordsCorrect >= 15 ? 3 : wordsCorrect >= 10 ? 2 : wordsCorrect >= 1 ? 1 : 0;

    if (gameOver || !current) {
        const isNew = saveHighScore('unscramble', score);
        return (
            <GameShell title="Unscramble" score={score} onExit={handleExit} level={level}>
                <GameOverScreen emoji="⏱️" title="Time's Up!" score={score}
                    subtitle={`${wordsCorrect} words unscrambled`} isNewHigh={isNew} highScore={getHighScore('unscramble')}
                    onPlayAgain={handlePlayAgain} onExit={handleExit}
                    gameName="Unscramble" stars={starCount}
                    stats={[
                        { label: 'Words', value: wordsCorrect },
                        { label: 'Best Streak', value: bestStreak },
                        { label: 'Best Combo', value: `x${Math.min(3, 1 + Math.floor(bestStreak / 3))}` },
                    ]}
                />
            </GameShell>
        );
    }

    return (
        <GameShell
            title="Unscramble"
            score={score}
            onExit={handleExit}
            level={level}
            combo={combo}
            paused={paused}
            onResume={resume}
            screenFlash={juice.screenFlash} shake={juice.shake}
            topRight={
                <div className="relative w-9 h-9">
                    <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="rgb(var(--color-fg))" strokeWidth="2" opacity="0.1" />
                        <circle
                            cx="18" cy="18" r="15" fill="none"
                            stroke={timerColor}
                            strokeWidth="2.5"
                            strokeDasharray={`${timerPct * 0.9425} 94.25`}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                        />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-[10px] ui font-bold ${timeLeft <= 5 ? 'animate-pulse' : ''}`} style={{ color: timerColor }}>
                        {timeLeft}
                    </span>
                </div>
            }
        >
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm gap-6">
                {/* Scrambled word — slides in from right, exits left */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: 60 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -60 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="text-center"
                    >
                        <div className="flex gap-2 justify-center mb-3">
                            {scrambled.split('').map((ch, i) => (
                                <motion.span
                                    key={`${idx}-${i}`}
                                    initial={{ scale: 0, rotate: -15 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 15 }}
                                    className="w-11 h-11 rounded-lg bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/30 flex items-center justify-center text-2xl chalk text-[var(--color-gold)]"
                                >
                                    {ch}
                                </motion.span>
                            ))}
                        </div>
                        <p className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-2">{current.definition}</p>
                        <button
                            onClick={() => setScrambled(scrambleWord(current.word))}
                            className="text-[9px] ui text-[rgb(var(--color-fg))]/25 hover:text-[var(--color-gold)] transition-colors"
                        >
                            🔀 Re-shuffle
                        </button>
                    </motion.div>
                </AnimatePresence>

                {/* Skip reveal flash */}
                <AnimatePresence>
                    {skipReveal && (
                        <motion.p
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-sm chalk text-[var(--color-wrong)]/70"
                        >
                            {skipReveal}
                        </motion.p>
                    )}
                </AnimatePresence>

                {/* Input */}
                <form onSubmit={handleSubmit} className="w-full">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Type the word..."
                        className={`w-full py-3 px-4 rounded-xl border-2 bg-[rgb(var(--color-fg))]/5 text-[var(--color-chalk)] chalk text-lg text-center placeholder:text-[rgb(var(--color-fg))]/20 focus:outline-none transition-colors ${
                            flash === 'correct'
                                ? 'border-[var(--color-correct)]/60'
                                : flash === 'wrong'
                                    ? 'border-[var(--color-wrong)]/60 animate-[wrong-shake_0.3s]'
                                    : 'border-[var(--color-gold)]/40 focus:border-[var(--color-gold)]/60'
                        }`}
                    />
                </form>

                {/* Skip + stats */}
                <div className="flex items-center gap-4">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleSkip}
                        className="text-[10px] ui text-[rgb(var(--color-fg))]/35 hover:text-[rgb(var(--color-fg))]/60 transition-colors underline underline-offset-2"
                    >
                        Skip word
                    </motion.button>
                    <p className="text-[10px] ui text-[rgb(var(--color-fg))]/30">
                        {wordsCorrect} words · {score} XP
                        {streak >= 2 && <span className="ml-1 text-[var(--color-streak-fire)]"> {streak}🔥</span>}
                    </p>
                </div>

                {/* Floating XP */}
                <AnimatePresence>
                    {juice.xpFloat && (
                        <motion.div key={juice.xpFloat.key} initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -40 }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="text-sm chalk text-[var(--color-gold)] font-bold pointer-events-none">
                            {juice.xpFloat.text}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Urgency vignette */}
            {timeLeft <= 5 && !counting && (
                <div className="absolute inset-0 pointer-events-none rounded-xl animate-pulse"
                    style={{ boxShadow: 'inset 0 0 80px rgba(248,113,113,0.2)' }} />
            )}

            {counting && <CountdownOverlay onComplete={handleCountdownDone} />}
            <Confetti trigger={juice.confettiTrigger} intensity={juice.confettiIntensity} />
        </GameShell>
    );
});
