/**
 * utils/avatarParts.tsx
 *
 * Mix-and-match stick-figure avatar system.
 * 6 free categories × 5 options + 1 earned flair slot (8 options).
 * All SVGs use stroke="currentColor" for chalk-theme inheritance.
 *
 * Encoding: "h0-r1-e0-b1-c0-a0-f0" (category letter + option index)
 * Backward-compatible: 6-segment strings (no flair) parse with flair=0.
 */
import type { ReactElement } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AvatarConfig {
    head: number;       // 0-4
    hair: number;       // 0-4  (r for hairdo)
    expression: number; // 0-4
    body: number;       // 0-4
    clothing: number;   // 0-4
    accessory: number;  // 0-4
    flair: number;      // 0-7  (earned items)
}

export interface BodyContext {
    headCx: number;
    headCy: number;
    headRx: number;     // horizontal radius (varies by head shape)
    headRy: number;     // vertical radius
    neckY: number;
    shoulderY: number;
    shoulderW: number;  // half-width of shoulders
    hipY: number;
    hipW: number;       // half-width of hips
    feetY: number;
}

export interface AvatarPart {
    index: number;
    name: string;
    render: (ctx: BodyContext) => ReactElement;
}

export interface AvatarCategory {
    key: string;
    label: string;
    configKey: keyof AvatarConfig;
    parts: AvatarPart[];
}

// ── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_AVATAR = 'h0-r1-e0-b1-c0-a0-f0';

/** Max valid index per category key */
const MAX_INDEX: Record<string, number> = {
    h: 4, r: 4, e: 4, b: 4, c: 4, a: 4, f: 7,
};

// ── Parse / Encode ───────────────────────────────────────────────────────────

export function parseAvatar(encoded: string | undefined | null): AvatarConfig {
    const defaults: AvatarConfig = { head: 0, hair: 1, expression: 0, body: 1, clothing: 0, accessory: 0, flair: 0 };
    if (!encoded || typeof encoded !== 'string') return defaults;

    const parts = encoded.split('-');
    // Accept 6 segments (legacy, no flair) or 7 segments (current)
    if (parts.length !== 6 && parts.length !== 7) return defaults;

    const map: Record<string, keyof AvatarConfig> = {
        h: 'head', r: 'hair', e: 'expression', b: 'body', c: 'clothing', a: 'accessory', f: 'flair',
    };

    const result = { ...defaults };
    for (const seg of parts) {
        if (seg.length < 2) return defaults;
        const key = map[seg[0]];
        if (!key) return defaults;
        const val = parseInt(seg.substring(1), 10);
        const max = MAX_INDEX[seg[0]] ?? 4;
        if (isNaN(val) || val < 0 || val > max) return defaults;
        result[key] = val;
    }
    return result;
}

export function encodeAvatar(config: AvatarConfig): string {
    return `h${config.head}-r${config.hair}-e${config.expression}-b${config.body}-c${config.clothing}-a${config.accessory}-f${config.flair}`;
}

// ── Body context geometry ────────────────────────────────────────────────────

const HEAD_SHAPES: Array<{ rx: number; ry: number }> = [
    { rx: 6, ry: 6 },     // 0: Round
    { rx: 5, ry: 7 },     // 1: Oval
    { rx: 5.5, ry: 5.5 }, // 2: Square-ish
    { rx: 7, ry: 5.5 },   // 3: Wide
    { rx: 6, ry: 6.5 },   // 4: Heart
];

const BODY_SPECS: Array<{ shoulderW: number; hipW: number; hipY: number; feetY: number }> = [
    { shoulderW: 6, hipW: 4, hipY: 32, feetY: 48 },   // 0: Slim
    { shoulderW: 8, hipW: 5, hipY: 32, feetY: 48 },   // 1: Normal
    { shoulderW: 10, hipW: 7, hipY: 33, feetY: 48 },  // 2: Stocky
    { shoulderW: 8, hipW: 5, hipY: 35, feetY: 52 },   // 3: Tall
    { shoulderW: 7, hipW: 4.5, hipY: 30, feetY: 44 }, // 4: Petite
];

export function getBodyContext(config: AvatarConfig): BodyContext {
    const head = HEAD_SHAPES[config.head] || HEAD_SHAPES[0];
    const body = BODY_SPECS[config.body] || BODY_SPECS[1];
    return {
        headCx: 20,
        headCy: 10,
        headRx: head.rx,
        headRy: head.ry,
        neckY: 10 + head.ry,
        shoulderY: 10 + head.ry + 3,
        shoulderW: body.shoulderW,
        hipY: body.hipY,
        hipW: body.hipW,
        feetY: body.feetY,
    };
}

