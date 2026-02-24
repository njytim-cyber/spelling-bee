/** Chalk color themes — unlocked at level thresholds or hard mode play */

export interface ChalkTheme {
    id: string;
    name: string;
    color: string;          // CSS color value for dark-mode chalk
    lightColor: string;     // Saturated dark CSS equivalent for light mode backgrounds
    minLevel: number;       // Level required to unlock (1-5)
    hardModeOnly?: boolean; // Exclusive to hard mode players
    hardModeMin?: number;   // Hard mode solves required to unlock
    timedModeOnly?: boolean;
    timedModeMin?: number;
    ultimateOnly?: boolean;
    ultimateMin?: number;
}

export const CHALK_THEMES: ChalkTheme[] = [
    { id: 'classic', name: 'Classic White', color: 'rgba(230, 230, 230, 0.95)', lightColor: '#172554', minLevel: 1 }, // classic chalkboard white -> dark navy
    { id: 'sky', name: 'Sky Blue', color: 'rgba(100, 220, 255, 0.95)', lightColor: '#0369a1', minLevel: 1 },
    { id: 'rose', name: 'Chalk Rose', color: 'rgba(255, 140, 170, 0.95)', lightColor: '#be123c', minLevel: 2 },
    { id: 'mint', name: 'Mint Fresh', color: 'rgba(100, 255, 180, 0.95)', lightColor: '#047857', minLevel: 2 },
    { id: 'gold', name: 'Golden Hour', color: 'rgba(255, 225, 80, 0.95)', lightColor: '#b45309', minLevel: 3 },
    { id: 'sunset', name: 'Sunset', color: 'rgba(255, 140, 90, 0.95)', lightColor: '#c2410c', minLevel: 3 },
    // 💀 Hard mode exclusive
    { id: 'skull-purple', name: 'Skull Purple', color: 'rgba(200, 140, 255, 0.95)', lightColor: '#6b21a8', minLevel: 1, hardModeOnly: true, hardModeMin: 25 },
    { id: 'blood-moon', name: 'Blood Moon', color: 'rgba(255, 60, 60, 0.95)', lightColor: '#991b1b', minLevel: 1, hardModeOnly: true, hardModeMin: 100 },
    { id: 'shadow-flame', name: 'Shadow Flame', color: 'rgba(255, 140, 20, 0.95)', lightColor: '#9a3412', minLevel: 1, hardModeOnly: true, hardModeMin: 200 },
    // ⏱️ Timed mode exclusive
    { id: 'electric-blue', name: 'Electric Blue', color: 'rgba(50, 200, 255, 0.95)', lightColor: '#1d4ed8', minLevel: 1, timedModeOnly: true, timedModeMin: 25 },
    { id: 'neon-green', name: 'Neon Pulse', color: 'rgba(20, 255, 120, 0.95)', lightColor: '#15803d', minLevel: 1, timedModeOnly: true, timedModeMin: 100 },
    // 💀⏱️ Ultimate exclusive
    { id: 'void-black', name: 'Void', color: 'rgba(180, 160, 200, 0.95)', lightColor: '#312e81', minLevel: 1, ultimateOnly: true, ultimateMin: 10 },
    { id: 'prismatic', name: 'Prismatic', color: 'rgba(255, 180, 255, 0.95)', lightColor: '#86198f', minLevel: 1, ultimateOnly: true, ultimateMin: 50 },
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
export function getThemeColor(id?: string): string | undefined {
    return id ? THEME_MAP.get(id)?.color : undefined;
}
