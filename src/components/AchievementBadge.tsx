import { memo } from 'react';

/**
 * Hand-drawn chalk-style SVG badge icons.
 * All drawn with rough strokes, currentColor, matching the chalk-line aesthetic.
 */

interface BadgeProps {
    size?: number;
    unlocked: boolean;
}

const S = { stroke: 'currentColor', fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** Footsteps — First Steps */
const FirstSteps = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-gold)' : 'var(--color-locked)' }}>
        <path d="M16 32c-1 -6 2-12 6-16" {...S} strokeWidth="2.5" />
        <circle cx="22" cy="14" r="3.5" {...S} strokeWidth="2" />
        <path d="M28 36c1-6-2-12-6-16" {...S} strokeWidth="2.5" />
        <circle cx="22" cy="38" r="2.5" {...S} strokeWidth="2" />
        <circle cx="28" cy="20" r="2.5" {...S} strokeWidth="2" />
    </svg>
);

/** Fire — On Fire (5-streak) */
const OnFire = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-streak-fire)' : 'var(--color-locked)' }}>
        <path d="M24 6c-4 10-12 14-8 26 2 5 8 8 8 8s6-3 8-8c4-12-4-16-8-26z" {...S} strokeWidth="2.5" />
        <path d="M20 32c0-4 4-8 4-12 0 4 4 8 4 12" {...S} strokeWidth="2" opacity="0.6" />
    </svg>
);

/** Crown — Unstoppable (20-streak) */
const Unstoppable = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-gold)' : 'var(--color-locked)' }}>
        <path d="M8 34L12 16l8 8 4-12 4 12 8-8 4 18z" {...S} strokeWidth="2.5" />
        <path d="M10 38h28" {...S} strokeWidth="2.5" />
        <circle cx="24" cy="12" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
);

/** Star — Century Club */
const Century = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-gold)' : 'var(--color-locked)' }}>
        <path d="M24 6l5 10 11 2-8 7 2 11-10-5-10 5 2-11-8-7 11-2z" {...S} strokeWidth="2.5" />
    </svg>
);

/** Gear — Math Machine */
const MathMachine = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-chalk)' : 'var(--color-locked)' }}>
        <circle cx="24" cy="24" r="8" {...S} strokeWidth="2.5" />
        <circle cx="24" cy="24" r="3" {...S} strokeWidth="2" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
            const r = (a * Math.PI) / 180;
            return <line key={a} x1={24 + 10 * Math.cos(r)} y1={24 + 10 * Math.sin(r)} x2={24 + 14 * Math.cos(r)} y2={24 + 14 * Math.sin(r)} {...S} strokeWidth="3" />;
        })}
    </svg>
);

/** Crosshair — Sharpshooter */
const Sharpshooter = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-correct)' : 'var(--color-locked)' }}>
        <circle cx="24" cy="24" r="14" {...S} strokeWidth="2" />
        <circle cx="24" cy="24" r="8" {...S} strokeWidth="2" />
        <circle cx="24" cy="24" r="2.5" fill="currentColor" />
        <line x1="24" y1="6" x2="24" y2="14" {...S} strokeWidth="2" />
        <line x1="24" y1="34" x2="24" y2="42" {...S} strokeWidth="2" />
        <line x1="6" y1="24" x2="14" y2="24" {...S} strokeWidth="2" />
        <line x1="34" y1="24" x2="42" y2="24" {...S} strokeWidth="2" />
    </svg>
);

/** Calendar — Dedicated (7-day streak) */
const Dedicated = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-streak-fire)' : 'var(--color-locked)' }}>
        <rect x="8" y="12" width="32" height="28" rx="3" {...S} strokeWidth="2.5" />
        <line x1="8" y1="20" x2="40" y2="20" {...S} strokeWidth="2" />
        <line x1="16" y1="8" x2="16" y2="16" {...S} strokeWidth="2.5" />
        <line x1="32" y1="8" x2="32" y2="16" {...S} strokeWidth="2.5" />
        {/* 7 small check marks */}
        {[14, 19, 24, 29, 34].map(cx => (
            <circle key={cx} cx={cx} cy="28" r="1.5" fill="currentColor" opacity="0.5" />
        ))}
        {[17, 22].map(cx => (
            <circle key={cx} cx={cx} cy="34" r="1.5" fill="currentColor" opacity="0.5" />
        ))}
    </svg>
);

