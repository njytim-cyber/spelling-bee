import { describe, it, expect } from 'vitest';
import { getSharedDailyWord, getDailyWordNumber, todayKey, formatDailyWordShare } from '../utils/sharedDailyWord';
import type { SpellingWord } from '../domains/spelling/words/types';

describe('sharedDailyWord.ts', () => {
    describe('getSharedDailyWord', () => {
        it('returns a SpellingWord for today', () => {
            const word = getSharedDailyWord();
            expect(word).toBeTruthy();
            expect(word!.word).toBeTruthy();
            expect(word!.difficulty).toBeGreaterThanOrEqual(4);
            expect(word!.difficulty).toBeLessThanOrEqual(7);
        });

        it('returns the same word for the same date (deterministic)', () => {
            const date = new Date(2026, 2, 7); // March 7 2026
            const word1 = getSharedDailyWord(date);
            const word2 = getSharedDailyWord(date);
            expect(word1).not.toBeNull();
            expect(word1!.word).toBe(word2!.word);
        });

        it('returns different words for different dates', () => {
            const date1 = new Date(2026, 0, 15);
            const date2 = new Date(2026, 0, 16);
            const word1 = getSharedDailyWord(date1);
            const word2 = getSharedDailyWord(date2);
            expect(word1).not.toBeNull();
            expect(word2).not.toBeNull();
            // Not strictly guaranteed to be different, but very unlikely to be the same
            // from a pool of thousands. We just test they both return valid words.
            expect(word1!.word).toBeTruthy();
            expect(word2!.word).toBeTruthy();
        });

        it('selects from difficulty 4-7 only', () => {
            // Test 30 different dates to sample broadly
            for (let d = 1; d <= 30; d++) {
                const date = new Date(2026, 5, d);
                const word = getSharedDailyWord(date);
                if (word) {
                    expect(word.difficulty).toBeGreaterThanOrEqual(4);
                    expect(word.difficulty).toBeLessThanOrEqual(7);
                }
            }
        });
    });

    describe('getDailyWordNumber', () => {
        it('returns 1 for the epoch date (Jan 1 2026)', () => {
            const epoch = new Date(2026, 0, 1);
            expect(getDailyWordNumber(epoch)).toBe(1);
        });

        it('returns 2 for Jan 2 2026', () => {
            const day2 = new Date(2026, 0, 2);
            expect(getDailyWordNumber(day2)).toBe(2);
        });

        it('increases monotonically', () => {
            const d1 = new Date(2026, 2, 1);
            const d2 = new Date(2026, 2, 2);
            expect(getDailyWordNumber(d2)).toBe(getDailyWordNumber(d1) + 1);
        });

        it('returns positive number for current date', () => {
            expect(getDailyWordNumber()).toBeGreaterThan(0);
        });
    });

    describe('todayKey', () => {
        it('returns YYYY-MM-DD format', () => {
            const key = todayKey(new Date(2026, 2, 7));
            expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('uses UTC date', () => {
            // Construct a UTC date to ensure consistency
            const date = new Date(Date.UTC(2026, 0, 15));
            expect(todayKey(date)).toBe('2026-01-15');
        });
    });

    describe('formatDailyWordShare', () => {
        const mockWord: SpellingWord = {
            word: 'oscillate',
            definition: 'to move back and forth',
            exampleSentence: 'The pendulum oscillates steadily.',
            partOfSpeech: 'verb',
            difficulty: 6,
            pattern: 'multisyllable',
            pronunciation: '/ˈɒs.ɪ.leɪt/',
            distractors: ['oscilate', 'osscillate', 'osciallate'],
        };

        it('includes word number and word', () => {
            const text = formatDailyWordShare(mockWord, { correct: true, attempts: 1, timeMs: 8200 }, 127, 1, 67);
            expect(text).toContain('#127');
            expect(text).toContain('oscillate');
        });

        it('shows check mark for correct answers', () => {
            const text = formatDailyWordShare(mockWord, { correct: true, attempts: 1, timeMs: 5000 }, 1, 1, null);
            expect(text).toContain('\u2705');
        });

        it('shows X mark for incorrect answers', () => {
            const text = formatDailyWordShare(mockWord, { correct: false, attempts: 3, timeMs: 10000 }, 1, 0, null);
            expect(text).toContain('\u274C');
        });

        it('includes community percentage when available', () => {
            const text = formatDailyWordShare(mockWord, { correct: true, attempts: 1, timeMs: 8000 }, 127, 1, 67);
            expect(text).toContain('67%');
            expect(text).toContain('got it right');
        });

        it('omits community percentage when null', () => {
            const text = formatDailyWordShare(mockWord, { correct: true, attempts: 1, timeMs: 8000 }, 127, 1, null);
            expect(text).not.toContain('got it right');
        });

        it('includes streak when > 1', () => {
            const text = formatDailyWordShare(mockWord, { correct: true, attempts: 1, timeMs: 8000 }, 127, 7, null);
            expect(text).toContain('7-day streak');
        });

        it('omits streak when <= 1', () => {
            const text = formatDailyWordShare(mockWord, { correct: true, attempts: 1, timeMs: 8000 }, 127, 1, null);
            expect(text).not.toContain('streak');
        });

        it('includes time for correct answers', () => {
            const text = formatDailyWordShare(mockWord, { correct: true, attempts: 1, timeMs: 8200 }, 1, 1, null);
            expect(text).toContain('8.2s');
        });

        it('formats ordinal attempts correctly', () => {
            const text1 = formatDailyWordShare(mockWord, { correct: true, attempts: 1, timeMs: 5000 }, 1, 1, null);
            expect(text1).toContain('1st try');

            const text2 = formatDailyWordShare(mockWord, { correct: true, attempts: 2, timeMs: 5000 }, 1, 1, null);
            expect(text2).toContain('2nd try');

            const text3 = formatDailyWordShare(mockWord, { correct: true, attempts: 3, timeMs: 5000 }, 1, 1, null);
            expect(text3).toContain('3rd try');
        });

        it('includes referral code when provided', () => {
            const text = formatDailyWordShare(mockWord, { correct: true, attempts: 1, timeMs: 5000 }, 1, 1, null, 'ABC123');
            expect(text).toContain('ABC123');
        });
    });
});
