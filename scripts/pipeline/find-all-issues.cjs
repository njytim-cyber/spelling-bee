/**
 * find-all-issues.cjs
 *
 * Comprehensive scanner for ALL word data quality issues:
 *   - POS mismatches (adjective def as noun, verb def as adjective, etc.)
 *   - Archaic/biblical example sentences
 *   - Academic abbreviations in examples
 *   - Very short example sentences
 *   - Missing terminal punctuation in examples
 *   - URLs in definitions or examples
 *   - Cross-references (See also, Compare) in definitions
 *   - Meta template examples ("Can you use the word X in a sentence?")
 *   - Double periods in definitions
 *   - Definitions missing terminal period
 *   - Citation-style examples (starting with year)
 *   - Repeated words in definitions/examples (typos)
 *   - Unbalanced parentheses in definitions
 *   - Example missing target word
 *   - Very long examples (>200 chars)
 *   - HTML entities or markup in definitions/examples
 *   - "Alternative form of" / "See X" placeholder definitions
 *   - Obsolete/archaic tags in definitions
 *
 * Usage: node scripts/pipeline/find-all-issues.cjs
 * Output: scripts/pipeline/all-issues-manifest.json
 */

const fs = require('fs');
const path = require('path');

const WORDS_DIR = path.join(__dirname, '..', '..', 'src', 'domains', 'spelling', 'words');
const OUTPUT_PATH = path.join(__dirname, 'all-issues-manifest.json');

// ── Extract word objects from a .ts chunk file ──

function extractWords(filePath) {
    const src = fs.readFileSync(filePath, 'utf-8');
    const assignMatch = src.match(/SpellingWord\[\]\s*=\s*/);
    if (!assignMatch) return [];
    const arrayStart = assignMatch.index + assignMatch[0].length;
    let arrayContent = src.slice(arrayStart).trimEnd();
    if (arrayContent.endsWith(';')) arrayContent = arrayContent.slice(0, -1);
    try {
        return JSON.parse(arrayContent);
    } catch (e) {
        console.error(`  WARNING: Could not parse ${path.basename(filePath)}: ${e.message}`);
        return [];
    }
}

// ── Words that are inherently archaic (their examples should use archaic language) ──
const ARCHAIC_WORD_WHITELIST = new Set([
    'doest', 'goest', 'aroint', 'archaism', 'thee', 'thou', 'thy', 'thine',
    'hath', 'doth', 'saith', 'forsooth', 'prithee', 'wherefore', 'whence',
    'hither', 'thither', 'betwixt', 'shalt',
]);

// ── Archaic word patterns ──
const ARCHAIC_WORDS = [
    /\bsaith\b/i, /\bspake\b/i, /\bhath\b/i, /\bdoth\b/i,
    /\bdoest\b/i, /\bgoest\b/i, /\bthine\b/i,
    /\bwhilst\b/i, /\bbetwixt\b/i, /\bforsooth\b/i,
    /\bprithee\b/i, /\bmethinks\b/i, /\bwherefore\b/i,
    /\bwhence\b/i, /\bhither\b/i, /\bthither\b/i,
    /\bwilt thou\b/i, /\bshalt\b/i, /\bwouldst\b/i,
    /\bcanst\b/i, /\bdidst\b/i,
];

// thou/thee/thy need careful handling to avoid false positives
const THOU_RE = /\bthou\b/i;
const THOU_FALSE = /\bthough\b|\bthought\b|\bthousand\b|\bthroughout\b|\bthous\b/i;
const THEE_RE = /\bthee\b/i;
const THEE_FALSE = /\bthree\b|\bthee-/i;
const THY_RE = /\bthy\b/i;
const THY_FALSE = /\bthyroid\b|\bthyme\b|\bthyself\b/i;

// Academic abbreviations
const ACADEMIC_RE = /\bviz\.|\bi\.e\.|\be\.g\.|\bcf\./i;

