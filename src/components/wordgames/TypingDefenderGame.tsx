import { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell, GameOverScreen } from './GameShell';
import { pickProgressiveWords, saveHighScore, getHighScore } from './wordGameUtils';
import { useGameJuice } from './useGameJuice';
import { CountdownOverlay } from './CountdownOverlay';
import { useVisibilityPause } from './useVisibilityPause';
import { Confetti } from '../Confetti';
import { playFreezeSound } from '../../utils/soundEffects';
import type { SpellingWord } from '../../domains/spelling/words';

interface Props { level: number; onExit: (xpEarned: number) => void }

interface FallingWord {
    id: number;
    word: SpellingWord;
    lane: number;
    spawnedAt: number;
    matched: number;
    exploding: boolean;
    fallen: boolean;
    frozenUntil: number; // Date.now() timestamp until frozen (0 = not frozen)
}

const MAX_LIVES = 3;
const NUM_LANES = 3;
const FREEZE_DURATION = 3000;
const FREEZE_EARN_EVERY = 8; // earn a freeze bomb every N words defended
const CLOSE_SAVE_THRESHOLD = 0.8; // 80% fallen = close save

type SpeedSetting = 'slow' | 'normal' | 'fast';
const SPEED_CONFIG: Record<SpeedSetting, { label: string; fallDuration: number; spawnInterval: number }> = {
    slow:   { label: 'Slow',   fallDuration: 12000, spawnInterval: 4500 },
    normal: { label: 'Normal', fallDuration: 8000,  spawnInterval: 3500 },
    fast:   { label: 'Fast',   fallDuration: 5000,  spawnInterval: 2500 },
};

// Wave config: words per wave escalates
function waveWordCount(wave: number): number { return Math.min(12, 3 + wave); }
function waveFallMultiplier(wave: number): number { return Math.max(0.5, 1 - (wave - 1) * 0.08); }
function waveSpawnMultiplier(wave: number): number { return Math.max(0.5, 1 - (wave - 1) * 0.06); }
function waveDifficulty(level: number, wave: number): number {
    if (wave <= 3) return Math.max(1, level - 1);
    if (wave <= 6) return level;
    return Math.min(10, level + 1);
}

// Combo tiers
function comboTier(streak: number): { mult: number; label: string; color: string } {
    if (streak >= 8) return { mult: 3, label: 'FEVER!', color: 'var(--color-wrong)' };
    if (streak >= 5) return { mult: 2, label: 'HOT!', color: 'var(--color-streak-fire)' };
    if (streak >= 3) return { mult: 1.5, label: 'WARM', color: 'var(--color-gold)' };
    return { mult: 1, label: '', color: '' };
}

const LANE_X = [20, 50, 80];

// Keystroke particle
interface KeyParticle {
    id: number;
    x: number;
    y: number;
}

