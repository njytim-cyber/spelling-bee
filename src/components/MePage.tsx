import { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EVERY_SPELLING_ACHIEVEMENT } from '../domains/spelling/spellingAchievements';
import { AchievementBadge } from './AchievementBadge';
import { CHALK_THEMES } from '../utils/chalkThemes';
import { SWIPE_TRAILS } from '../utils/trails';
import { RANKS, getRank, getMasteryInfo, checkUnlock } from '../utils/ranks';
import { ModalShell } from './ModalShell';
import { STORAGE_KEYS } from '../config';
import { IconCheck, IconClose, IconEdit, IconCloud, IconMail, IconBroom, IconTag, IconTrash } from './Icons';
import { useUser } from '../contexts/UserContext';
import { getAllWords, getRegistryVersion } from '../domains/spelling/words';

// Removed tab switching - now showing everything on one page

interface Props {
    unlocked: Set<string>;
    masteredCount: number;
    uniqueWordsAttempted: number;
}

// Derive achievement sublists from the single spelling array
const CORE_ACHIEVEMENTS = EVERY_SPELLING_ACHIEVEMENT.filter(a => !a.id.startsWith('word-') && !['speed-demon', 'blitz-master', 'lightning', 'time-lord'].includes(a.id));
const TIMED_MODE_ACHIEVEMENTS = EVERY_SPELLING_ACHIEVEMENT.filter(a => ['speed-demon', 'blitz-master', 'lightning', 'time-lord'].includes(a.id));
const MASTERY_ACHIEVEMENTS = EVERY_SPELLING_ACHIEVEMENT.filter(a => a.id.startsWith('word-'));

const achievementSections = [
    { label: '⏱️ timed mode', colorClass: 'text-[var(--color-timed)]', colsClass: 'grid-cols-4', items: TIMED_MODE_ACHIEVEMENTS },
    { label: '📚 word mastery', colorClass: 'text-[var(--color-gold)]', colsClass: 'grid-cols-5', items: MASTERY_ACHIEVEMENTS },
] as const;

