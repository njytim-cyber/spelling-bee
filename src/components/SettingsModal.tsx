/**
 * components/SettingsModal.tsx
 *
 * App settings: dialect, TTS voice/speed, theme toggle.
 */
import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STORAGE_KEYS } from '../config';
import { ModalShell } from './ModalShell';
import { FullScreenPanel } from './FullScreenPanel';
import { useReducedMotion, type MotionPreference } from '../hooks/useReducedMotion';
import type { Dialect } from '../domains/spelling/words/types';
import { CLOUD_VOICES, synthesizeCloud, getCloudVoiceGender } from '../services/cloudTts';
import { getThemeName, type SeasonalTheme } from '../utils/seasonalThemes';
import { CHARACTER_STYLES, type CharacterStyle } from '../utils/characterStyles';
import type { Level } from '../domains/spelling/spellingCategories';
import { IconClose, IconLock, IconBroom, IconTrash } from './Icons';
import { useUser } from '../contexts/UserContext';
import { trackEvent } from '../utils/analytics';

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
    isPremium?: boolean;
    onUpgrade?: () => void;
    themeMode?: 'dark' | 'light';
    onThemeModeChange?: (mode: 'dark' | 'light') => void;
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

function ChampionPassSection({ onUpgrade }: { onUpgrade?: () => void }) {
    const { isPremium, isTrial, isPaidSubscriber, daysRemaining, subscriptionStatus, dialect } = useUser();
    const [portalLoading, setPortalLoading] = useState(false);

    const handleManage = async () => {
        if (isPaidSubscriber) {
            setPortalLoading(true);
            try {
                const { openCustomerPortal } = await import('../services/stripe');
                const url = await openCustomerPortal();
                window.location.href = url;
            } catch {
                // Fallback to UpgradeModal
                onUpgrade?.();
                setPortalLoading(false);
            }
        } else {
            onUpgrade?.();
        }
    };

    return (
        <section className="mb-5">
            <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Champion Pass</h4>
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/10">
                <div>
                    {isPremium ? (
                        <>
                            <span className="text-sm ui text-[var(--color-gold)] font-semibold">
                                🏆 {isTrial ? 'Trial' : subscriptionStatus === 'canceled' ? (dialect === 'en-GB' ? 'Cancelling' : 'Canceling') : 'Active'}
                            </span>
                            <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40 ml-2">
                                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                            </span>
                        </>
                    ) : (
                        <span className="text-sm ui text-[rgb(var(--color-fg))]/50">
                            Free Plan
                        </span>
                    )}
                </div>
                <button
                    onClick={handleManage}
                    disabled={portalLoading}
                    className="text-xs ui text-[var(--color-gold)] hover:underline disabled:opacity-50"
                >
                    {portalLoading ? 'Opening...' : isPremium ? 'Manage' : 'Upgrade'}
                </button>
            </div>
        </section>
    );
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
    isPremium = false,
    onUpgrade,
    themeMode,
    onThemeModeChange,
}: Props) {
    const { preference: motionPref, setPreference: setMotionPref } = useReducedMotion();
    const [ttsRate, setTtsRate] = useState(getStoredRate);
    const [ttsCloudVoice, setTtsCloudVoice] = useState(getStoredCloudVoice);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | null>(null);

    // Wrap onDialectChange to also re-sync displayed voice
    const handleDialectChange = useCallback((d: Dialect) => {
        onDialectChange(d);
        // After App.tsx runs syncVoiceToDialect, re-read the stored voice
        // Use setTimeout(0) so the localStorage write completes first
        setTimeout(() => setTtsCloudVoice(getStoredCloudVoice()), 0);
    }, [onDialectChange]);

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
        <>
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
                                onClick={() => handleDialectChange(d)}
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

                {/* Theme mode (dark / light) */}
                {onThemeModeChange && themeMode && (
                    <section className="mb-5">
                        <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Appearance</h4>
                        <div className="flex gap-2">
                            {([['dark', 'Dark'], ['light', 'Light']] as const).map(([mode, label]) => (
                                <button
                                    key={mode}
                                    onClick={() => onThemeModeChange(mode)}
                                    className={`flex-1 px-3 py-2.5 rounded-xl border transition-colors text-center text-sm ui ${
                                        themeMode === mode
                                            ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]'
                                            : 'border-[rgb(var(--color-fg))]/10 text-[var(--color-chalk)] hover:border-[rgb(var(--color-fg))]/25'
                                    }`}
                                >
                                    {mode === 'dark' ? '🌙 ' : '☀️ '}{label}
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* Level — slider with premium lock */}
                {onLevelChange && (() => {
                    const currentNum = parseInt(String(level).replace('level-', ''), 10) || 1;
                    const maxFree = 3;
                    return (
                        <section className="mb-5">
                            <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">
                                Level: <span className="text-[var(--color-gold)]">{currentNum}</span>
                            </h4>
                            <div className="relative">
                                <input
                                    type="range"
                                    min="1"
                                    max={isPremium ? 10 : maxFree}
                                    step="1"
                                    value={currentNum}
                                    onChange={e => {
                                        const n = parseInt(e.target.value, 10);
                                        onLevelChange(`level-${n}` as Level);
                                    }}
                                    className="w-full accent-[var(--color-gold)]"
                                />
                                {!isPremium && (
                                    <button
                                        onClick={() => { trackEvent('level_gated', { level: 'slider' }); onUpgrade?.(); }}
                                        className="mt-1.5 w-full text-[10px] ui text-[var(--color-gold)]/50 hover:text-[var(--color-gold)] transition-colors"
                                    >
                                        Unlock levels 4–10 with Champion Pass
                                    </button>
                                )}
                                <div className="flex justify-between text-[10px] ui text-[rgb(var(--color-fg))]/25 mt-0.5">
                                    <span>1</span>
                                    {!isPremium && (
                                        <span className="flex items-center gap-0.5 text-[rgb(var(--color-fg))]/25">
                                            <IconLock className="w-2.5 h-2.5" />
                                            4–10
                                        </span>
                                    )}
                                    <span>10</span>
                                </div>
                            </div>
                        </section>
                    );
                })()}

                {/* Champion Pass Status */}
                <ChampionPassSection onUpgrade={onUpgrade} />

                {/* Bee Sim Preferences */}
                {(onSeasonalThemeChange || onCharacterStyleChange) && (
                    <>
                        <div className="border-t border-[rgb(var(--color-fg))]/10 my-5 pt-5">
                            <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-3">{dialect === 'en-GB' ? 'Spelling Bee Customisation' : 'Spelling Bee Customization'}</h4>
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
                                            {getThemeName(theme, dialect)}
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
                    <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Motion & Animations</h4>
                    <div className="flex flex-col gap-1.5">
                        {([['system', 'System default', 'Follows your device settings'], ['always', 'Reduced', 'Minimal animations'], ['never', 'Full', 'All animations enabled']] as const).map(([val, label, desc]) => (
                            <button
                                key={val}
                                onClick={() => setMotionPref(val as MotionPreference)}
                                className={`px-3 py-2 rounded-xl border text-left transition-colors ${
                                    motionPref === val
                                        ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                                        : 'border-[rgb(var(--color-fg))]/10 hover:border-[rgb(var(--color-fg))]/25'
                                }`}
                            >
                                <div className={`text-sm ui font-medium ${motionPref === val ? 'text-[var(--color-gold)]' : 'text-[var(--color-chalk)]'}`}>{label}</div>
                                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30">{desc}</div>
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
                                <span className="truncate">{v.label}</span>
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

                {/* Notifications */}
                <NotificationPreferences />

                {/* Danger Zone */}
                <DangerZone />

                {/* Legal */}
                <section className="pt-4 border-t border-[rgb(var(--color-fg))]/10">
                    <div className="flex justify-center gap-4 mb-2">
                        <button onClick={() => setLegalPage('privacy')} className="text-[11px] ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/60 transition-colors">Privacy Policy</button>
                        <button onClick={() => setLegalPage('terms')} className="text-[11px] ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/60 transition-colors">Terms of Service</button>
                    </div>
                    <div className="text-center text-[9px] ui text-[rgb(var(--color-fg))]/15">
                        v1.1.0
                    </div>
                </section>
        </ModalShell>

        {/* In-app legal panels */}
        <AnimatePresence>
            {legalPage === 'privacy' && (
                <FullScreenPanel title="Privacy Policy" onClose={() => setLegalPage(null)}>
                    <LegalPrivacy />
                </FullScreenPanel>
            )}
            {legalPage === 'terms' && (
                <FullScreenPanel title="Terms of Service" onClose={() => setLegalPage(null)}>
                    <LegalTerms />
                </FullScreenPanel>
            )}
        </AnimatePresence>
        </>
    );
});

/* ─── Notification toggle section ─── */

type NotifPrefs = { enabled: boolean; daily: boolean; streak: boolean; reviews: boolean; achievement: boolean; challenge: boolean; tournament: boolean };
const NOTIF_DEFAULTS: NotifPrefs = { enabled: false, daily: true, streak: true, reviews: true, achievement: true, challenge: true, tournament: true };
const NOTIF_TYPES = [
    { key: 'daily' as const, label: 'Daily practice reminder' },
    { key: 'streak' as const, label: 'Streak at risk' },
    { key: 'reviews' as const, label: 'Reviews due' },
    { key: 'achievement' as const, label: 'Achievement unlocked' },
    { key: 'challenge' as const, label: 'Challenge received' },
    { key: 'tournament' as const, label: 'Tournament starting' },
];

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
    return (
        <button role="switch" aria-checked={on} onClick={onToggle} className="flex items-center justify-between w-full py-2">
            <span className="text-xs ui text-[rgb(var(--color-fg))]/60">{label}</span>
            <div className={`relative w-9 h-5 rounded-full transition-colors ${on ? 'bg-[var(--color-correct)]' : 'bg-[rgb(var(--color-fg))]/15'}`}>
                <motion.div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                    animate={{ left: on ? 18 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            </div>
        </button>
    );
}

function NotificationPreferences() {
    const stored = localStorage.getItem(STORAGE_KEYS.notificationPrefs);
    const prefs: NotifPrefs = stored ? { ...NOTIF_DEFAULTS, ...JSON.parse(stored) } : NOTIF_DEFAULTS;
    const save = (p: NotifPrefs) => localStorage.setItem(STORAGE_KEYS.notificationPrefs, JSON.stringify(p));

    return (
        <section className="mb-5 pt-4 border-t border-[rgb(var(--color-fg))]/10">
            <h4 className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase mb-2">Notifications</h4>
            <div className="bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8 rounded-xl px-4 py-2">
                <Toggle
                    on={prefs.enabled}
                    onToggle={() => { const next = { ...prefs, enabled: !prefs.enabled }; save(next); }}
                    label="Enable notifications"
                />
                {prefs.enabled && (
                    <div className="border-t border-[rgb(var(--color-fg))]/5 mt-1 pt-1">
                        {NOTIF_TYPES.map(t => (
                            <Toggle
                                key={t.key}
                                on={prefs[t.key]}
                                onToggle={() => { const next = { ...prefs, [t.key]: !prefs[t.key] }; save(next); }}
                                label={t.label}
                            />
                        ))}
                    </div>
                )}
            </div>
            <div className="text-[9px] ui text-[rgb(var(--color-fg))]/20 text-center mt-2">
                Saved locally — push notifications require app install
            </div>
        </section>
    );
}

/* ─── Danger Zone: Reset Stats + Delete Account ─── */

const RESET_PROMPTS = [
    (xp: number) => `You've earned ${xp.toLocaleString()} points! Are you sure you want to start fresh?`,
    (_xp: number, streak: number) => `Bee Buddy will miss your ${streak}-streak record! Reset anyway?`,
    (_xp: number, _streak: number, solved: number) => `${solved} words spelled and counting… wipe it all?`,
    () => 'A fresh start can be beautiful! Ready to begin again?',
    () => 'Your spelling journey so far has been amazing! Really reset?',
    () => 'Even superheroes get a fresh origin story! Reset?',
];

function DangerZone() {
    const { stats, resetStats, deleteAccount } = useUser();
    const [resetConfirm, setResetConfirm] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleteTyped, setDeleteTyped] = useState('');
    const [deleting, setDeleting] = useState(false);

    return (
        <section className="mb-5 pt-4 border-t border-[var(--color-wrong)]/20">
            <h4 className="text-xs ui text-[var(--color-wrong)]/70 uppercase mb-2">Danger Zone</h4>
            <div className="flex flex-col gap-2">
                {/* Reset stats button */}
                <button
                    onClick={() => {
                        const fn = RESET_PROMPTS[Math.floor(Math.random() * RESET_PROMPTS.length)];
                        setResetConfirm(fn(stats.totalXP, stats.bestStreak, stats.totalSolved));
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/10 text-sm ui text-[rgb(var(--color-fg))]/40 hover:border-[var(--color-streak-fire)]/30 hover:text-[var(--color-streak-fire)]/60 transition-colors text-left"
                >
                    Reset Stats
                </button>

                {/* Delete account button */}
                <button
                    onClick={() => { setDeleteConfirm(true); setDeleteTyped(''); }}
                    className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/10 text-sm ui text-[rgb(var(--color-fg))]/40 hover:border-[var(--color-wrong)]/30 hover:text-[var(--color-wrong)]/60 transition-colors text-left"
                >
                    Delete Account
                </button>
            </div>

            {/* Reset confirmation modal */}
            <AnimatePresence>
                {resetConfirm && (
                    <ModalShell onClose={() => setResetConfirm(null)} ariaLabel="Reset stats confirmation" className="w-[min(280px,90vw)] text-center">
                        <div className="mb-3 flex justify-center text-[var(--color-streak-fire)]">
                            <IconBroom className="w-10 h-10" />
                        </div>
                        <p className="ui text-[rgb(var(--color-fg))]/80 text-base leading-relaxed mb-6">
                            {resetConfirm}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setResetConfirm(null)}
                                className="flex-1 py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/15 text-sm ui text-[rgb(var(--color-fg))]/50 hover:text-[rgb(var(--color-fg))]/70 hover:border-[rgb(var(--color-fg))]/30 transition-colors"
                            >
                                cancel
                            </button>
                            <button
                                onClick={() => { resetStats(); setResetConfirm(null); }}
                                className="flex-1 py-2.5 rounded-xl border border-[var(--color-streak-fire)]/40 bg-[var(--color-streak-fire)]/10 text-sm ui text-[var(--color-streak-fire)] hover:bg-[var(--color-streak-fire)]/20 transition-colors"
                            >
                                reset
                            </button>
                        </div>
                    </ModalShell>
                )}
            </AnimatePresence>

            {/* Delete account confirmation modal — type to confirm */}
            <AnimatePresence>
                {deleteConfirm && (
                    <ModalShell onClose={() => !deleting && setDeleteConfirm(false)} ariaLabel="Delete account confirmation" className="w-[min(300px,90vw)] text-center">
                        <div className="mb-3 flex justify-center text-[var(--color-wrong)]">
                            <IconTrash className="w-10 h-10" />
                        </div>
                        <p className="ui text-[rgb(var(--color-fg))]/80 text-base font-semibold mb-2">
                            Delete your account?
                        </p>
                        <p className="ui text-[rgb(var(--color-fg))]/50 text-xs leading-relaxed mb-4">
                            This permanently removes all your data including scores, achievements, word history, and leaderboard entries. This cannot be undone.
                        </p>
                        <p className="ui text-[rgb(var(--color-fg))]/60 text-xs mb-2">
                            Type <span className="font-bold text-[var(--color-wrong)]">delete my account</span> to confirm:
                        </p>
                        <input
                            type="text"
                            value={deleteTyped}
                            onChange={e => setDeleteTyped(e.target.value)}
                            placeholder="delete my account"
                            disabled={deleting}
                            className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/15 text-sm ui text-[rgb(var(--color-fg))] placeholder:text-[rgb(var(--color-fg))]/20 outline-none focus:border-[var(--color-wrong)]/40 transition-colors mb-4 text-center"
                            autoComplete="off"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(false)}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/15 text-sm ui text-[rgb(var(--color-fg))]/50 hover:text-[rgb(var(--color-fg))]/70 hover:border-[rgb(var(--color-fg))]/30 transition-colors disabled:opacity-50"
                            >
                                cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setDeleting(true);
                                    try {
                                        await deleteAccount();
                                    } catch (err) {
                                        console.warn('Delete account failed:', err);
                                    } finally {
                                        setDeleting(false);
                                        setDeleteConfirm(false);
                                    }
                                }}
                                disabled={deleting || deleteTyped.trim().toLowerCase() !== 'delete my account'}
                                className="flex-1 py-2.5 rounded-xl border border-[var(--color-wrong)]/40 bg-[var(--color-wrong)]/10 text-sm ui text-[var(--color-wrong)] hover:bg-[var(--color-wrong)]/20 transition-colors disabled:opacity-30 disabled:hover:bg-[var(--color-wrong)]/10"
                            >
                                {deleting ? 'deleting...' : 'delete forever'}
                            </button>
                        </div>
                    </ModalShell>
                )}
            </AnimatePresence>
        </section>
    );
}

/* ─── Legal Content (rendered in-app via FullScreenPanel) ─── */

const legalHeading = 'text-base ui font-semibold text-[var(--color-gold)] mt-6 mb-2';
const legalP = 'text-sm ui text-[rgb(var(--color-fg))]/70 leading-relaxed mb-3';
const legalLi = 'text-sm ui text-[rgb(var(--color-fg))]/70 leading-relaxed mb-1.5';
const legalLink = 'text-[var(--color-gold)] hover:underline';

function LegalPrivacy() {
    return (
        <div className="pb-8">
            <p className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-4">Effective: March 7, 2026</p>
            <p className={legalP}>Spelling Bee (&quot;the App&quot;) is a free educational spelling game. We take your privacy seriously and collect only the minimum data needed to provide the service.</p>
            <h4 className={legalHeading}>1. Data We Collect</h4>
            <p className={legalP}><strong>Account Information:</strong> When you sign in (optionally), we store your Firebase User ID, display name, and email address. Anonymous accounts are created automatically and do not require personal information.</p>
            <p className={legalP}><strong>Game Data:</strong> Scores, streaks, accuracy, achievements, word history (spaced repetition progress), session results, and preferences (theme, voice settings, dialect).</p>
            <p className={legalP}><strong>Usage Analytics:</strong> We use Firebase Analytics (Google Analytics 4) to understand how the App is used. This includes anonymous usage events (screens visited, sessions completed, features used), retention metrics, and device/browser type. Analytics data is linked to your Firebase User ID to measure engagement over time but is not shared with advertisers or third parties. You can opt out by using the app offline without signing in.</p>
            <p className={legalP}><strong>Performance Data:</strong> Core Web Vitals (page load speed, interactivity metrics) and error reports (error messages, browser type) to improve app quality. These do not include personal information.</p>
            <h4 className={legalHeading}>2. How We Use Your Data</h4>
            <ul className="list-disc pl-5 mb-3">
                <li className={legalLi}>To save and sync your progress across devices</li>
                <li className={legalLi}>To display leaderboards (display name and score only)</li>
                <li className={legalLi}>To improve app performance and fix bugs</li>
                <li className={legalLi}>To provide text-to-speech pronunciation (text is sent to Google Cloud TTS)</li>
            </ul>
            <h4 className={legalHeading}>3. Data Storage</h4>
            <p className={legalP}>Data is stored locally on your device (localStorage/IndexedDB) and synced to Google Firebase (Firestore) when online. Firebase is hosted on Google Cloud infrastructure with SOC2 certification. Data is encrypted in transit (HTTPS/TLS) and at rest.</p>
            <h4 className={legalHeading}>4. Third-Party Services</h4>
            <ul className="list-disc pl-5 mb-3">
                <li className={legalLi}><strong>Google Firebase:</strong> Authentication, database, hosting, and analytics</li>
                <li className={legalLi}><strong>Google Cloud Text-to-Speech:</strong> Word pronunciation (text only, no personal data)</li>
                <li className={legalLi}><strong>Google Fonts:</strong> Font delivery (your IP address is visible to Google)</li>
            </ul>
            <p className={legalP}>We do not use advertising networks or sell data to third parties. Analytics data is used solely to improve the App.</p>
            <h4 className={legalHeading}>5. Children&apos;s Privacy</h4>
            <p className={legalP}>Spelling Bee is designed for learners of all ages. We do not knowingly collect personal information from children under 13 beyond what is described above. The App does not require personal information to use — anonymous accounts work fully. Parents may contact us to request deletion of their child&apos;s data.</p>
            <h4 className={legalHeading}>6. Your Rights</h4>
            <p className={legalP}>You have the right to:</p>
            <ul className="list-disc pl-5 mb-3">
                <li className={legalLi}><strong>Access</strong> your data (available in Settings)</li>
                <li className={legalLi}><strong>Delete</strong> your account and all associated data (available in Settings)</li>
                <li className={legalLi}><strong>Opt out</strong> of cloud sync by using the app without signing in</li>
            </ul>
            <h4 className={legalHeading}>7. Data Retention</h4>
            <p className={legalP}>Game data is retained as long as your account exists. When you delete your account, all associated data is permanently removed within 30 days. Error reports and performance metrics are automatically purged after 90 days.</p>
            <h4 className={legalHeading}>8. International Users (PDPA, GDPR)</h4>
            <p className={legalP}>If you are located in a jurisdiction with data protection laws (such as the PDPA in Thailand, GDPR in the EU, or similar regulations), you have the right to access, correct, delete, and port your personal data. You may also withdraw consent for data processing at any time by deleting your account in Settings. We process data on the legal basis of legitimate interest (providing the service) and consent (optional sign-in and cloud sync). Data is stored on Google Cloud infrastructure with servers in the United States. By using the App, you consent to the transfer of data to the US, where it is protected under Google&apos;s data processing terms.</p>
            <h4 className={legalHeading}>9. Changes to This Policy</h4>
            <p className={legalP}>We may update this policy from time to time. Changes will be posted on this page with an updated effective date.</p>
            <h4 className={legalHeading}>10. Contact</h4>
            <p className={legalP}>For privacy inquiries or data deletion requests, contact us at: <a href="mailto:privacy@spellingbee.app" className={legalLink}>privacy@spellingbee.app</a></p>
        </div>
    );
}

function LegalTerms() {
    return (
        <div className="pb-8">
            <p className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-4">Effective: March 4, 2026</p>
            <p className={legalP}>By using Spelling Bee (&quot;the App&quot;), you agree to the following terms.</p>
            <h4 className={legalHeading}>1. Description of Service</h4>
            <p className={legalP}>Spelling Bee is a free educational spelling game available as a Progressive Web App. The service is provided &quot;as is&quot; without warranties of any kind.</p>
            <h4 className={legalHeading}>2. User Accounts</h4>
            <p className={legalP}>You may use the App anonymously or sign in with Google or email. You are responsible for maintaining the security of your account. Display names must not contain offensive, misleading, or inappropriate content.</p>
            <h4 className={legalHeading}>3. Acceptable Use</h4>
            <p className={legalP}>You agree not to:</p>
            <ul className="list-disc pl-5 mb-3">
                <li className={legalLi}>Manipulate scores, leaderboards, or game data through automated means</li>
                <li className={legalLi}>Attempt to access other users&apos; data or accounts</li>
                <li className={legalLi}>Use the App to harass other users (e.g., abusive ping messages)</li>
                <li className={legalLi}>Reverse-engineer, decompile, or exploit the App&apos;s infrastructure</li>
            </ul>
            <h4 className={legalHeading}>4. Intellectual Property</h4>
            <p className={legalP}>Word definitions and example sentences are sourced from Wiktionary (CC BY-SA) and WordNet 3.1 (Princeton License). The App&apos;s code, design, and branding are proprietary. You may not copy, modify, or distribute the App without permission.</p>
            <h4 className={legalHeading}>5. Limitation of Liability</h4>
            <p className={legalP}>The App is provided for educational purposes. We are not liable for any loss of data, progress, or scores due to technical issues. We make no guarantee of continuous availability.</p>
            <h4 className={legalHeading}>6. Account Termination</h4>
            <p className={legalP}>We may suspend or terminate accounts that violate these terms. You may delete your account at any time through Settings, which permanently removes all associated data.</p>
            <h4 className={legalHeading}>7. Changes to Terms</h4>
            <p className={legalP}>We may update these terms from time to time. Continued use of the App after changes constitutes acceptance of the new terms.</p>
            <h4 className={legalHeading}>8. Contact</h4>
            <p className={legalP}>Questions about these terms? Contact us at: <a href="mailto:support@spellingbee.app" className={legalLink}>support@spellingbee.app</a></p>
        </div>
    );
}
