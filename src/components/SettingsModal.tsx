/**
 * components/SettingsModal.tsx
 *
 * App settings: dialect, TTS voice/speed, theme toggle.
 */
import { memo, useState } from 'react';
import { STORAGE_KEYS } from '../config';
import { ModalShell } from './ModalShell';
import { useReducedMotion, type MotionPreference } from '../hooks/useReducedMotion';
import type { Dialect } from '../domains/spelling/words/types';
import { CLOUD_VOICES, synthesizeCloud, getCloudVoiceGender } from '../services/cloudTts';
import { getThemeName, type SeasonalTheme } from '../utils/seasonalThemes';
import { CHARACTER_STYLES, type CharacterStyle } from '../utils/characterStyles';
import { LEVELS, type Level } from '../domains/spelling/spellingCategories';
import { IconClose } from './Icons';

interface Props {
    dialect: string;
    onDialectChange: (d: Dialect) => void;
    onClose: () => void;
    level?: string;
    onLevelChange?: (l: Level) => void;
    seasonalTheme?: SeasonalTheme;
    onSeasonalThemeChange?: (theme: SeasonalTheme) => void;
    characterStyle?: CharacterStyle;
    onCharacterStyleChange?: (style: CharacterStyle) => void;
}

function getStoredRate(): number {
    const v = localStorage.getItem(STORAGE_KEYS.ttsRate);
    return v ? parseFloat(v) : 1.0;
}

function getStoredCloudVoice(): string {
    const stored = localStorage.getItem(STORAGE_KEYS.ttsCloudVoice);
    if (stored) return stored;
    // Default to US Voice C (Female) if none set
    const defaultVoice = 'en-US-Neural2-C';
    localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, defaultVoice);
    localStorage.setItem(STORAGE_KEYS.ttsEngine, 'cloud');
    return defaultVoice;
}

