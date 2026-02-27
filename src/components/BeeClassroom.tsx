/**
 * components/BeeClassroom.tsx
 *
 * Visual spelling bee classroom scene — chalk-line stick figures.
 * A Pronouncer at the front announces words; 4 spellers take turns spelling.
 * Speller index 2 is the player ("YOU"). NPCs have varying skill levels.
 *
 * Layout: active speller stands at center mic, others sit in a row behind.
 * Rich animations: speech bubbles, microphone, Pronouncer reactions, confetti.
 */
import { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type TargetAndTransition } from 'framer-motion';
import type { BeePhase } from '../hooks/useBeeSimulation';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
    pupilResults: (boolean | null)[];
    npcAlive: boolean[];
    npcScores: number[];
    /** NPC spelling attempts for the current round */
    npcSpellings: (string | null)[];
    phase: BeePhase;
    onPronounce: () => void;
    /** Called when NPC turns finish and it's the player's turn to spell */
    onPlayerTurn: () => void;
    round: number;
    /** Whether the player is actively typing (for breathing animation) */
    isTyping?: boolean;
    /** Last answer result for triggering celebration/shake on audience */
    lastResult?: boolean | null;
}

// ── Pupil names for speech bubbles ──────────────────────────────────────────

const NPC_NAMES = ['Alex', 'Maya', 'You', 'Sam'];

const NPC_IDLE_QUIPS = [
    ['Easy.', 'I got this.', '*adjusts glasses*', 'Obviously.'],
    ['Ooh pick me!', 'I know it!', 'Me me me!', 'Let me try!'],
    [],
    ['um...', 'oh no...', '*gulp*', 'eep...', 'I-I think...'],
];

const NPC_SUCCESS_QUIPS = [
    ['As expected.', 'Child\'s play.', 'Naturally.'],
    ['YES!!', 'Woohoo!', 'I did it!'],
    [],
    ['Wait, really?!', 'I got it?!', 'Oh wow!'],
];

const NPC_FAIL_QUIPS = [
    ['Impossible...', 'A fluke.', 'Hmph.'],
    ['Aww man!', 'So close!', 'Dang it!'],
    [],
    ['I knew it...', '*sigh*', 'Sorry...'],
];

const PRONOUNCER_INTROS = [
    'Welcome to the Spelling Bee!',
    'Spellers, are you ready?',
    'Let the Spelling Bee begin!',
];

const PRONOUNCER_ROUND_QUIPS = [
    'Next round!',
    'Moving on...',
    'Here we go!',
    'Next word, please.',
    'Alright, next up!',
];

const PRONOUNCER_PLAYER_INTROS = [
    'Your word is...',
    'Spell this word, please.',
    'Step up! Your word is...',
    'Speller, your word is...',
];

