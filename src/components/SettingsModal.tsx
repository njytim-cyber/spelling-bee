/**
 * components/SettingsModal.tsx
 *
 * App settings: TTS voice/speed, theme toggle.
 */
import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { STORAGE_KEYS } from '../config';
import { OfflinePacksSection } from './OfflinePacksSection';
import type { GradeLevel } from '../domains/spelling/spellingCategories';
import { GRADE_LEVELS, gradeIcon } from '../domains/spelling/spellingCategories';

interface Props {
    themeMode: string;
    onThemeModeToggle: () => void;
    grade: string;
    onGradeChange: (grade: GradeLevel) => void;
    onClose: () => void;
}

function getStoredRate(): number {
    const v = localStorage.getItem(STORAGE_KEYS.ttsRate);
    return v ? parseFloat(v) : 0.85;
}

function getStoredVoice(): string {
    return localStorage.getItem(STORAGE_KEYS.ttsVoice) ?? '';
}

export const SettingsModal = memo(function SettingsModal({ themeMode, onThemeModeToggle, grade, onGradeChange, onClose }: Props) {
    const [ttsRate, setTtsRate] = useState(getStoredRate);
    const [ttsVoice, setTtsVoice] = useState(getStoredVoice);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    // Load available voices
    useEffect(() => {
        if (!('speechSynthesis' in window)) return;
        const load = () => {
            const all = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
            setVoices(all);
        };
        load();
        speechSynthesis.addEventListener('voiceschanged', load);
        return () => speechSynthesis.removeEventListener('voiceschanged', load);
    }, []);

    const handleRateChange = (rate: number) => {
        setTtsRate(rate);
        localStorage.setItem(STORAGE_KEYS.ttsRate, String(rate));
    };

    const handleVoiceChange = (voiceURI: string) => {
        setTtsVoice(voiceURI);
        localStorage.setItem(STORAGE_KEYS.ttsVoice, voiceURI);
    };

    const previewTTS = () => {
        if (!('speechSynthesis' in window)) return;
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance('Spelling Bee');
        u.rate = ttsRate;
        u.lang = 'en-US';
        if (ttsVoice) {
            const v = speechSynthesis.getVoices().find(v => v.voiceURI === ttsVoice);
            if (v) u.voice = v;
        }
        speechSynthesis.speak(u);
    };

    return (
        <>
            <motion.div
                className="fixed inset-0 bg-[var(--color-overlay-dim)] z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.div
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--color-overlay)] border border-[rgb(var(--color-fg))]/15 rounded-2xl px-5 py-5 w-[340px] max-h-[80vh] overflow-y-auto"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg chalk text-[var(--color-chalk)]">Settings</h3>
                    <button onClick={onClose} className="text-sm ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60">
                        Close
                    </button>
                </div>

                {/* Grade Level */}
                <section className="mb-5">
                    <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Grade Level</h4>
                    <div className="flex flex-col gap-1.5">
                        {GRADE_LEVELS.map(g => (
                            <button
                                key={g.id}
                                onClick={() => onGradeChange(g.id)}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors text-left text-sm ui ${
                                    grade === g.id
                                        ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]'
                                        : 'border-[rgb(var(--color-fg))]/10 text-[var(--color-chalk)] hover:border-[rgb(var(--color-fg))]/25'
                                }`}
                            >
                                <span className={`w-5 h-5 flex items-center justify-center ${grade === g.id ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/50'}`}>
                                    {gradeIcon(g.id)}
                                </span>
                                <span>{g.grades}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Theme */}
                <section className="mb-5">
                    <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Theme</h4>
                    <button
                        onClick={onThemeModeToggle}
                        className="w-full py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/15 text-sm ui text-[var(--color-chalk)] hover:border-[rgb(var(--color-fg))]/30 transition-colors"
                    >
                        {themeMode === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'} — tap to switch
                    </button>
                </section>

                {/* TTS Speed */}
                <section className="mb-5">
                    <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">
                        Speech Speed: {ttsRate.toFixed(2)}x
                    </h4>
                    <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={ttsRate}
                        onChange={e => handleRateChange(parseFloat(e.target.value))}
                        className="w-full accent-[var(--color-gold)]"
                    />
                    <div className="flex justify-between text-[10px] ui text-[rgb(var(--color-fg))]/25">
                        <span>Slower</span>
                        <span>Faster</span>
                    </div>
                </section>

                {/* TTS Voice */}
                {'speechSynthesis' in globalThis && voices.length > 0 && (
                    <section className="mb-5">
                        <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Voice</h4>
                        <select
                            value={ttsVoice}
                            onChange={e => handleVoiceChange(e.target.value)}
                            className="w-full bg-transparent border border-[rgb(var(--color-fg))]/15 rounded-xl px-3 py-2 text-sm ui text-[var(--color-chalk)] focus:outline-none focus:border-[var(--color-gold)]/40"
                        >
                            <option value="">Auto (best available)</option>
                            {voices.map(v => (
                                <option key={v.voiceURI} value={v.voiceURI}>
                                    {v.name} {v.localService ? '(local)' : ''}
                                </option>
                            ))}
                        </select>
                    </section>
                )}

                {/* Preview */}
                <button
                    onClick={previewTTS}
                    className="w-full py-2.5 mb-5 rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/15 transition-colors"
                >
                    🔊 Preview Voice
                </button>

                {/* Offline Word Packs */}
                <OfflinePacksSection />
            </motion.div>
        </>
    );
});
