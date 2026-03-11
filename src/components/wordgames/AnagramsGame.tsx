import { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell, GameOverScreen } from './GameShell';
import { pickAnagramWords, shuffle, saveHighScore, getHighScore } from './wordGameUtils';
import type { SpellingWord } from '../../domains/spelling/words';

interface Props { level: number; onExit: (xpEarned: number) => void }

type Difficulty = 'easy' | 'medium' | 'hard';

const ROUND_SIZE = 10;

const DIFF_CONFIG: Record<Difficulty, { label: string; emoji: string; desc: string }> = {
    easy:   { label: 'Easy',   emoji: '🌱', desc: '3–5 letter words' },
    medium: { label: 'Medium', emoji: '🌿', desc: '5–7 letter words' },
    hard:   { label: 'Hard',   emoji: '🌳', desc: '7+ letter words' },
};

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
    const [showAnswer, setShowAnswer] = useState(false);
    const [hintUsed, setHintUsed] = useState(false);

    const current: SpellingWord | undefined = words[idx];

    /* eslint-disable react-hooks/set-state-in-effect -- reset state when word changes */
    useEffect(() => {
        if (!current) return;
        const letters = current.word.split('').map((l, i) => ({ letter: l, id: i }));
        setPool(shuffle([...letters]));
        setPlaced([]);
        setNoBacktrack(true);
        setResult(null);
        setHintUsed(false);
        setShowAnswer(false);
    }, [current]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const placeLetter = useCallback((tile: { letter: string; id: number }) => {
        if (result) return;
        setPool(p => p.filter(t => t.id !== tile.id));
        setPlaced(p => {
            const next = [...p, tile];
            if (current && next.length === current.word.length) {
                const attempt = next.map(t => t.letter).join('');
                if (attempt === current.word) {
                    setResult('correct');
                    const bonus = noBacktrack ? 5 : 0;
                    const streakBonus = (streak + 1) % 3 === 0 ? 5 : 0;
                    setScore(s => s + 10 + bonus + streakBonus);
                    setStreak(s => s + 1);
                } else {
                    setResult('wrong');
                    setStreak(0);
                }
            }
            return next;
        });
    }, [result, current, noBacktrack, streak]);

    const returnLetter = useCallback((tile: { letter: string; id: number }) => {
        if (result) return;
        setPlaced(p => p.filter(t => t.id !== tile.id));
        setPool(p => [...p, tile]);
        setNoBacktrack(false);
    }, [result]);

    const advance = useCallback(() => {
        if (idx + 1 >= words.length) setDone(true);
        else setIdx(i => i + 1);
    }, [idx, words.length]);

    // Auto-advance after showing result (correct or wrong)
    useEffect(() => {
        if (result === 'correct') {
            const t = setTimeout(advance, 700);
            return () => clearTimeout(t);
        }
        if (result === 'wrong') {
            setShowAnswer(true); // eslint-disable-line react-hooks/set-state-in-effect
            const t = setTimeout(advance, 1500);
            return () => clearTimeout(t);
        }
    }, [result, advance]);

    const handlePlayAgain = useCallback(() => {
        setTotalScore(s => s + score);
        setScore(0); setIdx(0); setDone(false); setStreak(0); setSeed(s => s + 1);
    }, [score]);

    const handleExit = useCallback(() => onExit(totalScore + score), [onExit, totalScore, score]);

    // ── Difficulty picker ──
    if (!difficulty) {
        return (
            <GameShell title="Anagrams" score={0} onExit={handleExit}>
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
            <GameShell title="Anagrams" score={finalScore} onExit={handleExit}>
                <GameOverScreen emoji="🎯" title="Round Complete!" score={score}
                    subtitle={`${streak} answer streak`} isNewHigh={isNew} highScore={getHighScore('anagrams')}
                    onPlayAgain={handlePlayAgain} onExit={handleExit} />
            </GameShell>
        );
    }

    return (
        <GameShell title="Anagrams" score={totalScore + score} onExit={handleExit}
            topRight={
                <div className="flex items-center gap-2">
                    {streak >= 2 && (
                        <motion.span key={streak} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="text-[10px] ui font-bold text-[var(--color-streak-fire)]">{streak}🔥</motion.span>
                    )}
                    <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{idx + 1}/{words.length}</span>
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

                {/* Clue: definition + example */}
                <motion.div key={idx} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center px-2">
                    <p className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mb-1 uppercase tracking-wider">{current.partOfSpeech}</p>
                    <p className="text-sm ui text-[var(--color-chalk)] leading-relaxed">{current.definition}</p>
                    {current.exampleSentence && (
                        <p className="text-xs ui text-[rgb(var(--color-fg))]/30 mt-1.5 italic leading-relaxed">
                            &ldquo;{current.exampleSentence}&rdquo;
                        </p>
                    )}
                    <p className="text-[10px] ui text-[rgb(var(--color-fg))]/20 mt-1">{current.word.length} letters</p>
                </motion.div>

                {/* Answer slots */}
                <div className="flex gap-1.5 flex-wrap justify-center min-h-[52px]">
                    {current.word.split('').map((correctLetter, i) => {
                        const tile = placed[i];
                        return (
                            <motion.button key={i} layout whileTap={tile ? { scale: 0.9 } : undefined}
                                onClick={() => tile && returnLetter(tile)}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center chalk text-lg transition-colors ${
                                    tile
                                        ? result === 'correct' ? 'bg-[var(--color-correct)]/20 border-2 border-[var(--color-correct)]/40 text-[var(--color-correct)]'
                                            : result === 'wrong' ? 'bg-[var(--color-wrong)]/20 border-2 border-[var(--color-wrong)]/40 text-[var(--color-wrong)] animate-[wrong-shake_0.3s]'
                                                : 'bg-[rgb(var(--color-fg))]/10 border-2 border-[rgb(var(--color-fg))]/30 text-[var(--color-chalk)]'
                                        : 'border-2 border-dashed border-[rgb(var(--color-fg))]/15'
                                }`}
                            >
                                {/* On wrong: show correct letter; otherwise show placed tile */}
                                {result === 'wrong' && showAnswer ? (
                                    <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}>{correctLetter}</motion.span>
                                ) : tile ? (
                                    <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}>{tile.letter}</motion.span>
                                ) : null}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Letter pool */}
                <AnimatePresence mode="popLayout">
                    <div className="flex gap-1.5 flex-wrap justify-center">
                        {pool.map(tile => (
                            <motion.button key={tile.id} layout
                                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }} whileTap={{ scale: 0.85 }} whileHover={{ y: -2 }}
                                onClick={() => placeLetter(tile)}
                                className="w-10 h-10 rounded-lg bg-[rgb(var(--color-fg))]/10 border border-[rgb(var(--color-fg))]/20 flex items-center justify-center chalk text-lg text-[var(--color-chalk)] hover:border-[var(--color-gold)]/40 hover:bg-[var(--color-gold)]/10 transition-colors"
                            >{tile.letter}</motion.button>
                        ))}
                    </div>
                </AnimatePresence>

                {/* Hint */}
                {!result && !hintUsed && (
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => { setHintUsed(true); setNoBacktrack(false); }}
                        className="text-[10px] ui text-[rgb(var(--color-fg))]/30 hover:text-[var(--color-gold)] transition-colors"
                    >
                        💡 Show first letter
                    </motion.button>
                )}
                {hintUsed && !result && current && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-xs ui text-[var(--color-gold)]/60">
                        Starts with <span className="chalk text-base text-[var(--color-gold)]">{current.word[0].toUpperCase()}</span>
                    </motion.p>
                )}

                <AnimatePresence>
                    {result === 'correct' && (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-sm ui font-bold text-[var(--color-correct)]">
                            {noBacktrack ? 'Perfect! +15 XP' : 'Correct! +10 XP'}
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
            </div>
        </GameShell>
    );
});
