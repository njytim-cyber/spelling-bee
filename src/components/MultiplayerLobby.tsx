/**
 * components/MultiplayerLobby.tsx
 *
 * Create or join a 1v1 multiplayer spelling match.
 * Shows room code, player list, and ready/start controls.
 */
import { memo, useState } from 'react';
import { ModalShell } from './ModalShell';
import { Button } from './Button';

interface Props {
    phase: 'idle' | 'creating' | 'lobby';
    roomCode: string;
    players: { uid: string; displayName: string; ready: boolean }[];
    isHost: boolean;
    error: string | null;
    onCreate: () => void;
    onJoin: (code: string) => void;
    onReady: () => void;
    onStart: () => void;
    onClose: () => void;
}

export const MultiplayerLobby = memo(function MultiplayerLobby({
    phase, roomCode, players, isHost, error,
    onCreate, onJoin, onReady, onStart, onClose,
}: Props) {
    const [joinCode, setJoinCode] = useState('');
    const [tab, setTab] = useState<'create' | 'join'>('create');

    const allReady = players.length >= 2 && players.every(p => p.ready);

    return (
        <ModalShell onClose={onClose} ariaLabel="1v1 Match">
                <h3 className="text-lg ui font-bold text-[var(--color-gold)] text-center mb-4">1v1 Match</h3>

                {phase === 'idle' && (
                    <>
                        {/* Create / Join tabs */}
                        <div className="flex gap-1 mb-4">
                            <button
                                onClick={() => setTab('create')}
                                className={`flex-1 py-2 rounded-lg text-xs ui transition-colors ${
                                    tab === 'create'
                                        ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)]'
                                        : 'text-[rgb(var(--color-fg))]/40'
                                }`}
                            >
                                Create Room
                            </button>
                            <button
                                onClick={() => setTab('join')}
                                className={`flex-1 py-2 rounded-lg text-xs ui transition-colors ${
                                    tab === 'join'
                                        ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)]'
                                        : 'text-[rgb(var(--color-fg))]/40'
                                }`}
                            >
                                Join Room
                            </button>
                        </div>

                        {tab === 'create' && (
                            <div className="text-center">
                                <p className="text-xs ui text-[rgb(var(--color-fg))]/50 mb-4">
                                    Create a room and share the code with a friend.
                                </p>
                                <Button className="px-6" onClick={onCreate}>
                                    Create Room
                                </Button>
                            </div>
                        )}

                        {tab === 'join' && (
                            <div className="text-center">
                                <p className="text-xs ui text-[rgb(var(--color-fg))]/50 mb-3">
                                    Enter the 6-character room code.
                                </p>
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                                    placeholder="ABCD12"
                                    maxLength={6}
                                    className="w-full text-center text-2xl ui font-bold tracking-[0.3em] bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/10 rounded-xl px-4 py-3 text-[var(--color-chalk)] placeholder:text-[rgb(var(--color-fg))]/15 outline-none mb-3"
                                />
                                <Button className="px-6" onClick={() => joinCode.length === 6 && onJoin(joinCode)} disabled={joinCode.length !== 6}>
                                    Join
                                </Button>
                            </div>
                        )}
                    </>
                )}

                {phase === 'creating' && (
                    <div className="text-center py-6">
                        <div className="text-sm ui text-[rgb(var(--color-fg))]/50">Creating room...</div>
                    </div>
                )}

                {phase === 'lobby' && (
                    <>
                        {/* Room code display */}
                        <div className="text-center mb-4">
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 uppercase tracking-wider mb-1">Room Code</div>
                            <button
                                onClick={() => navigator.clipboard?.writeText(roomCode)}
                                className="text-3xl chalk text-[var(--color-gold)] tracking-[0.3em] hover:opacity-80 transition-opacity"
                                title="Tap to copy"
                            >
                                {roomCode}
                            </button>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/25 mt-1">tap to copy</div>
                        </div>

                        {/* Players */}
                        <div className="space-y-2 mb-4">
                            {players.map(p => (
                                <div key={p.uid} className="flex items-center justify-between px-3 py-2 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8">
                                    <span className="text-sm ui text-[rgb(var(--color-fg))]/70">{p.displayName}</span>
                                    <span className={`text-xs ui ${p.ready ? 'text-[var(--color-correct)]' : 'text-[rgb(var(--color-fg))]/30'}`}>
                                        {p.ready ? 'Ready' : 'Waiting...'}
                                    </span>
                                </div>
                            ))}
                            {players.length < 2 && (
                                <div className="text-center text-xs ui text-[rgb(var(--color-fg))]/25 py-2">
                                    Waiting for opponent...
                                </div>
                            )}
                        </div>

                        {/* Ready / Start buttons */}
                        <div className="flex gap-2">
                            {!players.find(p => p.ready && p.uid === players[0]?.uid) && (
                                <button
                                    onClick={onReady}
                                    className="flex-1 py-2.5 rounded-xl border border-[var(--color-correct)]/40 bg-[var(--color-correct)]/10 text-sm ui text-[var(--color-correct)] hover:bg-[var(--color-correct)]/20 transition-colors"
                                >
                                    Ready
                                </button>
                            )}
                            {isHost && allReady && (
                                <Button className="flex-1" onClick={onStart}>
                                    Start Match
                                </Button>
                            )}
                        </div>
                    </>
                )}

                {error && (
                    <div className="mt-3 text-center text-xs ui text-[var(--color-wrong)]">{error}</div>
                )}

                <Button variant="ghost" className="w-full mt-3" onClick={onClose}>
                    {phase === 'lobby' ? 'Leave' : 'Close'}
                </Button>
        </ModalShell>
    );
});
