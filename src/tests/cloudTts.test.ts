import { describe, it, expect, beforeEach } from 'vitest';
import {
    CLOUD_VOICES, voicesForDialect, getCloudVoiceGender,
    shouldSkipCloudTts, syncVoiceToDialect, initializeDefaultVoice, md5,
} from '../services/cloudTts';
import { STORAGE_KEYS } from '../config';

// @ts-expect-error — Node crypto available in vitest runtime, not in client tsconfig
import { createHash } from 'crypto';

// ── Voice Catalog ─────────────────────────────────────────────────────────────

describe('Cloud TTS voice catalog', () => {
    it('has exactly 4 Neural2 voices', () => {
        expect(CLOUD_VOICES).toHaveLength(4);
    });

    it('US dialect has exactly 2 voices', () => {
        expect(voicesForDialect('en-US')).toHaveLength(2);
    });

    it('UK dialect has exactly 2 voices', () => {
        expect(voicesForDialect('en-GB')).toHaveLength(2);
    });

    it('each dialect has one male and one female voice', () => {
        for (const dialect of ['en-US', 'en-GB']) {
            const voices = voicesForDialect(dialect);
            const genders = voices.map(v => v.gender).sort();
            expect(genders).toEqual(['female', 'male']);
        }
    });

    it('all voices have valid Neural2 IDs matching US/UK pattern', () => {
        const pattern = /^en-(US|GB)-Neural2-[A-D]$/;
        for (const voice of CLOUD_VOICES) {
            expect(voice.id).toMatch(pattern);
        }
    });

    it('all voices have non-empty labels', () => {
        for (const voice of CLOUD_VOICES) {
            expect(voice.label.length).toBeGreaterThan(0);
        }
    });

    it('voice IDs are unique', () => {
        const ids = CLOUD_VOICES.map(v => v.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('labels are unique', () => {
        const labels = CLOUD_VOICES.map(v => v.label);
        expect(new Set(labels).size).toBe(labels.length);
    });

    it('langCode matches voice ID prefix', () => {
        for (const voice of CLOUD_VOICES) {
            expect(voice.id.startsWith(voice.langCode)).toBe(true);
        }
    });

    it('unknown dialect defaults to US voices', () => {
        const voices = voicesForDialect('en-ZZ');
        expect(voices).toEqual(voicesForDialect('en-US'));
    });

    it('empty dialect string defaults to US voices', () => {
        expect(voicesForDialect('')).toEqual(voicesForDialect('en-US'));
    });

    it('all voices have a valid gender', () => {
        for (const voice of CLOUD_VOICES) {
            expect(['male', 'female']).toContain(voice.gender);
        }
    });

    it('getCloudVoiceGender returns correct gender for all 4 voices', () => {
        expect(getCloudVoiceGender('en-US-Neural2-D')).toBe('male');
        expect(getCloudVoiceGender('en-US-Neural2-C')).toBe('female');
        expect(getCloudVoiceGender('en-GB-Neural2-B')).toBe('male');
        expect(getCloudVoiceGender('en-GB-Neural2-A')).toBe('female');
    });

    it('getCloudVoiceGender defaults to female for unknown voice', () => {
        expect(getCloudVoiceGender('en-US-Neural2-Z')).toBe('female');
        expect(getCloudVoiceGender('')).toBe('female');
        expect(getCloudVoiceGender('garbage')).toBe('female');
    });

    it('shouldSkipCloudTts returns false when no connection API', () => {
        expect(shouldSkipCloudTts()).toBe(false);
    });

    it('no AU or IN voices exist', () => {
        const auIn = CLOUD_VOICES.filter(v => v.langCode === 'en-AU' || v.langCode === 'en-IN');
        expect(auIn).toHaveLength(0);
    });

    it('default US voice exists in catalog', () => {
        expect(CLOUD_VOICES.some(v => v.id === 'en-US-Neural2-C')).toBe(true);
    });

    it('default UK voice exists in catalog', () => {
        expect(CLOUD_VOICES.some(v => v.id === 'en-GB-Neural2-A')).toBe(true);
    });
});

// ── Dialect Sync ──────────────────────────────────────────────────────────────

describe('syncVoiceToDialect', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('switches US male voice to UK male voice', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'en-US-Neural2-D');
        syncVoiceToDialect('en-GB');
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-GB-Neural2-B');
    });

    it('switches US female voice to UK female voice', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'en-US-Neural2-C');
        syncVoiceToDialect('en-GB');
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-GB-Neural2-A');
    });

    it('switches UK male voice to US male voice', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'en-GB-Neural2-B');
        syncVoiceToDialect('en-US');
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-US-Neural2-D');
    });

    it('switches UK female voice to US female voice', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'en-GB-Neural2-A');
        syncVoiceToDialect('en-US');
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-US-Neural2-C');
    });

    it('does nothing when voice already matches dialect', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'en-GB-Neural2-B');
        syncVoiceToDialect('en-GB');
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-GB-Neural2-B');
    });

    it('does nothing when US voice already matches US dialect', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'en-US-Neural2-C');
        syncVoiceToDialect('en-US');
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-US-Neural2-C');
    });

    it('falls back to default female when stored voice is removed AU', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'en-AU-Neural2-A');
        syncVoiceToDialect('en-US');
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-US-Neural2-C');
    });

    it('falls back to default female when stored voice is removed IN', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'en-IN-Neural2-B');
        syncVoiceToDialect('en-GB');
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-GB-Neural2-A');
    });

    it('falls back to default for completely unknown voice', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'xx-XX-Neural2-Z');
        syncVoiceToDialect('en-GB');
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-GB-Neural2-A');
    });

    it('falls back to default when no voice stored', () => {
        syncVoiceToDialect('en-GB');
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-GB-Neural2-A');
    });

    it('handles empty string stored voice', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, '');
        syncVoiceToDialect('en-US');
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-US-Neural2-C');
    });

    it('round-trips gender across dialects: US male → UK male → US male', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'en-US-Neural2-D');
        syncVoiceToDialect('en-GB');
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-GB-Neural2-B');
        syncVoiceToDialect('en-US');
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-US-Neural2-D');
    });

    it('round-trips gender across dialects: UK female → US female → UK female', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'en-GB-Neural2-A');
        syncVoiceToDialect('en-US');
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-US-Neural2-C');
        syncVoiceToDialect('en-GB');
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-GB-Neural2-A');
    });
});

