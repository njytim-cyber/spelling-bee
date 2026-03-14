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
    // US English
    { id: 'en-US-Neural2-D', label: 'US - David (Clear)',      langCode: 'en-US', gender: 'male' },
    { id: 'en-US-Neural2-C', label: 'US - Clara (Warm)',       langCode: 'en-US', gender: 'female' },
    // British English
    { id: 'en-GB-Neural2-B', label: 'UK - Benjamin (Warm)',    langCode: 'en-GB', gender: 'male' },
    { id: 'en-GB-Neural2-A', label: 'UK - Alice (Poised)',     langCode: 'en-GB', gender: 'female' },
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

/** Default voice for a given dialect. */
function defaultVoiceForDialect(dialect: string): string {
    return dialect === 'en-GB' ? 'en-GB-Neural2-A' : 'en-US-Neural2-C';
}

/**
 * Initialize default cloud voice if none is set, or migrate from a removed voice.
 * Call this on app startup to ensure neural2 voices work by default.
 */
export function initializeDefaultVoice(): void {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(STORAGE_KEYS.ttsCloudVoice);
    if (!stored || !CLOUD_VOICES.some(v => v.id === stored)) {
        const dialect = localStorage.getItem(STORAGE_KEYS.dialect) ?? 'en-US';
        const defaultVoice = defaultVoiceForDialect(dialect);
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, defaultVoice);
        localStorage.setItem(STORAGE_KEYS.ttsEngine, 'cloud');
    }
}

/**
 * Auto-switch TTS voice when dialect changes.
 * If the current voice doesn't match the new dialect, pick the equivalent
 * voice in the new dialect (same gender) or fall back to the default.
 */
export function syncVoiceToDialect(dialect: string): void {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(STORAGE_KEYS.ttsCloudVoice) ?? '';
    const current = CLOUD_VOICES.find(v => v.id === stored);
    const targetLang = dialect === 'en-GB' ? 'en-GB' : 'en-US';

    // Already using a voice matching the dialect — nothing to do
    if (current && current.langCode === targetLang) return;

    // Find the equivalent voice (same gender) in the new dialect
    const gender = current?.gender ?? 'female';
    const equivalent = CLOUD_VOICES.find(
        v => v.langCode === targetLang && v.gender === gender,
    );
    const newVoice = equivalent?.id ?? defaultVoiceForDialect(dialect);
    localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, newVoice);
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
const TTS_BUCKET_URL = 'https://storage.googleapis.com/spelling-bee-prod-tts/tts-cache';

/** LRU audio cache: cacheKey → blobUrl. Evicts oldest when full. */
const audioCache = new Map<string, string>();

/** In-flight request deduplication: prevents duplicate TTS API calls for the same text. */
const inflightRequests = new Map<string, Promise<string>>();

/** Hashes known to be missing from CDN (avoids repeated 404 fetches within a session). */
const cdnMissCache = new Set<string>();

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
 * Build SSML with IPA phoneme hint for a single word.
 * Falls back to plain text if no IPA is provided.
 */
function buildSsml(text: string, ipa?: string): string | undefined {
    if (!ipa) return undefined;
    // Sanitize both text (XML body) and IPA (XML attribute) to prevent SSML injection
    const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapeAttr = (s: string) => escapeXml(s).replace(/"/g, '&quot;');
    return `<speak><phoneme alphabet="ipa" ph="${escapeAttr(ipa)}">${escapeXml(text)}</phoneme></speak>`;
}

/**
 * MD5 hash matching Node's crypto.createHash('md5').digest('hex').
 * Used to compute the same cache key as the Cloud Function so the client
 * can check the public Cloud Storage URL directly.
 * Exported for testing (must match server-side output exactly).
 */
export function md5(input: string): string {
    // Use the same approach as the server: we compute an MD5 hex digest.
    // Since SubtleCrypto doesn't support MD5, we use a compact implementation.
    const k = [
        0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a,
        0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
        0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340,
        0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
        0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8,
        0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
        0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
        0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
        0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92,
        0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
        0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
    ];
    const s = [
        7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
        5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
        4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
        6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
    ];

    // UTF-8 encode (handles BMP + surrogate pairs for full Unicode support)
    const bytes: number[] = [];
    for (let i = 0; i < input.length; i++) {
        let code = input.charCodeAt(i);
        if (code >= 0xd800 && code <= 0xdbff && i + 1 < input.length) {
            // Surrogate pair → decode to full code point (4-byte UTF-8)
            const lo = input.charCodeAt(i + 1);
            if (lo >= 0xdc00 && lo <= 0xdfff) {
                code = ((code - 0xd800) << 10) + (lo - 0xdc00) + 0x10000;
                i++;
                bytes.push(0xf0 | (code >> 18));
                bytes.push(0x80 | ((code >> 12) & 0x3f));
                bytes.push(0x80 | ((code >> 6) & 0x3f));
                bytes.push(0x80 | (code & 0x3f));
                continue;
            }
        }
        if (code < 0x80) bytes.push(code);
        else if (code < 0x800) { bytes.push(0xc0 | (code >> 6)); bytes.push(0x80 | (code & 0x3f)); }
        else { bytes.push(0xe0 | (code >> 12)); bytes.push(0x80 | ((code >> 6) & 0x3f)); bytes.push(0x80 | (code & 0x3f)); }
    }

    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 0; i < 4; i++) bytes.push((bitLen >>> (i * 8)) & 0xff);
    for (let i = 0; i < 4; i++) bytes.push(0); // high 32 bits of length (always 0 for short strings)

    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

    for (let offset = 0; offset < bytes.length; offset += 64) {
        const M: number[] = [];
        for (let j = 0; j < 16; j++) {
            M[j] = bytes[offset + j * 4] | (bytes[offset + j * 4 + 1] << 8) |
                (bytes[offset + j * 4 + 2] << 16) | (bytes[offset + j * 4 + 3] << 24);
        }
        let A = a0, B = b0, C = c0, D = d0;
        for (let i = 0; i < 64; i++) {
            let F: number, g: number;
            if (i < 16) { F = (B & C) | (~B & D); g = i; }
            else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
            else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
            else { F = C ^ (B | ~D); g = (7 * i) % 16; }
            F = (F + A + k[i] + M[g]) >>> 0;
            A = D; D = C; C = B;
            B = (B + ((F << s[i]) | (F >>> (32 - s[i])))) >>> 0;
        }
        a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }

    const hex = (n: number) => {
        let h = '';
        for (let i = 0; i < 4; i++) h += ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
        return h;
    };
    return hex(a0) + hex(b0) + hex(c0) + hex(d0);
}