// ── SVG Part Renderers ───────────────────────────────────────────────────────
// All use stroke="currentColor", no fill, strokeWidth 1.5

// --- HEADS ---
const HEADS: AvatarPart[] = [
    {
        index: 0, name: 'Round',
        render: (ctx) => <circle cx={ctx.headCx} cy={ctx.headCy} r={6} />,
    },
    {
        index: 1, name: 'Oval',
        render: (ctx) => <ellipse cx={ctx.headCx} cy={ctx.headCy} rx={5} ry={7} />,
    },
    {
        index: 2, name: 'Square',
        render: (ctx) => <rect x={ctx.headCx - 5.5} y={ctx.headCy - 5.5} width={11} height={11} rx={2} />,
    },
    {
        index: 3, name: 'Wide',
        render: (ctx) => <ellipse cx={ctx.headCx} cy={ctx.headCy} rx={7} ry={5.5} />,
    },
    {
        index: 4, name: 'Heart',
        render: (ctx) => (
            <path d={`M${ctx.headCx} ${ctx.headCy + 6.5} C${ctx.headCx - 8} ${ctx.headCy + 1} ${ctx.headCx - 7} ${ctx.headCy - 6} ${ctx.headCx} ${ctx.headCy - 3} C${ctx.headCx + 7} ${ctx.headCy - 6} ${ctx.headCx + 8} ${ctx.headCy + 1} ${ctx.headCx} ${ctx.headCy + 6.5}Z`} />
        ),
    },
];

// --- HAIR ---
const HAIR: AvatarPart[] = [
    {
        index: 0, name: 'Bald',
        render: () => <g />, // no hair
    },
    {
        index: 1, name: 'Tuft',
        render: (ctx) => (
            <g>
                <path d={`M${ctx.headCx - 2} ${ctx.headCy - ctx.headRy} Q${ctx.headCx} ${ctx.headCy - ctx.headRy - 5} ${ctx.headCx + 2} ${ctx.headCy - ctx.headRy}`} />
                <path d={`M${ctx.headCx} ${ctx.headCy - ctx.headRy} Q${ctx.headCx + 1} ${ctx.headCy - ctx.headRy - 4} ${ctx.headCx + 3} ${ctx.headCy - ctx.headRy + 1}`} />
            </g>
        ),
    },
    {
        index: 2, name: 'Side-swept',
        render: (ctx) => (
            <g>
                <path d={`M${ctx.headCx - ctx.headRx} ${ctx.headCy - 1} Q${ctx.headCx - ctx.headRx - 1} ${ctx.headCy - ctx.headRy - 2} ${ctx.headCx + 2} ${ctx.headCy - ctx.headRy - 2}`} />
                <path d={`M${ctx.headCx - 1} ${ctx.headCy - ctx.headRy} Q${ctx.headCx + 2} ${ctx.headCy - ctx.headRy - 3} ${ctx.headCx + ctx.headRx} ${ctx.headCy - 2}`} />
            </g>
        ),
    },
    {
        index: 3, name: 'Spiky',
        render: (ctx) => {
            const top = ctx.headCy - ctx.headRy;
            return (
                <g>
                    <line x1={ctx.headCx - 4} y1={top} x2={ctx.headCx - 5} y2={top - 5} />
                    <line x1={ctx.headCx - 1} y1={top} x2={ctx.headCx - 1} y2={top - 7} />
                    <line x1={ctx.headCx + 2} y1={top} x2={ctx.headCx + 3} y2={top - 6} />
                    <line x1={ctx.headCx + 5} y1={top} x2={ctx.headCx + 6} y2={top - 4} />
                </g>
            );
        },
    },
    {
        index: 4, name: 'Long',
        render: (ctx) => (
            <g>
                <path d={`M${ctx.headCx - ctx.headRx} ${ctx.headCy} Q${ctx.headCx - ctx.headRx - 2} ${ctx.headCy - ctx.headRy} ${ctx.headCx} ${ctx.headCy - ctx.headRy - 1} Q${ctx.headCx + ctx.headRx + 2} ${ctx.headCy - ctx.headRy} ${ctx.headCx + ctx.headRx} ${ctx.headCy}`} />
                <path d={`M${ctx.headCx - ctx.headRx} ${ctx.headCy} Q${ctx.headCx - ctx.headRx - 1} ${ctx.headCy + 6} ${ctx.headCx - ctx.headRx + 1} ${ctx.headCy + 10}`} />
                <path d={`M${ctx.headCx + ctx.headRx} ${ctx.headCy} Q${ctx.headCx + ctx.headRx + 1} ${ctx.headCy + 6} ${ctx.headCx + ctx.headRx - 1} ${ctx.headCy + 10}`} />
            </g>
        ),
    },
];

