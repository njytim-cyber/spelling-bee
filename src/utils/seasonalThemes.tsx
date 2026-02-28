/**
 * Seasonal theme decorations for the spelling bee classroom
 * Auto-detects current season/holiday and provides themed decorations
 */
import type { ReactElement } from 'react';

export type SeasonalTheme = 'none' | 'auto' | 'halloween' | 'winter' | 'spring' | 'summer' | 'fall';

/** Get the current season based on date */
export function getAutoSeason(): 'halloween' | 'winter' | 'spring' | 'summer' | 'fall' {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const day = now.getDate();

    // Halloween (Oct 15 - Nov 2)
    if ((month === 9 && day >= 15) || (month === 10 && day <= 2)) {
        return 'halloween';
    }

    // Winter holidays (Dec 1 - Jan 10)
    if (month === 11 || (month === 0 && day <= 10)) {
        return 'winter';
    }

    // Spring (Mar - May)
    if (month >= 2 && month <= 4) {
        return 'spring';
    }

    // Summer (Jun - Aug)
    if (month >= 5 && month <= 7) {
        return 'summer';
    }

    // Fall (Sep - Nov 14)
    return 'fall';
}

/** Get SVG decorations for a theme */
export function getThemeDecorations(theme: SeasonalTheme): ReactElement[] {
    const resolvedTheme = theme === 'auto' ? getAutoSeason() : theme;
    if (resolvedTheme === 'none') return [];

    switch (resolvedTheme) {
        case 'halloween':
            return [
                // Jack-o'-lantern left side
                <g key="pumpkin-1" opacity="0.25">
                    <ellipse cx="25" cy="50" rx="8" ry="9" stroke="currentColor" strokeWidth="1" fill="none" />
                    <path d="M 25 42 Q 25 38 27 38" stroke="currentColor" strokeWidth="0.8" fill="none" />
                    <path d="M 20 47 L 22 49 L 20 51" stroke="currentColor" strokeWidth="1" fill="none" />
                    <path d="M 30 47 L 28 49 L 30 51" stroke="currentColor" strokeWidth="1" fill="none" />
                    <path d="M 22 53 Q 25 55 28 53" stroke="currentColor" strokeWidth="1" fill="none" />
                </g>,
                // Bat right side
                <g key="bat-1" opacity="0.2">
                    <ellipse cx="295" cy="45" rx="2.5" ry="2" fill="currentColor" />
                    <path d="M 287 46 Q 290 43 292.5 45" fill="currentColor" />
                    <path d="M 297.5 45 Q 300 43 303 46" fill="currentColor" />
                </g>,
                // Spider web
                <g key="web-1" opacity="0.15">
                    <path d="M 290 20 L 300 12 L 310 20 L 300 28 Z" stroke="currentColor" strokeWidth="0.4" fill="none" />
                    <circle cx="302" cy="16" r="1" fill="currentColor" opacity="0.3" />
                </g>,
            ];

        case 'winter':
            return [
                // Snowflakes
                <g key="snow-1" opacity="0.25">
                    <path d="M 20 30 L 20 38 M 16 34 L 24 34 M 17 31 L 23 37 M 17 37 L 23 31" stroke="currentColor" strokeWidth="0.6" />
                </g>,
                <g key="snow-2" opacity="0.2">
                    <path d="M 295 25 L 295 33 M 291 29 L 299 29 M 292 26 L 298 32 M 292 32 L 298 26" stroke="currentColor" strokeWidth="0.6" />
                </g>,
                // Wreath
                <g key="wreath-1" opacity="0.2">
                    <circle cx="290" cy="60" r="8" stroke="currentColor" strokeWidth="1.2" fill="none" />
                    <circle cx="286" cy="57" r="2" fill="currentColor" opacity="0.3" />
                    <circle cx="294" cy="57" r="2" fill="currentColor" opacity="0.3" />
                    <path d="M 290 68 Q 290 72 292 74" stroke="currentColor" strokeWidth="1" fill="none" />
                </g>,
            ];

        case 'spring':
            return [
                // Flowers
                <g key="flower-1" opacity="0.25">
                    <circle cx="22" cy="55" r="2.5" stroke="currentColor" strokeWidth="0.8" fill="none" />
                    <circle cx="19" cy="53" r="1.5" stroke="currentColor" strokeWidth="0.6" fill="none" />
                    <circle cx="25" cy="53" r="1.5" stroke="currentColor" strokeWidth="0.6" fill="none" />
                    <circle cx="22" cy="50" r="1.5" stroke="currentColor" strokeWidth="0.6" fill="none" />
                    <line x1="22" y1="57" x2="22" y2="65" stroke="currentColor" strokeWidth="0.8" />
                </g>,
                <g key="flower-2" opacity="0.2">
                    <circle cx="297" cy="50" r="2.5" stroke="currentColor" strokeWidth="0.8" fill="none" />
                    <circle cx="294" cy="48" r="1.5" stroke="currentColor" strokeWidth="0.6" fill="none" />
                    <circle cx="300" cy="48" r="1.5" stroke="currentColor" strokeWidth="0.6" fill="none" />
                    <circle cx="297" cy="45" r="1.5" stroke="currentColor" strokeWidth="0.6" fill="none" />
                    <line x1="297" y1="52" x2="297" y2="60" stroke="currentColor" strokeWidth="0.8" />
                </g>,
                // Butterfly
                <g key="butterfly-1" opacity="0.2">
                    <ellipse cx="18" cy="35" rx="3" ry="4" stroke="currentColor" strokeWidth="0.6" fill="none" />
                    <ellipse cx="26" cy="35" rx="3" ry="4" stroke="currentColor" strokeWidth="0.6" fill="none" />
                    <line x1="22" y1="32" x2="22" y2="38" stroke="currentColor" strokeWidth="0.8" />
                </g>,
            ];

        case 'summer':
            return [
                // Sun
                <g key="sun-1" opacity="0.25">
                    <circle cx="25" cy="25" r="4" stroke="currentColor" strokeWidth="1" fill="none" />
                    <line x1="25" y1="18" x2="25" y2="15" stroke="currentColor" strokeWidth="0.8" />
                    <line x1="25" y1="32" x2="25" y2="35" stroke="currentColor" strokeWidth="0.8" />
                    <line x1="18" y1="25" x2="15" y2="25" stroke="currentColor" strokeWidth="0.8" />
                    <line x1="32" y1="25" x2="35" y2="25" stroke="currentColor" strokeWidth="0.8" />
                    <line x1="21" y1="21" x2="19" y2="19" stroke="currentColor" strokeWidth="0.8" />
                    <line x1="29" y1="29" x2="31" y2="31" stroke="currentColor" strokeWidth="0.8" />
                    <line x1="29" y1="21" x2="31" y2="19" stroke="currentColor" strokeWidth="0.8" />
                    <line x1="21" y1="29" x2="19" y2="31" stroke="currentColor" strokeWidth="0.8" />
                </g>,
                // Beach ball
                <g key="ball-1" opacity="0.2">
                    <circle cx="295" cy="50" r="6" stroke="currentColor" strokeWidth="1" fill="none" />
                    <path d="M 295 44 Q 297 50 295 56" stroke="currentColor" strokeWidth="0.6" fill="none" />
                    <path d="M 295 44 Q 293 50 295 56" stroke="currentColor" strokeWidth="0.6" fill="none" />
                </g>,
            ];

        case 'fall':
            return [
                // Falling leaves
                <g key="leaf-1" opacity="0.25">
                    <path d="M 20 40 Q 22 38 24 40 Q 22 42 20 40" stroke="currentColor" strokeWidth="0.8" fill="none" />
                    <line x1="22" y1="40" x2="22" y2="44" stroke="currentColor" strokeWidth="0.6" />
                </g>,
                <g key="leaf-2" opacity="0.2">
                    <path d="M 295 55 Q 297 53 299 55 Q 297 57 295 55" stroke="currentColor" strokeWidth="0.8" fill="none" />
                    <line x1="297" y1="55" x2="297" y2="59" stroke="currentColor" strokeWidth="0.6" />
                </g>,
                <g key="leaf-3" opacity="0.15">
                    <path d="M 30 65 Q 32 63 34 65 Q 32 67 30 65" stroke="currentColor" strokeWidth="0.8" fill="none" />
                    <line x1="32" y1="65" x2="32" y2="69" stroke="currentColor" strokeWidth="0.6" />
                </g>,
                // Acorn
                <g key="acorn-1" opacity="0.2">
                    <ellipse cx="285" cy="35" rx="2.5" ry="3" stroke="currentColor" strokeWidth="0.8" fill="none" />
                    <path d="M 282.5 33 Q 285 30 287.5 33" stroke="currentColor" strokeWidth="0.8" fill="none" />
                </g>,
            ];

        default:
            return [];
    }
}

/** Get theme display names */
export function getThemeName(theme: SeasonalTheme): string {
    switch (theme) {
        case 'none': return 'No decorations';
        case 'auto': return 'Auto (seasonal)';
        case 'halloween': return 'Halloween 🎃';
        case 'winter': return 'Winter ❄️';
        case 'spring': return 'Spring 🌸';
        case 'summer': return 'Summer ☀️';
        case 'fall': return 'Fall 🍂';
    }
}
