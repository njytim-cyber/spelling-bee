/**
 * find-bad-words.cjs
 *
 * Scans all pipeline chunk files and identifies words with quality issues.
 * Outputs a JSON manifest grouped by source file.
 *
 * Usage: node scripts/pipeline/find-bad-words.cjs
 * Output: scripts/pipeline/bad-words-manifest.json
 */

const fs = require('fs');
const path = require('path');

const WORDS_DIR = path.join(__dirname, '..', '..', 'src', 'domains', 'spelling', 'words');
const OUTPUT_PATH = path.join(__dirname, 'bad-words-manifest.json');

// ── Extract word objects from a .ts chunk file (JSON parsing) ──

function extractWords(filePath) {
    const src = fs.readFileSync(filePath, 'utf-8');

    const assignMatch = src.match(/SpellingWord\[\]\s*=\s*/);
    if (!assignMatch) {
        console.error(`  WARNING: Could not find array assignment in ${path.basename(filePath)}. Skipping.`);
        return [];
    }
    const arrayStart = assignMatch.index + assignMatch[0].length;
    let arrayContent = src.slice(arrayStart).trimEnd();
    if (arrayContent.endsWith(';')) arrayContent = arrayContent.slice(0, -1);

    try {
        return JSON.parse(arrayContent);
    } catch (e) {
        console.error(`  WARNING: Could not parse ${path.basename(filePath)} as JSON: ${e.message}`);
        return [];
    }
}

// ── Quality issue detectors ──

function findIssues(w) {
    const issues = [];
    const def = w.definition;
    const ex = w.exampleSentence;
    const wordLower = w.word.toLowerCase();
    const escapedWord = wordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRe = new RegExp(`\\b${escapedWord}\\b`, 'i');

    // 1. Generic template examples
    if (/took a while to learn/i.test(ex)) issues.push('generic_example_learn');
    if (/vocabulary words?\s*(this|last)\s*week/i.test(ex)) issues.push('generic_example_vocab');
    if (/was our spelling word/i.test(ex)) issues.push('generic_example_spelling');
    if (/wrote the word .* on the board/i.test(ex)) issues.push('generic_example_board');
    if (/had an entire chapter about/i.test(ex)) issues.push('generic_example_chapter');
    if (/admired the .* pattern on the quilt/i.test(ex)) issues.push('generic_example_quilt');
    if (/taught us how to .* properly/i.test(ex)) issues.push('generic_example_taught');
    if (/discussed the .* during the science/i.test(ex)) issues.push('generic_example_science');

    // 2. Very short / truncated definitions (<=20 chars)
    if (def.length <= 20) issues.push('short_definition');

    // 3. Abstract jargon definitions
    if (/\bthe act of \w+ing\b/i.test(def)) issues.push('jargon_act_of');
    if (/\bin a \w+ manner\b/i.test(def)) issues.push('jargon_manner');
    if (/^one who\b/i.test(def)) issues.push('jargon_one_who');
    if (/\bpertaining to\b/i.test(def)) issues.push('jargon_pertaining');
    if (/\bof or relating to\b/i.test(def)) issues.push('jargon_relating');
    if (/\bthe state of being\b/i.test(def)) issues.push('jargon_state_of');
    if (/\bcharacterized by\b/i.test(def)) issues.push('jargon_characterized');
    if (/\bhaving the (quality|nature|character)\b/i.test(def)) issues.push('jargon_having_quality');

    // 4. Circular definitions (word appears in its own definition)
    if (wordRe.test(def)) issues.push('circular_definition');

    // 5. Too long / encyclopedic definitions (>100 chars)
    if (def.length > 100) issues.push('long_definition');

    // 6. Example missing the word
    if (ex && !new RegExp(`\\b${escapedWord}`, 'i').test(ex)) issues.push('example_missing_word');

    // 7. POS mismatch
    if (w.partOfSpeech === 'noun' && def.toLowerCase().startsWith('to ')) issues.push('pos_mismatch');
    if (w.partOfSpeech === 'verb' && /^(a|an|the|one|any)\s/i.test(def)) issues.push('pos_mismatch');

    // 8. Empty definition
    if (!def || def.trim().length === 0) issues.push('empty_definition');

    // 9. Multiple semicolons (multi-sense dump)
    if ((def.match(/;/g) || []).length >= 3) issues.push('multi_sense_dump');

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
                difficulty: w.difficulty,
                issues,
            });
            for (const issue of issues) {
                issueCounts[issue] = (issueCounts[issue] || 0) + 1;
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
console.log(`\nFiles with issues: ${Object.keys(manifest).length}`);
console.log(`\nManifest written to: ${OUTPUT_PATH}`);

// Print per-file summary
console.log(`\nPer-file summary:`);
for (const [file, words] of Object.entries(manifest)) {
    console.log(`  ${file}: ${words.length} bad words`);
}