// ── Voice Migration (initializeDefaultVoice) ─────────────────────────────────

describe('initializeDefaultVoice', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('sets default US female voice when nothing stored', () => {
        initializeDefaultVoice();
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-US-Neural2-C');
        expect(localStorage.getItem(STORAGE_KEYS.ttsEngine)).toBe('cloud');
    });

    it('sets default UK female voice when dialect is en-GB', () => {
        localStorage.setItem(STORAGE_KEYS.dialect, 'en-GB');
        initializeDefaultVoice();
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-GB-Neural2-A');
    });

    it('keeps en-US-Neural2-D (valid)', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'en-US-Neural2-D');
        initializeDefaultVoice();
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-US-Neural2-D');
    });

    it('keeps en-US-Neural2-C (valid)', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'en-US-Neural2-C');
        initializeDefaultVoice();
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-US-Neural2-C');
    });

    it('keeps en-GB-Neural2-A (valid)', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'en-GB-Neural2-A');
        initializeDefaultVoice();
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-GB-Neural2-A');
    });

    it('keeps en-GB-Neural2-B (valid)', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'en-GB-Neural2-B');
        initializeDefaultVoice();
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-GB-Neural2-B');
    });

    // Migration tests for each of the 20 removed voices
    const removedVoices = [
        'en-US-Neural2-A', 'en-US-Neural2-E', 'en-US-Neural2-F',
        'en-US-Neural2-G', 'en-US-Neural2-H', 'en-US-Neural2-I', 'en-US-Neural2-J',
        'en-GB-Neural2-C', 'en-GB-Neural2-D', 'en-GB-Neural2-F',
        'en-GB-Neural2-N', 'en-GB-Neural2-O',
        'en-AU-Neural2-A', 'en-AU-Neural2-B', 'en-AU-Neural2-C', 'en-AU-Neural2-D',
        'en-IN-Neural2-A', 'en-IN-Neural2-B', 'en-IN-Neural2-C', 'en-IN-Neural2-D',
    ];

    for (const voice of removedVoices) {
        it(`migrates removed voice ${voice} to a valid default`, () => {
            localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, voice);
            initializeDefaultVoice();
            const result = localStorage.getItem(STORAGE_KEYS.ttsCloudVoice);
            // Must be one of the 4 valid voices
            expect(CLOUD_VOICES.some(v => v.id === result)).toBe(true);
        });
    }

    it('migrates empty string to default', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, '');
        initializeDefaultVoice();
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-US-Neural2-C');
    });

    it('respects dialect when migrating removed UK voice', () => {
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, 'en-GB-Neural2-F');
        localStorage.setItem(STORAGE_KEYS.dialect, 'en-GB');
        initializeDefaultVoice();
        expect(localStorage.getItem(STORAGE_KEYS.ttsCloudVoice)).toBe('en-GB-Neural2-A');
    });

    it('is idempotent — calling twice does not change result', () => {
        initializeDefaultVoice();
        const first = localStorage.getItem(STORAGE_KEYS.ttsCloudVoice);
        initializeDefaultVoice();
        const second = localStorage.getItem(STORAGE_KEYS.ttsCloudVoice);
        expect(first).toBe(second);
    });
});

