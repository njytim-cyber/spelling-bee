/**
 * hooks/useCustomLists.ts
 *
 * CRUD for custom word lists with localStorage + Firestore cloud sync.
 * Words found in the word bank are auto-enriched with definitions,
 * pronunciation, example sentences, and pre-baked distractors.
 *
 * Sync pattern mirrors useStats.ts:
 *   1. Mount: load from localStorage (fast)
 *   2. uid change: fetch from Firestore, merge with local
 *   3. Every persist(): save localStorage immediately + debounced Firestore write
 *   4. Unmount: flush pending cloud write
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import type { CustomWord, CustomWordList } from '../types/customList';
import { getWordMap } from '../domains/spelling/words';
import { STORAGE_KEYS, FIRESTORE } from '../config';

const MAX_LISTS = 20;
const MAX_WORDS_PER_LIST = 200;
const CLOUD_DEBOUNCE_MS = 2000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Enrich a raw word string from the 117K word bank */
export function enrichWord(raw: string): CustomWord {
    const wordMap = getWordMap();
    const lower = raw.toLowerCase().trim();
    const match = wordMap.get(lower);
    if (match) {
        return {
            word: match.word,
            definition: match.definition,
            pronunciation: match.pronunciation,
            partOfSpeech: match.partOfSpeech,
            exampleSentence: match.exampleSentence,
            difficulty: match.difficulty,
            enriched: true,
            distractors: match.distractors,
        };
    }
    return { word: lower, enriched: false };
}

/** Re-enrich words that have enriched: true to restore distractors stripped during serialization */
function reEnrichWords(words: CustomWord[]): CustomWord[] {
    const wordMap = getWordMap();
    return words.map(w => {
        if (w.enriched && !w.distractors?.length) {
            const match = wordMap.get(w.word.toLowerCase());
            if (match) {
                return {
                    ...w,
                    distractors: match.distractors,
                    // Also backfill any new fields that may have been added since last save
                    exampleSentence: w.exampleSentence ?? match.exampleSentence,
                    difficulty: w.difficulty ?? match.difficulty,
                };
            }
        }
        return w;
    });
}

/** Strip distractors before serialization to save ~40% payload */
function stripForStorage(lists: CustomWordList[]): CustomWordList[] {
    return lists.map(l => ({
        ...l,
        words: l.words.map(w => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { distractors: _d, ...rest } = w;
            return rest as CustomWord;
        }),
    }));
}

// ── Persistence ──────────────────────────────────────────────────────────────

function loadLists(): CustomWordList[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.customLists);
        if (!raw) return [];
        const lists: CustomWordList[] = JSON.parse(raw);
        return lists.map(l => ({ ...l, words: reEnrichWords(l.words) }));
    } catch {
        return [];
    }
}

function saveLists(lists: CustomWordList[]) {
    localStorage.setItem(STORAGE_KEYS.customLists, JSON.stringify(stripForStorage(lists)));
}

async function loadListsCloud(uid: string): Promise<CustomWordList[] | null> {
    try {
        const snap = await getDoc(doc(db, FIRESTORE.USERS, uid));
        if (snap.exists()) {
            const prefs = snap.data().preferences;
            if (prefs?.customLists) {
                const lists: CustomWordList[] = JSON.parse(prefs.customLists);
                return lists.map(l => ({ ...l, words: reEnrichWords(l.words) }));
            }
        }
    } catch { /* silent */ }
    return null;
}