/** Hexagon with ÷×+- — All-Rounder */
const AllRounder = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-gold)' : 'var(--color-locked)' }}>
        <path d="M24 6L40 15v18L24 42 8 33V15z" {...S} strokeWidth="2.5" />
        <text x="24" y="28" textAnchor="middle" fill="currentColor" fontSize="14" fontFamily="var(--font-chalk)">∀</text>
    </svg>
);

/* ── Hard Mode Skull Badges ── */

/** Skull — Skull Initiate */
const SkullInitiate = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-skull)' : 'var(--color-locked)' }}>
        <circle cx="24" cy="20" r="13" {...S} strokeWidth="2.5" />
        <circle cx="19" cy="18" r="2.5" fill="currentColor" opacity="0.7" />
        <circle cx="29" cy="18" r="2.5" fill="currentColor" opacity="0.7" />
        <path d="M20 26c1 2 3 3 4 3s3-1 4-3" {...S} strokeWidth="2" />
        <path d="M18 33v5M24 33v5M30 33v5" {...S} strokeWidth="2.5" />
    </svg>
);

/** Crossed swords — Skull Warrior */
const SkullWarrior = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-skull)' : 'var(--color-locked)' }}>
        <path d="M12 8l24 28" {...S} strokeWidth="2.5" />
        <path d="M36 8L12 36" {...S} strokeWidth="2.5" />
        <path d="M10 10l6 0M10 10l0 6" {...S} strokeWidth="2" />
        <path d="M38 10l-6 0M38 10l0 6" {...S} strokeWidth="2" />
        <circle cx="24" cy="22" r="5" {...S} strokeWidth="2" />
        <circle cx="22" cy="21" r="1" fill="currentColor" opacity="0.6" />
        <circle cx="26" cy="21" r="1" fill="currentColor" opacity="0.6" />
    </svg>
);

/** Pirate flag — Skull Legend */
const SkullLegend = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-skull)' : 'var(--color-locked)' }}>
        <line x1="12" y1="6" x2="12" y2="42" {...S} strokeWidth="2.5" />
        <path d="M12 6h24c0 0-4 6 0 12H12" {...S} strokeWidth="2.5" />
        <circle cx="24" cy="11" r="1.5" fill="currentColor" opacity="0.6" />
        <circle cx="28" cy="11" r="1.5" fill="currentColor" opacity="0.6" />
        <path d="M23 14l3-1 3 1" {...S} strokeWidth="1.5" />
    </svg>
);

/** Skull + fire — Deathstreak */
const SkullStreak = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-skull)' : 'var(--color-locked)' }}>
        <path d="M24 4c-4 8-10 12-7 22 1 4 5 6 7 6s6-2 7-6c3-10-3-14-7-22z" {...S} strokeWidth="2.5" />
        <circle cx="21" cy="22" r="2" fill="currentColor" opacity="0.7" />
        <circle cx="27" cy="22" r="2" fill="currentColor" opacity="0.7" />
        <path d="M22 27c0 0 1 1 2 1s2-1 2-1" {...S} strokeWidth="1.5" />
    </svg>
);

