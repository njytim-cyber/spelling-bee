import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy, limit, onSnapshot, where, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { getThemeColor } from '../utils/chalkThemes';
import { COSTUMES } from '../utils/costumes';
import { AchievementBadge } from './AchievementBadge';

interface LeaderboardEntry {
    uid: string;
    displayName: string;
    totalXP: number;
    bestStreak: number;
    bestSpeedrunTime?: number;
    activeThemeId?: string;
    activeCostume?: string;
    activeBadgeId?: string;
    rank?: number;
    isYou?: boolean;
}

type LeagueTab = 'score' | 'speedrun';

interface Props {
    userXP: number;
    userStreak: number;
    uid: string | null;
    displayName: string;
    activeThemeId: string;
    activeCostume: string;
    bestSpeedrunTime?: number;
    speedrunHardMode?: boolean;
    onStartSpeedrun?: () => void;
}

function formatTime(ms: number): string {
    const totalSeconds = ms / 1000;
    if (totalSeconds < 60) return `${totalSeconds.toFixed(2)}s`;
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export const LeaguePage = memo(function LeaguePage({ userXP, userStreak, uid, displayName, activeThemeId, activeCostume, bestSpeedrunTime, speedrunHardMode, onStartSpeedrun }: Props) {
    const [tab, setTab] = useState<LeagueTab>('score');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [speedrunEntries, setSpeedrunEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [speedrunLoading, setSpeedrunLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null);
    const [pingCooldown, setPingCooldown] = useState(false);
    const [pingSuccess, setPingSuccess] = useState('');
    const pingSuccessTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const pingCooldownTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Clean up ping timers on unmount
    useEffect(() => () => {
        clearTimeout(pingSuccessTimer.current);
        clearTimeout(pingCooldownTimer.current);
    }, []);

    const handleAction = useCallback(async (action: 'race' | 'ping') => {
        if (!selectedPlayer) return;
        if (action === 'race') {
            window.location.search = `?c=ghost-${selectedPlayer.uid}`;
        } else if (action === 'ping') {
            if (pingCooldown) return;
            setPingCooldown(true);
            try {
                await addDoc(collection(db, 'pings'), {
                    targetUid: selectedPlayer.uid,
                    senderUid: uid || 'anonymous',
                    senderName: displayName || 'Someone',
                    createdAt: serverTimestamp(),
                    read: false
                });
                // Record lastPingAt so Firestore rule can enforce 30s server-side cooldown
                if (uid) {
                    setDoc(doc(db, 'users', uid), { lastPingAt: serverTimestamp() }, { merge: true })
                        .catch(() => { /* silent */ });
                }
                const name = selectedPlayer.displayName;
                setSelectedPlayer(null);
                setPingSuccess(`Pinged ${name}! 👋`);
                pingSuccessTimer.current = setTimeout(() => setPingSuccess(''), 3000);
            } catch {
                setSelectedPlayer(null);
            }
            // Match the 30s server-side rule cooldown
            pingCooldownTimer.current = setTimeout(() => setPingCooldown(false), 30000);
        }
    }, [selectedPlayer, pingCooldown, uid, displayName]);

    // ── Score leaderboard query ──
    useEffect(() => {
        const q = query(
            collection(db, 'users'),
            where('totalXP', '>', 0),
            orderBy('totalXP', 'desc'),
            limit(20),
        );
        const unsub = onSnapshot(q, (snap) => {
            const data: LeaderboardEntry[] = snap.docs.map(doc => ({
                uid: doc.id,
                displayName: doc.data().displayName || 'Anonymous',
                totalXP: doc.data().totalXP || 0,
                bestStreak: doc.data().bestStreak || 0,
                bestSpeedrunTime: doc.data().bestSpeedrunTime || 0,
                activeThemeId: doc.data().activeThemeId || 'classic',
                activeCostume: doc.data().activeCostume || '',
                activeBadgeId: doc.data().activeBadgeId || '',
            }));
            setEntries(data);
            setLoading(false);
        }, (err) => {
            console.warn('Leaderboard query failed:', err);
            setLoading(false);
        });
        return unsub;
    }, []);

    // ── Speedrun leaderboard query ──
    useEffect(() => {
        const q = query(
            collection(db, 'users'),
            where('bestSpeedrunTime', '>', 0),
            orderBy('bestSpeedrunTime', 'asc'),
            limit(10),
        );
        const unsub = onSnapshot(q, (snap) => {
            const data: LeaderboardEntry[] = snap.docs.map(doc => ({
                uid: doc.id,
                displayName: doc.data().displayName || 'Anonymous',
                totalXP: doc.data().totalXP || 0,
                bestStreak: doc.data().bestStreak || 0,
                bestSpeedrunTime: doc.data().bestSpeedrunTime || 0,
                activeThemeId: doc.data().activeThemeId || 'classic',
                activeCostume: doc.data().activeCostume || '',
                activeBadgeId: doc.data().activeBadgeId || '',
            }));
            setSpeedrunEntries(data);
            setSpeedrunLoading(false);
        }, (err) => {
            console.warn('Speedrun leaderboard query failed:', err);
            setSpeedrunLoading(false);
        });
        return unsub;
    }, []);

    // ── Build score board with current user injected ──
    const scoreBoard = (() => {
        let list = [...entries];
        const userIdx = uid ? list.findIndex(e => e.uid === uid) : -1;
        if (userIdx === -1 && uid) {
            list.push({
                uid, displayName: displayName || 'You', totalXP: userXP, bestStreak: userStreak,
                activeThemeId, activeCostume, bestSpeedrunTime: bestSpeedrunTime || 0,
            });
        } else if (userIdx >= 0) {
            list = list.map((e, i) => i === userIdx ? {
                ...e,
                totalXP: Math.max(e.totalXP, userXP),
                bestStreak: Math.max(e.bestStreak, userStreak),
                activeThemeId,
                activeCostume,
            } : e);
        }
        return list
            .sort((a, b) => b.totalXP - a.totalXP)
            .map((e, i) => ({ ...e, rank: i + 1, isYou: e.uid === uid }));
    })();

    // ── Build speedrun board with current user injected ──
    const speedrunBoard = (() => {
        const list = [...speedrunEntries];
        const userInList = uid ? list.find(e => e.uid === uid) : null;
        if (!userInList && uid && bestSpeedrunTime && bestSpeedrunTime > 0) {
            list.push({
                uid, displayName: displayName || 'You', totalXP: userXP, bestStreak: userStreak,
                activeThemeId, activeCostume, bestSpeedrunTime,
            });
        } else if (userInList && bestSpeedrunTime) {
            userInList.bestSpeedrunTime = Math.min(userInList.bestSpeedrunTime || Infinity, bestSpeedrunTime);
        }
        return list
            .sort((a, b) => (a.bestSpeedrunTime || Infinity) - (b.bestSpeedrunTime || Infinity))
            .map((e, i) => ({ ...e, rank: i + 1, isYou: e.uid === uid }));
    })();

    const isLoading = tab === 'score' ? loading : speedrunLoading;
    const board = tab === 'score' ? scoreBoard : speedrunBoard;

    return (
        <div className="flex-1 flex flex-col items-center px-4 pt-[calc(env(safe-area-inset-top,16px)+40px)] pb-24 overflow-y-auto">
            {/* Header */}
            <motion.div
                className="text-center mb-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2 className="text-3xl chalk text-[var(--color-gold)] mb-1">League</h2>
                <p className="text-xs ui text-[rgb(var(--color-fg))]/30">Global leaderboard</p>
            </motion.div>

            {/* Tab Toggle */}
            <div className="flex gap-1 mb-4 p-1 bg-[rgb(var(--color-fg))]/5 rounded-xl w-full max-w-xs">
                <button
                    onClick={() => setTab('score')}
                    className={`flex-1 py-2 rounded-lg text-xs ui font-semibold transition-all duration-200 ${tab === 'score'
                        ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)] shadow-sm'
                        : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60'
                        }`}
                >
                    ⚡ Score
                </button>
                <button
                    onClick={() => setTab('speedrun')}
                    className={`flex-1 py-2 rounded-lg text-xs ui font-semibold transition-all duration-200 ${tab === 'speedrun'
                        ? 'bg-[#FF00FF]/15 text-[#FF00FF] shadow-sm'
                        : 'text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60'
                        }`}
                >
                    ⏱️ Speedrun
                </button>
            </div>

            {/* Start Speedrun CTA (only on speedrun tab) */}
            {tab === 'speedrun' && onStartSpeedrun && (
                <motion.button
                    onClick={onStartSpeedrun}
                    className="w-full max-w-xs mb-4 py-3 rounded-xl ui font-bold text-sm bg-gradient-to-r from-[#FF00FF]/20 to-[#00FFFF]/20 border border-[#FF00FF]/30 text-[#FF00FF] active:scale-95 transition-transform"
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    ⏱️ Start Speedrun (10 Questions)
                </motion.button>
            )}

            {/* Your best time badge */}
            {tab === 'speedrun' && bestSpeedrunTime != null && bestSpeedrunTime > 0 && (
                <div className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-3">
                    Your best: <span className="text-[#FF00FF] font-semibold">{formatTime(bestSpeedrunTime)}</span>{speedrunHardMode && <span title="Hard Mode"> 💀</span>}
                </div>
            )}

            {/* Loading state */}
            {isLoading && (
                <div className="flex-1 flex items-center justify-center">
                    <motion.div
                        className="text-sm ui text-[rgb(var(--color-fg))]/30"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        Loading leaderboard...
                    </motion.div>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && board.length === 0 && (
                <div className="text-sm ui text-[rgb(var(--color-fg))]/30 mt-8 text-center">
                    {tab === 'speedrun'
                        ? 'No speedrun times yet. Be the first! ⏱️'
                        : 'No players yet. Be the first! 🎮'}
                </div>
            )}

            {/* Leaderboard */}
            <AnimatePresence mode="wait">
                {!isLoading && (
                    <motion.div
                        key={tab}
                        className="w-full max-w-sm"
                        initial={{ opacity: 0, x: tab === 'speedrun' ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: tab === 'speedrun' ? -20 : 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {board.map((entry, i) => (
                            <motion.div
                                key={entry.uid}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className={`flex items-center gap-3 py-3 px-3 rounded-xl mb-1 ${entry.isYou
                                    ? 'bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20'
                                    : ''
                                    }`}
                            >
                                {/* Rank */}
                                <div className={`w-7 text-center ui font-bold text-lg ${entry.rank === 1 ? 'text-[var(--color-gold)]' :
                                    entry.rank === 2 ? 'text-[rgb(var(--color-fg))]/60' :
                                        entry.rank === 3 ? 'text-[var(--color-streak-fire)]' :
                                            'text-[rgb(var(--color-fg))]/30'
                                    }`}>
                                    {entry.rank === 1 ? '👑' : entry.rank === 2 ? '⚡' : entry.rank === 3 ? '🔥' : entry.rank}
                                </div>

                                {/* Name & Cosmetic & Badge */}
                                <div className="flex-1 min-w-0 flex items-center gap-1.5" onClick={() => !entry.isYou && setSelectedPlayer(entry)}>
                                    {entry.activeBadgeId && (
                                        <div className="flex-shrink-0 w-[18px] h-[18px]">
                                            <AchievementBadge achievementId={entry.activeBadgeId} unlocked={true} name="" desc="" />
                                        </div>
                                    )}
                                    <div
                                        className={`text-sm ui font-semibold truncate ${entry.isYou ? '' : 'text-[rgb(var(--color-fg))]/70'}`}
                                        style={entry.activeThemeId ? { color: getThemeColor(entry.activeThemeId) } : undefined}
                                    >
                                        {entry.displayName}
                                        {entry.isYou && <span className="ml-1 text-xs opacity-50" style={{ color: 'rgb(var(--color-fg))' }}>(you)</span>}
                                    </div>
                                    {entry.activeCostume && COSTUMES[entry.activeCostume] && (
                                        <svg viewBox="0 0 100 160" className="w-[14px] h-[22px] flex-shrink-0" style={{ color: getThemeColor(entry.activeThemeId) || 'var(--color-chalk)' }}>
                                            {COSTUMES[entry.activeCostume]}
                                        </svg>
                                    )}
                                </div>

                                {/* Score or Time */}
                                {tab === 'score' ? (
                                    <>
                                        <div className="text-right">
                                            <div className={`text-sm ui font-semibold ${entry.isYou ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/50'}`}>
                                                {entry.totalXP.toLocaleString()}
                                            </div>
                                            <div className="text-[9px] ui text-[rgb(var(--color-fg))]/20">XP</div>
                                        </div>
                                        <div className="text-right w-10">
                                            <div className="text-xs ui font-semibold text-[var(--color-streak-fire)]">
                                                {entry.bestStreak > 0 ? `${entry.bestStreak}🔥` : '—'}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-right">
                                        <div className={`text-sm ui font-semibold tabular-nums ${entry.isYou ? 'text-[#FF00FF]' : 'text-[#FF00FF]/70'}`}>
                                            {entry.bestSpeedrunTime ? formatTime(entry.bestSpeedrunTime) : '—'}
                                        </div>
                                        <div className="text-[9px] ui text-[rgb(var(--color-fg))]/20">time</div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Sheet Modal */}
            <AnimatePresence>
                {selectedPlayer && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-[var(--color-overlay)] z-40 backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedPlayer(null)}
                        />
                        <motion.div
                            className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] backdrop-blur-md border-t border-[var(--color-gold)]/20 rounded-t-3xl p-6 z-50 pb-[calc(env(safe-area-inset-bottom,20px)+80px)]"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                {selectedPlayer.activeCostume && COSTUMES[selectedPlayer.activeCostume] ? (
                                    <svg viewBox="0 0 100 160" className="w-[28px] h-[44px]" style={{ color: getThemeColor(selectedPlayer.activeThemeId) || 'var(--color-chalk)' }}>
                                        {COSTUMES[selectedPlayer.activeCostume]}
                                    </svg>
                                ) : (
                                    <div className="w-[28px] h-[44px] flex items-center justify-center text-xl">👤</div>
                                )}
                                <div>
                                    <h3
                                        className="text-lg ui font-bold"
                                        style={{ color: getThemeColor(selectedPlayer.activeThemeId) || 'rgb(var(--color-fg))' }}
                                    >
                                        {selectedPlayer.displayName}
                                    </h3>
                                    <p className="text-xs ui text-[rgb(var(--color-fg))]/40">Rank #{selectedPlayer.rank} • {selectedPlayer.totalXP.toLocaleString()} XP</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleAction('race')}
                                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold ui text-[#422006] bg-[var(--color-gold)] active:opacity-80 transition-opacity"
                                >
                                    <span>⚔️</span> Ghost Race
                                </button>
                                <button
                                    onClick={() => handleAction('ping')}
                                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold ui border border-[var(--color-gold)]/30 text-[var(--color-gold)] active:bg-[var(--color-gold)]/10 transition-colors"
                                >
                                    <span>👋</span> Ping Player
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Ping success toast */}
            <AnimatePresence>
                {pingSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-overlay)] border border-[var(--color-gold)]/30 rounded-2xl px-5 py-3 text-sm ui text-[var(--color-gold)]"
                    >
                        {pingSuccess}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
