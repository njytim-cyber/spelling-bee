import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { measureRetention } from '../utils/retentionTracker';
import type { WordRecord } from '../hooks/useWordHistory';

// Mock analytics — fire-and-forget, we just verify it's called
vi.mock('../utils/analytics', () => ({
    trackEvent: vi.fn(),
}));

import { trackEvent } from '../utils/analytics';

const THIRTY_DAYS = 31 * 86_400_000; // 31 days to be safely past threshold

function makeRecord(overrides: Partial<WordRecord> = {}): WordRecord {
    return {
        word: 'test',
        category: 'cvc',
        attempts: 10,
        correct: 8,
        lastSeen: Date.now(),
        lastCorrect: Date.now(),
        box: 4,
        nextReview: 0,
        typedCorrect: 1,
        typedAttempts: 2,
        ...overrides,
    };
}

describe('retentionTracker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.removeItem('sb-retention-check-date');
    });

    afterEach(() => {
        localStorage.removeItem('sb-retention-check-date');
    });

    it('fires retention event for mastered words older than 30 days', () => {
        const records: Record<string, WordRecord> = {
            apple: makeRecord({ word: 'apple', box: 4, lastCorrect: Date.now() - THIRTY_DAYS }),
            banana: makeRecord({ word: 'banana', box: 4, lastCorrect: Date.now() - THIRTY_DAYS }),
        };

        measureRetention(records);

        expect(trackEvent).toHaveBeenCalledWith('word_retention_check', {
            words_checked: 2,
            words_retained: 2,
            retention_rate: 100,
        });
    });

    it('counts demoted words as not retained', () => {
        const records: Record<string, WordRecord> = {
            apple: makeRecord({ word: 'apple', box: 4, lastCorrect: Date.now() - THIRTY_DAYS }),
            banana: makeRecord({ word: 'banana', box: 2, lastCorrect: Date.now() - THIRTY_DAYS }),
        };

        measureRetention(records);

        expect(trackEvent).toHaveBeenCalledWith('word_retention_check', {
            words_checked: 2,
            words_retained: 1,
            retention_rate: 50,
        });
    });

    it('skips words with too few correct answers (never mastered)', () => {
        const records: Record<string, WordRecord> = {
            apple: makeRecord({ word: 'apple', box: 2, correct: 3, lastCorrect: Date.now() - THIRTY_DAYS }),
        };

        measureRetention(records);

        expect(trackEvent).not.toHaveBeenCalled();
    });

    it('skips recently seen words (< 30 days)', () => {
        const records: Record<string, WordRecord> = {
            apple: makeRecord({ word: 'apple', box: 4, lastCorrect: Date.now() - 10 * 86_400_000 }),
        };

        measureRetention(records);

        expect(trackEvent).not.toHaveBeenCalled();
    });

    it('only runs once per day', () => {
        const records: Record<string, WordRecord> = {
            apple: makeRecord({ word: 'apple', box: 4, lastCorrect: Date.now() - THIRTY_DAYS }),
        };

        measureRetention(records);
        measureRetention(records);

        expect(trackEvent).toHaveBeenCalledTimes(1);
    });

    it('does not fire event when no mastered words exist', () => {
        measureRetention({});

        expect(trackEvent).not.toHaveBeenCalled();
    });
});
