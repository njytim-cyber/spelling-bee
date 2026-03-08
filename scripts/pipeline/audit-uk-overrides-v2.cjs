/**
 * audit-uk-overrides-v2.cjs
 *
 * Refined audit: for UK spellings not in Wiktionary, also check if the US
 * key is in Wiktionary. If NEITHER form exists, the word is likely too
 * obscure or non-standard to include.
 *
 * Also checks distractors more carefully.
 *
 * Usage: node scripts/pipeline/audit-uk-overrides-v2.cjs
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');
const OVERRIDES_PATH = path.join(__dirname, '../../src/domains/spelling/words/uk-overrides.ts');

const db = new Database(DB_PATH, { readonly: true });

const allDbWords = new Set();
for (const r of db.prepare('SELECT DISTINCT LOWER(word) as w FROM words').all()) {
    allDbWords.add(r.w);
}

// Load word bank
const wordsDir = path.join(__dirname, '../../src/domains/spelling/words');
const wordBankWords = new Set();
const tierFiles = fs.readdirSync(wordsDir).filter(f =>
    f.match(/^tier\d+(-pipeline-[a-z])?\.ts$/) && !f.match(/^tier\d+-pipeline\.ts$/)
);
for (const f of tierFiles) {
    const content = fs.readFileSync(path.join(wordsDir, f), 'utf8');
    for (const m of content.matchAll(/"word":\s*"([^"]+)"/g)) wordBankWords.add(m[1].toLowerCase());
    for (const m of content.matchAll(/\bword:\s*'([^']+)'/g)) wordBankWords.add(m[1].toLowerCase());
}

// Parse overrides
const ukContent = fs.readFileSync(OVERRIDES_PATH, 'utf8');
const overrides = {};
const entryRegex = /'([a-z]+)':\s*\{([^}]+)\}/g;
let match;
while ((match = entryRegex.exec(ukContent)) !== null) {
    const usKey = match[1];
    const body = match[2];
    const wordMatch = body.match(/word:\s*'([^']+)'/);
    const distMatch = body.match(/distractors:\s*\[([^\]]+)\]/);
    if (wordMatch) {
        const distractors = distMatch
            ? distMatch[1].match(/'([^']+)'/g)?.map(d => d.replace(/'/g, '')) || []
            : [];
        overrides[usKey] = { word: wordMatch[1], distractors };
    }
}

console.log(`DB words: ${allDbWords.size} | Word bank: ${wordBankWords.size} | Overrides: ${Object.keys(overrides).length}\n`);

// ── Category 1: NEITHER US nor UK in Wiktionary ────────────────────────
console.log('='.repeat(70));
console.log('NEITHER US key NOR UK form in Wiktionary (most suspicious)');
console.log('='.repeat(70));
const neitherInDb = [];
const onlyUsInDb = [];

for (const [usKey, entry] of Object.entries(overrides)) {
    const usInDb = allDbWords.has(usKey);
    const ukInDb = allDbWords.has(entry.word);

    if (!usInDb && !ukInDb) {
        neitherInDb.push({ usKey, ukWord: entry.word });
    } else if (usInDb && !ukInDb) {
        onlyUsInDb.push({ usKey, ukWord: entry.word });
    }
}

for (const { usKey, ukWord } of neitherInDb.sort((a, b) => a.usKey.localeCompare(b.usKey))) {
    const inBank = wordBankWords.has(usKey) ? '' : ' [NOT IN WORD BANK EITHER]';
    console.log(`  ${usKey} -> ${ukWord}${inBank}`);
}
console.log(`  Count: ${neitherInDb.length}\n`);

console.log('='.repeat(70));
console.log('US key in Wiktionary but UK form is NOT (usually inflected forms - lower risk)');
console.log('='.repeat(70));
for (const { usKey, ukWord } of onlyUsInDb.sort((a, b) => a.usKey.localeCompare(b.usKey))) {
    console.log(`  ${usKey} -> ${ukWord}`);
}
console.log(`  Count: ${onlyUsInDb.length}\n`);

// ── Category 2: Real-word distractors ───────────────────────────────────
console.log('='.repeat(70));
console.log('Distractor is a REAL English word in Wiktionary');
console.log('='.repeat(70));
let distIssues = 0;
for (const [usKey, entry] of Object.entries(overrides)) {
    for (const d of entry.distractors) {
        if (allDbWords.has(d)) {
            console.log(`  ${usKey} -> ${entry.word}: distractor "${d}" is a real word`);
            distIssues++;
        }
    }
}
console.log(`  Count: ${distIssues}\n`);

// ── Category 3: False friend check ──────────────────────────────────────
console.log('='.repeat(70));
console.log('Possible false friends (word ends with seize/prize/capsize root)');
console.log('='.repeat(70));
const trueRoots = ['capsize', 'seize', 'prize'];
let ffCount = 0;
for (const [usKey, entry] of Object.entries(overrides)) {
    for (const root of trueRoots) {
        if (usKey === root || usKey.endsWith(root)) {
            console.log(`  ${usKey} -> ${entry.word} (ends with "${root}")`);
            ffCount++;
        }
    }
}
if (ffCount === 0) console.log('  None found');
console.log(`  Count: ${ffCount}\n`);

// ── Summary ─────────────────────────────────────────────────────────────
console.log('_'.repeat(70));
console.log(`Neither in Wiktionary: ${neitherInDb.length}`);
console.log(`US-only in Wiktionary: ${onlyUsInDb.length}`);
console.log(`Real-word distractors: ${distIssues}`);
console.log(`Possible false friends: ${ffCount}`);

db.close();
