/**
 * components/BuddyStreakCard.tsx
 *
 * Compact card showing the user's best active buddy streak on PathPage.
 * Shows streak count, friend name, and status indicator.
 */
import type { FriendEntry } from '../hooks/useFriends';

interface Props {
    friends: FriendEntry[];
    onTap: () => void;
}

export function BuddyStreakCard({ friends, onTap }: Props) {
    const activeFriends = friends.filter(f => f.status === 'active');
    if (activeFriends.length === 0) return null;

    // Find the best active streak
    const best = activeFriends.reduce((a, b) => a.buddyStreak > b.buddyStreak ? a : b);
    const today = new Date().toISOString().slice(0, 10);
    const iPlayedToday = best.myLastActive === today;
    const theyPlayedToday = best.theirLastActive === today;
    const bothPlayed = iPlayedToday && theyPlayedToday;

    // Don't render if no one has any streak and no one played today
    if (best.buddyStreak === 0 && !iPlayedToday && !theyPlayedToday) return null;

    return (
        <button
            onClick={onTap}
            className="w-full text-left rounded-2xl border-l-4 border-orange-400
                bg-[rgb(var(--color-fg))]/[0.03] p-3 flex items-center gap-3
                hover:bg-[rgb(var(--color-fg))]/[0.06] transition-colors"
        >
            {/* Fire icon */}
            <span className="text-2xl" role="img" aria-label="streak">🔥</span>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                    {best.buddyStreak > 0
                        ? `${best.buddyStreak} day buddy streak`
                        : 'Buddy streak'
                    }
                </p>
                <p className="text-xs text-[rgb(var(--color-fg))]/50 truncate">
                    You & {best.friendName}
                    {activeFriends.length > 1 && ` (+${activeFriends.length - 1} more)`}
                </p>
            </div>

            {/* Status */}
            <div className="shrink-0 text-xs">
                {bothPlayed ? (
                    <span className="text-green-500">✓ Both played</span>
                ) : iPlayedToday && !theyPlayedToday ? (
                    <span className="text-amber-500">⏳ Waiting</span>
                ) : !iPlayedToday ? (
                    <span className="text-red-400">Play today!</span>
                ) : null}
            </div>
        </button>
    );
}
