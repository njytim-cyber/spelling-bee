/**
 * components/MultiplayerMatch.tsx
 *
 * Full-screen 1v1 multiplayer match.
 * Shows round X/10, score comparison, TTS pronunciation, SpellingInput,
 * 15s timer bar per turn, waiting state, side-by-side result reveal,
 * and final scoreboard.
 */
import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpellingInput } from './SpellingInput';
import type { RoomData, RoomPhase } from '../hooks/useMultiplayerRoom';
import { usePronunciation } from '../hooks/usePronunciation';
import { ChevronLeft } from './ChevronLeft';

interface Props {
    phase: RoomPhase;
    roomData: RoomData;
    currentRound: number;
    roundTimeLeft: number;
    uid: string;
    onSubmitAnswer: (round: number, spelling: string) => void;
    onLeave: () => void;
}

export const MultiplayerMatch = memo(function MultiplayerMatch({
    phase, roomData, currentRound, roundTimeLeft, uid,
    onSubmitAnswer, onLeave,
}: Props) {
    const [spelling, setSpelling] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const prevRoundRef = useRef(currentRound);
    const { speak, speakWord, cancel: cancelTts } = usePronunciation();

    const players = Object.entries(roomData.players);
    const me = roomData.players[uid];
    const opponent = players.find(([id]) => id !== uid);
    const opponentData = opponent?.[1];

    const word = roomData.words[currentRound];
    const totalRounds = roomData.roundCount;
    const turnTimeMs = roomData.turnTimeMs;
    const timerFraction = turnTimeMs > 0 ? roundTimeLeft / turnTimeMs : 0;

    // Reset state when round advances
    useEffect(() => {
        if (currentRound !== prevRoundRef.current) {
            prevRoundRef.current = currentRound;
            queueMicrotask(() => {
                setSpelling('');
                setSubmitted(false);
                setShowResult(false);
            });
        }
    }, [currentRound]);

    // Show result briefly when both have answered
    useEffect(() => {
        if (!me || !word) return;
        const myAnswer = me.answers[currentRound];
        const oppAnswer = opponentData?.answers[currentRound];
        if (myAnswer !== null && oppAnswer !== null && myAnswer !== undefined && oppAnswer !== undefined) {
            queueMicrotask(() => setShowResult(true));
        }
    }, [me, opponentData, currentRound, word]);

    // TTS: pronounce word when round starts (with "Your word is..." intro)
    useEffect(() => {
        if (phase !== 'playing' || !word || submitted) return;
        speakWord(word.prompt);
        return () => { cancelTts(); };
    }, [phase, currentRound, word, submitted, speakWord, cancelTts]);

    const handleRepeat = useCallback(() => {
        if (!word) return;
        speak(word.prompt);
    }, [word, speak]);

    const handleSubmit = useCallback(() => {
        if (submitted || !spelling.trim()) return;
        setSubmitted(true);
        onSubmitAnswer(currentRound, spelling.trim());
    }, [submitted, spelling, currentRound, onSubmitAnswer]);

    // ── Finished state: scoreboard ──
    if (phase === 'finished') {
        const myScore = me?.score ?? 0;
        const oppScore = opponentData?.score ?? 0;
        const won = myScore > oppScore;
        const tied = myScore === oppScore;

        return (
            <div className="flex-1 flex flex-col items-center justify-center px-4">
                <motion.div
                    className="w-full max-w-sm"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <h2 className="text-3xl chalk text-center mb-2" style={{ color: won ? 'var(--color-gold)' : tied ? 'var(--color-chalk)' : 'var(--color-wrong)' }}>
                        {won ? 'You Win!' : tied ? "It's a Tie!" : 'You Lose'}
                    </h2>

                    <div className="flex items-center justify-center gap-6 mb-6">
                        <div className="text-center">
                            <div className="text-4xl chalk text-[var(--color-gold)] tabular-nums">{myScore}</div>
                            <div className="text-xs ui text-[rgb(var(--color-fg))]/50">{me?.displayName ?? 'You'}</div>
                        </div>
                        <div className="text-lg ui text-[rgb(var(--color-fg))]/20">vs</div>
                        <div className="text-center">
                            <div className="text-4xl chalk text-[rgb(var(--color-fg))]/70 tabular-nums">{oppScore}</div>
                            <div className="text-xs ui text-[rgb(var(--color-fg))]/50">{opponentData?.displayName ?? 'Opponent'}</div>
                        </div>
                    </div>

                    {/* Round-by-round breakdown */}
                    <div className="space-y-1 mb-6">
                        {roomData.words.map((w, i) => {
                            const myResult = me?.results[i];
                            const oppResult = opponentData?.results[i];
                            return (
                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgb(var(--color-fg))]/[0.03]">
                                    <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30 w-4">{i + 1}</span>
                                    <span className="flex-1 text-xs ui text-[rgb(var(--color-fg))]/60">{w.word}</span>
                                    <span className={`text-xs ui ${myResult ? 'text-[var(--color-correct)]' : 'text-[var(--color-wrong)]'}`}>
                                        {myResult ? '✓' : '✗'}
                                    </span>
                                    <span className="text-[10px] ui text-[rgb(var(--color-fg))]/20">|</span>
                                    <span className={`text-xs ui ${oppResult ? 'text-[var(--color-correct)]' : 'text-[var(--color-wrong)]'}`}>
                                        {oppResult ? '✓' : '✗'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        onClick={onLeave}
                        className="w-full py-3 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
                    >
                        Back to Lobby
                    </button>
                </motion.div>
            </div>
        );
    }

    // ── Playing state ──
    if (phase !== 'playing' || !word) return null;

    return (
        <div className="flex-1 flex flex-col items-center px-4 pt-[calc(env(safe-area-inset-top,16px)+16px)] pb-24">
            {/* Header: round + scores */}
            <div className="w-full max-w-sm flex items-center justify-between mb-4">
                <div className="text-center flex-1">
                    <div className="text-lg ui font-bold text-[var(--color-gold)]">{me?.score ?? 0}</div>
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{me?.displayName ?? 'You'}</div>
                </div>
                <div className="text-center px-4">
                    <div className="text-xs ui text-[rgb(var(--color-fg))]/30">Round</div>
                    <div className="text-xl ui font-bold text-[var(--color-chalk)]">{currentRound + 1}<span className="text-[rgb(var(--color-fg))]/20">/{totalRounds}</span></div>
                </div>
                <div className="text-center flex-1">
                    <div className="text-lg ui font-bold text-[rgb(var(--color-fg))]/60">{opponentData?.score ?? 0}</div>
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{opponentData?.displayName ?? '...'}</div>
                </div>
            </div>

            {/* Timer bar */}
            <div className="w-full max-w-sm h-1 bg-[rgb(var(--color-fg))]/10 rounded-full mb-6 overflow-hidden">
                <motion.div
                    className="h-full rounded-full"
                    style={{
                        width: `${timerFraction * 100}%`,
                        backgroundColor: timerFraction > 0.3 ? 'var(--color-gold)' : 'var(--color-wrong)',
                    }}
                    transition={{ duration: 0.1 }}
                />
            </div>

            {/* Round result overlay */}
            <AnimatePresence>
                {showResult && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay-dim)]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-[var(--color-overlay)] rounded-2xl px-6 py-5 w-[300px] text-center"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                        >
                            <div className="text-lg ui font-bold text-[var(--color-chalk)] mb-2">{word.word}</div>
                            <div className="flex items-center justify-center gap-6 mb-3">
                                <div className="text-center">
                                    <div className={`text-sm ui font-semibold ${me?.results[currentRound] ? 'text-[var(--color-correct)]' : 'text-[var(--color-wrong)]'}`}>
                                        {me?.results[currentRound] ? 'Correct!' : 'Wrong'}
                                    </div>
                                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{me?.answers[currentRound] || '(no answer)'}</div>
                                </div>
                                <div className="text-[rgb(var(--color-fg))]/15 ui text-xs">vs</div>
                                <div className="text-center">
                                    <div className={`text-sm ui font-semibold ${opponentData?.results[currentRound] ? 'text-[var(--color-correct)]' : 'text-[var(--color-wrong)]'}`}>
                                        {opponentData?.results[currentRound] ? 'Correct!' : 'Wrong'}
                                    </div>
                                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{opponentData?.answers[currentRound] || '(no answer)'}</div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Spell area */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
                {!submitted ? (
                    <>
                        <button
                            onClick={handleRepeat}
                            className="mb-6 px-4 py-2 rounded-xl bg-[rgb(var(--color-fg))]/5 text-sm ui text-[rgb(var(--color-fg))]/50 hover:text-[rgb(var(--color-fg))]/70 transition-colors"
                        >
                            Hear Word Again
                        </button>

                        <SpellingInput
                            value={spelling}
                            onChange={setSpelling}
                            onSubmit={handleSubmit}
                        />

                        <button
                            onClick={handleSubmit}
                            disabled={!spelling.trim()}
                            className="mt-4 px-8 py-2.5 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors disabled:opacity-30"
                        >
                            Submit
                        </button>
                    </>
                ) : (
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <div className="text-sm ui text-[rgb(var(--color-fg))]/40 mb-2">Your answer</div>
                        <div className="text-2xl ui font-bold text-[var(--color-chalk)] mb-4">{spelling}</div>
                        <motion.div
                            className="text-xs ui text-[rgb(var(--color-fg))]/30"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            Waiting for opponent...
                        </motion.div>
                    </motion.div>
                )}
            </div>

            {/* Back button */}
            <button
                onClick={onLeave}
                className="absolute top-[calc(env(safe-area-inset-top,12px)+12px)] left-4 w-8 h-8 flex items-center justify-center text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/60 transition-colors z-50"
                aria-label="Leave match"
            >
                <ChevronLeft />
            </button>
        </div>
    );
});
