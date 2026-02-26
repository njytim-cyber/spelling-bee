/**
 * hooks/usePronunciation.ts
 *
 * Web Speech API + Cloud Neural2 TTS hook for word pronunciation.
 * Supports dialect-aware voice selection (en-US / en-GB).
 * Falls back gracefully: Cloud TTS → Browser TTS → silent.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { STORAGE_KEYS } from '../config';
import { synthesizeCloud } from '../services/cloudTts';

interface UsePronunciationReturn {
    /** Speak the given text aloud */
    speak: (text: string) => void;
    /** Whether speech is currently playing */
    isSpeaking: boolean;
    /** Whether the browser supports speech synthesis */
    isSupported: boolean;
    /** Cancel any ongoing speech */
    cancel: () => void;
}

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function usePronunciation(): UsePronunciationReturn {
    const [isSpeaking, setIsSpeaking] = useState(false);
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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (supported) speechSynthesis.cancel();
            if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        };
    }, []);

    const cancel = useCallback(() => {
        if (supported) speechSynthesis.cancel();
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        setIsSpeaking(false);
    }, []);

    /** Speak using browser Web Speech API */
    const speakBrowser = useCallback((text: string) => {
        if (!supported) return;

        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const dialect = localStorage.getItem(STORAGE_KEYS.dialect) || 'en-US';
        utterance.lang = dialect === 'en-GB' ? 'en-GB' : 'en-US';
        const storedRate = localStorage.getItem(STORAGE_KEYS.ttsRate);
        utterance.rate = storedRate ? parseFloat(storedRate) : 0.85;
        utterance.pitch = 1;
        if (voiceRef.current) utterance.voice = voiceRef.current;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        utteranceRef.current = utterance;
        speechSynthesis.speak(utterance);
    }, []);

    /** Speak — tries Cloud TTS first if configured, falls back to browser */
    const speak = useCallback((text: string) => {
        const engine = localStorage.getItem(STORAGE_KEYS.ttsEngine) || 'browser';
        const cloudVoice = localStorage.getItem(STORAGE_KEYS.ttsCloudVoice);

        if (engine === 'cloud' && cloudVoice) {
            const rate = parseFloat(localStorage.getItem(STORAGE_KEYS.ttsRate) || '0.85');
            setIsSpeaking(true);

            synthesizeCloud(text, cloudVoice, rate)
                .then(url => {
                    const audio = new Audio(url);
                    audioRef.current = audio;
                    audio.onended = () => { setIsSpeaking(false); audioRef.current = null; };
                    audio.onerror = () => {
                        setIsSpeaking(false);
                        audioRef.current = null;
                        speakBrowser(text); // fallback
                    };
                    audio.play().catch(() => {
                        setIsSpeaking(false);
                        speakBrowser(text); // fallback
                    });
                })
                .catch(() => {
                    setIsSpeaking(false);
                    speakBrowser(text); // fallback
                });
            return;
        }

        speakBrowser(text);
    }, [speakBrowser]);

    return { speak, isSpeaking, isSupported: supported, cancel };
}
