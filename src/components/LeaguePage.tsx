import { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy, limit, onSnapshot, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { getThemeColor } from '../utils/chalkThemes';
import { AchievementBadge } from './AchievementBadge';
import { AvatarSvg } from './AvatarSvg';
import { IconCrown, IconMedal, IconStar, IconShare } from './Icons';
import { useUser } from '../contexts/UserContext';
import { appendReferralFooter, shareOrCopy } from '../utils/shareHelper';
import { getWeeklyLabel } from '../utils/weeklyTournament';
import { WordGamesSection } from './WordGamesSection';
import type { WordGameId } from './WordGamesSection';
import { getRank, getMasteryInfo } from '../utils/ranks';
import { EVERY_SPELLING_ACHIEVEMENT } from '../domains/spelling/spellingAchievements';


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
    stickFigureStyle?: string;
    rank?: number;
    isYou?: boolean;
}

type LeaderboardTab = 'allTime' | 'weekly';

/** NPC entries to fill the board when real players are sparse */
const NPC_ENTRIES: LeaderboardEntry[] = [
    { uid: 'npc-1', displayName: 'SpellMaster99', totalXP: 8420, weeklyXP: 640, bestStreak: 42, accuracy: 91, stickFigureStyle: 'h0-r2-e1-b3-c4-a0-f0' },
    { uid: 'npc-2', displayName: 'WordNinja', totalXP: 6150, weeklyXP: 510, bestStreak: 35, accuracy: 88, stickFigureStyle: 'h2-r4-e3-b1-c2-a1-f0' },
    { uid: 'npc-3', displayName: 'BeeChamp', totalXP: 4800, weeklyXP: 380, bestStreak: 28, accuracy: 85, stickFigureStyle: 'h1-r0-e4-b2-c1-a3-f0' },
    { uid: 'npc-4', displayName: 'LetterBug', totalXP: 3200, weeklyXP: 270, bestStreak: 22, accuracy: 82, stickFigureStyle: 'h3-r1-e2-b0-c3-a2-f0' },
    { uid: 'npc-5', displayName: 'VocabHero', totalXP: 2100, weeklyXP: 190, bestStreak: 18, accuracy: 79, stickFigureStyle: 'h4-r3-e0-b4-c0-a4-f0' },
    { uid: 'npc-6', displayName: 'AlphaAce', totalXP: 1400, weeklyXP: 120, bestStreak: 15, accuracy: 76, stickFigureStyle: 'h0-r4-e3-b1-c2-a0-f0' },
    { uid: 'npc-7', displayName: 'QuizWhiz', totalXP: 900, weeklyXP: 80, bestStreak: 12, accuracy: 73, stickFigureStyle: 'h2-r1-e4-b3-c4-a1-f0' },
    { uid: 'npc-8', displayName: 'Bookworm42', totalXP: 550, weeklyXP: 45, bestStreak: 9, accuracy: 70, stickFigureStyle: 'h1-r3-e1-b2-c0-a3-f0' },
    { uid: 'npc-9', displayName: 'TinyTypist', totalXP: 280, weeklyXP: 20, bestStreak: 6, accuracy: 65, stickFigureStyle: 'h3-r2-e0-b4-c1-a2-f0' },
    { uid: 'npc-10', displayName: 'NewBee', totalXP: 80, weeklyXP: 10, bestStreak: 3, accuracy: 60, stickFigureStyle: 'h4-r0-e2-b0-c3-a4-f0' },
];

/** Top-50 cutoff constant */
const TOP_N = 50;

interface ProfileData {
    achievements: string[];
    totalSolved: number;
    dayStreak: number;
    isPremium: boolean;
}

interface Props {
    userXP: number;
    userWeeklyXP: number;
    userStreak: number;
    userAccuracy: number;
    uid: string | null;
    displayName: string;
    activeThemeId: string;
    activeCostume: string;
    onOpenBee?: () => void;
    onWeeklyTournament?: () => void;
    onCertificate?: (weekLabel: string, xpEarned: number) => void;
    onOpenFriends?: () => void;
    friendPendingCount?: number;
    onWordGame?: (id: WordGameId) => void;
    onUpgrade?: () => void;
    isPremium?: boolean;
}


