import { memo, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EVERY_SPELLING_ACHIEVEMENT } from '../domains/spelling/spellingAchievements';
import { AchievementBadge } from './AchievementBadge';
import { CHALK_THEMES } from '../utils/chalkThemes';
import { SWIPE_TRAILS } from '../utils/trails';
import { RANKS, getRank, getMasteryInfo, checkUnlock } from '../utils/ranks';
import { ModalShell } from './ModalShell';
import { STORAGE_KEYS, REFERRAL_MILESTONES } from '../config';
import { IconCheck, IconClose, IconEdit, IconCloud, IconMail, IconTag, IconGift, IconShop, RankIcon } from './Icons';
import { isItemOwned } from '../utils/cosmeticPacks';
import { isLootDropOwned } from '../utils/lootDrop';
import { useUser } from '../contexts/UserContext';
import { getAllWords, getRegistryVersion } from '../domains/spelling/words';
import { AvatarBuilder } from './AvatarBuilder';
import { AvatarSvg } from './AvatarSvg';
import { parseAvatar } from '../utils/avatarParts';
import type { FlairStats } from '../utils/avatarParts';
import { ProfileSwitcher } from './ProfileSwitcher';
import { ParentDashboard } from './ParentDashboard';
import { printCertificate } from '../utils/certificateGenerator';
import { shareBadgeImage } from '../utils/badgeShareGenerator';
import type { CustomWordList } from '../types/customList';
import type { WordRecord } from '../hooks/useWordHistory';
import { getWordMap } from '../domains/spelling/words';
import { ALL_RARITIES, RARITY_CONFIGS, getRarityConfig, type Rarity } from '../utils/rarity';
import { TestimonialPrompt } from './TestimonialPrompt';
import { dateLocale } from '../utils/dateHelpers';

// Removed tab switching - now showing everything on one page

interface Props {
    unlocked: Set<string>;
    masteredCount: number;
    uniqueWordsAttempted: number;
    records?: Record<string, WordRecord>;
    onUpgrade?: () => void;
    onShop?: () => void;
    onCertificate?: (type: 'level-completion', level: number, wordsMastered: number, accuracy: number) => void;
    customLists?: CustomWordList[];
    friendCode?: string;
    friendCount?: number;
    bestBuddyStreak?: number;
    onOpenFriends?: () => void;
}

// Derive achievement sublists from the single spelling array
const CORE_ACHIEVEMENTS = EVERY_SPELLING_ACHIEVEMENT.filter(a => !a.id.startsWith('word-') && !['speed-demon', 'blitz-master', 'lightning', 'time-lord'].includes(a.id));
const TIMED_MODE_ACHIEVEMENTS = EVERY_SPELLING_ACHIEVEMENT.filter(a => ['speed-demon', 'blitz-master', 'lightning', 'time-lord'].includes(a.id));
const MASTERY_ACHIEVEMENTS = EVERY_SPELLING_ACHIEVEMENT.filter(a => a.id.startsWith('word-'));

const achievementSections = [
    { label: '⏱️ timed mode', colorClass: 'text-[var(--color-timed)]', colsClass: 'grid-cols-4', items: TIMED_MODE_ACHIEVEMENTS },
    { label: '📚 word mastery', colorClass: 'text-[var(--color-gold)]', colsClass: 'grid-cols-5', items: MASTERY_ACHIEVEMENTS },
] as const;

