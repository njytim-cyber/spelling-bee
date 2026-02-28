export interface TrailConfig {
    id: string;
    name: string;
    emoji: string;
    minStreak?: number; // Requires a specific streak achievement
    minLevel?: number;  // Requires a specific global rank (1-11)
    minSolved?: number; // Requires total words solved
}

export const SWIPE_TRAILS: TrailConfig[] = [
    {
        id: 'chalk-dust',
        name: 'Chalk Dust',
        emoji: '🖍️',
        minLevel: 1, // Default - everyone starts here
    },
    {
        id: 'rainbow',
        name: 'Rainbow Ribbon',
        emoji: '🌈',
        minLevel: 5, // Linguist rank (1000 XP)
    },
    {
        id: 'fire',
        name: 'Hellfire',
        emoji: '🔥',
        minStreak: 15, // Hot streak! Thematic fit
    },
    {
        id: 'lightning',
        name: 'Static Shock',
        emoji: '⚡',
        minSolved: 500, // Lightning-fast progress
    },
];