export const LeaguePage = memo(function LeaguePage({ userXP, userWeeklyXP, userStreak, userAccuracy, uid, displayName, activeThemeId, activeCostume, onOpenBee, onWeeklyTournament, onCertificate, onOpenFriends, friendPendingCount = 0, onWordGame, onUpgrade, isPremium: currentUserIsPremium }: Props) {
    const { referralCode } = useUser();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [lbTab, setLbTab] = useState<LeaderboardTab>('allTime');
    const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [lbExpanded, setLbExpanded] = useState(false);
    const [rankChange, setRankChange] = useState('');
    const prevRankRef = useRef<number | null>(null);
    const profileFetchRef = useRef<string | null>(null);

    // ── Score leaderboard query ──
    useEffect(() => {
        const q = query(
            collection(db, 'users'),
            where('totalXP', '>', 0),
            orderBy('totalXP', 'desc'),
            limit(TOP_N),
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
                stickFigureStyle: doc.data().stickFigureStyle || '',
            }));
            setEntries(data);
            setLoading(false);
        }, (err) => {
            console.warn('Leaderboard query failed:', err);
            setLoading(false);
        });
        return unsub;
    }, []);

    // ── Build score board with current user injected + NPC backfill (memoized) ──
    const scoreBoard = useMemo(() => {
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
        // Backfill with NPCs so the board never looks empty
        const realCount = list.length;
        if (realCount < 10) {
            const npcsNeeded = NPC_ENTRIES.filter(npc => !list.some(e => e.uid === npc.uid)).slice(0, 10 - realCount);
            list.push(...npcsNeeded);
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
    }, [entries, uid, displayName, userXP, userWeeklyXP, userStreak, userAccuracy, activeThemeId, activeCostume, lbTab]);

    // ── Display rows: collapsed (top 3 + neighborhood) vs expanded (top 50) ──
    const PODIUM = 3;
    const NEIGHBORHOOD = 3; // players above/below you
    const { displayRows, dividers } = useMemo(() => {
        if (lbExpanded) {
            // Expanded: show top 50, plus user if outside
            const userEntry = scoreBoard.find(e => e.isYou);
            const userRank = userEntry?.rank ?? 0;
            if (userRank > TOP_N && userEntry) {
                return {
                    displayRows: [...scoreBoard.slice(0, TOP_N), userEntry],
                    dividers: new Set([TOP_N]), // divider before user's row
                };
            }
            return { displayRows: scoreBoard.slice(0, TOP_N), dividers: new Set<number>() };
        }

        // Collapsed: top 3 + user's neighborhood
        const userEntry = scoreBoard.find(e => e.isYou);
        const userRank = userEntry?.rank ?? 0;

        // If user is in the top 3 (or no user), just show the podium
        if (!userEntry || userRank <= PODIUM) {
            return { displayRows: scoreBoard.slice(0, PODIUM), dividers: new Set<number>() };
        }

        const podium = scoreBoard.slice(0, PODIUM);
        // Neighborhood: 3 above, user, 3 below
        const hoodStart = Math.max(PODIUM, userRank - 1 - NEIGHBORHOOD);
        const hoodEnd = Math.min(scoreBoard.length, userRank + NEIGHBORHOOD);
        const hood = scoreBoard.slice(hoodStart, hoodEnd);

        // Is there a gap between podium and neighborhood?
        const needsDivider = hoodStart > PODIUM;
        const rows = needsDivider ? [...podium, ...hood] : scoreBoard.slice(0, hoodEnd);
        return {
            displayRows: rows,
            dividers: needsDivider ? new Set([PODIUM]) : new Set<number>(),
        };
    }, [scoreBoard, lbExpanded]);

    // ── Sticky self-row entry ──
    const myEntry = useMemo(() => scoreBoard.find(e => e.isYou) ?? null, [scoreBoard]);

    // ── Rank change detection ──
    const myRank = myEntry?.rank ?? null;
    useEffect(() => {
        if (myRank === null || prevRankRef.current === null) {
            prevRankRef.current = myRank;
            return;
        }
        const diff = prevRankRef.current - myRank;
        prevRankRef.current = myRank;
        if (diff > 0) {
            setRankChange(`🎉 +${diff} rank${diff > 1 ? 's' : ''}! You're now #${myRank}!`);
            const t = setTimeout(() => setRankChange(''), 5000);
            return () => clearTimeout(t);
        }
    }, [myRank]);

    // ── Fetch rich profile data on player tap ──
    const handleSelectPlayer = useCallback(async (entry: LeaderboardEntry) => {
        setSelectedPlayer(entry);
        setProfileData(null);
        setProfileLoading(true);
        const fetchUid = entry.uid;
        profileFetchRef.current = fetchUid;
        try {
            const snap = await getDoc(doc(db, 'users', fetchUid));
            if (profileFetchRef.current !== fetchUid) return; // stale
            if (snap.exists()) {
                const data = snap.data();
                setProfileData({
                    achievements: Array.isArray(data.achievements) ? data.achievements : [],
                    totalSolved: data.totalSolved || data.stats?.totalSolved || 0,
                    dayStreak: data.stats?.dayStreak || 0,
                    isPremium: data.championPassExpiry
                        ? new Date(data.championPassExpiry).getTime() > Date.now()
                        : false,
                });
            }
        } catch {
            // Silent — show what we already have from leaderboard data
        }
        if (profileFetchRef.current === fetchUid) setProfileLoading(false);
    }, []);

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

                {/* Friends (includes 1v1 challenge via friend rows) */}
                {onOpenFriends && (
                    <button
                        onClick={onOpenFriends}
                        className="w-full flex items-center gap-3 py-4 px-5 rounded-2xl border-2 border-[rgb(var(--color-fg))]/20 hover:border-[var(--color-gold)]/40 hover:bg-[var(--color-gold)]/5 transition-colors relative"
                    >
                        <span className="text-2xl">🤝</span>
                        <div className="text-left flex-1">
                            <div className="text-sm ui font-bold text-[var(--color-chalk)]">Friends</div>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">Buddy streaks, challenges & duels</div>
                        </div>
                        {friendPendingCount > 0 && (
                            <span className="absolute top-2 right-3 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                                {friendPendingCount}
                            </span>
                        )}
                    </button>
                )}

                {/* Weekly Tournament */}
                {onWeeklyTournament && (
                    <button
                        onClick={onWeeklyTournament}
                        className="w-full flex items-center gap-3 py-4 px-5 rounded-2xl border-2 border-[rgb(var(--color-fg))]/20 hover:border-[var(--color-gold)]/40 hover:bg-[var(--color-gold)]/5 transition-colors"
                    >
                        <span className="text-2xl">🏅</span>
                        <div className="text-left flex-1">
                            <div className="text-sm ui font-bold text-[var(--color-chalk)]">Weekly Tournament</div>
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{getWeeklyLabel()} · 25 words · same for everyone</div>
                        </div>
                    </button>
                )}

            </div>

            {/* Word Games grid */}
            {onWordGame && <WordGamesSection onSelectGame={onWordGame} />}

            {/* Leaderboard header + tab toggle */}
            <div className="w-full max-w-sm mb-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm ui font-bold text-[rgb(var(--color-fg))]/50 uppercase tracking-wider">Leaderboard</h3>
                    <div className="flex rounded-lg overflow-hidden border border-[rgb(var(--color-fg))]/10">
                        {(['allTime', 'weekly'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setLbTab(tab)}
                                className={`px-3 py-1 text-[10px] ui font-semibold transition-colors ${lbTab === tab
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
            {!loading && displayRows.length > 0 && (
                <div className="w-full max-w-sm relative">
                    <motion.div
                        className={lbExpanded ? 'max-h-[60vh] overflow-y-auto pb-16' : ''}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        {displayRows.map((entry, i) => (
                            <div key={entry.uid}>
                                {/* Divider between sections (podium/neighborhood gap, or top-50/user gap) */}
                                {dividers.has(i) && (
                                    <div className="flex items-center justify-center py-2 my-1">
                                        <div className="flex-1 border-t border-dashed border-[rgb(var(--color-fg))]/10" />
                                        <span className="px-3 text-[10px] ui text-[rgb(var(--color-fg))]/25">...</span>
                                        <div className="flex-1 border-t border-dashed border-[rgb(var(--color-fg))]/10" />
                                    </div>
                                )}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: Math.min(i, 10) * 0.04 }}
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

                                    {/* Avatar & Name */}
                                    <div className="flex-1 min-w-0 flex items-center gap-1.5" onClick={() => !entry.isYou && !entry.uid.startsWith('npc-') && handleSelectPlayer(entry)}>
                                        <AvatarSvg
                                            config={entry.stickFigureStyle}
                                            size={28}
                                            className="flex-shrink-0"
                                            style={{ color: getThemeColor(entry.activeThemeId) || 'var(--color-chalk)' }}
                                        />
                                        <div
                                            className={`text-sm ui font-semibold truncate ${entry.isYou ? '' : 'text-[rgb(var(--color-fg))]/90'}`}
                                            style={entry.activeThemeId ? { color: getThemeColor(entry.activeThemeId) } : undefined}
                                        >
                                            {entry.displayName}
                                            {entry.isYou && <span className="ml-1 text-xs opacity-50" style={{ color: 'rgb(var(--color-fg))' }}>(you)</span>}
                                        </div>
                                    </div>

                                    {/* Score + streak */}
                                    <div className={`text-sm ui font-semibold text-right tabular-nums ${entry.isYou ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/80'}`}>
                                        {(lbTab === 'weekly' ? entry.weeklyXP : entry.totalXP).toLocaleString()}
                                    </div>
                                    <div className="text-xs ui font-semibold text-[var(--color-streak-fire)] text-right w-8">
                                        {entry.bestStreak > 0 ? `${entry.bestStreak}🔥` : '—'}
                                    </div>
                                    {/* Share — only on user's row, same width as streak col so rows stay aligned */}
                                    <div className="w-5 flex items-center justify-center">
                                        {entry.isYou ? (
                                            <button
                                                onClick={async () => {
                                                    const xp = lbTab === 'weekly' ? entry.weeklyXP : entry.totalXP;
                                                    if (entry.rank === 1 && onCertificate) {
                                                        onCertificate(getWeeklyLabel(), xp);
                                                        return;
                                                    }
                                                    const text = appendReferralFooter(
                                                        `📊 Ranked #${entry.rank} on Spelling Bee!\n⚡ ${xp.toLocaleString()} ${lbTab === 'weekly' ? 'weekly ' : ''}XP · 🔥 ${entry.bestStreak} streak · 🎯 ${entry.accuracy}%`,
                                                        referralCode,
                                                    );
                                                    await shareOrCopy(text);
                                                }}
                                                className="text-[rgb(var(--color-fg))]/20 hover:text-[var(--color-gold)] transition-colors"
                                                aria-label="Share my rank"
                                            >
                                                <IconShare className="w-3.5 h-3.5" />
                                            </button>
                                        ) : null}
                                    </div>
                                </motion.div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Show all / Show less toggle */}
                    {scoreBoard.length > PODIUM + 1 && (
                        <button
                            onClick={() => setLbExpanded(prev => !prev)}
                            className="w-full py-2 mt-1 text-[10px] ui font-semibold text-[rgb(var(--color-fg))]/35 hover:text-[var(--color-gold)] transition-colors"
                        >
                            {lbExpanded ? 'Show less' : `Show all (top ${Math.min(scoreBoard.length, TOP_N)})`}
                        </button>
                    )}

                    {/* Sticky self-row — visible when expanded and list is long */}
                    {lbExpanded && myEntry && (
                        <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-surface)]/95 backdrop-blur-md border-t border-[var(--color-gold)]/20 rounded-b-xl">
                            <div className="flex items-center gap-3 py-3 px-3 bg-[var(--color-gold)]/10 rounded-xl">
                                <div className="w-7 flex items-center justify-center text-[var(--color-gold)]">
                                    <span className="ui font-bold text-lg">{myEntry.rank}</span>
                                </div>
                                <AvatarSvg
                                    config={myEntry.stickFigureStyle}
                                    size={28}
                                    className="flex-shrink-0"
                                    style={{ color: getThemeColor(myEntry.activeThemeId) || 'var(--color-chalk)' }}
                                />
                                <div className="flex-1 min-w-0 text-sm ui font-semibold truncate" style={myEntry.activeThemeId ? { color: getThemeColor(myEntry.activeThemeId) } : undefined}>
                                    {myEntry.displayName}
                                    <span className="ml-1 text-xs opacity-50" style={{ color: 'rgb(var(--color-fg))' }}>(you)</span>
                                </div>
                                <div className="text-sm ui font-semibold text-right tabular-nums text-[var(--color-gold)]">
                                    {(lbTab === 'weekly' ? myEntry.weeklyXP : myEntry.totalXP).toLocaleString()}
                                </div>
                                <div className="text-xs ui font-semibold text-[var(--color-streak-fire)] text-right w-8">
                                    {myEntry.bestStreak > 0 ? `${myEntry.bestStreak}🔥` : '—'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Player Profile Modal */}
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
                            className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] backdrop-blur-md border-t border-[var(--color-gold)]/20 rounded-t-3xl p-6 z-50 pb-[calc(env(safe-area-inset-bottom,20px)+80px)] max-h-[85vh] overflow-y-auto"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                            {/* Drag handle */}
                            <div className="w-10 h-1 rounded-full bg-[rgb(var(--color-fg))]/15 mx-auto mb-4" />

                            {/* Header — avatar + name + rank + badge */}
                            <div className="flex items-center gap-4 mb-3">
                                <AvatarSvg
                                    config={selectedPlayer.stickFigureStyle}
                                    size={64}
                                    animate
                                    style={{ color: getThemeColor(selectedPlayer.activeThemeId) || 'var(--color-chalk)' }}
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3
                                            className="text-lg ui font-bold"
                                            style={{ color: getThemeColor(selectedPlayer.activeThemeId) || 'rgb(var(--color-fg))' }}
                                        >
                                            {selectedPlayer.displayName}
                                        </h3>
                                        {selectedPlayer.activeBadgeId && (
                                            <div className="w-5 h-5">
                                                <AchievementBadge achievementId={selectedPlayer.activeBadgeId} unlocked={true} name="" desc="" />
                                            </div>
                                        )}
                                    </div>
                                    {/* Rank title with emoji */}
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-sm">{getRank(selectedPlayer.totalXP).rank.emoji}</span>
                                        <span className="text-xs ui font-semibold text-[var(--color-gold)]">
                                            {getRank(selectedPlayer.totalXP).rank.name}
                                        </span>
                                        {getMasteryInfo(selectedPlayer.totalXP) && (
                                            <span className="text-[10px] ui text-[var(--color-gold)]/60">
                                                ML{getMasteryInfo(selectedPlayer.totalXP)!.level}
                                            </span>
                                        )}
                                        <span className="text-xs ui text-[rgb(var(--color-fg))]/30">· #{selectedPlayer.rank}</span>
                                    </div>
                                </div>
                            </div>

                            {/* XP progress bar */}
                            {(() => {
                                const { nextRank, progress } = getRank(selectedPlayer.totalXP);
                                const mastery = getMasteryInfo(selectedPlayer.totalXP);
                                const prog = mastery ? mastery.progress : progress;
                                const nextLabel = mastery
                                    ? `Mastery ${mastery.level + 1} at ${mastery.xpForNext.toLocaleString()}`
                                    : nextRank
                                        ? `${nextRank.name} at ${nextRank.xp.toLocaleString()}`
                                        : null;
                                return (
                                    <div className="mb-4">
                                        <div className="h-1.5 rounded-full bg-[rgb(var(--color-fg))]/10 overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full bg-[var(--color-gold)]"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.round(prog * 100)}%` }}
                                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[9px] ui text-[rgb(var(--color-fg))]/30 mt-1">
                                            <span>{selectedPlayer.totalXP.toLocaleString()} XP</span>
                                            {nextLabel && <span>{nextLabel}</span>}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Stats grid (2×3) */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {[
                                    { label: 'Total XP', value: selectedPlayer.totalXP.toLocaleString() },
                                    { label: 'Best Streak', value: `${selectedPlayer.bestStreak}×` },
                                    { label: 'Accuracy', value: `${selectedPlayer.accuracy}%` },
                                    { label: 'Words Solved', value: profileData ? profileData.totalSolved.toLocaleString() : '...' },
                                    { label: 'This Week', value: selectedPlayer.weeklyXP.toLocaleString() + ' XP' },
                                    { label: 'Day Streak', value: profileData ? `${profileData.dayStreak}d` : '...' },
                                ].map(s => (
                                    <div key={s.label} className="py-2 px-2 rounded-xl bg-[rgb(var(--color-fg))]/[0.04] text-center">
                                        <div className="text-sm ui font-bold text-[rgb(var(--color-fg))]/70">{s.value}</div>
                                        <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Achievement gallery */}
                            {profileLoading && (
                                <div className="flex justify-center py-3 mb-4">
                                    <div className="w-5 h-5 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin" />
                                </div>
                            )}
                            {profileData && profileData.achievements.length > 0 && (
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40 uppercase tracking-wider">
                                            Achievements
                                        </span>
                                        <span className="text-[10px] ui text-[var(--color-gold)]">
                                            {profileData.achievements.length}/{EVERY_SPELLING_ACHIEVEMENT.length}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                                        {profileData.achievements.map((id, i) => {
                                            const achievement = EVERY_SPELLING_ACHIEVEMENT.find(a => a.id === id);
                                            if (!achievement) return null;
                                            return (
                                                <motion.div
                                                    key={id}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: i * 0.05, duration: 0.2 }}
                                                    className="flex-shrink-0"
                                                >
                                                    <AchievementBadge
                                                        achievementId={id}
                                                        unlocked={true}
                                                        name={achievement.name}
                                                        desc={achievement.desc}
                                                    />
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {profileData && profileData.achievements.length === 0 && !profileLoading && (
                                <div className="text-center text-[10px] ui text-[rgb(var(--color-fg))]/25 mb-4">
                                    No achievements yet
                                </div>
                            )}

                            {/* Premium inspiration CTA */}
                            {onUpgrade && !currentUserIsPremium && profileData?.isPremium && (
                                <motion.button
                                    onClick={() => { setSelectedPlayer(null); onUpgrade(); }}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="w-full mt-4 py-3 rounded-xl border border-[var(--color-gold)]/20 bg-[var(--color-gold)]/5 text-center"
                                >
                                    <div className="text-xs ui text-[var(--color-gold)] font-semibold">
                                        Unlock Champion Pass
                                    </div>
                                    <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30 mt-0.5">
                                        All levels, premium styles & more
                                    </div>
                                </motion.button>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Rank change toast — tap to dismiss */}
            <AnimatePresence>
                {rankChange && (
                    <motion.div
                        key={rankChange}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        onClick={() => setRankChange('')}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-overlay)] border border-[var(--color-gold)]/30 rounded-2xl px-6 py-4 text-center cursor-pointer"
                    >
                        <div className="text-base ui font-bold text-[var(--color-gold)]">
                            {rankChange}
                        </div>
                        <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30 mt-1">tap to dismiss</div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
});
