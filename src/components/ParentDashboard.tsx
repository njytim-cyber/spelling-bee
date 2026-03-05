/**
 * components/ParentDashboard.tsx
 *
 * Parent/teacher dashboard for Bee Team tier.
 * Shows summary cards for each learner profile with key metrics.
 * Accessible from MePage when in parent mode (activeProfileId === null).
 */
import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AvatarSvg } from './AvatarSvg';
import { DEFAULT_AVATAR } from '../utils/avatarParts';
import { STORAGE_KEYS } from '../config';
import type { LearnerProfile } from '../hooks/useProfiles';


interface Props {
    profiles: LearnerProfile[];
    onSwitchToProfile: (profileId: string) => void;
    onPrintReport: (profile: LearnerProfile, stats: LearnerStats) => void;
}

interface LearnerStats {
    totalXP: number;
    totalSolved: number;
    totalCorrect: number;
    bestStreak: number;
    sessionsPlayed: number;
    lastPlayedDate: string;
    dayStreak: number;
}

const DEFAULT_LEARNER_STATS: LearnerStats = {
    totalXP: 0, totalSolved: 0, totalCorrect: 0,
    bestStreak: 0, sessionsPlayed: 0, lastPlayedDate: '', dayStreak: 0,
};

/** Read a learner profile's stats from localStorage (separate storage per profile). */
function readProfileStats(profileId: string): LearnerStats {
    try {
        const key = `${STORAGE_KEYS.stats}-${profileId}`;
        const raw = localStorage.getItem(key);
        if (!raw) return DEFAULT_LEARNER_STATS;
        const parsed = JSON.parse(raw);
        return {
            totalXP: parsed.totalXP ?? 0,
            totalSolved: parsed.totalSolved ?? 0,
            totalCorrect: parsed.totalCorrect ?? 0,
            bestStreak: parsed.bestStreak ?? 0,
            sessionsPlayed: parsed.sessionsPlayed ?? 0,
            lastPlayedDate: parsed.lastPlayedDate ?? '',
            dayStreak: parsed.dayStreak ?? 0,
        };
    } catch {
        return DEFAULT_LEARNER_STATS;
    }
}

function formatLastPlayed(dateStr: string): string {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const ParentDashboard = memo(function ParentDashboard({
    profiles, onSwitchToProfile, onPrintReport,
}: Props) {
    const profileStats = useMemo(() =>
        profiles.map(p => ({ profile: p, stats: readProfileStats(p.id) })),
    [profiles]);

    if (profiles.length === 0) {
        return (
            <div className="w-full max-w-sm mt-4 text-center">
                <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
                <div className="text-sm ui font-semibold text-[rgb(var(--color-fg))]/60 mb-2">
                    Parent Dashboard
                </div>
                <div className="text-xs ui text-[rgb(var(--color-fg))]/40">
                    Add learner profiles using the &quot;+&quot; button above to track their progress here.
                </div>
            </div>
        );
    }

    // Aggregate stats
    const totalXP = profileStats.reduce((sum, ps) => sum + ps.stats.totalXP, 0);
    const totalWords = profileStats.reduce((sum, ps) => sum + ps.stats.totalSolved, 0);

    return (
        <div className="w-full max-w-sm mt-4">
            <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-3">
                Parent Dashboard
            </div>

            {/* Family summary */}
            <div className="flex items-center justify-center gap-6 mb-4 px-4 py-3 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/5">
                <div className="text-center">
                    <div className="text-lg chalk text-[var(--color-gold)]">{profiles.length}</div>
                    <div className="text-[9px] ui text-[rgb(var(--color-fg))]/40">Learners</div>
                </div>
                <div className="text-center">
                    <div className="text-lg chalk text-[rgb(var(--color-fg))]/70">{totalXP.toLocaleString()}</div>
                    <div className="text-[9px] ui text-[rgb(var(--color-fg))]/40">Total XP</div>
                </div>
                <div className="text-center">
                    <div className="text-lg chalk text-[rgb(var(--color-fg))]/70">{totalWords.toLocaleString()}</div>
                    <div className="text-[9px] ui text-[rgb(var(--color-fg))]/40">Words Spelled</div>
                </div>
            </div>

            {/* Per-learner cards */}
            <div className="space-y-2">
                {profileStats.map(({ profile, stats }, i) => {
                    const acc = stats.totalSolved > 0
                        ? Math.round((stats.totalCorrect / stats.totalSolved) * 100)
                        : 0;

                    return (
                        <motion.div
                            key={profile.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="px-4 py-3 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8 hover:border-[var(--color-gold)]/20 transition-colors"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 shrink-0">
                                    <AvatarSvg config={profile.avatarConfig || DEFAULT_AVATAR} size={32} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm ui font-semibold text-[rgb(var(--color-fg))]/70 truncate">
                                        {profile.name}
                                    </div>
                                    <div className="text-[9px] ui text-[rgb(var(--color-fg))]/35">
                                        {profile.level ? `Level ${profile.level.replace('level-', '')}` : 'No level set'} · Last: {formatLastPlayed(stats.lastPlayedDate)}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => onSwitchToProfile(profile.id)}
                                        className="px-2.5 py-1 rounded-lg bg-[var(--color-gold)]/10 text-[9px] ui font-semibold text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={() => onPrintReport(profile, stats)}
                                        className="px-2.5 py-1 rounded-lg bg-[rgb(var(--color-fg))]/5 text-[9px] ui text-[rgb(var(--color-fg))]/40 hover:bg-[rgb(var(--color-fg))]/10 transition-colors"
                                    >
                                        🖨️
                                    </button>
                                </div>
                            </div>

                            {/* Stats row */}
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div>
                                    <div className="text-sm chalk text-[var(--color-gold)]">{stats.totalXP.toLocaleString()}</div>
                                    <div className="text-[8px] ui text-[rgb(var(--color-fg))]/30">XP</div>
                                </div>
                                <div>
                                    <div className="text-sm chalk text-[rgb(var(--color-fg))]/60">{stats.totalSolved}</div>
                                    <div className="text-[8px] ui text-[rgb(var(--color-fg))]/30">Words</div>
                                </div>
                                <div>
                                    <div className="text-sm chalk text-[var(--color-correct)]">{acc}%</div>
                                    <div className="text-[8px] ui text-[rgb(var(--color-fg))]/30">Accuracy</div>
                                </div>
                                <div>
                                    <div className="text-sm chalk text-[var(--color-streak-fire)]">{stats.bestStreak}🔥</div>
                                    <div className="text-[8px] ui text-[rgb(var(--color-fg))]/30">Streak</div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
});