// ── Adjective-indicator patterns for POS check ──
const ADJ_INDICATORS = [
    /^being\b/i,
    /^having\b/i,
    /^relating to\b/i,
    /^of or relating to\b/i,
    /^resembling\b/i,
    /^characterized by\b/i,
    /^of or pertaining to\b/i,
    /^pertaining to\b/i,
    /^lacking\b/i,
    /^containing\b/i,
    /^producing\b/i,
    /^causing\b/i,
    /^inclined to\b/i,
    /^capable of\b/i,
    /^tending to\b/i,
    /^existing in\b/i,
    /^full of\b/i,
    /^without\b/i,
    /^not\s/i,
    /^suggestive of\b/i,
    /^suitable for\b/i,
];

// ── Issue detectors ──

function findIssues(w) {
    const issues = [];
    const def = w.definition || '';
    const ex = w.exampleSentence || '';

    // ── POS MISMATCHES ──

    // A: Adjective definition tagged as noun
    if (w.partOfSpeech === 'noun') {
        for (const re of ADJ_INDICATORS) {
            if (re.test(def)) {
                issues.push('pos_adj_as_noun');
                break;
            }
        }
    }

    // B: Verb definition ("To ...") tagged as adjective
    if (w.partOfSpeech === 'adjective' && /^to\s/i.test(def)) {
        issues.push('pos_verb_as_adj');
    }

    // C: Verb definition ("To ...") tagged as noun
    if (w.partOfSpeech === 'noun' && /^to\s/i.test(def)) {
        issues.push('pos_verb_as_noun');
    }

    // D: Noun definition (starts with A/An/The) tagged as verb
    if (w.partOfSpeech === 'verb' && /^(a|an|the)\s/i.test(def)) {
        issues.push('pos_noun_as_verb');
    }

    // E: Noun definition (starts with A/An/The) tagged as adjective
    if (w.partOfSpeech === 'adjective' && /^(a|an|the)\s/i.test(def)) {
        issues.push('pos_noun_as_adj');
    }

    // F: Adverb definition ("In a ... manner") tagged wrong
    if (w.partOfSpeech !== 'adverb' && /^in a \w+ (manner|way|fashion)\b/i.test(def)) {
        issues.push('pos_adverb_mismatch');
    }

    // ── EXAMPLE SENTENCE ISSUES ──

    // Archaic language (skip words that are inherently archaic)
    if (!ARCHAIC_WORD_WHITELIST.has(w.word.toLowerCase())) {
        for (const re of ARCHAIC_WORDS) {
            if (re.test(ex)) {
                issues.push('archaic_example');
                break;
            }
        }
        // thou/thee/thy with false-positive exclusion
        if (!issues.includes('archaic_example')) {
            if (THOU_RE.test(ex) && !THOU_FALSE.test(ex)) issues.push('archaic_example');
            else if (THEE_RE.test(ex) && !THEE_FALSE.test(ex)) issues.push('archaic_example');
            else if (THY_RE.test(ex) && !THY_FALSE.test(ex)) issues.push('archaic_example');
        }
    }

    // Academic abbreviations
    if (ACADEMIC_RE.test(ex)) issues.push('academic_abbrev');

    // Very short example (<30 chars, excluding quotes)
    const exContent = ex.replace(/^"|"$/g, '');
    if (exContent.length > 0 && exContent.length < 30) issues.push('short_example');

    // URLs in definitions or examples
    if (/https?:\/\//.test(def)) issues.push('url_in_def');
    if (/https?:\/\//.test(ex)) issues.push('url_in_example');

    // Cross-references in definitions
    if (/\bsee also\b/i.test(def)) issues.push('xref_see_also');
    if (/\bcompare\b/i.test(def) && def.length < 50) issues.push('xref_compare');

    // ── DEFINITION ISSUES ──

    // Definition missing terminal period
    const trimDef = def.trim();
    if (trimDef.length > 0 && !/[.!?;'"\u2019\u201d)]$/.test(trimDef)) {
        issues.push('def_no_period');
    }

    // Double period in definition (not ellipsis)
    if (/\.\.(?!\.)/.test(def)) issues.push('double_period_def');

    // Unbalanced parentheses in definition
    const defOpenP = (def.match(/\(/g) || []).length;
    const defCloseP = (def.match(/\)/g) || []).length;
    if (defOpenP !== defCloseP) issues.push('unbalanced_parens_def');

    // Repeated words in definition (typos like "to to", "with with")
    const repeatedDef = def.match(/\b(\w{2,})\s+\1\b/gi);
    if (repeatedDef) {
        // Skip Latin binomials and known proper terms
        const KNOWN_REPEATS = new Set(['gallus gallus', 'puffinus puffinus', 'ballerus ballerus',
            'rupicapra rupicapra', 'nulla nulla', 'bison bison', 'leucanthemum leucanthemum',
            'vanellus vanellus', 'alosa alosa', 'anser anser', 'ferus ferus', 'western western']);
        const allKnown = repeatedDef.every(r => KNOWN_REPEATS.has(r.toLowerCase()));
        if (!allKnown) issues.push('repeated_word_def');
    }

    // ── MORE EXAMPLE ISSUES ──

    // Meta template examples
    if (/^Can you use the word \w+ in a sentence\?$/i.test(ex)) {
        issues.push('meta_template');
    }

    // Citation-style examples (starting with year)
    if (/^\d{4}[\s,]/.test(ex)) issues.push('citation_example');

    // Double period in example (truncated ellipsis)
    if (/\.\.(?!\.)/.test(ex)) issues.push('double_period_ex');

    // Missing terminal punctuation (should end with . ! or ?)
    const trimmedEx = ex.replace(/["'\s]+$/, '');
    if (trimmedEx.length > 0 && !/[.!?]$/.test(trimmedEx)) {
        // Allow ellipsis ending
        if (!/[…]$/.test(trimmedEx) && !/\.{3}$/.test(trimmedEx)) {
            issues.push('missing_punctuation');
        }
    }

    // ── EXAMPLE MISSING TARGET WORD ──
    // The example should contain the word (or a common inflection)
    if (ex.length > 0) {
        const word = w.word.toLowerCase();
        const exLower = ex.toLowerCase();
        // Build inflection variants
        const stems = [word];
        stems.push(word + 's', word + 'es', word + 'ed', word + 'd');
        stems.push(word + 'ing', word + 'er', word + 'est', word + 'ly');
        stems.push(word + 'ful', word + 'ness', word + 'ment');
        stems.push(word + 'tion', word + 'ation', word + 'ity');
        stems.push(word + 'ous', word + 'al', word + 'ive', word + 'ish');
        stems.push(word + 'en', word + 'ern', word + 'ize', word + 'ise');
        // Drop final e: make→making, dance→dancing
        if (word.endsWith('e')) {
            const stem = word.slice(0, -1);
            stems.push(stem + 'ing', stem + 'ed', stem + 'er', stem + 'est', stem + 'ation');
        }
        // Double final consonant: run→running, big→bigger
        if (/[bcdfghjklmnpqrstvwxz]$/.test(word) && word.length >= 3) {
            const last = word[word.length - 1];
            stems.push(word + last + 'ing', word + last + 'ed', word + last + 'er', word + last + 'est');
        }
        // y→ies, y→ied: carry→carries, carry→carried
        if (word.endsWith('y')) {
            const stem = word.slice(0, -1);
            stems.push(stem + 'ies', stem + 'ied', stem + 'ier', stem + 'iest', stem + 'ily', stem + 'iness');
        }
        // Latin/Greek/scientific plurals: -a→-ae, -us→-i, -um→-a, -ma→-mata, -is→-es, -x→-ces
        if (word.endsWith('a')) stems.push(word + 'e', word.slice(0,-1) + 'ae');
        if (word.endsWith('us')) stems.push(word.slice(0,-2) + 'i');
        if (word.endsWith('um')) stems.push(word.slice(0,-2) + 'a');
        if (word.endsWith('ma')) stems.push(word + 'ta', word + 'tum');
        if (word.endsWith('is')) stems.push(word.slice(0,-2) + 'es');
        if (word.endsWith('x')) stems.push(word.slice(0,-1) + 'ces');
        if (word.endsWith('on')) stems.push(word.slice(0,-2) + 'a');
        // Foreign plurals: Hebrew -im/-ot, Russian -i/-iki, Esperanto -oj
        stems.push(word + 'im', word + 'ot', word + 'oj');
        stems.push(word + 'iki', word + 'ah', word + 'h');
        // Irregular English past tenses/participles
        const IRREGULARS = {
            deal: ['dealt'], overdo: ['overdone'], overtake: ['overtaken'],
            forego: ['foregone'], outdo: ['outdone'], upthrow: ['upthrown'],
            outlearn: ['outlearnt', 'outlearned'], underthrow: ['underthrown'],
        };
        if (Object.hasOwn(IRREGULARS, word)) stems.push(...IRREGULARS[word]);

        const found = stems.some(s => {
            const re = new RegExp('\\b' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
            return re.test(exLower);
        });
        if (!found) issues.push('example_missing_word');
    }

    // ── VERY LONG EXAMPLE (>200 chars) ──
    if (ex.length > 200) issues.push('long_example');

    // ── HTML ENTITIES OR MARKUP ──
    if (/&[a-z]+;|<\/?[a-z]+>/i.test(def)) issues.push('html_in_def');
    if (/&[a-z]+;|<\/?[a-z]+>/i.test(ex)) issues.push('html_in_example');

    // ── PLACEHOLDER DEFINITIONS ──
    // "Alternative form of X", "Alternative spelling of X", "See X"
    if (/^(alternative (form|spelling) of\b|see\s)/i.test(trimDef) && trimDef.length < 60) {
        issues.push('placeholder_def');
    }

    // ── OBSOLETE/ARCHAIC TAGS IN DEFINITIONS ──
    if (/\(obsolete\)|\(archaic\)/i.test(def)) issues.push('obsolete_tag_def');

    return issues;
}

// ── Main ──

const tierFiles = fs.readdirSync(WORDS_DIR)
    .filter(f => /^tier\d+.*pipeline.*\.ts$/.test(f) && !f.match(/^tier\d+-pipeline\.ts$/))
    .sort();

console.log(`Scanning ${tierFiles.length} pipeline chunk files...\n`);

const manifest = {};
let totalWords = 0;
let totalBad = 0;
const issueCounts = {};
const issueExamples = {}; // first 3 examples per issue type

for (const f of tierFiles) {
    const words = extractWords(path.join(WORDS_DIR, f));
    const badWords = [];

    for (const w of words) {
        totalWords++;
        const issues = findIssues(w);
        if (issues.length > 0) {
            totalBad++;
            badWords.push({
                word: w.word,
                definition: w.definition,
                exampleSentence: w.exampleSentence,
                partOfSpeech: w.partOfSpeech,
                issues,
            });
            for (const issue of issues) {
                issueCounts[issue] = (issueCounts[issue] || 0) + 1;
                if (!issueExamples[issue]) issueExamples[issue] = [];
                if (issueExamples[issue].length < 3) {
                    issueExamples[issue].push({ word: w.word, file: f, def: w.definition, ex: w.exampleSentence, pos: w.partOfSpeech });
                }
            }
        }
    }

    if (badWords.length > 0) {
        manifest[f] = badWords;
    }
}

// Write manifest
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2));

console.log(`Total pipeline words: ${totalWords}`);
console.log(`Words with issues: ${totalBad} (${(100 * totalBad / totalWords).toFixed(1)}%)`);
console.log(`\nIssue breakdown:`);
for (const [issue, count] of Object.entries(issueCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${issue.padEnd(30)} ${count}`);
}

console.log(`\n── Examples per issue type ──\n`);
for (const [issue, examples] of Object.entries(issueExamples).sort((a, b) => (issueCounts[b[0]] || 0) - (issueCounts[a[0]] || 0))) {
    console.log(`${issue} (${issueCounts[issue]}):`);
    for (const ex of examples) {
        console.log(`  "${ex.word}" [${ex.pos}] in ${ex.file}`);
        console.log(`    def: ${ex.def}`);
        if (issue.startsWith('pos_')) {
            // POS issues — show definition
        } else {
            console.log(`    ex: ${ex.ex}`);
        }
    }
    console.log();
}

console.log(`\nManifest written to: ${OUTPUT_PATH}`);
