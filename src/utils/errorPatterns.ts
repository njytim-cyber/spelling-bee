/**
 * utils/errorPatterns.ts
 *
 * Pure functions that analyze WordHistory records to surface error patterns.
 */
import type { WordRecord } from '../hooks/useWordHistory';

export interface ErrorPattern {
    category: string;
    attempts: number;
    correct: number;
    errorRate: number;
}

export interface WordDrillDown {
    word: string;
    category: string;
    attempts: number;
    accuracy: number;
    box: number;
}

/**
 * Returns categories with > 20% error rate and at least 5 attempts,
 * sorted by worst accuracy first.
 */
export function getErrorPatterns(records: Record<string, WordRecord>): ErrorPattern[] {
    const cats: Record<string, { attempts: number; correct: number }> = {};

    for (const r of Object.values(records)) {
        if (!cats[r.category]) cats[r.category] = { attempts: 0, correct: 0 };
        cats[r.category].attempts += r.attempts;
        cats[r.category].correct += r.correct;
    }

    return Object.entries(cats)
        .map(([category, s]) => ({
            category,
            attempts: s.attempts,
            correct: s.correct,
            errorRate: 1 - (s.correct / s.attempts),
        }))
        .filter(p => p.attempts >= 5 && p.errorRate > 0.2)
        .sort((a, b) => b.errorRate - a.errorRate);
}

/**
 * Returns category accuracy breakdown (all categories with at least 1 attempt).
 */
export function getCategoryAccuracy(records: Record<string, WordRecord>): { category: string; accuracy: number; attempts: number }[] {
    const cats: Record<string, { attempts: number; correct: number }> = {};

    for (const r of Object.values(records)) {
        if (!cats[r.category]) cats[r.category] = { attempts: 0, correct: 0 };
        cats[r.category].attempts += r.attempts;
        cats[r.category].correct += r.correct;
    }

    return Object.entries(cats)
        .map(([category, s]) => ({
            category,
            accuracy: s.attempts > 0 ? s.correct / s.attempts : 0,
            attempts: s.attempts,
        }))
        .sort((a, b) => a.accuracy - b.accuracy);
}

/**
 * Returns per-word drill-down sorted by worst accuracy first.
 */
export function getWordDrillDown(records: Record<string, WordRecord>): WordDrillDown[] {
    return Object.values(records)
        .filter(r => r.attempts >= 1)
        .map(r => ({
            word: r.word,
            category: r.category,
            attempts: r.attempts,
            accuracy: r.attempts > 0 ? r.correct / r.attempts : 0,
            box: r.box,
        }))
        .sort((a, b) => a.accuracy - b.accuracy);
}