export const TypingDefenderGame = memo(function TypingDefenderGame({ level, onExit }: Props) {
    // ── Wave state ──
    const [wave, setWave] = useState(1);
    const [, setWaveWordsSpawned] = useState(0);
    const [waveWordsCleared, setWaveWordsCleared] = useState(0);
    const [showWaveBanner, setShowWaveBanner] = useState(false);
    const [betweenWaves, setBetweenWaves] = useState(false);

    // ── Game state ──
    const [words, setWords] = useState<FallingWord[]>([]);
    const [input, setInput] = useState('');
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(MAX_LIVES);
    const [defended, setDefended] = useState(0);
    const [totalSpawned, setTotalSpawned] = useState(0);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [, setBestCombo] = useState(1);
    const [closeSaves, setCloseSaves] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [speedSetting, setSpeedSetting] = useState<SpeedSetting>('normal');
    const [lastDestroyed, setLastDestroyed] = useState<{ word: string; def: string } | null>(null);
    const [counting, setCounting] = useState(true);
    const [inputFlash, setInputFlash] = useState<'correct' | 'wrong' | null>(null);
    const [startTime, setStartTime] = useState(() => Date.now());

    // ── Freeze bomb ──
    const [freezeCharges, setFreezeCharges] = useState(0);
    const [freezeActive, setFreezeActive] = useState(false);

    // ── Keystroke particles ──
    const [keyParticles, setKeyParticles] = useState<KeyParticle[]>([]);
    const particleId = useRef(0);

    // ── Close save flash ──
    const [closeSaveFlash, setCloseSaveFlash] = useState<string | null>(null);

    const juice = useGameJuice();
    const { paused, resume } = useVisibilityPause();
    const nextId = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastLane = useRef(0);
    const livesRef = useRef(MAX_LIVES);
    const wordPoolRef = useRef<SpellingWord[]>([]);
    const poolIdxRef = useRef(0);

    const cfg = SPEED_CONFIG[speedSetting];
    const currentCombo = comboTier(streak);

    // ── Derived ──

    const wpm = useMemo(() => {
        const secs = (Date.now() - startTime) / 1000;
        if (secs < 5 || defended === 0) return 0;
        return Math.round((defended / secs) * 60);
    }, [defended, startTime, gameOver]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { livesRef.current = lives; }, [lives]);
    useEffect(() => { if (!counting) inputRef.current?.focus(); }, [counting]);

    // ── Build word pool for current wave ──
    const refillPool = useCallback((w: number) => {
        const diff = waveDifficulty(level, w);
        wordPoolRef.current = pickProgressiveWords(Math.max(1, diff), 60, 0.2);
        poolIdxRef.current = 0;
    }, [level]);

    // Initial pool
    useEffect(() => { refillPool(1); }, [refillPool]);

    const getNextLane = useCallback(() => {
        let lane = Math.floor(Math.random() * NUM_LANES);
        if (lane === lastLane.current) lane = (lane + 1) % NUM_LANES;
        lastLane.current = lane;
        return lane;
    }, []);

    // ── Wave transition ──
    const startNextWave = useCallback((nextWave: number) => {
        setShowWaveBanner(true);
        setBetweenWaves(true);
        setWaveWordsSpawned(0);
        setWaveWordsCleared(0);
        refillPool(nextWave);
        setTimeout(() => {
            setShowWaveBanner(false);
            setTimeout(() => setBetweenWaves(false), 500);
        }, 1500);
    }, [refillPool]);

    // ── Check if wave is complete ──
    useEffect(() => {
        if (gameOver || counting || betweenWaves) return;
        const needed = waveWordCount(wave);
        if (waveWordsCleared >= needed && words.filter(w => !w.exploding && !w.fallen).length === 0) {
            const next = wave + 1;
            setWave(next);
            startNextWave(next);
        }
    }, [waveWordsCleared, wave, words, gameOver, counting, betweenWaves, startNextWave]);

    // ── Spawn words ──
    useEffect(() => {
        if (gameOver || counting || paused || betweenWaves) return;
        const needed = waveWordCount(wave);
        const spawnMs = cfg.spawnInterval * waveSpawnMultiplier(wave);

        const spawn = () => {
            setWaveWordsSpawned(prev => {
                if (prev >= needed) return prev;
                const pool = wordPoolRef.current;
                if (poolIdxRef.current >= pool.length) poolIdxRef.current = 0;
                const w = pool[poolIdxRef.current++];
                if (!w) return prev;
                setWords(prevWords => {
                    if (prevWords.filter(fw => !fw.exploding && !fw.fallen).length >= NUM_LANES) return prevWords;
                    setTotalSpawned(t => t + 1);
                    return [...prevWords, {
                        id: nextId.current++,
                        word: w,
                        lane: getNextLane(),
                        spawnedAt: Date.now(),
                        matched: 0,
                        exploding: false,
                        fallen: false,
                        frozenUntil: 0,
                    }];
                });
                return prev + 1;
            });
        };
        spawn();
        const timer = setInterval(spawn, spawnMs);
        return () => clearInterval(timer);
    }, [gameOver, counting, paused, betweenWaves, wave, cfg.fallDuration, cfg.spawnInterval, getNextLane]);

    // ── Check for words reaching bottom ──
    useEffect(() => {
        if (gameOver || counting || paused) return;
        const check = () => {
            const now = Date.now();
            const fallMs = cfg.fallDuration * waveFallMultiplier(wave);
            setWords(prev => {
                let livesLost = 0;
                const next = prev.map(w => {
                    if (w.exploding || w.fallen) return w;
                    // Frozen words don't fall
                    if (w.frozenUntil > now) return w;
                    // Adjust spawn time for freeze duration
                    const effectiveElapsed = now - w.spawnedAt - Math.max(0, w.frozenUntil > 0 ? FREEZE_DURATION : 0);
                    if (effectiveElapsed >= fallMs) {
                        livesLost++;
                        return { ...w, fallen: true };
                    }
                    return w;
                });

                if (livesLost > 0) {
                    const newLives = livesRef.current - livesLost;
                    setLives(Math.max(0, newLives));
                    setStreak(0);
                    juice.onWrong();
                    if (newLives <= 0) setGameOver(true);
                }

                return next.filter(w => {
                    if (w.fallen) return now - w.spawnedAt < fallMs + 500;
                    if (w.exploding) return now - w.spawnedAt < fallMs + 1000;
                    return true;
                });
            });
        };
        const timer = setInterval(check, 200);
        return () => clearInterval(timer);
    }, [gameOver, counting, paused, cfg.fallDuration, wave, juice]);

    // ── Handle input ──
    const handleInput = useCallback((val: string) => {
        if (gameOver || counting || paused || betweenWaves) return;
        const lower = val.toLowerCase();
        setInput(val);

        setWords(prev => {
            const matchIdx = prev.findIndex(w => !w.exploding && !w.fallen && w.word.word.startsWith(lower) && lower.length > 0);

            if (matchIdx < 0 && lower.length > 0) {
                // Wrong keystroke
                setInputFlash('wrong');
                setTimeout(() => setInputFlash(null), 200);
                return prev;
            }
            if (matchIdx < 0) return prev;

            const updated = [...prev];
            const w = updated[matchIdx];
            updated[matchIdx] = { ...w, matched: lower.length };

            // Correct keystroke particle
            setKeyParticles(pp => [...pp, { id: particleId.current++, x: Math.random() * 40 - 20, y: -20 - Math.random() * 20 }]);
            setTimeout(() => setKeyParticles(pp => pp.slice(1)), 600);

            if (lower === w.word.word) {
                // ── Word destroyed ──
                updated[matchIdx] = { ...w, matched: w.word.word.length, exploding: true };
                setInput('');
                setDefended(d => d + 1);
                setWaveWordsCleared(c => c + 1);

                const newStreak = streak + 1;
                setStreak(newStreak);
                setBestStreak(s => Math.max(s, newStreak));
                const tier = comboTier(newStreak);
                setBestCombo(bc => Math.max(bc, tier.mult));

                // Close save detection
                const now = Date.now();
                const fallMs = cfg.fallDuration * waveFallMultiplier(wave);
                const effectiveElapsed = now - w.spawnedAt - (w.frozenUntil > 0 ? FREEZE_DURATION : 0);
                const fallProgress = effectiveElapsed / fallMs;
                const isCloseSave = fallProgress >= CLOSE_SAVE_THRESHOLD;

                const basePts = 5 + (isCloseSave ? 5 : 0) + (newStreak % 5 === 0 ? 10 : 0);
                const pts = Math.round(basePts * tier.mult);
                setScore(s => s + pts);

                if (isCloseSave) {
                    setCloseSaves(c => c + 1);
                    setCloseSaveFlash(w.word.word);
                    setTimeout(() => setCloseSaveFlash(null), 1200);
                }

                setLastDestroyed({ word: w.word.word, def: w.word.definition });
                setTimeout(() => setLastDestroyed(null), 1500);
                setInputFlash('correct');
                setTimeout(() => setInputFlash(null), 300);

                // Freeze charge
                const newDefended = defended + 1;
                if (newDefended > 0 && newDefended % FREEZE_EARN_EVERY === 0) {
                    setFreezeCharges(c => Math.min(c + 1, 2));
                }

                juice.onCorrect();
                const xpText = isCloseSave
                    ? `+${pts} CLOSE SAVE!`
                    : tier.mult > 1
                        ? `+${pts} x${tier.mult}!`
                        : `+${pts} XP`;
                juice.showXpFloat(xpText);
                if (newStreak % 5 === 0) juice.onStreak(newStreak);
            }

            return updated;
        });
    }, [gameOver, counting, paused, betweenWaves, streak, juice, defended, cfg.fallDuration, wave]);

    // ── Freeze bomb ──
    const handleFreeze = useCallback(() => {
        if (freezeCharges <= 0 || freezeActive) return;
        setFreezeCharges(c => c - 1);
        setFreezeActive(true);
        playFreezeSound();

        const freezeUntil = Date.now() + FREEZE_DURATION;
        setWords(prev => prev.map(w =>
            w.exploding || w.fallen ? w : { ...w, frozenUntil: freezeUntil, spawnedAt: w.spawnedAt + FREEZE_DURATION }
        ));
        setTimeout(() => setFreezeActive(false), FREEZE_DURATION);
    }, [freezeCharges, freezeActive]);

    // ── Play again / exit ──
    const handlePlayAgain = useCallback(() => {
        setScore(0); setLives(MAX_LIVES); setDefended(0); setStreak(0); setBestStreak(0);
        setLastDestroyed(null); setCloseSaves(0); setBestCombo(1); setTotalSpawned(0);
        setGameOver(false); setWords([]); setInput(''); setWave(1);
        setWaveWordsSpawned(0); setWaveWordsCleared(0); setFreezeCharges(0);
        setFreezeActive(false); setBetweenWaves(false); setShowWaveBanner(false);
        setStartTime(Date.now());
        refillPool(1);
        setCounting(true);
    }, [refillPool]);
    const handleExit = useCallback(() => onExit(score), [onExit, score]);
    const handleCountdownDone = useCallback(() => setCounting(false), []);

    const starCount = defended >= 20 ? 3 : defended >= 12 ? 2 : defended >= 1 ? 1 : 0;
    const accuracy = totalSpawned > 0 ? Math.round((defended / totalSpawned) * 100) : 0;

    // ── Game Over ──
    if (gameOver) {
        const isNew = saveHighScore('typing-defender', score);
        const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
        const finalWpm = elapsedSecs > 5 ? Math.round((defended / elapsedSecs) * 60) : 0;
        return (
            <GameShell title="Type Defense" score={score} onExit={handleExit} level={level}>
                <GameOverScreen emoji="🛡️" title="Game Over!" score={score}
                    subtitle={`Wave ${wave} • ${defended} words defended`}
                    isNewHigh={isNew} highScore={getHighScore('typing-defender')}
                    onPlayAgain={handlePlayAgain} onExit={handleExit}
                    gameName="Type Defense" stars={starCount}
                    stats={[
                        { label: 'Wave', value: wave },
                        { label: 'Defended', value: defended },
                        { label: 'Accuracy', value: `${accuracy}%` },
                        { label: 'WPM', value: finalWpm },
                        { label: 'Best Streak', value: bestStreak },
                        ...(closeSaves > 0 ? [{ label: 'Close Saves', value: closeSaves }] : []),
                    ]}
                />
            </GameShell>
        );
    }

    // ── Fall progress for danger colors ──
    const now = Date.now();
    const fallMs = cfg.fallDuration * waveFallMultiplier(wave);

    return (
        <GameShell
            title="Type Defense"
            score={score}
            onExit={handleExit}
            level={level}
            combo={currentCombo.mult > 1 ? currentCombo.mult : undefined}
            paused={paused}
            onResume={resume}
            screenFlash={juice.screenFlash} shake={juice.shake}
            topRight={
                <div className="flex items-center gap-2">
                    {/* WPM indicator */}
                    {defended >= 2 && (
                        <span className="text-[9px] ui text-[rgb(var(--color-fg))]/30 tabular-nums">
                            {wpm} wpm
                        </span>
                    )}
                    {/* Streak fire */}
                    {streak >= 3 && (
                        <motion.span
                            key={streak}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-[10px] ui font-bold"
                            style={{ color: currentCombo.color }}
                        >{streak}🔥</motion.span>
                    )}
                    {/* Wave badge */}
                    <span className="text-[9px] ui font-bold text-[var(--color-gold)]/50">W{wave}</span>
                    {/* Lives */}
                    <div className="flex items-center gap-0.5">
                        {Array.from({ length: MAX_LIVES }).map((_, i) => (
                            <motion.span
                                key={i}
                                animate={
                                    i === lives
                                        ? { scale: [1, 0.5, 0], opacity: [1, 0.5, 0] }
                                        : lives === 1 && i === 0
                                            ? { scale: [1, 1.15, 1] }
                                            : {}
                                }
                                transition={
                                    lives === 1 && i === 0
                                        ? { duration: 0.6, repeat: Infinity, repeatType: 'reverse' as const }
                                        : { duration: 0.3 }
                                }
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

                {/* Combo tier banner */}
                <AnimatePresence>
                    {currentCombo.mult >= 2 && (
                        <motion.div
                            key={currentCombo.label}
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="text-center py-0.5"
                        >
                            <span
                                className="text-[11px] ui font-black px-3 py-0.5 rounded-full"
                                style={{
                                    color: currentCombo.color,
                                    background: `color-mix(in srgb, ${currentCombo.color} 15%, transparent)`,
                                    animation: currentCombo.mult >= 3 ? 'pulse 0.8s ease-in-out infinite' : undefined,
                                }}
                            >
                                x{currentCombo.mult} {currentCombo.label}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Falling words zone */}
                <div
                    className="flex-1 relative min-h-[300px] overflow-hidden"
                    style={{
                        // Heat vignette for fever mode
                        boxShadow: currentCombo.mult >= 3
                            ? 'inset 0 0 40px rgba(248,113,113,0.15)'
                            : currentCombo.mult >= 2
                                ? 'inset 0 0 30px rgba(251,191,36,0.08)'
                                : 'none',
                        transition: 'box-shadow 0.5s',
                    }}
                >
                    {/* Freeze overlay */}
                    {freezeActive && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-10 pointer-events-none"
                            style={{ background: 'radial-gradient(ellipse, rgba(147,197,253,0.12) 0%, rgba(147,197,253,0.04) 60%, transparent 100%)' }}
                        />
                    )}

                    {/* Lane guide lines */}
                    {LANE_X.map((x, i) => (
                        <div
                            key={i}
                            className="absolute top-0 bottom-0 w-px border-l border-dashed border-[rgb(var(--color-fg))]/[0.04]"
                            style={{ left: `${x}%` }}
                        />
                    ))}

                    {/* Wave banner */}
                    <AnimatePresence>
                        {showWaveBanner && (
                            <motion.div
                                initial={{ scale: 2.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.6, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                                className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                            >
                                <div className="text-center">
                                    <span className="text-4xl chalk font-bold text-[var(--color-gold)]">
                                        Wave {wave}
                                    </span>
                                    <br />
                                    <span className="text-xs ui text-[rgb(var(--color-fg))]/40">
                                        {waveWordCount(wave)} words incoming
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Falling words */}
                    <AnimatePresence>
                        {words.map(w => {
                            const wordFallMs = w.frozenUntil > 0 && now < w.frozenUntil
                                ? Infinity // frozen, no fall
                                : fallMs;
                            const effectiveElapsed = now - w.spawnedAt;
                            const fallProgress = Math.min(1, effectiveElapsed / fallMs);
                            const isDanger = fallProgress >= 0.75 && !w.exploding && !w.fallen;
                            const isCritical = fallProgress >= 0.9 && !w.exploding && !w.fallen;
                            const isFrozen = w.frozenUntil > now;

                            return (
                                <motion.div
                                    key={w.id}
                                    initial={{ top: '0%', opacity: 0, scale: 0.8 }}
                                    animate={
                                        w.exploding
                                            ? { opacity: 0, scale: 0.3, transition: { duration: 0.4 } }
                                            : w.fallen
                                                ? { top: '100%', opacity: 0.3, scale: 1 }
                                                : isFrozen
                                                    ? { opacity: 1, scale: 1 }
                                                    : {
                                                        top: '100%', opacity: 1, scale: 1,
                                                        transition: {
                                                            top: { duration: wordFallMs / 1000, ease: 'linear' },
                                                            opacity: { duration: 0.2 },
                                                        },
                                                    }
                                    }
                                    exit={{ opacity: 0 }}
                                    className="absolute -translate-x-1/2"
                                    style={{
                                        left: `${LANE_X[w.lane]}%`,
                                        // Glow for longer words
                                        textShadow: w.word.word.length >= 8
                                            ? '0 0 8px rgba(251,191,36,0.3)'
                                            : w.word.word.length >= 6
                                                ? '0 0 4px rgba(251,191,36,0.15)'
                                                : 'none',
                                    }}
                                >
                                    {w.exploding ? (
                                        <span className="flex">
                                            {w.word.word.split('').map((ch, i) => {
                                                const isLong = w.word.word.length >= 7;
                                                const spread = isLong ? 120 : 80;
                                                return (
                                                    <motion.span
                                                        key={i}
                                                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                                        animate={{
                                                            x: (Math.random() - 0.5) * spread,
                                                            y: (Math.random() - 0.5) * (spread * 0.75),
                                                            opacity: 0,
                                                            scale: isLong ? 2 : 1.5,
                                                            rotate: (Math.random() - 0.5) * 120,
                                                        }}
                                                        transition={{ duration: isLong ? 0.7 : 0.5, ease: 'easeOut' }}
                                                        className={`chalk ${isLong ? 'text-xl' : 'text-lg'} text-[var(--color-correct)]`}
                                                    >
                                                        {ch}
                                                    </motion.span>
                                                );
                                            })}
                                        </span>
                                    ) : (
                                        <span className={`text-lg chalk whitespace-nowrap transition-colors ${
                                            isFrozen ? 'opacity-80' : ''
                                        }`}>
                                            {w.word.word.split('').map((ch, i) => (
                                                <motion.span
                                                    key={i}
                                                    animate={
                                                        i === w.matched - 1 && w.matched > 0
                                                            ? { scale: [1, 1.2, 1] }
                                                            : isCritical
                                                                ? { opacity: [1, 0.5, 1] }
                                                                : {}
                                                    }
                                                    transition={
                                                        isCritical
                                                            ? { duration: 0.4, repeat: Infinity }
                                                            : { duration: 0.15 }
                                                    }
                                                    className={
                                                        i < w.matched
                                                            ? 'text-[var(--color-correct)]'
                                                            : isFrozen
                                                                ? 'text-blue-300'
                                                                : isCritical
                                                                    ? 'text-[var(--color-wrong)]'
                                                                    : isDanger
                                                                        ? 'text-[var(--color-streak-fire)]'
                                                                        : 'text-[var(--color-chalk)]'
                                                    }
                                                >
                                                    {ch}
                                                </motion.span>
                                            ))}
                                        </span>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Close save flash */}
                    <AnimatePresence>
                        {closeSaveFlash && (
                            <motion.div
                                key={closeSaveFlash}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="absolute top-1/3 left-0 right-0 text-center pointer-events-none z-10"
                            >
                                <span className="text-sm chalk font-bold text-[var(--color-wrong)] bg-[var(--color-wrong)]/10 px-3 py-1 rounded-full">
                                    CLOSE SAVE! +5
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Destroyed word flash */}
                    <AnimatePresence>
                        {lastDestroyed && (
                            <motion.div
                                key={lastDestroyed.word}
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="absolute bottom-8 left-0 right-0 text-center pointer-events-none"
                            >
                                <span className="text-xs ui text-[var(--color-correct)]/70 bg-[var(--color-correct)]/15 px-4 py-1.5 rounded-full shadow-sm">
                                    <span className="font-bold">{lastDestroyed.word}</span>
                                    <span className="text-[10px] opacity-70"> — {lastDestroyed.def.length > 40 ? lastDestroyed.def.slice(0, 40) + '…' : lastDestroyed.def}</span>
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Danger zone gradient */}
                    <div className="absolute bottom-0 left-0 right-0 h-[15%] pointer-events-none"
                        style={{ background: 'linear-gradient(to top, rgba(248,113,113,0.12) 0%, transparent 100%)' }} />
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--color-wrong)]/30" />
                </div>

                {/* Input + freeze button */}
                <div className="py-3 flex items-center gap-2">
                    <div className="flex-1 relative">
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
                                inputFlash === 'correct'
                                    ? 'border-[var(--color-correct)]/60'
                                    : inputFlash === 'wrong'
                                        ? 'border-[var(--color-wrong)]/60'
                                        : currentCombo.mult >= 3
                                            ? 'border-[var(--color-wrong)]/40'
                                            : currentCombo.mult >= 2
                                                ? 'border-[var(--color-streak-fire)]/40'
                                                : currentCombo.mult >= 1.5
                                                    ? 'border-[var(--color-gold)]/40'
                                                    : 'border-[var(--color-gold)]/20 focus:border-[var(--color-gold)]/40'
                            }`}
                            style={{
                                boxShadow: currentCombo.mult >= 3
                                    ? '0 0 12px rgba(248,113,113,0.2)'
                                    : currentCombo.mult >= 2
                                        ? '0 0 8px rgba(251,191,36,0.15)'
                                        : 'none',
                            }}
                        />
                        {/* Keystroke particles */}
                        <AnimatePresence>
                            {keyParticles.map(p => (
                                <motion.div
                                    key={p.id}
                                    initial={{ opacity: 1, x: '50%', y: 0, scale: 1 }}
                                    animate={{ opacity: 0, x: `calc(50% + ${p.x}px)`, y: p.y, scale: 0.3 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className="absolute top-0 w-1.5 h-1.5 rounded-full bg-[var(--color-correct)] pointer-events-none"
                                />
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Freeze bomb button */}
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={handleFreeze}
                        disabled={freezeCharges <= 0 || freezeActive}
                        className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-all relative ${
                            freezeCharges > 0 && !freezeActive
                                ? 'bg-blue-500/15 border-2 border-blue-400/40 hover:bg-blue-500/25'
                                : 'bg-[rgb(var(--color-fg))]/5 border-2 border-[rgb(var(--color-fg))]/10 opacity-30'
                        }`}
                    >
                        ❄️
                        {freezeCharges > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                                {freezeCharges}
                            </span>
                        )}
                    </motion.button>
                </div>

                {/* Floating XP */}
                <AnimatePresence>
                    {juice.xpFloat && (
                        <motion.div key={juice.xpFloat.key}
                            initial={{ opacity: 1, y: 0, scale: 1 }}
                            animate={{ opacity: 0, y: -50, scale: currentCombo.mult >= 3 ? 1.5 : 1.3 }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`absolute top-1/2 left-1/2 -translate-x-1/2 chalk font-bold pointer-events-none ${
                                currentCombo.mult >= 3 ? 'text-lg text-[var(--color-wrong)]' : 'text-sm text-[var(--color-gold)]'
                            }`}>
                            {juice.xpFloat.text}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Last-life urgency vignette */}
            {lives === 1 && !counting && !gameOver && (
                <div
                    className="absolute inset-0 pointer-events-none z-[5] animate-pulse"
                    style={{ boxShadow: 'inset 0 0 60px rgba(248,113,113,0.15)' }}
                />
            )}
            {counting && <CountdownOverlay onComplete={handleCountdownDone} />}
            <Confetti trigger={juice.confettiTrigger} intensity={juice.confettiIntensity} />
        </GameShell>
    );
});