/** Skull + crosshair — Skull Sniper */
const SkullSharp = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-skull)' : 'var(--color-locked)' }}>
        <circle cx="24" cy="24" r="15" {...S} strokeWidth="2" />
        <line x1="24" y1="5" x2="24" y2="13" {...S} strokeWidth="2" />
        <line x1="24" y1="35" x2="24" y2="43" {...S} strokeWidth="2" />
        <line x1="5" y1="24" x2="13" y2="24" {...S} strokeWidth="2" />
        <line x1="35" y1="24" x2="43" y2="24" {...S} strokeWidth="2" />
        <circle cx="21" cy="22" r="2" fill="currentColor" opacity="0.6" />
        <circle cx="27" cy="22" r="2" fill="currentColor" opacity="0.6" />
        <path d="M21 28c1 1 2 1.5 3 1.5s2-.5 3-1.5" {...S} strokeWidth="1.5" />
    </svg>
);

/** Diamond with skull — Flawless Victor */
const SkullPerfect = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-skull)' : 'var(--color-locked)' }}>
        <path d="M24 4L42 24 24 44 6 24z" {...S} strokeWidth="2.5" />
        <circle cx="24" cy="21" r="7" {...S} strokeWidth="2" />
        <circle cx="22" cy="20" r="1.5" fill="currentColor" opacity="0.6" />
        <circle cx="26" cy="20" r="1.5" fill="currentColor" opacity="0.6" />
        <path d="M22 24c0 0 1 1 2 1s2-1 2-1" {...S} strokeWidth="1.5" />
        <path d="M20 28v3M24 28v3M28 28v3" {...S} strokeWidth="2" />
    </svg>
);

/* ── Timed Mode Badges ── */

/** Stopwatch — Speed Demon */
const SpeedDemon = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-timed)' : 'var(--color-locked)' }}>
        <circle cx="24" cy="26" r="14" {...S} strokeWidth="2.5" />
        <line x1="24" y1="26" x2="24" y2="16" {...S} strokeWidth="2.5" />
        <line x1="24" y1="26" x2="30" y2="26" {...S} strokeWidth="2" />
        <line x1="24" y1="8" x2="24" y2="12" {...S} strokeWidth="2.5" />
        <path d="M20 8h8" {...S} strokeWidth="2" />
        <path d="M34 14l2-2" {...S} strokeWidth="2" />
    </svg>
);

/** Lightning bolt — Blitz Master */
const BlitzMaster = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-timed)' : 'var(--color-locked)' }}>
        <path d="M28 4L16 24h8l-4 20L36 22h-8l4-18z" {...S} strokeWidth="2.5" />
    </svg>
);

/** Clock with lightning — Lightning Reflexes */
const LightningReflex = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-timed)' : 'var(--color-locked)' }}>
        <circle cx="24" cy="24" r="16" {...S} strokeWidth="2" />
        <path d="M26 12l-4 10h6l-4 14" {...S} strokeWidth="2.5" />
        {[0, 90, 180, 270].map(a => {
            const r = (a * Math.PI) / 180;
            return <line key={a} x1={24 + 14 * Math.cos(r)} y1={24 + 14 * Math.sin(r)} x2={24 + 16 * Math.cos(r)} y2={24 + 16 * Math.sin(r)} {...S} strokeWidth="2" />;
        })}
    </svg>
);

/** Hourglass — Time Lord */
const TimeLord = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-timed)' : 'var(--color-locked)' }}>
        <path d="M14 6h20M14 42h20" {...S} strokeWidth="2.5" />
        <path d="M16 6c0 12 8 14 8 18s-8 6-8 18" {...S} strokeWidth="2" />
        <path d="M32 6c0 12-8 14-8 18s8 6 8 18" {...S} strokeWidth="2" />
        <circle cx="24" cy="24" r="2" fill="currentColor" opacity="0.5" />
    </svg>
);

/* ── Ultimate Mode Badges (Hard + Timed) ── */

/** Winged skull — Ascended */
const UltimateAscend = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-ultimate)' : 'var(--color-locked)' }}>
        <circle cx="24" cy="20" r="9" {...S} strokeWidth="2" />
        <circle cx="21" cy="18" r="2" fill="currentColor" opacity="0.6" />
        <circle cx="27" cy="18" r="2" fill="currentColor" opacity="0.6" />
        <path d="M22 23c0 0 1 1 2 1s2-1 2-1" {...S} strokeWidth="1.5" />
        <path d="M15 18c-6-2-10 0-10 4s4 4 10 2" {...S} strokeWidth="2" />
        <path d="M33 18c6-2 10 0 10 4s-4 4-10 2" {...S} strokeWidth="2" />
        <path d="M20 29v4M24 29v5M28 29v4" {...S} strokeWidth="2" />
    </svg>
);

