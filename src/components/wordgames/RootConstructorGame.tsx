import { memo, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell, GameOverScreen } from './GameShell';
import { shuffle, saveHighScore, getHighScore } from './wordGameUtils';
import { useGameJuice } from './useGameJuice';
import { Confetti } from '../Confetti';
import { playSnapSound, playTapSound } from '../../utils/soundEffects';
import { WORD_ROOTS } from '../../domains/spelling/words/roots';
import { getWordMap } from '../../domains/spelling/words';

interface RoundData {
    word: string;
    definition: string;
    example: string;
    /** Morphemes that form the word */
    parts: string[];
    /** All tiles (correct + distractors) */
    tiles: string[];
}

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFF_CONFIG: Record<Difficulty, { label: string; emoji: string; desc: string; minLen: number; maxLen: number; maxDistractors: number }> = {
    easy:   { label: 'Easy',   emoji: '🌱', desc: '2 morphemes, short words',    minLen: 5, maxLen: 8,  maxDistractors: 2 },
    medium: { label: 'Medium', emoji: '🌿', desc: '2–3 morphemes, medium words', minLen: 7, maxLen: 11, maxDistractors: 3 },
    hard:   { label: 'Hard',   emoji: '🌳', desc: '3+ morphemes, long words',    minLen: 9, maxLen: 99, maxDistractors: 4 },
};

const ROUND_SIZE = 8;

const CHEERS_PERFECT = ['Master builder!', 'Flawless!', 'Word architect!', 'Nailed it!', 'Brilliant!'];
const CHEERS_CORRECT = ['Built it!', 'Nice work!', 'Got it!', 'Constructed!', 'Well done!'];
const CHEERS_FAST = ['Speed build!', 'Rapid fire!', 'Lightning!', 'Instant!'];

/** Combo multiplier based on streak */
function getCombo(streak: number): { mult: number; label: string } {
    if (streak >= 6) return { mult: 3, label: 'x3' };
    if (streak >= 3) return { mult: 2, label: 'x2' };
    return { mult: 1, label: '' };
}

/** Color for morpheme tile based on its role */
function morphColor(morph: string, parts: string[], isDistractor: boolean): string {
    if (isDistractor) return 'bg-[rgb(var(--color-fg))]/10 border-[rgb(var(--color-fg))]/20 text-[var(--color-chalk)]';
    const idx = parts.indexOf(morph);
    if (idx === 0 && parts.length > 1) return 'bg-blue-500/10 border-blue-400/30 text-blue-300'; // prefix
    if (idx === parts.length - 1 && parts.length > 1) return 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300'; // suffix
    return 'bg-[var(--color-gold)]/10 border-[var(--color-gold)]/30 text-[var(--color-gold)]'; // root
}

function generateRounds(difficulty: Difficulty): RoundData[] {
    const wordMap = getWordMap();
    const cfg = DIFF_CONFIG[difficulty];
    const rounds: RoundData[] = [];
    const usedWords = new Set<string>();

    const rootsByWord = new Map<string, { prefix: string; root: string; suffix: string }>();
    for (const r of WORD_ROOTS) {
        for (const ex of r.examples) {
            if (usedWords.has(ex) || ex.length < 5) continue;
            const w = wordMap.get(ex);
            if (!w) continue;
            const rootPart = r.root.split('/')[0];
            const rootIdx = ex.indexOf(rootPart);
            if (rootIdx < 0) continue;
            const prefix = ex.slice(0, rootIdx);
            const suffix = ex.slice(rootIdx + rootPart.length);
            if (prefix.length === 0 && suffix.length === 0) continue;
            rootsByWord.set(ex, { prefix, root: rootPart, suffix });
        }
    }

    const candidates = shuffle([...rootsByWord.entries()]);
    for (const [word, { prefix, root, suffix }] of candidates) {
        if (rounds.length >= ROUND_SIZE) break;
        if (usedWords.has(word)) continue;

        if (word.length < cfg.minLen || word.length > cfg.maxLen) continue;

        const parts: string[] = [];
        if (prefix) parts.push(prefix);
        parts.push(root);
        if (suffix) parts.push(suffix);

        if (difficulty === 'hard' && parts.length < 3) continue;
        if (difficulty === 'easy' && parts.length > 2) continue;

        usedWords.add(word);

        const w = wordMap.get(word);
        if (!w) continue;

        const distractors: string[] = [];
        const allRoots = WORD_ROOTS.map(r => r.root.split('/')[0]);
        const allParts = shuffle([...allRoots, 'un', 'pre', 're', 'dis', 'tion', 'ment', 'ness', 'able', 'ful', 'less', 'ing', 'ous', 'ive']);
        for (const d of allParts) {
            if (distractors.length >= cfg.maxDistractors) break;
            if (!parts.includes(d) && d !== root) distractors.push(d);
        }

        const tiles = shuffle([...parts, ...distractors]);
        rounds.push({ word, definition: w.definition, example: w.exampleSentence || '', parts, tiles });
    }

    return rounds;
}