export const SettingsModal = memo(function SettingsModal({
    dialect,
    onDialectChange,
    onClose,
    level,
    onLevelChange,
    seasonalTheme = 'auto',
    onSeasonalThemeChange,
    characterStyle = 'classic',
    onCharacterStyleChange,
}: Props) {
    const { preference: motionPref, setPreference: setMotionPref } = useReducedMotion();
    const [ttsRate, setTtsRate] = useState(getStoredRate);
    const [ttsCloudVoice, setTtsCloudVoice] = useState(getStoredCloudVoice);
    const [previewLoading, setPreviewLoading] = useState(false);

    const handleRateChange = (rate: number) => {
        setTtsRate(rate);
        localStorage.setItem(STORAGE_KEYS.ttsRate, String(rate));
    };

    const handleCloudVoiceChange = (voiceId: string) => {
        setTtsCloudVoice(voiceId);
        localStorage.setItem(STORAGE_KEYS.ttsCloudVoice, voiceId);
        // Always use cloud engine
        localStorage.setItem(STORAGE_KEYS.ttsEngine, 'cloud');
        // Auto-preview
        previewVoice(voiceId);
    };

    const [previewError, setPreviewError] = useState(false);

    const previewVoice = async (voiceId: string) => {
        const previewWord = dialect === 'en-GB' ? 'colour' : 'color';
        setPreviewLoading(true);
        setPreviewError(false);

        try {
            const url = await synthesizeCloud(previewWord, voiceId, ttsRate);
            const audio = new Audio(url);
            audio.onended = () => setPreviewLoading(false);
            audio.onerror = () => {
                setPreviewLoading(false);
                setPreviewError(true);
            };
            await audio.play();
        } catch {
            setPreviewLoading(false);
            // Fallback to browser TTS with gender-matched voice
            if ('speechSynthesis' in window) {
                const wantMale = getCloudVoiceGender(voiceId) === 'male';
                const voices = speechSynthesis.getVoices();
                const langPref = dialect === 'en-GB' ? 'en-GB' : 'en-US';
                const byLang = voices.filter(v => v.lang === langPref);
                const genderMatch = (v: SpeechSynthesisVoice) => {
                    const n = v.name.toLowerCase();
                    if (wantMale) return n.includes('male') || n.includes('david') || n.includes('mark') || n.includes('james');
                    return n.includes('female') || n.includes('zira') || n.includes('eva') || n.includes('clara');
                };
                const voice = byLang.find(v => genderMatch(v)) ?? byLang[0] ?? null;

                speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(previewWord);
                u.rate = ttsRate;
                u.lang = langPref;
                if (voice) u.voice = voice;
                speechSynthesis.speak(u);
            } else {
                setPreviewError(true);
            }
        }
    };

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
                    <button onClick={onClose} className="opacity-40 hover:opacity-70 transition-opacity" aria-label="Close settings">
                        <IconClose className="w-5 h-5" />
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

                {/* Level */}
                {onLevelChange && (
                    <section className="mb-5">
                        <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Level</h4>
                        <div className="grid grid-cols-2 gap-1.5">
                            {LEVELS.map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => onLevelChange(g.id)}
                                    className={`px-3 py-2 rounded-xl border transition-colors text-center text-sm ui ${
                                        level === g.id
                                            ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]'
                                            : 'border-[rgb(var(--color-fg))]/10 text-[var(--color-chalk)] hover:border-[rgb(var(--color-fg))]/25'
                                    }`}
                                >
                                    <span className="font-medium">{g.label}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* Bee Sim Preferences */}
                {(onSeasonalThemeChange || onCharacterStyleChange) && (
                    <>
                        <div className="border-t border-[rgb(var(--color-fg))]/10 my-5 pt-5">
                            <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-3">Spelling Bee Customization</h4>
                        </div>

                        {/* Seasonal Theme */}
                        {onSeasonalThemeChange && (
                            <section className="mb-5">
                                <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Classroom Decorations</h4>
                                <div className="flex flex-col gap-1.5">
                                    {(['auto', 'none', 'halloween', 'winter', 'spring', 'summer', 'fall'] as SeasonalTheme[]).map(theme => (
                                        <button
                                            key={theme}
                                            onClick={() => onSeasonalThemeChange(theme)}
                                            className={`px-3 py-2 rounded-xl border transition-colors text-left text-sm ui ${
                                                seasonalTheme === theme
                                                    ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]'
                                                    : 'border-[rgb(var(--color-fg))]/10 text-[var(--color-chalk)] hover:border-[rgb(var(--color-fg))]/25'
                                            }`}
                                        >
                                            {getThemeName(theme)}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Character Style */}
                        {onCharacterStyleChange && (
                            <section className="mb-5">
                                <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Your Character Style</h4>
                                <div className="flex flex-col gap-1.5">
                                    {CHARACTER_STYLES.map(style => (
                                        <button
                                            key={style.id}
                                            onClick={() => onCharacterStyleChange(style.id)}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors text-left ${
                                                characterStyle === style.id
                                                    ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                                                    : 'border-[rgb(var(--color-fg))]/10 hover:border-[rgb(var(--color-fg))]/25'
                                            }`}
                                        >
                                            <span className="text-lg">{style.emoji}</span>
                                            <div className="flex-1">
                                                <div className={`text-sm ui font-medium ${characterStyle === style.id ? 'text-[var(--color-gold)]' : 'text-[var(--color-chalk)]'}`}>
                                                    {style.name}
                                                </div>
                                                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30">{style.description}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}

                {/* Motion */}
                <section className="mb-5">
                    <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Motion</h4>
                    <div className="flex gap-2">
                        {([['system', 'System'], ['always', 'Reduce'], ['never', 'Full']] as const).map(([val, label]) => (
                            <button
                                key={val}
                                onClick={() => setMotionPref(val as MotionPreference)}
                                className={`flex-1 px-3 py-2 rounded-xl border text-sm ui transition-colors ${
                                    motionPref === val
                                        ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]'
                                        : 'border-[rgb(var(--color-fg))]/10 text-[var(--color-chalk)] hover:border-[rgb(var(--color-fg))]/25'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
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

                {/* Voice Selection - tappable list with auto-preview */}
                <section className="mb-5">
                    <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Voice</h4>
                    <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
                        {allCloudVoicesSorted.map(v => (
                            <button
                                key={v.id}
                                onClick={() => handleCloudVoiceChange(v.id)}
                                disabled={previewLoading}
                                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-colors text-left text-sm ui ${
                                    ttsCloudVoice === v.id
                                        ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]'
                                        : 'border-[rgb(var(--color-fg))]/10 text-[var(--color-chalk)] hover:border-[rgb(var(--color-fg))]/25 disabled:opacity-50'
                                }`}
                            >
                                <span>{v.label}</span>
                                {previewLoading && ttsCloudVoice === v.id && (
                                    <span className="text-[10px] text-[rgb(var(--color-fg))]/40">Playing...</span>
                                )}
                            </button>
                        ))}
                    </div>
                    {previewError && (
                        <p className="text-[10px] ui text-[var(--color-wrong)] mt-1.5">
                            Preview unavailable — voice will work during play
                        </p>
                    )}
                </section>

                {/* Legal */}
                <section className="pt-4 border-t border-[rgb(var(--color-fg))]/10 flex justify-center gap-4">
                    <a href="/privacy.html" target="_blank" rel="noopener" className="text-[10px] ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/60 transition-colors">Privacy Policy</a>
                    <a href="/terms.html" target="_blank" rel="noopener" className="text-[10px] ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/60 transition-colors">Terms of Service</a>
                </section>
        </ModalShell>
    );
});
