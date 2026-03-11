import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameShell, GameOverScreen } from './GameShell';
import { shuffle, saveHighScore, getHighScore } from './wordGameUtils';
import type { SpellingWord } from '../../domains/spelling/words';
import type { DifficultyTier } from '../../domains/spelling/words';
import { wordsByDifficulty } from '../../domains/spelling/words';

interface Props { level: number; onExit: (xpEarned: number) => void }

interface PlacedWord {
    word: SpellingWord;
    row: number;
    col: number;
    dir: 'across' | 'down';
    number: number;
}

interface Cell {
    letter: string;
    userLetter: string;
    wordIds: number[]; // indices into placed array
    clueNum?: number;
}

const GRID_DIM = 10;
const TARGET_WORDS = 8;
const MIN_ACROSS = 3;
const MIN_DOWN = 3;

/** Pick short, common words good for crosswords (3-7 letters). */
function pickCrosswordWords(level: number, count: number): SpellingWord[] {
    // Use a wide difficulty range — crossword fun comes from clues, not obscure words
    const minDiff = Math.max(1, level - 3) as DifficultyTier;
    const maxDiff = Math.min(10, level + 1) as DifficultyTier;
    let pool = wordsByDifficulty(minDiff, maxDiff).filter(w => w.word.length >= 3 && w.word.length <= 7);
    if (pool.length < count) {
        pool = wordsByDifficulty(1 as DifficultyTier, 10 as DifficultyTier).filter(w => w.word.length >= 3 && w.word.length <= 7);
    }
    const shuffled = shuffle([...pool]);
    const seen = new Set<string>();
    const result: SpellingWord[] = [];
    for (const w of shuffled) {
        if (seen.has(w.word)) continue;
        seen.add(w.word);
        result.push(w);
        if (result.length >= count) break;
    }
    return result;
}

function buildCrossword(words: SpellingWord[]): { grid: (Cell | null)[][]; placed: PlacedWord[] } {
    const sorted = shuffle([...words]).sort((a, b) => b.word.length - a.word.length);
    const placed: PlacedWord[] = [];
    const letterGrid: (string | null)[][] = Array.from({ length: GRID_DIM }, () => Array(GRID_DIM).fill(null));

    // Place first word horizontally in center
    const first = sorted[0];
    if (!first) return { grid: [], placed: [] };
    const startCol = Math.floor((GRID_DIM - first.word.length) / 2);
    const startRow = Math.floor(GRID_DIM / 2);

    if (first.word.length <= GRID_DIM) {
        for (let i = 0; i < first.word.length; i++) {
            letterGrid[startRow][startCol + i] = first.word[i].toUpperCase();
        }
        placed.push({ word: first, row: startRow, col: startCol, dir: 'across', number: 1 });
    }

    // Try to place remaining words by intersecting with existing
    for (let wi = 1; wi < sorted.length && placed.length < TARGET_WORDS; wi++) {
        const w = sorted[wi];
        if (w.word.length > GRID_DIM) continue;
        const upper = w.word.toUpperCase();

        // Decide preferred direction based on current balance
        const acrossCount = placed.filter(p => p.dir === 'across').length;
        const downCount = placed.filter(p => p.dir === 'down').length;
        const preferDown = acrossCount > downCount;

        type Fit = { row: number; col: number; dir: 'across' | 'down' };
        let bestFit: Fit | null = null;
        const allFits: Fit[] = [];

        for (const pw of placed) {
            for (let pi = 0; pi < pw.word.word.length; pi++) {
                const placedChar = pw.word.word[pi].toUpperCase();
                for (let ni = 0; ni < upper.length; ni++) {
                    if (upper[ni] !== placedChar) continue;

                    const dir = pw.dir === 'across' ? 'down' : 'across';
                    let row: number, col: number;
                    if (dir === 'down') {
                        row = (pw.dir === 'across' ? pw.row : pw.row + pi) - ni;
                        col = pw.dir === 'across' ? pw.col + pi : pw.col;
                    } else {
                        row = pw.dir === 'down' ? pw.row + pi : pw.row;
                        col = (pw.dir === 'down' ? pw.col : pw.col + pi) - ni;
                    }

                    if (row < 0 || col < 0) continue;
                    if (dir === 'down' && row + upper.length > GRID_DIM) continue;
                    if (dir === 'across' && col + upper.length > GRID_DIM) continue;

                    let fits = true;
                    for (let k = 0; k < upper.length; k++) {
                        const cr = dir === 'down' ? row + k : row;
                        const cc = dir === 'across' ? col + k : col;
                        const existing = letterGrid[cr][cc];
                        if (existing !== null && existing !== upper[k]) { fits = false; break; }
                        if (existing === null) {
                            if (dir === 'down') {
                                if (cc > 0 && letterGrid[cr][cc - 1] !== null) { fits = false; break; }
                                if (cc < GRID_DIM - 1 && letterGrid[cr][cc + 1] !== null) { fits = false; break; }
                            } else {
                                if (cr > 0 && letterGrid[cr - 1][cc] !== null) { fits = false; break; }
                                if (cr < GRID_DIM - 1 && letterGrid[cr + 1][cc] !== null) { fits = false; break; }
                            }
                        }
                    }

                    if (fits) allFits.push({ row, col, dir });
                }
            }
        }

        // Prefer direction that improves balance
        if (allFits.length > 0) {
            bestFit = allFits.find(f => (preferDown ? f.dir === 'down' : f.dir === 'across')) ?? allFits[0];
        }

        if (bestFit) {
            for (let k = 0; k < upper.length; k++) {
                const cr = bestFit.dir === 'down' ? bestFit.row + k : bestFit.row;
                const cc = bestFit.dir === 'across' ? bestFit.col + k : bestFit.col;
                letterGrid[cr][cc] = upper[k];
            }
            placed.push({ word: w, ...bestFit, number: placed.length + 1 });
        }
    }

    // Build cell grid
    const grid: (Cell | null)[][] = Array.from({ length: GRID_DIM }, () => Array(GRID_DIM).fill(null));
    for (let r = 0; r < GRID_DIM; r++) {
        for (let c = 0; c < GRID_DIM; c++) {
            if (letterGrid[r][c] !== null) {
                grid[r][c] = { letter: letterGrid[r][c]!, userLetter: '', wordIds: [] };
            }
        }
    }

    for (let pi = 0; pi < placed.length; pi++) {
        const pw = placed[pi];
        for (let k = 0; k < pw.word.word.length; k++) {
            const cr = pw.dir === 'down' ? pw.row + k : pw.row;
            const cc = pw.dir === 'across' ? pw.col + k : pw.col;
            const cell = grid[cr][cc];
            if (cell) cell.wordIds.push(pi);
            if (k === 0 && cell) cell.clueNum = pw.number;
        }
    }

    return { grid, placed };
}

