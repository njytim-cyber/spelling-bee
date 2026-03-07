const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('scripts/pipeline/tier9e-current-defs.json','utf8'));
const manifestWords = new Set(manifest.map(w => w.word + '|' + w.partOfSpeech));

const batches = [255,256,257,258,259,260,261];
const batchWords = new Set();
const allBatchEntries = [];
for (const b of batches) {
  const data = JSON.parse(fs.readFileSync('scripts/pipeline/opus-fixes-batch' + b + '.json','utf8'));
  for (const f of data.fixes) {
    const key = f.word + '|' + f.partOfSpeech;
    allBatchEntries.push({ batch: b, key });
    batchWords.add(key);
  }
}

// Check for duplicates
const seen = {};
const dupes = [];
for (const e of allBatchEntries) {
  if (seen[e.key]) dupes.push(e.key + ' in batch ' + seen[e.key] + ' AND ' + e.batch);
  else seen[e.key] = e.batch;
}

const missing = [];
for (const w of manifestWords) { if (!batchWords.has(w)) missing.push(w); }
const extras = [];
for (const w of batchWords) { if (!manifestWords.has(w)) extras.push(w); }

console.log('Batch words (unique):', batchWords.size);
console.log('Total entries:', allBatchEntries.length);
console.log('Duplicates:', dupes.length);
dupes.forEach(d => console.log('  DUP:', d));
console.log('Missing from batches:', missing.length);
missing.forEach(w => console.log('  MISS:', w));
console.log('Extra (not in manifest):', extras.length);
extras.forEach(w => console.log('  EXTRA:', w));
