import { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell, GameOverScreen } from './GameShell';
import { shuffle, saveHighScore, getHighScore } from './wordGameUtils';
import { useGameJuice } from './useGameJuice';
import { Confetti } from '../Confetti';
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
    const juice = useGameJuice();

    const current = rounds[idx] as RoundData | undefined;

    useEffect(() => {
        setSelected([]); // eslint-disable-line react-hooks/set-state-in-effect
        setResult(null);
        setFirstAttempt(true);
    }, [idx]);

    const toggleTile = useCallback((morph: string) => {
        if (result) return;
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
            const pts = 15 + (firstAttempt ? 10 : 0);
            setScore(s => s + pts);
            const newStreak = streak + 1;
            setStreak(newStreak);
            setBestStreak(s => Math.max(s, newStreak));
            juice.onCorrect();
            juice.showXpFloat(firstAttempt ? '+25 Perfect!' : '+15 XP');
            if (newStreak % 3 === 0) juice.onStreak(newStreak);
        } else {
            setResult('wrong');
            setShowCorrect(current.parts.join(' + ') + ' = ' + current.word);
            setFirstAttempt(false);
            setStreak(0);
            juice.onWrong();
        }
    }, [current, selected, result, firstAttempt, streak, juice]);

    // Auto-advance after result
    useEffect(() => {
        if (!result) return;
        const delay = result === 'correct' ? 800 : 1500;
        const t = setTimeout(() => {
            setShowCorrect(null);
            advance();
        }, delay);
        return () => clearTimeout(t);
    }, [result, advance]);

    const handlePlayAgain = useCallback(() => {
        setTotalScore(s => s + score);
        setScore(0); setIdx(0); setDone(false); setStreak(0); setBestStreak(0); setSeed(s => s + 1);
    }, [score]);
    const handleExit = useCallback(() => onExit(totalScore + score), [onExit, totalScore, score]);

    // Check if all correct morphemes are selected (hint glow)
    const allCorrectSelected = current ? current.parts.every(p => selected.includes(p)) && selected.length === current.parts.length : false;

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
                <GameOverScreen emoji="🧬" title="Round Complete!" score={score}
                    isNewHigh={isNew} highScore={getHighScore('root-constructor')}
                    onPlayAgain={handlePlayAgain} onExit={handleExit}
                    gameName="Root Builder" stars={starCount}
                    stats={[
                        { label: 'Streak', value: bestStreak },
                        { label: 'Score', value: score },
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
            screenFlash={juice.screenFlash} shake={juice.shake}
            topRight={
                <div className="flex items-center gap-2">
                    {streak >= 2 && (
                        <motion.span key={streak} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="text-[10px] ui font-bold text-[var(--color-streak-fire)]">{streak}🔥</motion.span>
                    )}
                    <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{idx + 1}/{rounds.length}</span>
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

                {/* Definition + example — slides on change */}
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
                        {current.example && (
                            <p className="text-xs ui text-[rgb(var(--color-fg))]/30 mt-1.5 italic leading-relaxed">
                                &ldquo;{current.example}&rdquo;
                            </p>
                        )}
                        <p className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mt-1">{current.parts.length} morphemes</p>
                    </motion.div>
                </AnimatePresence>

                {/* Construction zone with glow hint */}
                <div className={`flex items-center gap-1 min-h-[48px] px-4 py-2 rounded-xl border-2 transition-all ${
                    result === 'correct' ? 'border-[var(--color-correct)]/40 bg-[var(--color-correct)]/10 animate-[word-complete-pulse_0.6s]'
                        : result === 'wrong' ? 'border-[var(--color-wrong)]/40 bg-[var(--color-wrong)]/10 animate-[wrong-shake_0.3s]'
                            : allCorrectSelected && !result ? 'border-[var(--color-gold)]/50 bg-[var(--color-gold)]/10 animate-[glow-pulse_2s_infinite]'
                                : 'border-[rgb(var(--color-fg))]/20 bg-[rgb(var(--color-fg))]/5'
                }`}>
                    {selected.length === 0 ? (
                        <span className="text-xs ui text-[rgb(var(--color-fg))]/30">Tap morphemes to build...</span>
                    ) : (
                        selected.map((morph, i) => (
                            <motion.span
                                key={`${morph}-${i}`}
                                initial={{ scale: 0.5, x: -20 }}
                                animate={{ scale: 1, x: 0 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                className="flex items-center"
                            >
                                {i > 0 && <span className="text-[rgb(var(--color-fg))]/20 mx-0.5 text-sm">+</span>}
                                <span className="text-base chalk text-[var(--color-gold)]">{morph}</span>
                            </motion.span>
                        ))
                    )}
                </div>

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

                {/* Morpheme tiles — color-coded */}
                <div className="flex gap-2 flex-wrap justify-center">
                    {current.tiles.map((morph, i) => {
                        const isSelected = selected.includes(morph);
                        const isDistractor = !current.parts.includes(morph);
                        const colorCls = isSelected
                            ? 'bg-[var(--color-gold)]/20 border-[var(--color-gold)]/50 text-[var(--color-gold)]'
                            : morphColor(morph, current.parts, isDistractor);
                        return (
                            <motion.button
                                key={`${morph}-${i}`}
                                whileTap={{ scale: 0.9 }}
                                layout
                                onClick={() => toggleTile(morph)}
                                className={`px-4 py-2 rounded-xl text-sm chalk transition-all border-2 ${colorCls}`}
                            >
                                {morph}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Submit + Skip */}
                <div className="flex items-center gap-4">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={checkAnswer}
                        disabled={selected.length === 0 || !!result}
                        className={`py-3 px-8 rounded-xl font-bold ui transition-colors ${
                            selected.length > 0 && !result
                                ? 'text-[#422006] bg-[var(--color-gold)]'
                                : 'text-[rgb(var(--color-fg))]/25 bg-[rgb(var(--color-fg))]/10 cursor-not-allowed'
                        }`}
                    >
                        Check
                    </motion.button>
                    {!result && (
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={advance}
                            className="text-[10px] ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/60 transition-colors underline underline-offset-2"
                        >
                            Skip
                        </motion.button>
                    )}
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
            <Confetti trigger={juice.confettiTrigger} intensity={juice.confettiIntensity} />
        </GameShell>
    );
});
