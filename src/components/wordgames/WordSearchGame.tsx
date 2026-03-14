import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell, GameOverScreen } from './GameShell';
import { pickWords, shuffle, saveHighScore, getHighScore } from './wordGameUtils';
import { useGameJuice } from './useGameJuice';
import { playTapSound, playSnapSound } from '../../utils/soundEffects';
import { Confetti } from '../Confetti';
import type { SpellingWord } from '../../domains/spelling/words';

interface Props { level: number; onExit: (xpEarned: number) => void }

const GRID_SIZE = 8;
const WORD_COUNT = 6;
const TIMER_SECS = 120;
const COMMON_LETTERS = 'ETAOINSHRDLUCMFWYPVBGKJQXZ';

interface PlacedWord {
    word: SpellingWord;
    cells: [number, number][];
    found: boolean;
}

// dr,dc deltas for 8 directions: →, ←, ↓, ↑, ↘, ↖, ↙, ↗
const DIRECTIONS: [number, number][] = [
    [0, 1], [0, -1], [1, 0], [-1, 0],
    [1, 1], [-1, -1], [1, -1], [-1, 1],
];

function buildGrid(words: SpellingWord[]): { grid: string[][]; placed: PlacedWord[] } {
    const grid: string[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));
    const placed: PlacedWord[] = [];

    const sorted = [...words].sort((a, b) => b.word.length - a.word.length);

    for (const w of sorted) {
        const upper = w.word.toUpperCase();
        if (upper.length > GRID_SIZE) continue;

        const dirs = shuffle([...DIRECTIONS]);
        let success = false;

        for (const [dr, dc] of dirs) {
            if (success) break;
            // Compute valid starting positions for this direction
            const minR = dr < 0 ? upper.length - 1 : 0;
            const maxR = dr > 0 ? GRID_SIZE - upper.length : GRID_SIZE - 1;
            const minC = dc < 0 ? upper.length - 1 : 0;
            const maxC = dc > 0 ? GRID_SIZE - upper.length : GRID_SIZE - 1;
            if (minR > maxR || minC > maxC) continue;

            const startPositions: [number, number][] = [];
            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    startPositions.push([r, c]);
                }
            }
            const positions = shuffle(startPositions);

            for (const [r, c] of positions) {
                if (success) break;
                let fits = true;
                const cells: [number, number][] = [];

                for (let k = 0; k < upper.length; k++) {
                    const cr = r + dr * k;
                    const cc = c + dc * k;
                    const existing = grid[cr][cc];
                    if (existing && existing !== upper[k]) { fits = false; break; }
                    cells.push([cr, cc]);
                }

                if (fits) {
                    for (let k = 0; k < upper.length; k++) {
                        grid[cells[k][0]][cells[k][1]] = upper[k];
                    }
                    placed.push({ word: w, cells, found: false });
                    success = true;
                }
            }
        }
    }

    // Fill empty cells with weighted random letters
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!grid[r][c]) {
                const idx = Math.floor(Math.random() * Math.random() * COMMON_LETTERS.length);
                grid[r][c] = COMMON_LETTERS[Math.min(idx, COMMON_LETTERS.length - 1)];
            }
        }
    }

    return { grid, placed };
}

/** Convert grid cell [row,col] to SVG pixel center within a 320×320 SVG */
function cellCenter(r: number, c: number): [number, number] {
    const cell = 320 / GRID_SIZE;
    return [c * cell + cell / 2, r * cell + cell / 2];
}

