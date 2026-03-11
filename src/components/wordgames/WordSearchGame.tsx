import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell, GameOverScreen } from './GameShell';
import { pickWords, shuffle, saveHighScore, getHighScore } from './wordGameUtils';
import { useGameJuice } from './useGameJuice';
import { Confetti } from '../Confetti';
import type { SpellingWord } from '../../domains/spelling/words';

interface Props { level: number; onExit: (xpEarned: number) => void }

const GRID_SIZE = 8;
const WORD_COUNT = 6;
const COMMON_LETTERS = 'ETAOINSHRDLUCMFWYPVBGKJQXZ';

interface PlacedWord {
    word: SpellingWord;
    cells: [number, number][];
    found: boolean;
}

type Direction = 'h' | 'v';

function buildGrid(words: SpellingWord[]): { grid: string[][]; placed: PlacedWord[] } {
    const grid: string[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));
    const placed: PlacedWord[] = [];

    // Sort longest first for better placement
    const sorted = [...words].sort((a, b) => b.word.length - a.word.length);

    for (const w of sorted) {
        const upper = w.word.toUpperCase();
        if (upper.length > GRID_SIZE) continue;

        // Try random placements
        const dirs: Direction[] = shuffle(['h', 'v'] as Direction[]);
        let success = false;

        for (const dir of dirs) {
            if (success) break;
            const maxR = dir === 'v' ? GRID_SIZE - upper.length : GRID_SIZE;
            const maxC = dir === 'h' ? GRID_SIZE - upper.length : GRID_SIZE;
            const positions = shuffle(
                Array.from({ length: maxR * maxC }, (_, i) => [Math.floor(i / maxC), i % maxC] as [number, number])
            );

            for (const [r, c] of positions) {
                if (success) break;
                let fits = true;
                const cells: [number, number][] = [];

                for (let k = 0; k < upper.length; k++) {
                    const cr = dir === 'v' ? r + k : r;
                    const cc = dir === 'h' ? c + k : c;
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
    const [lastFound, setLastFound] = useState<{ word: string; def: string } | null>(null);
    const juice = useGameJuice();
    const gridRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

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
        const cells: [number, number][] = [];
        if (cr === sr) {
            const minC = Math.min(sc, cc);
            const maxC = Math.max(sc, cc);
            for (let c2 = minC; c2 <= maxC; c2++) cells.push([sr, c2]);
        } else if (cc === sc) {
            const minR = Math.min(sr, cr);
            const maxR = Math.max(sr, cr);
            for (let r2 = minR; r2 <= maxR; r2++) cells.push([r2, sc]);
        }
        return cells;
    }, []);

    const checkSelection = useCallback((cells: [number, number][]) => {
        if (cells.length < 2) return;
        const selectedWord = cells.map(([r, c]) => grid[r][c]).join('');
        const match = placed.find(p => !p.found && p.word.word.toUpperCase() === selectedWord);

        if (match) {
            setLastFound({ word: match.word.word, def: match.word.definition });
            setTimeout(() => setLastFound(null), 2000);
            setPlaced(prev => {
                const next = prev.map(p =>
                    p.word.word === match.word.word ? { ...p, found: true } : p
                );
                const allFound = next.every(p => p.found);
                if (allFound) {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const timeBonus = elapsed < 60 ? 30 : elapsed < 90 ? 15 : 0;
                    const pts = 10 + timeBonus;
                    setScore(s => s + pts);
                    juice.onVictory();
                    juice.showXpFloat(`+${pts} XP`);
                    setTimeout(() => setDone(true), 500);
                } else {
                    setScore(s => s + 10);
                    juice.onCorrect();
                    juice.showXpFloat('+10 XP');
                }
                return next;
            });
        }
    }, [placed, grid, startTime, juice]);

    // ── Touch events for mobile drag-to-highlight ──
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        const cell = getCellFromPoint(touch.clientX, touch.clientY);
        if (!cell) return;
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
        setPlaced(prev => prev.map(p =>
            p.word.word === unrevealed.word.word ? { ...p, found: true } : p
        ));
        // No score for revealed words, check completion
        const allFound = placed.every(p => p.found || p.word.word === unrevealed.word.word);
        if (allFound) setTimeout(() => setDone(true), 500);
    }, [placed]);

    const handlePlayAgain = useCallback(() => {
        setTotalScore(s => s + score);
        setScore(0); setDone(false); setSeed(s => s + 1); setStartTime(Date.now());
    }, [score]);
    const handleExit = useCallback(() => onExit(totalScore + score), [onExit, totalScore, score]);

    // Reset placed when words change (play again)
    useEffect(() => { setPlaced(initialPlaced); }, [initialPlaced]);

    if (done || words.length === 0) {
        const finalScore = totalScore + score;
        const isNew = saveHighScore('word-search', finalScore);
        return (
            <GameShell title="Word Search" score={finalScore} onExit={handleExit}>
                <GameOverScreen emoji="🔍" title="All Found!" score={score}
                    isNewHigh={isNew} highScore={getHighScore('word-search')}
                    onPlayAgain={handlePlayAgain} onExit={handleExit} />
            </GameShell>
        );
    }

    return (
        <GameShell
            title="Word Search"
            score={totalScore + score}
            onExit={handleExit}
            screenFlash={juice.screenFlash} shake={juice.shake}
            topRight={<span className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{placed.filter(p => p.found).length}/{placed.length}</span>}
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

                {/* Grid */}
                <div
                    ref={gridRef}
                    className="grid touch-none select-none"
                    style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, width: '100%', aspectRatio: '1/1', maxWidth: '320px' }}
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
                            return (
                                <div
                                    key={key}
                                    onPointerDown={() => handlePointerDown(r, c)}
                                    className={`flex items-center justify-center text-sm chalk rounded-sm cursor-pointer transition-colors ${
                                        isFound
                                            ? 'bg-[var(--color-correct)]/20 text-[var(--color-correct)]'
                                            : isSelecting
                                                ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)]'
                                                : 'text-[var(--color-chalk)] hover:bg-[rgb(var(--color-fg))]/5'
                                    }`}
                                >
                                    {letter}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Found word flash */}
                <AnimatePresence>
                    {lastFound && (
                        <motion.div
                            key={lastFound.word}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-center"
                        >
                            <span className="text-[10px] ui text-[var(--color-correct)]/60 bg-[var(--color-correct)]/10 px-3 py-1 rounded-full">
                                {lastFound.word}: {lastFound.def.length > 50 ? lastFound.def.slice(0, 50) + '…' : lastFound.def}
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
