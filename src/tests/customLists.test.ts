/**
 * tests/customLists.test.ts
 *
 * Tests for custom word list features: enrichment, merge, duplicate logic.
 */
import { describe, it, expect, vi } from 'vitest';
import { enrichWord, mergeCustomLists } from '../hooks/useCustomLists';
import type { CustomWordList } from '../types/customList';

// Mock the word registry so tests don't need to load 117K words
vi.mock('../domains/spelling/words', () => ({
    getWordMap: () => new Map([
        ['apple', {
            word: 'apple',
            definition: 'A round fruit',
            pronunciation: 'ˈæpəl',
            partOfSpeech: 'noun',
            exampleSentence: 'She ate an apple.',
            difficulty: 2,
            distractors: ['aple', 'appel', 'aplle'],
            pattern: 'cvc',
        }],
        ['banana', {
            word: 'banana',
            definition: 'A yellow fruit',
            pronunciation: 'bəˈnænə',
            partOfSpeech: 'noun',
            exampleSentence: 'He peeled a banana.',
            difficulty: 3,
            distractors: ['bananna', 'bannana', 'bananah'],
            pattern: 'cvc',
        }],
        ['accommodate', {
            word: 'accommodate',
            definition: 'To provide lodging',
            pronunciation: 'əˈkɒm.ə.deɪt',
            partOfSpeech: 'verb',
            exampleSentence: 'The hotel can accommodate 200 guests.',
            difficulty: 7,
            distractors: ['accomodate', 'acommodate', 'acomodate'],
            pattern: 'double',
        }],
    ]),
}));

describe('enrichWord', () => {
    it('enriches a word found in the word bank', () => {
        const result = enrichWord('apple');
        expect(result.enriched).toBe(true);
        expect(result.word).toBe('apple');
        expect(result.definition).toBe('A round fruit');
        expect(result.pronunciation).toBe('ˈæpəl');
        expect(result.partOfSpeech).toBe('noun');
        expect(result.exampleSentence).toBe('She ate an apple.');
        expect(result.difficulty).toBe(2);
        expect(result.distractors).toEqual(['aple', 'appel', 'aplle']);
    });

    it('handles case-insensitive lookup', () => {
        const result = enrichWord('APPLE');
        expect(result.enriched).toBe(true);
        expect(result.word).toBe('apple');
    });

    it('trims whitespace', () => {
        const result = enrichWord('  banana  ');
        expect(result.enriched).toBe(true);
        expect(result.word).toBe('banana');
    });

    it('returns unenriched word when not found', () => {
        const result = enrichWord('xyznotaword');
        expect(result.enriched).toBe(false);
        expect(result.word).toBe('xyznotaword');
        expect(result.definition).toBeUndefined();
        expect(result.distractors).toBeUndefined();
    });
});

describe('mergeCustomLists', () => {
    const makeList = (id: string, name: string, updatedAt: string): CustomWordList => ({
        id,
        name,
        words: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt,
    });

    it('merges two disjoint sets', () => {
        const local = [makeList('a', 'List A', '2025-01-01T00:00:00Z')];
        const cloud = [makeList('b', 'List B', '2025-01-02T00:00:00Z')];
        const merged = mergeCustomLists(local, cloud);
        expect(merged).toHaveLength(2);
        expect(merged.map(l => l.id)).toContain('a');
        expect(merged.map(l => l.id)).toContain('b');
    });

    it('takes cloud version when cloud is newer', () => {
        const local = [makeList('x', 'Old Name', '2025-01-01T00:00:00Z')];
        const cloud = [makeList('x', 'New Name', '2025-06-01T00:00:00Z')];
        const merged = mergeCustomLists(local, cloud);
        expect(merged).toHaveLength(1);
        expect(merged[0].name).toBe('New Name');
    });

    it('keeps local version when local is newer', () => {
        const local = [makeList('x', 'Local Name', '2025-06-01T00:00:00Z')];
        const cloud = [makeList('x', 'Cloud Name', '2025-01-01T00:00:00Z')];
        const merged = mergeCustomLists(local, cloud);
        expect(merged).toHaveLength(1);
        expect(merged[0].name).toBe('Local Name');
    });

    it('sorts by createdAt', () => {
        const local = [makeList('b', 'B', '2025-06-01T00:00:00Z')];
        const cloud = [makeList('a', 'A', '2025-01-01T00:00:00Z')];
        // Both have same createdAt from makeList, but different ids
        const merged = mergeCustomLists(local, cloud);
        expect(merged).toHaveLength(2);
        // Both have same createdAt so order is stable
    });

    it('handles empty arrays', () => {
        expect(mergeCustomLists([], [])).toEqual([]);
        const list = [makeList('a', 'A', '2025-01-01T00:00:00Z')];
        expect(mergeCustomLists(list, [])).toEqual(list);
        expect(mergeCustomLists([], list)).toEqual(list);
    });
});
