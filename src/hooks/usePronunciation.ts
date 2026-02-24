/**
 * hooks/usePronunciation.ts
 *
 * Web Speech API hook for word pronunciation.
 * Falls back gracefully on unsupported browsers.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { STORAGE_KEYS } from '../config';

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

    // Pick the best English voice once voices are loaded (respects stored preference)
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
            // Fall back to auto-pick: prefer local en-US voices
            voiceRef.current =
                voices.find(v => v.lang === 'en-US' && v.localService) ??
                voices.find(v => v.lang === 'en-US') ??
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
        };
    }, []);

    const cancel = useCallback(() => {
        if (!supported) return;
        speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    const speak = useCallback((text: string) => {
        if (!supported) return;

        // Cancel any in-progress speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
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

    return { speak, isSpeaking, isSupported: supported, cancel };
}
