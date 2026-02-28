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
    // US English (9 voices)
    { id: 'en-US-Neural2-A', label: 'US - Voice A (Male)', langCode: 'en-US' },
    { id: 'en-US-Neural2-C', label: 'US - Voice C (Female)', langCode: 'en-US' },
    { id: 'en-US-Neural2-D', label: 'US - Voice D (Male)', langCode: 'en-US' },
    { id: 'en-US-Neural2-E', label: 'US - Voice E (Female)', langCode: 'en-US' },
    { id: 'en-US-Neural2-F', label: 'US - Voice F (Female)', langCode: 'en-US' },
    { id: 'en-US-Neural2-G', label: 'US - Voice G (Female)', langCode: 'en-US' },
    { id: 'en-US-Neural2-H', label: 'US - Voice H (Female)', langCode: 'en-US' },
    { id: 'en-US-Neural2-I', label: 'US - Voice I (Male)', langCode: 'en-US' },
    { id: 'en-US-Neural2-J', label: 'US - Voice J (Male)', langCode: 'en-US' },
    // British English (7 voices)
    { id: 'en-GB-Neural2-A', label: 'UK - Voice A (Female)', langCode: 'en-GB' },
    { id: 'en-GB-Neural2-B', label: 'UK - Voice B (Male)', langCode: 'en-GB' },
    { id: 'en-GB-Neural2-C', label: 'UK - Voice C (Female)', langCode: 'en-GB' },
    { id: 'en-GB-Neural2-D', label: 'UK - Voice D (Male)', langCode: 'en-GB' },
    { id: 'en-GB-Neural2-F', label: 'UK - Voice F (Female)', langCode: 'en-GB' },
    { id: 'en-GB-Neural2-N', label: 'UK - Voice N (Male)', langCode: 'en-GB' },
    { id: 'en-GB-Neural2-O', label: 'UK - Voice O (Female)', langCode: 'en-GB' },
    // Australian English (4 voices)
    { id: 'en-AU-Neural2-A', label: 'AU - Voice A (Female)', langCode: 'en-AU' },
    { id: 'en-AU-Neural2-B', label: 'AU - Voice B (Male)', langCode: 'en-AU' },
    { id: 'en-AU-Neural2-C', label: 'AU - Voice C (Female)', langCode: 'en-AU' },
    { id: 'en-AU-Neural2-D', label: 'AU - Voice D (Male)', langCode: 'en-AU' },
    // Indian English (4 voices)
    { id: 'en-IN-Neural2-A', label: 'IN - Voice A (Female)', langCode: 'en-IN' },
    { id: 'en-IN-Neural2-B', label: 'IN - Voice B (Male)', langCode: 'en-IN' },
    { id: 'en-IN-Neural2-C', label: 'IN - Voice C (Male)', langCode: 'en-IN' },
    { id: 'en-IN-Neural2-D', label: 'IN - Voice D (Female)', langCode: 'en-IN' },
];

/** Filter voices matching the active dialect (en-US or en-GB). */
export function voicesForDialect(dialect: string): CloudVoice[] {
    const langCode = dialect === 'en-GB' ? 'en-GB' : 'en-US';
    return CLOUD_VOICES.filter(v => v.langCode === langCode);
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
