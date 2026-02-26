/**
 * utils/errorPatterns.ts
 *
 * Pure functions that analyze WordHistory records to surface error patterns.
 * Extended with phonics-pattern, origin, and theme breakdowns for study analytics.
 */
import type { WordRecord } from '../hooks/useWordHistory';
import { getWordMap } from '../domains/spelling/words';
import { extractLanguage } from './etymologyParser';
import type { PhonicsPattern } from '../domains/spelling/words/types';

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

// ── Extended analytics ────────────────────────────────────────────────────────

export interface AccuracyBar {
    label: string;
    key: string;
    accuracy: number;
    attempts: number;
    correct: number;
}

/** Accuracy breakdown by phonics pattern. */
export function getPatternAccuracy(records: Record<string, WordRecord>): AccuracyBar[] {
    const wordMap = getWordMap();
    const buckets: Record<string, { attempts: number; correct: number }> = {};

    for (const r of Object.values(records)) {
        const detail = wordMap.get(r.word);
        const pattern = detail?.pattern ?? 'unknown';
        if (!buckets[pattern]) buckets[pattern] = { attempts: 0, correct: 0 };
        buckets[pattern].attempts += r.attempts;
        buckets[pattern].correct += r.correct;
    }

    return Object.entries(buckets)
        .filter(([, s]) => s.attempts >= 3)
        .map(([pattern, s]) => ({
            label: formatPattern(pattern),
            key: pattern,
            accuracy: s.correct / s.attempts,
            attempts: s.attempts,
            correct: s.correct,
        }))
        .sort((a, b) => a.accuracy - b.accuracy);
}

/** Accuracy breakdown by language of origin. */
export function getOriginAccuracy(records: Record<string, WordRecord>): AccuracyBar[] {
    const wordMap = getWordMap();
    const buckets: Record<string, { attempts: number; correct: number }> = {};

    for (const r of Object.values(records)) {
        const detail = wordMap.get(r.word);
        const lang = detail ? extractLanguage(detail.etymology) : 'Other';
        if (!buckets[lang]) buckets[lang] = { attempts: 0, correct: 0 };
        buckets[lang].attempts += r.attempts;
        buckets[lang].correct += r.correct;
    }

    return Object.entries(buckets)
        .filter(([, s]) => s.attempts >= 3)
        .map(([lang, s]) => ({
            label: lang,
            key: lang,
            accuracy: s.correct / s.attempts,
            attempts: s.attempts,
            correct: s.correct,
        }))
        .sort((a, b) => a.accuracy - b.accuracy);
}

/** Accuracy breakdown by semantic theme. */
export function getThemeAccuracy(records: Record<string, WordRecord>): AccuracyBar[] {
    const wordMap = getWordMap();
    const buckets: Record<string, { attempts: number; correct: number }> = {};

    for (const r of Object.values(records)) {
        const detail = wordMap.get(r.word);
        const theme = detail?.theme ?? 'none';
        if (theme === 'none') continue;
        if (!buckets[theme]) buckets[theme] = { attempts: 0, correct: 0 };
        buckets[theme].attempts += r.attempts;
        buckets[theme].correct += r.correct;
    }

    return Object.entries(buckets)
        .filter(([, s]) => s.attempts >= 3)
        .map(([theme, s]) => ({
            label: theme.charAt(0).toUpperCase() + theme.slice(1),
            key: theme,
            accuracy: s.correct / s.attempts,
            attempts: s.attempts,
            correct: s.correct,
        }))
        .sort((a, b) => a.accuracy - b.accuracy);
}

export interface PracticeRecommendation {
    category: string;
    label: string;
    reason: string;
    /** Priority: 'review' > 'weak' > 'explore'. Controls display order and badge color. */
    priority?: 'review' | 'weak' | 'explore';
    /** Number of words in this recommendation (e.g. review count) */
    wordCount?: number;
}

/** Up to 3 actionable practice recommendations based on weakest areas. */
export function getRecommendations(records: Record<string, WordRecord>): PracticeRecommendation[] {
    const recs: PracticeRecommendation[] = [];

    // Weakest phonics pattern
    const patterns = getPatternAccuracy(records);
    if (patterns.length > 0 && patterns[0].accuracy < 0.7) {
        const p = patterns[0];
        const catId = patternToCategory(p.key as PhonicsPattern);
        if (catId) {
            recs.push({
                category: catId,
                label: p.label,
                reason: `${Math.round(p.accuracy * 100)}% accuracy on ${p.label} words`,
                priority: 'weak',
            });
        }
    }

    // Weakest origin
    const origins = getOriginAccuracy(records);
    if (origins.length > 0 && origins[0].accuracy < 0.7) {
        const o = origins[0];
        const originCat = `origin-${o.key.toLowerCase()}`;
        recs.push({
            category: originCat,
            label: `${o.label} Origin`,
            reason: `${Math.round(o.accuracy * 100)}% accuracy on ${o.label}-origin words`,
            priority: 'weak',
        });
    }

    // Weakest theme
    const themes = getThemeAccuracy(records);
    if (themes.length > 0 && themes[0].accuracy < 0.7) {
        const t = themes[0];
        recs.push({
            category: `theme-${t.key}` as string,
            label: t.label,
            reason: `${Math.round(t.accuracy * 100)}% accuracy on ${t.label} words`,
            priority: 'weak',
        });
    }

    return recs.slice(0, 3);
}