// --- EXPRESSIONS ---
const EXPRESSIONS: AvatarPart[] = [
    {
        index: 0, name: 'Smile',
        render: (ctx) => (
            <g>
                <circle cx={ctx.headCx - 2} cy={ctx.headCy - 1} r={0.8} fill="currentColor" stroke="none" />
                <circle cx={ctx.headCx + 2} cy={ctx.headCy - 1} r={0.8} fill="currentColor" stroke="none" />
                <path d={`M${ctx.headCx - 2} ${ctx.headCy + 2} Q${ctx.headCx} ${ctx.headCy + 4} ${ctx.headCx + 2} ${ctx.headCy + 2}`} fill="none" />
            </g>
        ),
    },
    {
        index: 1, name: 'Neutral',
        render: (ctx) => (
            <g>
                <circle cx={ctx.headCx - 2} cy={ctx.headCy - 1} r={0.8} fill="currentColor" stroke="none" />
                <circle cx={ctx.headCx + 2} cy={ctx.headCy - 1} r={0.8} fill="currentColor" stroke="none" />
                <line x1={ctx.headCx - 1.5} y1={ctx.headCy + 2.5} x2={ctx.headCx + 1.5} y2={ctx.headCy + 2.5} />
            </g>
        ),
    },
    {
        index: 2, name: 'Wink',
        render: (ctx) => (
            <g>
                <circle cx={ctx.headCx - 2} cy={ctx.headCy - 1} r={0.8} fill="currentColor" stroke="none" />
                {/* Winking eye — small arc */}
                <path d={`M${ctx.headCx + 1} ${ctx.headCy - 1} Q${ctx.headCx + 2} ${ctx.headCy - 2.5} ${ctx.headCx + 3} ${ctx.headCy - 1}`} fill="none" />
                <path d={`M${ctx.headCx - 2} ${ctx.headCy + 2} Q${ctx.headCx} ${ctx.headCy + 4} ${ctx.headCx + 2} ${ctx.headCy + 2}`} fill="none" />
            </g>
        ),
    },
    {
        index: 3, name: 'Cool',
        render: (ctx) => (
            <g>
                {/* Sunglasses */}
                <rect x={ctx.headCx - 4.5} y={ctx.headCy - 2.5} width={4} height={3} rx={0.5} fill="currentColor" fillOpacity={0.15} />
                <rect x={ctx.headCx + 0.5} y={ctx.headCy - 2.5} width={4} height={3} rx={0.5} fill="currentColor" fillOpacity={0.15} />
                <line x1={ctx.headCx - 0.5} y1={ctx.headCy - 1} x2={ctx.headCx + 0.5} y2={ctx.headCy - 1} />
                <line x1={ctx.headCx - 4.5} y1={ctx.headCy - 1} x2={ctx.headCx - ctx.headRx} y2={ctx.headCy - 1.5} />
                <line x1={ctx.headCx + 4.5} y1={ctx.headCy - 1} x2={ctx.headCx + ctx.headRx} y2={ctx.headCy - 1.5} />
                {/* Slight smirk */}
                <path d={`M${ctx.headCx - 1} ${ctx.headCy + 2.5} Q${ctx.headCx + 1} ${ctx.headCy + 3.5} ${ctx.headCx + 2} ${ctx.headCy + 2}`} fill="none" />
            </g>
        ),
    },
    {
        index: 4, name: 'Grin',
        render: (ctx) => (
            <g>
                {/* Happy squint eyes */}
                <path d={`M${ctx.headCx - 3} ${ctx.headCy - 0.5} Q${ctx.headCx - 2} ${ctx.headCy - 2} ${ctx.headCx - 1} ${ctx.headCy - 0.5}`} fill="none" />
                <path d={`M${ctx.headCx + 1} ${ctx.headCy - 0.5} Q${ctx.headCx + 2} ${ctx.headCy - 2} ${ctx.headCx + 3} ${ctx.headCy - 0.5}`} fill="none" />
                {/* Big grin */}
                <path d={`M${ctx.headCx - 3} ${ctx.headCy + 1.5} Q${ctx.headCx} ${ctx.headCy + 5} ${ctx.headCx + 3} ${ctx.headCy + 1.5}`} fill="none" />
            </g>
        ),
    },
];

