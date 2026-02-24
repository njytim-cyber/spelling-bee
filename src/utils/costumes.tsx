import React from 'react';

/** Costume accessories — extra SVG elements drawn on the bee */
export const COSTUMES: Record<string, React.ReactNode> = {
    'streak-5': ( // Honey aura
        <g opacity="0.45">
            <ellipse cx="50" cy="70" rx="34" ry="48" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 3" />
        </g>
    ),
    'streak-20': ( // Crown
        <g>
            <path d="M 36 6 L 39 -4 L 44 2 L 50 -6 L 56 2 L 61 -4 L 64 6 Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.8" />
        </g>
    ),
    'sharpshooter': ( // Tiny sunglasses on bee face
        <g>
            <rect x="35" y="36" width="11" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
            <rect x="54" y="36" width="11" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
            <line x1="46" y1="39" x2="54" y2="39" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <line x1="35" y1="39" x2="30" y2="37" stroke="currentColor" strokeWidth="1" opacity="0.4" />
            <line x1="65" y1="39" x2="70" y2="37" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        </g>
    ),
    'math-machine': ( // Wizard hat on bee
        <g>
            <path d="M 36 22 L 50 2 L 64 22" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
            <path d="M 34 22 h32" stroke="currentColor" strokeWidth="2" opacity="0.6" />
            <circle cx="50" cy="4" r="2" fill="currentColor" opacity="0.5" />
        </g>
    ),
    'century': ( // Star above head
        <g>
            <path d="M50 2l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.4" />
        </g>
    ),
};
