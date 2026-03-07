import { describe, it, expect } from 'vitest';
import { friendshipId } from '../hooks/useFriends';
import { FREE_FRIEND_CAP, PREMIUM_FRIEND_CAP, FREE_DAILY_CHALLENGES } from '../config';
import type { FriendEntry } from '../hooks/useFriends';
import type { ChallengeInfo, WordResult } from '../hooks/useSameWordChallenge';

// ── friendshipId ─────────────────────────────────────────────────────────────

describe('friendshipId', () => {
    it('returns deterministic composite ID regardless of argument order', () => {
        const id1 = friendshipId('userA', 'userB');
        const id2 = friendshipId('userB', 'userA');
        expect(id1).toBe(id2);
    });

    it('sorts UIDs lexicographically', () => {
        expect(friendshipId('bob', 'alice')).toBe('alice__bob');
        expect(friendshipId('alice', 'bob')).toBe('alice__bob');
    });

    it('uses double underscore separator', () => {
        const id = friendshipId('aaa', 'zzz');
        expect(id).toContain('__');
        expect(id.split('__')).toHaveLength(2);
    });

    it('handles identical UIDs (self-friendship edge case)', () => {
        const id = friendshipId('same', 'same');
        expect(id).toBe('same__same');
    });
});

// ── Config constants ─────────────────────────────────────────────────────────

describe('friend config constants', () => {
    it('FREE_FRIEND_CAP is a positive number', () => {
        expect(FREE_FRIEND_CAP).toBeGreaterThan(0);
    });

    it('PREMIUM_FRIEND_CAP is greater than FREE_FRIEND_CAP', () => {
        expect(PREMIUM_FRIEND_CAP).toBeGreaterThan(FREE_FRIEND_CAP);
    });

    it('FREE_DAILY_CHALLENGES is at least 1', () => {
        expect(FREE_DAILY_CHALLENGES).toBeGreaterThanOrEqual(1);
    });
});

// ── FriendEntry type shape ───────────────────────────────────────────────────

describe('FriendEntry shape', () => {
    it('has all required fields', () => {
        const entry: FriendEntry = {
            friendshipId: 'a__b',
            friendUid: 'b',
            friendName: 'Bob',
            status: 'active',
            isIncoming: false,
            buddyStreak: 5,
            longestStreak: 10,
            myLastActive: '2026-01-15',
            theirLastActive: '2026-01-15',
        };
        expect(entry.friendshipId).toBe('a__b');
        expect(entry.friendUid).toBe('b');
        expect(entry.status).toBe('active');
        expect(entry.buddyStreak).toBe(5);
    });

    it('supports optional avatar and theme', () => {
        const entry: FriendEntry = {
            friendshipId: 'a__b',
            friendUid: 'b',
            friendName: 'Bob',
            friendAvatar: 'default',
            friendTheme: 'ocean',
            status: 'active',
            isIncoming: false,
            buddyStreak: 0,
            longestStreak: 0,
            myLastActive: '',
            theirLastActive: '',
        };
        expect(entry.friendAvatar).toBe('default');
        expect(entry.friendTheme).toBe('ocean');
    });
});

// ── Buddy streak logic (unit-level simulation) ──────────────────────────────

describe('buddy streak logic', () => {
    function simulateStreakUpdate(
        streakCount: number,
        streakLastDate: string,
        theirLastActive: string,
        today: string,
    ) {
        // Simulate the transaction logic from useFriends.updateMyActivity
        const updates: { streakCount: number; streakLastDate: string } = {
            streakCount,
            streakLastDate,
        };

        if (theirLastActive === today) {
            // Both played today
            const yesterday = (() => {
                const d = new Date(today + 'T00:00:00Z');
                d.setUTCDate(d.getUTCDate() - 1);
                return d.toISOString().slice(0, 10);
            })();

            if (streakLastDate === yesterday) {
                updates.streakCount = streakCount + 1;
            } else if (streakLastDate !== today) {
                updates.streakCount = 1;
            }
            if (streakLastDate !== today) {
                updates.streakLastDate = today;
            }
        }

        return updates;
    }

    it('starts a new streak when both play today with no prior streak', () => {
        const result = simulateStreakUpdate(0, '', '2026-01-15', '2026-01-15');
        expect(result.streakCount).toBe(1);
        expect(result.streakLastDate).toBe('2026-01-15');
    });

    it('continues streak when both play on consecutive days', () => {
        const result = simulateStreakUpdate(3, '2026-01-14', '2026-01-15', '2026-01-15');
        expect(result.streakCount).toBe(4);
        expect(result.streakLastDate).toBe('2026-01-15');
    });

    it('resets streak when there is a gap', () => {
        const result = simulateStreakUpdate(5, '2026-01-10', '2026-01-15', '2026-01-15');
        expect(result.streakCount).toBe(1);
        expect(result.streakLastDate).toBe('2026-01-15');
    });

    it('does not double-count same day', () => {
        const result = simulateStreakUpdate(3, '2026-01-15', '2026-01-15', '2026-01-15');
        expect(result.streakCount).toBe(3); // No change — already counted today
        expect(result.streakLastDate).toBe('2026-01-15');
    });

    it('does not update streak when only I played', () => {
        const result = simulateStreakUpdate(3, '2026-01-14', '', '2026-01-15');
        expect(result.streakCount).toBe(3); // No change — they haven't played
    });
});

