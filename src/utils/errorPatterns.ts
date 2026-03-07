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

/** Accumulate attempts/correct by category — shared by getErrorPatterns and getCategoryAccuracy. */
function accumulateByCategory(records: Record<string, WordRecord>): Record<string, { attempts: number; correct: number }> {
    const cats: Record<string, { attempts: number; correct: number }> = {};
    for (const r of Object.values(records)) {
        if (!cats[r.category]) cats[r.category] = { attempts: 0, correct: 0 };
        cats[r.category].attempts += r.attempts;
        cats[r.category].correct += r.correct;
    }
    return cats;
}

/**
 * Returns categories with > 20% error rate and at least 5 attempts,
 * sorted by worst accuracy first.
 */
export function getErrorPatterns(records: Record<string, WordRecord>): ErrorPattern[] {
    return Object.entries(accumulateByCategory(records))
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
 * Returns up to 20 words from weak patterns (>20% error rate) that aren't yet
 * mastered (box < 4), sorted by worst accuracy first. Used to build a focused
 * "Practice My Weaknesses" session.
 */
export function getWeakWords(records: Record<string, WordRecord>): string[] {
    const weakCats = new Set(getErrorPatterns(records).map(p => p.category));
    if (weakCats.size === 0) return [];
    return Object.values(records)
        .filter(r => weakCats.has(r.category) && r.box < 4 && r.attempts >= 1)
        .sort((a, b) => (a.correct / Math.max(a.attempts, 1)) - (b.correct / Math.max(b.attempts, 1)))
        .slice(0, 20)
        .map(r => r.word);
}

/**
 * Returns category accuracy breakdown (all categories with at least 1 attempt).
 */
export function getCategoryAccuracy(records: Record<string, WordRecord>): { category: string; accuracy: number; attempts: number }[] {
    return Object.entries(accumulateByCategory(records))
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

/**
 * Generic accuracy breakdown: groups records by a key function, computes accuracy per bucket.
 * Shared by pattern/origin/theme accuracy functions to avoid near-identical boilerplate.
 */
function accumulateAccuracy(
    records: Record<string, WordRecord>,
    keyFn: (r: WordRecord, detail: ReturnType<typeof getWordMap> extends Map<string, infer V> ? V : never) => string | null,
    labelFn: (key: string) => string,
    minAttempts = 3,
): AccuracyBar[] {
    const wordMap = getWordMap();
    const buckets: Record<string, { attempts: number; correct: number }> = {};

    for (const r of Object.values(records)) {
        const detail = wordMap.get(r.word);
        const key = keyFn(r, detail!);
        if (!key) continue;
        if (!buckets[key]) buckets[key] = { attempts: 0, correct: 0 };
        buckets[key].attempts += r.attempts;
        buckets[key].correct += r.correct;
    }

    return Object.entries(buckets)
        .filter(([, s]) => s.attempts >= minAttempts)
        .map(([key, s]) => ({
            label: labelFn(key),
            key,
            accuracy: s.correct / s.attempts,
            attempts: s.attempts,
            correct: s.correct,
        }))
        .sort((a, b) => a.accuracy - b.accuracy);
}

/** Accuracy breakdown by phonics pattern. */
export function getPatternAccuracy(records: Record<string, WordRecord>): AccuracyBar[] {
    return accumulateAccuracy(
        records,
        (_r, detail) => detail?.pattern ?? 'unknown',
        formatPattern,
    );
}

/** Accuracy breakdown by language of origin. */
export function getOriginAccuracy(records: Record<string, WordRecord>): AccuracyBar[] {
    return accumulateAccuracy(
        records,
        (_r, detail) => detail ? extractLanguage(detail.etymology) : 'Other',
        k => k,
    );
}

/** Accuracy breakdown by semantic theme. */
export function getThemeAccuracy(records: Record<string, WordRecord>): AccuracyBar[] {
    return accumulateAccuracy(
        records,
        (_r, detail) => {
            const theme = detail?.theme ?? 'none';
            return theme === 'none' ? null : theme;
        },
        k => k.charAt(0).toUpperCase() + k.slice(1),
    );
}

export interface PracticeRecommendation {
    category: string;
    label: string;
    reason: string;
    /** Priority: 'review' > 'weak' > 'explore'. Controls display order and badge color. */
    priority?: 'review' | 'weak' | 'explore';
    /** Number of words in this recommendation (e.g. review count) */
    wordCount?: number;
    /** Current accuracy 0-1 (for weak-area recs) */
    accuracy?: number;
    /** Total attempts so far (for estimating questions to goal) */
    attempts?: number;
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
                accuracy: p.accuracy,
                attempts: p.attempts,
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
            accuracy: o.accuracy,
            attempts: o.attempts,
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
            accuracy: t.accuracy,
            attempts: t.attempts,
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
    hardestWordCount = 0,
): PracticeRecommendation[] {
    const plan: PracticeRecommendation[] = [];

    // 1. SRS review is always top priority when words are due
    if (reviewDueCount > 0) {
        plan.push({
            category: 'review',
            label: `${reviewDueCount} Word${reviewDueCount === 1 ? '' : 's'} to Master`,
            reason: `${reviewDueCount} word${reviewDueCount === 1 ? '' : 's'} almost learned — one more practice!`,
            priority: 'review',
            wordCount: reviewDueCount,
        });
    }

    // 2. Hardest words — merged into "Improve" priority
    if (hardestWordCount > 0) {
        plan.push({
            category: 'hardest',
            label: 'Hardest Words',
            reason: `${hardestWordCount} word${hardestWordCount === 1 ? '' : 's'} below 50%`,
            priority: 'weak',
            wordCount: hardestWordCount,
        });
    }

    // 3. "Level Up" nudge — MCQ accuracy much higher than typed
    const recordArr = Object.values(records);
    let mcqTotal = 0, mcqRight = 0, typedTotal = 0, typedRight = 0;
    for (const r of recordArr) {
        mcqTotal += r.mcqAttempts ?? 0;
        mcqRight += r.mcqCorrect ?? 0;
        typedTotal += r.typedAttempts ?? 0;
        typedRight += r.typedCorrect ?? 0;
    }
    const mcqAcc = mcqTotal >= 10 ? mcqRight / mcqTotal : -1;
    const typedAcc = typedTotal >= 10 ? typedRight / typedTotal : -1;
    if (mcqAcc >= 0 && typedAcc >= 0 && mcqAcc - typedAcc >= 0.2) {
        plan.push({
            category: 'guided',
            label: 'Level Up: Type Mode',
            reason: 'You know these words — now try spelling them!',
            priority: 'explore',
        });
    }

    // 4. Weakest area drill (limit to 1)
    const weakRecs = getRecommendations(records);
    plan.push(...weakRecs.slice(0, 1));

    // 5. Suggest etymology quiz if user has enough data but hasn't tried it
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

    // 6. Suggest bee sim for users who haven't tried it
    const hasBeeAttempts = recordArr.some(r => r.category === 'bee');
    if (totalAttempts >= 30 && !hasBeeAttempts) {
        plan.push({
            category: 'bee',
            label: 'Spelling Bee',
            reason: 'Practice under competition pressure',
            priority: 'explore',
        });
    }

    // 7. Progress nudge — suggest harder categories if mastery is high
    const attemptedCount = recordArr.length;
    const mastered = recordArr.filter(r => r.box >= 4 && (r.typedAttempts ?? 0) >= 1).length;
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

// ── Mistake pattern detection ────────────────────────────────────────────────

export interface MistakeInsight {
    /** Short label like "Double letters", "ie vs ei" */
    label: string;
    /** Longer explanation */
    detail: string;
    /** How many misspellings match this pattern */
    count: number;
    /** Related category ID for practice, if any */
    category?: string;
}

/**
 * Analyze stored misspellings to find recurring mistake patterns.
 * Returns up to 3 insights sorted by frequency.
 */
export function getMistakeInsights(records: Record<string, WordRecord>): MistakeInsight[] {
    // Collect all (correct, misspelled) pairs
    const pairs: { correct: string; typed: string }[] = [];
    for (const r of Object.values(records)) {
        if (r.misspellings) {
            for (const m of r.misspellings) {
                pairs.push({ correct: r.word, typed: m });
            }
        }
    }

    if (pairs.length < 2) return [];

    // Pattern detectors — each returns a category key or null
    const buckets: Record<string, { label: string; detail: string; count: number; category?: string }> = {};

    function bump(key: string, label: string, detail: string, category?: string) {
        if (!buckets[key]) buckets[key] = { label, detail, count: 0, category };
        buckets[key].count++;
    }

    for (const { correct, typed } of pairs) {
        // 1. Double letter errors (e.g., "comittee" vs "committee")
        const doubleRe = /(.)\1/g;
        const correctDoubles = new Set([...correct.matchAll(doubleRe)].map(m => m[0]));
        const typedDoubles = new Set([...typed.matchAll(doubleRe)].map(m => m[0]));
        for (const d of correctDoubles) {
            if (!typedDoubles.has(d)) bump('double-miss', 'Double letters', `You sometimes drop doubled letters (e.g., "${d}" in "${correct}")`);
        }
        for (const d of typedDoubles) {
            if (!correctDoubles.has(d)) bump('double-extra', 'Extra doubles', `You sometimes double letters unnecessarily (e.g., "${d}" in "${typed}")`);
        }

        // 2. ie/ei confusion
        if ((correct.includes('ie') && typed.includes('ei')) || (correct.includes('ei') && typed.includes('ie'))) {
            bump('ie-ei', 'ie vs ei', 'You sometimes swap "ie" and "ei" — remember: "i before e, except after c"');
        }

        // 3. Silent letter drops (e.g., "kn", "wr", "gn", "mb", "gh")
        const silentPairs = ['kn', 'wr', 'gn', 'mb', 'mn', 'ps', 'pn'];
        for (const sp of silentPairs) {
            if (correct.includes(sp) && !typed.includes(sp) && typed.includes(sp[1])) {
                bump('silent', 'Silent letters', `You sometimes drop silent letters (e.g., "${sp}" in "${correct}")`);
            }
        }

        // 4. Vowel confusion (a/e/i/o/u swaps)
        if (correct.length === typed.length) {
            let vowelSwaps = 0;
            const vowels = new Set('aeiou');
            for (let i = 0; i < correct.length; i++) {
                if (correct[i] !== typed[i] && vowels.has(correct[i]) && vowels.has(typed[i])) {
                    vowelSwaps++;
                }
            }
            if (vowelSwaps > 0) {
                bump('vowel-swap', 'Vowel confusion', 'You sometimes mix up vowels — try sounding out each syllable');
            }
        }

        // 5. Common suffix errors (-tion vs -sion, -able vs -ible, -ent vs -ant)
        const suffixPairs: [string, string][] = [
            ['tion', 'sion'], ['able', 'ible'], ['ent', 'ant'],
            ['ence', 'ance'], ['er', 'or'], ['ous', 'us'],
        ];
        for (const [a, b] of suffixPairs) {
            if ((correct.endsWith(a) && typed.endsWith(b)) || (correct.endsWith(b) && typed.endsWith(a))) {
                bump(`suffix-${a}-${b}`, `${a}/${b} endings`, `You mix up "-${a}" and "-${b}" endings — try grouping words by suffix`);
            }
        }

        // 6. Letter transposition (adjacent swap)
        if (correct.length === typed.length) {
            const diffs: number[] = [];
            for (let i = 0; i < correct.length; i++) {
                if (correct[i] !== typed[i]) diffs.push(i);
            }
            if (diffs.length === 2 && diffs[1] === diffs[0] + 1 &&
                correct[diffs[0]] === typed[diffs[1]] && correct[diffs[1]] === typed[diffs[0]]) {
                bump('transposition', 'Letter swaps', 'You sometimes swap adjacent letters — try typing more slowly');
            }
        }
    }

    return Object.values(buckets)
        .filter(b => b.count >= 2)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
}

function diffToLevel(diff: number): string {
    return `level-${Math.max(1, Math.min(10, Math.round(diff)))}`;
}

// ── Adaptive difficulty nudge ────────────────────────────────────────────────

export interface DifficultyNudge {
    currentLabel: string;
    nextLabel: string;
    nextCategory: string;
    accuracy: number;
    wordCount: number;
}

/**
 * Suggests moving to a harder category when the student's accuracy
 * exceeds 85% over 20+ words in a category.
 */
export function getDifficultyNudge(records: Record<string, WordRecord>): DifficultyNudge | null {
    const wordMap = getWordMap();

    // Group by level
    const levels: Record<string, { attempts: number; correct: number; words: number }> = {};
    for (const r of Object.values(records)) {
        const detail = wordMap.get(r.word);
        if (!detail) continue;
        const lvl = diffToLevel(detail.difficulty);
        if (!levels[lvl]) levels[lvl] = { attempts: 0, correct: 0, words: 0 };
        levels[lvl].attempts += r.attempts;
        levels[lvl].correct += r.correct;
        levels[lvl].words++;
    }

    const ORDER = Array.from({ length: 10 }, (_, i) => `level-${i + 1}`);

    for (let i = 0; i < ORDER.length - 1; i++) {
        const lvl = ORDER[i];
        const stats = levels[lvl];
        if (!stats || stats.words < 20 || stats.attempts < 20) continue;
        const acc = stats.correct / stats.attempts;
        if (acc >= 0.85) {
            const next = ORDER[i + 1];
            // Only nudge if student hasn't already moved up
            const nextStats = levels[next];
            if (nextStats && nextStats.words >= 10) continue;
            return {
                currentLabel: `Level ${lvl.split('-')[1]}`,
                nextLabel: `Level ${next.split('-')[1]}`,
                nextCategory: next,
                accuracy: acc,
                wordCount: stats.words,
            };
        }
    }

    return null;
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

// ── Inline error tips (per-word) ────────────────────────────────────────────

export interface InlineErrorTip {
    /** Short label, e.g. "Double letter" */
    label: string;
    /** Specific detail about this word, e.g. "Two 'l's in 'balloon'" */
    detail: string;
}

/**
 * Detect tricky patterns in a word and return a tip for the wrong-answer screen.
 * Used for both MCQ and typed modes to give targeted feedback.
 *
 * For typed mode, pass the misspelling to get diff-aware tips.
 * For MCQ mode, pass only the correct word to get general tricky-pattern tips.
 */
export function getInlineErrorTip(correctWord: string, misspelling?: string): InlineErrorTip | null {
    const w = correctWord.toLowerCase();

    // If we have a misspelling, analyze the specific error
    if (misspelling) {
        const m = misspelling.toLowerCase();

        // Double letter errors
        const doubleRe = /(.)\1/g;
        const correctDoubles = new Set([...w.matchAll(doubleRe)].map(x => x[0]));
        const typedDoubles = new Set([...m.matchAll(doubleRe)].map(x => x[0]));
        for (const d of correctDoubles) {
            if (!typedDoubles.has(d)) {
                return { label: 'Double letter', detail: `"${correctWord}" has double "${d[0]}" — say it slowly to hear both` };
            }
        }
        for (const d of typedDoubles) {
            if (!correctDoubles.has(d)) {
                return { label: 'No double needed', detail: `"${correctWord}" only has one "${d[0]}" here` };
            }
        }

        // ie/ei confusion
        if ((w.includes('ie') && m.includes('ei')) || (w.includes('ei') && m.includes('ie'))) {
            return { label: 'ie vs ei', detail: '"i before e, except after c" — or when sounding like "ay" as in neighbor' };
        }

        // Silent letter drops
        const silentPairs = ['kn', 'wr', 'gn', 'mb', 'mn', 'ps', 'pn'];
        for (const sp of silentPairs) {
            if (w.includes(sp) && !m.includes(sp) && m.includes(sp[1])) {
                return { label: 'Silent letter', detail: `The "${sp[0]}" in "${sp}" is silent but must be written` };
            }
        }

        // Vowel swap
        if (w.length === m.length) {
            const vowels = new Set('aeiou');
            for (let i = 0; i < w.length; i++) {
                if (w[i] !== m[i] && vowels.has(w[i]) && vowels.has(m[i])) {
                    return { label: 'Vowel swap', detail: `It's "${w[i]}" not "${m[i]}" — try sounding out each syllable` };
                }
            }
        }
    }

    // General tricky-pattern tips (for MCQ mode or when no specific error found)
    const doubleRe = /(.)\1/g;
    const doubles = [...w.matchAll(doubleRe)];
    if (doubles.length > 0) {
        const d = doubles[0][0];
        return { label: 'Double letter', detail: `Watch for the double "${d[0]}" in "${correctWord}"` };
    }

    const silentPairs = ['kn', 'wr', 'gn', 'mb', 'mn', 'ps', 'pn', 'rh', 'wh'];
    for (const sp of silentPairs) {
        if (w.startsWith(sp) || w.includes(sp)) {
            return { label: 'Silent letter', detail: `"${correctWord}" has a silent "${sp[0]}" in "${sp}"` };
        }
    }

    if (w.includes('ie') || w.includes('ei')) {
        const pattern = w.includes('ie') ? 'ie' : 'ei';
        return { label: 'ie/ei pattern', detail: `"${correctWord}" uses "${pattern}" — watch the order` };
    }

    if (w.endsWith('tion') || w.endsWith('sion')) {
        const suffix = w.endsWith('tion') ? '-tion' : '-sion';
        return { label: 'Tricky ending', detail: `"${correctWord}" ends with "${suffix}"` };
    }

    return null;
}

// ── Similar words suggestion ────────────────────────────────────────────────

/**
 * Find other words the user has gotten wrong that share the same error pattern.
 * Used on the wrong-answer screen to show "You also struggled with: ..."
 */
export function getSimilarMistakeWords(
    currentWord: string,
    errorLabel: string,
    records: Record<string, WordRecord>,
    limit = 3,
): string[] {
    const current = currentWord.toLowerCase();
    const similar: string[] = [];

    for (const [word, rec] of Object.entries(records)) {
        if (word === current) continue;
        if (rec.correct >= rec.attempts) continue; // never got it wrong
        if (!rec.misspellings || rec.misspellings.length === 0) continue;

        // Check if this word triggers the same error pattern
        const tip = getInlineErrorTip(word, rec.misspellings[0]);
        if (tip && tip.label === errorLabel) {
            similar.push(rec.word);
            if (similar.length >= limit) break;
        }
    }

    return similar;
}

// ── Coaching cards ──────────────────────────────────────────────────────────

export interface CoachingCard {
    id: string;
    type: 'improved' | 'trap' | 'weakness' | 'levelup';
    title: string;
    detail: string;
    tip?: string;
    cta?: { label: string; category: string };
    /** Before/after stat string for improvement cards, e.g. "box 0 → box 3" */
    stat?: string;
}

/**
 * Find "comeback" words — struggled early but now progressing in Leitner.
 * Returns up to 3 words sorted by most impressive improvement.
 */
export function getImprovements(records: Record<string, WordRecord>): { word: string; box: number; accuracy: number; attempts: number }[] {
    return Object.values(records)
        .filter(r => r.attempts >= 4 && r.box >= 2)
        .filter(r => {
            // Estimate early performance: if they needed many attempts to reach current box,
            // they were struggling. A word with 8 attempts and box 3 had a rough start.
            const earlyErrorRate = 1 - (r.correct / r.attempts);
            return earlyErrorRate >= 0.3; // At least 30% of attempts were wrong
        })
        .map(r => ({
            word: r.word,
            box: r.box,
            accuracy: r.correct / r.attempts,
            attempts: r.attempts,
        }))
        .sort((a, b) => b.box - a.box || b.attempts - a.attempts)
        .slice(0, 3);
}

const BOX_LABELS = ['New', 'Learning', 'Reviewing', 'Familiar', 'Mastered'];

/**
 * Assemble up to 4 personalized coaching cards from analytics data.
 * Priority: improved > trap > weakness > levelup (celebration first).
 */
export function getCoachingCards(
    records: Record<string, WordRecord>,
): CoachingCard[] {
    const cards: CoachingCard[] = [];

    // 1. Improvement celebrations
    const improvements = getImprovements(records);
    for (const imp of improvements.slice(0, 2)) {
        cards.push({
            id: `improved-${imp.word}`,
            type: 'improved',
            title: `You conquered "${imp.word}"`,
            detail: `After ${imp.attempts} attempts, you've reached ${BOX_LABELS[imp.box]}. Keep reviewing to lock it in!`,
            stat: `${Math.round(imp.accuracy * 100)}% accuracy`,
        });
    }

    // 2. Spelling traps from mistake patterns
    const insights = getMistakeInsights(records);
    for (const ins of insights.slice(0, 2)) {
        cards.push({
            id: `trap-${ins.label.toLowerCase().replace(/\s+/g, '-')}`,
            type: 'trap',
            title: ins.label,
            detail: `This tripped you up ${ins.count} times.`,
            tip: ins.detail,
            cta: ins.category ? { label: `Practice ${formatPattern(ins.category)}`, category: ins.category } : undefined,
        });
    }

    // 3. Weakest area
    const patterns = getPatternAccuracy(records);
    const weakest = patterns.find(p => p.accuracy < 0.7);
    if (weakest) {
        const catId = patternToCategory(weakest.key as PhonicsPattern);
        cards.push({
            id: `weakness-${weakest.key}`,
            type: 'weakness',
            title: `${weakest.label} needs work`,
            detail: `${Math.round(weakest.accuracy * 100)}% accuracy across ${weakest.attempts} attempts. Focused practice can bring this up fast.`,
            cta: catId ? { label: `Drill ${weakest.label}`, category: catId } : undefined,
        });
    }

    // 4. Level-up nudge
    const nudge = getDifficultyNudge(records);
    if (nudge) {
        cards.push({
            id: 'levelup',
            type: 'levelup',
            title: 'Ready for harder words!',
            detail: `${Math.round(nudge.accuracy * 100)}% accuracy on ${nudge.wordCount} ${nudge.currentLabel} words. Time to try ${nudge.nextLabel}.`,
            cta: { label: `Try ${nudge.nextLabel.split(' ')[0]}`, category: nudge.nextCategory },
        });
    }

    return cards.slice(0, 4);
}