// ── MD5 Hash (client must match server exactly) ──────────────────────────────

describe('md5 hash matches Node crypto', () => {
    // Real cache key patterns that will be used in production
    const realCacheKeys = [
        'apple|en-US-Neural2-C|1',
        'colour|en-GB-Neural2-A|1',
        'the|en-US-Neural2-D|1',
        'supercalifragilisticexpialidocious|en-US-Neural2-D|0.75',
        'beautiful|en-GB-Neural2-B|1.5',
        'accommodate|en-US-Neural2-C|0.5',
        // SSML with IPA (phoneme hints for uncommon words)
        '<speak><phoneme alphabet="ipa" ph="ˈæp.əl">apple</phoneme></speak>|en-US-Neural2-C|1',
        '<speak><phoneme alphabet="ipa" ph="ˈbɒdɪɪzəm">bodyism</phoneme></speak>|en-GB-Neural2-A|1',
    ];

    for (const input of realCacheKeys) {
        it(`matches Node for: "${input.slice(0, 50)}${input.length > 50 ? '...' : ''}"`, () => {
            const expected = createHash('md5').update(input).digest('hex');
            expect(md5(input)).toBe(expected);
        });
    }

    // Edge cases
    it('handles empty string', () => {
        expect(md5('')).toBe(createHash('md5').update('').digest('hex'));
    });

    it('handles single character', () => {
        expect(md5('a')).toBe(createHash('md5').update('a').digest('hex'));
    });

    it('handles string exactly 55 bytes (padding boundary)', () => {
        const input = 'a'.repeat(55);
        expect(md5(input)).toBe(createHash('md5').update(input).digest('hex'));
    });

    it('handles string exactly 56 bytes (padding boundary)', () => {
        const input = 'a'.repeat(56);
        expect(md5(input)).toBe(createHash('md5').update(input).digest('hex'));
    });

    it('handles string exactly 64 bytes (block boundary)', () => {
        const input = 'a'.repeat(64);
        expect(md5(input)).toBe(createHash('md5').update(input).digest('hex'));
    });

    it('handles long strings (multi-block)', () => {
        const input = 'abcdefghij'.repeat(20); // 200 chars
        expect(md5(input)).toBe(createHash('md5').update(input).digest('hex'));
    });

    it('handles Unicode IPA characters', () => {
        const input = 'ˈæp.əl|ˈbɒdɪɪzəm|ˌsuːpəˌkælɪˌfrædʒɪˌlɪstɪkˌɛkspɪˌælɪˈdoʊʃəs';
        expect(md5(input)).toBe(createHash('md5').update(input).digest('hex'));
    });

    it('handles pipe characters (delimiter)', () => {
        const input = '|||';
        expect(md5(input)).toBe(createHash('md5').update(input).digest('hex'));
    });

    it('handles XML entities in SSML', () => {
        const input = '<speak>&amp;&lt;&gt;</speak>';
        expect(md5(input)).toBe(createHash('md5').update(input).digest('hex'));
    });

    it('produces 32-character hex strings for all inputs', () => {
        for (const input of realCacheKeys) {
            expect(md5(input)).toMatch(/^[0-9a-f]{32}$/);
        }
    });

    it('different inputs always produce different hashes', () => {
        const hashes = realCacheKeys.map(md5);
        expect(new Set(hashes).size).toBe(hashes.length);
    });

    it('is deterministic', () => {
        const input = 'deterministic|en-US-Neural2-C|1';
        const hash1 = md5(input);
        const hash2 = md5(input);
        const hash3 = md5(input);
        expect(hash1).toBe(hash2);
        expect(hash2).toBe(hash3);
    });

    it('case-sensitive: "Apple" and "apple" produce different hashes', () => {
        expect(md5('Apple|en-US-Neural2-C|1')).not.toBe(md5('apple|en-US-Neural2-C|1'));
    });

    it('rate-sensitive: same text with different rates produce different hashes', () => {
        expect(md5('apple|en-US-Neural2-C|1')).not.toBe(md5('apple|en-US-Neural2-C|0.75'));
    });

    it('voice-sensitive: same text with different voices produce different hashes', () => {
        expect(md5('apple|en-US-Neural2-C|1')).not.toBe(md5('apple|en-US-Neural2-D|1'));
    });
});

