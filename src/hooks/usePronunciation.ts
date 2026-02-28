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
    /** Announce a word with "Your word is ..." intro, like a real spelling bee pronouncer */
    speakWord: (word: string) => void;
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

    /** Speak — always tries Cloud TTS first, falls back to browser gracefully */
    const speak = useCallback((text: string) => {
        const cloudVoice = localStorage.getItem(STORAGE_KEYS.ttsCloudVoice);
        const rate = parseFloat(localStorage.getItem(STORAGE_KEYS.ttsRate) || '0.85');

        // Always try cloud first if a voice is configured
        if (cloudVoice) {
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

    return { speak, speakWord, speakWordNumber, speakLetters, isSpeaking, isSupported: supported, cancel };
}