function pickQuip(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ── Idle animations per personality ──────────────────────────────────────────

const PRONOUNCER_IDLE: TargetAndTransition = {
    y: [0, -2, 0],
    transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' as const },
};

const PRONOUNCER_ANNOUNCE: TargetAndTransition = {
    y: [0, -3, 0],
    rotate: [-1, 1, -1],
    transition: { repeat: Infinity, duration: 0.8, ease: 'easeInOut' as const },
};

const PUPIL_IDLES: TargetAndTransition[] = [
    // Brainiac — slow, confident, arms crossed vibe
    { y: [0, -1, 0], transition: { repeat: Infinity, duration: 2.8, ease: 'easeInOut' as const } },
    // Eager — bouncy, excited
    { y: [0, -3, 0], scale: [1, 1.02, 1], transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' as const } },
    // Player
    { y: [0, -2, 0], transition: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' as const } },
    // Nervous — fidgety side-to-side + slight tremble
    { x: [-1, 1, -0.5, 0.5, 0], y: [0, -0.5, 0], transition: { repeat: Infinity, duration: 1.4, ease: 'easeInOut' as const } },
];

const PUPIL_ACTIVE: TargetAndTransition = {
    y: [0, -5, 0],
    scale: [1, 1.1, 1],
    transition: { repeat: Infinity, duration: 0.9, ease: 'easeInOut' as const },
};

/** Player breathing/anticipation while typing */
const PUPIL_TYPING: TargetAndTransition = {
    scaleY: [1, 1.02, 1],
    y: [0, -2, 0],
    transition: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' as const },
};

const PUPIL_SUCCESS: TargetAndTransition = {
    scale: [1, 1.2, 1],
    y: [0, -10, 0],
    transition: { duration: 0.5, ease: 'easeOut' as const },
};

/** Arms-up celebration for the player on success */
const PUPIL_CELEBRATE: TargetAndTransition = {
    scale: [1, 1.25, 1.1, 1.2, 1],
    y: [0, -14, -8, -12, 0],
    transition: { duration: 0.8, ease: 'easeOut' as const },
};

/** NPC audience clapping when player succeeds */
const PUPIL_CLAP: TargetAndTransition = {
    scale: [1, 1.05, 1, 1.05, 1],
    y: [0, -2, 0, -2, 0],
    transition: { duration: 0.6, ease: 'easeInOut' as const },
};

const PUPIL_FAIL: TargetAndTransition = {
    x: [-5, 5, -5, 5, -3, 3, 0],
    y: [0, 2, 0],
    transition: { duration: 0.45 },
};

/** Player loses balance on wrong answer */
const PUPIL_STUMBLE: TargetAndTransition = {
    rotate: [0, -8, 6, -4, 3, 0],
    x: [-3, 5, -4, 3, 0],
    y: [0, 3, 0],
    transition: { duration: 0.6 },
};

// ── Positioning constants ────────────────────────────────────────────────────

/** Original x positions (used as base for each pupil's internal coordinates) */
const PUPIL_CX = [55, 130, 200, 265];

/** Seated row x positions (3 seats for non-active pupils) */
const SEATED_CX = [65, 160, 255];

/** Active speller stands at center mic */
const MIC_CX = 160;

/** Get the seat index for a non-active pupil among other non-active pupils */
function getSeatIndex(pupilIdx: number, activePupilIdx: number): number {
    // Build ordered list of non-active pupils
    const nonActive = [0, 1, 2, 3].filter(i => i !== activePupilIdx);
    return nonActive.indexOf(pupilIdx);
}

/** Get the transform for a pupil: at mic (active) or seated (inactive) */
function getPupilTransform(
    pupilIdx: number,
    activePupilIdx: number,
): { x: number; y: number; scale: number } {
    const baseCx = PUPIL_CX[pupilIdx];

    if (activePupilIdx === -1) {
        // No one active — all in evenly-spaced seated row
        const allSeats = [55, 130, 200, 265]; // same as PUPIL_CX, no movement
        return { x: allSeats[pupilIdx] - baseCx, y: 46, scale: 0.6 };
    }

    if (pupilIdx === activePupilIdx) {
        // At the mic, center stage
        return { x: MIC_CX - baseCx, y: 6, scale: 1 };
    }

    // Seated in background
    const seatIdx = getSeatIndex(pupilIdx, activePupilIdx);
    const seatX = SEATED_CX[seatIdx] ?? SEATED_CX[1]; // fallback center
    return { x: seatX - baseCx, y: 46, scale: 0.6 };
}

// ── Microphone stand ─────────────────────────────────────────────────────────

function MicStand({ cx }: { cx: number }) {
    return (
        <g opacity="0.4">
            {/* Tripod base — three legs splaying out */}
            <line x1={cx} y1="134" x2={cx - 8} y2="140" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <line x1={cx} y1="134" x2={cx + 8} y2="140" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <line x1={cx} y1="134" x2={cx} y2="141" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            {/* Foot caps */}
            <circle cx={cx - 8} cy="140.5" r="1" fill="currentColor" opacity="0.3" />
            <circle cx={cx + 8} cy="140.5" r="1" fill="currentColor" opacity="0.3" />
            <circle cx={cx} cy="141.5" r="1" fill="currentColor" opacity="0.3" />

            {/* Stand pole — two segments with a joint */}
            <line x1={cx} y1="134" x2={cx} y2="124" stroke="currentColor" strokeWidth="1.8" />
            {/* Joint knob */}
            <ellipse cx={cx} cy="124" rx="1.5" ry="1" fill="currentColor" opacity="0.35" />
            {/* Upper pole */}
            <line x1={cx} y1="124" x2={cx} y2="116" stroke="currentColor" strokeWidth="1.5" />

            {/* Mic clip / holder */}
            <path
                d={`M ${cx - 2.5} 116 L ${cx - 2.5} 114 Q ${cx - 2.5} 112.5 ${cx - 1} 112.5 L ${cx + 1} 112.5 Q ${cx + 2.5} 112.5 ${cx + 2.5} 114 L ${cx + 2.5} 116`}
                stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6"
            />

            {/* Mic head — rounded capsule shape */}
            <rect x={cx - 4} y="104" width="8" height="9" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />

            {/* Grill mesh pattern */}
            <line x1={cx - 2.5} y1="105.5" x2={cx + 2.5} y2="105.5" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
            <line x1={cx - 3} y1="107.5" x2={cx + 3} y2="107.5" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
            <line x1={cx - 3} y1="109.5" x2={cx + 3} y2="109.5" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
            <line x1={cx - 2.5} y1="111.5" x2={cx + 2.5} y2="111.5" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />

            {/* Highlight reflection on mic head */}
            <line x1={cx - 1.5} y1="105" x2={cx - 1.5} y2="112" stroke="currentColor" strokeWidth="0.4" opacity="0.15" />
        </g>
    );
}

// ── Sparkle particles (for success celebration) ──────────────────────────────

function Sparkles({ cx, cy }: { cx: number; cy: number }) {
    const offsets = [
        { dx: -12, dy: -8, delay: 0 },
        { dx: 8, dy: -14, delay: 0.1 },
        { dx: 14, dy: -4, delay: 0.15 },
        { dx: -8, dy: -16, delay: 0.05 },
        { dx: 4, dy: -18, delay: 0.08 },
    ];
    return (
        <g>
            {offsets.map((o, i) => (
                <motion.g
                    key={i}
                    initial={{ opacity: 0, y: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0], y: [0, o.dy - 10], scale: [0, 1.2, 0] }}
                    transition={{ duration: 0.7, delay: o.delay }}
                >
                    {/* 4-point star sparkle */}
                    <path
                        d={`M${cx + o.dx},${cy + o.dy - 3} L${cx + o.dx + 1},${cy + o.dy} L${cx + o.dx},${cy + o.dy + 3} L${cx + o.dx - 1},${cy + o.dy} Z`}
                        fill="var(--color-gold)" opacity="0.8"
                    />
                </motion.g>
            ))}
        </g>
    );
}

// ── SVG sub-components ───────────────────────────────────────────────────────

const Pronouncer = memo(function Pronouncer({ announcing, lastNpcResult }: {
    announcing: boolean;
    lastNpcResult: boolean | null;
}) {
    // Pronouncer's face changes based on recent NPC result
    let mouthPath = 'M 155 33 Q 160 38 165 33'; // default smile
    let eyeL = <circle cx="155" cy="27" r="1.8" fill="currentColor" opacity="0.7" />;
    let eyeR = <circle cx="165" cy="27" r="1.8" fill="currentColor" opacity="0.7" />;

    if (lastNpcResult === true) {
        // Happy — big smile, arched eyes
        mouthPath = 'M 153 33 Q 160 41 167 33';
        eyeL = <path d="M 152 27 Q 155 23 158 27" stroke="currentColor" strokeWidth="1.5" fill="none" />;
        eyeR = <path d="M 162 27 Q 165 23 168 27" stroke="currentColor" strokeWidth="1.5" fill="none" />;
    } else if (lastNpcResult === false) {
        // Concerned — O mouth, worried brows
        mouthPath = '';
    }

    return (
        <motion.g animate={announcing ? PRONOUNCER_ANNOUNCE : PRONOUNCER_IDLE}>
            {/* Head */}
            <circle cx="160" cy="28" r="13" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.8" />
            {/* Hair — messy professor look */}
            <path d="M 148 22 Q 146 14 152 16" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.4" />
            <path d="M 155 18 Q 158 12 162 18" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.35" />
            <path d="M 168 20 Q 174 14 172 22" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.4" />
            {/* Eyes */}
            {eyeL}
            {eyeR}
            {/* Mouth */}
            {lastNpcResult === false ? (
                <circle cx="160" cy="34" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
            ) : (
                <path d={mouthPath} stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
            )}
            {/* Cheeks when happy */}
            {lastNpcResult === true && (
                <>
                    <circle cx="150" cy="32" r="2.5" fill="currentColor" opacity="0.06" />
                    <circle cx="170" cy="32" r="2.5" fill="currentColor" opacity="0.06" />
                </>
            )}
            {/* Body */}
            <line x1="160" y1="41" x2="160" y2="82" stroke="currentColor" strokeWidth="2" opacity="0.7" />
            {/* Left arm — animated pointer */}
            <motion.g
                animate={announcing
                    ? { rotate: [-5, 10, -5], transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' as const } }
                    : { rotate: 0 }
                }
                style={{ originX: '160px', originY: '54px' }}
            >
                <path d="M 160 54 L 136 64" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
                <line x1="136" y1="64" x2="122" y2="46" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            </motion.g>
            {/* Right arm (gesturing) */}
            <motion.path
                d="M 160 54 L 184 60"
                stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6"
                animate={announcing
                    ? {
                        d: ['M 160 54 L 184 60', 'M 160 54 L 186 50', 'M 160 54 L 184 60'],
                        transition: { repeat: Infinity, duration: 1.0, ease: 'easeInOut' as const }
                    }
                    : { d: 'M 160 54 L 184 60' }}
            />
            {/* Legs */}
            <line x1="160" y1="82" x2="148" y2="108" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
            <line x1="160" y1="82" x2="172" y2="108" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
            {/* Lectern with wood grain detail */}
            <rect x="145" y="74" width="30" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.25" />
            <line x1="150" y1="78" x2="170" y2="78" stroke="currentColor" strokeWidth="0.5" opacity="0.12" />
            <line x1="148" y1="82" x2="172" y2="82" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
        </motion.g>
    );
});

/** Base stick figure pupil */
function PupilBody({ cx, variant }: { cx: number; variant: number }) {
    return (
        <>
            {/* Head */}
            <circle cx={cx} cy="142" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
            {/* Body */}
            <line x1={cx} y1="150" x2={cx} y2="170" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
            {/* Default arms */}
            {variant !== 1 && (
                <>
                    <line x1={cx} y1="156" x2={cx - 10} y2="163" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                    <line x1={cx} y1="156" x2={cx + 10} y2="163" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                </>
            )}
            {/* Legs */}
            <line x1={cx} y1="170" x2={cx - 7} y2="185" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <line x1={cx} y1="170" x2={cx + 7} y2="185" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        </>
    );
}

/** Brainiac — glasses, confident smirk, neat hair part */
function BrainiacFace({ cx }: { cx: number }) {
    return (
        <>
            {/* Glasses */}
            <circle cx={cx - 3} cy="141" r="3.5" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.5" />
            <circle cx={cx + 3} cy="141" r="3.5" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.5" />
            <line x1={cx - 0.5} y1="141" x2={cx + 0.5} y2="141" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
            {/* Temple arms */}
            <line x1={cx - 6.5} y1="141" x2={cx - 8} y2="139" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
            <line x1={cx + 6.5} y1="141" x2={cx + 8} y2="139" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
            {/* Eyes behind glasses */}
            <circle cx={cx - 3} cy="141" r="1" fill="currentColor" opacity="0.5" />
            <circle cx={cx + 3} cy="141" r="1" fill="currentColor" opacity="0.5" />
            {/* Confident smirk */}
            <path d={`M ${cx - 3} 146 Q ${cx + 1} 148 ${cx + 3} 145`} stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
            {/* Neat hair */}
            <path d={`M ${cx - 6} 136 Q ${cx} 131 ${cx + 7} 135`} stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3" />
            <line x1={cx - 1} y1="134" x2={cx - 1} y2="137" stroke="currentColor" strokeWidth="0.8" opacity="0.2" />
        </>
    );
}

/** Eager — big eyes, huge smile, raised hand, spiky hair */
function EagerFace({ cx }: { cx: number }) {
    return (
        <>
            {/* Big excited eyes */}
            <circle cx={cx - 3} cy="141" r="1.8" fill="currentColor" opacity="0.6" />
            <circle cx={cx + 3} cy="141" r="1.8" fill="currentColor" opacity="0.6" />
            {/* Highlight dots */}
            <circle cx={cx - 2.2} cy="140.2" r="0.6" fill="currentColor" opacity="0.15" />
            <circle cx={cx + 3.8} cy="140.2" r="0.6" fill="currentColor" opacity="0.15" />
            {/* Big grin */}
            <path d={`M ${cx - 4} 145 Q ${cx} 151 ${cx + 4} 145`} stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.6" />
            {/* Raised hand — override left arm */}
            <line x1={cx} y1="156" x2={cx - 10} y2="143" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            {/* Open palm */}
            <circle cx={cx - 11} cy="142" r="2" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.35" />
            {/* Normal right arm */}
            <line x1={cx} y1="156" x2={cx + 10} y2="163" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            {/* Spiky hair */}
            <path d={`M ${cx - 6} 136 L ${cx - 4} 130 L ${cx - 1} 135 L ${cx + 2} 129 L ${cx + 5} 135 L ${cx + 7} 131 L ${cx + 8} 136`} stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.35" />
        </>
    );
}

/** Player — simple friendly face, slight star accent */
function PlayerFace({ cx }: { cx: number }) {
    return (
        <>
            {/* Friendly eyes */}
            <circle cx={cx - 3} cy="141" r="1.3" fill="currentColor" opacity="0.6" />
            <circle cx={cx + 3} cy="141" r="1.3" fill="currentColor" opacity="0.6" />
            {/* Friendly smile */}
            <path d={`M ${cx - 3} 146 Q ${cx} 150 ${cx + 3} 146`} stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.5" />
        </>
    );
}

/** Nervous — worried brows, wobbly mouth, messy hair, animated sweat */
function NervousFace({ cx }: { cx: number }) {
    return (
        <>
            {/* Worried eyes — looking to the side */}
            <circle cx={cx - 2} cy="141" r="1.2" fill="currentColor" opacity="0.5" />
            <circle cx={cx + 4} cy="141" r="1.2" fill="currentColor" opacity="0.5" />
            {/* Worried eyebrows */}
            <line x1={cx - 5} y1="137" x2={cx - 1} y2="139" stroke="currentColor" strokeWidth="1" opacity="0.4" />
            <line x1={cx + 6} y1="137" x2={cx + 2} y2="139" stroke="currentColor" strokeWidth="1" opacity="0.4" />
            {/* Wobbly uncertain mouth */}
            <path d={`M ${cx - 3} 146 Q ${cx - 1} 148 ${cx} 146 Q ${cx + 1} 144 ${cx + 3} 146`} stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
            {/* Messy hair */}
            <path d={`M ${cx - 6} 136 Q ${cx - 3} 133 ${cx} 136 Q ${cx + 3} 132 ${cx + 6} 136`} stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.3" />
            {/* Animated sweat drops */}
            <motion.ellipse
                cx={cx + 10} cy="138" rx="1.5" ry="2.5"
                fill="currentColor" opacity="0.25"
                animate={{ y: [0, 4, 0], opacity: [0.25, 0.1, 0.25] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' as const }}
            />
            <motion.ellipse
                cx={cx + 12} cy="142" rx="1" ry="1.8"
                fill="currentColor" opacity="0.15"
                animate={{ y: [0, 3, 0], opacity: [0.15, 0.05, 0.15] }}
                transition={{ repeat: Infinity, duration: 2.5, delay: 0.5, ease: 'easeInOut' as const }}
            />
        </>
    );
}

/** Player — gold glow ring + "YOU" label with bounce */
function PlayerExtras({ cx, isActive }: { cx: number; isActive: boolean }) {
    return (
        <>
            {/* Outer glow */}
            <motion.circle
                cx={cx} cy="160" r="24"
                stroke="var(--color-gold)" strokeWidth="1" fill="none"
                animate={isActive
                    ? { opacity: [0.08, 0.3, 0.08], scale: [1, 1.06, 1], transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' as const } }
                    : { opacity: 0.08 }
                }
            />
            {/* Inner glow */}
            {isActive && (
                <motion.circle
                    cx={cx} cy="160" r="16"
                    stroke="var(--color-gold)" strokeWidth="0.5" fill="none"
                    animate={{ opacity: [0.05, 0.2, 0.05], scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.0, ease: 'easeInOut' as const }}
                />
            )}
            {/* "YOU" label */}
            <motion.text
                x={cx} y="196" textAnchor="middle"
                fontSize="11" fill="var(--color-gold)" opacity="0.8"
                fontFamily="var(--font-ui)" fontWeight="bold"
                animate={isActive
                    ? { y: [196, 193, 196], opacity: [0.8, 1, 0.8], transition: { repeat: Infinity, duration: 1.0, ease: 'easeInOut' as const } }
                    : {}}
            >
                YOU
            </motion.text>
            {/* Small star above head when active */}
            {isActive && (
                <motion.path
                    d={`M${cx},127 l1.5,3 3,0.5 -2.2,2 0.7,3 -3-1.5 -3,1.5 0.7-3 -2.2-2 3-0.5z`}
                    fill="var(--color-gold)" opacity="0.5"
                    animate={{ rotate: [0, 15, -15, 0], scale: [0.8, 1.1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' as const }}
                />
            )}
        </>
    );
}

/** Check / X result indicator above a pupil's head */
function ResultIndicator({ cx, correct }: { cx: number; correct: boolean }) {
    if (correct) {
        return (
            <>
                <motion.path
                    d={`M ${cx - 5} 127 L ${cx - 1} 131 L ${cx + 6} 122`}
                    stroke="var(--color-correct)" strokeWidth="2.5" fill="none" strokeLinecap="round"
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ opacity: 0.9, pathLength: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut' as const }}
                />
                <Sparkles cx={cx} cy={125} />
            </>
        );
    }
    return (
        <motion.g
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 0.8, scale: 1 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
        >
            <line x1={cx - 4} y1="123" x2={cx + 4} y2="131" stroke="var(--color-wrong)" strokeWidth="2.5" strokeLinecap="round" />
            <line x1={cx + 4} y1="123" x2={cx - 4} y2="131" stroke="var(--color-wrong)" strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>
    );
}

/** Speech bubble near a pupil */
function SpeechBubble({ cx, text, side = 'right' }: { cx: number; text: string; side?: 'left' | 'right' }) {
    const bx = side === 'right' ? cx + 18 : cx - 18;
    // Estimate width from text length
    const w = Math.max(44, text.length * 8 + 16);
    const textX = side === 'right' ? bx + 4 : bx - w + 4;

    return (
        <motion.g
            initial={{ opacity: 0, y: 3, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -3, scale: 0.7 }}
            transition={{ duration: 0.25 }}
        >
            <rect
                x={textX - 5} y="120" width={w} height="22" rx="6"
                fill="currentColor" opacity="0.1"
                stroke="currentColor" strokeWidth="0.6"
                style={{ strokeOpacity: 0.2 }}
            />
            {/* Tail */}
            <path
                d={side === 'right'
                    ? `M ${bx - 2} 142 L ${cx + 8} 148 L ${bx + 4} 142`
                    : `M ${bx - 4} 142 L ${cx - 8} 148 L ${bx + 2} 142`
                }
                fill="currentColor" opacity="0.1"
                stroke="currentColor" strokeWidth="0.6"
                style={{ strokeOpacity: 0.2 }}
            />
            <text
                x={textX + w / 2 - 3} y="136"
                textAnchor="middle" fontSize="13"
                fill="var(--color-chalk)" opacity="0.9"
                fontFamily="var(--font-ui)"
                fontWeight="700"
            >
                {text}
            </text>
        </motion.g>
    );
}

// ── Mini bee mascot for stage decoration ────────────────────────────────────

function StageBee({ phase }: { phase: BeePhase }) {
    const isSpelling = phase === 'spelling';
    return (
        <motion.g
            animate={isSpelling
                ? { y: [0, -3, 0], x: [0, 2, -2, 0], transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' as const } }
                : { y: [0, -4, 0], transition: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' as const } }
            }
        >
            {/* Body */}
            <ellipse cx="128" cy="110" rx="5" ry="6" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.45" />
            {/* Stripes */}
            <line x1="124" y1="108" x2="132" y2="108" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
            <line x1="124" y1="111" x2="132" y2="111" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
            {/* Head */}
            <circle cx="128" cy="103" r="3.5" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.45" />
            {/* Eyes */}
            <circle cx="127" cy="102.5" r="0.7" fill="currentColor" opacity="0.4" />
            <circle cx="129.5" cy="102.5" r="0.7" fill="currentColor" opacity="0.4" />
            {/* Smile */}
            <path d="M 126.5 104 Q 128 105.5 129.5 104" stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.35" />
            {/* Wings */}
            <motion.ellipse
                cx="123" cy="106" rx="4" ry="5"
                stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.25"
                style={{ originX: '126px', originY: '106px' }}
                animate={{ scaleX: [1, 0.4, 1], transition: { repeat: Infinity, duration: 0.2, ease: 'easeInOut' as const } }}
            />
            <motion.ellipse
                cx="133" cy="106" rx="4" ry="5"
                stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.25"
                style={{ originX: '130px', originY: '106px' }}
                animate={{ scaleX: [1, 0.4, 1], transition: { repeat: Infinity, duration: 0.2, ease: 'easeInOut' as const } }}
            />
            {/* Antennae */}
            <path d="M 126.5 100 Q 124 96 122 97" stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.35" />
            <circle cx="122" cy="97" r="1" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.3" />
            <path d="M 129.5 100 Q 131.5 96 134 97" stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.35" />
            <circle cx="134" cy="97" r="1" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.3" />
            {/* Stinger */}
            <path d="M 127 115.5 L 128 118 L 129 115.5" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.3" />
        </motion.g>
    );
}

// ── Floor / atmosphere details ───────────────────────────────────────────────

// ── Audience Row ──────────────────────────────────────────────────────────────

const AUDIENCE_CX = [45, 85, 125, 160, 195, 235, 275];

/** Audience reaction state driven by phase and lastResult */
type AudienceReaction = 'idle' | 'gasp' | 'cheer' | 'ovation';

const AUDIENCE_IDLES: TargetAndTransition[] = AUDIENCE_CX.map((_, i) => ({
    y: [0, -0.5, 0],
    transition: { repeat: Infinity, duration: 2 + i * 0.3, ease: 'easeInOut' as const, delay: i * 0.2 },
}));

const AUDIENCE_GASP: TargetAndTransition = {
    y: [0, -2, 0],
    scale: [1, 1.05, 1],
    transition: { duration: 0.4 },
};

const AUDIENCE_CHEER: TargetAndTransition = {
    y: [0, -3, 0, -2, 0],
    transition: { duration: 0.5, ease: 'easeOut' as const },
};

const AUDIENCE_OVATION: TargetAndTransition = {
    y: [0, -4, 0, -3, 0, -4, 0],
    scale: [1, 1.08, 1, 1.06, 1, 1.08, 1],
    transition: { duration: 1.2, ease: 'easeInOut' as const },
};

function AudienceRow({ reaction, reducedMotion }: { reaction: AudienceReaction; reducedMotion: boolean }) {
    return (
        <g opacity="0.15">
            {AUDIENCE_CX.map((cx, i) => (
                <motion.g
                    key={i}
                    animate={reducedMotion ? {} :
                        reaction === 'ovation' ? AUDIENCE_OVATION :
                        reaction === 'cheer' ? AUDIENCE_CHEER :
                        reaction === 'gasp' ? AUDIENCE_GASP :
                        AUDIENCE_IDLES[i]
                    }
                >
                    {/* Head */}
                    <circle cx={cx} cy="238" r="2.5" stroke="currentColor" strokeWidth="0.8" fill="none" />
                    {/* Body */}
                    <line x1={cx} y1="240.5" x2={cx} y2="248" stroke="currentColor" strokeWidth="0.8" />
                    {/* Arms — change based on reaction */}
                    {reaction === 'cheer' || reaction === 'ovation' ? (
                        <>
                            <line x1={cx} y1="243" x2={cx - 3} y2="239" stroke="currentColor" strokeWidth="0.6" />
                            <line x1={cx} y1="243" x2={cx + 3} y2="239" stroke="currentColor" strokeWidth="0.6" />
                        </>
                    ) : reaction === 'gasp' ? (
                        <>
                            <line x1={cx} y1="243" x2={cx - 2} y2="240" stroke="currentColor" strokeWidth="0.6" />
                            <line x1={cx} y1="243" x2={cx + 2} y2="240" stroke="currentColor" strokeWidth="0.6" />
                        </>
                    ) : (
                        <>
                            <line x1={cx} y1="243" x2={cx - 3} y2="246" stroke="currentColor" strokeWidth="0.6" />
                            <line x1={cx} y1="243" x2={cx + 3} y2="246" stroke="currentColor" strokeWidth="0.6" />
                        </>
                    )}
                </motion.g>
            ))}
        </g>
    );
}

function StageDecor() {
    return (
        <g>
            {/* Stage front edge — double line */}
            <line x1="15" y1="118" x2="305" y2="118" stroke="currentColor" strokeWidth="1" opacity="0.15" />
            <line x1="20" y1="120" x2="300" y2="120" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 5" opacity="0.08" />
            {/* "SPELLING BEE" text on stage */}
            <text x="160" y="114" textAnchor="middle" fontSize="6" fill="currentColor" opacity="0.1" fontFamily="var(--font-ui)" letterSpacing="3">
                SPELLING BEE
            </text>
            {/* Floor boards hint */}
            <line x1="40" y1="198" x2="280" y2="198" stroke="currentColor" strokeWidth="0.5" opacity="0.06" />
            <line x1="30" y1="202" x2="290" y2="202" stroke="currentColor" strokeWidth="0.5" opacity="0.04" />
            {/* Seated row bench hint */}
            <line x1="35" y1="228" x2="285" y2="228" stroke="currentColor" strokeWidth="0.8" opacity="0.08" />
            <line x1="40" y1="230" x2="280" y2="230" stroke="currentColor" strokeWidth="0.4" opacity="0.05" />
        </g>
    );
}

// ── Main Classroom Component ─────────────────────────────────────────────────

const FACE_COMPONENTS = [BrainiacFace, EagerFace, PlayerFace, NervousFace];

export const BeeClassroom = memo(function BeeClassroom({
    pupilResults,
    npcAlive,
    npcScores,
    npcSpellings,
    phase,
    onPronounce,
    onPlayerTurn,
    round,
    isTyping = false,
    lastResult = null,
}: Props) {
    const { reducedMotion } = useReducedMotion();
    // Turn sequencing: step through NPC turns visually, then land on player
    const [displayedTurn, setDisplayedTurn] = useState(-1);
    const [revealedResults, setRevealedResults] = useState<Set<number>>(new Set());
    const [speechBubbles, setSpeechBubbles] = useState<Record<number, string>>({});
    const [pronouncerBubble, setPronouncerBubble] = useState('');
    const [pronouncerReaction, setPronouncerReaction] = useState<boolean | null>(null);
    const [announcing, setAnnouncing] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Track player feedback animation (celebrate/stumble)
    const [playerFeedbackAnim, setPlayerFeedbackAnim] = useState<'celebrate' | 'stumble' | null>(null);

    // Trigger celebrate/stumble when feedback phase starts
    useEffect(() => {
        if (phase === 'feedback' && lastResult !== null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- animation trigger on phase transition
            setPlayerFeedbackAnim(lastResult ? 'celebrate' : 'stumble');
            const t = setTimeout(() => setPlayerFeedbackAnim(null), 900);
            return () => clearTimeout(t);
        }
        setPlayerFeedbackAnim(null);
    }, [phase, lastResult]);

    useEffect(() => {
        if (phase !== 'listening') return;

        // Reset
        // eslint-disable-next-line react-hooks/set-state-in-effect -- phase transition resets
        setDisplayedTurn(-1);
        setRevealedResults(new Set());
        setSpeechBubbles({});
        setPronouncerReaction(null);
        setAnnouncing(true);

        // Clear any pending timers
        timerRef.current.forEach(clearTimeout);
        timerRef.current = [];

        // Pronouncer intro bubble
        const introQuip = round === 0
            ? pickQuip(PRONOUNCER_INTROS)
            : pickQuip(PRONOUNCER_ROUND_QUIPS);
        setPronouncerBubble(introQuip);

        // Clear pronouncer bubble after a beat
        timerRef.current.push(setTimeout(() => {
            setPronouncerBubble('');
            setAnnouncing(false);
        }, 1200));

        // NPC indices before player: 0, 1
        const npcsBefore = [0, 1].filter(i => npcAlive[i]);
        // NPC after player: 3
        const npcsAfter = [3].filter(i => npcAlive[i]);
        let delay = 1400;

        // Sequence through NPCs before player
        npcsBefore.forEach((npcIdx) => {
            // Pronouncer announces NPC's turn
            timerRef.current.push(setTimeout(() => {
                setDisplayedTurn(npcIdx);
                setPronouncerBubble(`${NPC_NAMES[npcIdx]}, your word is...`);
                setAnnouncing(true);
                const quip = pickQuip(NPC_IDLE_QUIPS[npcIdx]);
                setSpeechBubbles(prev => ({ ...prev, [npcIdx]: quip }));
            }, delay));

            // Clear pronouncer bubble, show spelling attempt
            timerRef.current.push(setTimeout(() => {
                setPronouncerBubble('');
                setAnnouncing(false);
                const spelling = npcSpellings[npcIdx];
                if (spelling) {
                    setSpeechBubbles(prev => ({ ...prev, [npcIdx]: spelling.toUpperCase() }));
                }
            }, delay + 600));

            // Reveal result + reaction quip
            timerRef.current.push(setTimeout(() => {
                setRevealedResults(prev => new Set(prev).add(npcIdx));
                const result = pupilResults[npcIdx];
                const quip = result
                    ? pickQuip(NPC_SUCCESS_QUIPS[npcIdx])
                    : pickQuip(NPC_FAIL_QUIPS[npcIdx]);
                setSpeechBubbles(prev => ({ ...prev, [npcIdx]: quip }));
                setPronouncerReaction(result);
            }, delay + 1200));

            // Clear speech bubble + result indicator (Step 2: clean between turns)
            timerRef.current.push(setTimeout(() => {
                setSpeechBubbles(prev => {
                    const next = { ...prev };
                    delete next[npcIdx];
                    return next;
                });
                setRevealedResults(prev => {
                    const next = new Set(prev);
                    next.delete(npcIdx);
                    return next;
                });
                setPronouncerReaction(null);
            }, delay + 1900));

            delay += 2100;
        });

        // NPC after player (Sam/Nervous) — same full turn sequence
        npcsAfter.forEach((npcIdx) => {
            // Pronouncer announces
            timerRef.current.push(setTimeout(() => {
                setDisplayedTurn(npcIdx);
                setPronouncerBubble(`${NPC_NAMES[npcIdx]}, your word is...`);
                setAnnouncing(true);
                const quip = pickQuip(NPC_IDLE_QUIPS[npcIdx]);
                setSpeechBubbles(prev => ({ ...prev, [npcIdx]: quip }));
            }, delay));

            // Clear pronouncer, show spelling
            timerRef.current.push(setTimeout(() => {
                setPronouncerBubble('');
                setAnnouncing(false);
                const spelling = npcSpellings[npcIdx];
                if (spelling) {
                    setSpeechBubbles(prev => ({ ...prev, [npcIdx]: spelling.toUpperCase() }));
                }
            }, delay + 600));

            // Reveal result
            timerRef.current.push(setTimeout(() => {
                setRevealedResults(prev => new Set(prev).add(npcIdx));
                const result = pupilResults[npcIdx];
                const quip = result
                    ? pickQuip(NPC_SUCCESS_QUIPS[npcIdx])
                    : pickQuip(NPC_FAIL_QUIPS[npcIdx]);
                setSpeechBubbles(prev => ({ ...prev, [npcIdx]: quip }));
                setPronouncerReaction(result);
            }, delay + 1200));

            // Clear speech bubble + result indicator
            timerRef.current.push(setTimeout(() => {
                setSpeechBubbles(prev => {
                    const next = { ...prev };
                    delete next[npcIdx];
                    return next;
                });
                setRevealedResults(prev => {
                    const next = new Set(prev);
                    next.delete(npcIdx);
                    return next;
                });
                setPronouncerReaction(null);
            }, delay + 1900));

            delay += 2100;
        });

        // Clear pronouncer reaction before player's turn
        timerRef.current.push(setTimeout(() => {
            setPronouncerReaction(null);
            setPronouncerBubble(pickQuip(PRONOUNCER_PLAYER_INTROS));
            setAnnouncing(true);
        }, delay - 200));

        // Land on player and immediately signal parent to show inline input
        timerRef.current.push(setTimeout(() => {
            setDisplayedTurn(2);
            setAnnouncing(false);
            onPlayerTurn();
        }, delay));

        // Clear pronouncer bubble after a beat
        timerRef.current.push(setTimeout(() => {
            setPronouncerBubble('');
        }, delay + 2000));

        return () => { timerRef.current.forEach(clearTimeout); };
    }, [phase, round]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <svg
            viewBox="0 0 320 260"
            className="w-full max-w-[320px] h-auto cursor-pointer"
            style={{ color: 'var(--color-chalk)' }}
            onClick={onPronounce}
            role="button"
            aria-label="Tap the Pronouncer to hear the word"
        >
            {/* Stage decor */}
            <StageDecor />

            {/* Mini bee mascot near stage title */}
            <StageBee phase={phase} />

            {/* Microphone at center stage */}
            <MicStand cx={160} />

            {/* Pronouncer */}
            <Pronouncer announcing={announcing} lastNpcResult={pronouncerReaction} />

            {/* Pronouncer speech bubble */}
            <AnimatePresence>
                {pronouncerBubble && (
                    <motion.g
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -3 }}
                        transition={{ duration: 0.25 }}
                    >
                        <rect
                            x={160 - pronouncerBubble.length * 4.5 - 10}
                            y="-2" width={pronouncerBubble.length * 9 + 20} height="22" rx="7"
                            fill="currentColor" opacity="0.12"
                            stroke="currentColor" strokeWidth="0.7"
                            style={{ strokeOpacity: 0.25 }}
                        />
                        <path
                            d="M 155 20 L 160 27 L 165 20"
                            fill="currentColor" opacity="0.12"
                            stroke="currentColor" strokeWidth="0.7"
                            style={{ strokeOpacity: 0.25 }}
                        />
                        <text
                            x="160" y="14" textAnchor="middle"
                            fontSize="14" fill="var(--color-chalk)" opacity="0.95"
                            fontFamily="var(--font-ui)"
                            fontWeight="700"
                        >
                            {pronouncerBubble}
                        </text>
                    </motion.g>
                )}
            </AnimatePresence>

            {/* Pupils — each wrapped in a positional motion.g for mic/seat transitions */}
            {PUPIL_CX.map((cx, i) => {
                const alive = npcAlive[i];
                const isActive = displayedTurn === i;
                const resultRevealed = revealedResults.has(i);
                const result = pupilResults[i];
                const isPlayer = i === 2;
                const score = npcScores[i];

                // Pick personality animation
                let anim: TargetAndTransition;
                if (!alive && !isPlayer) {
                    anim = { opacity: 0.15 };
                } else if (reducedMotion) {
                    // Keep positional transitions, skip personality animations
                    anim = {};
                } else if (isPlayer && playerFeedbackAnim === 'celebrate') {
                    anim = PUPIL_CELEBRATE;
                } else if (isPlayer && playerFeedbackAnim === 'stumble') {
                    anim = PUPIL_STUMBLE;
                } else if (!isPlayer && playerFeedbackAnim === 'celebrate' && alive) {
                    // NPCs clap when player celebrates
                    anim = PUPIL_CLAP;
                } else if (isActive && resultRevealed && result !== null && !isPlayer) {
                    anim = result ? PUPIL_SUCCESS : PUPIL_FAIL;
                } else if (isPlayer && isTyping && phase === 'spelling') {
                    anim = PUPIL_TYPING;
                } else if (isActive) {
                    anim = PUPIL_ACTIVE;
                } else {
                    anim = PUPIL_IDLES[i];
                }

                const FaceComponent = FACE_COMPONENTS[i];
                const groupOpacity = (!alive && !isPlayer) ? 0.15 : 1;
                const bubbleText = speechBubbles[i];

                // Position: at mic or seated
                const pos = getPupilTransform(i, displayedTurn);

                return (
                    <motion.g
                        key={i}
                        animate={{
                            x: pos.x,
                            y: pos.y,
                            scale: pos.scale,
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 120,
                            damping: 18,
                            mass: 0.8,
                        }}
                        style={{ opacity: groupOpacity }}
                    >
                        {/* Inner group: personality animation */}
                        <motion.g animate={anim}>
                            {/* Nervous body tilt */}
                            <g transform={i === 3 && alive ? `rotate(3, ${cx}, 165)` : undefined}>
                                <PupilBody cx={cx} variant={i} />
                                <FaceComponent cx={cx} />
                            </g>

                            {/* Player extras (glow, label, star) */}
                            {isPlayer && <PlayerExtras cx={cx} isActive={isActive} />}

                            {/* Name + score label */}
                            {alive && !isPlayer && (
                                <text
                                    x={cx} y="196" textAnchor="middle"
                                    fontSize="10"
                                    fill={isActive ? 'var(--color-gold)' : 'currentColor'}
                                    opacity={isActive ? 0.9 : 0.6}
                                    fontFamily="var(--font-ui)"
                                    fontWeight={isActive ? 'bold' : 'normal'}
                                >
                                    {NPC_NAMES[i]}{score > 0 ? ` (${score})` : ''}
                                </text>
                            )}

                            {/* Speech bubble */}
                            <AnimatePresence>
                                {bubbleText && alive && (
                                    <SpeechBubble
                                        cx={cx}
                                        text={bubbleText}
                                        side={i < 2 ? 'right' : 'left'}
                                    />
                                )}
                            </AnimatePresence>

                            {/* Result indicator (check/X with sparkles) */}
                            {resultRevealed && result !== null && !isPlayer && (
                                <ResultIndicator cx={cx} correct={result} />
                            )}

                            {/* Eliminated — seat empty indicator */}
                            {!alive && !isPlayer && (
                                <g opacity="0.2">
                                    <line x1={cx - 8} y1="140" x2={cx + 8} y2="170" stroke="currentColor" strokeWidth="1" />
                                    <line x1={cx + 8} y1="140" x2={cx - 8} y2="170" stroke="currentColor" strokeWidth="1" />
                                    <text x={cx} y="196" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.4" fontFamily="var(--font-ui)">
                                        {NPC_NAMES[i]} - out
                                    </text>
                                </g>
                            )}
                        </motion.g>
                    </motion.g>
                );
            })}

            {/* "Your turn!" text when player is highlighted — removed since pronouncer bubble now says it */}

            {/* Audience row — small stick figures at the bottom */}
            <AudienceRow
                reaction={
                    phase === 'won' ? 'ovation'
                        : playerFeedbackAnim === 'celebrate' ? 'cheer'
                        : playerFeedbackAnim === 'stumble' ? 'gasp'
                        : 'idle'
                }
                reducedMotion={reducedMotion}
            />
        </svg>
    );
});