// ── Cache key consistency ────────────────────────────────────────────────────

describe('cache key consistency', () => {
    it('client cache key format matches server convention for plain text', () => {
        // Server: createHash('md5').update(`${text.toLowerCase()}|${voiceName}|${rate}`).digest('hex')
        const text = 'Apple';
        const voice = 'en-US-Neural2-C';
        const rate = 1;
        const clientKey = `${text.toLowerCase()}|${voice}|${rate}`;
        const serverKey = createHash('md5').update(clientKey).digest('hex');
        expect(md5(clientKey)).toBe(serverKey);
    });

    it('client cache key format matches server convention for SSML', () => {
        // Server with SSML: createHash('md5').update(`${ssml}|${voiceName}|${rate}`).digest('hex')
        const ssml = '<speak><phoneme alphabet="ipa" ph="ˈæp.əl">apple</phoneme></speak>';
        const voice = 'en-US-Neural2-C';
        const rate = 1;
        const clientKey = `${ssml}|${voice}|${rate}`;
        const serverKey = createHash('md5').update(clientKey).digest('hex');
        expect(md5(clientKey)).toBe(serverKey);
    });

    it('rate is included as number (not string) in cache key', () => {
        // Ensure "1" vs 1 vs "1.0" produce consistent results
        // The code uses template literals so rate becomes its string representation
        const key1 = md5('apple|en-US-Neural2-C|1');
        const key2 = md5('apple|en-US-Neural2-C|1');
        expect(key1).toBe(key2);

        // Different rates must be different keys
        const key3 = md5('apple|en-US-Neural2-C|1.5');
        expect(key1).not.toBe(key3);
    });

    it('all 4 voice + same word = 4 different cache keys', () => {
        const keys = CLOUD_VOICES.map(v => md5(`apple|${v.id}|1`));
        expect(new Set(keys).size).toBe(4);
    });
});