async function saveListsCloud(uid: string, lists: CustomWordList[]) {
    try {
        await setDoc(doc(db, FIRESTORE.USERS, uid), {
            preferences: { customLists: JSON.stringify(stripForStorage(lists)) },
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch { /* silent */ }
}

/** Merge local and cloud lists: union by id, latest updatedAt wins for conflicts */
export function mergeCustomLists(local: CustomWordList[], cloud: CustomWordList[]): CustomWordList[] {
    const map = new Map<string, CustomWordList>();
    for (const l of local) map.set(l.id, l);
    for (const c of cloud) {
        const existing = map.get(c.id);
        if (!existing || c.updatedAt > existing.updatedAt) {
            map.set(c.id, c);
        }
    }
    return Array.from(map.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCustomLists(uid: string | null) {
    const [lists, setLists] = useState<CustomWordList[]>(loadLists);
    const cloudTimerRef = useRef(0);
    const uidRef = useRef(uid);
    useEffect(() => { uidRef.current = uid; }, [uid]);
    const listsRef = useRef(lists);
    useEffect(() => { listsRef.current = lists; }, [lists]);

    // Restore from Firestore on uid change
    const prevUidRef = useRef(uid);
    useEffect(() => {
        if (!uid) return;
        const uidChanged = prevUidRef.current !== uid;
        prevUidRef.current = uid;
        const hasLocal = listsRef.current.length > 0;
        if (hasLocal && !uidChanged) return;
        loadListsCloud(uid).then(cloud => {
            if (!cloud) return;
            setLists(prev => {
                const merged = mergeCustomLists(prev, cloud);
                saveLists(merged);
                return merged;
            });
        });
    }, [uid]);

    // Flush pending cloud write on unmount
    useEffect(() => {
        return () => {
            clearTimeout(cloudTimerRef.current);
            if (uidRef.current && listsRef.current.length > 0) {
                saveListsCloud(uidRef.current, listsRef.current);
            }
        };
    }, []);

    const persist = useCallback((next: CustomWordList[]) => {
        setLists(next);
        saveLists(next);
        // Debounced cloud sync
        if (uidRef.current) {
            clearTimeout(cloudTimerRef.current);
            cloudTimerRef.current = window.setTimeout(() => {
                if (uidRef.current) saveListsCloud(uidRef.current, next);
            }, CLOUD_DEBOUNCE_MS);
        }
    }, []);

    const createList = useCallback((name: string, rawWords: string[]): CustomWordList | null => {
        if (listsRef.current.length >= MAX_LISTS) return null;
        const words = rawWords
            .map(w => w.trim())
            .filter(w => w.length > 0)
            .slice(0, MAX_WORDS_PER_LIST)
            .map(enrichWord);
        const now = new Date().toISOString();
        const list: CustomWordList = {
            id: generateId(),
            name: name.trim() || 'My List',
            words,
            createdAt: now,
            updatedAt: now,
        };
        const next = [...listsRef.current, list];
        persist(next);
        return list;
    }, [persist]);

    const createListFromWords = useCallback((name: string, words: CustomWord[]): CustomWordList | null => {
        if (listsRef.current.length >= MAX_LISTS) return null;
        const now = new Date().toISOString();
        const list: CustomWordList = {
            id: generateId(),
            name: name.trim() || 'My List',
            words: words.slice(0, MAX_WORDS_PER_LIST),
            createdAt: now,
            updatedAt: now,
        };
        const next = [...listsRef.current, list];
        persist(next);
        return list;
    }, [persist]);

    const importFromText = useCallback((name: string, text: string): CustomWordList | null => {
        const rawWords = text.split(/[,\n]+/).map(w => w.trim()).filter(w => w.length > 0);
        return createList(name, rawWords);
    }, [createList]);

    const deleteList = useCallback((id: string) => {
        persist(listsRef.current.filter(l => l.id !== id));
    }, [persist]);

    const addWordsToList = useCallback((id: string, rawWords: string[]) => {
        persist(listsRef.current.map(l => {
            if (l.id !== id) return l;
            const existing = new Set(l.words.map(w => w.word));
            const newWords = rawWords
                .map(w => w.trim())
                .filter(w => w.length > 0 && !existing.has(w.toLowerCase()))
                .slice(0, MAX_WORDS_PER_LIST - l.words.length)
                .map(enrichWord);
            return { ...l, words: [...l.words, ...newWords], updatedAt: new Date().toISOString() };
        }));
    }, [persist]);

    const addWordToList = useCallback((listId: string, word: CustomWord) => {
        persist(listsRef.current.map(l => {
            if (l.id !== listId) return l;
            if (l.words.length >= MAX_WORDS_PER_LIST) return l;
            if (l.words.some(w => w.word === word.word)) return l;
            return { ...l, words: [...l.words, word], updatedAt: new Date().toISOString() };
        }));
    }, [persist]);

    const removeWordFromList = useCallback((listId: string, word: string) => {
        persist(listsRef.current.map(l => {
            if (l.id !== listId) return l;
            return { ...l, words: l.words.filter(w => w.word !== word), updatedAt: new Date().toISOString() };
        }));
    }, [persist]);

    const renameList = useCallback((id: string, name: string) => {
        persist(listsRef.current.map(l => l.id === id ? { ...l, name, updatedAt: new Date().toISOString() } : l));
    }, [persist]);

    const duplicateList = useCallback((id: string): CustomWordList | null => {
        if (listsRef.current.length >= MAX_LISTS) return null;
        const source = listsRef.current.find(l => l.id === id);
        if (!source) return null;
        const now = new Date().toISOString();
        const copy: CustomWordList = {
            id: generateId(),
            name: `${source.name} (copy)`,
            words: [...source.words],
            createdAt: now,
            updatedAt: now,
        };
        const next = [...listsRef.current, copy];
        persist(next);
        return copy;
    }, [persist]);

    const getList = useCallback((id: string) => listsRef.current.find(l => l.id === id) ?? null, []);

    return {
        lists,
        createList,
        createListFromWords,
        importFromText,
        deleteList,
        addWordsToList,
        addWordToList,
        removeWordFromList,
        renameList,
        duplicateList,
        getList,
        MAX_LISTS,
    };
}