/**
 * Try to fetch a cached MP3 directly from Cloud Storage (public URL).
 * Returns a blob URL on hit, or null on miss.
 */
async function fetchCachedAudio(cacheHash: string, signal: AbortSignal): Promise<string | null> {
    if (cdnMissCache.has(cacheHash)) return null;
    const url = `${TTS_BUCKET_URL}/${cacheHash}.mp3`;
    try {
        const response = await fetch(url, { signal });
        if (!response.ok) {
            cdnMissCache.add(cacheHash);
            return null;
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch {
        return null;
    }
}

/**
 * Synthesize speech, checking the CDN cache first for instant playback.
 *
 * Flow:
 * 1. Check in-memory LRU cache
 * 2. Try public Cloud Storage URL (CDN-cached MP3)
 * 3. Fall back to Cloud Function (synthesizes + caches for next time)
 *
 * When `ipa` is provided, sends SSML with a <phoneme> hint so Cloud TTS
 * pronounces uncommon words correctly (e.g. "bodyism" → /ˈbɒdɪɪzəm/).
 *
 * Throws if the network is too slow (2G/save-data) — callers should
 * fall back to browser TTS.
 */
export async function synthesizeCloud(
    text: string,
    voiceName: string,
    rate: number = 1.0,
    ipa?: string,
): Promise<string> {
    if (shouldSkipCloudTts()) {
        throw new Error('Cloud TTS skipped: slow/metered connection');
    }

    const ssml = buildSsml(text, ipa);
    const memoryCacheKey = ssml
        ? `${ssml}|${voiceName}|${rate}`
        : `${text.toLowerCase()}|${voiceName}|${rate}`;

    // 1. In-memory LRU cache
    const memCached = audioCache.get(memoryCacheKey);
    if (memCached) return memCached;

    // 2. Deduplicate concurrent requests for the same text+voice+rate
    const inflight = inflightRequests.get(memoryCacheKey);
    if (inflight) return inflight;

    const request = synthesizeCloudInner(text, voiceName, rate, ipa, memoryCacheKey);
    inflightRequests.set(memoryCacheKey, request);

    try {
        return await request;
    } finally {
        inflightRequests.delete(memoryCacheKey);
    }
}

/** Inner synthesis logic — called at most once per unique cache key at a time. */
async function synthesizeCloudInner(
    text: string,
    voiceName: string,
    rate: number,
    ipa: string | undefined,
    memoryCacheKey: string,
): Promise<string> {
    const ssml = buildSsml(text, ipa);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLOUD_TTS_TIMEOUT_MS);

    try {
        return await trackLatency('cloud_tts', 'synthesize', async () => {
            // 3. Try public CDN URL (matches server-side MD5 cache key)
            const cacheHash = md5(memoryCacheKey);
            const cdnResult = await fetchCachedAudio(cacheHash, controller.signal);
            if (cdnResult) {
                if (audioCache.size >= AUDIO_CACHE_MAX) evictOldest();
                audioCache.set(memoryCacheKey, cdnResult);
                return cdnResult;
            }

            // 4. Fall back to Cloud Function
            const { app } = await import('../utils/firebase');
            const functions = getFunctions(app, 'us-central1');
            const synthesize = httpsCallable<
                { text: string; voiceName: string; speakingRate: number; ssml?: string },
                { audioBase64?: string; publicUrl: string; cached: boolean }
            >(functions, 'synthesizeSpeech');

            const payload: { text: string; voiceName: string; speakingRate: number; ssml?: string } = {
                text, voiceName, speakingRate: rate,
            };
            if (ssml) payload.ssml = ssml;

            const result = await synthesize(payload);
            let blobUrl: string;

            if (result.data.audioBase64) {
                // Fresh synthesis: audio returned inline as base64 (avoids second network round-trip)
                const binary = atob(result.data.audioBase64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const blob = new Blob([bytes], { type: 'audio/mpeg' });
                blobUrl = URL.createObjectURL(blob);
            } else {
                // Cached: fetch MP3 from public CDN URL
                const response = await fetch(result.data.publicUrl, { signal: controller.signal });
                if (!response.ok) throw new Error(`CDN fetch failed: ${response.status}`);
                const blob = await response.blob();
                blobUrl = URL.createObjectURL(blob);
            }

            if (audioCache.size >= AUDIO_CACHE_MAX) evictOldest();
            audioCache.set(memoryCacheKey, blobUrl);
            // Cloud Function saved MP3 to CDN — clear the miss cache so future
            // sessions (after LRU eviction) find it on CDN directly
            cdnMissCache.delete(cacheHash);
            return blobUrl;
        });
    } finally {
        clearTimeout(timeout);
    }
}
