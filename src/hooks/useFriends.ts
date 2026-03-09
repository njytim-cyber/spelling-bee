/**
 * hooks/useFriends.ts
 *
 * Manages friend relationships: friend codes, add/remove/accept friends,
 * buddy streaks (mutual daily practice commitment).
 *
 * Data model: top-level `friendships` collection with composite doc ID
 * (lexicographically sorted UID pair). Both users query via `array-contains`.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc,
    collection, query, where, onSnapshot, serverTimestamp, runTransaction, limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { FIRESTORE, STORAGE_KEYS } from '../config';
import { trackEvent } from '../utils/analytics';

// ── Types ────────────────────────────────────────────────────────────────────

export interface FriendshipDoc {
    uids: [string, string];
    uidA: string;
    uidB: string;
    status: 'pending' | 'active';
    requestedBy: string;
    nameA: string;
    nameB: string;
    avatarA?: string;
    avatarB?: string;
    themeA?: string;
    themeB?: string;
    streakCount: number;
    lastActiveA: string;
    lastActiveB: string;
    streakLastDate: string;
    longestStreak: number;
}

export interface FriendEntry {
    friendshipId: string;
    friendUid: string;
    friendName: string;
    friendAvatar?: string;
    friendTheme?: string;
    status: 'pending' | 'active';
    isIncoming: boolean;
    buddyStreak: number;
    longestStreak: number;
    myLastActive: string;
    theirLastActive: string;
}

export interface UseFriendsReturn {
    friends: FriendEntry[];
    pendingCount: number;
    friendCode: string;
    loading: boolean;
    addFriend: (code: string) => Promise<{ ok: boolean; error?: string }>;
    acceptRequest: (friendshipId: string) => Promise<void>;
    removeFriend: (friendshipId: string) => Promise<void>;
    updateMyActivity: (today: string) => Promise<void>;
    shareFriendCode: () => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateFriendCode(): string {
    let code = '';
    const arr = crypto.getRandomValues(new Uint8Array(4));
    for (let i = 0; i < 4; i++) {
        code += CODE_CHARS[arr[i] % CODE_CHARS.length];
    }
    return `BEE-${code}`;
}

/** Deterministic friendship document ID from two UIDs */
export function friendshipId(a: string, b: string): string {
    const sorted = [a, b].sort();
    return `${sorted[0]}__${sorted[1]}`;
}

/** Get yesterday's date string relative to a given YYYY-MM-DD */
function yesterdayOf(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}

