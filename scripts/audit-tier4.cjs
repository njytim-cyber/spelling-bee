const fs = require('fs');

// Read both files
const fileA = fs.readFileSync('src/domains/spelling/words/tier4-pipeline-a.ts', 'utf8');
const fileB = fs.readFileSync('src/domains/spelling/words/tier4-pipeline-b.ts', 'utf8');

// Simple JSON parsing approach - extract the array content
function extractWordsSimple(content, varName) {
  const startMarker = `export const ${varName}: SpellingWord[] = [`;
  const start = content.indexOf(startMarker);
  if (start === -1) return [];

  const arrayStart = start + startMarker.length - 1;
  let depth = 0;
  let arrayEnd = arrayStart;

  for (let i = arrayStart; i < content.length; i++) {
    if (content[i] === '[') depth++;
    if (content[i] === ']') {
      depth--;
      if (depth === 0) {
        arrayEnd = i + 1;
        break;
      }
    }
  }

  const arrayStr = content.substring(arrayStart, arrayEnd);
  try {
    return JSON.parse(arrayStr);
  } catch (e) {
    console.error('Parse error:', e.message);
    return [];
  }
}

const wordsA = extractWordsSimple(fileA, 'TIER_4_PIPELINE_A_WORDS');
const wordsB = extractWordsSimple(fileB, 'TIER_4_PIPELINE_B_WORDS');
const allWords = [...wordsA, ...wordsB];

console.log('=== TIER 4 PIPELINE WORD BANK QUALITY AUDIT ===\n');
console.log(`Total words: ${allWords.length}`);
console.log(`File A: ${wordsA.length}`);
console.log(`File B: ${wordsB.length}\n`);

// === 1. PRONUNCIATION QUALITY ===
console.log('--- 1. PRONUNCIATION QUALITY ---');

const allCaps = allWords.filter(w => w.pronunciation === w.word.toUpperCase());
const hasIPA = allWords.filter(w => /[ɪəɛæɑɔʊʌɜɚθðʃʒŋˈˌːɾ]/.test(w.pronunciation));
const excessiveVowels = allWords.filter(w => /[aeiou]{5,}/i.test(w.pronunciation));
const veryLong = allWords.filter(w => w.pronunciation.length > 40);
const hasEllipsis = allWords.filter(w => w.pronunciation.includes('...'));
const hasProtoLang = allWords.filter(w => w.pronunciation.includes('Proto-'));

console.log(`ALL CAPS (word repeated): ${allCaps.length} (${(allCaps.length/allWords.length*100).toFixed(1)}%)`);
console.log(`Contains IPA symbols: ${hasIPA.length} (${(hasIPA.length/allWords.length*100).toFixed(1)}%)`);
console.log(`Excessive vowels (5+ in row): ${excessiveVowels.length} (${(excessiveVowels.length/allWords.length*100).toFixed(1)}%)`);
console.log(`Very long (>40 chars): ${veryLong.length} (${(veryLong.length/allWords.length*100).toFixed(1)}%)`);
console.log(`Contains ellipsis: ${hasEllipsis.length}`);
console.log(`Contains "Proto-": ${hasProtoLang.length}\n`);

console.log('Sample ALL CAPS pronunciations:');
allCaps.slice(0, 8).forEach(w => console.log(`  ${w.word} → ${w.pronunciation}`));

console.log('\nSample IPA mixed pronunciations:');
hasIPA.slice(0, 8).forEach(w => console.log(`  ${w.word} → ${w.pronunciation}`));

console.log('\nSample excessive vowel pronunciations:');
excessiveVowels.slice(0, 8).forEach(w => console.log(`  ${w.word} → ${w.pronunciation}`));

// === 2. EXAMPLE SENTENCE QUALITY ===
console.log('\n--- 2. EXAMPLE SENTENCE QUALITY ---');

const hasNewline = allWords.filter(w => w.exampleSentence.includes('\n') || w.exampleSentence.includes('\\n'));
const hasBrackets = allWords.filter(w => /[\[\]…]/.test(w.exampleSentence));
const veryLongSentence = allWords.filter(w => w.exampleSentence.length > 200);
const hasQuoteMarks = allWords.filter(w => /".*"/.test(w.exampleSentence));

console.log(`Contains newlines: ${hasNewline.length} (${(hasNewline.length/allWords.length*100).toFixed(1)}%)`);
console.log(`Contains brackets/ellipsis: ${hasBrackets.length} (${(hasBrackets.length/allWords.length*100).toFixed(1)}%)`);
console.log(`Very long (>200 chars): ${veryLongSentence.length} (${(veryLongSentence.length/allWords.length*100).toFixed(1)}%)`);
console.log(`Contains quote marks: ${hasQuoteMarks.length} (${(hasQuoteMarks.length/allWords.length*100).toFixed(1)}%)\n`);

console.log('Sample newline examples:');
hasNewline.slice(0, 5).forEach(w => {
  const preview = w.exampleSentence.substring(0, 100).replace(/\n/g, '\\n');
  console.log(`  ${w.word}: ${preview}...`);
});

console.log('\nSample bracket examples:');
hasBrackets.slice(0, 5).forEach(w => {
  const preview = w.exampleSentence.substring(0, 100);
  console.log(`  ${w.word}: ${preview}...`);
});

// === 3. ETYMOLOGY QUALITY ===
console.log('\n--- 3. ETYMOLOGY QUALITY ---');

const etymEllipsis = allWords.filter(w => w.etymology && w.etymology.includes('...'));
const etymVeryLong = allWords.filter(w => w.etymology && w.etymology.length > 200);
const etymProtoChain = allWords.filter(w => w.etymology && (w.etymology.match(/Proto-/g) || []).length > 3);
const etymMissing = allWords.filter(w => !w.etymology || w.etymology.trim() === '');

