/**
 * tests/phaseE.test.ts
 *
 * Tests for Phase E features: similar words, loot drops,
 * surprise tracking, onboarding positioning, proof infrastructure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WordRecord } from '../hooks/useWordHistory';

// Mock analytics
vi.mock('../utils/analytics', () => ({
    trackEvent: vi.fn(),
}));

// Mock firebase
vi.mock('../utils/firebase', () => ({
    getAnalyticsInstance: () => Promise.resolve(null),
}));

// ── Similar words suggestion ─────────────────────────────────────────────────

import { getSimilarMistakeWords, getInlineErrorTip } from '../utils/errorPatterns';

function makeRecord(overrides: Partial<WordRecord> & { word: string }): WordRecord {
    return {
        category: 'cvc',
        attempts: 5,
        correct: 3,
        lastSeen: Date.now(),
        lastCorrect: Date.now(),
        box: 2,
        nextReview: Date.now(),
        mcqAttempts: 3,
        mcqCorrect: 2,
        typedAttempts: 2,
        typedCorrect: 1,
        ...overrides,
    };
}

describe('getSimilarMistakeWords', () => {
    it('returns empty for no matching error patterns', () => {
        const records: Record<string, WordRecord> = {
            cat: makeRecord({ word: 'cat', misspellings: ['kat'] }),
        };
        const result = getSimilarMistakeWords('dog', 'some-pattern', records);
        expect(result).toEqual([]);
    });

    it('excludes the current word from results', () => {
        const records: Record<string, WordRecord> = {
            necessary: makeRecord({ word: 'necessary', correct: 2, misspellings: ['neccessary'] }),
        };
        const result = getSimilarMistakeWords('necessary', 'Double letter', records);
        expect(result).not.toContain('necessary');
    });

    it('only includes words with mistakes (correct < attempts)', () => {
        const records: Record<string, WordRecord> = {
            perfect: makeRecord({ word: 'perfect', correct: 5, attempts: 5 }),
        };
        const result = getSimilarMistakeWords('other', 'some-pattern', records);
        expect(result).toEqual([]);
    });

    it('respects the limit parameter', () => {
        // Create many records with double letter errors
        const records: Record<string, WordRecord> = {};
        const words = ['accommodate', 'occurrence', 'committee', 'possess', 'misspell'];
        for (const w of words) {
            records[w] = makeRecord({
                word: w,
                correct: 2,
                misspellings: [w.replace(/(.)\1/, '$1')], // Remove one of the double letters
            });
        }
        const result = getSimilarMistakeWords('different', 'Double letter', records, 2);
        expect(result.length).toBeLessThanOrEqual(2);
    });
});

// ── Loot Drop ────────────────────────────────────────────────────────────────

import { rollLootDrop, getDroppedCosmetics, isLootDropOwned, LOOT_DROP_THEME_IDS } from '../utils/lootDrop';
import { CHALK_THEMES } from '../utils/chalkThemes';

describe('lootDrop', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('LOOT_DROP_THEME_IDS matches lootDrop-flagged themes', () => {
        const expected = CHALK_THEMES.filter(t => t.lootDrop).map(t => t.id);
        expect(LOOT_DROP_THEME_IDS).toEqual(expected);
        expect(LOOT_DROP_THEME_IDS.length).toBeGreaterThan(0);
    });

    it('getDroppedCosmetics returns empty set initially', () => {
        expect(getDroppedCosmetics().size).toBe(0);
    });

    it('rollLootDrop returns a theme and saves to localStorage', () => {
        const result = rollLootDrop();
        expect(result).not.toBeNull();
        expect(result!.id).toBeDefined();
        expect(result!.name).toBeDefined();
        expect(LOOT_DROP_THEME_IDS).toContain(result!.id);
        expect(getDroppedCosmetics().has(result!.id)).toBe(true);
    });

    it('rollLootDrop does not repeat already-dropped themes', () => {
        const dropped = new Set<string>();
        for (let i = 0; i < LOOT_DROP_THEME_IDS.length; i++) {
            const result = rollLootDrop();
            expect(result).not.toBeNull();
            expect(dropped.has(result!.id)).toBe(false);
            dropped.add(result!.id);
        }
        // All themes dropped — next roll returns null
        expect(rollLootDrop()).toBeNull();
    });

    it('isLootDropOwned returns true for dropped themes', () => {
        const result = rollLootDrop()!;
        expect(isLootDropOwned(result.id)).toBe(true);
        expect(isLootDropOwned('non-existent')).toBe(false);
    });
});

// ── Surprise History ─────────────────────────────────────────────────────────

import { recordSurprise, getSurpriseCount, getTotalSurpriseCount, getSurpriseHistory } from '../utils/surpriseHistory';

describe('surpriseHistory', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('starts with zero counts', () => {
        expect(getTotalSurpriseCount()).toBe(0);
        expect(getSurpriseCount('bonusWord')).toBe(0);
    });

    it('records and retrieves surprise counts', () => {
        recordSurprise('bonusWord');
        recordSurprise('bonusWord');
        recordSurprise('etymologyReveal');
        expect(getSurpriseCount('bonusWord')).toBe(2);
        expect(getSurpriseCount('etymologyReveal')).toBe(1);
        expect(getTotalSurpriseCount()).toBe(3);
    });

    it('updates lastSurpriseAt timestamp', () => {
        const before = Date.now();
        recordSurprise('speedBurst');
        const history = getSurpriseHistory();
        expect(history.lastSurpriseAt).toBeGreaterThanOrEqual(before);
        expect(history.lastSurpriseAt).toBeLessThanOrEqual(Date.now());
    });

    it('handles lootDrop surprise type', () => {
        recordSurprise('lootDrop');
        expect(getSurpriseCount('lootDrop')).toBe(1);
    });
});

// ── Chalk Themes ─────────────────────────────────────────────────────────────

describe('chalkThemes lootDrop flag', () => {
    it('loot drop themes have required properties', () => {
        const lootThemes = CHALK_THEMES.filter(t => t.lootDrop);
        expect(lootThemes.length).toBeGreaterThanOrEqual(6);
        for (const t of lootThemes) {
            expect(t.id).toBeDefined();
            expect(t.name).toBeDefined();
            expect(t.color).toBeDefined();
            expect(t.lightColor).toBeDefined();
        }
    });

    it('loot drop themes are not premium or pack items', () => {
        const lootThemes = CHALK_THEMES.filter(t => t.lootDrop);
        for (const t of lootThemes) {
            expect(t.premium).toBeFalsy();
            expect(t.packItem).toBeFalsy();
        }
    });
});

// ── SurpriseType includes lootDrop ───────────────────────────────────────────

describe('SurpriseType', () => {
    it('spellingGenerator exports lootDrop as a valid surprise type', async () => {
        // SurpriseType is 'bonusWord' | 'etymologyReveal' | 'speedBurst' | 'lootDrop'
        // We verify by importing rollSessionSurprises and checking the type includes lootDrop
        const { rollSessionSurprises } = await import('../domains/spelling/spellingGenerator');
        // Run many times to verify lootDrop can be rolled
        const types = new Set<string>();
        for (let i = 0; i < 200; i++) {
            const s = rollSessionSurprises(20);
            if (s) types.add(s.type);
        }
        expect(types.has('lootDrop')).toBe(true);
    });
});

// ── Error pattern inline tip (regression) ────────────────────────────────────

describe('getInlineErrorTip', () => {
    it('detects double letter confusion', () => {
        const tip = getInlineErrorTip('necessary', 'neccessary');
        expect(tip).toBeDefined();
    });

    it('returns null for correct spelling', () => {
        const tip = getInlineErrorTip('cat', 'cat');
        expect(tip).toBeNull();
    });
});
