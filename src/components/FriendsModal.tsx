/**
 * components/FriendsModal.tsx
 *
 * Friend management modal with three tabs: Friends list, Pending requests, Add friend.
 * Shows buddy streaks, allows accept/decline requests, and friend code sharing.
 */
import { useState, useRef, useEffect } from 'react';
import { ModalShell } from './ModalShell';
import { Button } from './Button';
import type { FriendEntry } from '../hooks/useFriends';

type Tab = 'friends' | 'requests' | 'add';

interface Props {
    onClose: () => void;
    friends: FriendEntry[];
    pendingCount: number;
    friendCode: string;
    onAddFriend: (code: string) => Promise<{ ok: boolean; error?: string }>;
    onAcceptRequest: (friendshipId: string) => Promise<void>;
    onRemoveFriend: (friendshipId: string) => Promise<void>;
    onShareCode: () => Promise<void>;
    onChallenge?: (friendUid: string) => void;
    isPremium?: boolean;
    friendCap: number;
}

export function FriendsModal({
    onClose, friends, pendingCount, friendCode,
    onAddFriend, onAcceptRequest, onRemoveFriend, onShareCode,
    onChallenge, isPremium, friendCap,
}: Props) {
    const [tab, setTab] = useState<Tab>(pendingCount > 0 ? 'requests' : 'friends');
    const [codeInput, setCodeInput] = useState('');
    const [addStatus, setAddStatus] = useState<{ ok?: boolean; error?: string } | null>(null);
    const [adding, setAdding] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const activeFriends = friends.filter(f => f.status === 'active');
    const incomingRequests = friends.filter(f => f.status === 'pending' && f.isIncoming);
    const outgoingRequests = friends.filter(f => f.status === 'pending' && !f.isIncoming);

    // Auto-focus input when switching to Add tab
    useEffect(() => {
        if (tab === 'add') {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [tab]);

    async function handleAdd() {
        if (!codeInput.trim() || adding) return;
        // Enforce friend cap for free users
        if (!isPremium && activeFriends.length >= friendCap) {
            setAddStatus({ error: `Friend limit reached (${friendCap}). Upgrade for more!` });
            return;
        }
        setAdding(true);
        setAddStatus(null);
        const result = await onAddFriend(codeInput.trim());
        setAddStatus(result);
        if (result.ok) setCodeInput('');
        setAdding(false);
    }

    const today = new Date().toISOString().slice(0, 10);

    return (
        <ModalShell onClose={onClose} className="w-[min(380px,92vw)]" ariaLabel="Friends">
            <div className="p-4 space-y-4">
                {/* Header */}
                <h2 className="text-lg font-bold font-[family-name:var(--font-chalk)] text-[rgb(var(--color-accent))] text-center">
                    Friends
                </h2>

                {/* Tab buttons */}
                <div className="flex gap-1 bg-[rgb(var(--color-fg))]/[0.05] rounded-xl p-1">
                    {(['friends', 'requests', 'add'] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 py-1.5 text-xs rounded-lg transition-colors relative
                                ${tab === t
                                    ? 'bg-[rgb(var(--color-accent))]/20 text-[rgb(var(--color-accent))] font-semibold'
                                    : 'text-[rgb(var(--color-fg))]/60 hover:text-[rgb(var(--color-fg))]/80'
                                }`}
                        >
                            {t === 'friends' ? `Friends (${activeFriends.length})` :
                             t === 'requests' ? `Requests` : 'Add'}
                            {t === 'requests' && pendingCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {tab === 'friends' && (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                        {activeFriends.length === 0 ? (
                            <p className="text-center text-sm text-[rgb(var(--color-fg))]/50 py-6">
                                No friends yet. Share your code to get started!
                            </p>
                        ) : (
                            activeFriends.map(f => (
                                <FriendRow
                                    key={f.friendshipId}
                                    friend={f}
                                    today={today}
                                    onRemove={() => onRemoveFriend(f.friendshipId)}
                                    onChallenge={onChallenge ? () => onChallenge(f.friendUid) : undefined}
                                />
                            ))
                        )}
                    </div>
                )}

                {tab === 'requests' && (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                        {incomingRequests.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-[rgb(var(--color-fg))]/50 uppercase">Incoming</p>
                                {incomingRequests.map(f => (
                                    <div key={f.friendshipId} className="flex items-center justify-between p-2 rounded-xl bg-[rgb(var(--color-fg))]/[0.03]">
                                        <span className="text-sm font-medium">{f.friendName}</span>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="gold" onClick={() => onAcceptRequest(f.friendshipId)}>
                                                Accept
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => onRemoveFriend(f.friendshipId)}>
                                                Decline
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {outgoingRequests.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-[rgb(var(--color-fg))]/50 uppercase">Sent</p>
                                {outgoingRequests.map(f => (
                                    <div key={f.friendshipId} className="flex items-center justify-between p-2 rounded-xl bg-[rgb(var(--color-fg))]/[0.03]">
                                        <span className="text-sm">{f.friendName}</span>
                                        <Button size="sm" variant="ghost" onClick={() => onRemoveFriend(f.friendshipId)}>
                                            Cancel
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                            <p className="text-center text-sm text-[rgb(var(--color-fg))]/50 py-6">
                                No pending requests
                            </p>
                        )}
                    </div>
                )}

                {tab === 'add' && (
                    <div className="space-y-4">
                        {/* My code */}
                        <div className="text-center space-y-2">
                            <p className="text-xs text-[rgb(var(--color-fg))]/50">Your friend code</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-xl font-bold font-[family-name:var(--font-chalk)] text-[rgb(var(--color-accent))] tracking-wider">
                                    {friendCode || '...'}
                                </span>
                                <Button size="sm" variant="ghost" onClick={onShareCode}>
                                    Share
                                </Button>
                            </div>
                        </div>

                        {/* Add by code */}
                        <div className="space-y-2">
                            <p className="text-xs text-[rgb(var(--color-fg))]/50">Enter a friend&apos;s code</p>
                            <div className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={codeInput}
                                    onChange={e => { setCodeInput(e.target.value); setAddStatus(null); }}
                                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                    placeholder="BEE-XXXX"
                                    maxLength={8}
                                    className="flex-1 px-3 py-2 rounded-xl text-sm
                                        bg-[rgb(var(--color-fg))]/[0.05] border border-[rgb(var(--color-fg))]/10
                                        focus:border-[rgb(var(--color-accent))]/40 focus:outline-none
                                        placeholder:text-[rgb(var(--color-fg))]/30 uppercase tracking-wider"
                                />
                                <Button
                                    size="sm"
                                    variant="gold"
                                    onClick={handleAdd}
                                    disabled={!codeInput.trim() || adding}
                                >
                                    {adding ? '...' : 'Add'}
                                </Button>
                            </div>
                            {addStatus?.ok && (
                                <p className="text-xs text-green-500">Friend request sent!</p>
                            )}
                            {addStatus?.error && (
                                <p className="text-xs text-red-500">{addStatus.error}</p>
                            )}
                            {!isPremium && activeFriends.length >= friendCap && (
                                <p className="text-xs text-amber-500">
                                    Friend limit reached ({friendCap}). Upgrade for more!
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </ModalShell>
    );
}

// ── Friend Row ───────────────────────────────────────────────────────────────

function FriendRow({ friend, today, onRemove, onChallenge }: {
    friend: FriendEntry;
    today: string;
    onRemove: () => void;
    onChallenge?: () => void;
}) {
    const theyPlayedToday = friend.theirLastActive === today;
    const iPlayedToday = friend.myLastActive === today;

    return (
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[rgb(var(--color-fg))]/[0.03]">
            {/* Avatar placeholder */}
            <div className="w-8 h-8 rounded-full bg-[rgb(var(--color-accent))]/20 flex items-center justify-center text-xs font-bold text-[rgb(var(--color-accent))]">
                {friend.friendName.charAt(0).toUpperCase()}
            </div>

            {/* Name + streak */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{friend.friendName}</p>
                {friend.buddyStreak > 0 && (
                    <p className="text-xs text-[rgb(var(--color-fg))]/50 flex items-center gap-1">
                        <span className="text-orange-400">🔥</span>
                        {friend.buddyStreak} day{friend.buddyStreak !== 1 ? 's' : ''}
                        {!theyPlayedToday && iPlayedToday && (
                            <span className="text-amber-500 ml-1">⏳ waiting</span>
                        )}
                    </p>
                )}
                {friend.buddyStreak === 0 && (
                    <p className="text-xs text-[rgb(var(--color-fg))]/30">
                        {theyPlayedToday ? 'Active today' : 'No streak yet'}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-1.5 shrink-0">
                {onChallenge && (
                    <Button size="sm" variant="gold" onClick={onChallenge}>
                        ⚔️
                    </Button>
                )}
                <Button size="sm" variant="ghost" onClick={onRemove}>
                    ✕
                </Button>
            </div>
        </div>
    );
}