export const MePage = memo(function MePage({ unlocked, masteredCount, uniqueWordsAttempted, records, onUpgrade, onShop, onCertificate, customLists = [], friendCode, friendCount = 0, bestBuddyStreak = 0, onOpenFriends }: Props) {
    // Get user state from context
    const {
        stats,
        accuracy,
        syncFailed,
        activeCostume,
        onCostumeChange,
        activeTheme,
        onThemeChange,
        activeTrailId,
        onTrailChange,
        avatarConfig,
        onAvatarChange,
        displayName,
        setDisplayName,
        isAnonymous,
        linkGoogle,
        sendEmailLink,
        updateBadge,
        isPremium,
        daysRemaining,
        referralCode,
        referralCount,
        shareReferral,
        purchasedPacks,
        level,
        // Profiles (Bee Team)
        profiles,
        activeProfileId,
        isParentMode,
        canAddProfile,
        addProfile,
        removeProfile,
        switchProfile,
        customBranding,
        assignList,
        unassignList,
        getAssignedLists,
        dialect,
    } = useUser();

    const activeBadge = stats.activeBadgeId || '';
    const [showRanks, setShowRanks] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(displayName);
    const [showEmailInput, setShowEmailInput] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [showAvatarBuilder, setShowAvatarBuilder] = useState(false);
    const [showAbout, setShowAbout] = useState(false);

    const handleShareBadge = useCallback((achievementName: string, achievementDesc: string) => {
        shareBadgeImage({
            achievementName,
            achievementDesc,
            playerName: displayName || 'Speller',
            date: new Date().toLocaleDateString(dateLocale(), { month: 'long', day: 'numeric', year: 'numeric' }),
            referralCode: referralCode || undefined,
        }).catch(() => { /* silent — share cancelled or failed */ });
    }, [displayName, referralCode]);

    // Memoize expensive rank calculations
    const rankInfo = useMemo(() => getRank(stats.totalXP), [stats.totalXP]);
    const { rank, nextRank, progress } = rankInfo;
    const mastery = useMemo(() =>
        !nextRank ? getMasteryInfo(stats.totalXP) : null,
    [nextRank, stats.totalXP]);

    // Cosmetic unlock counts
    const rankIdx = useMemo(() => RANKS.findIndex(r => r.name === rank.name), [rank.name]);
    const isThemeAvailable = useCallback((t: { id: string; lootDrop?: boolean; premium?: boolean; packItem?: boolean; minLevel?: number; minStreak?: number; minSolved?: number }) => {
        if (t.lootDrop) return isLootDropOwned(t.id);
        const rankUnlocked = checkUnlock(rankIdx, stats.bestStreak, stats.totalSolved, t).available;
        if (t.packItem) return rankUnlocked && isItemOwned(t.id, purchasedPacks);
        if (t.premium) return rankUnlocked && isPremium;
        return rankUnlocked;
    }, [rankIdx, stats.bestStreak, stats.totalSolved, purchasedPacks, isPremium]);
    const unlockedThemes = useMemo(() =>
        CHALK_THEMES.filter(t => isThemeAvailable(t)).length,
    [isThemeAvailable]);
    const unlockedTrails = useMemo(() =>
        SWIPE_TRAILS.filter(t => isThemeAvailable(t)).length,
    [isThemeAvailable]);

    // Flair unlock stats
    const flairStats = useMemo<FlairStats>(() => ({
        dayStreak: stats.dayStreak,
        totalSolved: stats.totalSolved,
        bestStreak: stats.bestStreak,
        sessionsPlayed: stats.sessionsPlayed,
        totalXP: stats.totalXP,
        masteredCount,
        isPremium,
        purchasedPacks,
    }), [stats.dayStreak, stats.totalSolved, stats.bestStreak, stats.sessionsPlayed, stats.totalXP, masteredCount, isPremium, purchasedPacks]);

    // Word bank mastery percentile
    const registryVersion = getRegistryVersion();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registryVersion triggers re-count when tiers load
    const totalWords = useMemo(() => getAllWords().length, [registryVersion]);
    const masteryPercent = useMemo(() => {
        if (totalWords === 0) return '0%';
        const pct = (masteredCount / totalWords) * 100;
        return pct >= 1 ? `${Math.round(pct)}%` : pct > 0 ? `${pct.toFixed(1)}%` : '0%';
    }, [masteredCount, totalWords]);

    // Rarity distribution for collection stats
    const rarityCounts = useMemo(() => {
        const counts: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
        if (!records) return counts;
        const wm = getWordMap();
        for (const r of Object.values(records)) {
            if (r.box >= 4 && (r.typedAttempts ?? 0) >= 1) {
                const sw = wm.get(r.word);
                if (sw) counts[getRarityConfig(sw.difficulty).rarity]++;
            }
        }
        return counts;
    }, [records]);
    const hasCollection = Object.values(rarityCounts).some(c => c > 0);

    return (
        <div className="flex-1 flex flex-col items-center overflow-y-auto px-6 pt-[calc(env(safe-area-inset-top,12px)+48px)] pb-20 landscape-compact-pb">
            {/* Profile switcher (Bee Team only) */}
            {isPremium && profiles.length > 0 && (
                <div className="w-full max-w-sm mb-4">
                    <ProfileSwitcher
                        profiles={profiles}
                        activeProfileId={activeProfileId}
                        canAddProfile={canAddProfile}
                        onSwitch={switchProfile}
                        onAdd={addProfile}
                        onRemove={removeProfile}
                    />
                </div>
            )}

            {/* Parent Dashboard (Bee Team — when in parent mode) */}
            {isPremium && isParentMode && profiles.length > 0 && (
                <ParentDashboard
                    profiles={profiles}
                    onSwitchToProfile={switchProfile}
                    onPrintReport={(profile, pStats) => {
                        printCertificate({
                            type: 'level-completion',
                            playerName: profile.name,
                            date: new Date().toLocaleDateString(dateLocale(), { year: 'numeric', month: 'long', day: 'numeric' }),
                            level: parseInt(profile.level?.replace('level-', '') || '1') || 1,
                            wordsMastered: pStats.totalCorrect,
                            accuracy: pStats.totalSolved > 0 ? Math.round((pStats.totalCorrect / pStats.totalSolved) * 100) : 0,
                            customBranding: customBranding || undefined,
                        });
                    }}
                    customLists={customLists}
                    onAssign={assignList}
                    onUnassign={unassignList}
                    getAssignedLists={getAssignedLists}
                />
            )}

            {/* Display name + edit */}
            <div className="flex items-center gap-2 mb-2">
                {editingName ? (
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (nameInput.trim()) {
                            await setDisplayName(nameInput.trim());
                        }
                        setEditingName(false);
                    }} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            maxLength={20}
                            autoFocus
                            className="bg-transparent border-b border-[var(--color-chalk)]/30 text-center text-sm ui text-[rgb(var(--color-fg))]/70 outline-none w-32 py-1"
                        />
                        <button type="submit" className="text-[var(--color-gold)]"><IconCheck className="w-4 h-4" /></button>
                        <button type="button" onClick={() => { setEditingName(false); setNameInput(displayName); }} className="text-[rgb(var(--color-fg))]/30"><IconClose className="w-4 h-4" /></button>
                    </form>
                ) : (
                    <>
                        <span className="text-sm ui text-[rgb(var(--color-fg))]/60">{displayName}</span>
                        <button
                            onClick={() => { setNameInput(displayName); setEditingName(true); }}
                            className="text-[rgb(var(--color-fg))]/20 hover:text-[rgb(var(--color-fg))]/40 transition-colors"
                        >
                            <IconEdit className="w-3.5 h-3.5" />
                        </button>
                    </>
                )}
            </div>

            {/* Contextual save-progress nudge — value-framed, dismissible with cooldown */}
            {isAnonymous && (() => {
                const DISMISS_KEY = STORAGE_KEYS.loginDismiss;
                const dismissed = localStorage.getItem(DISMISS_KEY);
                const dismissedAt = dismissed ? parseInt(dismissed, 10) : 0;
                const sessionsSinceDismiss = stats.sessionsPlayed - dismissedAt;
                // Only show after 5 sessions, and not within 5 sessions of last dismiss
                if (stats.sessionsPlayed < 5 || (dismissedAt > 0 && sessionsSinceDismiss < 5)) return null;

                return (
                    <div className="mb-3 relative bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8 rounded-xl overflow-hidden">
                        {/* Dismiss button */}
                        <button
                            onClick={() => localStorage.setItem(DISMISS_KEY, String(stats.sessionsPlayed))}
                            className="absolute top-2 right-2 z-10 text-[rgb(var(--color-fg))]/20 hover:text-[rgb(var(--color-fg))]/50 transition-colors"
                        >
                            <IconClose className="w-3.5 h-3.5" />
                        </button>

                        {!showEmailInput ? (
                            <div className="p-3">
                                <div className="flex items-center gap-1.5 text-[11px] ui text-[rgb(var(--color-fg))]/50 mb-2.5">
                                    <IconCloud className="w-3.5 h-3.5" />
                                    <span>Save your {stats.totalXP.toLocaleString()} XP across devices</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={linkGoogle}
                                        className="flex-1 flex items-center justify-center gap-1.5 text-[11px] ui text-[rgb(var(--color-fg))]/50 hover:text-[rgb(var(--color-fg))]/70 transition-colors border border-[rgb(var(--color-fg))]/10 rounded-lg py-1.5"
                                    >
                                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                        Google
                                    </button>
                                    <button
                                        onClick={() => setShowEmailInput(true)}
                                        className="flex-1 flex items-center justify-center gap-1.5 text-[11px] ui text-[rgb(var(--color-fg))]/50 hover:text-[rgb(var(--color-fg))]/70 transition-colors border border-[rgb(var(--color-fg))]/10 rounded-lg py-1.5"
                                    >
                                        <IconMail className="w-3 h-3" />
                                        Email
                                    </button>
                                </div>
                            </div>
                        ) : emailSent ? (
                            <div className="p-3 flex items-center gap-1.5 text-[10px] ui text-[var(--color-correct)]">
                                <IconCheck className="w-3.5 h-3.5" />
                                <span>Check your email for the magic link!</span>
                            </div>
                        ) : (
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!emailInput.includes('@')) return;
                                    try {
                                        await sendEmailLink(emailInput);
                                        setEmailSent(true);
                                        setShowEmailInput(false);
                                    } catch (err) {
                                        console.warn('Email link failed:', err);
                                    }
                                }}
                                className="flex gap-1.5 p-3"
                            >
                                <input
                                    type="email"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    placeholder="your@email.com"
                                    autoFocus
                                    className="flex-1 text-xs ui bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/10 rounded-lg px-3 py-1.5 text-[rgb(var(--color-fg))]/80 placeholder:text-[rgb(var(--color-fg))]/20 outline-none focus:border-[var(--color-gold)]/40"
                                />
                                <button type="submit" className="text-xs ui font-semibold text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-3 py-1.5 rounded-lg">Send</button>
                                <button type="button" onClick={() => setShowEmailInput(false)} className="text-[rgb(var(--color-fg))]/30 px-1">
                                    <IconClose className="w-3.5 h-3.5" />
                                </button>
                            </form>
                        )}
                    </div>
                );
            })()}

            {/* Rank + XP header (above tabs — identity content) */}
            <motion.div
                className="text-center mb-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="mb-1 flex justify-center text-[var(--color-gold)]">
                    <RankIcon rank={rank.name} className="w-10 h-10" />
                </div>
                <button
                    onClick={() => setShowRanks(true)}
                    className="text-xl ui font-bold text-[var(--color-gold)] leading-tight hover:opacity-80 transition-opacity"
                >
                    {rank.name}
                </button>
                {nextRank && (
                    <div className="mt-2 w-44 mx-auto">
                        <div className="h-1.5 rounded-full bg-[rgb(var(--color-fg))]/10 overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-[var(--color-gold)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.round(progress * 100)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                        </div>
                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/50 mt-1">
                            {stats.totalXP.toLocaleString()} / {nextRank.xp.toLocaleString()} → {nextRank.name}
                        </div>
                    </div>
                )}
                {!nextRank && mastery && (
                    <div className="mt-2 w-48 mx-auto">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] ui font-semibold text-[var(--color-skull)]">✨ Mastery Lv. {mastery.level}</span>
                            <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{stats.totalXP.toLocaleString()} XP</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[rgb(var(--color-fg))]/10 overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-[var(--color-skull)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.round(mastery.progress * 100)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                        </div>
                    </div>
                )}
                {/* Quick stats */}
                <div className="flex justify-center gap-5 mt-3">
                    <div className="text-center">
                        <div className="text-sm ui font-bold text-[var(--color-streak-fire)]">{stats.bestStreak}</div>
                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">streak</div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm ui font-bold text-[var(--color-correct)]">{accuracy}%</div>
                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">accuracy</div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm ui font-bold text-[rgb(var(--color-fg))]/70">{stats.totalSolved}</div>
                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">solved</div>
                    </div>
                </div>
                {/* Bee stats row */}
                {stats.beeSessions > 0 && (
                    <div className="flex justify-center gap-5 mt-2 pt-2 border-t border-[rgb(var(--color-fg))]/5">
                        <div className="text-center">
                            <div className="text-sm ui font-bold text-[var(--color-gold)]">{stats.beeBestRound + 1}</div>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">bee round</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm ui font-bold text-[var(--color-gold)]">{stats.beeWins}</div>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">bee wins</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm ui font-bold text-[var(--color-gold)]">{stats.beeSessions}</div>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">bee tries</div>
                        </div>
                    </div>
                )}
                {/* Word mastery row */}
                {uniqueWordsAttempted > 0 && (
                    <div className="flex justify-center gap-5 mt-2 pt-2 border-t border-[rgb(var(--color-fg))]/5">
                        <div className="text-center">
                            <div className="text-sm ui font-bold text-[var(--color-gold)]">{masteredCount.toLocaleString()}</div>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">mastered</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm ui font-bold text-[var(--color-gold)]">{masteryPercent}</div>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">of bank</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm ui font-bold text-[rgb(var(--color-fg))]/70">{totalWords.toLocaleString()}</div>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">in bank</div>
                        </div>
                    </div>
                )}
                {/* Rarity distribution */}
                {hasCollection && (
                    <div className="flex justify-center gap-3 mt-2 pt-2 border-t border-[rgb(var(--color-fg))]/5">
                        {ALL_RARITIES.map(r => {
                            const count = rarityCounts[r];
                            if (count === 0) return null;
                            const cfg = RARITY_CONFIGS[r];
                            return (
                                <div key={r} className="text-center">
                                    <div className="text-sm ui font-bold" style={{ color: cfg.color }}>{count}</div>
                                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{cfg.emoji}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </motion.div>

            {/* ── Consolidated Content ── */}
            <div className="w-full">
                <div className="flex flex-col items-center">

            {/* ═══════ AVATAR ═══════ */}
                <button
                    onClick={() => setShowAvatarBuilder(true)}
                    className="mb-5 flex flex-col items-center gap-1.5 group"
                    aria-label={dialect === 'en-GB' ? 'Customise avatar' : 'Customize avatar'}
                >
                    <div className="relative p-2.5 rounded-2xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/5 group-hover:border-[var(--color-gold)]/30 transition-colors">
                        <AvatarSvg
                            config={parseAvatar(avatarConfig)}
                            size={64}
                            className="text-[var(--color-chalk)]"
                        />
                        <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/30 flex items-center justify-center">
                            <IconEdit className="w-3 h-3 text-[var(--color-gold)]" />
                        </span>
                    </div>
                    <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30 group-hover:text-[rgb(var(--color-fg))]/50 transition-colors">
                        {dialect === 'en-GB' ? 'customise' : 'customize'}
                    </span>
                </button>

            {/* ═══════ REFERRAL / CHAMPION PASS ═══════ */}
                <div className="w-full max-w-sm mb-5">
                    <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-3">
                        invite friends
                    </div>
                    <div className="bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8 rounded-xl p-4">
                        {/* Champion Pass status */}
                        {isPremium && (
                            <div className="flex items-center justify-center gap-1.5 text-[11px] ui text-[var(--color-gold)] mb-3">
                                <span>👑</span>
                                <span>Champion Pass — {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left</span>
                            </div>
                        )}

                        {/* Referral code + copy */}
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <div className="text-lg ui font-bold text-[var(--color-chalk)] tracking-widest">{referralCode || '...'}</div>
                            <button
                                onClick={async () => {
                                    if (!referralCode) return;
                                    try {
                                        await navigator.clipboard.writeText(referralCode);
                                    } catch { /* silent */ }
                                }}
                                className="text-[10px] ui text-[rgb(var(--color-fg))]/30 hover:text-[var(--color-gold)] transition-colors"
                            >
                                copy
                            </button>
                        </div>

                        {/* Stats + milestone progress */}
                        {referralCount > 0 && (
                            <div className="text-[11px] ui text-[rgb(var(--color-fg))]/40 text-center mb-2">
                                {referralCount} friend{referralCount !== 1 ? 's' : ''} invited
                            </div>
                        )}
                        {(() => {
                            const next = REFERRAL_MILESTONES.find(m => referralCount < m.count);
                            const allClaimed = !next;
                            if (allClaimed) return referralCount > 0 ? (
                                <div className="text-[10px] ui text-[var(--color-gold)] text-center mb-3">
                                    All milestones earned!
                                </div>
                            ) : null;
                            const prev = REFERRAL_MILESTONES.filter(m => referralCount >= m.count).pop();
                            const base = prev ? prev.count : 0;
                            const progress = ((referralCount - base) / (next.count - base)) * 100;
                            return (
                                <div className="mb-3">
                                    <div className="flex items-center justify-between text-[9px] ui text-[rgb(var(--color-fg))]/30 mb-1">
                                        <span>{referralCount}/{next.count} for +{next.label}</span>
                                        <span>{next.count - referralCount} to go</span>
                                    </div>
                                    <div className="h-1.5 bg-[rgb(var(--color-fg))]/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[var(--color-gold)] rounded-full transition-all"
                                            style={{ width: `${Math.min(100, progress)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Share button */}
                        <button
                            onClick={shareReferral}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm ui font-medium text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-colors"
                        >
                            <IconGift className="w-4 h-4" />
                            Share — you both get 7 days free
                        </button>

                        <div className="text-[9px] ui text-[rgb(var(--color-fg))]/20 text-center mt-2">
                            Share your code to unlock Champion Pass for both of you
                        </div>
                    </div>
                </div>

            {/* ═══════ CHALK THEMES & TRAILS ═══════ */}
                <>
                    {/* Shop button */}
                    <button
                        onClick={onShop}
                        className="flex items-center gap-1.5 text-[10px] ui text-[var(--color-gold)]/60 hover:text-[var(--color-gold)] transition-colors mb-3"
                    >
                        <IconShop className="w-3.5 h-3.5" />
                        <span>cosmetic shop</span>
                    </button>

                    {/* Chalk Themes — locked ones faded like achievements */}
                    <div className="w-full max-w-sm mb-5">
                        <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-3">
                            chalk style · {unlockedThemes}/{CHALK_THEMES.length}
                        </div>
                        <div className="flex justify-center gap-2.5 flex-wrap">
                            {CHALK_THEMES.map(t => {
                                const { available: rankUnlocked, hint: unlockHint } = checkUnlock(rankIdx, stats.bestStreak, stats.totalSolved, t);
                                const premiumLocked = !isPremium && t.premium;
                                const packLocked = t.packItem && !isItemOwned(t.id, purchasedPacks);
                                const lootLocked = t.lootDrop && !isLootDropOwned(t.id);
                                const isAvailable = lootLocked ? false : rankUnlocked && !premiumLocked && !packLocked;
                                const isActive = activeTheme === t.id;
                                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                                const swatchColor = isLight ? t.lightColor : t.color;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => lootLocked ? undefined : packLocked ? onShop?.() : premiumLocked ? onUpgrade?.() : isAvailable && onThemeChange(t)}
                                        aria-label={`${t.name} chalk style${isActive ? ', selected' : ''}${!isAvailable ? ', locked' : ''}`}
                                        aria-pressed={isActive}
                                        title={lootLocked ? 'Found via loot drop' : packLocked ? 'Available in shop' : premiumLocked ? 'Champion Pass required' : unlockHint}
                                        className={`w-10 h-10 rounded-full border-2 transition-all relative ${isActive ? 'border-[var(--color-gold)] scale-110' :
                                            isAvailable ? 'border-[rgb(var(--color-fg))]/20 hover:border-[rgb(var(--color-fg))]/40' :
                                                'border-[rgb(var(--color-fg))]/8 opacity-40 cursor-not-allowed'
                                            }`}
                                        style={{ backgroundColor: swatchColor }}
                                    >
                                        {lootLocked && (
                                            <span className="absolute -top-0.5 -right-0.5 text-[8px]">🎁</span>
                                        )}
                                        {premiumLocked && !lootLocked && (
                                            <span className="absolute -top-0.5 -right-0.5 text-[8px]">🔒</span>
                                        )}
                                        {packLocked && !premiumLocked && !lootLocked && (
                                            <span className="absolute -top-0.5 -right-0.5 text-[8px]">🛒</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Swipe Trails */}
                    <div className="w-full max-w-sm mb-6">
                        <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-3">
                            swipe trail · {unlockedTrails}/{SWIPE_TRAILS.length}
                        </div>
                        <div className="flex justify-center gap-2.5 flex-wrap">
                            {SWIPE_TRAILS.map(t => {
                                const { available: rankUnlocked, hint: unlockHint } = checkUnlock(rankIdx, stats.bestStreak, stats.totalSolved, t);
                                const premiumLocked = !isPremium && t.premium;
                                const packLocked = t.packItem && !isItemOwned(t.id, purchasedPacks);
                                const isUnlocked = rankUnlocked && !premiumLocked && !packLocked;
                                const isActive = (activeTrailId || 'chalk-dust') === t.id;

                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => packLocked ? onShop?.() : premiumLocked ? onUpgrade?.() : isUnlocked && onTrailChange(t.id)}
                                        aria-label={`${t.name} trail${isActive ? ', selected' : ''}${!isUnlocked ? ', locked' : ''}`}
                                        aria-pressed={isActive}
                                        title={packLocked ? 'Available in shop' : premiumLocked ? 'Champion Pass required' : unlockHint}
                                        className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all relative
                                            ${isActive ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 scale-105' :
                                                isUnlocked ? 'border-[rgb(var(--color-fg))]/20 hover:border-[rgb(var(--color-fg))]/40' :
                                                    'border-[rgb(var(--color-fg))]/5 opacity-30 cursor-not-allowed bg-[var(--color-surface)]'
                                            }`}
                                    >
                                        {premiumLocked && (
                                            <span className="absolute -top-1 -right-1 text-[8px]">🔒</span>
                                        )}
                                        {packLocked && !premiumLocked && (
                                            <span className="absolute -top-1 -right-1 text-[8px]">🛒</span>
                                        )}
                                        <span className={`text-2xl ${isActive ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : ''}`}>
                                            {t.emoji}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>

            {/* ═══════ FRIENDS ═══════ */}
            {onOpenFriends && friendCode && (
                <div className="w-full max-w-sm mb-4">
                    <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-2">
                        friends · {friendCount}
                    </div>
                    <button
                        onClick={onOpenFriends}
                        className="w-full flex items-center justify-between p-3 rounded-2xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/10 hover:border-[var(--color-gold)]/30 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-lg">🤝</span>
                            <div className="text-left">
                                <div className="text-xs ui font-mono tracking-wider text-[rgb(var(--color-accent))]">{friendCode}</div>
                                {bestBuddyStreak > 0 && (
                                    <div className="text-[10px] text-[rgb(var(--color-fg))]/40">🔥 {bestBuddyStreak} day buddy streak</div>
                                )}
                            </div>
                        </div>
                        <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40">Manage →</span>
                    </button>
                </div>
            )}

            {/* ═══════ ACHIEVEMENTS ═══════ */}
            {(
                <div className="w-full max-w-sm">
                    <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-1">
                        achievements · {[...unlocked].length}/{EVERY_SPELLING_ACHIEVEMENT.length}
                    </div>
                    {activeBadge && (
                        <div className="flex items-center justify-center gap-1.5 text-[10px] ui text-[var(--color-gold)]/60 text-center mb-3">
                            <IconTag className="w-3 h-3" />
                            <span>Badge: <span className="font-semibold">{EVERY_SPELLING_ACHIEVEMENT.find(a => a.id === activeBadge)?.name || activeBadge}</span></span>
                            <button onClick={() => updateBadge('')} className="text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/60">
                                <IconClose className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 text-center mb-3">
                        {[...unlocked].length === 0
                            ? 'Earn achievements by building streaks, accuracy, and mastering words'
                            : 'tap unlocked badge to equip on leaderboard'}
                    </div>
                    <div className="grid grid-cols-4 gap-3 justify-items-center">
                        {CORE_ACHIEVEMENTS.map(a => {
                            const isUnlocked = unlocked.has(a.id);
                            const hasCostume = ['streak-5', 'streak-20', 'sharpshooter', 'math-machine', 'century'].includes(a.id);
                            const isActive = activeCostume === a.id;
                            const isBadgeEquipped = activeBadge === a.id;
                            return (
                                <div
                                    key={a.id}
                                    role={isUnlocked ? 'button' : undefined}
                                    tabIndex={isUnlocked ? 0 : undefined}
                                    aria-label={`${a.name}: ${a.desc}${isBadgeEquipped ? ', equipped as badge' : ''}${!isUnlocked ? ', locked' : ''}`}
                                    onKeyDown={(e) => { if (isUnlocked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (hasCostume) onCostumeChange(isActive ? '' : a.id); updateBadge(isBadgeEquipped ? '' : a.id); }}}
                                    onClick={() => {
                                        if (!isUnlocked) return;
                                        if (hasCostume) onCostumeChange(isActive ? '' : a.id);
                                        updateBadge(isBadgeEquipped ? '' : a.id);
                                    }}
                                    className={isUnlocked ? 'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] rounded-xl' : ''}
                                >
                                    <AchievementBadge
                                        achievementId={a.id}
                                        unlocked={isUnlocked}
                                        equipped={isActive || isBadgeEquipped}
                                        name={a.name}
                                        desc={isBadgeEquipped ? '🏷️ badge' : isActive ? '✅ costume' : a.desc}
                                        onShare={isUnlocked ? () => handleShareBadge(a.name, a.desc) : undefined}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {achievementSections.map(s => (
                        <div key={s.label}>
                            <div className={`mt-5 text-xs ui uppercase tracking-widest text-center mb-2 ${s.colorClass}`}>
                                {s.label}
                            </div>
                            <div className={`grid gap-3 justify-items-center ${s.colsClass}`}>
                                {s.items.map(a => {
                                    const isUnlocked = unlocked.has(a.id);
                                    const isBadge = activeBadge === a.id;
                                    return (
                                        <div key={a.id} onClick={() => isUnlocked && updateBadge(isBadge ? '' : a.id)} className={isUnlocked ? 'cursor-pointer' : ''}>
                                            <AchievementBadge achievementId={a.id} unlocked={isUnlocked} equipped={isBadge} name={a.name} desc={isBadge ? '🏷️ badge' : a.desc} onShare={isUnlocked ? () => handleShareBadge(a.name, a.desc) : undefined} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

                </div>
            </div>

            {/* ═══════ CERTIFICATES ═══════ */}
            {onCertificate && stats.beeSessions > 0 && (
                <div className="w-full max-w-sm mt-6">
                    <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-3">
                        certificates
                    </div>
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 text-center mb-3">
                        Download certificates for your achievements
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {stats.beeWins > 0 && (
                            <button
                                onClick={() => onCertificate('level-completion', 1, masteredCount, Math.round(accuracy))}
                                className="py-3 px-3 rounded-xl bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/8 hover:border-[var(--color-gold)]/30 transition-colors text-center"
                            >
                                <div className="text-2xl mb-1">🏅</div>
                                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/60 font-medium">Bee Winner</div>
                            </button>
                        )}
                        {masteredCount >= 10 && (
                            <button
                                onClick={() => onCertificate('level-completion', parseInt(stats.beeBestLevel) || 1, masteredCount, Math.round(accuracy))}
                                className="py-3 px-3 rounded-xl bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/8 hover:border-[var(--color-gold)]/30 transition-colors text-center"
                            >
                                <div className="text-2xl mb-1">🎓</div>
                                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/60 font-medium">{masteredCount} Words Mastered</div>
                            </button>
                        )}
                    </div>
                </div>
            )}


            {/* Rank list modal */}
            <AnimatePresence>
                {showRanks && (
                    <ModalShell onClose={() => setShowRanks(false)} ariaLabel="Rank progression" className="w-[min(300px,90vw)] max-h-[75vh]">
                        <h3 className="text-lg ui font-bold text-[var(--color-gold)] text-center mb-4">Ranks</h3>
                        <div className="space-y-2">
                            {RANKS.map((r) => {
                                const isCurrent = r.name === rank.name;
                                const isReached = stats.totalXP >= r.xp;
                                return (
                                    <div
                                        key={r.name}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isCurrent
                                            ? 'bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30'
                                            : ''
                                            }`}
                                    >
                                        <span className={`${isCurrent ? 'text-[var(--color-gold)]' : isReached ? 'text-[rgb(var(--color-fg))]/70' : 'text-[rgb(var(--color-fg))]/25'}`}>
                                            <RankIcon rank={r.name} className="w-6 h-6" />
                                        </span>
                                        <div className="flex-1">
                                            <div className={`text-sm ui font-semibold ${isCurrent ? 'text-[var(--color-gold)]' :
                                                isReached ? 'text-[rgb(var(--color-fg))]/70' : 'text-[rgb(var(--color-fg))]/40'
                                                }`}>
                                                {r.name}
                                                {isCurrent && <span className="ml-1 text-xs">← you</span>}
                                            </div>
                                            <div className="text-[11px] ui text-[rgb(var(--color-fg))]/40">
                                                {r.xp === 0 ? 'Starting rank' : `${r.xp.toLocaleString()} points`}
                                            </div>
                                        </div>
                                        {isReached && (
                                            <span className="text-xs text-[var(--color-correct)]">✓</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setShowRanks(false)}
                            className="w-full mt-4 py-2 text-sm ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                        >
                            close
                        </button>
                    </ModalShell>
                )}
            </AnimatePresence>


            {/* Avatar builder modal */}
            <AnimatePresence>
                {showAvatarBuilder && (
                    <ModalShell onClose={() => setShowAvatarBuilder(false)} ariaLabel={dialect === 'en-GB' ? 'Customise avatar' : 'Customize avatar'} className="w-[min(360px,90vw)]">
                        <AvatarBuilder config={avatarConfig} onChange={onAvatarChange} flairStats={flairStats} />
                        <button
                            onClick={() => setShowAvatarBuilder(false)}
                            className="w-full mt-4 py-2 text-sm ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                        >
                            done
                        </button>
                    </ModalShell>
                )}
            </AnimatePresence>

            {/* Testimonial prompt */}
            <TestimonialPrompt
                masteredCount={masteredCount}
                dayStreak={stats.dayStreak}
                sessionsPlayed={stats.sessionsPlayed}
                level={level}
                isPremium={isPremium}
            />

            {/* What makes us different */}
            <button
                onClick={() => setShowAbout(v => !v)}
                className="w-full text-left text-[11px] ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50 transition-colors mt-2 mb-2"
            >
                {showAbout ? '\u25BE' : '\u25B8'} What makes Spelling Bee different?
            </button>
            {showAbout && (
                <div className="w-full space-y-2 mb-4 animate-in fade-in">
                    {[
                        { icon: '\uD83E\uDDE0', title: 'Intelligent Practice', desc: 'Spaced repetition means words stay learned' },
                        { icon: '\uD83D\uDD0D', title: 'Understands Mistakes', desc: 'Error analysis tells you WHY' },
                        { icon: '\uD83D\uDCDA', title: '51,000+ Words', desc: '10 levels from \u201Ccat\u201D to \u201Conomatopoeia\u201D' },
                        { icon: '\uD83D\uDD12', title: 'Privacy-First', desc: 'Offline, no ads, sign-in optional' },
                    ].map(item => (
                        <div key={item.title} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[rgb(var(--color-fg))]/[0.03]">
                            <span className="text-sm shrink-0">{item.icon}</span>
                            <div>
                                <span className="text-[11px] ui font-bold text-[var(--color-chalk)]">{item.title}</span>
                                <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40"> — {item.desc}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Sync status + Version */}
            {syncFailed && (
                <div className="text-[10px] ui text-[var(--color-wrong)]/50 mt-4">
                    Not synced — changes saved locally
                </div>
            )}
            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/15 mt-4 tracking-widest">
                v{__APP_VERSION__}
            </div>
        </div>
    );
});
