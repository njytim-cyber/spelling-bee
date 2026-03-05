/**
 * components/AvatarSvg.tsx
 *
 * Stateless stick-figure avatar renderer.
 * Composes 6 SVG part layers + optional flair overlay from a compact config string.
 * Works at any size — 24px (leaderboard) to 120px (profile preview).
 *
 * Optional `animate` prop adds a gentle idle-bob CSS animation.
 */
import { memo } from 'react';
import type { CSSProperties } from 'react';
import {
    parseAvatar,
    getBodyContext,
    AVATAR_CATEGORIES,
    FLAIR_ITEMS,
} from '../utils/avatarParts';
import type { AvatarConfig } from '../utils/avatarParts';

interface Props {
    /** Encoded string like "h0-r1-e0-b1-c0-a0" or a parsed AvatarConfig */
    config: string | AvatarConfig | undefined | null;
    /** Width in px (height auto-scales at 1.4× ratio) */
    size: number;
    className?: string;
    style?: CSSProperties;
    /** Enable a gentle idle-bob animation (use for large previews, not tiny icons) */
    animate?: boolean;
}

// Render order maps configKey to the layer order (back → front)
const LAYER_ORDER: Array<keyof AvatarConfig> = [
    'body', 'clothing', 'head', 'hair', 'expression', 'accessory',
];

// Category lookup by configKey
const CAT_BY_KEY = new Map(AVATAR_CATEGORIES.map(c => [c.configKey, c]));

export const AvatarSvg = memo(function AvatarSvg({ config, size, className, style, animate }: Props) {
    const parsed = typeof config === 'string' || !config
        ? parseAvatar(config as string)
        : config;
    const ctx = getBodyContext(parsed);

    // Determine viewBox height based on body type (Tall extends to y=52)
    const vbHeight = Math.max(56, ctx.feetY + 6);

    return (
        <svg
            viewBox={`0 0 40 ${vbHeight}`}
            width={size}
            height={size * (vbHeight / 40)}
            className={className}
            style={{
                ...style,
                ...(animate ? {
                    animation: 'avatar-bob 3s ease-in-out infinite',
                } : undefined),
            }}
            aria-hidden="true"
        >
            {/* Inject keyframes once via <style> inside SVG — scoped, no global CSS needed */}
            {animate && (
                <style>{`
                    @keyframes avatar-bob {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-2px); }
                    }
                `}</style>
            )}
            <g
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            >
                {LAYER_ORDER.map(key => {
                    const cat = CAT_BY_KEY.get(key);
                    if (!cat) return null;
                    const partIdx = parsed[key];
                    const part = cat.parts[partIdx] || cat.parts[0];
                    return <g key={key}>{part.render(ctx)}</g>;
                })}
                {/* Flair — topmost layer (earned visual effects) */}
                {parsed.flair > 0 && (() => {
                    const flair = FLAIR_ITEMS[parsed.flair] || FLAIR_ITEMS[0];
                    return <g key="flair">{flair.render(ctx)}</g>;
                })()}
            </g>
        </svg>
    );
});
