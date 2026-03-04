import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy, limit, onSnapshot, where, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { getThemeColor } from '../utils/chalkThemes';
import { COSTUMES } from '../utils/costumes';
import { AchievementBadge } from './AchievementBadge';
import { IconCrown, IconMedal, IconStar } from './Icons';

interface LeaderboardEntry {
    uid: string;
    displayName: string;
    totalXP: number;
    weeklyXP: number;
    bestStreak: number;
    accuracy: number;
    activeThemeId?: string;
    activeCostume?: string;
    activeBadgeId?: string;
    rank?: number;
    isYou?: boolean;
}

type LeaderboardTab = 'allTime' | 'weekly';

interface Props {
    userXP: number;
    userWeeklyXP: number;
    userStreak: number;
    userAccuracy: number;
    uid: string | null;
    displayName: string;
    activeThemeId: string;
    activeCostume: string;
    onOpenMultiplayer?: () => void;
    onOpenBee?: () => void;
    onOpenWrittenTest?: () => void;
}


export const LeaguePage = memo(function LeaguePage({ userXP, userWeeklyXP, userStreak, userAccuracy, uid, displayName, activeThemeId, activeCostume, onOpenMultiplayer, onOpenBee, onOpenWrittenTest }: Props) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [lbTab, setLbTab] = useState<LeaderboardTab>('allTime');
    const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null);
    const [pingCooldown, setPingCooldown] = useState(false);
    const [pingCountdown, setPingCountdown] = useState(0);
    const [pingSuccess, setPingSuccess] = useState('');
    const [rankChange, setRankChange] = useState('');
    const prevRankRef = useRef<number | null>(null);
    const pingSuccessTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const pingCooldownTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const pingCountdownInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    // Clean up ping timers on unmount
    useEffect(() => () => {
        clearTimeout(pingSuccessTimer.current);
        clearTimeout(pingCooldownTimer.current);
        clearInterval(pingCountdownInterval.current);
    }, []);

    const handleAction = useCallback(async (action: 'race' | 'ping') => {
        if (!selectedPlayer) return;
        if (action === 'race') {
            const params = new URLSearchParams();
            params.set('c', `ghost-${selectedPlayer.uid}`);
            window.location.search = params.toString();
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
                setPingSuccess(`Pinged ${name}!`);
                pingSuccessTimer.current = setTimeout(() => setPingSuccess(''), 3000);
            } catch {
                setSelectedPlayer(null);
            }
            // Match the 30s server-side rule cooldown with visible countdown
            setPingCountdown(30);
            clearInterval(pingCountdownInterval.current);
            pingCountdownInterval.current = setInterval(() => {
                setPingCountdown(prev => {
                    if (prev <= 1) { clearInterval(pingCountdownInterval.current); return 0; }
                    return prev - 1;
                });
            }, 1000);
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
                weeklyXP: doc.data().weeklyXP || 0,
                bestStreak: doc.data().bestStreak || 0,
                accuracy: doc.data().accuracy || 0,
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

    // ── Build score board with current user injected ──
    const scoreBoard = (() => {
        let list = [...entries];
        const userIdx = uid ? list.findIndex(e => e.uid === uid) : -1;
        if (userIdx === -1 && uid) {
            list.push({
                uid, displayName: displayName || 'You', totalXP: userXP, weeklyXP: userWeeklyXP, bestStreak: userStreak,
                accuracy: userAccuracy, activeThemeId, activeCostume,
            });
        } else if (userIdx >= 0) {
            list = list.map((e, i) => i === userIdx ? {
                ...e,
                totalXP: Math.max(e.totalXP, userXP),
                weeklyXP: Math.max(e.weeklyXP, userWeeklyXP),
                bestStreak: Math.max(e.bestStreak, userStreak),
                accuracy: userAccuracy,
                activeThemeId,
                activeCostume,
            } : e);
        }
        return list
            .sort((a, b) =>
                lbTab === 'weekly' ? b.weeklyXP - a.weeklyXP :
                b.totalXP - a.totalXP
            )
            .filter(e =>
                lbTab === 'weekly' ? e.weeklyXP > 0 :
                true
            )
            .map((e, i) => ({ ...e, rank: i + 1, isYou: e.uid === uid }));
    })();

    // ── Rank change detection ──
    const myRank = scoreBoard.find(e => e.isYou)?.rank ?? null;
    useEffect(() => {
        if (myRank === null || prevRankRef.current === null) {
            prevRankRef.current = myRank;
            return;
        }
        const diff = prevRankRef.current - myRank;
        prevRankRef.current = myRank;
        if (diff > 0) {
            setRankChange(`📈 +${diff} rank${diff > 1 ? 's' : ''}! Now #${myRank}`);
            const t = setTimeout(() => setRankChange(''), 3000);
            return () => clearTimeout(t);
        }
    }, [myRank]);

    return (
        <div className="flex-1 flex flex-col items-center px-4 pt-[calc(env(safe-area-inset-top,16px)+40px)] pb-24 overflow-y-auto">
            {/* Header */}
            <motion.div
                className="text-center mb-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2 className="text-3xl chalk text-[var(--color-gold)] mb-3">Compete</h2>
            </motion.div>

            {/* Competition mode buttons */}
            <div className="w-full max-w-sm space-y-2 mb-6">
                {onOpenBee && (
                    <button
                        onClick={onOpenBee}
                        className="w-full flex items-center gap-3 py-4 px-5 rounded-2xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 hover:bg-[var(--color-gold)]/20 transition-colors"
                    >
                        <span className="text-2xl">🏆</span>
                        <div className="text-left flex-1">
                            <div className="text-sm ui font-bold text-[var(--color-gold)]">Spelling Bee</div>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">Compete against NPCs in a real spelling bee</div>
                        </div>
                    </button>
                )}

                <div className="flex gap-2">
                    {onOpenWrittenTest && (
                        <button
                            onClick={onOpenWrittenTest}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-[rgb(var(--color-fg))]/15 hover:border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/5 transition-colors"
                        >
                            <span className="text-sm">📋</span>
                            <span className="text-xs ui font-semibold text-[rgb(var(--color-fg))]/80">Written Test</span>
                        </button>
                    )}
                    {onOpenMultiplayer && (
                        <button
                            onClick={onOpenMultiplayer}
                            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 rounded-2xl border border-[rgb(var(--color-fg))]/15 hover:border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/5 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm">⚔️</span>
                                <span className="text-xs ui font-semibold text-[rgb(var(--color-fg))]/80">1v1 Match</span>
                            </div>
                            <span className="text-[9px] ui text-[rgb(var(--color-fg))]/35">Race a ghost of another player</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Leaderboard header + tab toggle */}
            <div className="w-full max-w-sm mb-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm ui font-bold text-[rgb(var(--color-fg))]/50 uppercase tracking-wider">Leaderboard</h3>
                    <div className="flex rounded-lg overflow-hidden border border-[rgb(var(--color-fg))]/10">
                        {(['allTime', 'weekly'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setLbTab(tab)}
                                className={`px-3 py-1 text-[10px] ui font-semibold transition-colors ${
                                    lbTab === tab
                                        ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)]'
                                        : 'text-[rgb(var(--color-fg))]/35 hover:text-[rgb(var(--color-fg))]/50'
                                }`}
                            >
                                {tab === 'allTime' ? 'All Time' : 'This Week'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Loading skeleton */}
            {loading && (
                <div className="w-full max-w-sm space-y-1">
                    {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="flex items-center gap-3 py-3 px-3 rounded-xl animate-pulse">
                            <div className="w-7 h-7 rounded-full bg-[rgb(var(--color-fg))]/8" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3.5 w-24 rounded bg-[rgb(var(--color-fg))]/8" />
                                <div className="h-2.5 w-16 rounded bg-[rgb(var(--color-fg))]/5" />
                            </div>
                            <div className="h-3.5 w-12 rounded bg-[rgb(var(--color-fg))]/8" />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!loading && scoreBoard.length === 0 && (
                <div className="flex flex-col items-center mt-8 text-center gap-2">
                    <span className="text-3xl">🏆</span>
                    <div className="text-sm ui text-[rgb(var(--color-fg))]/40">
                        No players yet — be the first!
                    </div>
                </div>
            )}

            {/* Leaderboard */}
            {!loading && (
                <motion.div
                    className="w-full max-w-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    {scoreBoard.map((entry, i) => (
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
                            <div className={`w-7 flex items-center justify-center ${entry.rank === 1 ? 'text-[var(--color-gold)]' :
                                entry.rank === 2 ? 'text-[rgb(var(--color-fg))]/60' :
                                    entry.rank === 3 ? 'text-[var(--color-streak-fire)]' :
                                        'text-[rgb(var(--color-fg))]/60'
                                }`}>
                                {entry.rank === 1 ? <IconCrown className="w-5 h-5" /> :
                                 entry.rank === 2 ? <IconMedal className="w-5 h-5" /> :
                                 entry.rank === 3 ? <IconStar className="w-5 h-5" /> :
                                 <span className="ui font-bold text-lg">{entry.rank}</span>}
                            </div>

                            {/* Name & Cosmetic & Badge */}
                            <div className="flex-1 min-w-0 flex items-center gap-1.5" onClick={() => !entry.isYou && setSelectedPlayer(entry)}>
                                {entry.activeBadgeId && (
                                    <div className="flex-shrink-0 w-[18px] h-[18px]">
                                        <AchievementBadge achievementId={entry.activeBadgeId} unlocked={true} name="" desc="" />
                                    </div>
                                )}
                                <div
                                    className={`text-sm ui font-semibold truncate ${entry.isYou ? '' : 'text-[rgb(var(--color-fg))]/90'}`}
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

                            {/* Score */}
                            <div className="text-right">
                                <div className={`text-sm ui font-semibold ${entry.isYou ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/80'}`}>
                                    {(lbTab === 'weekly' ? entry.weeklyXP : entry.totalXP).toLocaleString()}
                                </div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/40">
                                    {lbTab === 'weekly' ? 'wk' : 'XP'}
                                </div>
                            </div>
                            <div className="text-right w-10">
                                <div className="text-xs ui font-semibold text-[var(--color-streak-fire)]">
                                    {entry.bestStreak > 0 ? `${entry.bestStreak}🔥` : '—'}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

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
                                    <p className="text-xs ui text-[rgb(var(--color-fg))]/40">Rank #{selectedPlayer.rank} &bull; {selectedPlayer.totalXP.toLocaleString()} XP{selectedPlayer.weeklyXP > 0 ? ` · ${selectedPlayer.weeklyXP.toLocaleString()} this week` : ''}</p>
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
                                    disabled={pingCooldown}
                                    className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold ui border transition-colors ${
                                        pingCooldown
                                            ? 'border-[rgb(var(--color-fg))]/10 text-[rgb(var(--color-fg))]/25 cursor-not-allowed'
                                            : 'border-[var(--color-gold)]/30 text-[var(--color-gold)] active:bg-[var(--color-gold)]/10'
                                    }`}
                                >
                                    <span>👋</span> {pingCooldown ? `Wait ${pingCountdown}s` : 'Ping Player'}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Ping success / rank change toast */}
            <AnimatePresence>
                {(pingSuccess || rankChange) && (
                    <motion.div
                        key={pingSuccess || rankChange}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-overlay)] border border-[var(--color-gold)]/30 rounded-2xl px-5 py-3 text-sm ui text-[var(--color-gold)]"
                    >
                        {pingSuccess || rankChange}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
