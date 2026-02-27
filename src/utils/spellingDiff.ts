/**
 * utils/spellingDiff.ts
 *
 * Computes a character-level diff between a student's typed spelling and the
 * correct word, producing per-character annotations for visual highlighting.
 *
 * Uses a simple LCS-based approach to align the two strings and classify
 * each character as correct, wrong (substitution), missing, or extra.
 */

export type DiffKind = 'correct' | 'wrong' | 'missing' | 'extra';

export interface DiffChar {
    char: string;
    kind: DiffKind;
}

/**
 * Compute diff between what the student typed and the correct spelling.
 * Returns two arrays: one for displaying the correct word (with highlights)
 * and one for displaying the typed word (with highlights).
 */
export function spellingDiff(typed: string, correct: string): {
    correctChars: DiffChar[];
    typedChars: DiffChar[];
} {
    const a = typed.toLowerCase();
    const b = correct.toLowerCase();

    // LCS table
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1] + 1
                : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }

    // Backtrack to build alignment
    const correctChars: DiffChar[] = [];
    const typedChars: DiffChar[] = [];
    let i = m, j = n;

    // Collect in reverse, then flip
    const cBuf: DiffChar[] = [];
    const tBuf: DiffChar[] = [];

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
            // Match
            cBuf.push({ char: correct[j - 1], kind: 'correct' });
            tBuf.push({ char: typed[i - 1], kind: 'correct' });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            // Character in correct but not in typed → missing
            cBuf.push({ char: correct[j - 1], kind: 'missing' });
            j--;
        } else {
            // Character in typed but not in correct → extra
            tBuf.push({ char: typed[i - 1], kind: 'extra' });
            i--;
        }
    }

    cBuf.reverse();
    tBuf.reverse();

    correctChars.push(...cBuf);
    typedChars.push(...tBuf);

    return { correctChars, typedChars };
}

/**
 * Generate a concise human-readable hint about what went wrong.
 * E.g. "swapped 'ie' → 'ei'", "missing 's'", "extra 't'"
 */
export function spellingHint(typed: string, correct: string): string {
    const a = typed.trim().toLowerCase();
    const b = correct.toLowerCase();

    if (a === b) return '';

    // Check for simple transposition (adjacent swap)
    if (a.length === b.length) {
        const diffs: number[] = [];
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) diffs.push(i);
        }
        if (diffs.length === 2 && diffs[1] === diffs[0] + 1 &&
            a[diffs[0]] === b[diffs[1]] && a[diffs[1]] === b[diffs[0]]) {
            return `swapped '${b[diffs[0]]}${b[diffs[1]]}'`;
        }
        if (diffs.length === 1) {
            return `'${a[diffs[0]]}' should be '${b[diffs[0]]}'`;
        }
    }

    // Check for single missing letter
    if (a.length === b.length - 1) {
        for (let i = 0; i < b.length; i++) {
            const without = b.slice(0, i) + b.slice(i + 1);
            if (without === a) return `missing '${b[i]}'`;
        }
    }

    // Check for single extra letter
    if (a.length === b.length + 1) {
        for (let i = 0; i < a.length; i++) {
            const without = a.slice(0, i) + a.slice(i + 1);
            if (without === b) return `extra '${a[i]}'`;
        }
    }

    // Check for double consonant issue
    const doubleRe = /(.)\1/g;
    const correctDoubles = [...b.matchAll(doubleRe)].map(m => m[0]);
    const typedDoubles = [...a.matchAll(doubleRe)].map(m => m[0]);
    if (correctDoubles.length > typedDoubles.length) {
        const missing = correctDoubles.find(d => !typedDoubles.includes(d));
        if (missing) return `needs double '${missing}'`;
    }
    if (typedDoubles.length > correctDoubles.length) {
        const extra = typedDoubles.find(d => !correctDoubles.includes(d));
        if (extra) return `no double '${extra[0]}' needed`;
    }

    return '';
}
