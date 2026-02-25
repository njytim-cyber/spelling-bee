/**
 * scripts/bake-distractors.ts
 *
 * Pre-generates high-quality distractors for every word in the bank
 * and writes them directly into each tier file as a `distractors` field.
 *
 * Run with: npx tsx scripts/bake-distractors.ts
 */
import * as fs from 'fs';
import * as path from 'path';

// ── Distractor generation logic (copied from spellingGenerator.ts) ──────────

const VOWEL_SWAPS: [string, string][] = [
    ['a', 'e'], ['e', 'i'], ['i', 'o'], ['o', 'u'], ['a', 'u'],
];

const CONSONANT_CONFUSIONS: [string, string][] = [
    ['b', 'd'], ['p', 'b'], ['m', 'n'], ['s', 'z'], ['f', 'v'],
    ['t', 'd'], ['g', 'k'], ['c', 'k'],
];

const DIGRAPH_CONFUSIONS: [string, string][] = [
    ['sh', 'ch'], ['th', 'f'], ['wh', 'w'], ['ck', 'k'], ['ph', 'f'],
];

const SUFFIX_CONFUSIONS: [string, string][] = [
    ['ible', 'able'], ['ance', 'ence'], ['ant', 'ent'], ['ary', 'ery'],
    ['tion', 'sion'], ['cious', 'tious'], ['eous', 'ious'], ['ise', 'ize'],
    ['ful', 'full'], ['ment', 'mant'], ['ous', 'us'], ['al', 'el'],
    ['er', 'or'], ['ar', 'er'], ['ie', 'ei'], ['ei', 'ie'],
];

const SILENT_LETTER_SPOTS: [string, string][] = [
    ['kn', 'n'], ['wr', 'r'], ['gn', 'n'], ['mb', 'm'],
    ['mn', 'n'], ['ps', 's'], ['pn', 'n'],
];

const LEGAL_ONSETS = new Set([
    'b','c','d','f','g','h','j','k','l','m','n','p','q','r','s','t','v','w','x','y','z',
    'bl','br','ch','cl','cr','dr','dw','fl','fr','gh','gl','gn','gr',
    'kn','ph','pl','pr','ps','qu','sc','sh','sk','sl','sm','sn','sp',
    'spl','spr','sq','squ','st','str','sw','th','tr','tw','wh','wr',
    'scr','sch','shr','thr',
]);

const LEGAL_CODAS = new Set([
    'b','c','d','f','g','k','l','m','n','p','r','s','t','v','x','z',
    'ch','ck','ct','ff','ft','gh','lb','lch','ld','lf','lk','ll','lm',
    'ln','lp','ls','lt','lth','ltz','lve','mb','mp','mph','mps','ms',
    'nd','ng','nk','ns','nt','nth','nts','nz','ph','pt','rb','rc',
    'rch','rd','rf','rg','rk','rl','rm','rn','rp','rs','rse','rst',
    'rt','rth','rv','rve','sh','sk','sm','sp','ss','st','sts','th',
    'ts','tch','tz','wl','wn','ws','xt',
    'dge','nce','nge','nse','nze','rce','rge','rse','rze',
    'ft','lf','lp','lt','mp','nd','nk','nt','pt','sk','sp','st',
]);

const VOWELS = 'aeiou';

function looksPronounceable(w: string): boolean {
    if (w.length < 2) return true;
    const hasVowelLike = /[aeiouy]/.test(w);
    if (!hasVowelLike) return false;
    if (/[^aeiouy]{4,}/.test(w)) return false;

    const onsetMatch = w.match(/^([^aeiouy]*)/);
    if (onsetMatch && onsetMatch[1].length > 0) {
        const onset = onsetMatch[1];
        if (onset.length > 3) return false;
        if (onset.length >= 2 && !LEGAL_ONSETS.has(onset)) return false;
    }

    const codaMatch = w.match(/([^aeiouy]*)$/);
    if (codaMatch && codaMatch[1].length > 0) {
        const coda = codaMatch[1];
        if (coda.length > 4) return false;
        if (coda.length >= 2 && !LEGAL_CODAS.has(coda)) return false;
    }

    const internalClusters = w.match(/[aeiouy]([^aeiouy]{3,})[aeiouy]/g);
    if (internalClusters) {
        for (const match of internalClusters) {
            const cluster = match.slice(1, -1);
            if (cluster.length > 3) return false;
        }
    }

    return true;
}

