/**
 * hooks/useCustomLists.ts
 *
 * localStorage-backed CRUD for custom word lists.
 * Words found in the word bank are auto-enriched with definitions,
 * pronunciation, and pre-baked distractors.
 */
import { useState, useCallback } from 'react';
import type { CustomWord, CustomWordList } from '../types/customList';
import { getWordMap } from '../domains/spelling/words';
import { STORAGE_KEYS } from '../config';

const MAX_LISTS = 20;
const MAX_WORDS_PER_LIST = 200;

function loadLists(): CustomWordList[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.customLists);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveLists(lists: CustomWordList[]) {
    localStorage.setItem(STORAGE_KEYS.customLists, JSON.stringify(lists));
}

function enrichWord(raw: string): CustomWord {
    const wordMap = getWordMap();
    const lower = raw.toLowerCase().trim();
    const match = wordMap.get(lower);
    if (match) {
        return {
            word: match.word,
            definition: match.definition,
            pronunciation: match.pronunciation,
            partOfSpeech: match.partOfSpeech,
            enriched: true,
            distractors: match.distractors,
        };
    }
    return { word: lower, enriched: false };
}

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function useCustomLists() {
    const [lists, setLists] = useState<CustomWordList[]>(loadLists);

    const persist = useCallback((next: CustomWordList[]) => {
        setLists(next);
        saveLists(next);
    }, []);

    const createList = useCallback((name: string, rawWords: string[]): CustomWordList | null => {
        if (lists.length >= MAX_LISTS) return null;
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
        persist([...lists, list]);
        return list;
    }, [lists, persist]);

    const importFromText = useCallback((name: string, text: string): CustomWordList | null => {
        const rawWords = text.split(/[,\n]+/).map(w => w.trim()).filter(w => w.length > 0);
        return createList(name, rawWords);
    }, [createList]);

    const deleteList = useCallback((id: string) => {
        persist(lists.filter(l => l.id !== id));
    }, [lists, persist]);

    const addWordsToList = useCallback((id: string, rawWords: string[]) => {
        persist(lists.map(l => {
            if (l.id !== id) return l;
            const existing = new Set(l.words.map(w => w.word));
            const newWords = rawWords
                .map(w => w.trim())
                .filter(w => w.length > 0 && !existing.has(w.toLowerCase()))
                .slice(0, MAX_WORDS_PER_LIST - l.words.length)
                .map(enrichWord);
            return { ...l, words: [...l.words, ...newWords], updatedAt: new Date().toISOString() };
        }));
    }, [lists, persist]);

    const removeWordFromList = useCallback((listId: string, word: string) => {
        persist(lists.map(l => {
            if (l.id !== listId) return l;
            return { ...l, words: l.words.filter(w => w.word !== word), updatedAt: new Date().toISOString() };
        }));
    }, [lists, persist]);

    const renameList = useCallback((id: string, name: string) => {
        persist(lists.map(l => l.id === id ? { ...l, name, updatedAt: new Date().toISOString() } : l));
    }, [lists, persist]);

    const getList = useCallback((id: string) => lists.find(l => l.id === id) ?? null, [lists]);

    return {
        lists,
        createList,
        importFromText,
        deleteList,
        addWordsToList,
        removeWordFromList,
        renameList,
        getList,
    };
}
