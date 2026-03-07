/**
 * apply-opus-fixes.cjs
 *
 * Applies Opus-written definition/example fixes from a JSON patch file
 * to the corresponding pipeline .ts chunk file.
 *
 * Usage: node scripts/pipeline/apply-opus-fixes.cjs <patch-file.json> [--dry-run]
 *
 * Patch file format: { "_meta": { "file": "tier1-pipeline-a.ts" }, "fixes": [...] }
 * Each fix: { "word": "...", "partOfSpeech": "...", "definition": "...", "exampleSentence": "..." }
 * Only provided fields are updated (you can fix just the definition or just the example).
 */

const fs = require('fs');
const path = require('path');

const WORDS_DIR = path.join(__dirname, '..', '..', 'src', 'domains', 'spelling', 'words');

const args = process.argv.slice(2);
const patchFile = args.find(a => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!patchFile) {
    console.error('Usage: node apply-opus-fixes.cjs <patch-file.json> [--dry-run]');
    process.exit(1);
}

const patch = JSON.parse(fs.readFileSync(patchFile, 'utf-8'));
const targetFile = patch._meta.file;
const fixes = patch.fixes;

console.log(`Applying ${fixes.length} fixes to ${targetFile}${dryRun ? ' [DRY RUN]' : ''}\n`);

// Parse the .ts file
const filePath = path.join(WORDS_DIR, targetFile);
const src = fs.readFileSync(filePath, 'utf-8');

const assignMatch = src.match(/SpellingWord\[\]\s*=\s*/);
if (!assignMatch) {
    console.error('Could not find array assignment in', targetFile);
    process.exit(1);
}
const arrayStart = assignMatch.index + assignMatch[0].length;
const header = src.slice(0, arrayStart);
let arrayContent = src.slice(arrayStart).trimEnd();
if (arrayContent.endsWith(';')) arrayContent = arrayContent.slice(0, -1);

const words = JSON.parse(arrayContent);

// Build lookup for fixes
const fixMap = new Map();
for (const fix of fixes) {
    const key = fix.word + '|' + fix.partOfSpeech;
    fixMap.set(key, fix);
}

// Apply fixes
let applied = 0;
let notFound = 0;
const appliedWords = new Set();

for (const wordObj of words) {
    const key = wordObj.word + '|' + wordObj.partOfSpeech;
    const fix = fixMap.get(key);
    if (!fix) continue;

    appliedWords.add(key);
    let changed = false;

    if (fix.definition && fix.definition !== wordObj.definition) {
        if (dryRun) {
            console.log(`${wordObj.word} (${wordObj.partOfSpeech}):`);
            console.log(`  DEF OLD: ${wordObj.definition}`);
            console.log(`  DEF NEW: ${fix.definition}`);
        }
        wordObj.definition = fix.definition;
        changed = true;
    }

    if (fix.exampleSentence && fix.exampleSentence !== wordObj.exampleSentence) {
        if (dryRun) {
            console.log(`${wordObj.word} (${wordObj.partOfSpeech}):`);
            console.log(`  EX OLD: ${wordObj.exampleSentence}`);
            console.log(`  EX NEW: ${fix.exampleSentence}`);
        }
        wordObj.exampleSentence = fix.exampleSentence;
        changed = true;
    }

    if (changed) applied++;
}

// Check for fixes that weren't found in the file
for (const fix of fixes) {
    const key = fix.word + '|' + fix.partOfSpeech;
    if (!appliedWords.has(key)) {
        console.log(`  WARNING: "${fix.word}" (${fix.partOfSpeech}) not found in ${targetFile}`);
        notFound++;
    }
}

if (!dryRun) {
    const content = header + JSON.stringify(words, null, 4) + ';\n';
    fs.writeFileSync(filePath, content);
}

console.log(`\nApplied: ${applied}, Not found: ${notFound}`);
