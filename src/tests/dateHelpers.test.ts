/**
 * tests/dateHelpers.test.ts
 *
 * Tests for shared date formatting utilities.
 * currentWeekKey() is the single source of truth for ISO week keys
 * across App.tsx, PathPage.tsx, and WeeklyRecap.tsx.
 */
import { describe, it, expect } from 'vitest';
import { formatLocalDate, todayStr, yesterdayStr, todayISO, currentWeekKey } from '../utils/dateHelpers';

describe('formatLocalDate', () => {
    it('formats as non-padded YYYY-M-D', () => {
        expect(formatLocalDate(new Date(2026, 0, 5))).toBe('2026-1-5');
        expect(formatLocalDate(new Date(2026, 11, 25))).toBe('2026-12-25');
    });

    it('does not zero-pad month or day', () => {
        const result = formatLocalDate(new Date(2026, 2, 3));
        expect(result).toBe('2026-3-3');
    });
});

describe('todayStr', () => {
    it('returns a valid YYYY-M-D string', () => {
        const result = todayStr();
        expect(result).toMatch(/^\d{4}-\d{1,2}-\d{1,2}$/);
    });

    it('matches formatLocalDate(new Date())', () => {
        // Within the same call, these should be identical
        const now = new Date();
        expect(todayStr()).toBe(formatLocalDate(now));
    });
});

describe('yesterdayStr', () => {
    it('returns a valid YYYY-M-D string', () => {
        expect(yesterdayStr()).toMatch(/^\d{4}-\d{1,2}-\d{1,2}$/);
    });

    it('returns the day before today', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        expect(yesterdayStr()).toBe(formatLocalDate(yesterday));
    });
});

describe('todayISO', () => {
    it('returns zero-padded YYYY-MM-DD format', () => {
        expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

describe('currentWeekKey', () => {
    it('returns "YYYY-WNN" format', () => {
        const key = currentWeekKey();
        expect(key).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('uses current year', () => {
        const year = new Date().getFullYear();
        expect(currentWeekKey()).toMatch(new RegExp(`^${year}-W`));
    });

    it('week number is between 01 and 53', () => {
        const weekNum = parseInt(currentWeekKey().split('W')[1], 10);
        expect(weekNum).toBeGreaterThanOrEqual(1);
        expect(weekNum).toBeLessThanOrEqual(53);
    });

    it('is deterministic within the same moment', () => {
        expect(currentWeekKey()).toBe(currentWeekKey());
    });
});
