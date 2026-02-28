/**
 * Character customization styles for stick figures
 * Players can choose different visual styles for their character
 */
import type { ReactElement } from 'react';

export type CharacterStyle = 'classic' | 'sporty' | 'academic' | 'cool';

export interface CharacterStyleConfig {
    id: CharacterStyle;
    name: string;
    emoji: string;
    description: string;
}

export const CHARACTER_STYLES: CharacterStyleConfig[] = [
    {
        id: 'classic',
        name: 'Classic',
        emoji: '👤',
        description: 'Simple and friendly',
    },
    {
        id: 'sporty',
        name: 'Sporty',
        emoji: '⚡',
        description: 'Athletic and energetic',
    },
    {
        id: 'academic',
        name: 'Academic',
        emoji: '📚',
        description: 'Smart and studious',
    },
    {
        id: 'cool',
        name: 'Cool',
        emoji: '😎',
        description: 'Laid-back and confident',
    },
];

/** Get extras for the player character based on style */
export function getStyleExtras(style: CharacterStyle, cx: number): ReactElement[] {
    const extras: ReactElement[] = [];

    switch (style) {
        case 'sporty':
            // Sweatband
            extras.push(
                <rect
                    key="sweatband"
                    x={cx - 5}
                    y="136"
                    width="10"
                    height="2"
                    stroke="currentColor"
                    strokeWidth="0.6"
                    fill="none"
                    opacity="0.4"
                />
            );
            // Athletic stance - slightly wider legs (handled via transform in parent)
            break;

        case 'academic':
            // Glasses
            extras.push(
                <g key="glasses" opacity="0.5">
                    <circle cx={cx - 2.5} cy="141" r="2.5" stroke="currentColor" strokeWidth="0.7" fill="none" />
                    <circle cx={cx + 2.5} cy="141" r="2.5" stroke="currentColor" strokeWidth="0.7" fill="none" />
                    <line x1={cx - 0.3} y1="141" x2={cx + 0.3} y2="141" stroke="currentColor" strokeWidth="0.6" />
                </g>
            );
            // Book in hand (optional - could show during idle)
            break;

        case 'cool':
            // Sunglasses
            extras.push(
                <g key="sunglasses" opacity="0.6">
                    <rect x={cx - 5} y="139" width="4" height="3" rx="1" stroke="currentColor" strokeWidth="0.7" fill="currentColor" fillOpacity="0.1" />
                    <rect x={cx + 1} y="139" width="4" height="3" rx="1" stroke="currentColor" strokeWidth="0.7" fill="currentColor" fillOpacity="0.1" />
                    <line x1={cx - 1} y1="140.5" x2={cx + 1} y2="140.5" stroke="currentColor" strokeWidth="0.6" />
                </g>
            );
            // Casual lean (handled via posture in parent)
            break;

        case 'classic':
        default:
            // No extras - clean classic look
            break;
    }

    return extras;
}

/** Get hair style based on character style */
export function getStyleHair(style: CharacterStyle, cx: number): ReactElement | null {
    switch (style) {
        case 'sporty':
            // Spiky energetic hair
            return (
                <path
                    key="hair-sporty"
                    d={`M ${cx - 6} 136 L ${cx - 4} 131 L ${cx - 1} 135 L ${cx + 2} 130 L ${cx + 5} 135 L ${cx + 7} 132`}
                    stroke="currentColor"
                    strokeWidth="0.9"
                    fill="none"
                    opacity="0.35"
                />
            );

        case 'academic':
            // Neat combed hair with part
            return (
                <g key="hair-academic" opacity="0.35">
                    <path d={`M ${cx - 6} 136 Q ${cx} 132 ${cx + 7} 136`} stroke="currentColor" strokeWidth="0.9" fill="none" />
                    <line x1={cx} y1="134" x2={cx} y2="138" stroke="currentColor" strokeWidth="0.7" />
                </g>
            );

        case 'cool':
            // Messy cool hair
            return (
                <path
                    key="hair-cool"
                    d={`M ${cx - 7} 137 Q ${cx - 4} 131 ${cx - 1} 136 Q ${cx + 2} 132 ${cx + 5} 137`}
                    stroke="currentColor"
                    strokeWidth="0.9"
                    fill="none"
                    opacity="0.35"
                />
            );

        case 'classic':
        default:
            // Simple hair tuft
            return (
                <path
                    key="hair-classic"
                    d={`M ${cx - 4} 137 Q ${cx} 133 ${cx + 4} 137`}
                    stroke="currentColor"
                    strokeWidth="0.8"
                    fill="none"
                    opacity="0.3"
                />
            );
    }
}

/** Get arm position modifier for style (affects idle/active animations) */
export function getStyleArmOffset(style: CharacterStyle): { left: number; right: number } {
    switch (style) {
        case 'sporty':
            return { left: -2, right: 2 }; // Wider athletic stance
        case 'cool':
            return { left: 1, right: -1 }; // Asymmetric casual pose
        default:
            return { left: 0, right: 0 }; // Default
    }
}