// ── Challenge result comparison ──────────────────────────────────────────────

describe('challenge result comparison', () => {
    function computeWinner(my: WordResult[], their: WordResult[]) {
        const myScore = my.filter(r => r.correct).length;
        const theirScore = their.filter(r => r.correct).length;
        const myTime = my.reduce((s, r) => s + r.timeMs, 0);
        const theirTime = their.reduce((s, r) => s + r.timeMs, 0);

        if (myScore > theirScore) return 'me';
        if (theirScore > myScore) return 'them';
        if (myTime < theirTime) return 'me';
        if (theirTime < myTime) return 'them';
        return 'tie';
    }

    it('player with more correct answers wins', () => {
        const my: WordResult[] = [
            { word: 'cat', correct: true, timeMs: 2000 },
            { word: 'dog', correct: true, timeMs: 3000 },
        ];
        const their: WordResult[] = [
            { word: 'cat', correct: true, timeMs: 1000 },
            { word: 'dog', correct: false, timeMs: 1500 },
        ];
        expect(computeWinner(my, their)).toBe('me');
    });

    it('faster player wins on score tie', () => {
        const my: WordResult[] = [
            { word: 'cat', correct: true, timeMs: 1500 },
            { word: 'dog', correct: true, timeMs: 1500 },
        ];
        const their: WordResult[] = [
            { word: 'cat', correct: true, timeMs: 2000 },
            { word: 'dog', correct: true, timeMs: 2000 },
        ];
        expect(computeWinner(my, their)).toBe('me');
    });

    it('returns tie when score and time match', () => {
        const my: WordResult[] = [
            { word: 'cat', correct: true, timeMs: 2000 },
        ];
        const their: WordResult[] = [
            { word: 'cat', correct: true, timeMs: 2000 },
        ];
        expect(computeWinner(my, their)).toBe('tie');
    });

    it('opponent wins with more correct answers', () => {
        const my: WordResult[] = [
            { word: 'cat', correct: false, timeMs: 1000 },
        ];
        const their: WordResult[] = [
            { word: 'cat', correct: true, timeMs: 5000 },
        ];
        expect(computeWinner(my, their)).toBe('them');
    });
});

// ── ChallengeInfo type shape ─────────────────────────────────────────────────

describe('ChallengeInfo shape', () => {
    it('has all required fields', () => {
        const now = new Date();
        const challenge: ChallengeInfo = {
            roomId: 'async_user1_123',
            roomCode: 'ABCD12',
            opponentName: 'Alice',
            opponentUid: 'user2',
            wordCount: 10,
            myCompleted: true,
            theirCompleted: false,
            myResults: [{ word: 'cat', correct: true, timeMs: 1500 }],
            theirResults: null,
            createdAt: now,
            expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
            isCreator: true,
        };
        expect(challenge.roomId).toContain('async_');
        expect(challenge.wordCount).toBe(10);
        expect(challenge.expiresAt.getTime()).toBeGreaterThan(challenge.createdAt.getTime());
    });
});

// ── Friend code format ───────────────────────────────────────────────────────

describe('friend code format', () => {
    const CODE_RE = /^BEE-[A-Z2-9]{4}$/;

    it('matches BEE-XXXX pattern', () => {
        expect(CODE_RE.test('BEE-ABCD')).toBe(true);
        expect(CODE_RE.test('BEE-2345')).toBe(true);
        expect(CODE_RE.test('BEE-A2B3')).toBe(true);
    });

    it('rejects invalid formats', () => {
        expect(CODE_RE.test('BEE-abc1')).toBe(false); // lowercase
        expect(CODE_RE.test('BEE-0000')).toBe(false); // contains 0
        expect(CODE_RE.test('BEE-1111')).toBe(false); // contains 1
        expect(CODE_RE.test('SPELL-ABCD')).toBe(false); // wrong prefix
        expect(CODE_RE.test('BEE-ABCDE')).toBe(false); // too long
        expect(CODE_RE.test('BEE-ABC')).toBe(false); // too short
    });

    it('excludes digits 0 and 1 (ambiguous with O and I)', () => {
        expect(CODE_RE.test('BEE-A0B2')).toBe(false); // 0 not in charset
        expect(CODE_RE.test('BEE-A1B2')).toBe(false); // 1 not in charset
    });
});
