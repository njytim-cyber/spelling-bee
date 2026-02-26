import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { useStats } from '../hooks/useStats';
import { SPELLING_CATEGORIES } from '../domains/spelling/spellingCategories';
import { EVERY_SPELLING_ACHIEVEMENT } from '../domains/spelling/spellingAchievements';
import { AchievementBadge } from './AchievementBadge';
import { CHALK_THEMES, type ChalkTheme } from '../utils/chalkThemes';
import { SWIPE_TRAILS } from '../utils/trails';
import type { WordRecord } from '../hooks/useWordHistory';
import { StudyAnalyticsModal } from './StudyAnalyticsModal';
import { SettingsModal } from './SettingsModal';

type MeTab = 'grades' | 'themes' | 'topics';
const ME_TABS: { id: MeTab; label: string }[] = [
    { id: 'grades', label: 'Grades' },
    { id: 'themes', label: 'Themes' },
    { id: 'topics', label: 'Topics' },
];

/** Per-grade breakdown for the Grades tab */
function tierIcon(tier: string) {
    return SPELLING_CATEGORIES.find(c => c.id === tier)?.icon;
}
const GRADE_LEVELS = [
    { label: 'Kindergarten', tier: 'tier-1', grades: 'K' },
    { label: 'Grade 1', tier: 'tier-1', grades: '1st' },
    { label: 'Grade 2', tier: 'tier-2', grades: '2nd' },
    { label: 'Grade 3', tier: 'tier-2', grades: '3rd' },
    { label: 'Grade 4', tier: 'tier-3', grades: '4th' },
    { label: 'Grade 5', tier: 'tier-3', grades: '5th' },
    { label: 'Grade 6', tier: 'tier-4', grades: '6th' },
    { label: 'Grade 7', tier: 'tier-4', grades: '7th' },
    { label: 'Grade 8+', tier: 'tier-5', grades: '8th+' },
];

interface Props {
    stats: ReturnType<typeof useStats>['stats'];
    accuracy: number;
    sessionScore: number;
    sessionStreak: number;
    onReset: () => void;
    unlocked: Set<string>;
    activeCostume: string;
    onCostumeChange: (id: string) => void;
    activeTheme: string;
    onThemeChange: (theme: ChalkTheme) => void;
    activeTrailId?: string;
    onTrailChange: (id: string) => void;
    displayName: string;
    onDisplayNameChange: (name: string) => Promise<void>;
    isAnonymous: boolean;
    onLinkGoogle: () => Promise<void>;
    onSendEmailLink: (email: string) => Promise<void>;
    activeBadge: string;
    onBadgeChange: (id: string) => void;
    wordRecords?: Record<string, WordRecord>;
    themeMode: string;
    onThemeModeToggle: () => void;
    grade: string;
    onGradeChange: (grade: import('../domains/spelling/spellingCategories').GradeLevel) => void;
    dialect: string;
    onDialectChange: (d: import('../domains/spelling/words/types').Dialect) => void;
}

/** Ranks with progressive XP thresholds (gets harder to level up) */
const RANKS = [
    { name: 'Beginner', emoji: '🌱', xp: 0 },
    { name: 'Learner', emoji: '📚', xp: 100 },
    { name: 'Speller', emoji: '🔤', xp: 300 },
    { name: 'Wordsmith', emoji: '✏️', xp: 600 },
    { name: 'Linguist', emoji: '🗣️', xp: 1000 },
    { name: 'Lexicon', emoji: '📖', xp: 1800 },
    { name: 'Word Wizard', emoji: '🧙', xp: 3000 },
    { name: 'Grandmaster', emoji: '♟️', xp: 5000 },
    { name: 'Legend', emoji: '👑', xp: 8000 },
    { name: 'Mythic', emoji: '🌌', xp: 12000 },
    { name: 'Transcendent', emoji: '✨', xp: 20000 },
];

function getRank(xp: number) {
    let rank = RANKS[0];
    let nextRank: typeof RANKS[number] | null = RANKS[1];
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (xp >= RANKS[i].xp) {
            rank = RANKS[i];
            nextRank = RANKS[i + 1] || null;
            break;
        }
    }
    const progress = nextRank
        ? (xp - rank.xp) / (nextRank.xp - rank.xp)
        : 1;
    return { rank, nextRank, progress };
}

