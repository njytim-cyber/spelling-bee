import { memo } from 'react';
import { motion } from 'framer-motion';
import {
    IconAnagram,
    IconRootBuilder,
    IconWordSearch,
    IconTypingDefender,
    IconCrossword,
    IconUnscramble,
} from './Icons';
import { getHighScore } from './wordgames/wordGameUtils';

export type WordGameId = 'anagrams' | 'root-constructor' | 'word-search' | 'typing-defender' | 'crossword' | 'unscramble';

interface Props {
    onSelectGame: (id: WordGameId) => void;
}

const GAMES: { id: WordGameId; label: string; sub: string; Icon: typeof IconAnagram }[] = [
    { id: 'anagrams', label: 'Anagrams', sub: 'Rearrange the letters', Icon: IconAnagram },
    { id: 'root-constructor', label: 'Root Builder', sub: 'Combine morphemes', Icon: IconRootBuilder },
    { id: 'word-search', label: 'Word Search', sub: 'Find hidden words', Icon: IconWordSearch },
    { id: 'typing-defender', label: 'Type Defense', sub: 'Type before they fall', Icon: IconTypingDefender },
    { id: 'crossword', label: 'Crossword', sub: 'Solve the clues', Icon: IconCrossword },
    { id: 'unscramble', label: 'Unscramble', sub: 'Beat the clock', Icon: IconUnscramble },
];

export const WordGamesSection = memo(function WordGamesSection({ onSelectGame }: Props) {
    return (
        <div className="w-full max-w-sm mb-6">
            <h3 className="text-sm ui font-bold text-[rgb(var(--color-fg))]/50 uppercase tracking-wider mb-3">
                Word Games
            </h3>
            <div className="grid grid-cols-3 gap-2">
                {GAMES.map((g, i) => {
                    const high = getHighScore(g.id);
                    return (
                        <motion.button
                            key={g.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileTap={{ scale: 0.93 }}
                            whileHover={{ y: -2 }}
                            onClick={() => onSelectGame(g.id)}
                            className="flex flex-col items-center gap-1 py-3.5 px-2 rounded-2xl border-2 border-[rgb(var(--color-fg))]/20 hover:border-[var(--color-gold)]/40 hover:bg-[var(--color-gold)]/5 transition-colors relative"
                        >
                            <g.Icon className="w-7 h-7 text-[var(--color-gold)]" />
                            <div className="text-[11px] ui font-bold text-[var(--color-chalk)] leading-tight">{g.label}</div>
                            <div className="text-[8px] ui text-[rgb(var(--color-fg))]/40 leading-tight">{g.sub}</div>
                            {high > 0 && (
                                <div className="text-[8px] ui text-[var(--color-gold)]/60 mt-0.5 tabular-nums">
                                    Best: {high}
                                </div>
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
});