/** Infinity — Omega Streak */
const UltimateStreak = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-ultimate)' : 'var(--color-locked)' }}>
        <path d="M24 24c-4-6-8-10-12-10s-6 4-6 10 2 10 6 10 8-4 12-10c4 6 8 10 12 10s6-4 6-10-2-10-6-10-8 4-12 10z" {...S} strokeWidth="2.5" />
    </svg>
);

/** Ascending star burst — Transcendence */
const UltimatePerfect = ({ size = 48, unlocked }: BadgeProps) => (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color: unlocked ? 'var(--color-ultimate)' : 'var(--color-locked)' }}>
        <path d="M24 4l3 8 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" {...S} strokeWidth="2" />
        <path d="M24 44V28" {...S} strokeWidth="2.5" />
        <path d="M18 38l6-10 6 10" {...S} strokeWidth="2" />
        {[0, 60, 120, 180, 240, 300].map(a => {
            const r = (a * Math.PI) / 180;
            return <line key={a} x1={24 + 5 * Math.cos(r)} y1={14 + 5 * Math.sin(r)} x2={24 + 8 * Math.cos(r)} y2={14 + 8 * Math.sin(r)} {...S} strokeWidth="1.5" opacity="0.4" />;
        })}
    </svg>
);

/** Map from achievement ID to SVG component */
const BADGE_MAP: Record<string, React.FC<BadgeProps>> = {
    'first-steps': FirstSteps,
    'streak-5': OnFire,
    'streak-20': Unstoppable,
    'century': Century,
    'math-machine': MathMachine,
    'sharpshooter': Sharpshooter,
    'dedicated': Dedicated,
    'all-rounder': AllRounder,
    // Hard mode skulls
    'skull-initiate': SkullInitiate,
    'skull-warrior': SkullWarrior,
    'skull-legend': SkullLegend,
    'skull-streak': SkullStreak,
    'skull-sharp': SkullSharp,
    'skull-perfect': SkullPerfect,
    // Timed mode
    'speed-demon': SpeedDemon,
    'blitz-master': BlitzMaster,
    'lightning': LightningReflex,
    'time-lord': TimeLord,
    // Ultimate mode
    'ultimate-ascend': UltimateAscend,
    'ultimate-streak': UltimateStreak,
    'ultimate-perfect': UltimatePerfect,
};

interface Props {
    achievementId: string;
    unlocked: boolean;
    equipped?: boolean;
    name: string;
    desc: string;
}

export const AchievementBadge = memo(function AchievementBadge({ achievementId, unlocked, equipped, name, desc }: Props) {
    const Icon = BADGE_MAP[achievementId];
    if (!Icon) return null;

    return (
        <div className={`flex flex-col items-center gap-1 w-16 ${unlocked ? '' : 'opacity-60'}`}>
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${equipped
                ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/5'
                : unlocked
                    ? 'border-[rgb(var(--color-fg))]/20 bg-[var(--color-surface)]'
                    : 'border-[rgb(var(--color-fg))]/15 bg-transparent'
                }`}>
                <Icon size={36} unlocked={unlocked} />
            </div>
            <span className={`text-[10px] ui font-medium text-center leading-tight ${unlocked ? 'text-[rgb(var(--color-fg))]/60' : 'text-[rgb(var(--color-fg))]/50'
                }`}>
                {name}
            </span>
            {unlocked && (
                <span className="text-[9px] ui text-[rgb(var(--color-fg))]/30 text-center leading-tight">
                    {desc}
                </span>
            )}
        </div>
    );
});