// --- BODIES ---
const BODIES: AvatarPart[] = [
    {
        index: 0, name: 'Slim',
        render: (ctx) => (
            <g>
                {/* Neck */}
                <line x1={ctx.headCx} y1={ctx.neckY} x2={ctx.headCx} y2={ctx.shoulderY} />
                {/* Shoulders */}
                <line x1={ctx.headCx - ctx.shoulderW} y1={ctx.shoulderY} x2={ctx.headCx + ctx.shoulderW} y2={ctx.shoulderY} />
                {/* Torso */}
                <line x1={ctx.headCx} y1={ctx.shoulderY} x2={ctx.headCx} y2={ctx.hipY} />
                {/* Arms */}
                <line x1={ctx.headCx - ctx.shoulderW} y1={ctx.shoulderY} x2={ctx.headCx - ctx.shoulderW - 2} y2={ctx.hipY - 2} />
                <line x1={ctx.headCx + ctx.shoulderW} y1={ctx.shoulderY} x2={ctx.headCx + ctx.shoulderW + 2} y2={ctx.hipY - 2} />
                {/* Legs */}
                <line x1={ctx.headCx} y1={ctx.hipY} x2={ctx.headCx - ctx.hipW} y2={ctx.feetY} />
                <line x1={ctx.headCx} y1={ctx.hipY} x2={ctx.headCx + ctx.hipW} y2={ctx.feetY} />
            </g>
        ),
    },
    {
        index: 1, name: 'Normal',
        render: (ctx) => (
            <g>
                <line x1={ctx.headCx} y1={ctx.neckY} x2={ctx.headCx} y2={ctx.shoulderY} />
                <line x1={ctx.headCx - ctx.shoulderW} y1={ctx.shoulderY} x2={ctx.headCx + ctx.shoulderW} y2={ctx.shoulderY} />
                <line x1={ctx.headCx} y1={ctx.shoulderY} x2={ctx.headCx} y2={ctx.hipY} />
                <line x1={ctx.headCx - ctx.shoulderW} y1={ctx.shoulderY} x2={ctx.headCx - ctx.shoulderW - 2} y2={ctx.hipY - 2} />
                <line x1={ctx.headCx + ctx.shoulderW} y1={ctx.shoulderY} x2={ctx.headCx + ctx.shoulderW + 2} y2={ctx.hipY - 2} />
                <line x1={ctx.headCx} y1={ctx.hipY} x2={ctx.headCx - ctx.hipW} y2={ctx.feetY} />
                <line x1={ctx.headCx} y1={ctx.hipY} x2={ctx.headCx + ctx.hipW} y2={ctx.feetY} />
            </g>
        ),
    },
    {
        index: 2, name: 'Stocky',
        render: (ctx) => (
            <g>
                <line x1={ctx.headCx} y1={ctx.neckY} x2={ctx.headCx} y2={ctx.shoulderY} />
                {/* Broader shoulders */}
                <line x1={ctx.headCx - ctx.shoulderW} y1={ctx.shoulderY} x2={ctx.headCx + ctx.shoulderW} y2={ctx.shoulderY} />
                {/* Thicker torso — two lines */}
                <line x1={ctx.headCx - 1.5} y1={ctx.shoulderY} x2={ctx.headCx - 1.5} y2={ctx.hipY} />
                <line x1={ctx.headCx + 1.5} y1={ctx.shoulderY} x2={ctx.headCx + 1.5} y2={ctx.hipY} />
                {/* Arms */}
                <line x1={ctx.headCx - ctx.shoulderW} y1={ctx.shoulderY} x2={ctx.headCx - ctx.shoulderW - 1} y2={ctx.hipY - 2} />
                <line x1={ctx.headCx + ctx.shoulderW} y1={ctx.shoulderY} x2={ctx.headCx + ctx.shoulderW + 1} y2={ctx.hipY - 2} />
                {/* Legs */}
                <line x1={ctx.headCx} y1={ctx.hipY} x2={ctx.headCx - ctx.hipW} y2={ctx.feetY} />
                <line x1={ctx.headCx} y1={ctx.hipY} x2={ctx.headCx + ctx.hipW} y2={ctx.feetY} />
            </g>
        ),
    },
    {
        index: 3, name: 'Tall',
        render: (ctx) => (
            <g>
                <line x1={ctx.headCx} y1={ctx.neckY} x2={ctx.headCx} y2={ctx.shoulderY} />
                <line x1={ctx.headCx - ctx.shoulderW} y1={ctx.shoulderY} x2={ctx.headCx + ctx.shoulderW} y2={ctx.shoulderY} />
                <line x1={ctx.headCx} y1={ctx.shoulderY} x2={ctx.headCx} y2={ctx.hipY} />
                {/* Longer arms */}
                <line x1={ctx.headCx - ctx.shoulderW} y1={ctx.shoulderY} x2={ctx.headCx - ctx.shoulderW - 2} y2={ctx.hipY} />
                <line x1={ctx.headCx + ctx.shoulderW} y1={ctx.shoulderY} x2={ctx.headCx + ctx.shoulderW + 2} y2={ctx.hipY} />
                {/* Longer legs */}
                <line x1={ctx.headCx} y1={ctx.hipY} x2={ctx.headCx - ctx.hipW} y2={ctx.feetY} />
                <line x1={ctx.headCx} y1={ctx.hipY} x2={ctx.headCx + ctx.hipW} y2={ctx.feetY} />
            </g>
        ),
    },
    {
        index: 4, name: 'Petite',
        render: (ctx) => (
            <g>
                <line x1={ctx.headCx} y1={ctx.neckY} x2={ctx.headCx} y2={ctx.shoulderY} />
                <line x1={ctx.headCx - ctx.shoulderW} y1={ctx.shoulderY} x2={ctx.headCx + ctx.shoulderW} y2={ctx.shoulderY} />
                <line x1={ctx.headCx} y1={ctx.shoulderY} x2={ctx.headCx} y2={ctx.hipY} />
                {/* Shorter arms */}
                <line x1={ctx.headCx - ctx.shoulderW} y1={ctx.shoulderY} x2={ctx.headCx - ctx.shoulderW - 1} y2={ctx.hipY - 3} />
                <line x1={ctx.headCx + ctx.shoulderW} y1={ctx.shoulderY} x2={ctx.headCx + ctx.shoulderW + 1} y2={ctx.hipY - 3} />
                {/* Legs */}
                <line x1={ctx.headCx} y1={ctx.hipY} x2={ctx.headCx - ctx.hipW} y2={ctx.feetY} />
                <line x1={ctx.headCx} y1={ctx.hipY} x2={ctx.headCx + ctx.hipW} y2={ctx.feetY} />
            </g>
        ),
    },
];

