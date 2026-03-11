/**
 * apply-meta-fixes.cjs — Replace "Can you use the word X in a sentence?" with real examples
 *
 * Usage: node scripts/pipeline/apply-meta-fixes.cjs <fixes-json> [--dry-run]
 * Example: node scripts/pipeline/apply-meta-fixes.cjs scripts/pipeline/meta-fixes-tier1.json
 */
const fs = require('fs');
const path = require('path');

const fixesPath = process.argv[2];
if (!fixesPath) {
    console.error('Usage: node apply-meta-fixes.cjs <fixes-json> [--dry-run]');
    process.exit(1);
}
const DRY_RUN = process.argv.includes('--dry-run');
const fixes = JSON.parse(fs.readFileSync(fixesPath, 'utf-8'));
const META_RE = /^Can you use the word \w+ in a sentence\?$/i;

const WORDS_DIR = path.join(__dirname, '..', '..', 'src', 'domains', 'spelling', 'words');
const files = fs.readdirSync(WORDS_DIR)
    .filter(f => /^tier\d+.*pipeline.*\.ts$/.test(f) && !f.match(/^tier\d+-pipeline\.ts$/))
    .sort();

let applied = 0;
let notFound = 0;
const matched = new Set();

for (const f of files) {
    const filePath = path.join(WORDS_DIR, f);
    const src = fs.readFileSync(filePath, 'utf-8');
    const assignMatch = src.match(/SpellingWord\[\]\s*=\s*/);
    if (!assignMatch) continue;
    const prefix = src.slice(0, assignMatch.index + assignMatch[0].length);
    let arrayContent = src.slice(assignMatch.index + assignMatch[0].length).trimEnd();
    if (arrayContent.endsWith(';')) arrayContent = arrayContent.slice(0, -1);

    let words;
    try { words = JSON.parse(arrayContent); } catch(e) { continue; }

    let fileChanged = false;
    for (const w of words) {
        const word = w.word.toLowerCase();
        if (fixes[word] && META_RE.test(w.exampleSentence || '')) {
            if (!DRY_RUN) {
                w.exampleSentence = fixes[word];
            }
            console.log(`  FIXED: "${w.word}" in ${f}`);
            applied++;
            matched.add(word);
            fileChanged = true;
        }
    }

    if (fileChanged && !DRY_RUN) {
        const output = prefix + JSON.stringify(words, null, 4) + ';\n';
        fs.writeFileSync(filePath, output);
    }
}

// Check for words in fixes that weren't found
for (const word of Object.keys(fixes)) {
    if (!matched.has(word.toLowerCase())) {
        console.log(`  NOT FOUND: "${word}" — no meta template match`);
        notFound++;
    }
}

console.log(`\n${DRY_RUN ? 'DRY RUN' : 'APPLIED'}: ${applied} fixed, ${notFound} not found`);
