/** Chalk color themes — unlocked via rank progression, streaks, achievements, or IAP packs */

export interface ChalkTheme {
    id: string;
    name: string;
    color: string;          // CSS color value for dark-mode chalk
    lightColor: string;     // Saturated dark CSS equivalent for light mode backgrounds
    minLevel: number;       // Rank level required to unlock (1-11)
    minStreak?: number;     // Streak achievement required
    minSolved?: number;     // Total words solved required
    /** Requires Champion Pass when true */
    premium?: boolean;
    /** Requires IAP pack purchase when true (pack ID checked separately) */
    packItem?: boolean;
    /** Only obtainable via loot drops during gameplay */
    lootDrop?: boolean;
}

export const CHALK_THEMES: ChalkTheme[] = [
    { id: 'classic', name: 'Classic White', color: 'rgba(232, 229, 221, 0.95)', lightColor: '#1a1a2e', minLevel: 1 }, // classic chalkboard white -> deep navy-gray
    { id: 'sky', name: 'Sky Blue', color: 'rgba(100, 220, 255, 0.95)', lightColor: '#0369a1', minLevel: 1, minSolved: 10 },
    { id: 'rose', name: 'Chalk Rose', color: 'rgba(255, 140, 170, 0.95)', lightColor: '#be123c', minLevel: 2 },
    { id: 'mint', name: 'Mint Fresh', color: 'rgba(100, 255, 180, 0.95)', lightColor: '#047857', minLevel: 1, minSolved: 25 },
    { id: 'gold', name: 'Golden Hour', color: 'rgba(255, 225, 80, 0.95)', lightColor: '#b45309', minLevel: 3 },
    { id: 'sunset', name: 'Sunset', color: 'rgba(255, 140, 90, 0.95)', lightColor: '#c2410c', minLevel: 3 },
    // 🔥 Streak unlocks
    { id: 'skull-purple', name: 'Skull Purple', color: 'rgba(200, 140, 255, 0.95)', lightColor: '#6b21a8', minLevel: 1, minStreak: 10 },
    { id: 'blood-moon', name: 'Blood Moon', color: 'rgba(255, 60, 60, 0.95)', lightColor: '#991b1b', minLevel: 1, minStreak: 20 },
    // 🏆 High rank unlocks (Champion Pass required)
    { id: 'shadow-flame', name: 'Shadow Flame', color: 'rgba(255, 140, 20, 0.95)', lightColor: '#9a3412', minLevel: 7, premium: true }, // Word Wizard (3000 XP)
    { id: 'electric-blue', name: 'Electric Blue', color: 'rgba(50, 200, 255, 0.95)', lightColor: '#1d4ed8', minLevel: 1, minSolved: 50 },
    { id: 'neon-green', name: 'Neon Pulse', color: 'rgba(20, 255, 120, 0.95)', lightColor: '#15803d', minLevel: 8, premium: true }, // Grandmaster (5000 XP)
    // ✨ Elite endgame unlocks (Champion Pass required)
    { id: 'void-black', name: 'Void', color: 'rgba(180, 160, 200, 0.95)', lightColor: '#312e81', minLevel: 9, premium: true }, // Legend (8000 XP)
    { id: 'prismatic', name: 'Prismatic', color: 'rgba(255, 180, 255, 0.95)', lightColor: '#86198f', minLevel: 10, premium: true }, // Mythic (12000 XP)
    // 🛒 IAP pack items
    { id: 'neon-pink', name: 'Neon Pink', color: 'rgba(255, 50, 200, 0.95)', lightColor: '#be185d', minLevel: 1, packItem: true },
    { id: 'neon-cyan', name: 'Neon Cyan', color: 'rgba(0, 255, 220, 0.95)', lightColor: '#0e7490', minLevel: 1, packItem: true },
    { id: 'neon-yellow', name: 'Neon Yellow', color: 'rgba(255, 255, 50, 0.95)', lightColor: '#a16207', minLevel: 1, packItem: true },
    { id: 'pastel-lavender', name: 'Lavender', color: 'rgba(200, 180, 255, 0.95)', lightColor: '#7c3aed', minLevel: 1, packItem: true },
    { id: 'pastel-peach', name: 'Peach', color: 'rgba(255, 200, 170, 0.95)', lightColor: '#c2410c', minLevel: 1, packItem: true },
    { id: 'pastel-sky', name: 'Baby Blue', color: 'rgba(170, 210, 255, 0.95)', lightColor: '#2563eb', minLevel: 1, packItem: true },
    { id: 'forest-green', name: 'Forest', color: 'rgba(40, 180, 80, 0.95)', lightColor: '#166534', minLevel: 1, packItem: true },
    { id: 'ocean-deep', name: 'Ocean Deep', color: 'rgba(20, 100, 200, 0.95)', lightColor: '#1e40af', minLevel: 1, packItem: true },
    { id: 'autumn-leaf', name: 'Autumn Leaf', color: 'rgba(200, 120, 30, 0.95)', lightColor: '#92400e', minLevel: 1, packItem: true },
    // 🎁 Loot drop exclusives — only obtainable via mid-session loot drops
    { id: 'starlight', name: 'Starlight', color: 'rgba(220, 220, 255, 0.95)', lightColor: '#4338ca', minLevel: 1, lootDrop: true },
    { id: 'coral-reef', name: 'Coral Reef', color: 'rgba(255, 130, 130, 0.95)', lightColor: '#dc2626', minLevel: 1, lootDrop: true },
    { id: 'aurora', name: 'Aurora', color: 'rgba(120, 255, 200, 0.95)', lightColor: '#059669', minLevel: 1, lootDrop: true },
    { id: 'honey-glow', name: 'Honey Glow', color: 'rgba(255, 200, 50, 0.95)', lightColor: '#d97706', minLevel: 1, lootDrop: true },
    { id: 'frost-bite', name: 'Frost Bite', color: 'rgba(180, 230, 255, 0.95)', lightColor: '#0284c7', minLevel: 1, lootDrop: true },
    { id: 'amethyst', name: 'Amethyst', color: 'rgba(180, 100, 255, 0.95)', lightColor: '#7c3aed', minLevel: 1, lootDrop: true },
];

/**
 * Apply chalk theme color.
 * In dark mode the chalk-theme color is used directly.
 * In light mode we force a dark value so text is readable.
 */
export function applyTheme(theme: ChalkTheme) {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    document.documentElement.style.setProperty(
        '--color-chalk',
        isLight ? theme.lightColor : theme.color,
    );
    // Stash the theme colors so mode-toggle can re-derive
    document.documentElement.style.setProperty('--chalk-theme-color', theme.color);
    document.documentElement.style.setProperty('--chalk-theme-color-light', theme.lightColor);
}

/** O(1) theme lookup by ID — avoids repeated .find() across components */
const THEME_MAP = new Map(CHALK_THEMES.map(t => [t.id, t]));
/** Returns the appropriate chalk color for the current theme mode */
export function getThemeColor(id?: string): string | undefined {
    if (!id) return undefined;
    const theme = THEME_MAP.get(id);
    if (!theme) return undefined;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return isLight ? theme.lightColor : theme.color;
}
