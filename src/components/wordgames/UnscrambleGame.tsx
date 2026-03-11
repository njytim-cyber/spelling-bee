import { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GameShell, GameOverScreen } from './GameShell';
import { pickProgressiveWords, scrambleWord, saveHighScore, getHighScore } from './wordGameUtils';
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

    // Timer countdown
    useEffect(() => {
        if (gameOver) return;
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
    }, [gameOver]);

    // Focus input
    useEffect(() => { inputRef.current?.focus(); }, []);

    const handleSubmit = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();
        if (!current || gameOver) return;
        const attempt = input.trim().toLowerCase();

        if (attempt === current.word) {
            const elapsed = (Date.now() - wordStartTime.current) / 1000;
            const speedBonus = elapsed < 3 ? 2 : 0;
            setScore(s => s + 5 + speedBonus);
            setWordsCorrect(w => w + 1);
            setStreak(s => s + 1);
            setFlash('correct');
            setInput('');
            setTimeout(() => {
                setFlash(null);
                setIdx(i => i + 1);
            }, 300);
        } else {
            setFlash('wrong');
            setStreak(0);
            setTimeout(() => setFlash(null), 300);
        }
    }, [input, current, gameOver]);

    const handleSkip = useCallback(() => {
        if (!current || gameOver) return;
        setStreak(0);
        setFlash(null);
        setInput('');
        setIdx(i => i + 1);
    }, [current, gameOver]);

    const timerPct = timeLeft / TIMER_SECS * 100;
    const timerColor = timeLeft <= 10 ? 'var(--color-wrong)' : 'var(--color-gold)';

    const handlePlayAgain = useCallback(() => {
        setScore(0); setWordsCorrect(0); setIdx(0); setTimeLeft(TIMER_SECS); setGameOver(false); setInput(''); setStreak(0);
    }, []);
    const handleExit = useCallback(() => onExit(score), [onExit, score]);

    if (gameOver || !current) {
        const isNew = saveHighScore('unscramble', score);
        return (
            <GameShell title="Unscramble" score={score} onExit={handleExit}>
                <GameOverScreen emoji="⏱️" title="Time's Up!" score={score}
                    subtitle={`${wordsCorrect} words unscrambled`} isNewHigh={isNew} highScore={getHighScore('unscramble')}
                    onPlayAgain={handlePlayAgain} onExit={handleExit} />
            </GameShell>
        );
    }

    return (
        <GameShell
            title="Unscramble"
            score={score}
            onExit={handleExit}
            topRight={
                <div className="relative w-8 h-8">
                    {/* Timer ring */}
                    <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="rgb(var(--color-fg))" strokeWidth="2" opacity="0.1" />
                        <circle
                            cx="18" cy="18" r="15" fill="none"
                            stroke={timerColor}
                            strokeWidth="2"
                            strokeDasharray={`${timerPct * 0.9425} 94.25`}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] ui font-bold" style={{ color: timerColor }}>
                        {timeLeft}
                    </span>
                </div>
            }
        >
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm gap-6">
                {/* Scrambled word */}
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="flex gap-1.5 justify-center mb-3">
                        {scrambled.split('').map((ch, i) => (
                            <span
                                key={`${idx}-${i}`}
                                className="w-9 h-9 rounded-lg bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/30 flex items-center justify-center text-xl chalk text-[var(--color-gold)]"
                            >
                                {ch}
                            </span>
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
            </div>
        </GameShell>
    );
});
