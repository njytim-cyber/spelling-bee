/**
 * words/rootUtils.ts
 *
 * Shared utilities for word root lookups, formatting, and mastery computation.
 * Used by GuidedSpellingPage, BeeSimPage, RootsBrowser, and PathPage.
 */
import type { ReactNode } from 'react';
import { WORD_ROOTS, type WordRoot } from './roots';
import type { WordRecord } from '../../../hooks/useWordHistory';

// ── Reverse lookup: word → roots ─────────────────────────────────────────────

let _reverseMap: Map<string, WordRoot[]> | null = null;

function buildReverseMap(): Map<string, WordRoot[]> {
    const map = new Map<string, WordRoot[]>();
    for (const root of WORD_ROOTS) {
        for (const example of root.examples) {
            const key = example.toLowerCase();
            const existing = map.get(key);
            if (existing) existing.push(root);
            else map.set(key, [root]);
        }
    }
    return map;
}

/** Look up which roots a word belongs to. Returns empty array if none. */
export function getRootsForWord(word: string): WordRoot[] {
    if (!_reverseMap) _reverseMap = buildReverseMap();
    return _reverseMap.get(word.toLowerCase()) ?? [];
}

// ── Root string helpers ──────────────────────────────────────────────────────

/** Extract searchable substrings from a root string like "scrib/script" or "-ette". */
export function rootFragments(root: string): string[] {
    return root.replace(/^-|-$/g, '').split('/').map(s => s.trim().toLowerCase()).filter(Boolean);
}

/** Render a word with the root morpheme bolded in gold. */
export function highlightRoot(word: string, root: string): ReactNode {
    const frags = rootFragments(root);
    const lower = word.toLowerCase();
    for (const frag of frags) {
        const idx = lower.indexOf(frag);
        if (idx !== -1) {
            return (
                <>
                    {word.slice(0, idx)}
                    <strong className="text-[var(--color-gold)]">{word.slice(idx, idx + frag.length)}</strong>
                    {word.slice(idx + frag.length)}
                </>
            );
        }
    }
    return word;
}

// ── Formatting ───────────────────────────────────────────────────────────────

/** Format root data into a readable hint string. */
export function formatRootHint(roots: WordRoot[]): string {
    return roots.map(r => `${r.root} (${r.origin}: ${r.meaning})`).join(' + ');
}

// ── Mastery computation ──────────────────────────────────────────────────────

export interface RootMasteryEntry {
    root: WordRoot;
    /** Count of example words with Leitner box >= 3 (almost mastered or mastered). */
    mastered: number;
    /** Total example words in the root. */
    total: number;
    /** 0–1 progress ratio. */
    progress: number;
}

/** Derive per-root mastery stats from Leitner word records. */
export function computeRootMastery(
    records: Record<string, WordRecord>,
    roots: readonly WordRoot[],
): RootMasteryEntry[] {
    return roots.map(root => {
        const total = root.examples.length;
        let mastered = 0;
        for (const example of root.examples) {
            const rec = records[example.toLowerCase()];
            if (rec && rec.box >= 3) mastered++;
        }
        return { root, mastered, total, progress: total > 0 ? mastered / total : 0 };
    });
}
