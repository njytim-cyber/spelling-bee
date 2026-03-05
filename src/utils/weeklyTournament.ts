/**
 * utils/weeklyTournament.ts
 *
 * Deterministic weekly tournament — same 25 words for everyone all week.
 * Uses ISO week number as seed so every player gets the same set.
 * Scores uploaded to Firestore `weeklyTournament` collection.
 */
import { createSeededRng, stringSeed } from './seededRng';
import { generateSpellingItem } from '../domains/spelling/spellingGenerator';
import type { EngineItem } from '../engine/domain';

const TOURNAMENT_SIZE = 25;
const CATEGORIES = ['cvc', 'blends', 'digraphs', 'silent-e', 'vowel-teams', 'prefixes', 'suffixes'];

/** Get ISO week string for current week: "week-YYYY-WW" */
export function getWeeklySeed(): string {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.ceil((now.getTime() - jan1.getTime()) / 86400000);
    const weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7);
    return `week-${now.getFullYear()}-${String(weekNum).padStart(2, '0')}`;
}

/** Human-readable label for this week's tournament */
export function getWeeklyLabel(): string {
    const now = new Date();
    const mon = new Date(now);
    mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7)); // Monday
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(mon)} – ${fmt(sun)}`;
}

/** Generate the deterministic 25-word tournament set for this week */
export function generateWeeklyTournament(): EngineItem[] {
    const seed = stringSeed(getWeeklySeed());
    const rng = createSeededRng(seed);

    const problems: EngineItem[] = [];
    for (let i = 0; i < TOURNAMENT_SIZE; i++) {
        const cat = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];
        const difficulty = 3 + Math.floor(i / 5); // starts easy, gets harder
        problems.push(generateSpellingItem(difficulty, cat, rng));
    }
    problems.forEach((p, i) => { p.id = `tournament-${seed}-${i}`; });
    return problems;
}

/** Classroom code: just a short string seed. Same seed → same words for all students. */
export function generateClassroomChallenge(code: string, count = 20): EngineItem[] {
    const seed = stringSeed(`classroom-${code}`);
    const rng = createSeededRng(seed);

    const problems: EngineItem[] = [];
    for (let i = 0; i < count; i++) {
        const cat = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];
        const difficulty = 2 + Math.floor(i / 4);
        problems.push(generateSpellingItem(difficulty, cat, rng));
    }
    problems.forEach((p, i) => { p.id = `classroom-${seed}-${i}`; });
    return problems;
}
