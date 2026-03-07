/**
 * components/ChallengeCompareModal.tsx
 *
 * Side-by-side comparison of same-word challenge results.
 * Shows word-by-word correctness and timing for both players.
 */
import { ModalShell } from './ModalShell';
import { Button } from './Button';
import type { ChallengeInfo } from '../hooks/useSameWordChallenge';

interface Props {
    challenge: ChallengeInfo;
    onClose: () => void;
    myName: string;
}

export function ChallengeCompareModal({ challenge, onClose, myName }: Props) {
    const { myResults, theirResults, opponentName, wordCount } = challenge;
    const bothDone = myResults && theirResults;

    const myScore = myResults?.filter(r => r.correct).length ?? 0;
    const theirScore = theirResults?.filter(r => r.correct).length ?? 0;
    const myTotalTime = myResults?.reduce((s, r) => s + r.timeMs, 0) ?? 0;
    const theirTotalTime = theirResults?.reduce((s, r) => s + r.timeMs, 0) ?? 0;

    const won = myScore > theirScore || (myScore === theirScore && myTotalTime < theirTotalTime);
    const tied = myScore === theirScore && myTotalTime === theirTotalTime;

    return (
        <ModalShell onClose={onClose} className="w-[min(400px,92vw)]" ariaLabel="Challenge Results">
            <div className="p-4 space-y-4">
                {/* Header */}
                <h2 className="text-lg font-bold font-[family-name:var(--font-chalk)] text-[rgb(var(--color-accent))] text-center">
                    {bothDone
                        ? tied ? 'Tie!' : won ? 'You won!' : `${opponentName} won!`
                        : 'Challenge in progress'
                    }
                </h2>

                {/* Score summary */}
                <div className="flex items-center justify-center gap-6 text-center">
                    <div>
                        <p className="text-xs text-[rgb(var(--color-fg))]/50">{myName}</p>
                        <p className="text-2xl font-bold font-[family-name:var(--font-chalk)]">
                            {myResults ? `${myScore}/${wordCount}` : '—'}
                        </p>
                        {myResults && (
                            <p className="text-[10px] text-[rgb(var(--color-fg))]/40">{(myTotalTime / 1000).toFixed(1)}s</p>
                        )}
                    </div>
                    <span className="text-lg text-[rgb(var(--color-fg))]/30">vs</span>
                    <div>
                        <p className="text-xs text-[rgb(var(--color-fg))]/50">{opponentName}</p>
                        <p className="text-2xl font-bold font-[family-name:var(--font-chalk)]">
                            {theirResults ? `${theirScore}/${wordCount}` : '—'}
                        </p>
                        {theirResults && (
                            <p className="text-[10px] text-[rgb(var(--color-fg))]/40">{(theirTotalTime / 1000).toFixed(1)}s</p>
                        )}
                    </div>
                </div>

                {/* Status messages */}
                {!myResults && !theirResults && (
                    <p className="text-center text-sm text-[rgb(var(--color-fg))]/50">
                        Neither player has completed this challenge yet.
                    </p>
                )}
                {myResults && !theirResults && (
                    <p className="text-center text-sm text-amber-500">
                        Waiting for {opponentName} to play...
                    </p>
                )}
                {!myResults && theirResults && (
                    <p className="text-center text-sm text-amber-500">
                        {opponentName} has finished — your turn!
                    </p>
                )}

                {/* Word-by-word comparison (only if both done) */}
                {bothDone && myResults && theirResults && (
                    <div className="max-h-[40vh] overflow-y-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-[rgb(var(--color-fg))]/40 border-b border-[rgb(var(--color-fg))]/10">
                                    <th className="text-left py-1 font-normal">Word</th>
                                    <th className="text-center py-1 font-normal w-16">You</th>
                                    <th className="text-center py-1 font-normal w-16">{opponentName.slice(0, 8)}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myResults.map((my, i) => {
                                    const their = theirResults[i];
                                    return (
                                        <tr key={i} className="border-b border-[rgb(var(--color-fg))]/5">
                                            <td className="py-1.5 font-medium">{my.word}</td>
                                            <td className={`text-center py-1.5 ${my.correct ? 'text-green-500' : 'text-red-400'}`}>
                                                {my.correct ? '✓' : '✗'}
                                                <span className="text-[rgb(var(--color-fg))]/30 ml-1">
                                                    {(my.timeMs / 1000).toFixed(1)}s
                                                </span>
                                            </td>
                                            <td className={`text-center py-1.5 ${their.correct ? 'text-green-500' : 'text-red-400'}`}>
                                                {their.correct ? '✓' : '✗'}
                                                <span className="text-[rgb(var(--color-fg))]/30 ml-1">
                                                    {(their.timeMs / 1000).toFixed(1)}s
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <Button variant="secondary" className="w-full" onClick={onClose}>
                    Close
                </Button>
            </div>
        </ModalShell>
    );
}
