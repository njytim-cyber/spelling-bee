#!/usr/bin/env node
// Extract current definitions for bad words from a pipeline file
const fs = require('fs');
const path = require('path');

const TARGET = 'tier9-pipeline-e.ts';
const manifestPath = path.join(__dirname, 'bad-words-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const entries = manifest[TARGET];
if (!entries) { console.error('No entries for', TARGET); process.exit(1); }

const filePath = path.join(__dirname, '../../src/domains/spelling/words', TARGET);
const src = fs.readFileSync(filePath, 'utf-8');

// Parse the array from the TS file (handle trailing commas)
// Skip the SpellingWord[] = part, find the opening [ that starts the data
const marker = '= [';
const startIdx = src.indexOf(marker) + 2; // points to the [
const endIdx = src.lastIndexOf(']') + 1;
let jsonStr = src.slice(startIdx, endIdx);
// Remove trailing commas before ] or }
jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
const words = JSON.parse(jsonStr);

// Build lookup
const lookup = new Map();
for (const w of words) {
  lookup.set(`${w.word}|${w.partOfSpeech}`, w);
}

// Output bad words with current defs
const output = [];
for (const entry of entries) {
  const key = `${entry.word}|${entry.partOfSpeech}`;
  const w = lookup.get(key);
  if (w) {
    output.push({
      word: entry.word,
      partOfSpeech: entry.partOfSpeech,
      issues: entry.issues,
      currentDef: w.definition,
      currentExample: w.exampleSentence
    });
  } else {
    output.push({
      word: entry.word,
      partOfSpeech: entry.partOfSpeech,
      issues: entry.issues,
      currentDef: 'NOT FOUND',
      currentExample: 'NOT FOUND'
    });
  }
}

fs.writeFileSync(
  path.join(__dirname, 'tier9e-current-defs.json'),
  JSON.stringify(output, null, 2)
);
console.log(`Extracted ${output.length} entries`);