/**
 * Full study plan combining SRS review, weak-area drills, and new exploration.
 * Returns up to 5 prioritized recommendations.
 *
 * @param records  - All word history records
 * @param reviewDueCount - Number of words currently due for Leitner review
 */
export function getStudyPlan(
    records: Record<string, WordRecord>,
    reviewDueCount: number,
): PracticeRecommendation[] {
    const plan: PracticeRecommendation[] = [];

    // 1. SRS review is always top priority when words are due
    if (reviewDueCount > 0) {
        plan.push({
            category: 'review',
            label: 'Review Due Words',
            reason: `${reviewDueCount} word${reviewDueCount === 1 ? '' : 's'} ready for review`,
            priority: 'review',
            wordCount: reviewDueCount,
        });
    }

    // 2. Weak-area drills from existing recommendation engine
    const weakRecs = getRecommendations(records);
    plan.push(...weakRecs);

    // 3. Suggest etymology quiz if user has enough data but hasn't tried it
    const recordArr = Object.values(records);
    const totalAttempts = recordArr.reduce((sum, r) => sum + r.attempts, 0);
    const hasEtymologyAttempts = recordArr.some(r => r.category === 'etymology');
    if (totalAttempts >= 20 && !hasEtymologyAttempts) {
        plan.push({
            category: 'etymology',
            label: 'Etymology Quiz',
            reason: 'Learn word origins to unlock deeper spelling patterns',
            priority: 'explore',
        });
    }

    // 4. Suggest bee sim for users who haven't tried it
    const hasBeeAttempts = recordArr.some(r => r.category === 'bee-sim');
    if (totalAttempts >= 30 && !hasBeeAttempts) {
        plan.push({
            category: 'bee-sim',
            label: 'Spelling Bee',
            reason: 'Practice under competition pressure',
            priority: 'explore',
        });
    }

    // 5. Progress nudge — suggest harder categories if mastery is high
    const attemptedCount = recordArr.length;
    const mastered = recordArr.filter(r => r.box >= 4).length;
    const masteryRate = attemptedCount > 0 ? mastered / attemptedCount : 0;
    if (masteryRate > 0.5 && attemptedCount >= 20 && plan.length < 5) {
        const coveredPatterns = new Set<string>(recordArr.map(r => {
            const detail = getWordMap().get(r.word);
            return detail?.pattern ?? '';
        }).filter(p => p !== ''));
        const allPatterns = Object.keys(PATTERN_LABELS);
        const unexplored = allPatterns.filter(p => !coveredPatterns.has(p));
        if (unexplored.length > 0) {
            const next = unexplored[0];
            plan.push({
                category: next,
                label: `Try ${formatPattern(next)}`,
                reason: `${unexplored.length} pattern${unexplored.length === 1 ? '' : 's'} not yet explored`,
                priority: 'explore',
            });
        }
    }

    return plan.slice(0, 5);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PATTERN_LABELS: Record<string, string> = {
    'cvc': 'CVC',
    'blends': 'Blends',
    'digraphs': 'Digraphs',
    'silent-e': 'Silent E',
    'vowel-teams': 'Vowel Teams',
    'r-controlled': 'R-Controlled',
    'diphthongs': 'Diphthongs',
    'prefixes': 'Prefixes',
    'suffixes': 'Suffixes',
    'compound': 'Compound',
    'multisyllable': 'Multisyllable',
    'irregular': 'Irregular',
    'latin-roots': 'Latin Roots',
    'greek-roots': 'Greek Roots',
    'french-origin': 'French Origin',
};

function formatPattern(pattern: string): string {
    return PATTERN_LABELS[pattern] ?? pattern;
}

/** Map a PhonicsPattern back to its SpellingCategory ID. */
function patternToCategory(pattern: PhonicsPattern): string | null {
    // Category IDs match pattern names for the primary patterns
    if (PATTERN_LABELS[pattern]) return pattern;
    return null;
}

