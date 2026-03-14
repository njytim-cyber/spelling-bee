import { memo, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell, GameOverScreen } from './GameShell';
import { pickAnagramWords, shuffle, saveHighScore, getHighScore } from './wordGameUtils';
import { useGameJuice } from './useGameJuice';
import { Confetti } from '../Confetti';
import { playTapSound, playSnapSound } from '../../utils/soundEffects';
import type { SpellingWord } from '../../domains/spelling/words';
import { getWordMap } from '../../domains/spelling/words';

interface Props { level: number; onExit: (xpEarned: number) => void }

const CHEERS_PERFECT = ['Flawless!', 'Nailed it!', 'Brilliant!', 'Superb!', 'No hesitation!'];
const CHEERS_CORRECT = ['Nice!', 'Got it!', 'Well done!', 'Sorted!', 'Good eye!'];
const CHEERS_FAST = ['Lightning!', 'Blazing!', 'Speed demon!', 'Instant!'];

type Difficulty = 'easy' | 'medium' | 'hard';

const ROUND_SIZE = 10;
const WORD_TIME_LIMIT = 15; // seconds per word for the pressure bar

const DIFF_CONFIG: Record<Difficulty, { label: string; emoji: string; desc: string }> = {
    easy:   { label: 'Easy',   emoji: '🌱', desc: '3–5 letter words' },
    medium: { label: 'Medium', emoji: '🌿', desc: '5–7 letter words' },
    hard:   { label: 'Hard',   emoji: '🌳', desc: '7+ letter words' },
};

/** Combo multiplier based on streak */
function getCombo(streak: number): { mult: number; label: string } {
    if (streak >= 8) return { mult: 3, label: 'x3' };
    if (streak >= 4) return { mult: 2, label: 'x2' };
    return { mult: 1, label: '' };
}

