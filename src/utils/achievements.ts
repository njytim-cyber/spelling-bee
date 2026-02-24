/**
 * utils/achievements.ts
 *
 * Generic achievement engine — subject-agnostic.
 * Domain-specific achievements live in their respective domain folders
 * (e.g. src/domains/spelling/spellingAchievements.ts).
 */
import { STORAGE_KEYS, FIRESTORE } from '../config';

// ── Generic Achievement interface ─────────────────────────────────────────────

/** Generic achievement that works with any stats shape TStats */
export interface Achievement<TStats = Record<string, unknown>> {
    id: string;
    name: string;
    desc: string;
    check: (s: TStats) => boolean;
}

// ── Storage helpers (engine-level, key from config) ───────────────────────────

const STORAGE_KEY = STORAGE_KEYS.achievements;

/** Load unlocked achievement IDs from localStorage (sync fast path) */
export function loadUnlocked(): Set<string> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
}

/** Restore from Firestore if localStorage is empty */
export async function restoreUnlockedFromCloud(uid: string): Promise<Set<string> | null> {
    try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        const snap = await getDoc(doc(db, FIRESTORE.USERS, uid));
        if (snap.exists() && snap.data().achievements) {
            const cloudIds = new Set<string>(snap.data().achievements);
            const local = loadUnlocked();
            const merged = new Set([...local, ...cloudIds]);
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...merged]));
            return merged;
        }
    } catch (err) {
        console.warn('Failed to restore achievements from cloud:', err);
    }
    return null;
}

/** Save unlocked achievement IDs — localStorage + Firestore */
export function saveUnlocked(ids: Set<string>, uid?: string | null) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    if (uid) {
        import('firebase/firestore').then(({ doc, setDoc }) => {
            import('./firebase').then(({ db }) => {
                setDoc(doc(db, FIRESTORE.USERS, uid), {
                    achievements: [...ids],
                }, { merge: true }).catch(err => {
                    console.warn('Failed to sync achievements to cloud:', err);
                });
            });
        });
    }
}

/** Check all achievements against stats, returns newly unlocked IDs */
export function checkAchievements<TStats>(
    achievements: Achievement<TStats>[],
    stats: TStats,
    unlocked: Set<string>,
): string[] {
    const newlyUnlocked: string[] = [];
    for (const a of achievements) {
        if (!unlocked.has(a.id) && a.check(stats)) {
            newlyUnlocked.push(a.id);
        }
    }
    return newlyUnlocked;
}

