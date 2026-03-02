#!/usr/bin/env node
/**
 * Merges multiple profanity word lists into a single master list.
 * Sources:
 * - Google profanity words (962 entries)
 * - profane-words (2725 entries)
 * - dsojevic profanity list (434 entries with match patterns)
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;

// Google list
const google = fs.readFileSync(path.join(dir, 'google-profanity.txt'), 'utf8')
  .split('\n')
  .map(l => l.trim().toLowerCase())
  .filter(l => l.length > 0 && !l.includes(' '));

// Profane-words list
const profane = JSON.parse(fs.readFileSync(path.join(dir, 'profane-words.json'), 'utf8'))
  .map(w => w.toLowerCase().trim())
  .filter(w => w.length > 0 && !w.includes(' '));

// Dsojevic list — extract individual match words
const dsoj = JSON.parse(fs.readFileSync(path.join(dir, 'dsojevic-profanity.json'), 'utf8'));
const dWords = [];
for (const entry of dsoj) {
  const parts = entry.match.split('|')
    .map(p => p.trim().toLowerCase())
    .filter(p => p.length > 0 && !p.includes(' '));
  dWords.push(...parts);
}

// Merge all
const allWords = new Set([...google, ...profane, ...dWords]);

// Filter out l33tspeak / number substitutions (not relevant for dictionary words)
const filtered = [...allWords].filter(w => {
  // Must be at least 2 chars
  if (w.length < 2) return false;
  // Skip l33tspeak like "5h1t", "@$$", "a_s_s"
  if (/[0-9@_$]/.test(w)) return false;
  return true;
});

const sorted = filtered.sort();

console.log('Sources:');
console.log('  Google:', google.length);
console.log('  Profane-words:', profane.length);
console.log('  Dsojevic:', dWords.length);
console.log('Merged unique (single words, no l33t):', sorted.length);

fs.writeFileSync(path.join(dir, 'profanity-master.txt'), sorted.join('\n') + '\n');
console.log('Written to scripts/pipeline/profanity-master.txt');