// --- CLOTHING ---
const CLOTHING: AvatarPart[] = [
    {
        index: 0, name: 'Plain',
        render: () => <g />, // no clothing
    },
    {
        index: 1, name: 'T-shirt',
        render: (ctx) => (
            <g>
                {/* T-shirt outline */}
                <path d={`M${ctx.headCx - ctx.shoulderW} ${ctx.shoulderY} L${ctx.headCx - ctx.shoulderW} ${ctx.shoulderY + 5} L${ctx.headCx - ctx.shoulderW + 3} ${ctx.shoulderY + 5} L${ctx.headCx - ctx.shoulderW + 3} ${ctx.hipY - 2} L${ctx.headCx + ctx.shoulderW - 3} ${ctx.hipY - 2} L${ctx.headCx + ctx.shoulderW - 3} ${ctx.shoulderY + 5} L${ctx.headCx + ctx.shoulderW} ${ctx.shoulderY + 5} L${ctx.headCx + ctx.shoulderW} ${ctx.shoulderY}`} fill="none" />
                {/* Neckline */}
                <path d={`M${ctx.headCx - 2} ${ctx.shoulderY} Q${ctx.headCx} ${ctx.shoulderY + 2} ${ctx.headCx + 2} ${ctx.shoulderY}`} fill="none" />
            </g>
        ),
    },
    {
        index: 2, name: 'Hoodie',
        render: (ctx) => (
            <g>
                {/* Hoodie body */}
                <path d={`M${ctx.headCx - ctx.shoulderW - 1} ${ctx.shoulderY} L${ctx.headCx - ctx.shoulderW - 1} ${ctx.hipY} L${ctx.headCx + ctx.shoulderW + 1} ${ctx.hipY} L${ctx.headCx + ctx.shoulderW + 1} ${ctx.shoulderY}`} fill="none" />
                {/* Hood line */}
                <path d={`M${ctx.headCx - 3} ${ctx.shoulderY} Q${ctx.headCx - 4} ${ctx.shoulderY - 3} ${ctx.headCx} ${ctx.shoulderY - 2} Q${ctx.headCx + 4} ${ctx.shoulderY - 3} ${ctx.headCx + 3} ${ctx.shoulderY}`} fill="none" />
                {/* Kangaroo pocket */}
                <rect x={ctx.headCx - 3} y={ctx.hipY - 5} width={6} height={3} rx={1} fill="none" />
            </g>
        ),
    },
    {
        index: 3, name: 'Dress',
        render: (ctx) => (
            <g>
                {/* Top */}
                <line x1={ctx.headCx - 3} y1={ctx.shoulderY} x2={ctx.headCx - 3} y2={ctx.shoulderY + 6} />
                <line x1={ctx.headCx + 3} y1={ctx.shoulderY} x2={ctx.headCx + 3} y2={ctx.shoulderY + 6} />
                {/* Flared skirt */}
                <path d={`M${ctx.headCx - 3} ${ctx.shoulderY + 6} Q${ctx.headCx - 5} ${ctx.hipY - 2} ${ctx.headCx - ctx.hipW - 3} ${ctx.hipY + 2}`} fill="none" />
                <path d={`M${ctx.headCx + 3} ${ctx.shoulderY + 6} Q${ctx.headCx + 5} ${ctx.hipY - 2} ${ctx.headCx + ctx.hipW + 3} ${ctx.hipY + 2}`} fill="none" />
                {/* Hem */}
                <path d={`M${ctx.headCx - ctx.hipW - 3} ${ctx.hipY + 2} Q${ctx.headCx} ${ctx.hipY + 4} ${ctx.headCx + ctx.hipW + 3} ${ctx.hipY + 2}`} fill="none" />
            </g>
        ),
    },
    {
        index: 4, name: 'Cape',
        render: (ctx) => (
            <g>
                {/* Cape drapes from shoulders */}
                <path d={`M${ctx.headCx - ctx.shoulderW} ${ctx.shoulderY} Q${ctx.headCx - ctx.shoulderW - 4} ${ctx.hipY - 3} ${ctx.headCx - ctx.shoulderW - 2} ${ctx.hipY + 4}`} fill="none" />
                <path d={`M${ctx.headCx + ctx.shoulderW} ${ctx.shoulderY} Q${ctx.headCx + ctx.shoulderW + 4} ${ctx.hipY - 3} ${ctx.headCx + ctx.shoulderW + 2} ${ctx.hipY + 4}`} fill="none" />
                {/* Cape bottom curve */}
                <path d={`M${ctx.headCx - ctx.shoulderW - 2} ${ctx.hipY + 4} Q${ctx.headCx} ${ctx.hipY + 7} ${ctx.headCx + ctx.shoulderW + 2} ${ctx.hipY + 4}`} fill="none" />
                {/* Clasp at neck */}
                <circle cx={ctx.headCx} cy={ctx.shoulderY} r={1} fill="currentColor" fillOpacity={0.3} stroke="none" />
            </g>
        ),
    },
];