function generateMisspelling(word: string, rng: () => number): string | null {
    const strategies: (() => string | null)[] = [
        // 1. Swap two adjacent same-type chars
        () => {
            if (word.length < 4) return null;
            const candidates: number[] = [];
            for (let i = 1; i < word.length - 1; i++) {
                const a = word[i], b = word[i + 1];
                if (a === b) continue;
                const aIsVowel = VOWELS.includes(a);
                const bIsVowel = VOWELS.includes(b);
                if (aIsVowel === bIsVowel) candidates.push(i);
            }
            if (candidates.length === 0) return null;
            const i = candidates[Math.floor(rng() * candidates.length)];
            return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
        },
        // 2. Swap a vowel for a similar vowel
        () => {
            const vowelPositions = [...word].map((ch, i) => ({ ch, i })).filter(({ ch }) => VOWELS.includes(ch));
            if (vowelPositions.length === 0) return null;
            const pos = vowelPositions[Math.floor(rng() * vowelPositions.length)];
            const swaps = VOWEL_SWAPS.filter(([a, b]) => a === pos.ch || b === pos.ch);
            if (swaps.length === 0) return null;
            const [a, b] = swaps[Math.floor(rng() * swaps.length)];
            const newCh = pos.ch === a ? b : a;
            return word.slice(0, pos.i) + newCh + word.slice(pos.i + 1);
        },
        // 3. Double a consonant (or remove a double)
        () => {
            for (let i = 0; i < word.length - 1; i++) {
                if (word[i] === word[i + 1] && !VOWELS.includes(word[i])) {
                    return word.slice(0, i) + word.slice(i + 1);
                }
            }
            const consonants = [...word].map((ch, i) => ({ ch, i }))
                .filter(({ ch, i }) => !VOWELS.includes(ch) && /[a-z]/.test(ch) && i > 0 && i < word.length - 1);
            if (consonants.length === 0) return null;
            const c = consonants[Math.floor(rng() * consonants.length)];
            if (word[c.i - 1] !== c.ch && (c.i + 1 >= word.length || word[c.i + 1] !== c.ch)) {
                return word.slice(0, c.i) + c.ch + word.slice(c.i);
            }
            return null;
        },
        // 4. Swap consonant confusion pairs
        () => {
            const pairs = [...CONSONANT_CONFUSIONS].sort(() => rng() - 0.5);
            for (const [a, b] of pairs) {
                const idx = word.indexOf(a);
                if (idx >= 0 && rng() > 0.5) {
                    return word.slice(0, idx) + b + word.slice(idx + a.length);
                }
                const idx2 = word.indexOf(b);
                if (idx2 >= 0) {
                    return word.slice(0, idx2) + a + word.slice(idx2 + b.length);
                }
            }
            return null;
        },
        // 5. Digraph confusion
        () => {
            const pairs = [...DIGRAPH_CONFUSIONS].sort(() => rng() - 0.5);
            for (const [a, b] of pairs) {
                const idx = word.indexOf(a);
                if (idx >= 0) {
                    return word.slice(0, idx) + b + word.slice(idx + a.length);
                }
            }
            return null;
        },
        // 6. Silent-e manipulation
        () => {
            if (word.endsWith('e')) return word.slice(0, -1);
            const last = word[word.length - 1];
            if (!VOWELS.includes(last) && /[a-z]/.test(last)) return word + 'e';
            return null;
        },
        // 7. Suffix confusion
        () => {
            for (const [a, b] of SUFFIX_CONFUSIONS) {
                if (word.endsWith(a)) return word.slice(0, -a.length) + b;
                if (word.endsWith(b)) return word.slice(0, -b.length) + a;
            }
            return null;
        },
        // 8. Silent letter trap
        () => {
            for (const [full, reduced] of SILENT_LETTER_SPOTS) {
                const idx = word.indexOf(full);
                if (idx >= 0) return word.slice(0, idx) + reduced + word.slice(idx + full.length);
            }
            return null;
        },
    ];

    const shuffled = [...strategies].sort(() => rng() - 0.5);
    for (const strategy of shuffled) {
        const result = strategy();
        if (result && result !== word && result.length > 0 && looksPronounceable(result)) {
            return result;
        }
    }
    return null;
}

