import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell, GameOverScreen } from './GameShell';
import { pickProgressiveWords, saveHighScore, getHighScore } from './wordGameUtils';
import { useGameJuice } from './useGameJuice';
import { CountdownOverlay } from './CountdownOverlay';
import { useVisibilityPause } from './useVisibilityPause';
import { Confetti } from '../Confetti';
import type { SpellingWord } from '../../domains/spelling/words';

interface Props { level: number; onExit: (xpEarned: number) => void }

interface FallingWord {
    id: number;
    word: SpellingWord;
    lane: number;      // 0..NUM_LANES-1
    spawnedAt: number;  // Date.now() when spawned
    matched: number;
    exploding: boolean;
    fallen: boolean;    // reached bottom
}

const MAX_LIVES = 3;
const WORD_POOL_SIZE = 40;
const NUM_LANES = 3;

type SpeedSetting = 'slow' | 'normal' | 'fast';
const SPEED_CONFIG: Record<SpeedSetting, { label: string; fallDuration: number; spawnInterval: number; color: string }> = {
    slow:   { label: 'Slow',   fallDuration: 12000, spawnInterval: 4500, color: 'var(--color-correct)' },
    normal: { label: 'Normal', fallDuration: 8000,  spawnInterval: 3500, color: 'var(--color-gold)' },
    fast:   { label: 'Fast',   fallDuration: 5000,  spawnInterval: 2500, color: 'var(--color-wrong)' },
};

// Lane x-positions (percentage) — spaced to avoid overlap
const LANE_X = [20, 50, 80];

