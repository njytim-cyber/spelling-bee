const fs = require('fs');
const path = require('path');

const TARGET = 'tier7-pipeline-c.ts';
const BATCHES = [172, 173, 174, 175, 176, 177, 178];

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'bad-words-manifest.json'), 'utf-8'));
const expected = new Set(manifest[TARGET].map(e => `${e.word}|${e.partOfSpeech}`));

const fixes = new Set();
let total = 0;
for (const b of BATCHES) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, `opus-fixes-batch${b}.json`), 'utf-8'));
  for (const f of data.fixes) {
    fixes.add(`${f.word}|${f.partOfSpeech}`);
    total++;
  }
}

const missing = [...expected].filter(k => !fixes.has(k));
const extras = [...fixes].filter(k => !expected.has(k));
const dupes = total - fixes.size;

console.log(`Expected: ${expected.size}`);
console.log(`Fixes: ${total} (${fixes.size} unique)`);
console.log(`Missing: ${missing.length}`);
if (missing.length > 0) console.log(missing.join('\n'));
console.log(`Extras: ${extras.length}`);
if (extras.length > 0) console.log(extras.join('\n'));
console.log(`Dupes: ${dupes}`);
console.log(missing.length === 0 && extras.length === 0 ? 'PASS' : 'FAIL');
