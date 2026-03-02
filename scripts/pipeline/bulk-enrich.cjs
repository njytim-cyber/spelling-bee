/**
 * bulk-enrich.cjs
 *
 * Fast bulk enrichment: generates distractors for ALL words in the DB
 * without API calls. API enrichment is done separately in targeted batches.
 *
 * Usage: node scripts/pipeline/bulk-enrich.cjs
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');

/** Generate plausible misspelling distractors */
function generateDistractors(word) {
    const distractors = new Set();
    const w = word.toLowerCase();

    // Strategy 1: Swap adjacent characters
    for (let i = 0; i < w.length - 1 && distractors.size < 4; i++) {
        const swapped = w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
        if (swapped !== w) distractors.add(swapped);
    }

    // Strategy 2: Double a consonant
    const consonants = 'bcdfghjklmnpqrstvwxyz';
    for (let i = 0; i < w.length && distractors.size < 5; i++) {
        if (consonants.includes(w[i]) && w[i] !== w[i + 1]) {
            distractors.add(w.slice(0, i) + w[i] + w.slice(i));
        }
    }

    // Strategy 3: Replace vowel with similar vowel
    const vowelSwaps = { a: 'e', e: 'i', i: 'e', o: 'u', u: 'o' };
    for (let i = 0; i < w.length && distractors.size < 6; i++) {
        if (vowelSwaps[w[i]]) {
            const replaced = w.slice(0, i) + vowelSwaps[w[i]] + w.slice(i + 1);
            if (replaced !== w) distractors.add(replaced);
        }
    }

    // Strategy 4: Common suffix confusions
    const suffixSwaps = [
        [/ence$/, 'ance'], [/ance$/, 'ence'],
        [/ible$/, 'able'], [/able$/, 'ible'],
        [/tion$/, 'sion'], [/sion$/, 'tion'],
        [/ous$/, 'ious'], [/ious$/, 'ous'],
        [/er$/, 'or'], [/or$/, 'er'],
        [/ey$/, 'ie'], [/ie$/, 'ey'],
    ];
    for (const [pattern, replacement] of suffixSwaps) {
        if (distractors.size >= 6) break;
        if (pattern.test(w)) {
            distractors.add(w.replace(pattern, replacement));
        }
    }

    // Filter: remove the correct word, take top 3
    const result = [...distractors].filter(d => d !== w).slice(0, 3);

    // Ensure we have at least 3 with safe fallbacks
    let attempts = 0;
    while (result.length < 3 && attempts < 20) {
        attempts++;
        if (w.length > 2) {
            const idx = Math.floor(Math.random() * (w.length - 2)) + 1;
            const dropped = w.slice(0, idx) + w.slice(idx + 1);
            if (dropped !== w && !result.includes(dropped)) {
                result.push(dropped);
            }
        } else {
            // For very short words, add a letter
            const extra = w + 'e';
            if (!result.includes(extra)) result.push(extra);
            else result.push(w + 'a');
        }
    }

    return result;
}

function main() {
    if (!fs.existsSync(DB_PATH)) {
        console.error('Database not found. Run import-wordnet.cjs first.');
        process.exit(1);
    }

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = OFF');

    // Get all unenriched words
    const unenriched = db.prepare(`
        SELECT id, word FROM words WHERE enriched = 0
    `).all();

    console.log(`Generating distractors for ${unenriched.length} words...`);

    const update = db.prepare(`
        UPDATE words SET distractors = ?, pronunciation = ?, enriched = 1
        WHERE id = ?
    `);

    const batchSize = 5000;
    let processed = 0;

    for (let i = 0; i < unenriched.length; i += batchSize) {
        const batch = unenriched.slice(i, i + batchSize);

        const runBatch = db.transaction(() => {
            for (const row of batch) {
                const distractors = generateDistractors(row.word);
                const pronunciation = row.word.toUpperCase(); // placeholder
                update.run(JSON.stringify(distractors), pronunciation, row.id);
            }
        });

        runBatch();
        processed += batch.length;
        console.log(`  ${processed}/${unenriched.length} done`);
    }

    // Stats
    const stats = db.prepare(`
        SELECT tier, COUNT(*) as total,
               SUM(CASE WHEN enriched = 1 THEN 1 ELSE 0 END) as enriched
        FROM words GROUP BY tier ORDER BY tier
    `).all();

    console.log('\n-- Bulk Enrichment Complete --');
    for (const s of stats) {
        console.log(`  Tier ${s.tier}: ${s.enriched}/${s.total} enriched`);
    }

    const total = db.prepare('SELECT COUNT(*) as cnt FROM words WHERE enriched = 1').get();
    console.log(`Total enriched: ${total.cnt}`);

    db.close();
}

main();