/** Mastery levels — post-max-rank infinite progression:
 *  ML1→ML2 costs 25k XP, each subsequent level 10k more. */
const MASTERY_BASE = 25000;
const MASTERY_SCALE = 10000;
const MAX_RANK_XP = 20000;

function getMasteryInfo(xp: number) {
    if (xp < MAX_RANK_XP) return null;
    let remaining = xp - MAX_RANK_XP;
    let level = 1;
    let levelStartXp = MAX_RANK_XP;
    while (true) {
        const cost = MASTERY_BASE + (level - 1) * MASTERY_SCALE;
        if (remaining < cost) {
            return { level, progress: remaining / cost, xpForNext: levelStartXp + cost };
        }
        remaining -= cost;
        levelStartXp += cost;
        level++;
    }
}

// Derive achievement sublists from the single spelling array
const CORE_ACHIEVEMENTS = EVERY_SPELLING_ACHIEVEMENT.filter(a => !a.id.startsWith('skull-') && !a.id.startsWith('ultimate-') && !['speed-demon', 'blitz-master', 'lightning', 'time-lord'].includes(a.id));
const HARD_MODE_ACHIEVEMENTS = EVERY_SPELLING_ACHIEVEMENT.filter(a => a.id.startsWith('skull-'));
const TIMED_MODE_ACHIEVEMENTS = EVERY_SPELLING_ACHIEVEMENT.filter(a => ['speed-demon', 'blitz-master', 'lightning', 'time-lord'].includes(a.id));
const ULTIMATE_ACHIEVEMENTS = EVERY_SPELLING_ACHIEVEMENT.filter(a => a.id.startsWith('ultimate-'));

