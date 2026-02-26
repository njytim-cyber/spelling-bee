import { describe, it, expect } from 'vitest';
import { CLOUD_VOICES, voicesForDialect } from '../services/cloudTts';

describe('Cloud TTS voice catalog', () => {
    it('has 24 Neural2 voices total', () => {
        expect(CLOUD_VOICES).toHaveLength(24);
    });

    it('US dialect has 9 voices', () => {
        expect(voicesForDialect('en-US')).toHaveLength(9);
    });

    it('UK dialect has 7 voices', () => {
        expect(voicesForDialect('en-GB')).toHaveLength(7);
    });

    it('all voices have valid Neural2 IDs', () => {
        const pattern = /^en-(US|GB|AU|IN)-Neural2-[A-Z]$/;
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

    it('langCode matches voice ID prefix', () => {
        for (const voice of CLOUD_VOICES) {
            expect(voice.id.startsWith(voice.langCode)).toBe(true);
        }
    });

    it('unknown dialect defaults to US voices', () => {
        const voices = voicesForDialect('en-ZZ');
        expect(voices).toEqual(voicesForDialect('en-US'));
    });
});
