/**
 * services/cloudTts.ts
 *
 * Client-side interface for Google Cloud Neural2 TTS voices.
 * Calls a Firebase Cloud Function to synthesize speech, caches results.
 */
import { getFunctions, httpsCallable } from 'firebase/functions';

// ── Voice catalog ────────────────────────────────────────────────────────────

export interface CloudVoice {
    id: string;        // e.g. 'en-US-Neural2-A'
    label: string;     // e.g. 'US - Voice A (Male)'
    langCode: string;  // e.g. 'en-US'
}

export const CLOUD_VOICES: CloudVoice[] = [
    // US English (9 voices) — friendly names describe tone/character
    { id: 'en-US-Neural2-A', label: 'US - Andrew (Calm)', langCode: 'en-US' },
    { id: 'en-US-Neural2-C', label: 'US - Clara (Warm)', langCode: 'en-US' },
    { id: 'en-US-Neural2-D', label: 'US - David (Clear)', langCode: 'en-US' },
    { id: 'en-US-Neural2-E', label: 'US - Emily (Bright)', langCode: 'en-US' },
    { id: 'en-US-Neural2-F', label: 'US - Fiona (Friendly)', langCode: 'en-US' },
    { id: 'en-US-Neural2-G', label: 'US - Grace (Gentle)', langCode: 'en-US' },
    { id: 'en-US-Neural2-H', label: 'US - Hannah (Steady)', langCode: 'en-US' },
    { id: 'en-US-Neural2-I', label: 'US - Isaac (Deep)', langCode: 'en-US' },
    { id: 'en-US-Neural2-J', label: 'US - James (Strong)', langCode: 'en-US' },
    // British English (7 voices)
    { id: 'en-GB-Neural2-A', label: 'UK - Alice (Poised)', langCode: 'en-GB' },
    { id: 'en-GB-Neural2-B', label: 'UK - Benjamin (Warm)', langCode: 'en-GB' },
    { id: 'en-GB-Neural2-C', label: 'UK - Charlotte (Bright)', langCode: 'en-GB' },
    { id: 'en-GB-Neural2-D', label: 'UK - Daniel (Clear)', langCode: 'en-GB' },
    { id: 'en-GB-Neural2-F', label: 'UK - Florence (Soft)', langCode: 'en-GB' },
    { id: 'en-GB-Neural2-N', label: 'UK - Nathan (Steady)', langCode: 'en-GB' },
    { id: 'en-GB-Neural2-O', label: 'UK - Olivia (Gentle)', langCode: 'en-GB' },
    // Australian English (4 voices)
    { id: 'en-AU-Neural2-A', label: 'AU - Amelia (Bright)', langCode: 'en-AU' },
    { id: 'en-AU-Neural2-B', label: 'AU - Blake (Relaxed)', langCode: 'en-AU' },
    { id: 'en-AU-Neural2-C', label: 'AU - Chloe (Friendly)', langCode: 'en-AU' },
    { id: 'en-AU-Neural2-D', label: 'AU - Dylan (Calm)', langCode: 'en-AU' },
    // Indian English (4 voices)
    { id: 'en-IN-Neural2-A', label: 'IN - Ananya (Clear)', langCode: 'en-IN' },
    { id: 'en-IN-Neural2-B', label: 'IN - Bhaskar (Warm)', langCode: 'en-IN' },
    { id: 'en-IN-Neural2-C', label: 'IN - Chetan (Steady)', langCode: 'en-IN' },
    { id: 'en-IN-Neural2-D', label: 'IN - Diya (Gentle)', langCode: 'en-IN' },
];

/** Filter voices matching the active dialect (en-US or en-GB). */
export function voicesForDialect(dialect: string): CloudVoice[] {
    const langCode = dialect === 'en-GB' ? 'en-GB' : 'en-US';
    return CLOUD_VOICES.filter(v => v.langCode === langCode);
}

/**
 * Initialize default cloud voice if none is set.
 * Call this on app startup to ensure neural2 voices work by default.
 */
export function initializeDefaultVoice(): void {
    if (typeof window === 'undefined') return;

    const STORAGE_KEYS = {
        ttsCloudVoice: 'spelling-bee-tts-cloud-voice',
        ttsEngine: 'spelling-bee-tts-engine',
    };

    const stored = localStorage.getItem(STORAGE_KEYS.ttsCloudVoice);
    if (!stored) {
        // Default to US Voice C (Female)
        const defaultVoice = 'en-US-Neural2-C';
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, defaultVoice);
        localStorage.setItem(STORAGE_KEYS.ttsEngine, 'cloud');
    }
}

// ── Synthesis ────────────────────────────────────────────────────────────────

/** In-memory audio cache (per session): cacheKey → blobUrl */
const audioCache = new Map<string, string>();

/**
 * Synthesize speech via the Firebase Cloud Function.
 * Returns a blob URL for immediate playback.
 * Caches results in memory for the session.
 */
export async function synthesizeCloud(
    text: string,
    voiceName: string,
    rate: number = 1.0,
): Promise<string> {
    const cacheKey = `${text.toLowerCase()}|${voiceName}|${rate}`;
    const cached = audioCache.get(cacheKey);
    if (cached) return cached;

    // Lazy-load Firebase app only when synthesis is actually needed
    const { app } = await import('../utils/firebase');
    const functions = getFunctions(app, 'us-central1');
    const synthesize = httpsCallable<
        { text: string; voiceName: string; speakingRate: number },
        { audioUrl: string; cached: boolean }
    >(functions, 'synthesizeSpeech');

    const result = await synthesize({ text, voiceName, speakingRate: rate });
    const audioUrl = result.data.audioUrl;

    // Pre-fetch and cache as blob URL for instant subsequent playback
    const response = await fetch(audioUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    audioCache.set(cacheKey, blobUrl);

    return blobUrl;
}