interface Props { level: number; onExit: (xpEarned: number) => void }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const RootConstructorGame = memo(function RootConstructorGame({ level: _level, onExit }: Props) {
    const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
    const [seed, setSeed] = useState(0);
    const rounds = useMemo(
        () => difficulty ? generateRounds(difficulty) : [],
        [difficulty, seed], // eslint-disable-line react-hooks/exhaustive-deps
    );
    const [idx, setIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [totalScore, setTotalScore] = useState(0);
    const [selected, setSelected] = useState<string[]>([]);
    const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
    const [firstAttempt, setFirstAttempt] = useState(true);
    const [done, setDone] = useState(false);
    const [showCorrect, setShowCorrect] = useState<string | null>(null);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [cheer, setCheer] = useState<string | null>(null);
    const [revealWord, setRevealWord] = useState(false);
    const [perfectRound, setPerfectRound] = useState(true);
    const juice = useGameJuice();
    const cheerIdx = useRef(0);
    // eslint-disable-next-line react-hooks/purity
    const wordStartTime = useRef(Date.now());

    const current = rounds[idx] as RoundData | undefined;
    const combo = getCombo(streak);

    /* eslint-disable react-hooks/set-state-in-effect -- reset state when question changes */
    useEffect(() => {
        setSelected([]);
        setResult(null);
        setFirstAttempt(true);
        setCheer(null);
        setRevealWord(false);
        wordStartTime.current = Date.now();
    }, [idx]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const toggleTile = useCallback((morph: string) => {
        if (result) return;
        playSnapSound();
        try { navigator.vibrate?.(10); } catch { /* unsupported */ }
        setSelected(prev => {
            if (prev.includes(morph)) return prev.filter(m => m !== morph);
            return [...prev, morph];
        });
    }, [result]);

    const advance = useCallback(() => {
        if (idx + 1 >= rounds.length) setDone(true);
        else setIdx(i => i + 1);
    }, [idx, rounds.length]);

    const checkAnswer = useCallback(() => {
        if (!current || result) return;
        const attempt = selected.join('');
        if (attempt === current.word) {
            setResult('correct');
            setShowCorrect(null);
            setRevealWord(true);
            const elapsed = (Date.now() - wordStartTime.current) / 1000;
            const speedBonus = elapsed < 5 ? 10 : elapsed < 8 ? 5 : 0;
            const perfectBonus = firstAttempt ? 10 : 0;
            const newStreak = streak + 1;
            const { mult } = getCombo(newStreak);
            const basePts = 15 + speedBonus + perfectBonus;
            const pts = Math.round(basePts * mult);
            setScore(s => s + pts);
            setStreak(newStreak);
            setBestStreak(s => Math.max(s, newStreak));
            juice.onCorrect();
            // Rich XP label
            const labels: string[] = [];
            if (speedBonus >= 10) labels.push('Fast!');
            if (mult > 1) labels.push(`x${mult}`);
            if (firstAttempt && !speedBonus) labels.push('Perfect!');
            juice.showXpFloat(`+${pts}${labels.length ? ' ' + labels.join(' ') : ''}`);
            if (newStreak % 3 === 0) juice.onStreak(newStreak);
            // Pick a cheer
            const cheers = speedBonus >= 10 ? CHEERS_FAST
                : firstAttempt ? CHEERS_PERFECT : CHEERS_CORRECT;
            setCheer(cheers[cheerIdx.current % cheers.length]);
            cheerIdx.current++;
        } else {
            setResult('wrong');
            setShowCorrect(current.parts.join(' + ') + ' = ' + current.word);
            setFirstAttempt(false);
            setStreak(0);
            setPerfectRound(false);
            juice.onWrong();
        }
    }, [current, selected, result, firstAttempt, streak, juice]);

    // Auto-advance after result
    useEffect(() => {
        if (!result) return;
        const delay = result === 'correct' ? 1200 : 1500;
        const t = setTimeout(() => {
            setShowCorrect(null);
            advance();
        }, delay);
        return () => clearTimeout(t);
    }, [result, advance]);

    // Fire victory juice on perfect round completion
    useEffect(() => {
        if (done && perfectRound && score > 0) juice.onVictory();
    }, [done, perfectRound, score, juice]);

    const handlePlayAgain = useCallback(() => {
        setTotalScore(s => s + score);
        setScore(0); setIdx(0); setDone(false); setStreak(0); setBestStreak(0);
        setPerfectRound(true); setSeed(s => s + 1);
    }, [score]);
    const handleExit = useCallback(() => onExit(totalScore + score), [onExit, totalScore, score]);

    // Check if all correct morphemes are selected (hint glow)
    const allCorrectSelected = current ? current.parts.every(p => selected.includes(p)) && selected.length === current.parts.length : false;
    // Progress towards answer
    const progress = current ? selected.filter(s => current.parts.includes(s)).length / current.parts.length : 0;

    const starCount = bestStreak >= 6 ? 3 : bestStreak >= 3 ? 2 : 1;

    // ── Difficulty picker ──
    if (!difficulty) {
        return (
            <GameShell title="Root Builder" score={0} onExit={handleExit}>
                <div className="flex-1 flex flex-col items-center justify-center gap-8">
                    <div className="text-center">
                        <p className="text-2xl chalk text-[var(--color-gold)] mb-2">Choose Difficulty</p>
                        <p className="text-xs ui text-[rgb(var(--color-fg))]/40">Build words from their morphemes</p>
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

    if (done || rounds.length === 0) {
        const finalScore = totalScore + score;
        const isNew = saveHighScore('root-constructor', finalScore);
        return (
            <GameShell title="Root Builder" score={finalScore} onExit={handleExit}>
                <GameOverScreen
                    emoji={perfectRound && score > 0 ? '👑' : '🧬'}
                    title={perfectRound && score > 0 ? 'Perfect Build!' : 'Round Complete!'}
                    score={score}
                    subtitle={perfectRound && score > 0
                        ? `Flawless! ${bestStreak} best streak`
                        : `${bestStreak} best streak`}
                    isNewHigh={isNew} highScore={getHighScore('root-constructor')}
                    onPlayAgain={handlePlayAgain} onExit={handleExit}
                    gameName="Root Builder" stars={starCount}
                    stats={[
                        { label: 'Best Streak', value: bestStreak },
                        { label: 'Score', value: score },
                        ...(combo.mult > 1 ? [{ label: 'Best Combo', value: combo.label }] : []),
                    ]}
                />
            </GameShell>
        );
    }

    if (!current) return null;

    return (
        <GameShell
            title="Root Builder"
            score={totalScore + score}
            onExit={handleExit}
            combo={combo.mult}
            screenFlash={juice.screenFlash} shake={juice.shake}
            topRight={
                <div className="flex items-center gap-2">
                    {streak >= 2 && (
                        <motion.span key={streak} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="text-[10px] ui font-bold text-[var(--color-streak-fire)]">{streak}🔥</motion.span>
                    )}
                    <div className="flex items-center gap-1">
                        {rounds.map((_, i) => (
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
                        animate={{ width: `${((idx + (result === 'correct' ? 1 : 0)) / rounds.length) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    />
                </div>

                {/* Definition — slides on change */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="text-center px-2"
                    >
                        <p className="text-sm ui text-[var(--color-chalk)] leading-relaxed">{current.definition}</p>
                        <p className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mt-1">{current.parts.length} morphemes</p>
                    </motion.div>
                </AnimatePresence>

                {/* Construction zone — glow builds with progress */}
                <div
                    className={`flex items-center gap-1 min-h-[52px] px-5 py-2.5 rounded-xl border-2 transition-all ${
                        result === 'correct' ? 'border-[var(--color-correct)]/50 bg-[var(--color-correct)]/10'
                            : result === 'wrong' ? 'border-[var(--color-wrong)]/40 bg-[var(--color-wrong)]/10 animate-[wrong-shake_0.3s]'
                                : allCorrectSelected && !result ? 'border-[var(--color-gold)]/60 bg-[var(--color-gold)]/15 animate-[glow-pulse_2s_infinite]'
                                    : selected.length > 0
                                        ? 'border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5'
                                        : 'border-[rgb(var(--color-fg))]/20 bg-[rgb(var(--color-fg))]/5'
                    }`}
                    style={{
                        boxShadow: !result && progress > 0
                            ? `0 0 ${12 * progress}px rgba(234, 179, 8, ${0.1 + progress * 0.15})`
                            : 'none',
                    }}
                >
                    {selected.length === 0 ? (
                        <span className="text-xs ui text-[rgb(var(--color-fg))]/30">Tap morphemes to build...</span>
                    ) : (
                        selected.map((morph, i) => (
                            <motion.span
                                key={`${morph}-${i}`}
                                initial={{ scale: 0, x: -20, opacity: 0 }}
                                animate={result === 'correct'
                                    ? { scale: 1, x: 0, opacity: 1, y: [0, -8, 0], transition: { y: { delay: i * 0.08, duration: 0.4 } } }
                                    : { scale: 1, x: 0, opacity: 1 }
                                }
                                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                                className="flex items-center"
                            >
                                {i > 0 && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="text-[rgb(var(--color-fg))]/20 mx-0.5 text-sm"
                                    >+</motion.span>
                                )}
                                <span className={`text-base chalk ${result === 'correct' ? 'text-[var(--color-correct)]' : 'text-[var(--color-gold)]'}`}>{morph}</span>
                            </motion.span>
                        ))
                    )}
                </div>

                {/* Assembled word reveal on correct */}
                <AnimatePresence>
                    {result === 'correct' && revealWord && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.6, y: 5 }}
                            animate={{ opacity: 1, scale: [0.6, 1.1, 1], y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.15 }}
                            className="text-center"
                        >
                            <p className="text-xl chalk text-[var(--color-correct)]">{current.word}</p>
                            {cheer && (
                                <motion.p
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 }}
                                    className="text-xs ui font-bold text-[var(--color-correct)]/70 mt-0.5"
                                >
                                    {cheer}
                                </motion.p>
                            )}
                            {streak >= 3 && (
                                <motion.p
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-[10px] ui text-[var(--color-streak-fire)] mt-0.5"
                                >
                                    {streak} in a row! {combo.mult > 1 && combo.label}
                                </motion.p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Wrong answer reveal */}
                <AnimatePresence>
                    {showCorrect && (
                        <motion.p
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-xs ui text-[var(--color-wrong)]/70 text-center"
                        >
                            {showCorrect}
                        </motion.p>
                    )}
                </AnimatePresence>

                {/* Morpheme tiles — color-coded with staggered entrance */}
                <div className="flex gap-2.5 flex-wrap justify-center">
                    <AnimatePresence mode="popLayout">
                        {current.tiles.map((morph, i) => {
                            const isSelected = selected.includes(morph);
                            const isDistractor = !current.parts.includes(morph);
                            const colorCls = isSelected
                                ? 'bg-[var(--color-gold)]/20 border-[var(--color-gold)]/50 text-[var(--color-gold)] scale-95'
                                : morphColor(morph, current.parts, isDistractor);
                            return (
                                <motion.button
                                    key={`${morph}-${i}`}
                                    layout
                                    initial={{ scale: 0, opacity: 0, y: 15, rotate: -5 }}
                                    animate={{
                                        scale: isSelected ? 0.92 : 1,
                                        opacity: isSelected ? 0.5 : 1,
                                        y: 0,
                                        rotate: 0,
                                    }}
                                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 18 }}
                                    whileTap={{ scale: 0.82, rotate: -3 }}
                                    whileHover={{ y: -4, scale: 1.06 }}
                                    onClick={() => toggleTile(morph)}
                                    className={`px-5 py-2.5 rounded-xl text-sm chalk transition-colors border-2 shadow-sm ${colorCls}`}
                                    style={{
                                        boxShadow: !isSelected && !isDistractor
                                            ? '0 2px 8px rgba(234, 179, 8, 0.1)'
                                            : undefined,
                                    }}
                                >
                                    {morph}
                                </motion.button>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Submit + Clear + Skip */}
                <div className="flex items-center gap-3">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        whileHover={selected.length > 0 && !result ? { scale: 1.03 } : undefined}
                        onClick={checkAnswer}
                        disabled={selected.length === 0 || !!result}
                        className={`py-3 px-8 rounded-xl font-bold ui transition-all ${
                            allCorrectSelected && !result
                                ? 'text-[#422006] bg-[var(--color-gold)] animate-[glow-pulse_2s_infinite] shadow-[0_0_16px_rgba(234,179,8,0.3)]'
                                : selected.length > 0 && !result
                                    ? 'text-[#422006] bg-[var(--color-gold)]'
                                    : 'text-[rgb(var(--color-fg))]/25 bg-[rgb(var(--color-fg))]/10 cursor-not-allowed'
                        }`}
                    >
                        Check
                    </motion.button>
                    {selected.length > 0 && !result && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { setSelected([]); playTapSound(); }}
                            className="text-[10px] ui text-[rgb(var(--color-fg))]/30 hover:text-[var(--color-gold)] transition-colors"
                        >
                            Clear
                        </motion.button>
                    )}
                    {!result && (
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { setPerfectRound(false); setStreak(0); advance(); }}
                            className="text-[10px] ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/60 transition-colors underline underline-offset-2"
                        >
                            Skip
                        </motion.button>
                    )}
                </div>

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