console.log(`Contains ellipsis: ${etymEllipsis.length} (${(etymEllipsis.length/allWords.length*100).toFixed(1)}%)`);
console.log(`Very long (>200 chars): ${etymVeryLong.length} (${(etymVeryLong.length/allWords.length*100).toFixed(1)}%)`);
console.log(`Proto-chain (>3 mentions): ${etymProtoChain.length} (${(etymProtoChain.length/allWords.length*100).toFixed(1)}%)`);
console.log(`Missing etymology: ${etymMissing.length} (${(etymMissing.length/allWords.length*100).toFixed(1)}%)\n`);

console.log('Sample proto-chain etymologies:');
etymProtoChain.slice(0, 5).forEach(w => {
  const preview = w.etymology.substring(0, 120);
  console.log(`  ${w.word}: ${preview}...`);
});

// === 4. DEFINITION QUALITY ===
console.log('\n--- 4. DEFINITION QUALITY ---');

const defVeryShort = allWords.filter(w => w.definition.length < 20);
const defVeryLong = allWords.filter(w => w.definition.length > 150);

console.log(`Very short (<20 chars): ${defVeryShort.length} (${(defVeryShort.length/allWords.length*100).toFixed(1)}%)`);
console.log(`Very long (>150 chars): ${defVeryLong.length} (${(defVeryLong.length/allWords.length*100).toFixed(1)}%)\n`);

console.log('Sample very short definitions:');
defVeryShort.slice(0, 8).forEach(w => console.log(`  ${w.word}: ${w.definition}`));

// === 5. THEME DISTRIBUTION ===
console.log('\n--- 5. THEME DISTRIBUTION ---');

const themes = {};
allWords.forEach(w => {
  themes[w.theme] = (themes[w.theme] || 0) + 1;
});

const sortedThemes = Object.entries(themes).sort((a, b) => b[1] - a[1]);

console.log('Top 15 themes:');
sortedThemes.slice(0, 15).forEach(([theme, count]) => {
  const pct = (count / allWords.length * 100).toFixed(1);
  console.log(`  ${theme.padEnd(20)} ${count.toString().padStart(5)} (${pct}%)`);
});

console.log(`\nTotal unique themes: ${sortedThemes.length}`);
console.log(`"everyday" theme: ${themes['everyday'] || 0} (${(themes['everyday']/allWords.length*100).toFixed(1)}%)`);

// === 6. DIFFICULTY DISTRIBUTION ===
console.log('\n--- 6. DIFFICULTY DISTRIBUTION ---');

const difficulties = {};
allWords.forEach(w => {
  difficulties[w.difficulty] = (difficulties[w.difficulty] || 0) + 1;
});

Object.keys(difficulties).sort().forEach(diff => {
  const count = difficulties[diff];
  const pct = (count / allWords.length * 100).toFixed(1);
  console.log(`  Difficulty ${diff}: ${count} (${pct}%)`);
});

// === 7. PATTERN DISTRIBUTION ===
console.log('\n--- 7. PATTERN DISTRIBUTION ---');

const patterns = {};
allWords.forEach(w => {
  patterns[w.pattern] = (patterns[w.pattern] || 0) + 1;
});

Object.entries(patterns).sort((a, b) => b[1] - a[1]).forEach(([pattern, count]) => {
  const pct = (count / allWords.length * 100).toFixed(1);
  console.log(`  ${pattern.padEnd(20)} ${count.toString().padStart(5)} (${pct}%)`);
});

// === SUMMARY ===
console.log('\n=== QUALITY SUMMARY ===\n');

const criticalIssues = allCaps.length + hasProtoLang.length + hasNewline.length + etymProtoChain.length;
const moderateIssues = hasIPA.length + excessiveVowels.length + hasBrackets.length + etymEllipsis.length;

console.log('CRITICAL ISSUES (unusable data):');
console.log(`  - ALL CAPS pronunciations: ${allCaps.length}`);
console.log(`  - Proto-lang in pronunciation: ${hasProtoLang.length}`);
console.log(`  - Newlines in examples: ${hasNewline.length}`);
console.log(`  - Proto-chain etymologies: ${etymProtoChain.length}`);
console.log(`  TOTAL CRITICAL: ${criticalIssues} words (${(criticalIssues/allWords.length*100).toFixed(1)}%)\n`);

console.log('MODERATE ISSUES (needs cleanup):');
console.log(`  - IPA mixed pronunciations: ${hasIPA.length}`);
console.log(`  - Excessive vowels: ${excessiveVowels.length}`);
console.log(`  - Brackets in examples: ${hasBrackets.length}`);
console.log(`  - Ellipsis in etymology: ${etymEllipsis.length}`);
console.log(`  TOTAL MODERATE: ${moderateIssues} words (${(moderateIssues/allWords.length*100).toFixed(1)}%)\n`);

const cleanWords = allWords.length - criticalIssues - moderateIssues;
const qualityPct = (cleanWords / allWords.length * 100).toFixed(1);

console.log(`CLEAN WORDS: ${cleanWords} (${qualityPct}%)`);
console.log(`\nOVERALL QUALITY RATING: ${qualityPct}%`);

// === DUPLICATE CHECK ===
console.log('\n--- 8. DUPLICATE CHECK ---');
const wordCounts = {};
allWords.forEach(w => {
  wordCounts[w.word] = (wordCounts[w.word] || 0) + 1;
});

const duplicates = Object.entries(wordCounts).filter(([word, count]) => count > 1);
console.log(`Duplicate words: ${duplicates.length}`);
if (duplicates.length > 0) {
  console.log('Duplicates found:');
  duplicates.forEach(([word, count]) => {
    console.log(`  ${word}: appears ${count} times`);
  });
}
