/**
 * spot-check-examples.cjs
 *
 * Shows what examples would be swapped by the DB fixer.
 * Run: node scripts/pipeline/spot-check-examples.cjs [--file=tier1-pipeline-a.ts] [--count=20]
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const WORDS_DIR = path.join(__dirname, '..', '..', 'src', 'domains', 'spelling', 'words');
const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');
const MANIFEST_PATH = path.join(__dirname, 'bad-words-manifest.json');

const args = process.argv.slice(2);
const fileFilter = args.find(a => a.startsWith('--file='))?.split('=')[1] || 'tier1-pipeline-a.ts';
const maxCount = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1] || '20');

function cleanExample(text) {
    if (!text) return null;
    let s = text.trim();
    if (s.includes('\n')) { s = s.split('\n')[0].trim(); if (!s || s.length < 20) return null; }
    if (/\b(thou|thee|thy|thine|hath|doth|dost|shalt|wilt|wouldst|shouldst|canst|didst)\b/i.test(s)) return null;
    if (/\b(whence|thence|hither|thither|whilst|betwixt|forsooth|prithee|methinks|wherefore)\b/i.test(s)) return null;
    if (/ſ/.test(s)) return null;
    if (/\bain't\b/i.test(s)) return null;
    if (/^\s*…/.test(s) || /^\s*\.\.\./.test(s)) return null;
    if (/…\s*$/.test(s) || /\.\.\.\s*$/.test(s)) return null;
    s = s.replace(/\[…\]/g, '…').replace(/\[\.\.\.\]/g, '…');
    s = s.replace(/\[[A-Z]\]/g, '').replace(/\[sic\]/gi, '');
    s = s.replace(/\[(\w+)\]/g, '$1');
    if (/\[/.test(s) && /\]/.test(s)) return null;
    s = s.replace(/^\d{4},?\s+[^,]+,\s+[^,\n]+[,\n]\s*/i, '');
    if (/^(Near-synonyms?|Synonyms?|Antonyms?|Thesaurus):/i.test(s)) return null;
    s = s.trim();
    if (s.length < 10 || s.length > 250) return null;
    if (/[†‡§¶]/.test(s)) return null;
    if (/\b\d+:\d+\b/.test(s)) return null;
    if (/\b1[0-8]\d{2}\b/.test(s)) return null;
    if (/^"[^"]*$/.test(s)) return null;
    if (s.split(/\s+/).length < 4) return null;
    if (/\b'Twas\b|\bpossess'd\b/i.test(s)) return null;
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!/[.!?;:"']$/.test(s)) s += '.';
    s = s.replace(/\s{2,}/g, ' ');
    return s;
}

function scoreExample(word, example) {
    if (!example) return -1000;
    let score = 0;
    const escapedWord = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`\\b${escapedWord}`, 'i').test(example)) score -= 100;
    else score += 30;
    if (/took a while to learn|vocabulary words|wrote the word .* on the board|had an entire chapter about|admired the .* pattern on the quilt|taught us how to .* properly|discussed the .* during the science|was our spelling word/i.test(example)) score -= 200;
    if (example.length >= 30 && example.length <= 150) score += 15;
    else if (example.length < 15) score -= 50;
    return score;
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
const db = new Database(DB_PATH, { readonly: true });

const badWords = manifest[fileFilter];
if (!badWords) { console.error(`No bad words for ${fileFilter}`); process.exit(1); }

// Only show words where the EXAMPLE would change
let shown = 0;
for (const bw of badWords) {
    if (shown >= maxCount) break;

    const rows = db.prepare(
        'SELECT pos, wikt_example, api_example FROM words WHERE word = ? AND enriched = 1'
    ).all(bw.word);

    let bestEx = bw.exampleSentence || '';
    let bestScore = scoreExample(bw.word, bestEx);
    let newEx = null;

    for (const row of rows) {
        for (const rawEx of [row.wikt_example, row.api_example].filter(Boolean)) {
            const cleaned = cleanExample(rawEx);
            if (!cleaned) continue;
            const score = scoreExample(bw.word, cleaned);
            if (score > bestScore) {
                bestScore = score;
                newEx = cleaned;
            }
        }
    }

    if (newEx && newEx !== bestEx) {
        shown++;
        console.log(`${shown}. ${bw.word} (${bw.partOfSpeech})`);
        console.log(`   OLD EX: ${bw.exampleSentence || '(none)'}`);
        console.log(`   NEW EX: ${newEx}`);
        console.log();
    }
}

console.log(`Showed ${shown} example fixes from ${badWords.length} bad words`);
db.close();