export const WordSearchGame = memo(function WordSearchGame({ level, onExit }: Props) {
    const [seed, setSeed] = useState(0);
    const words = useMemo(() => pickWords(level, WORD_COUNT).filter(w => w.word.length <= GRID_SIZE), [level, seed]); // eslint-disable-line react-hooks/exhaustive-deps
    const { grid, placed: initialPlaced } = useMemo(() => buildGrid(words), [words]);
    const [placed, setPlaced] = useState(initialPlaced);
    const [score, setScore] = useState(0);
    const [totalScore, setTotalScore] = useState(0);
    const [selecting, setSelecting] = useState<[number, number][]>([]);
    const [startCell, setStartCell] = useState<[number, number] | null>(null);
    const [done, setDone] = useState(false);
    const [startTime, setStartTime] = useState(() => Date.now());
    const [elapsed, setElapsed] = useState(0);
    const [lastFound, setLastFound] = useState<{ word: string; def: string } | null>(null);
    const [flashCells, setFlashCells] = useState<Set<string>>(new Set());
    const [wrongShake, setWrongShake] = useState(false);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [lastFindTime, setLastFindTime] = useState(() => Date.now());
    const juice = useGameJuice();
    const gridRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    // Timer for urgency (doesn't end the game)
    useEffect(() => {
        if (done) return;
        const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
        return () => clearInterval(t);
    }, [done, startTime]);

    const foundCells = useMemo(() => {
        const set = new Set<string>();
        for (const p of placed) {
            if (p.found) for (const [r, c] of p.cells) set.add(`${r},${c}`);
        }
        return set;
    }, [placed]);

    const selectingSet = useMemo(() => new Set(selecting.map(([r, c]) => `${r},${c}`)), [selecting]);

    const getCellFromPoint = useCallback((clientX: number, clientY: number) => {
        if (!gridRef.current) return null;
        const rect = gridRef.current.getBoundingClientRect();
        const cellW = rect.width / GRID_SIZE;
        const cellH = rect.height / GRID_SIZE;
        const c = Math.floor((clientX - rect.left) / cellW);
        const r = Math.floor((clientY - rect.top) / cellH);
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return null;
        return [r, c] as [number, number];
    }, []);

    const computeLineCells = useCallback((sr: number, sc: number, cr: number, cc: number) => {
        const dr = cr - sr;
        const dc = cc - sc;
        if (dr === 0 && dc === 0) return [[sr, sc]] as [number, number][];

        // Snap to nearest axis: horizontal, vertical, or diagonal
        const absDr = Math.abs(dr);
        const absDc = Math.abs(dc);
        let stepR: number, stepC: number, steps: number;

        if (absDr === 0) {
            // Horizontal
            stepR = 0; stepC = dc > 0 ? 1 : -1; steps = absDc;
        } else if (absDc === 0) {
            // Vertical
            stepR = dr > 0 ? 1 : -1; stepC = 0; steps = absDr;
        } else if (absDr >= absDc * 2) {
            // Mostly vertical — snap to vertical
            stepR = dr > 0 ? 1 : -1; stepC = 0; steps = absDr;
        } else if (absDc >= absDr * 2) {
            // Mostly horizontal — snap to horizontal
            stepR = 0; stepC = dc > 0 ? 1 : -1; steps = absDc;
        } else {
            // Diagonal — use the smaller magnitude as step count
            steps = Math.min(absDr, absDc);
            stepR = dr > 0 ? 1 : -1;
            stepC = dc > 0 ? 1 : -1;
        }

        const cells: [number, number][] = [];
        for (let k = 0; k <= steps; k++) {
            const r = sr + stepR * k;
            const c = sc + stepC * k;
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) break;
            cells.push([r, c]);
        }
        return cells;
    }, []);

    const checkSelection = useCallback((cells: [number, number][]) => {
        if (cells.length < 2) return;
        const selectedWord = cells.map(([r, c]) => grid[r][c]).join('');
        const reversedWord = [...selectedWord].reverse().join('');
        const match = placed.find(p => !p.found && (
            p.word.word.toUpperCase() === selectedWord ||
            p.word.word.toUpperCase() === reversedWord
        ));

        if (match) {
            // ── Found a word ──
            playSnapSound();
            setLastFound({ word: match.word.word, def: match.word.definition });
            setTimeout(() => setLastFound(null), 2500);

            // Staggered cell flash
            cells.forEach(([r, c], i) => {
                setTimeout(() => {
                    setFlashCells(prev => new Set(prev).add(`${r},${c}`));
                }, i * 40);
            });
            setTimeout(() => setFlashCells(new Set()), cells.length * 40 + 500);

            const newStreak = streak + 1;
            setStreak(newStreak);
            setBestStreak(s => Math.max(s, newStreak));

            // Speed bonus: fast consecutive finds
            const sinceLast = (Date.now() - lastFindTime) / 1000;
            setLastFindTime(Date.now());
            const speedBonus = sinceLast < 8 ? 5 : 0;
            // Long word bonus
            const lengthBonus = match.word.word.length >= 7 ? 5 : match.word.word.length >= 5 ? 2 : 0;

            setPlaced(prev => {
                const next = prev.map(p =>
                    p.word.word === match.word.word ? { ...p, found: true } : p
                );
                const allFound = next.every(p => p.found);
                if (allFound) {
                    const timeBonus = elapsed < 60 ? 30 : elapsed < 90 ? 15 : 0;
                    const streakBonus = newStreak >= 6 ? 15 : newStreak >= 3 ? 10 : 0;
                    const noHintBonus = hintsUsed === 0 ? 10 : 0;
                    const pts = 10 + timeBonus + streakBonus + speedBonus + lengthBonus + noHintBonus;
                    setScore(s => s + pts);
                    juice.onVictory();
                    const labels: string[] = [];
                    if (noHintBonus) labels.push('No hints!');
                    if (timeBonus >= 30) labels.push('Speed!');
                    juice.showXpFloat(`+${pts}${labels.length ? ' ' + labels.join(' ') : ''}`);
                    setTimeout(() => setDone(true), 1200);
                } else {
                    const streakBonus = newStreak >= 6 ? 5 : newStreak >= 3 ? 3 : 0;
                    const pts = 10 + streakBonus + speedBonus + lengthBonus;
                    setScore(s => s + pts);
                    const labels: string[] = [];
                    if (speedBonus) labels.push('Quick!');
                    if (lengthBonus >= 5) labels.push('Long!');
                    if (newStreak >= 3) {
                        juice.onStreak(newStreak);
                        juice.showXpFloat(`+${pts} 🔥${newStreak}${labels.length ? ' ' + labels.join(' ') : ''}`);
                    } else {
                        juice.onCorrect();
                        juice.showXpFloat(`+${pts}${labels.length ? ' ' + labels.join(' ') : ''}`);
                    }
                }
                return next;
            });
        } else if (cells.length >= 2) {
            // ── Wrong selection — shake + haptic ──
            setWrongShake(true);
            juice.onWrong();
            setTimeout(() => setWrongShake(false), 300);
            setStreak(0);
        }
    }, [placed, grid, elapsed, juice, streak]);

    // ── Touch events for mobile drag-to-highlight ──
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        const cell = getCellFromPoint(touch.clientX, touch.clientY);
        if (!cell) return;
        playTapSound();
        isDragging.current = true;
        setStartCell(cell);
        setSelecting([cell]);
    }, [getCellFromPoint]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        if (!isDragging.current || !startCell) return;
        const touch = e.touches[0];
        const cell = getCellFromPoint(touch.clientX, touch.clientY);
        if (!cell) return;
        const cells = computeLineCells(startCell[0], startCell[1], cell[0], cell[1]);
        if (cells.length > 0) setSelecting(cells);
    }, [startCell, getCellFromPoint, computeLineCells]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        isDragging.current = false;
        checkSelection(selecting);
        setSelecting([]);
        setStartCell(null);
    }, [selecting, checkSelection]);

    // ── Pointer events for desktop ──
    const handlePointerDown = useCallback((r: number, c: number) => {
        playTapSound();
        isDragging.current = true;
        setStartCell([r, c]);
        setSelecting([[r, c]]);
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current || !startCell) return;
        const cell = getCellFromPoint(e.clientX, e.clientY);
        if (!cell) return;
        const cells = computeLineCells(startCell[0], startCell[1], cell[0], cell[1]);
        if (cells.length > 0) setSelecting(cells);
    }, [startCell, getCellFromPoint, computeLineCells]);

    const handlePointerUp = useCallback(() => {
        isDragging.current = false;
        checkSelection(selecting);
        setSelecting([]);
        setStartCell(null);
    }, [selecting, checkSelection]);

    const handleRevealWord = useCallback(() => {
        const unrevealed = placed.find(p => !p.found);
        if (!unrevealed) return;
        setStreak(0);
        setHintsUsed(h => h + 1);
        setPlaced(prev => prev.map(p =>
            p.word.word === unrevealed.word.word ? { ...p, found: true } : p
        ));
        const allFound = placed.every(p => p.found || p.word.word === unrevealed.word.word);
        if (allFound) setTimeout(() => setDone(true), 500);
    }, [placed]);

    const handlePlayAgain = useCallback(() => {
        setTotalScore(s => s + score);
        setScore(0); setDone(false); setSeed(s => s + 1); setStartTime(Date.now());
        setElapsed(0); setFlashCells(new Set()); setStreak(0); setBestStreak(0);
        setHintsUsed(0); setLastFindTime(Date.now());
    }, [score]);
    const handleExit = useCallback(() => onExit(totalScore + score), [onExit, totalScore, score]);

    // Reset placed when words change (play again)
    useEffect(() => { setPlaced(initialPlaced); }, [initialPlaced]);

    const foundCount = placed.filter(p => p.found).length;
    const timerPct = Math.max(0, 1 - elapsed / TIMER_SECS);
    const timerColor = elapsed >= 100 ? 'var(--color-wrong)' : elapsed >= 80 ? 'var(--color-streak-fire)' : 'var(--color-gold)';
    const starCount = elapsed < 60 ? 3 : elapsed < 90 ? 2 : 1;

    // Build SVG overlay line for the live drag selection
    const selectionLine = useMemo(() => {
        if (selecting.length < 2) return null;
        const [sy, sx] = cellCenter(selecting[0][0], selecting[0][1]);
        const [ey, ex] = cellCenter(selecting[selecting.length - 1][0], selecting[selecting.length - 1][1]);
        return { x1: sy, y1: sx, x2: ey, y2: ex };
    }, [selecting]);

    if (done || words.length === 0) {
        const finalScore = totalScore + score;
        const isNew = saveHighScore('word-search', finalScore);
        return (
            <GameShell title="Word Search" score={finalScore} onExit={handleExit} level={level}>
                <GameOverScreen
                    emoji={hintsUsed === 0 && elapsed < 60 ? '👑' : '🔍'}
                    title={hintsUsed === 0 && elapsed < 60 ? 'Perfect Search!' : 'All Found!'}
                    score={score}
                    subtitle={hintsUsed === 0 ? 'No hints used!' : undefined}
                    isNewHigh={isNew} highScore={getHighScore('word-search')}
                    onPlayAgain={handlePlayAgain} onExit={handleExit}
                    gameName="Word Search" stars={starCount}
                    stats={[
                        { label: 'Words', value: `${foundCount}/${placed.length}` },
                        { label: 'Time', value: `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}` },
                        { label: 'Best Streak', value: bestStreak },
                        ...(hintsUsed > 0 ? [{ label: 'Hints', value: hintsUsed }] : []),
                    ]}
                />
            </GameShell>
        );
    }

    return (
        <GameShell
            title="Word Search"
            score={totalScore + score}
            onExit={handleExit}
            level={level}
            screenFlash={juice.screenFlash} shake={juice.shake}
            topRight={
                <div className="flex items-center gap-2">
                    {streak >= 2 && (
                        <motion.span
                            key={streak}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-[10px] ui font-bold text-[var(--color-streak-fire)]"
                        >
                            🔥{streak}
                        </motion.span>
                    )}
                    <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{foundCount}/{placed.length}</span>
                    <div className="relative w-8 h-8">
                        <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
                            <circle cx="18" cy="18" r="15" fill="none" stroke="rgb(var(--color-fg))" strokeWidth="2" opacity="0.1" />
                            <circle
                                cx="18" cy="18" r="15" fill="none"
                                stroke={timerColor}
                                strokeWidth="2"
                                strokeDasharray={`${timerPct * 94.25} 94.25`}
                                strokeLinecap="round"
                                className="transition-all duration-1000"
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] ui font-bold" style={{ color: timerColor }}>
                            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
                        </span>
                    </div>
                </div>
            }
        >
            <div className="flex flex-col items-center w-full max-w-sm gap-3 mt-2">
                {/* Word list with definitions */}
                <div className="w-full px-1">
                    <div className="flex flex-col gap-1">
                        {placed.map(p => (
                            <div
                                key={p.word.word}
                                className={`flex items-baseline gap-2 px-2 py-1 rounded-lg transition-all ${
                                    p.found
                                        ? 'opacity-50'
                                        : 'bg-[rgb(var(--color-fg))]/5'
                                }`}
                            >
                                <span className={`text-xs chalk shrink-0 ${
                                    p.found ? 'text-[var(--color-correct)] line-through' : 'text-[var(--color-gold)]'
                                }`}>
                                    {p.word.word}
                                </span>
                                <span className="text-[9px] ui text-[rgb(var(--color-fg))]/30 leading-tight truncate">
                                    {p.word.definition}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 rounded-full bg-[rgb(var(--color-fg))]/10 overflow-hidden">
                    <motion.div
                        className="h-full rounded-full bg-[var(--color-correct)]"
                        initial={false}
                        animate={{ width: `${(foundCount / placed.length) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    />
                </div>

                {/* Grid + SVG overlay */}
                <div className="relative" style={{ width: '100%', maxWidth: '320px', aspectRatio: '1/1' }}>
                    <div
                        ref={gridRef}
                        className={`grid touch-none select-none absolute inset-0${wrongShake ? ' animate-[wrong-shake_0.3s]' : ''}`}
                        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    >
                        {grid.map((row, r) =>
                            row.map((letter, c) => {
                                const key = `${r},${c}`;
                                const isFound = foundCells.has(key);
                                const isSelecting = selectingSet.has(key);
                                const isFlashing = flashCells.has(key);
                                return (
                                    <motion.div
                                        key={key}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{
                                            opacity: 1,
                                            scale: isFlashing ? [1, 1.2, 1] : isSelecting ? 1.05 : 1,
                                        }}
                                        transition={{
                                            opacity: { delay: (r * GRID_SIZE + c) * 0.012, duration: 0.2 },
                                            scale: { duration: 0.25, type: 'spring', stiffness: 300 },
                                        }}
                                        onPointerDown={() => handlePointerDown(r, c)}
                                        className={`flex items-center justify-center text-sm chalk rounded-sm cursor-pointer transition-colors ${
                                            isFlashing
                                                ? 'animate-[cell-solve-flash_0.4s_ease-out]'
                                                : isFound
                                                    ? 'bg-[var(--color-correct)]/15 text-[var(--color-correct)]'
                                                    : isSelecting
                                                        ? 'bg-[var(--color-gold)]/25 text-[var(--color-gold)]'
                                                        : 'text-[var(--color-chalk)] hover:bg-[rgb(var(--color-fg))]/5'
                                        }`}
                                    >
                                        {letter}
                                    </motion.div>
                                );
                            })
                        )}
                    </div>

                    {/* SVG overlay — persistent highlight lines + live selection indicator */}
                    <svg
                        viewBox="0 0 320 320"
                        className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                        {/* Persistent lines for found words */}
                        {placed.map((p, idx) => {
                            if (!p.found || p.cells.length < 2) return null;
                            const [x1, y1] = cellCenter(p.cells[0][0], p.cells[0][1]);
                            const [x2, y2] = cellCenter(p.cells[p.cells.length - 1][0], p.cells[p.cells.length - 1][1]);
                            return (
                                <motion.line
                                    key={`line-${idx}`}
                                    x1={x1} y1={y1} x2={x2} y2={y2}
                                    stroke="var(--color-correct)"
                                    strokeOpacity={0.35}
                                    strokeWidth={Math.min(320 / GRID_SIZE * 0.7, 24)}
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                />
                            );
                        })}
                        {/* Live selection indicator line */}
                        {selectionLine && (
                            <line
                                x1={selectionLine.x1} y1={selectionLine.y1}
                                x2={selectionLine.x2} y2={selectionLine.y2}
                                stroke="var(--color-gold)"
                                strokeOpacity={0.4}
                                strokeWidth={Math.min(320 / GRID_SIZE * 0.7, 24)}
                                strokeLinecap="round"
                            />
                        )}
                    </svg>
                </div>

                {/* Found word flash */}
                <AnimatePresence>
                    {lastFound && (
                        <motion.div
                            key={lastFound.word}
                            initial={{ opacity: 0, y: 8, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-center"
                        >
                            <span className="text-xs ui text-[var(--color-correct)]/70 bg-[var(--color-correct)]/15 px-4 py-1.5 rounded-full shadow-sm inline-block">
                                <span className="font-bold">{lastFound.word}</span>
                                <span className="text-[10px] opacity-70"> — {lastFound.def.length > 40 ? lastFound.def.slice(0, 40) + '…' : lastFound.def}</span>
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Reveal hint */}
                {placed.some(p => !p.found) && (
                    <button
                        onClick={handleRevealWord}
                        className="text-[10px] ui text-[rgb(var(--color-fg))]/30 hover:text-[var(--color-gold)] transition-colors"
                    >
                        💡 Reveal a word (no XP)
                    </button>
                )}

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
