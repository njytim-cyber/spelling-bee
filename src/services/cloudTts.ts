/**
 * services/cloudTts.ts
 *
 * Client-side interface for Google Cloud Neural2 TTS voices.
 * Calls a Firebase Cloud Function to synthesize speech, caches results.
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { STORAGE_KEYS } from '../config';
import { trackLatency } from '../utils/analytics';

// ── Voice catalog ────────────────────────────────────────────────────────────

export type VoiceGender = 'male' | 'female';

export interface CloudVoice {
    id: string;        // e.g. 'en-US-Neural2-A'
    label: string;     // e.g. 'US - Andrew (Calm)'
    langCode: string;  // e.g. 'en-US'
    gender: VoiceGender;
}

export const CLOUD_VOICES: CloudVoice[] = [
    // US English (9 voices) — genders per Google Cloud TTS docs
    { id: 'en-US-Neural2-A', label: 'US - Andrew (Calm)',      langCode: 'en-US', gender: 'male' },
    { id: 'en-US-Neural2-C', label: 'US - Clara (Warm)',       langCode: 'en-US', gender: 'female' },
    { id: 'en-US-Neural2-D', label: 'US - David (Clear)',      langCode: 'en-US', gender: 'male' },
    { id: 'en-US-Neural2-E', label: 'US - Emily (Bright)',     langCode: 'en-US', gender: 'female' },
    { id: 'en-US-Neural2-F', label: 'US - Fiona (Friendly)',   langCode: 'en-US', gender: 'female' },
    { id: 'en-US-Neural2-G', label: 'US - Grace (Gentle)',     langCode: 'en-US', gender: 'female' },
    { id: 'en-US-Neural2-H', label: 'US - Hannah (Steady)',    langCode: 'en-US', gender: 'female' },
    { id: 'en-US-Neural2-I', label: 'US - Isaac (Deep)',       langCode: 'en-US', gender: 'male' },
    { id: 'en-US-Neural2-J', label: 'US - James (Strong)',     langCode: 'en-US', gender: 'male' },
    // British English (7 voices)
    { id: 'en-GB-Neural2-A', label: 'UK - Alice (Poised)',     langCode: 'en-GB', gender: 'female' },
    { id: 'en-GB-Neural2-B', label: 'UK - Benjamin (Warm)',    langCode: 'en-GB', gender: 'male' },
    { id: 'en-GB-Neural2-C', label: 'UK - Charlotte (Bright)', langCode: 'en-GB', gender: 'female' },
    { id: 'en-GB-Neural2-D', label: 'UK - Daniel (Clear)',     langCode: 'en-GB', gender: 'male' },
    { id: 'en-GB-Neural2-F', label: 'UK - Florence (Soft)',    langCode: 'en-GB', gender: 'female' },
    { id: 'en-GB-Neural2-N', label: 'UK - Naomi (Steady)',     langCode: 'en-GB', gender: 'female' },
    { id: 'en-GB-Neural2-O', label: 'UK - Oliver (Gentle)',    langCode: 'en-GB', gender: 'male' },
    // Australian English (4 voices)
    { id: 'en-AU-Neural2-A', label: 'AU - Amelia (Bright)',    langCode: 'en-AU', gender: 'female' },
    { id: 'en-AU-Neural2-B', label: 'AU - Blake (Relaxed)',    langCode: 'en-AU', gender: 'male' },
    { id: 'en-AU-Neural2-C', label: 'AU - Chloe (Friendly)',   langCode: 'en-AU', gender: 'female' },
    { id: 'en-AU-Neural2-D', label: 'AU - Dylan (Calm)',       langCode: 'en-AU', gender: 'male' },
    // Indian English (4 voices)
    { id: 'en-IN-Neural2-A', label: 'IN - Ananya (Clear)',     langCode: 'en-IN', gender: 'female' },
    { id: 'en-IN-Neural2-B', label: 'IN - Bhaskar (Warm)',     langCode: 'en-IN', gender: 'male' },
    { id: 'en-IN-Neural2-C', label: 'IN - Chetan (Steady)',    langCode: 'en-IN', gender: 'male' },
    { id: 'en-IN-Neural2-D', label: 'IN - Diya (Gentle)',      langCode: 'en-IN', gender: 'female' },
];

/** Look up the gender of a cloud voice by ID. Defaults to 'female'. */
export function getCloudVoiceGender(voiceId: string): VoiceGender {
    return CLOUD_VOICES.find(v => v.id === voiceId)?.gender ?? 'female';
}

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

    const stored = localStorage.getItem(STORAGE_KEYS.ttsCloudVoice);
    if (!stored) {
        // Default to US Voice C (Female)
        const defaultVoice = 'en-US-Neural2-C';
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, defaultVoice);
        localStorage.setItem(STORAGE_KEYS.ttsEngine, 'cloud');
    }
}

// ── Network detection ────────────────────────────────────────────────────────

/** True when the connection is too slow or metered for cloud TTS. */
export function shouldSkipCloudTts(): boolean {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (!conn) return false;
    if (conn.saveData) return true;
    if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') return true;
    return false;
}

// ── Synthesis ────────────────────────────────────────────────────────────────

const CLOUD_TTS_TIMEOUT_MS = 8_000;
const AUDIO_CACHE_MAX = 50;

/** LRU audio cache: cacheKey → blobUrl. Evicts oldest when full. */
const audioCache = new Map<string, string>();

/** Evict the oldest entry and revoke its blob URL. */
function evictOldest(): void {
    const firstKey = audioCache.keys().next().value;
    if (firstKey != null) {
        const url = audioCache.get(firstKey)!;
        URL.revokeObjectURL(url);
        audioCache.delete(firstKey);
    }
}

/**
 * Synthesize speech via the Firebase Cloud Function.
 * Returns a blob URL for immediate playback.
 * Caches results in memory (LRU, max 50 entries).
 *
 * Throws if the network is too slow (2G/save-data) — callers should
 * fall back to browser TTS.
 */
export async function synthesizeCloud(
    text: string,
    voiceName: string,
    rate: number = 1.0,
): Promise<string> {
    if (shouldSkipCloudTts()) {
        throw new Error('Cloud TTS skipped: slow/metered connection');
    }

    const cacheKey = `${text.toLowerCase()}|${voiceName}|${rate}`;
    const cached = audioCache.get(cacheKey);
    if (cached) return cached;

    // Abort if the request takes longer than 8 seconds
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLOUD_TTS_TIMEOUT_MS);

    try {
        return await trackLatency('cloud_tts', 'synthesize', async () => {
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
            const response = await fetch(audioUrl, { signal: controller.signal });
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            // LRU eviction: drop oldest when cache is full
            if (audioCache.size >= AUDIO_CACHE_MAX) evictOldest();
            audioCache.set(cacheKey, blobUrl);

            return blobUrl;
        });
    } finally {
        clearTimeout(timeout);
    }
}
