/**
 * hooks/usePronunciation.ts
 *
 * Web Speech API + Cloud Neural2 TTS hook for word pronunciation.
 * Supports dialect-aware voice selection (en-US / en-GB).
 * Falls back gracefully: Cloud TTS → Browser TTS → silent.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { STORAGE_KEYS } from '../config';
import { synthesizeCloud, getCloudVoiceGender } from '../services/cloudTts';

interface UsePronunciationReturn {
    /** Speak the given text aloud. Pass IPA for phoneme-accurate pronunciation. */
    speak: (text: string, ipa?: string) => void;
    /** Announce a word with "Your word is ..." intro, like a real spelling bee pronouncer */
    speakWord: (word: string, ipa?: string) => void;
    /** Announce a word with its number: "Word number N. Your word is ..." */
    speakWordNumber: (word: string, num: number) => void;
    /** Spell a word letter-by-letter: "word. W, O, R, D. word." */
    speakLetters: (word: string) => void;
    /** Whether speech is currently playing */
    isSpeaking: boolean;
    /** Whether the browser supports speech synthesis */
    isSupported: boolean;
    /** Cancel any ongoing speech */
    cancel: () => void;
    /** True when cloud TTS failed and browser fallback was used */
    usedFallback: boolean;
    /** True when all TTS methods failed (both cloud and browser) */
    ttsFailed: boolean;
}

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function usePronunciation(): UsePronunciationReturn {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [usedFallback, setUsedFallback] = useState(false);
    const [ttsFailed, setTtsFailed] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Pick the best English voice once voices are loaded (respects stored preference + dialect)
    useEffect(() => {
        if (!supported) return;

        const pickVoice = () => {
            const voices = speechSynthesis.getVoices();
            // Check for user-preferred voice first
            const storedURI = localStorage.getItem(STORAGE_KEYS.ttsVoice);
            if (storedURI) {
                const preferred = voices.find(v => v.voiceURI === storedURI);
                if (preferred) { voiceRef.current = preferred; return; }
            }
            // Fall back to auto-pick: prefer voices matching dialect
            const dialect = localStorage.getItem(STORAGE_KEYS.dialect) || 'en-US';
            const langPref = dialect === 'en-GB' ? 'en-GB' : 'en-US';
            voiceRef.current =
                voices.find(v => v.lang === langPref && v.localService) ??
                voices.find(v => v.lang === langPref) ??
                voices.find(v => v.lang.startsWith('en')) ??
                null;
        };

        pickVoice();
        speechSynthesis.addEventListener('voiceschanged', pickVoice);
        return () => speechSynthesis.removeEventListener('voiceschanged', pickVoice);
    }, []);

    // Track mounted state to prevent setState after unmount
    const mountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            if (supported) speechSynthesis.cancel();
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.onended = null; // Clear event handler
                audioRef.current.onerror = null; // Clear event handler
                audioRef.current = null;
            }
            if (utteranceRef.current) {
                utteranceRef.current.onstart = null;
                utteranceRef.current.onend = null;
                utteranceRef.current.onerror = null;
            }
        };
    }, []);

    const cancel = useCallback(() => {
        if (supported) speechSynthesis.cancel();
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        setIsSpeaking(false);
    }, []);

    /** Pick a browser voice matching dialect + cloud voice gender */
    const pickFallbackVoice = useCallback((): SpeechSynthesisVoice | null => {
        if (!supported) return null;
        const voices = speechSynthesis.getVoices();
        const dialect = localStorage.getItem(STORAGE_KEYS.dialect) || 'en-US';
        const langPref = dialect === 'en-GB' ? 'en-GB' : 'en-US';
        const cloudVoice = localStorage.getItem(STORAGE_KEYS.ttsCloudVoice);
        const wantMale = cloudVoice ? getCloudVoiceGender(cloudVoice) === 'male' : false;

        // Browser voice names often contain "Male"/"Female" or gendered names like "David"/"Zira"
        const genderMatch = (v: SpeechSynthesisVoice) => {
            const n = v.name.toLowerCase();
            if (wantMale) return n.includes('male') || n.includes('david') || n.includes('mark') || n.includes('james');
            return n.includes('female') || n.includes('zira') || n.includes('eva') || n.includes('clara');
        };

        // Best: dialect + gender match
        const byLang = voices.filter(v => v.lang === langPref);
        const exact = byLang.find(v => genderMatch(v) && v.localService)
            ?? byLang.find(v => genderMatch(v));
        if (exact) return exact;

        // Good enough: dialect match (ignore gender)
        return byLang.find(v => v.localService)
            ?? byLang[0]
            ?? voices.find(v => v.lang.startsWith('en'))
            ?? null;
    }, []);

    /** Speak using browser Web Speech API */
    const speakBrowser = useCallback((text: string) => {
        if (!supported) {
            setTtsFailed(true);
            return;
        }

        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const dialect = localStorage.getItem(STORAGE_KEYS.dialect) || 'en-US';
        utterance.lang = dialect === 'en-GB' ? 'en-GB' : 'en-US';
        const storedRate = localStorage.getItem(STORAGE_KEYS.ttsRate);
        utterance.rate = storedRate ? parseFloat(storedRate) : 1.0;
        utterance.pitch = 1;
        // Pick a voice matching the user's cloud voice gender (not a stale mount-time pick)
        const voice = pickFallbackVoice() ?? voiceRef.current;
        if (voice) utterance.voice = voice;

        utterance.onstart = () => { if (mountedRef.current) setIsSpeaking(true); };
        utterance.onend = () => { if (mountedRef.current) setIsSpeaking(false); };
        utterance.onerror = (e) => {
            if (!mountedRef.current) return;
            setIsSpeaking(false);
            // "canceled" and "interrupted" are not real failures — they happen when
            // a new speak() call cancels the previous one (e.g. auto-speak on load)
            const reason = (e as SpeechSynthesisErrorEvent).error;
            if (reason !== 'canceled' && reason !== 'interrupted') setTtsFailed(true);
        };

        utteranceRef.current = utterance;
        speechSynthesis.speak(utterance);
    }, [pickFallbackVoice]);

    /** Speak — always tries Cloud TTS first, falls back to browser gracefully.
     *  Pass IPA pronunciation for phoneme-accurate Cloud TTS (e.g. uncommon words). */
    const speak = useCallback((text: string, ipa?: string) => {
        setUsedFallback(false);
        setTtsFailed(false);
        const cloudVoice = localStorage.getItem(STORAGE_KEYS.ttsCloudVoice);
        const rate = parseFloat(localStorage.getItem(STORAGE_KEYS.ttsRate) || '1.0');

        // Always try cloud first if a voice is configured
        if (cloudVoice) {
            setIsSpeaking(true);

            synthesizeCloud(text, cloudVoice, rate, ipa)
                .then(url => {
                    if (!mountedRef.current) return; // Don't play if unmounted

                    const audio = new Audio(url);
                    audioRef.current = audio;
                    audio.onended = () => {
                        if (!mountedRef.current) return;
                        setIsSpeaking(false);
                        audioRef.current = null;
                    };
                    audio.onerror = () => {
                        if (!mountedRef.current) return;
                        setIsSpeaking(false);
                        setUsedFallback(true);
                        audioRef.current = null;
                        speakBrowser(text); // fallback
                    };
                    audio.play().catch(() => {
                        if (!mountedRef.current) return;
                        setIsSpeaking(false);
                        setUsedFallback(true);
                        speakBrowser(text); // fallback
                    });
                })
                .catch(() => {
                    setIsSpeaking(false);
                    setUsedFallback(true);
                    speakBrowser(text); // fallback
                });
            return;
        }

        // No cloud voice configured, use browser directly
        speakBrowser(text);
    }, [speakBrowser]);

    /** Announce a word with "Your word is ..." like a real spelling bee pronouncer */
    const speakWord = useCallback((word: string) => {
        speak(`Your word is, ${word}`);
    }, [speak]);

    /** Announce a word with its number: "Word number 3. Your word is ..." */
    const speakWordNumber = useCallback((word: string, num: number) => {
        speak(`Word number ${num}. Your word is, ${word}`);
    }, [speak]);

    /** Spell a word letter-by-letter, like a speller at the mic */
    const speakLetters = useCallback((word: string) => {
        const letters = word.split('').join(', ');
        speak(`${word}. ${letters}. ${word}`);
    }, [speak]);

    return { speak, speakWord, speakWordNumber, speakLetters, isSpeaking, isSupported: supported, cancel, usedFallback, ttsFailed };
}