// --- ACCESSORIES ---
const ACCESSORIES: AvatarPart[] = [
    {
        index: 0, name: 'None',
        render: () => <g />,
    },
    {
        index: 1, name: 'Cap',
        render: (ctx) => (
            <g>
                {/* Brim */}
                <line x1={ctx.headCx - ctx.headRx - 1} y1={ctx.headCy - ctx.headRy + 1} x2={ctx.headCx + ctx.headRx + 3} y2={ctx.headCy - ctx.headRy + 1} />
                {/* Crown */}
                <path d={`M${ctx.headCx - ctx.headRx} ${ctx.headCy - ctx.headRy + 1} Q${ctx.headCx - ctx.headRx} ${ctx.headCy - ctx.headRy - 3} ${ctx.headCx} ${ctx.headCy - ctx.headRy - 3} Q${ctx.headCx + ctx.headRx} ${ctx.headCy - ctx.headRy - 3} ${ctx.headCx + ctx.headRx} ${ctx.headCy - ctx.headRy + 1}`} fill="none" />
            </g>
        ),
    },
    {
        index: 2, name: 'Bow',
        render: (ctx) => (
            <g>
                {/* Left loop */}
                <path d={`M${ctx.headCx} ${ctx.headCy - ctx.headRy} Q${ctx.headCx - 4} ${ctx.headCy - ctx.headRy - 4} ${ctx.headCx - 1} ${ctx.headCy - ctx.headRy - 1}`} fill="none" />
                {/* Right loop */}
                <path d={`M${ctx.headCx} ${ctx.headCy - ctx.headRy} Q${ctx.headCx + 4} ${ctx.headCy - ctx.headRy - 4} ${ctx.headCx + 1} ${ctx.headCy - ctx.headRy - 1}`} fill="none" />
                {/* Center knot */}
                <circle cx={ctx.headCx} cy={ctx.headCy - ctx.headRy} r={0.8} fill="currentColor" stroke="none" />
            </g>
        ),
    },
    {
        index: 3, name: 'Crown',
        render: (ctx) => {
            const top = ctx.headCy - ctx.headRy - 1;
            return (
                <g>
                    <path d={`M${ctx.headCx - 4} ${top + 1} L${ctx.headCx - 4} ${top - 3} L${ctx.headCx - 2} ${top - 1} L${ctx.headCx} ${top - 4} L${ctx.headCx + 2} ${top - 1} L${ctx.headCx + 4} ${top - 3} L${ctx.headCx + 4} ${top + 1} Z`} fill="currentColor" fillOpacity={0.1} />
                </g>
            );
        },
    },
    {
        index: 4, name: 'Headband',
        render: (ctx) => (
            <g>
                <ellipse cx={ctx.headCx} cy={ctx.headCy - ctx.headRy + 1.5} rx={ctx.headRx + 0.5} ry={1.5} fill="none" />
            </g>
        ),
    },
];