export const TypingDefenderGame = memo(function TypingDefenderGame({ level, onExit }: Props) {
    const wordPool = useRef(pickProgressiveWords(Math.max(1, level - 1), WORD_POOL_SIZE, 0.3));
    const [words, setWords] = useState<FallingWord[]>([]);
    const [input, setInput] = useState('');
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(MAX_LIVES);
    const [defended, setDefended] = useState(0);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [combo, setCombo] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [speedSetting, setSpeedSetting] = useState<SpeedSetting>('normal');
    const [lastDestroyed, setLastDestroyed] = useState<{ word: string; def: string } | null>(null);
    const [counting, setCounting] = useState(true);
    const [inputFlash, setInputFlash] = useState(false);
    const juice = useGameJuice();
    const { paused, resume } = useVisibilityPause();
    const nextId = useRef(0);
    const poolIdx = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastLane = useRef(0);
    const livesRef = useRef(MAX_LIVES);

    const cfg = SPEED_CONFIG[speedSetting];

    // Keep livesRef in sync
    useEffect(() => { livesRef.current = lives; }, [lives]);

    // Focus input after countdown
    useEffect(() => {
        if (!counting) inputRef.current?.focus();
    }, [counting]);

    // Pick next lane that doesn't overlap with previous
    const getNextLane = useCallback(() => {
        let lane = Math.floor(Math.random() * NUM_LANES);
        // Avoid same lane as last spawn
        if (lane === lastLane.current) lane = (lane + 1) % NUM_LANES;
        lastLane.current = lane;
        return lane;
    }, []);

    // Spawn words — pauses during countdown or tab blur
    useEffect(() => {
        if (gameOver || counting || paused) return;
        const spawn = () => {
            const pool = wordPool.current;
            if (poolIdx.current >= pool.length) poolIdx.current = 0;
            const w = pool[poolIdx.current++];
            if (!w) return;
            setWords(prev => {
                if (prev.filter(fw => !fw.exploding && !fw.fallen).length >= NUM_LANES) return prev;
                return [...prev, {
                    id: nextId.current++,
                    word: w,
                    lane: getNextLane(),
                    spawnedAt: Date.now(),
                    matched: 0,
                    exploding: false,
                    fallen: false,
                }];
            });
        };
        spawn();
        const timer = setInterval(spawn, cfg.spawnInterval);
        return () => clearInterval(timer);
    }, [gameOver, counting, paused, cfg.spawnInterval, getNextLane]);

    // Check for words that have reached the bottom
    useEffect(() => {
        if (gameOver || counting || paused) return;
        const check = () => {
            const now = Date.now();
            setWords(prev => {
                let livesLost = 0;
                const next = prev.map(w => {
                    if (w.exploding || w.fallen) return w;
                    if (now - w.spawnedAt >= cfg.fallDuration) {
                        livesLost++;
                        return { ...w, fallen: true };
                    }
                    return w;
                });

                if (livesLost > 0) {
                    const newLives = livesRef.current - livesLost;
                    setLives(Math.max(0, newLives));
                    setStreak(0);
                    setCombo(1);
                    juice.onWrong();
                    if (newLives <= 0) setGameOver(true);
                }

                // Clean up old fallen/exploded words
                return next.filter(w => {
                    if (w.fallen) return now - w.spawnedAt < cfg.fallDuration + 500;
                    if (w.exploding) return now - w.spawnedAt < cfg.fallDuration + 1000;
                    return true;
                });
            });
        };
        const timer = setInterval(check, 200);
        return () => clearInterval(timer);
    }, [gameOver, counting, paused, cfg.fallDuration, juice]);

    const handleInput = useCallback((val: string) => {
        if (gameOver || counting || paused) return;
        const lower = val.toLowerCase();
        setInput(val);

        setWords(prev => {
            const matchIdx = prev.findIndex(w => !w.exploding && !w.fallen && w.word.word.startsWith(lower) && lower.length > 0);
            if (matchIdx < 0) return prev;

            const updated = [...prev];
            const w = updated[matchIdx];
            updated[matchIdx] = { ...w, matched: lower.length };

            if (lower === w.word.word) {
                updated[matchIdx] = { ...w, matched: w.word.word.length, exploding: true };
                setInput('');
                setDefended(d => d + 1);
                const newStreak = streak + 1;
                setStreak(newStreak);
                setBestStreak(s => Math.max(s, newStreak));
                const newCombo = newStreak >= 5 ? 2 : newStreak >= 3 ? 1.5 : 1;
                setCombo(Math.round(newCombo));
                const basePts = 5 + ((newStreak) % 5 === 0 ? 10 : 0);
                const pts = Math.round(basePts * newCombo);
                setScore(s => s + pts);
                setLastDestroyed({ word: w.word.word, def: w.word.definition });
                setTimeout(() => setLastDestroyed(null), 1500);
                setInputFlash(true);
                setTimeout(() => setInputFlash(false), 300);
                juice.onCorrect();
                juice.showXpFloat(newCombo > 1 ? `+${pts} x${Math.round(newCombo)}!` : `+${pts} XP`);
                if (newStreak % 5 === 0) juice.onStreak(newStreak);
            }

            return updated;
        });
    }, [gameOver, counting, paused, streak, juice]);

    const handlePlayAgain = useCallback(() => {
        setScore(0); setLives(MAX_LIVES); setDefended(0); setStreak(0); setBestStreak(0);
        setLastDestroyed(null); setCombo(1);
        setGameOver(false); setWords([]); setInput('');
        poolIdx.current = 0;
        wordPool.current = pickProgressiveWords(Math.max(1, level - 1), WORD_POOL_SIZE, 0.3);
        setCounting(true);
    }, [level]);
    const handleExit = useCallback(() => onExit(score), [onExit, score]);
    const handleCountdownDone = useCallback(() => setCounting(false), []);

    const starCount = defended >= 20 ? 3 : defended >= 12 ? 2 : defended >= 1 ? 1 : 0;

    if (gameOver) {
        const isNew = saveHighScore('typing-defender', score);
        return (
            <GameShell title="Type Defense" score={score} onExit={handleExit} level={level}>
                <GameOverScreen emoji="🛡️" title="Game Over!" score={score}
                    subtitle={`${defended} words defended`} isNewHigh={isNew} highScore={getHighScore('typing-defender')}
                    onPlayAgain={handlePlayAgain} onExit={handleExit}
                    gameName="Type Defense" stars={starCount}
                    stats={[
                        { label: 'Defended', value: defended },
                        { label: 'Best Streak', value: bestStreak },
                        { label: 'Speed', value: SPEED_CONFIG[speedSetting].label },
                    ]}
                />
            </GameShell>
        );
    }

    return (
        <GameShell
            title="Type Defense"
            score={score}
            onExit={handleExit}
            level={level}
            combo={combo > 1 ? combo : undefined}
            paused={paused}
            onResume={resume}
            screenFlash={juice.screenFlash} shake={juice.shake}
            topRight={
                <div className="flex items-center gap-2">
                    {streak >= 3 && (
                        <motion.span
                            key={streak}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-[10px] ui font-bold text-[var(--color-streak-fire)]"
                        >{streak}🔥</motion.span>
                    )}
                    <div className="flex items-center gap-0.5">
                        {Array.from({ length: MAX_LIVES }).map((_, i) => (
                            <motion.span
                                key={i}
                                animate={i === lives ? { scale: [1, 0.5, 0], opacity: [1, 0.5, 0] } : {}}
                                transition={{ duration: 0.3 }}
                                className={`text-sm ${i < lives ? '' : 'opacity-20 grayscale'}`}
                            >❤️</motion.span>
                        ))}
                    </div>
                </div>
            }
        >
            <div className="flex-1 flex flex-col w-full max-w-sm relative">
                {/* Speed toggle */}
                <div className="flex items-center justify-center gap-1 py-1">
                    {(Object.keys(SPEED_CONFIG) as SpeedSetting[]).map(s => (
                        <button
                            key={s}
                            onClick={() => setSpeedSetting(s)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] ui transition-colors ${
                                speedSetting === s
                                    ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)] font-bold'
                                    : 'text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50'
                            }`}
                        >
                            {SPEED_CONFIG[s].label}
                        </button>
                    ))}
                </div>

                {/* Falling words zone */}
                <div className="flex-1 relative min-h-[300px] overflow-hidden">
                    {/* Lane guide lines */}
                    {LANE_X.map((x, i) => (
                        <div
                            key={i}
                            className="absolute top-0 bottom-0 w-px border-l border-dashed border-[rgb(var(--color-fg))]/[0.04]"
                            style={{ left: `${x}%` }}
                        />
                    ))}

                    <AnimatePresence>
                        {words.map(w => {
                            const elapsed = Date.now() - w.spawnedAt;
                            const remaining = Math.max(0, cfg.fallDuration - elapsed);
                            return (
                                <motion.div
                                    key={w.id}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={w.exploding
                                        ? { opacity: 0, scale: 0.3, transition: { duration: 0.4 } }
                                        : { opacity: w.fallen ? 0.3 : 1, scale: 1 }
                                    }
                                    exit={{ opacity: 0 }}
                                    className="absolute -translate-x-1/2"
                                    style={{
                                        left: `${LANE_X[w.lane]}%`,
                                        top: w.exploding ? undefined : '0%',
                                        transform: w.exploding ? undefined : `translateX(-50%) translateY(0)`,
                                        transition: w.exploding ? undefined : `top ${remaining}ms linear`,
                                        ...(w.exploding ? {} : { top: '100%', transitionDuration: `${remaining}ms` }),
                                    }}
                                >
                                    {/* Letter scatter on explode */}
                                    {w.exploding ? (
                                        <span className="flex">
                                            {w.word.word.split('').map((ch, i) => (
                                                <motion.span
                                                    key={i}
                                                    initial={{ x: 0, y: 0, opacity: 1 }}
                                                    animate={{
                                                        x: (Math.random() - 0.5) * 80,
                                                        y: (Math.random() - 0.5) * 60,
                                                        opacity: 0,
                                                        scale: 1.5,
                                                        rotate: (Math.random() - 0.5) * 90,
                                                    }}
                                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                                    className="text-lg chalk text-[var(--color-correct)]"
                                                >
                                                    {ch}
                                                </motion.span>
                                            ))}
                                        </span>
                                    ) : (
                                        <span className="text-lg chalk whitespace-nowrap">
                                            {w.word.word.split('').map((ch, i) => (
                                                <span
                                                    key={i}
                                                    className={i < w.matched ? 'text-[var(--color-correct)]' : 'text-[var(--color-chalk)]'}
                                                >
                                                    {ch}
                                                </span>
                                            ))}
                                        </span>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Destroyed word flash */}
                    <AnimatePresence>
                        {lastDestroyed && (
                            <motion.div
                                key={lastDestroyed.word}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute bottom-8 left-0 right-0 text-center pointer-events-none"
                            >
                                <span className="text-[10px] ui text-[var(--color-correct)]/60 bg-[var(--color-correct)]/10 px-3 py-1 rounded-full">
                                    {lastDestroyed.word}: {lastDestroyed.def.length > 50 ? lastDestroyed.def.slice(0, 50) + '…' : lastDestroyed.def}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Danger zone gradient */}
                    <div className="absolute bottom-0 left-0 right-0 h-[15%] pointer-events-none"
                        style={{ background: 'linear-gradient(to top, rgba(248,113,113,0.12) 0%, transparent 100%)' }} />
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--color-wrong)]/30" />
                </div>

                {/* Input */}
                <div className="py-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => handleInput(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Type the falling words..."
                        className={`w-full py-3 px-4 rounded-xl border-2 bg-[rgb(var(--color-fg))]/5 text-[var(--color-chalk)] chalk text-lg text-center placeholder:text-[rgb(var(--color-fg))]/20 focus:outline-none transition-colors ${
                            inputFlash
                                ? 'border-[var(--color-correct)]/60'
                                : 'border-[var(--color-gold)]/40 focus:border-[var(--color-gold)]/60'
                        }`}
                    />
                </div>

                {/* Floating XP */}
                <AnimatePresence>
                    {juice.xpFloat && (
                        <motion.div key={juice.xpFloat.key} initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -40 }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 text-sm chalk text-[var(--color-gold)] font-bold pointer-events-none">
                            {juice.xpFloat.text}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {counting && <CountdownOverlay onComplete={handleCountdownDone} />}
            <Confetti trigger={juice.confettiTrigger} intensity={juice.confettiIntensity} />
        </GameShell>
    );
});