export const CrosswordGame = memo(function CrosswordGame({ level, onExit }: Props) {
    const [seed, setSeed] = useState(0);

    // Retry generation until we get at least MIN_ACROSS and MIN_DOWN
    const { grid: initGrid, placed } = useMemo(() => {
        for (let attempt = 0; attempt < 10; attempt++) {
            const pool = pickCrosswordWords(level, 20); // large pool for variety
            const result = buildCrossword(pool);
            const ac = result.placed.filter(p => p.dir === 'across').length;
            const dn = result.placed.filter(p => p.dir === 'down').length;
            if (ac >= MIN_ACROSS && dn >= MIN_DOWN) return result;
        }
        // Fallback: return whatever we get
        return buildCrossword(pickCrosswordWords(level, 20));
    }, [level, seed]); // eslint-disable-line react-hooks/exhaustive-deps

    const [grid, setGrid] = useState(initGrid);
    const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
    const [activeDir, setActiveDir] = useState<'across' | 'down'>('across');
    const [score, setScore] = useState(0);
    const [totalScore, setTotalScore] = useState(0);
    const [solvedWords, setSolvedWords] = useState<Set<number>>(new Set());
    const [done, setDone] = useState(false);
    const [cleanSolve, setCleanSolve] = useState(true);
    const [hintsUsed, setHintsUsed] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, [activeCell]);

    const handleCellClick = useCallback((r: number, c: number) => {
        const cell = grid[r]?.[c];
        if (!cell) return;
        if (activeCell && activeCell[0] === r && activeCell[1] === c) {
            setActiveDir(d => d === 'across' ? 'down' : 'across');
        } else {
            setActiveCell([r, c]);
        }
    }, [grid, activeCell]);

    const checkWordInGrid = useCallback((wordIdx: number, g: (Cell | null)[][]) => {
        const pw = placed[wordIdx];
        if (!pw) return false;
        for (let k = 0; k < pw.word.word.length; k++) {
            const cr = pw.dir === 'down' ? pw.row + k : pw.row;
            const cc = pw.dir === 'across' ? pw.col + k : pw.col;
            const cell = g[cr]?.[cc];
            if (!cell || cell.userLetter !== cell.letter) return false;
        }
        return true;
    }, [placed]);

    const handleKeyPress = useCallback((key: string) => {
        if (!activeCell || done) return;
        const [r, c] = activeCell;

        if (key === 'Backspace') {
            setGrid(prev => {
                const next = prev.map(row => row.map(cell => cell ? { ...cell } : null));
                const cell = next[r]?.[c];
                if (cell) cell.userLetter = '';
                return next;
            });
            const nr = activeDir === 'down' ? r - 1 : r;
            const nc = activeDir === 'across' ? c - 1 : c;
            if (nr >= 0 && nc >= 0 && grid[nr]?.[nc]) {
                setActiveCell([nr, nc]);
            }
            return;
        }

        if (!/^[a-zA-Z]$/.test(key)) return;
        const letter = key.toUpperCase();

        setGrid(prev => {
            const next = prev.map(row => row.map(cell => cell ? { ...cell } : null));
            const cell = next[r]?.[c];
            if (cell) {
                if (cell.userLetter && cell.userLetter !== letter) setCleanSolve(false);
                cell.userLetter = letter;
            }

            if (cell) {
                for (const wid of cell.wordIds) {
                    if (!solvedWords.has(wid) && checkWordInGrid(wid, next)) {
                        setSolvedWords(prev2 => {
                            const next2 = new Set(prev2);
                            next2.add(wid);
                            if (next2.size === placed.length) {
                                const bonus = cleanSolve ? 10 : 0;
                                setScore(s => s + 20 + bonus);
                                setDone(true);
                            } else {
                                setScore(s => s + 5); // score per word
                            }
                            return next2;
                        });
                    }
                }
            }

            return next;
        });

        const nr = activeDir === 'down' ? r + 1 : r;
        const nc = activeDir === 'across' ? c + 1 : c;
        if (nr < GRID_DIM && nc < GRID_DIM && grid[nr]?.[nc]) {
            setActiveCell([nr, nc]);
        }
    }, [activeCell, activeDir, grid, done, placed, solvedWords, checkWordInGrid, cleanSolve]);

    const activeWordCells = useMemo(() => {
        if (!activeCell) return new Set<string>();
        const [r, c] = activeCell;
        const cell = grid[r]?.[c];
        if (!cell) return new Set<string>();
        const set = new Set<string>();
        for (const wid of cell.wordIds) {
            const pw = placed[wid];
            if (pw.dir !== activeDir) continue;
            for (let k = 0; k < pw.word.word.length; k++) {
                const cr = pw.dir === 'down' ? pw.row + k : pw.row;
                const cc = pw.dir === 'across' ? pw.col + k : pw.col;
                set.add(`${cr},${cc}`);
            }
        }
        return set;
    }, [activeCell, activeDir, grid, placed]);

    const handleHint = useCallback(() => {
        if (done) return;
        const targetWords = activeCell
            ? grid[activeCell[0]]?.[activeCell[1]]?.wordIds.filter(wid => !solvedWords.has(wid)) ?? []
            : placed.map((_, i) => i).filter(i => !solvedWords.has(i));
        for (const wid of targetWords) {
            const pw = placed[wid];
            if (!pw) continue;
            for (let k = 0; k < pw.word.word.length; k++) {
                const cr = pw.dir === 'down' ? pw.row + k : pw.row;
                const cc = pw.dir === 'across' ? pw.col + k : pw.col;
                const cell = grid[cr]?.[cc];
                if (cell && cell.userLetter !== cell.letter) {
                    setGrid(prev => {
                        const next = prev.map(row => row.map(c2 => c2 ? { ...c2 } : null));
                        const target = next[cr]?.[cc];
                        if (target) target.userLetter = target.letter;

                        if (target) {
                            for (const wid2 of target.wordIds) {
                                if (!solvedWords.has(wid2) && checkWordInGrid(wid2, next)) {
                                    setSolvedWords(prev2 => {
                                        const next2 = new Set(prev2);
                                        next2.add(wid2);
                                        if (next2.size === placed.length) {
                                            setScore(s => s + 20);
                                            setDone(true);
                                        } else {
                                            setScore(s => s + 5);
                                        }
                                        return next2;
                                    });
                                }
                            }
                        }

                        return next;
                    });
                    setHintsUsed(h => h + 1);
                    setCleanSolve(false);
                    return;
                }
            }
        }
    }, [done, activeCell, grid, placed, solvedWords, checkWordInGrid]);

    const handlePlayAgain = useCallback(() => {
        setTotalScore(s => s + score);
        setScore(0); setDone(false); setCleanSolve(true); setHintsUsed(0); setSolvedWords(new Set()); setActiveCell(null); setSeed(s => s + 1);
    }, [score]);
    const handleExit = useCallback(() => onExit(totalScore + score), [onExit, totalScore, score]);

    useEffect(() => { setGrid(initGrid); }, [initGrid]);

    if (done || placed.length === 0) {
        const finalScore = totalScore + score;
        const isNew = saveHighScore('crossword', finalScore);
        return (
            <GameShell title="Crossword" score={finalScore} onExit={handleExit}>
                <GameOverScreen emoji="📝" title={placed.length > 0 ? 'Puzzle Complete!' : 'No words available'}
                    score={score} subtitle={cleanSolve ? 'Clean solve bonus!' : undefined}
                    isNewHigh={isNew} highScore={getHighScore('crossword')}
                    onPlayAgain={handlePlayAgain} onExit={handleExit} />
            </GameShell>
        );
    }

    const across = placed.filter(p => p.dir === 'across');
    const down = placed.filter(p => p.dir === 'down');

    return (
        <GameShell
            title="Crossword"
            score={totalScore + score}
            onExit={handleExit}
            topRight={<span className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{solvedWords.size}/{placed.length}</span>}
        >
            {/* Hidden input for keyboard capture */}
            <input
                ref={inputRef}
                type="text"
                className="absolute opacity-0 w-0 h-0"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                onKeyDown={e => {
                    e.preventDefault();
                    handleKeyPress(e.key);
                }}
            />

            <div className="flex flex-col items-center w-full max-w-sm gap-3 mt-2">
                {/* Grid */}
                <div
                    className="grid gap-px"
                    style={{ gridTemplateColumns: `repeat(${GRID_DIM}, 1fr)`, width: '100%', maxWidth: '320px' }}
                    onClick={() => inputRef.current?.focus()}
                >
                    {grid.map((row, r) =>
                        row.map((cell, c) => {
                            const key = `${r},${c}`;
                            const isActive = activeCell?.[0] === r && activeCell?.[1] === c;
                            const isWord = activeWordCells.has(key);
                            const isSolved = cell?.wordIds.some(wid => solvedWords.has(wid));

                            return (
                                <div
                                    key={key}
                                    onClick={() => cell && handleCellClick(r, c)}
                                    className={`aspect-square flex items-center justify-center relative text-sm chalk rounded-sm cursor-pointer ${
                                        !cell
                                            ? 'bg-[rgb(var(--color-fg))]/[0.03]'
                                            : isActive
                                                ? 'border-2 border-[var(--color-gold)] bg-[var(--color-gold)]/15'
                                                : isWord
                                                    ? 'bg-[var(--color-gold)]/10 border border-[rgb(var(--color-fg))]/10'
                                                    : isSolved
                                                        ? 'bg-[var(--color-correct)]/10 border border-[rgb(var(--color-fg))]/10'
                                                        : 'bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/10'
                                    }`}
                                >
                                    {cell?.clueNum && (
                                        <span className="absolute top-0 left-0.5 text-[7px] ui text-[rgb(var(--color-fg))]/40 leading-none">{cell.clueNum}</span>
                                    )}
                                    {cell && (
                                        <span className={`${
                                            cell.userLetter === cell.letter
                                                ? 'text-[var(--color-correct)]'
                                                : 'text-[var(--color-chalk)]'
                                        }`}>
                                            {cell.userLetter}
                                        </span>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Hint button */}
                <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={handleHint}
                    className="text-[10px] ui text-[rgb(var(--color-fg))]/35 hover:text-[var(--color-gold)] transition-colors"
                >
                    💡 Reveal a letter{hintsUsed > 0 ? ` (${hintsUsed} used)` : ''}
                </motion.button>

                {/* Clues */}
                <div className="w-full space-y-2 max-h-[200px] overflow-y-auto">
                    {across.length > 0 && (
                        <div>
                            <h4 className="text-[10px] ui font-bold text-[rgb(var(--color-fg))]/40 uppercase">Across</h4>
                            {across.map(pw => (
                                <div
                                    key={pw.number}
                                    className={`text-xs ui py-0.5 ${solvedWords.has(placed.indexOf(pw)) ? 'text-[var(--color-correct)] line-through opacity-60' : 'text-[var(--color-chalk)]'}`}
                                >
                                    <span className="font-bold mr-1">{pw.number}.</span>{pw.word.definition}
                                </div>
                            ))}
                        </div>
                    )}
                    {down.length > 0 && (
                        <div>
                            <h4 className="text-[10px] ui font-bold text-[rgb(var(--color-fg))]/40 uppercase">Down</h4>
                            {down.map(pw => (
                                <div
                                    key={pw.number}
                                    className={`text-xs ui py-0.5 ${solvedWords.has(placed.indexOf(pw)) ? 'text-[var(--color-correct)] line-through opacity-60' : 'text-[var(--color-chalk)]'}`}
                                >
                                    <span className="font-bold mr-1">{pw.number}.</span>{pw.word.definition}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </GameShell>
    );
});