function makeMisspellings(correct: string, rng: () => number): string[] {
    const misspellings = new Set<string>();
    let attempts = 0;

    while (misspellings.size < 3 && attempts < 60) {
        const mis = generateMisspelling(correct, rng);
        if (mis && mis !== correct && !misspellings.has(mis)) {
            misspellings.add(mis);
        }
        attempts++;
    }

    // Fallback: vowel substitution
    if (misspellings.size < 3) {
        for (let i = 0; i < correct.length && misspellings.size < 3; i++) {
            if (VOWELS.includes(correct[i])) {
                for (const v of 'aeiou') {
                    if (v !== correct[i]) {
                        const mis = correct.slice(0, i) + v + correct.slice(i + 1);
                        if (mis !== correct && !misspellings.has(mis) && looksPronounceable(mis)) {
                            misspellings.add(mis);
                            if (misspellings.size >= 3) break;
                        }
                    }
                }
            }
        }
    }

    // Fallback: consonant substitution
    if (misspellings.size < 3) {
        for (let i = 0; i < correct.length && misspellings.size < 3; i++) {
            if (!VOWELS.includes(correct[i]) && /[a-z]/.test(correct[i])) {
                for (const [a, b] of CONSONANT_CONFUSIONS) {
                    if (correct[i] === a || correct[i] === b) {
                        const replacement = correct[i] === a ? b : a;
                        const mis = correct.slice(0, i) + replacement + correct.slice(i + 1);
                        if (mis !== correct && !misspellings.has(mis) && looksPronounceable(mis)) {
                            misspellings.add(mis);
                            break;
                        }
                    }
                }
            }
        }
    }

    // Last resort: unfiltered vowel/consonant swaps
    if (misspellings.size < 3) {
        for (let i = 0; i < correct.length && misspellings.size < 3; i++) {
            if (VOWELS.includes(correct[i])) {
                for (const v of 'aeiou') {
                    if (v !== correct[i]) {
                        const mis = correct.slice(0, i) + v + correct.slice(i + 1);
                        if (mis !== correct && !misspellings.has(mis)) {
                            misspellings.add(mis);
                            break;
                        }
                    }
                }
            }
        }
    }
    if (misspellings.size < 3) {
        if (!correct.endsWith('e')) {
            const mis = correct + 'e';
            if (!misspellings.has(mis)) misspellings.add(mis);
        }
        if (misspellings.size < 3 && correct.endsWith('e') && correct.length > 2) {
            const mis = correct.slice(0, -1);
            if (!misspellings.has(mis)) misspellings.add(mis);
        }
    }

    return [...misspellings].slice(0, 3);
}

// ── Seeded RNG for deterministic output ─────────────────────────────────────

function createSeededRng(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0x100000000;
    };
}

// ── Process tier files ──────────────────────────────────────────────────────

const WORDS_DIR = path.resolve(import.meta.dirname, '../src/domains/spelling/words');

const TIER_FILES = [
    'tier1.ts', 'tier2.ts', 'tier3.ts', 'tier4.ts', 'tier5.ts',
    'tier5-scripps.ts', 'tier5-state.ts',
];

let totalWords = 0;
let totalFailures = 0;

for (const filename of TIER_FILES) {
    const filepath = path.join(WORDS_DIR, filename);
    let content = fs.readFileSync(filepath, 'utf-8');

    // Remove any existing distractors fields first
    content = content.replace(/\s*distractors:\s*\[.*?\],?\n/g, '');

    // Find all word entries and inject distractors
    // Handle escaped apostrophes in word values like 'hors d\'oeuvre'
    const wordRegex = /word:\s*'((?:[^'\\]|\\.)*)'/g;
    const words: { word: string; rawWord: string; index: number }[] = [];
    let match;
    while ((match = wordRegex.exec(content)) !== null) {
        const rawWord = match[1]; // as it appears in source (with \')
        const word = rawWord.replace(/\\'/g, "'"); // unescaped for generation
        words.push({ word, rawWord, index: match.index });
    }

    let offset = 0;
    for (const { word, rawWord } of words) {
        totalWords++;
        // Use word as seed for deterministic distractors
        const seed = [...word].reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1) * 31, 0);
        const rng = createSeededRng(seed);
        const distractors = makeMisspellings(word, rng);

        if (distractors.length < 2) {
            console.warn(`  WARNING: "${word}" only produced ${distractors.length} distractors`);
            totalFailures++;
        }

        // Find the word entry position in current content (use rawWord for exact match)
        const searchStart = content.indexOf(`word: '${rawWord}'`, offset);
        if (searchStart === -1) continue;

        // Find the closing },  or }] of this word's object
        const closingBrace = content.indexOf('\n    },', searchStart);
        const closingBraceFinal = content.indexOf('\n    }\n', searchStart);
        const closingBraceEnd = content.indexOf('\n];', searchStart);

        // Pick the nearest closing brace
        const candidates = [closingBrace, closingBraceFinal, closingBraceEnd].filter(x => x !== -1);
        const bracePos = candidates.length > 0 ? Math.min(...candidates) : -1;

        if (bracePos === -1) {
            console.warn(`  WARNING: Could not find closing brace for "${word}"`);
            continue;
        }

        // Escape apostrophes for single-quoted JS string literals
        const distractorsStr = distractors.map(d => `'${d.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(', ');
        const insertLine = `\n        distractors: [${distractorsStr}],`;

        content = content.slice(0, bracePos) + insertLine + content.slice(bracePos);
        offset = bracePos + insertLine.length;
    }

    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(`${filename}: processed ${words.length} words`);
}

console.log(`\nDone! ${totalWords} words processed, ${totalFailures} warnings.`);