export const MePage = memo(function MePage({ stats, accuracy, onReset, unlocked, activeCostume, onCostumeChange, activeTheme, onThemeChange, activeTrailId, onTrailChange, displayName, onDisplayNameChange, isAnonymous, onLinkGoogle, onSendEmailLink, activeBadge, onBadgeChange, wordRecords, themeMode, onThemeModeToggle, grade, onGradeChange, dialect, onDialectChange }: Props) {
    const [meTab, setMeTab] = useState<MeTab>('grades');
    const [showRanks, setShowRanks] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [resetConfirm, setResetConfirm] = useState<string | null>(null);
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(displayName);
    const [showEmailInput, setShowEmailInput] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const { rank, nextRank, progress } = getRank(stats.totalXP);
    const mastery = !nextRank ? getMasteryInfo(stats.totalXP) : null;

    // Today's date string to check daily freshness
    const today = (() => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; })();
    const dailyDoneToday = stats.lastDailyDate === today && stats.todayDailySolved > 0;
    const dailyAcc = dailyDoneToday ? Math.round((stats.todayDailyCorrect / stats.todayDailySolved) * 100) : null;

    // Swipe between sub-tabs
    const handleMeTabSwipe = useCallback((_: unknown, info: PanInfo) => {
        const t = 80;
        const idx = ME_TABS.findIndex(tab => tab.id === meTab);
        if ((info.offset.x < -t || info.velocity.x < -400) && idx < ME_TABS.length - 1) {
            setMeTab(ME_TABS[idx + 1].id);
        } else if ((info.offset.x > t || info.velocity.x > 400) && idx > 0) {
            setMeTab(ME_TABS[idx - 1].id);
        }
    }, [meTab]);

    return (
        <div className="flex-1 flex flex-col items-center overflow-hidden px-6 pt-4 pb-20">
            {/* Settings gear button */}
            <button
                onClick={() => setShowSettings(true)}
                className="self-end mb-2 text-lg opacity-40 hover:opacity-70 transition-opacity"
                aria-label="Settings"
            >
                ⚙️
            </button>

            {/* Display name + edit */}
            <div className="flex items-center gap-2 mb-2">
                {editingName ? (
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (nameInput.trim()) {
                            await onDisplayNameChange(nameInput.trim());
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
                        <button type="submit" className="text-xs ui text-[var(--color-gold)]">✓</button>
                        <button type="button" onClick={() => { setEditingName(false); setNameInput(displayName); }} className="text-xs ui text-[rgb(var(--color-fg))]/30">✕</button>
                    </form>
                ) : (
                    <>
                        <span className="text-sm ui text-[rgb(var(--color-fg))]/60">{displayName}</span>
                        <button
                            onClick={() => { setNameInput(displayName); setEditingName(true); }}
                            className="text-xs text-[rgb(var(--color-fg))]/20 hover:text-[rgb(var(--color-fg))]/40 transition-colors"
                        >
                            ✏️
                        </button>
                    </>
                )}
            </div>

            {/* Contextual save-progress nudge — value-framed, dismissible with cooldown */}
            {isAnonymous && (() => {
                const DISMISS_KEY = 'spell-bee-login-dismiss';
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
                            className="absolute top-2 right-2 z-10 text-[rgb(var(--color-fg))]/20 hover:text-[rgb(var(--color-fg))]/50 text-xs transition-colors"
                        >✕</button>

                        {!showEmailInput ? (
                            <div className="p-3">
                                <div className="text-[11px] ui text-[rgb(var(--color-fg))]/50 mb-2.5">
                                    ☁️ Save your {stats.totalXP.toLocaleString()} XP across devices
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={onLinkGoogle}
                                        className="flex-1 flex items-center justify-center gap-1.5 text-[11px] ui text-[rgb(var(--color-fg))]/50 hover:text-[rgb(var(--color-fg))]/70 transition-colors border border-[rgb(var(--color-fg))]/10 rounded-lg py-1.5"
                                    >
                                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                        Google
                                    </button>
                                    <button
                                        onClick={() => setShowEmailInput(true)}
                                        className="flex-1 flex items-center justify-center gap-1.5 text-[11px] ui text-[rgb(var(--color-fg))]/50 hover:text-[rgb(var(--color-fg))]/70 transition-colors border border-[rgb(var(--color-fg))]/10 rounded-lg py-1.5"
                                    >
                                        ✉️ Email
                                    </button>
                                </div>
                            </div>
                        ) : emailSent ? (
                            <div className="p-3 text-[10px] ui text-[var(--color-correct)]">
                                ✓ Check your email for the magic link!
                            </div>
                        ) : (
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!emailInput.includes('@')) return;
                                    try {
                                        await onSendEmailLink(emailInput);
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
                                <button type="button" onClick={() => setShowEmailInput(false)} className="text-xs text-[rgb(var(--color-fg))]/30 px-1">✕</button>
                            </form>
                        )}
                    </div>
                );
            })()}

            {/* ── Sub-tab bar ── */}
            <div className="flex items-center gap-1 mb-4 relative">
                {ME_TABS.map(tab => {
                    const isActive = tab.id === meTab;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setMeTab(tab.id)}
                            className={`relative px-4 py-1.5 text-xs ui tracking-wide transition-colors ${isActive ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60'}`}
                        >
                            {tab.label}
                            {isActive && (
                                <motion.div
                                    layoutId="me-tab-indicator"
                                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--color-gold)]"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Swipeable tab content ── */}
            <motion.div
                className="flex-1 w-full overflow-y-auto"
                key={meTab}
                onPanEnd={handleMeTabSwipe}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
            >
                <div className="flex flex-col items-center">

            {/* ═══════ GRADES TAB ═══════ */}
            {meTab === 'grades' && (
                <>
                    {/* Rank + XP header */}
                    <motion.div
                        className="text-center mb-6"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="text-4xl mb-1">{rank.emoji}</div>
                        <button
                            onClick={() => setShowRanks(true)}
                            className="text-xl chalk text-[var(--color-gold)] leading-tight hover:opacity-80 transition-opacity"
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
                    </motion.div>

                    {/* Summary stats row */}
                    <div className="flex gap-5 mb-6">
                        <div className="text-center">
                            <div className="text-xl chalk text-[var(--color-streak-fire)]">{stats.bestStreak}</div>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/50">🔥 streak</div>
                        </div>
                        <button className="text-center hover:opacity-80 transition-opacity" onClick={() => wordRecords && setShowAnalytics(true)}>
                            <div className="text-xl chalk text-[var(--color-correct)]">{accuracy}%</div>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">🎯 accuracy</div>
                        </button>
                        <div className="text-center">
                            <div className="text-xl chalk text-[rgb(var(--color-fg))]/70">{stats.totalSolved}</div>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">✅ solved</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl chalk text-[var(--color-gold)]">{dailyAcc !== null ? `${dailyAcc}%` : '-'}</div>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/50">📅 daily</div>
                        </div>
                    </div>

                    {/* Per-grade breakdown */}
                    <div className="w-full max-w-sm space-y-2">
                        {GRADE_LEVELS.map(g => {
                            const ts = stats.byType[g.tier] ?? { solved: 0, correct: 0 };
                            const pct = ts.solved > 0 ? Math.round((ts.correct / ts.solved) * 100) : 0;
                            const hasData = ts.solved > 0;
                            return (
                                <div key={g.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[rgb(var(--color-fg))]/[0.03]">
                                    <span className="w-8 flex justify-center text-[rgb(var(--color-fg))]/50">{tierIcon(g.tier)}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm ui text-[rgb(var(--color-fg))]/70 font-medium">{g.label}</span>
                                            <span className={`text-sm ui font-semibold ${!hasData ? 'text-[rgb(var(--color-fg))]/20' :
                                                pct >= 80 ? 'text-[var(--color-correct)]' :
                                                    pct >= 50 ? 'text-[var(--color-gold)]' :
                                                        'text-[rgb(var(--color-fg))]/50'
                                                }`}>
                                                {hasData ? `${pct}%` : '—'}
                                            </span>
                                        </div>
                                        {hasData && (
                                            <div className="mt-1 h-1 rounded-full bg-[rgb(var(--color-fg))]/10 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-[var(--color-correct)]' :
                                                        pct >= 50 ? 'bg-[var(--color-gold)]' : 'bg-[rgb(var(--color-fg))]/30'
                                                        }`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        )}
                                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mt-0.5">
                                            {hasData ? `${ts.correct}/${ts.solved} correct` : 'not started'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

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
                        className="text-sm ui text-[rgb(var(--color-fg))]/35 mt-10 hover:text-[rgb(var(--color-fg))]/50 transition-colors uppercase tracking-widest"
                    >
                        RESET STATS
                    </button>
                </>
            )}

            {/* ═══════ TOPICS TAB ═══════ */}
            {meTab === 'topics' && (
                <div className="w-full max-w-sm">
                    <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-1">
                        achievements · {[...unlocked].length}/{EVERY_SPELLING_ACHIEVEMENT.length}
                    </div>
                    {activeBadge && (
                        <div className="text-[10px] ui text-[var(--color-gold)]/60 text-center mb-3">
                            🏷️ Badge: <span className="font-semibold">{EVERY_SPELLING_ACHIEVEMENT.find(a => a.id === activeBadge)?.name || activeBadge}</span>
                            <button onClick={() => onBadgeChange('')} className="ml-1 text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/60">✕</button>
                        </div>
                    )}
                    <div className="text-[9px] ui text-[rgb(var(--color-fg))]/25 text-center mb-3">tap unlocked badge to equip on leaderboard</div>
                    <div className="grid grid-cols-4 gap-3 justify-items-center">
                        {CORE_ACHIEVEMENTS.map(a => {
                            const isUnlocked = unlocked.has(a.id);
                            const hasCostume = ['streak-5', 'streak-20', 'sharpshooter', 'math-machine', 'century'].includes(a.id);
                            const isActive = activeCostume === a.id;
                            const isBadgeEquipped = activeBadge === a.id;
                            return (
                                <div
                                    key={a.id}
                                    onClick={() => {
                                        if (!isUnlocked) return;
                                        if (hasCostume) onCostumeChange(isActive ? '' : a.id);
                                        onBadgeChange(isBadgeEquipped ? '' : a.id);
                                    }}
                                    className={isUnlocked ? 'cursor-pointer' : ''}
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

                    {/* 💀 Hard Mode */}
                    <div className="mt-5 text-xs ui text-[var(--color-skull)] uppercase tracking-widest text-center mb-2">
                        💀 hard mode
                    </div>
                    <div className="grid grid-cols-3 gap-3 justify-items-center">
                        {HARD_MODE_ACHIEVEMENTS.map(a => {
                            const isUnlocked = unlocked.has(a.id);
                            const isBadge = activeBadge === a.id;
                            return (
                                <div key={a.id} onClick={() => isUnlocked && onBadgeChange(isBadge ? '' : a.id)} className={isUnlocked ? 'cursor-pointer' : ''}>
                                    <AchievementBadge achievementId={a.id} unlocked={isUnlocked} equipped={isBadge} name={a.name} desc={isBadge ? '🏷️ badge' : a.desc} />
                                </div>
                            );
                        })}
                    </div>

                    {/* ⏱️ Timed Mode */}
                    <div className="mt-5 text-xs ui text-[var(--color-timed)] uppercase tracking-widest text-center mb-2">
                        ⏱️ timed mode
                    </div>
                    <div className="grid grid-cols-4 gap-3 justify-items-center">
                        {TIMED_MODE_ACHIEVEMENTS.map(a => {
                            const isUnlocked = unlocked.has(a.id);
                            const isBadge = activeBadge === a.id;
                            return (
                                <div key={a.id} onClick={() => isUnlocked && onBadgeChange(isBadge ? '' : a.id)} className={isUnlocked ? 'cursor-pointer' : ''}>
                                    <AchievementBadge achievementId={a.id} unlocked={isUnlocked} equipped={isBadge} name={a.name} desc={isBadge ? '🏷️ badge' : a.desc} />
                                </div>
                            );
                        })}
                    </div>

                    {/* 💀⏱️ Ultimate Mode */}
                    <div className="mt-5 text-xs ui text-[var(--color-ultimate)] uppercase tracking-widest text-center mb-2">
                        💀⏱️ ultimate
                    </div>
                    <div className="grid grid-cols-3 gap-3 justify-items-center">
                        {ULTIMATE_ACHIEVEMENTS.map(a => {
                            const isUnlocked = unlocked.has(a.id);
                            const isBadge = activeBadge === a.id;
                            return (
                                <div key={a.id} onClick={() => isUnlocked && onBadgeChange(isBadge ? '' : a.id)} className={isUnlocked ? 'cursor-pointer' : ''}>
                                    <AchievementBadge achievementId={a.id} unlocked={isUnlocked} equipped={isBadge} name={a.name} desc={isBadge ? '🏷️ badge' : a.desc} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══════ THEMES TAB ═══════ */}
            {meTab === 'themes' && (
                <>
                    {/* Chalk Themes — locked ones faded like achievements */}
                    <div className="w-full max-w-sm">
                        <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-3">
                            CHALK COLOR
                        </div>
                        <div className="flex justify-center gap-2.5 flex-wrap">
                            {CHALK_THEMES.map(t => {
                                const rankIdx = RANKS.findIndex(r => r.name === rank.name);
                                const rankOk = rankIdx >= (t.minLevel - 1);
                                // Mode-exclusive unlock checks
                                const hardOk = !t.hardModeOnly || (stats.hardModeSolved >= (t.hardModeMin ?? 0));
                                const timedOk = !t.timedModeOnly || (stats.timedModeSolved >= (t.timedModeMin ?? 0));
                                const ultimateOk = !t.ultimateOnly || (stats.ultimateSolved >= (t.ultimateMin ?? 0));
                                const isAvailable = rankOk && hardOk && timedOk && ultimateOk;
                                const isActive = activeTheme === t.id;
                                const modeIcon = t.ultimateOnly ? '💀⏱️' : t.hardModeOnly ? '💀' : t.timedModeOnly ? '⏱️' : '';
                                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                                const swatchColor = isLight ? t.lightColor : t.color;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => isAvailable && onThemeChange(t)}
                                        title={`${t.name}${modeIcon ? ` ${modeIcon}` : ''}${!isAvailable ? ' (locked)' : ''}`}
                                        className={`w-8 h-8 rounded-full border-2 transition-all relative ${isActive ? 'border-[var(--color-gold)] scale-110' :
                                            isAvailable ? 'border-[rgb(var(--color-fg))]/20 hover:border-[rgb(var(--color-fg))]/40' :
                                                'border-[rgb(var(--color-fg))]/8 opacity-40 cursor-not-allowed'
                                            }`}
                                        style={{ backgroundColor: swatchColor }}
                                    >
                                        {modeIcon && !isAvailable && (
                                            <span className="absolute -top-1 -right-1 text-[8px]">{modeIcon}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Swipe Trails */}
                    <div className="w-full max-w-sm mt-6">
                        <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-3">
                            SWIPE TRAIL
                        </div>
                        <div className="flex justify-center gap-2.5 flex-wrap">
                            {SWIPE_TRAILS.map(t => {
                                const rankIdx = RANKS.findIndex(r => r.name === rank.name);
                                const isUnlocked =
                                    (!t.minLevel || rankIdx >= t.minLevel - 1) &&
                                    (!t.minStreak || stats.bestStreak >= t.minStreak) &&
                                    (!t.hardModeOnly || stats.hardModeSessions > 0) &&
                                    (!t.timedModeOnly || stats.timedModeSessions > 0) &&
                                    (!t.ultimateOnly || stats.ultimateSessions > 0);

                                const isActive = (activeTrailId || 'chalk-dust') === t.id;

                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => isUnlocked && onTrailChange(t.id)}
                                        title={`${t.name}${!isUnlocked ? ' (Locked)' : ''}`}
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
            )}

                </div>
            </motion.div>

            {/* Rank list modal */}
            <AnimatePresence>
                {showRanks && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-[var(--color-overlay-dim)] z-50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRanks(false)}
                        />
                        <motion.div
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--color-overlay)] border border-[rgb(var(--color-fg))]/15 rounded-2xl px-5 py-5 max-h-[75vh] overflow-y-auto w-[300px]"
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{ duration: 0.15 }}
                        >
                            <h3 className="text-lg chalk text-[var(--color-gold)] text-center mb-4">Ranks</h3>
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
                                                    isReached ? 'text-[rgb(var(--color-fg))]/70' : 'text-[rgb(var(--color-fg))]/30'
                                                    }`}>
                                                    {r.name}
                                                    {isCurrent && <span className="ml-1 text-xs">← you</span>}
                                                </div>
                                                <div className="text-[11px] ui text-[rgb(var(--color-fg))]/25">
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
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Reset confirmation modal */}
            <AnimatePresence>
                {resetConfirm && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-[var(--color-overlay-dim)] z-50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setResetConfirm(null)}
                        />
                        <motion.div
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--color-overlay)] border border-[rgb(var(--color-fg))]/15 rounded-2xl px-6 py-6 w-[280px] text-center"
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="text-4xl mb-3">🧹</div>
                            <p className="chalk text-[rgb(var(--color-fg))]/80 text-base leading-relaxed mb-6">
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
                                    onClick={() => { onReset(); setResetConfirm(null); }}
                                    className="flex-1 py-2.5 rounded-xl border border-[var(--color-streak-fire)]/40 bg-[var(--color-streak-fire)]/10 text-sm ui text-[var(--color-streak-fire)] hover:bg-[var(--color-streak-fire)]/20 transition-colors"
                                >
                                    reset
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Study Analytics modal */}
            <AnimatePresence>
                {showAnalytics && wordRecords && (
                    <StudyAnalyticsModal records={wordRecords} onClose={() => setShowAnalytics(false)} />
                )}
            </AnimatePresence>

            {/* Settings modal */}
            <AnimatePresence>
                {showSettings && (
                    <SettingsModal
                        themeMode={themeMode}
                        onThemeModeToggle={onThemeModeToggle}
                        grade={grade}
                        onGradeChange={onGradeChange}
                        dialect={dialect}
                        onDialectChange={onDialectChange}
                        onClose={() => setShowSettings(false)}
                    />
                )}
            </AnimatePresence>

            {/* Version */}
            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/15 mt-8 tracking-widest">
                v{__APP_VERSION__}
            </div>
        </div>
    );
});
