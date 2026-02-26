/**
 * domains/spelling/curriculum.ts
 *
 * Structured curriculum with phased progression and mastery gates.
 * Designed to take a student from absolute beginner to national-competition ready.
 *
 * Each phase focuses on a tier + set of phonics patterns. A student must master
 * a minimum number of words (box ≥ 3) and achieve a target accuracy before
 * advancing to the next phase.
 */
import type { WordRecord } from '../../hooks/useWordHistory';
import type { SpellingCategory, GradeLevel } from './spellingCategories';

// ── Phase definitions ────────────────────────────────────────────────────────

export interface CurriculumPhase {
    id: string;
    name: string;
    description: string;
    /** Grade level (tier) this phase focuses on */
    grade: GradeLevel;
    /** Categories to practice in this phase, in recommended order */
    categories: SpellingCategory[];
    /** Minimum words at box ≥ 3 ("almost mastered") to unlock next phase */
    masteryGate: number;
    /** Minimum overall accuracy to unlock next phase (0-1) */
    accuracyGate: number;
}

export const CURRICULUM: readonly CurriculumPhase[] = [
    // Phase 1-3: Tier 1 (K-1st)
    {
        id: 'foundations-1',
        name: 'Foundations',
        description: 'Short words with simple sounds',
        grade: 'tier-1',
        categories: ['cvc', 'blends'],
        masteryGate: 20,
        accuracyGate: 0.7,
    },
    {
        id: 'foundations-2',
        name: 'Sound Pairs',
        description: 'Digraphs and consonant combos',
        grade: 'tier-1',
        categories: ['digraphs', 'blends'],
        masteryGate: 40,
        accuracyGate: 0.7,
    },
    {
        id: 'foundations-3',
        name: 'Tier 1 Mastery',
        description: 'Master all Kindergarten-1st patterns',
        grade: 'tier-1',
        categories: ['tier-1'],
        masteryGate: 60,
        accuracyGate: 0.75,
    },
    // Phase 4-6: Tier 2 (2nd-3rd)
    {
        id: 'developing-1',
        name: 'Silent Letters',
        description: 'Silent-e and tricky vowels',
        grade: 'tier-2',
        categories: ['silent-e', 'vowel-teams'],
        masteryGate: 80,
        accuracyGate: 0.7,
    },
    {
        id: 'developing-2',
        name: 'Vowel Patterns',
        description: 'R-controlled vowels and diphthongs',
        grade: 'tier-2',
        categories: ['r-controlled', 'diphthongs'],
        masteryGate: 100,
        accuracyGate: 0.75,
    },
    {
        id: 'developing-3',
        name: 'Tier 2 Mastery',
        description: 'Master all 2nd-3rd grade patterns',
        grade: 'tier-2',
        categories: ['tier-2'],
        masteryGate: 130,
        accuracyGate: 0.8,
    },
    // Phase 7-9: Tier 3 (4th-5th)
    {
        id: 'intermediate-1',
        name: 'Word Building',
        description: 'Prefixes, suffixes, and compound words',
        grade: 'tier-3',
        categories: ['prefixes', 'suffixes'],
        masteryGate: 160,
        accuracyGate: 0.7,
    },
    {
        id: 'intermediate-2',
        name: 'Big Words',
        description: 'Multisyllable and irregular spellings',
        grade: 'tier-3',
        categories: ['multisyllable'],
        masteryGate: 190,
        accuracyGate: 0.75,
    },
    {
        id: 'intermediate-3',
        name: 'Tier 3 Mastery',
        description: 'Master all 4th-5th grade patterns',
        grade: 'tier-3',
        categories: ['tier-3'],
        masteryGate: 220,
        accuracyGate: 0.8,
    },
    // Phase 10-12: Tier 4 (6th-8th)
    {
        id: 'advanced-1',
        name: 'Latin Roots',
        description: 'Words from Latin origins',
        grade: 'tier-4',
        categories: ['latin-roots'],
        masteryGate: 260,
        accuracyGate: 0.7,
    },
    {
        id: 'advanced-2',
        name: 'Greek & French',
        description: 'Greek and French origin words',
        grade: 'tier-4',
        categories: ['greek-roots', 'french-origin'],
        masteryGate: 300,
        accuracyGate: 0.75,
    },
    {
        id: 'advanced-3',
        name: 'Tier 4 Mastery',
        description: 'Master all middle-school patterns',
        grade: 'tier-4',
        categories: ['tier-4'],
        masteryGate: 350,
        accuracyGate: 0.8,
    },
    // Phase 13-14: Tier 5 (Competition)
    {
        id: 'competition-1',
        name: 'Competition Prep',
        description: 'Competition-level words and etymology',
        grade: 'tier-5',
        categories: ['tier-5', 'etymology'],
        masteryGate: 420,
        accuracyGate: 0.75,
    },
    {
        id: 'competition-2',
        name: 'Championship',
        description: 'National competition words — the final frontier',
        grade: 'tier-5',
        categories: ['tier-5', 'etymology'],
        masteryGate: 500,
        accuracyGate: 0.85,
    },
];

// ── Progress evaluation ──────────────────────────────────────────────────────

export interface PhaseProgress {
    phase: CurriculumPhase;
    /** Words the student has at box ≥ 3 */
    masteredWords: number;
    /** Overall accuracy across all attempted words */
    accuracy: number;
    /** Whether this phase's mastery gate is passed */
    unlocked: boolean;
    /** 0-1 progress toward the mastery gate */
    progress: number;
}

export interface CurriculumProgress {
    /** Index of the current (highest unlocked but not yet completed) phase */
    currentPhaseIndex: number;
    /** Per-phase progress */
    phases: PhaseProgress[];
}

/**
 * Evaluate a student's curriculum progress from their word history.
 * Mastery gates are cumulative — the count is total mastered words, not per-phase.
 */
export function evaluateCurriculum(records: Record<string, WordRecord>): CurriculumProgress {
    const recordArr = Object.values(records);
    const masteredWords = recordArr.filter(r => r.box >= 3).length;
    const totalAttempts = recordArr.reduce((sum, r) => sum + r.attempts, 0);
    const totalCorrect = recordArr.reduce((sum, r) => sum + r.correct, 0);
    const accuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;

    let currentPhaseIndex = 0;
    const phases: PhaseProgress[] = CURRICULUM.map((phase, i) => {
        const unlocked = i === 0 || (masteredWords >= CURRICULUM[i - 1].masteryGate && accuracy >= CURRICULUM[i - 1].accuracyGate);
        const progress = Math.min(1, masteredWords / phase.masteryGate);

        if (unlocked && masteredWords < phase.masteryGate) {
            currentPhaseIndex = i;
        } else if (unlocked && masteredWords >= phase.masteryGate && accuracy >= phase.accuracyGate) {
            // Phase complete, move to next
            if (i + 1 < CURRICULUM.length) currentPhaseIndex = i + 1;
            else currentPhaseIndex = i; // Last phase
        }

        return { phase, masteredWords, accuracy, unlocked, progress };
    });

    return { currentPhaseIndex, phases };
}
