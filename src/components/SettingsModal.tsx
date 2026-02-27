/**
 * components/SettingsModal.tsx
 *
 * App settings: dialect, grade, TTS voice/speed, theme toggle.
 */
import { memo, useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../config';
import { ModalShell } from './ModalShell';
import { OfflinePacksSection } from './OfflinePacksSection';
import type { GradeLevel } from '../domains/spelling/spellingCategories';
import { GRADE_LEVELS, gradeIcon } from '../domains/spelling/spellingCategories';
import type { Dialect } from '../domains/spelling/words/types';
import { CLOUD_VOICES, voicesForDialect, synthesizeCloud } from '../services/cloudTts';

interface Props {
    grade: string;
    onGradeChange: (grade: GradeLevel) => void;
    dialect: string;
    onDialectChange: (d: Dialect) => void;
    onClose: () => void;
}

function getStoredRate(): number {
    const v = localStorage.getItem(STORAGE_KEYS.ttsRate);
    return v ? parseFloat(v) : 0.85;
}

function getStoredVoice(): string {
    return localStorage.getItem(STORAGE_KEYS.ttsVoice) ?? '';
}

function getStoredEngine(): string {
    return localStorage.getItem(STORAGE_KEYS.ttsEngine) ?? 'browser';
}

function getStoredCloudVoice(): string {
    return localStorage.getItem(STORAGE_KEYS.ttsCloudVoice) ?? '';
}

export const SettingsModal = memo(function SettingsModal({ grade, onGradeChange, dialect, onDialectChange, onClose }: Props) {
    const [ttsRate, setTtsRate] = useState(getStoredRate);
    const [ttsVoice, setTtsVoice] = useState(getStoredVoice);
    const [ttsEngine, setTtsEngine] = useState(getStoredEngine);
    const [ttsCloudVoice, setTtsCloudVoice] = useState(getStoredCloudVoice);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Load available browser voices
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

    const handleEngineChange = (engine: string) => {
        setTtsEngine(engine);
        localStorage.setItem(STORAGE_KEYS.ttsEngine, engine);
    };

    const handleCloudVoiceChange = (voiceId: string) => {
        setTtsCloudVoice(voiceId);
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, voiceId);
    };

    const previewTTS = async () => {
        const previewWord = dialect === 'en-GB' ? 'colour' : 'color';

        if (ttsEngine === 'cloud' && ttsCloudVoice) {
            setPreviewLoading(true);
            try {
                const url = await synthesizeCloud(previewWord, ttsCloudVoice, ttsRate);
                const audio = new Audio(url);
                audio.onended = () => setPreviewLoading(false);
                audio.onerror = () => setPreviewLoading(false);
                await audio.play();
                return;
            } catch {
                setPreviewLoading(false);
                // Fall through to browser TTS
            }
        }

        if (!('speechSynthesis' in window)) return;
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(previewWord);
        u.rate = ttsRate;
        u.lang = dialect === 'en-GB' ? 'en-GB' : 'en-US';
        if (ttsVoice) {
            const v = speechSynthesis.getVoices().find(v => v.voiceURI === ttsVoice);
            if (v) u.voice = v;
        }
        speechSynthesis.speak(u);
    };

    // Filter cloud voices by dialect
    const dialectCloudVoices = voicesForDialect(dialect);
    // Show all cloud voices but group by dialect
    const allCloudVoicesSorted = [...CLOUD_VOICES].sort((a, b) => {
        // Current dialect first
        const dPref = dialect === 'en-GB' ? 'en-GB' : 'en-US';
        if (a.langCode === dPref && b.langCode !== dPref) return -1;
        if (b.langCode === dPref && a.langCode !== dPref) return 1;
        return a.label.localeCompare(b.label);
    });

    return (
        <ModalShell onClose={onClose}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg ui font-bold text-[var(--color-chalk)]">Settings</h3>
                    <button onClick={onClose} className="text-sm ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60">
                        Close
                    </button>
                </div>

                {/* Dialect */}
                <section className="mb-5">
                    <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Spelling Dialect</h4>
                    <div className="flex gap-2">
                        {([['en-US', 'US English', 'color, center'], ['en-GB', 'UK English', 'colour, centre']] as const).map(([d, label, examples]) => (
                            <button
                                key={d}
                                onClick={() => onDialectChange(d)}
                                className={`flex-1 px-3 py-2.5 rounded-xl border transition-colors text-left ${
                                    dialect === d
                                        ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                                        : 'border-[rgb(var(--color-fg))]/10 hover:border-[rgb(var(--color-fg))]/25'
                                }`}
                            >
                                <div className={`text-sm ui font-medium ${dialect === d ? 'text-[var(--color-gold)]' : 'text-[var(--color-chalk)]'}`}>{label}</div>
                                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mt-0.5">{examples}</div>
                            </button>
                        ))}
                    </div>
                </section>

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

                {/* Voice Engine Toggle */}
                <section className="mb-5">
                    <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Voice Engine</h4>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleEngineChange('browser')}
                            className={`flex-1 px-3 py-2.5 rounded-xl border transition-colors text-center text-sm ui ${
                                ttsEngine === 'browser'
                                    ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]'
                                    : 'border-[rgb(var(--color-fg))]/10 text-[var(--color-chalk)] hover:border-[rgb(var(--color-fg))]/25'
                            }`}
                        >
                            Browser
                        </button>
                        <button
                            onClick={() => handleEngineChange('cloud')}
                            className={`flex-1 px-3 py-2.5 rounded-xl border transition-colors text-center text-sm ui ${
                                ttsEngine === 'cloud'
                                    ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]'
                                    : 'border-[rgb(var(--color-fg))]/10 text-[var(--color-chalk)] hover:border-[rgb(var(--color-fg))]/25'
                            }`}
                        >
                            Neural2
                        </button>
                    </div>
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

                {/* Cloud Voice Picker (when engine=cloud) */}
                {ttsEngine === 'cloud' && (
                    <section className="mb-5">
                        <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Neural2 Voice</h4>
                        <select
                            value={ttsCloudVoice || (dialectCloudVoices[0]?.id ?? '')}
                            onChange={e => handleCloudVoiceChange(e.target.value)}
                            className="w-full bg-transparent border border-[rgb(var(--color-fg))]/15 rounded-xl px-3 py-2 text-sm ui text-[var(--color-chalk)] focus:outline-none focus:border-[var(--color-gold)]/40"
                        >
                            {allCloudVoicesSorted.map(v => (
                                <option key={v.id} value={v.id} className="bg-[#1a1a2e] text-white">
                                    {v.label}
                                </option>
                            ))}
                        </select>
                    </section>
                )}

                {/* Browser Voice Picker (when engine=browser) */}
                {ttsEngine === 'browser' && 'speechSynthesis' in globalThis && voices.length > 0 && (
                    <section className="mb-5">
                        <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Browser Voice</h4>
                        <select
                            value={ttsVoice}
                            onChange={e => handleVoiceChange(e.target.value)}
                            className="w-full bg-transparent border border-[rgb(var(--color-fg))]/15 rounded-xl px-3 py-2 text-sm ui text-[var(--color-chalk)] focus:outline-none focus:border-[var(--color-gold)]/40"
                        >
                            <option value="" className="bg-[#1a1a2e] text-white">Auto (best available)</option>
                            {voices.map(v => (
                                <option key={v.voiceURI} value={v.voiceURI} className="bg-[#1a1a2e] text-white">
                                    {v.name} {v.localService ? '(local)' : ''}
                                </option>
                            ))}
                        </select>
                    </section>
                )}

                {/* Preview */}
                <button
                    onClick={previewTTS}
                    disabled={previewLoading}
                    className="w-full py-2.5 mb-5 rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/15 transition-colors disabled:opacity-50"
                >
                    {previewLoading ? 'Loading...' : '🔊 Preview Voice'}
                </button>

                {/* Offline Word Packs */}
                <OfflinePacksSection />
        </ModalShell>
    );
});
