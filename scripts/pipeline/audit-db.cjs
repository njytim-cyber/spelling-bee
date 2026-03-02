/**
 * audit-db.cjs — Quick audit of what's actually in the pipeline DB
 */
const path = require('path');
const Database = require('better-sqlite3');
const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');
const db = new Database(DB_PATH, { readonly: true });

// 1. Pronunciation data quality
console.log('=== PRONUNCIATION DATA ===');
const pronStats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN wikt_ipa IS NOT NULL AND wikt_ipa != '' THEN 1 ELSE 0 END) as has_ipa,
    SUM(CASE WHEN pronunciation IS NOT NULL AND pronunciation != '' AND pronunciation != UPPER(word) THEN 1 ELSE 0 END) as has_nonupper_pron,
    SUM(CASE WHEN pronunciation = UPPER(word) OR pronunciation IS NULL OR pronunciation = '' THEN 1 ELSE 0 END) as garbage_pron
  FROM words
  WHERE wikt_example IS NOT NULL AND wikt_example != '' AND enriched = 1
`).get();
console.log(pronStats);

// IPA samples
console.log('\nSample wikt_ipa values:');
const ipaSamples = db.prepare(`
  SELECT word, wikt_ipa, pronunciation
  FROM words
  WHERE wikt_ipa IS NOT NULL AND wikt_ipa != '' AND enriched = 1
  ORDER BY RANDOM() LIMIT 15
`).all();
for (const s of ipaSamples) {
  console.log(`  ${s.word}  IPA: ${s.wikt_ipa}  PRON: ${s.pronunciation}`);
}

// 2. Example sentence issues
console.log('\n=== EXAMPLE SENTENCE ISSUES ===');
const exStats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN wikt_example LIKE '%\n%' THEN 1 ELSE 0 END) as has_newlines,
    SUM(CASE WHEN wikt_example LIKE '%[…]%' OR wikt_example LIKE '%[...]%' THEN 1 ELSE 0 END) as has_brackets,
    SUM(CASE WHEN wikt_example LIKE '%thou %' OR wikt_example LIKE '%thee %' OR wikt_example LIKE '%thy %' OR wikt_example LIKE '%hath %' THEN 1 ELSE 0 END) as has_archaic
  FROM words
  WHERE wikt_example IS NOT NULL AND wikt_example != '' AND enriched = 1
`).get();
console.log(exStats);

// Newline samples
console.log('\nSample sentences WITH newlines:');
const nlSamples = db.prepare(`
  SELECT word, SUBSTR(wikt_example, 1, 120) as ex
  FROM words
  WHERE wikt_example LIKE '%\n%' AND enriched = 1
  ORDER BY RANDOM() LIMIT 5
`).all();
for (const s of nlSamples) {
  console.log(`  ${s.word}: ${JSON.stringify(s.ex)}`);
}

// 3. Etymology quality
console.log('\n=== ETYMOLOGY DATA ===');
const etymStats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN wikt_etymology IS NOT NULL AND wikt_etymology != '' THEN 1 ELSE 0 END) as has_etym,
    SUM(CASE WHEN wikt_etymology LIKE '%Proto-Indo-European%' THEN 1 ELSE 0 END) as has_pie,
    SUM(CASE WHEN wikt_etymology LIKE '%...%' THEN 1 ELSE 0 END) as truncated
  FROM words
  WHERE wikt_example IS NOT NULL AND wikt_example != '' AND enriched = 1
`).get();
console.log(etymStats);

// 4. Definition/example alignment — check for very short definitions
console.log('\n=== DEFINITION QUALITY ===');
const defStats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN LENGTH(wikt_definition) < 20 THEN 1 ELSE 0 END) as very_short,
    SUM(CASE WHEN LENGTH(wikt_definition) >= 20 AND LENGTH(wikt_definition) < 50 THEN 1 ELSE 0 END) as short,
    SUM(CASE WHEN LENGTH(wikt_definition) >= 50 THEN 1 ELSE 0 END) as good_length
  FROM words
  WHERE wikt_example IS NOT NULL AND wikt_example != '' AND enriched = 1
`).get();
console.log(defStats);

// 5. Theme distribution (from current enrichment)
console.log('\n=== THEME DISTRIBUTION ===');
const themes = db.prepare(`
  SELECT theme, COUNT(*) as cnt
  FROM words
  WHERE wikt_example IS NOT NULL AND wikt_example != '' AND enriched = 1
  GROUP BY theme ORDER BY cnt DESC LIMIT 10
`).all();
for (const t of themes) {
  console.log(`  ${t.theme}: ${t.cnt}`);
}

// 6. How many example sentences have multiple sentences (contain ". " mid-text)?
console.log('\n=== EXAMPLE SENTENCE LENGTH ===');
const lenStats = db.prepare(`
  SELECT
    SUM(CASE WHEN LENGTH(wikt_example) > 200 THEN 1 ELSE 0 END) as very_long,
    SUM(CASE WHEN LENGTH(wikt_example) BETWEEN 50 AND 200 THEN 1 ELSE 0 END) as medium,
    SUM(CASE WHEN LENGTH(wikt_example) < 50 THEN 1 ELSE 0 END) as short
  FROM words
  WHERE wikt_example IS NOT NULL AND wikt_example != '' AND enriched = 1
`).get();
console.log(lenStats);

// 7. Words that look archaic/obscure — check if word itself has unusual patterns
console.log('\n=== SAMPLE LOW-SENSE-COUNT WORDS (potentially obscure) ===');
const obscure = db.prepare(`
  SELECT word, sense_count, difficulty, tier, SUBSTR(wikt_definition, 1, 80) as def
  FROM words
  WHERE wikt_example IS NOT NULL AND wikt_example != '' AND enriched = 1
    AND sense_count = 1 AND tier <= 2
  ORDER BY RANDOM() LIMIT 10
`).all();
for (const o of obscure) {
  console.log(`  ${o.word} (senses: ${o.sense_count}, diff: ${o.difficulty}, tier: ${o.tier}): ${o.def}`);
}

db.close();
console.log('\nDone.');
