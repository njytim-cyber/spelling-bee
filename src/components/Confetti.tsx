/**
 * Confetti celebration effect
 * Pure CSS confetti particles with Framer Motion
 * Enhanced with varied shapes, colors, and physics-based motion
 */
import { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
    trigger: boolean;
    /** Intensity: 'normal' (30 pieces) | 'epic' (50 pieces for big wins) */
    intensity?: 'normal' | 'epic';
}

const CONFETTI_COLORS = [
    'var(--color-gold)',
    'var(--color-correct)',
    'var(--color-streak-fire)',
    'rgb(var(--color-fg))',
    '#FFD700', // Gold
    '#FF6B6B', // Coral
    '#4ECDC4', // Turquoise
];

type ConfettiPiece = {
    x: number;
    y: number;
    rotation: number;
    delay: number;
    duration: number;
    shape: 'star' | 'rect' | 'circle';
    size: number;
    color: string;
    rotationSpeed: number;
};

function generateConfettiPieces(count: number): ConfettiPiece[] {
    return Array.from({ length: count }, (_, i) => {
        const angle = (i / 30) * 360 + Math.random() * 30;
        const velocity = 150 + Math.random() * 100;
        const x = Math.cos((angle * Math.PI) / 180) * velocity;
        const y = Math.sin((angle * Math.PI) / 180) * velocity - 100;
        const rotation = Math.random() * 720 - 360;
        const delay = Math.random() * 0.15;
        const duration = 1.2 + Math.random() * 0.8;
        // More shape variety: rectangles, circles, and stars
        const shapeRand = Math.random();
        const shape = shapeRand > 0.66 ? 'star' : shapeRand > 0.33 ? 'rect' : 'circle';
        const size = 4 + Math.random() * 5;
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        // Add flutter rotation for more realistic physics
        const rotationSpeed = 360 + Math.random() * 360;

        return { x, y, rotation, delay, duration, shape, size, color, rotationSpeed };
    });
}

export const Confetti = memo(function Confetti({ trigger, intensity = 'normal' }: Props) {
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
    const prevTriggerRef = useRef(trigger);

    // Generate new confetti pieces when trigger changes from false to true
    useEffect(() => {
        if (trigger && !prevTriggerRef.current) {
            const count = intensity === 'epic' ? 50 : 30;
            queueMicrotask(() => setPieces(generateConfettiPieces(count)));
        }
        prevTriggerRef.current = trigger;
    }, [trigger, intensity]);

    if (!trigger) return null;

    return (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
            {pieces.map((piece, i) => {
                if (piece.shape === 'star') {
                    // SVG star shape
                    return (
                        <motion.svg
                            key={i}
                            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                            animate={{
                                x: piece.x,
                                y: piece.y,
                                opacity: 0,
                                rotate: piece.rotationSpeed,
                                scale: 0,
                            }}
                            transition={{
                                duration: piece.duration,
                                delay: piece.delay,
                                ease: [0.36, 0.66, 0.04, 1],
                            }}
                            style={{
                                position: 'absolute',
                                width: piece.size * 1.5,
                                height: piece.size * 1.5,
                            }}
                            viewBox="0 0 10 10"
                        >
                            <path
                                d="M5,0 l1.5,3 3,0.5 -2.2,2 0.7,3 -3-1.5 -3,1.5 0.7-3 -2.2-2 3-0.5z"
                                fill={piece.color}
                            />
                        </motion.svg>
                    );
                }

                return (
                    <motion.div
                        key={i}
                        initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                        animate={{
                            x: piece.x,
                            y: piece.y,
                            opacity: 0,
                            rotate: piece.rotationSpeed,
                            scale: 0,
                        }}
                        transition={{
                            duration: piece.duration,
                            delay: piece.delay,
                            ease: [0.36, 0.66, 0.04, 1],
                        }}
                        style={{
                            position: 'absolute',
                            width: piece.size,
                            height: piece.size,
                            backgroundColor: piece.color,
                            borderRadius: piece.shape === 'circle' ? '50%' : piece.shape === 'rect' ? '1px' : '0',
                        }}
                    />
                );
            })}
        </div>
    );
});