// ── Categories (ordered for builder UI) ──────────────────────────────────────

export const AVATAR_CATEGORIES: AvatarCategory[] = [
    { key: 'h', label: 'Head', configKey: 'head', parts: HEADS },
    { key: 'r', label: 'Hair', configKey: 'hair', parts: HAIR },
    { key: 'e', label: 'Face', configKey: 'expression', parts: EXPRESSIONS },
    { key: 'b', label: 'Body', configKey: 'body', parts: BODIES },
    { key: 'c', label: 'Outfit', configKey: 'clothing', parts: CLOTHING },
    { key: 'a', label: 'Extra', configKey: 'accessory', parts: ACCESSORIES },
];

// ── Flair (earned items) ─────────────────────────────────────────────────────

export interface FlairItem extends AvatarPart {
    /** Unlock hint shown when locked */
    hint: string;
    /** Unlock check — receives user stats */
    isUnlocked: (stats: FlairStats) => boolean;
}

/** Subset of stats needed for flair unlock checks */
export interface FlairStats {
    dayStreak: number;
    totalSolved: number;
    bestStreak: number;
    sessionsPlayed: number;
    totalXP: number;
    masteredCount: number;
}

export const FLAIR_ITEMS: FlairItem[] = [
    {
        index: 0, name: 'None',
        hint: '',
        isUnlocked: () => true,
        render: () => <g />,
    },
    {
        index: 1, name: 'Halo',
        hint: '7-day streak',
        isUnlocked: (s) => s.dayStreak >= 7,
        render: (ctx) => (
            <ellipse
                cx={ctx.headCx} cy={ctx.headCy - ctx.headRy - 3}
                rx={ctx.headRx - 1} ry={1.5}
                strokeOpacity={0.5} strokeDasharray="1.5 1"
            />
        ),
    },
    {
        index: 2, name: 'Sparkles',
        hint: '200 words solved',
        isUnlocked: (s) => s.totalSolved >= 200,
        render: (ctx) => (
            <g strokeOpacity={0.6}>
                {/* Four small star-bursts around the figure */}
                <line x1={ctx.headCx - ctx.headRx - 4} y1={ctx.headCy - 2} x2={ctx.headCx - ctx.headRx - 4} y2={ctx.headCy - 5} />
                <line x1={ctx.headCx - ctx.headRx - 5.5} y1={ctx.headCy - 3.5} x2={ctx.headCx - ctx.headRx - 2.5} y2={ctx.headCy - 3.5} />
                <line x1={ctx.headCx + ctx.headRx + 4} y1={ctx.headCy} x2={ctx.headCx + ctx.headRx + 4} y2={ctx.headCy - 3} />
                <line x1={ctx.headCx + ctx.headRx + 2.5} y1={ctx.headCy - 1.5} x2={ctx.headCx + ctx.headRx + 5.5} y2={ctx.headCy - 1.5} />
                <line x1={ctx.headCx + 3} y1={ctx.shoulderY + 8} x2={ctx.headCx + 3} y2={ctx.shoulderY + 5} />
                <line x1={ctx.headCx + 1.5} y1={ctx.shoulderY + 6.5} x2={ctx.headCx + 4.5} y2={ctx.shoulderY + 6.5} />
            </g>
        ),
    },
    {
        index: 3, name: 'Wings',
        hint: 'Master 50 words',
        isUnlocked: (s) => s.masteredCount >= 50,
        render: (ctx) => (
            <g strokeOpacity={0.4}>
                {/* Left wing */}
                <path d={`M${ctx.headCx - ctx.shoulderW} ${ctx.shoulderY + 2} Q${ctx.headCx - ctx.shoulderW - 8} ${ctx.shoulderY - 4} ${ctx.headCx - ctx.shoulderW - 3} ${ctx.shoulderY + 6}`} fill="none" />
                <path d={`M${ctx.headCx - ctx.shoulderW} ${ctx.shoulderY + 2} Q${ctx.headCx - ctx.shoulderW - 6} ${ctx.shoulderY} ${ctx.headCx - ctx.shoulderW - 3} ${ctx.shoulderY + 6}`} fill="none" />
                {/* Right wing */}
                <path d={`M${ctx.headCx + ctx.shoulderW} ${ctx.shoulderY + 2} Q${ctx.headCx + ctx.shoulderW + 8} ${ctx.shoulderY - 4} ${ctx.headCx + ctx.shoulderW + 3} ${ctx.shoulderY + 6}`} fill="none" />
                <path d={`M${ctx.headCx + ctx.shoulderW} ${ctx.shoulderY + 2} Q${ctx.headCx + ctx.shoulderW + 6} ${ctx.shoulderY} ${ctx.headCx + ctx.shoulderW + 3} ${ctx.shoulderY + 6}`} fill="none" />
            </g>
        ),
    },
    {
        index: 4, name: 'Lightning',
        hint: '30-streak',
        isUnlocked: (s) => s.bestStreak >= 30,
        render: (ctx) => {
            const x = ctx.headCx + ctx.headRx + 2;
            const y = ctx.headCy - ctx.headRy - 4;
            return (
                <path d={`M${x} ${y} L${x - 1.5} ${y + 3} L${x + 0.5} ${y + 3} L${x - 1} ${y + 6} L${x + 2} ${y + 2} L${x} ${y + 2} L${x + 1.5} ${y}`}
                    fill="currentColor" fillOpacity={0.15} strokeOpacity={0.7}
                />
            );
        },
    },
    {
        index: 5, name: 'Flame Aura',
        hint: '1,000 words solved',
        isUnlocked: (s) => s.totalSolved >= 1000,
        render: (ctx) => (
            <g strokeOpacity={0.3}>
                {/* Wavy flame lines around body */}
                <path d={`M${ctx.headCx - ctx.shoulderW - 3} ${ctx.hipY} Q${ctx.headCx - ctx.shoulderW - 5} ${ctx.shoulderY + 3} ${ctx.headCx - ctx.shoulderW - 2} ${ctx.shoulderY - 2} Q${ctx.headCx - ctx.shoulderW - 4} ${ctx.headCy + 2} ${ctx.headCx - ctx.headRx - 2} ${ctx.headCy - 2}`} fill="none" />
                <path d={`M${ctx.headCx + ctx.shoulderW + 3} ${ctx.hipY} Q${ctx.headCx + ctx.shoulderW + 5} ${ctx.shoulderY + 3} ${ctx.headCx + ctx.shoulderW + 2} ${ctx.shoulderY - 2} Q${ctx.headCx + ctx.shoulderW + 4} ${ctx.headCy + 2} ${ctx.headCx + ctx.headRx + 2} ${ctx.headCy - 2}`} fill="none" />
            </g>
        ),
    },
    {
        index: 6, name: 'Star Trail',
        hint: '50 sessions played',
        isUnlocked: (s) => s.sessionsPlayed >= 50,
        render: (ctx) => {
            // Small 5-pointed star helper
            const star = (cx: number, cy: number, r: number) => {
                const pts: string[] = [];
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 72 - 90) * Math.PI / 180;
                    const innerAngle = ((i * 72 + 36) - 90) * Math.PI / 180;
                    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
                    pts.push(`${cx + r * 0.4 * Math.cos(innerAngle)},${cy + r * 0.4 * Math.sin(innerAngle)}`);
                }
                return pts.join(' ');
            };
            return (
                <g strokeOpacity={0.5}>
                    <polygon points={star(ctx.headCx - ctx.headRx - 4, ctx.headCy - 3, 2)} fill="currentColor" fillOpacity={0.08} />
                    <polygon points={star(ctx.headCx + ctx.headRx + 5, ctx.headCy + 1, 1.5)} fill="currentColor" fillOpacity={0.06} />
                    <polygon points={star(ctx.headCx - 4, ctx.feetY + 2, 1.5)} fill="currentColor" fillOpacity={0.06} />
                </g>
            );
        },
    },
    {
        index: 7, name: 'Rainbow Ring',
        hint: 'Reach Lexicon rank (1,800 XP)',
        isUnlocked: (s) => s.totalXP >= 1800,
        render: (ctx) => (
            <g>
                {/* Concentric arcs around the figure — drawn with dashes for rainbow effect */}
                <ellipse
                    cx={ctx.headCx} cy={ctx.shoulderY + 4}
                    rx={ctx.shoulderW + 6} ry={ctx.hipY - ctx.headCy + 8}
                    strokeOpacity={0.2} strokeDasharray="3 2" fill="none"
                />
                <ellipse
                    cx={ctx.headCx} cy={ctx.shoulderY + 4}
                    rx={ctx.shoulderW + 8} ry={ctx.hipY - ctx.headCy + 10}
                    strokeOpacity={0.12} strokeDasharray="2 3" fill="none"
                />
            </g>
        ),
    },
];
