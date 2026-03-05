import { describe, it, expect } from 'vitest';
import {
    parseAvatar,
    encodeAvatar,
    getBodyContext,
    DEFAULT_AVATAR,
    AVATAR_CATEGORIES,
    FLAIR_ITEMS,
} from '../utils/avatarParts';
import type { AvatarConfig, FlairStats } from '../utils/avatarParts';

describe('avatarParts', () => {
    describe('parseAvatar', () => {
        it('parses a valid 7-segment encoded string', () => {
            const config = parseAvatar('h2-r3-e1-b0-c4-a2-f3');
            expect(config).toEqual({
                head: 2, hair: 3, expression: 1, body: 0, clothing: 4, accessory: 2, flair: 3,
            });
        });

        it('parses a legacy 6-segment string (flair defaults to 0)', () => {
            const config = parseAvatar('h2-r3-e1-b0-c4-a2');
            expect(config).toEqual({
                head: 2, hair: 3, expression: 1, body: 0, clothing: 4, accessory: 2, flair: 0,
            });
        });

        it('parses the default avatar', () => {
            const config = parseAvatar(DEFAULT_AVATAR);
            expect(config).toEqual({
                head: 0, hair: 1, expression: 0, body: 1, clothing: 0, accessory: 0, flair: 0,
            });
        });

        it('returns defaults for null/undefined/empty', () => {
            const defaults = parseAvatar(DEFAULT_AVATAR);
            expect(parseAvatar(null)).toEqual(defaults);
            expect(parseAvatar(undefined)).toEqual(defaults);
            expect(parseAvatar('')).toEqual(defaults);
        });

        it('returns defaults for old CharacterStyle strings', () => {
            const defaults = parseAvatar(DEFAULT_AVATAR);
            expect(parseAvatar('classic')).toEqual(defaults);
            expect(parseAvatar('sporty')).toEqual(defaults);
            expect(parseAvatar('academic')).toEqual(defaults);
            expect(parseAvatar('cool')).toEqual(defaults);
        });

        it('returns defaults for malformed strings', () => {
            const defaults = parseAvatar(DEFAULT_AVATAR);
            expect(parseAvatar('h0-r1')).toEqual(defaults);  // too few segments
            expect(parseAvatar('x0-r1-e0-b1-c0-a0')).toEqual(defaults);  // invalid category
            expect(parseAvatar('h5-r1-e0-b1-c0-a0')).toEqual(defaults);  // index out of range (h max 4)
            expect(parseAvatar('h-1-r1-e0-b1-c0-a0')).toEqual(defaults);  // negative
            expect(parseAvatar('h0-r1-e0-b1-c0-a0-f14')).toEqual(defaults);  // flair out of range (max 13)
        });
    });

    describe('encodeAvatar', () => {
        it('produces a compact 7-segment string from config', () => {
            const config: AvatarConfig = { head: 1, hair: 4, expression: 2, body: 3, clothing: 0, accessory: 1, flair: 5 };
            expect(encodeAvatar(config)).toBe('h1-r4-e2-b3-c0-a1-f5');
        });

        it('DEFAULT_AVATAR roundtrips', () => {
            const parsed = parseAvatar(DEFAULT_AVATAR);
            expect(encodeAvatar(parsed)).toBe(DEFAULT_AVATAR);
        });
    });

    describe('roundtrip', () => {
        it('all valid combinations roundtrip', () => {
            for (let h = 0; h <= 4; h++) {
                for (let r = 0; r <= 4; r++) {
                    const config: AvatarConfig = { head: h, hair: r, expression: 0, body: 1, clothing: 0, accessory: 0, flair: 0 };
                    const encoded = encodeAvatar(config);
                    const reparsed = parseAvatar(encoded);
                    expect(reparsed).toEqual(config);
                }
            }
        });

        it('flair values 0-13 roundtrip', () => {
            for (let f = 0; f <= 13; f++) {
                const config: AvatarConfig = { head: 0, hair: 1, expression: 0, body: 1, clothing: 0, accessory: 0, flair: f };
                const encoded = encodeAvatar(config);
                const reparsed = parseAvatar(encoded);
                expect(reparsed).toEqual(config);
            }
        });
    });

    describe('getBodyContext', () => {
        it('returns valid geometry for all body types', () => {
            for (let b = 0; b <= 4; b++) {
                const config: AvatarConfig = { head: 0, hair: 0, expression: 0, body: b, clothing: 0, accessory: 0, flair: 0 };
                const ctx = getBodyContext(config);
                expect(ctx.headCx).toBe(20);
                expect(ctx.headCy).toBe(10);
                expect(ctx.neckY).toBeGreaterThan(ctx.headCy);
                expect(ctx.shoulderY).toBeGreaterThan(ctx.neckY);
                expect(ctx.hipY).toBeGreaterThan(ctx.shoulderY);
                expect(ctx.feetY).toBeGreaterThan(ctx.hipY);
                expect(ctx.shoulderW).toBeGreaterThan(0);
                expect(ctx.hipW).toBeGreaterThan(0);
            }
        });

        it('different head shapes produce different radii', () => {
            const round = getBodyContext({ head: 0, hair: 0, expression: 0, body: 1, clothing: 0, accessory: 0, flair: 0 });
            const oval = getBodyContext({ head: 1, hair: 0, expression: 0, body: 1, clothing: 0, accessory: 0, flair: 0 });
            const wide = getBodyContext({ head: 3, hair: 0, expression: 0, body: 1, clothing: 0, accessory: 0, flair: 0 });
            // Round has equal rx/ry
            expect(round.headRx).toBe(round.headRy);
            // Oval is taller than wide
            expect(oval.headRy).toBeGreaterThan(oval.headRx);
            // Wide is wider than tall
            expect(wide.headRx).toBeGreaterThan(wide.headRy);
        });
    });

    describe('AVATAR_CATEGORIES', () => {
        it('has 6 categories', () => {
            expect(AVATAR_CATEGORIES.length).toBe(6);
        });

        it('each category has exactly 5 parts', () => {
            for (const cat of AVATAR_CATEGORIES) {
                expect(cat.parts.length).toBe(5);
            }
        });

        it('part indices are 0-4 in each category', () => {
            for (const cat of AVATAR_CATEGORIES) {
                const indices = cat.parts.map(p => p.index);
                expect(indices).toEqual([0, 1, 2, 3, 4]);
            }
        });

        it('every part has a name', () => {
            for (const cat of AVATAR_CATEGORIES) {
                for (const part of cat.parts) {
                    expect(part.name).toBeTruthy();
                }
            }
        });

        it('category keys match encoding prefixes', () => {
            const keys = AVATAR_CATEGORIES.map(c => c.key);
            expect(keys).toEqual(['h', 'r', 'e', 'b', 'c', 'a']);
        });
    });

    describe('FLAIR_ITEMS', () => {
        it('has 14 flair items', () => {
            expect(FLAIR_ITEMS.length).toBe(14);
        });

        it('indices are 0-13', () => {
            const indices = FLAIR_ITEMS.map(f => f.index);
            expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
        });

        it('every flair has a name', () => {
            for (const flair of FLAIR_ITEMS) {
                expect(flair.name).toBeTruthy();
            }
        });

        it('first flair (None) is always unlocked', () => {
            const zero: FlairStats = { dayStreak: 0, totalSolved: 0, bestStreak: 0, sessionsPlayed: 0, totalXP: 0, masteredCount: 0 };
            expect(FLAIR_ITEMS[0].isUnlocked(zero)).toBe(true);
        });

        it('non-None flairs are locked with zero stats', () => {
            const zero: FlairStats = { dayStreak: 0, totalSolved: 0, bestStreak: 0, sessionsPlayed: 0, totalXP: 0, masteredCount: 0 };
            for (let i = 1; i < FLAIR_ITEMS.length; i++) {
                expect(FLAIR_ITEMS[i].isUnlocked(zero)).toBe(false);
            }
        });

        it('all flairs unlock with high stats + premium + packs', () => {
            const max: FlairStats = {
                dayStreak: 100, totalSolved: 5000, bestStreak: 100, sessionsPlayed: 200, totalXP: 10000, masteredCount: 500,
                isPremium: true,
                purchasedPacks: ['winter-flair-pack', 'spring-flair-pack', 'summer-flair-pack'],
            };
            for (const flair of FLAIR_ITEMS) {
                expect(flair.isUnlocked(max)).toBe(true);
            }
        });

        it('Halo unlocks at 7-day streak', () => {
            const below: FlairStats = { dayStreak: 6, totalSolved: 0, bestStreak: 0, sessionsPlayed: 0, totalXP: 0, masteredCount: 0 };
            const at: FlairStats = { ...below, dayStreak: 7 };
            expect(FLAIR_ITEMS[1].isUnlocked(below)).toBe(false);
            expect(FLAIR_ITEMS[1].isUnlocked(at)).toBe(true);
        });

        it('Wings unlock at 50 mastered', () => {
            const below: FlairStats = { dayStreak: 0, totalSolved: 0, bestStreak: 0, sessionsPlayed: 0, totalXP: 0, masteredCount: 49 };
            const at: FlairStats = { ...below, masteredCount: 50 };
            expect(FLAIR_ITEMS[3].isUnlocked(below)).toBe(false);
            expect(FLAIR_ITEMS[3].isUnlocked(at)).toBe(true);
        });

        it('Rainbow Ring unlocks at 1800 XP', () => {
            const below: FlairStats = { dayStreak: 0, totalSolved: 0, bestStreak: 0, sessionsPlayed: 0, totalXP: 1799, masteredCount: 0 };
            const at: FlairStats = { ...below, totalXP: 1800 };
            expect(FLAIR_ITEMS[7].isUnlocked(below)).toBe(false);
            expect(FLAIR_ITEMS[7].isUnlocked(at)).toBe(true);
        });
    });
});