/** Convert a FriendshipDoc to a FriendEntry for the current user */
function docToEntry(id: string, data: FriendshipDoc, myUid: string): FriendEntry {
    const isA = data.uidA === myUid;
    return {
        friendshipId: id,
        friendUid: isA ? data.uidB : data.uidA,
        friendName: isA ? data.nameB : data.nameA,
        friendAvatar: isA ? data.avatarB : data.avatarA,
        friendTheme: isA ? data.themeB : data.themeA,
        status: data.status,
        isIncoming: data.requestedBy !== myUid,
        buddyStreak: data.streakCount,
        longestStreak: data.longestStreak,
        myLastActive: isA ? data.lastActiveA : data.lastActiveB,
        theirLastActive: isA ? data.lastActiveB : data.lastActiveA,
    };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useFriends(
    uid: string | null,
    displayName: string,
    stickFigureStyle?: string,
    activeThemeId?: string,
): UseFriendsReturn {
    const [friends, setFriends] = useState<FriendEntry[]>([]);
    const [friendCode, setFriendCode] = useState('');
    const [loading, setLoading] = useState(!!uid);
    const unsubRef = useRef<(() => void) | null>(null);

    // ── Friend code generation / sync ────────────────────────────────────────

    useEffect(() => {
        if (!uid) return;

        let cancelled = false;

        (async () => {
            // Check localStorage first
            let code = localStorage.getItem(STORAGE_KEYS.friendCode) || '';

            if (!code) {
                // Check Firestore user doc for existing code
                try {
                    const userSnap = await getDoc(doc(db, FIRESTORE.USERS, uid));
                    if (!cancelled && userSnap.exists() && userSnap.data().friendCode) {
                        code = userSnap.data().friendCode;
                    }
                } catch { /* offline — generate locally */ }
            }

            if (!code) {
                // Generate new code and register in friendCodes collection
                for (let attempt = 0; attempt < 5; attempt++) {
                    code = generateFriendCode();
                    try {
                        const codeRef = doc(db, FIRESTORE.FRIEND_CODES, code);
                        const existing = await getDoc(codeRef);
                        if (!existing.exists()) {
                            await setDoc(codeRef, { uid, createdAt: serverTimestamp() });
                            // Save to user doc
                            await setDoc(doc(db, FIRESTORE.USERS, uid), { friendCode: code }, { merge: true });
                            break;
                        }
                        // Collision — retry
                        code = '';
                    } catch {
                        // Offline — just use local code
                        if (!code) code = generateFriendCode();
                        break;
                    }
                }
            }

            if (!cancelled && code) {
                localStorage.setItem(STORAGE_KEYS.friendCode, code);
                setFriendCode(code);
            }
        })();

        return () => { cancelled = true; };
    }, [uid]);

    // ── Real-time friendship listener ────────────────────────────────────────

    useEffect(() => {
        if (!uid) return;

        if (unsubRef.current) unsubRef.current();

        const q = query(
            collection(db, FIRESTORE.FRIENDSHIPS),
            where('uids', 'array-contains', uid),
        );

        const unsub = onSnapshot(
            q,
            (snap) => {
                const entries: FriendEntry[] = [];
                snap.forEach((d) => {
                    entries.push(docToEntry(d.id, d.data() as FriendshipDoc, uid));
                });
                // Sort: active first, then by streak descending
                entries.sort((a, b) => {
                    if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
                    return b.buddyStreak - a.buddyStreak;
                });
                setFriends(entries);
                setLoading(false);
            },
            (err) => {
                console.warn('Friends listener error:', err);
                setLoading(false);
            },
        );
        unsubRef.current = unsub;

        return () => {
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }
        };
    }, [uid]);

    // ── Deep link: ?friend=BEE-XXXX (extracted once, consumed after addFriend defined) ──

    const [pendingDeepLink] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const friendParam = params.get('friend');
        if (friendParam) {
            params.delete('friend');
            const remaining = params.toString();
            const newUrl = remaining ? `${window.location.pathname}?${remaining}` : window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            return friendParam;
        }
        return null;
    });

    // ── Add friend by code ───────────────────────────────────────────────────

    const addFriend = useCallback(async (code: string): Promise<{ ok: boolean; error?: string }> => {
        if (!uid) return { ok: false, error: 'Not signed in' };

        const normalised = code.toUpperCase().trim();

        // Can't add yourself
        if (normalised === friendCode) {
            return { ok: false, error: "Can't add yourself" };
        }

        try {
            // Look up the code — try friend codes first, then referral codes
            let targetUid: string | null = null;

            const codeSnap = await getDoc(doc(db, FIRESTORE.FRIEND_CODES, normalised));
            if (codeSnap.exists()) {
                targetUid = codeSnap.data().uid as string;
            } else if (normalised.startsWith('SPELL-')) {
                // Fall back to referral code lookup
                const q = query(
                    collection(db, FIRESTORE.USERS),
                    where('referralCode', '==', normalised),
                    firestoreLimit(1),
                );
                const snap = await getDocs(q);
                if (!snap.empty) {
                    targetUid = snap.docs[0].id;
                }
            }

            if (!targetUid) {
                return { ok: false, error: 'Code not found' };
            }
            if (targetUid === uid) {
                return { ok: false, error: "Can't add yourself" };
            }

            // Check if friendship already exists
            const fId = friendshipId(uid, targetUid);
            const existingSnap = await getDoc(doc(db, FIRESTORE.FRIENDSHIPS, fId));
            if (existingSnap.exists()) {
                return { ok: false, error: 'Already friends or request pending' };
            }

            // Get target's display name
            const targetSnap = await getDoc(doc(db, FIRESTORE.USERS, targetUid));
            const targetName = targetSnap.exists() ? (targetSnap.data().displayName || 'Player') : 'Player';
            const targetAvatar = targetSnap.exists() ? targetSnap.data().stickFigureStyle : undefined;
            const targetTheme = targetSnap.exists() ? targetSnap.data().activeThemeId : undefined;

            // Create friendship doc
            const sorted = [uid, targetUid].sort();
            const isA = sorted[0] === uid;
            const friendshipDoc: FriendshipDoc & { createdAt: ReturnType<typeof serverTimestamp>; updatedAt: ReturnType<typeof serverTimestamp> } = {
                uids: sorted as [string, string],
                uidA: sorted[0],
                uidB: sorted[1],
                status: 'pending',
                requestedBy: uid,
                nameA: isA ? displayName : targetName,
                nameB: isA ? targetName : displayName,
                avatarA: isA ? stickFigureStyle : targetAvatar,
                avatarB: isA ? targetAvatar : stickFigureStyle,
                themeA: isA ? activeThemeId : targetTheme,
                themeB: isA ? targetTheme : activeThemeId,
                streakCount: 0,
                lastActiveA: '',
                lastActiveB: '',
                streakLastDate: '',
                longestStreak: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await setDoc(doc(db, FIRESTORE.FRIENDSHIPS, fId), friendshipDoc);
            trackEvent('friend_request_sent');
            return { ok: true };
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to add friend';
            return { ok: false, error: msg };
        }
    }, [uid, friendCode, displayName, stickFigureStyle, activeThemeId]);

    // ── Consume deep link (runs once after addFriend is ready) ───────────────

    const deepLinkConsumed = useRef(false);
    useEffect(() => {
        if (pendingDeepLink && uid && friendCode && !deepLinkConsumed.current) {
            deepLinkConsumed.current = true;
            addFriend(pendingDeepLink);
        }
    }, [pendingDeepLink, uid, friendCode, addFriend]);

    // ── Accept friend request ────────────────────────────────────────────────

    const acceptRequest = useCallback(async (fId: string) => {
        if (!uid) return;
        try {
            await updateDoc(doc(db, FIRESTORE.FRIENDSHIPS, fId), {
                status: 'active',
                updatedAt: serverTimestamp(),
            });
            trackEvent('friend_request_accepted');
        } catch (err) {
            console.warn('Failed to accept friend request:', err);
        }
    }, [uid]);

    // ── Remove friend ────────────────────────────────────────────────────────

    const removeFriend = useCallback(async (fId: string) => {
        if (!uid) return;
        try {
            await deleteDoc(doc(db, FIRESTORE.FRIENDSHIPS, fId));
            trackEvent('friend_removed');
        } catch (err) {
            console.warn('Failed to remove friend:', err);
        }
    }, [uid]);

    // ── Update my activity (called after session completion) ─────────────────

    const updateMyActivity = useCallback(async (today: string) => {
        if (!uid) return;

        const activeFriends = friends.filter(f => f.status === 'active');
        if (activeFriends.length === 0) return;

        for (const friend of activeFriends) {
            try {
                const fRef = doc(db, FIRESTORE.FRIENDSHIPS, friend.friendshipId);

                await runTransaction(db, async (tx) => {
                    const snap = await tx.get(fRef);
                    if (!snap.exists()) return;

                    const data = snap.data() as FriendshipDoc;
                    const isA = data.uidA === uid;
                    const myField = isA ? 'lastActiveA' : 'lastActiveB';
                    const theirField = isA ? 'lastActiveB' : 'lastActiveA';

                    const updates: Record<string, unknown> = {
                        [myField]: today,
                        updatedAt: serverTimestamp(),
                    };

                    // Check if both are active today
                    const theirDate = data[theirField] as string;
                    if (theirDate === today) {
                        // Both played today — check streak
                        const yesterday = yesterdayOf(today);
                        if (data.streakLastDate === yesterday) {
                            // Continue streak
                            const newStreak = data.streakCount + 1;
                            updates.streakCount = newStreak;
                            updates.longestStreak = Math.max(data.longestStreak, newStreak);
                        } else if (data.streakLastDate !== today) {
                            // Start or reset streak
                            updates.streakCount = 1;
                            updates.longestStreak = Math.max(data.longestStreak, 1);
                        }
                        // else: already counted today — no-op on streak
                        if (data.streakLastDate !== today) {
                            updates.streakLastDate = today;
                        }
                    }

                    tx.update(fRef, updates);
                });
            } catch (err) {
                console.warn('Failed to update buddy activity:', err);
            }
        }

        // Check for milestone celebrations
        const bestStreak = Math.max(0, ...activeFriends.map(f => f.buddyStreak));
        if (bestStreak === 7 || bestStreak === 14 || bestStreak === 30) {
            trackEvent('buddy_streak_milestone', { streak: bestStreak });
        }
    }, [uid, friends]);

    // ── Share friend code ────────────────────────────────────────────────────

    const shareFriendCode = useCallback(async () => {
        if (!friendCode) return;
        const url = `${window.location.origin}?friend=${friendCode}`;
        const text = `Add me on Spelling Bee! My friend code is ${friendCode}\n\n${url}`;

        try {
            if (navigator.share) {
                await navigator.share({ text });
            } else {
                await navigator.clipboard.writeText(text);
            }
            trackEvent('friend_code_shared');
        } catch {
            // User cancelled
        }
    }, [friendCode]);

    // ── Derived state ────────────────────────────────────────────────────────

    const pendingCount = friends.filter(f => f.status === 'pending' && f.isIncoming).length;

    return {
        friends,
        pendingCount,
        friendCode,
        loading,
        addFriend,
        acceptRequest,
        removeFriend,
        updateMyActivity,
        shareFriendCode,
    };
}