export const AnagramsGame = memo(function AnagramsGame({ level, onExit }: Props) {
    const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
    const [seed, setSeed] = useState(0);
    const words = useMemo(
        () => difficulty ? pickAnagramWords(level, ROUND_SIZE, difficulty) : [],
        [level, difficulty, seed], // eslint-disable-line react-hooks/exhaustive-deps
    );
    const [idx, setIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [totalScore, setTotalScore] = useState(0);
    const [pool, setPool] = useState<{ letter: string; id: number }[]>([]);
    const [placed, setPlaced] = useState<{ letter: string; id: number }[]>([]);
    const [noBacktrack, setNoBacktrack] = useState(true);
    const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
    const [done, setDone] = useState(false);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [hintUsed, setHintUsed] = useState(false);
    const [hintLetter, setHintLetter] = useState<string | null>(null);
    const [cheer, setCheer] = useState<string | null>(null);
    const [isAnagram, setIsAnagram] = useState(false);
    const [perfectRound, setPerfectRound] = useState(true);
    const [timeLeft, setTimeLeft] = useState(WORD_TIME_LIMIT);
    const juice = useGameJuice();
    // eslint-disable-next-line react-hooks/purity
    const wordStartTime = useRef(Date.now());
    const cheerIdx = useRef(0);

    const current: SpellingWord | undefined = words[idx];
    const combo = getCombo(streak);
    const progress = current ? placed.length / current.word.length : 0;

    // Per-word countdown timer
    useEffect(() => {
        if (!current || result) return;
        setTimeLeft(WORD_TIME_LIMIT);
        const t = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 0.1));
        }, 100);
        return () => clearInterval(t);
    }, [current, result]);

    /* reset state when word changes */
    useEffect(() => {
        if (!current) return;
        const letters = current.word.split('').map((l, i) => ({ letter: l, id: i }));
        // Guarantee the shuffle differs from the original spelling
        let shuffled = shuffle([...letters]);
        let attempts = 0;
        while (shuffled.map(t => t.letter).join('') === current.word && attempts < 10) {
            shuffled = shuffle([...letters]);
            attempts++;
        }
        setPool(shuffled);
        // Check if the scrambled order is itself a real word (a true anagram)
        const scrambledStr = shuffled.map(t => t.letter).join('');
        setIsAnagram(scrambledStr !== current.word && getWordMap().has(scrambledStr));
        setPlaced([]);
        setNoBacktrack(true);
        setResult(null);
        setHintUsed(false);
        setHintLetter(null);
        setShowAnswer(false);
        setCheer(null);
        wordStartTime.current = Date.now();
    }, [current]);

    const handleReshuffle = useCallback(() => {
        if (!current || result) return;
        const remaining = [...pool];
        shuffle(remaining);
        setPool(remaining);
        setNoBacktrack(false);
        playTapSound();
    }, [current, result, pool]);

    const placeLetter = useCallback((tile: { letter: string; id: number }) => {
        if (result) return;
        playSnapSound();
        try { navigator.vibrate?.(10); } catch { /* unsupported */ }
        setPool(p => p.filter(t => t.id !== tile.id));
        setPlaced(p => {
            const next = [...p, tile];
            if (current && next.length === current.word.length) {
                const attempt = next.map(t => t.letter).join('');
                if (attempt === current.word) {
                    setResult('correct');
                    const elapsed = (Date.now() - wordStartTime.current) / 1000;
                    const speedBonus = elapsed < 3 ? 10 : elapsed < 5 ? 5 : 0;
                    const perfectBonus = noBacktrack && !hintUsed ? 5 : 0;
                    const timeBonus = timeLeft > WORD_TIME_LIMIT * 0.7 ? 5 : 0;
                    const newStreak = streak + 1;
                    const { mult } = getCombo(newStreak);
                    const basePts = 10 + speedBonus + perfectBonus + timeBonus;
                    const pts = Math.round(basePts * mult);
                    setScore(s => s + pts);
                    setStreak(newStreak);
                    setBestStreak(s => Math.max(s, newStreak));
                    juice.onCorrect();
                    // Rich XP float label
                    const labels: string[] = [];
                    if (speedBonus >= 10) labels.push('Lightning!');
                    else if (speedBonus) labels.push('Fast!');
                    if (mult > 1) labels.push(`x${mult}`);
                    juice.showXpFloat(`+${pts}${labels.length ? ' ' + labels.join(' ') : ''}`);
                    if (newStreak % 3 === 0) juice.onStreak(newStreak);
                    // Pick a cheer phrase based on context
                    const cheers = speedBonus >= 10 ? CHEERS_FAST
                        : noBacktrack && !hintUsed ? CHEERS_PERFECT : CHEERS_CORRECT;
                    setCheer(cheers[cheerIdx.current % cheers.length]);
                    cheerIdx.current++;
                } else {
                    setResult('wrong');
                    setStreak(0);
                    setPerfectRound(false);
                    juice.onWrong();
                }
            }
            return next;
        });
    }, [result, current, noBacktrack, hintUsed, streak, timeLeft, juice]);

    const returnLetter = useCallback((tile: { letter: string; id: number }) => {
        if (result) return;
        playTapSound();
        setPlaced(p => p.filter(t => t.id !== tile.id));
        setPool(p => [...p, tile]);
        setNoBacktrack(false);
    }, [result]);

    const advance = useCallback(() => {
        if (idx + 1 >= words.length) setDone(true);
        else setIdx(i => i + 1);
    }, [idx, words.length]);

    // Auto-advance after result
    useEffect(() => {
        if (result === 'correct') {
            const t = setTimeout(advance, 800);
            return () => clearTimeout(t);
        }
        if (result === 'wrong') {
            setShowAnswer(true);
            const t = setTimeout(advance, 1500);
            return () => clearTimeout(t);
        }
    }, [result, advance]);

    const handleHint = useCallback(() => {
        if (!current) return;
        setHintUsed(true);
        setNoBacktrack(false);
        setPerfectRound(false);
        setHintLetter(current.word[0]);
        setTimeout(() => setHintLetter(null), 2000);
    }, [current]);

    const handlePlayAgain = useCallback(() => {
        setTotalScore(s => s + score);
        setScore(0); setIdx(0); setDone(false); setStreak(0); setBestStreak(0);
        setPerfectRound(true); setSeed(s => s + 1);
    }, [score]);

    const handleExit = useCallback(() => onExit(totalScore + score), [onExit, totalScore, score]);

    const correctCount = words.slice(0, idx + (result === 'correct' ? 1 : 0)).length;
    const accuracy = correctCount > 0 ? Math.round((score / (correctCount * 20)) * 100) : 0;
    const starCount = accuracy >= 90 ? 3 : accuracy >= 60 ? 2 : 1;

    // Fire victory juice on perfect round completion
    useEffect(() => {
        if (done && perfectRound && score > 0) juice.onVictory();
    }, [done, perfectRound, score, juice]);

    // ── Difficulty picker ──
    if (!difficulty) {
        return (
            <GameShell title="Word Scramble" score={0} onExit={handleExit} level={level}>
                <div className="flex-1 flex flex-col items-center justify-center gap-8">
                    <div className="text-center">
                        <p className="text-2xl chalk text-[var(--color-gold)] mb-2">Choose Difficulty</p>
                        <p className="text-xs ui text-[rgb(var(--color-fg))]/40">Unscramble letters to spell the word</p>
                    </div>
                    <div className="flex flex-col gap-3 w-full max-w-[260px]">
                        {(Object.entries(DIFF_CONFIG) as [Difficulty, typeof DIFF_CONFIG.easy][]).map(([key, cfg]) => (
                            <motion.button
                                key={key}
                                whileTap={{ scale: 0.95 }}
                                whileHover={{ y: -2 }}
                                onClick={() => setDifficulty(key)}
                                className="flex items-center gap-3 py-3.5 px-5 rounded-xl border-2 border-[rgb(var(--color-fg))]/20 hover:border-[var(--color-gold)]/40 hover:bg-[var(--color-gold)]/5 transition-colors"
                            >
                                <span className="text-xl">{cfg.emoji}</span>
                                <div className="text-left">
                                    <div className="text-sm chalk text-[var(--color-chalk)]">{cfg.label}</div>
                                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{cfg.desc}</div>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </GameShell>
        );
    }

    if (done || words.length === 0) {
        const finalScore = totalScore + score;
        const isNew = saveHighScore('anagrams', finalScore);
        return (
            <GameShell title="Word Scramble" score={finalScore} onExit={handleExit} level={level}>
                <GameOverScreen
                    emoji={perfectRound && score > 0 ? '👑' : '🎯'}
                    title={perfectRound && score > 0 ? 'Perfect Round!' : 'Round Complete!'}
                    score={score}
                    subtitle={perfectRound && score > 0
                        ? `Flawless! ${bestStreak} best streak`
                        : `${bestStreak} best streak`}
                    isNewHigh={isNew} highScore={getHighScore('anagrams')}
                    onPlayAgain={handlePlayAgain} onExit={handleExit}
                    gameName="Word Scramble" stars={starCount}
                    stats={[
                        { label: 'Best Streak', value: bestStreak },
                        { label: 'Accuracy', value: `${accuracy}%` },
                        ...(combo.mult > 1 ? [{ label: 'Best Combo', value: combo.label }] : []),
                    ]}
                />
            </GameShell>
        );
    }

    // Timer bar color: gold → orange → red as time runs out
    const timerPct = (timeLeft / WORD_TIME_LIMIT) * 100;
    const timerColor = timeLeft <= 3 ? 'var(--color-wrong)' : timeLeft <= 7 ? 'var(--color-streak-fire)' : 'var(--color-gold)';

    return (
        <GameShell title="Word Scramble" score={totalScore + score} onExit={handleExit}
            level={level}
            combo={combo.mult}
            screenFlash={juice.screenFlash} shake={juice.shake}
            topRight={
                <div className="flex items-center gap-2">
                    {streak >= 2 && (
                        <motion.span key={streak} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="text-[10px] ui font-bold text-[var(--color-streak-fire)]">{streak}🔥</motion.span>
                    )}
                    <div className="flex items-center gap-1">
                        {words.map((_, i) => (
                            <motion.div
                                key={i}
                                animate={i === idx && !result ? { scale: [1, 1.3, 1] } : {}}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                    i < idx || (i === idx && result === 'correct')
                                        ? 'bg-[var(--color-correct)]'
                                        : i === idx
                                            ? 'bg-[var(--color-gold)]'
                                            : 'bg-[rgb(var(--color-fg))]/15'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            }
        >
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm gap-5">
                {/* Progress bar */}
                <div className="w-full max-w-[200px] h-1 rounded-full bg-[rgb(var(--color-fg))]/10 overflow-hidden">
                    <motion.div
                        className="h-full rounded-full bg-[var(--color-gold)]"
                        initial={false}
                        animate={{ width: `${((idx + (result === 'correct' ? 1 : 0)) / words.length) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    />
                </div>

                {/* Per-word timer bar */}
                {!result && (
                    <div className="w-full max-w-[160px] h-0.5 rounded-full bg-[rgb(var(--color-fg))]/5 overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: timerColor }}
                            initial={false}
                            animate={{ width: `${timerPct}%` }}
                            transition={{ duration: 0.1, ease: 'linear' }}
                        />
                    </div>
                )}

                {/* Clue — slides up/down on question change */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="text-center px-2"
                    >
                        <p className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mb-1 uppercase tracking-wider">{current.partOfSpeech}</p>
                        <p className="text-sm ui text-[var(--color-chalk)] leading-relaxed">{current.definition}</p>
                        <p className="text-[10px] ui text-[rgb(var(--color-fg))]/20 mt-1">{current.word.length} letters</p>
                        {isAnagram && !result && (
                            <motion.p
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: [1, 1.1, 1] }}
                                transition={{ scale: { repeat: Infinity, duration: 2 } }}
                                className="text-[10px] ui font-bold text-[var(--color-gold)] mt-1.5 tracking-wider uppercase"
                            >
                                Anagram!
                            </motion.p>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Answer slots — glow builds as word nears completion */}
                <div className="flex gap-1.5 flex-wrap justify-center min-h-[52px]">
                    {current.word.split('').map((correctLetter, i) => {
                        const tile = placed[i];
                        const isHintSlot = i === 0 && hintLetter;
                        const isFilled = !!tile;
                        // Progressive glow: border gets more vibrant as more letters placed
                        const glowOpacity = !result && isFilled ? 0.2 + progress * 0.4 : 0;
                        return (
                            <motion.button key={i} layout whileTap={tile ? { scale: 0.9 } : undefined}
                                onClick={() => tile && returnLetter(tile)}
                                animate={result === 'correct' ? {
                                    y: [0, -12, 0],
                                    scale: [1, 1.15, 1],
                                    transition: { delay: i * 0.06, duration: 0.5, ease: 'easeOut' },
                                } : result === 'wrong' ? {} : isFilled ? {
                                    // Subtle breathing pulse on filled slots
                                    boxShadow: [
                                        `0 0 0 0 rgba(var(--color-fg), 0)`,
                                        `0 0 ${8 * progress}px ${2 * progress}px rgba(234, 179, 8, ${glowOpacity})`,
                                        `0 0 0 0 rgba(var(--color-fg), 0)`,
                                    ],
                                } : {}}
                                transition={!result && isFilled ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : undefined}
                                className={`w-11 h-11 rounded-xl flex items-center justify-center chalk text-lg transition-colors ${
                                    tile
                                        ? result === 'correct' ? 'bg-[var(--color-correct)]/20 border-2 border-[var(--color-correct)]/50 text-[var(--color-correct)]'
                                            : result === 'wrong' ? 'bg-[var(--color-wrong)]/20 border-2 border-[var(--color-wrong)]/40 text-[var(--color-wrong)] animate-[wrong-shake_0.3s]'
                                                : 'bg-[rgb(var(--color-fg))]/8 border-2 border-[var(--color-gold)]/30 text-[var(--color-chalk)]'
                                        : isHintSlot
                                            ? 'border-2 border-[var(--color-gold)]/50 bg-[var(--color-gold)]/10 animate-[glow-pulse_2s_infinite]'
                                            : 'border-2 border-dashed border-[rgb(var(--color-fg))]/15'
                                }`}
                            >
                                {/* On wrong: reveal correct letters one-by-one */}
                                {result === 'wrong' && showAnswer ? (
                                    <motion.span
                                        initial={{ scale: 0.5, opacity: 0, rotateY: 90 }}
                                        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                                        transition={{ delay: i * 0.08, type: 'spring', stiffness: 400, damping: 15 }}
                                    >
                                        {correctLetter}
                                    </motion.span>
                                ) : tile ? (
                                    <motion.span
                                        initial={{ scale: 0, y: 20, opacity: 0 }}
                                        animate={{ scale: 1, y: 0, opacity: 1 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                    >{tile.letter}</motion.span>
                                ) : null}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Letter pool — idle wobble invites interaction */}
                <AnimatePresence mode="popLayout">
                    <div className="flex gap-2 flex-wrap justify-center">
                        {pool.map((tile, poolIdx) => {
                            const isHintMatch = hintLetter && tile.letter === hintLetter && tile.id === 0;
                            return (
                                <motion.button key={tile.id} layout
                                    initial={{ scale: 0, opacity: 0, y: 20, rotate: -10 }}
                                    animate={{
                                        scale: 1, opacity: 1, y: 0, rotate: 0,
                                    }}
                                    exit={{ scale: 0, opacity: 0, y: -30 }}
                                    transition={{ delay: poolIdx * 0.04, type: 'spring', stiffness: 400, damping: 18 }}
                                    whileTap={{ scale: 0.8, rotate: -5 }}
                                    whileHover={{ y: -5, scale: 1.1, rotate: 2 }}
                                    onClick={() => placeLetter(tile)}
                                    className={`w-11 h-11 rounded-xl flex items-center justify-center chalk text-lg shadow-sm transition-colors ${
                                        isHintMatch
                                            ? 'bg-[var(--color-gold)]/20 border-2 border-[var(--color-gold)]/50 text-[var(--color-gold)] animate-pulse shadow-[0_0_12px_rgba(234,179,8,0.3)]'
                                            : 'bg-[rgb(var(--color-fg))]/8 border-2 border-[rgb(var(--color-fg))]/15 text-[var(--color-chalk)] hover:border-[var(--color-gold)]/40 hover:bg-[var(--color-gold)]/10 hover:shadow-[0_0_8px_rgba(234,179,8,0.15)]'
                                    }`}
                                >{tile.letter}</motion.button>
                            );
                        })}
                    </div>
                </AnimatePresence>

                {/* Action row: hint + reshuffle */}
                <div className="flex items-center gap-4">
                    {!result && !hintUsed && (
                        <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={handleHint}
                            className="text-[10px] ui text-[rgb(var(--color-fg))]/30 hover:text-[var(--color-gold)] transition-colors"
                        >
                            💡 Show first letter
                        </motion.button>
                    )}
                    {!result && pool.length > 1 && (
                        <motion.button
                            whileTap={{ scale: 0.92, rotate: 180 }}
                            onClick={handleReshuffle}
                            className="text-[10px] ui text-[rgb(var(--color-fg))]/30 hover:text-[var(--color-gold)] transition-colors"
                        >
                            🔀 Shuffle
                        </motion.button>
                    )}
                </div>
                {hintUsed && !result && current && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-xs ui text-[var(--color-gold)]/60">
                        Starts with <span className="chalk text-base text-[var(--color-gold)]">{current.word[0].toUpperCase()}</span>
                    </motion.p>
                )}

                <AnimatePresence>
                    {result === 'correct' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: [0.8, 1.15, 1] }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            className="text-center"
                        >
                            <p className="text-sm ui font-bold text-[var(--color-correct)]">
                                {cheer || 'Correct!'}
                            </p>
                            {streak >= 3 && (
                                <motion.p
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-[10px] ui text-[var(--color-streak-fire)] mt-0.5"
                                >
                                    {streak} in a row! {combo.mult > 1 && combo.label}
                                </motion.p>
                            )}
                        </motion.div>
                    )}
                    {result === 'wrong' && showAnswer && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-center">
                            <p className="text-lg chalk text-[var(--color-wrong)]">{current.word}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating XP */}
                <AnimatePresence>
                    {juice.xpFloat && (
                        <motion.div key={juice.xpFloat.key}
                            initial={{ opacity: 1, y: 0, scale: 1 }}
                            animate={{ opacity: 0, y: -50, scale: 1.3 }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="text-sm chalk text-[var(--color-gold)] font-bold pointer-events-none">
                            {juice.xpFloat.text}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <Confetti trigger={juice.confettiTrigger} intensity={juice.confettiIntensity} />
        </GameShell>
    );
});