export const MePage = memo(function MePage({ unlocked, masteredCount, uniqueWordsAttempted }: Props) {
    // Get user state from context
    const {
        stats,
        accuracy,
        resetStats,
        syncFailed,
        activeCostume,
        onCostumeChange,
        activeTheme,
        onThemeChange,
        activeTrailId,
        onTrailChange,
        displayName,
        setDisplayName,
        isAnonymous,
        linkGoogle,
        sendEmailLink,
        updateBadge,
        deleteAccount,
    } = useUser();

    const activeBadge = stats.activeBadgeId || '';
    const [showRanks, setShowRanks] = useState(false);
    const [resetConfirm, setResetConfirm] = useState<string | null>(null);
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(displayName);
    const [showEmailInput, setShowEmailInput] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Memoize expensive rank calculations
    const rankInfo = useMemo(() => getRank(stats.totalXP), [stats.totalXP]);
    const { rank, nextRank, progress } = rankInfo;
    const mastery = useMemo(() =>
        !nextRank ? getMasteryInfo(stats.totalXP) : null,
    [nextRank, stats.totalXP]);

    // Cosmetic unlock counts
    const rankIdx = useMemo(() => RANKS.findIndex(r => r.name === rank.name), [rank.name]);
    const unlockedThemes = useMemo(() =>
        CHALK_THEMES.filter(t => checkUnlock(rankIdx, stats.bestStreak, stats.totalSolved, t).available).length,
    [rankIdx, stats.bestStreak, stats.totalSolved]);
    const unlockedTrails = useMemo(() =>
        SWIPE_TRAILS.filter(t => checkUnlock(rankIdx, stats.bestStreak, stats.totalSolved, t).available).length,
    [rankIdx, stats.bestStreak, stats.totalSolved]);

    // Word bank mastery percentile
    const registryVersion = getRegistryVersion();
    const totalWords = useMemo(() => getAllWords().length, [registryVersion]);
    const masteryPercent = useMemo(() => {
        if (totalWords === 0) return '0%';
        const pct = (masteredCount / totalWords) * 100;
        return pct >= 1 ? `${Math.round(pct)}%` : pct > 0 ? `${pct.toFixed(1)}%` : '0%';
    }, [masteredCount, totalWords]);

    return (
        <div className="flex-1 flex flex-col items-center overflow-y-auto px-6 pt-[calc(env(safe-area-inset-top,12px)+48px)] pb-20 landscape-compact-pb">
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
                <div className="text-4xl mb-1">{rank.emoji}</div>
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
            </motion.div>

            {/* ── Consolidated Content ── */}
            <div className="w-full">
                <div className="flex flex-col items-center">

            {/* ═══════ CHALK THEMES & TRAILS ═══════ */}
                <>
                    {/* Chalk Themes — locked ones faded like achievements */}
                    <div className="w-full max-w-sm mb-5">
                        <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-3">
                            chalk color · {unlockedThemes}/{CHALK_THEMES.length}
                        </div>
                        <div className="flex justify-center gap-2.5 flex-wrap">
                            {CHALK_THEMES.map(t => {
                                const { available: isAvailable, hint: unlockHint } = checkUnlock(rankIdx, stats.bestStreak, stats.totalSolved, t);
                                const isActive = activeTheme === t.id;
                                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                                const swatchColor = isLight ? t.lightColor : t.color;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => isAvailable && onThemeChange(t)}
                                        aria-label={`${t.name} chalk color${isActive ? ', selected' : ''}${!isAvailable ? ', locked' : ''}`}
                                        aria-pressed={isActive}
                                        title={unlockHint}
                                        className={`w-10 h-10 rounded-full border-2 transition-all relative ${isActive ? 'border-[var(--color-gold)] scale-110' :
                                            isAvailable ? 'border-[rgb(var(--color-fg))]/20 hover:border-[rgb(var(--color-fg))]/40' :
                                                'border-[rgb(var(--color-fg))]/8 opacity-40 cursor-not-allowed'
                                            }`}
                                        style={{ backgroundColor: swatchColor }}
                                    />
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
                                const { available: isUnlocked, hint: unlockHint } = checkUnlock(rankIdx, stats.bestStreak, stats.totalSolved, t);
                                const isActive = (activeTrailId || 'chalk-dust') === t.id;

                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => isUnlocked && onTrailChange(t.id)}
                                        aria-label={`${t.name} trail${isActive ? ', selected' : ''}${!isUnlocked ? ', locked' : ''}`}
                                        aria-pressed={isActive}
                                        title={unlockHint}
                                        className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all
                                            ${isActive ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 scale-105' :
                                                isUnlocked ? 'border-[rgb(var(--color-fg))]/20 hover:border-[rgb(var(--color-fg))]/40' :
                                                    'border-[rgb(var(--color-fg))]/5 opacity-30 cursor-not-allowed bg-[var(--color-surface)]'
                                            }`}
                                    >
                                        <span className={`text-2xl ${isActive ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : ''}`}>
                                            {t.emoji}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>

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
                                            <AchievementBadge achievementId={a.id} unlocked={isUnlocked} equipped={isBadge} name={a.name} desc={isBadge ? '🏷️ badge' : a.desc} />
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

            {/* Reset stats */}
            <button
                onClick={() => {
                    const prompts = [
                        `You've earned ${stats.totalXP.toLocaleString()} points! Are you sure you want to start fresh? 🥺`,
                        `Bee Buddy will miss your ${stats.bestStreak}-streak record! Reset anyway? 🤔`,
                        `${stats.totalSolved} words spelled and counting… wipe it all? 😱`,
                        'A fresh start can be beautiful! Ready to begin again? 🌱',
                        'Your spelling journey so far has been amazing! Really reset? ✨',
                        'Even superheroes get a fresh origin story! Reset? 🦸',
                    ];
                    setResetConfirm(prompts[Math.floor(Math.random() * prompts.length)]);
                }}
                className="text-[10px] ui text-[rgb(var(--color-fg))]/20 mt-4 hover:text-[rgb(var(--color-fg))]/40 transition-colors uppercase tracking-widest"
            >
                reset stats
            </button>

            {/* Delete account */}
            <button
                onClick={() => setDeleteConfirm(true)}
                className="text-[10px] ui text-[rgb(var(--color-fg))]/15 mt-2 hover:text-[var(--color-wrong)]/60 transition-colors uppercase tracking-widest"
            >
                delete account
            </button>

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
                                        <span className="text-xl">{r.emoji}</span>
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

            {/* Delete account confirmation modal */}
            <AnimatePresence>
                {deleteConfirm && (
                    <ModalShell onClose={() => !deleting && setDeleteConfirm(false)} ariaLabel="Delete account confirmation" className="w-[min(300px,90vw)] text-center">
                        <div className="mb-3 flex justify-center text-[var(--color-wrong)]">
                            <IconTrash className="w-10 h-10" />
                        </div>
                        <p className="ui text-[rgb(var(--color-fg))]/80 text-base font-semibold mb-2">
                            Delete your account?
                        </p>
                        <p className="ui text-[rgb(var(--color-fg))]/50 text-xs leading-relaxed mb-6">
                            This permanently removes all your data including scores, achievements, word history, and leaderboard entries. This cannot be undone.
                        </p>
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
                                        // Auth listener will auto-create a new anonymous account
                                    } catch (err) {
                                        console.warn('Delete account failed:', err);
                                    } finally {
                                        setDeleting(false);
                                        setDeleteConfirm(false);
                                    }
                                }}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl border border-[var(--color-wrong)]/40 bg-[var(--color-wrong)]/10 text-sm ui text-[var(--color-wrong)] hover:bg-[var(--color-wrong)]/20 transition-colors disabled:opacity-50"
                            >
                                {deleting ? 'deleting...' : 'delete forever'}
                            </button>
                        </div>
                    </ModalShell>
                )}
            </AnimatePresence>

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
