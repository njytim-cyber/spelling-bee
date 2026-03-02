/**
 * export-words.cjs
 *
 * Exports enriched words from SQLite into JSON files and TypeScript modules
 * for the app to consume. Generates per-tier chunks with lazy-loading support.
 *
 * Usage: node scripts/pipeline/export-words.cjs [--tier=N] [--format=json|ts] [--min-quality=N]
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');
const OUT_DIR = path.join(__dirname, '..', 'output', 'export');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Build a SpellingWord-compatible object from a DB row.
 * Uses API data when available, falls back to WordNet.
 */
function toSpellingWord(row) {
    // Prefer API definition over WordNet (usually more natural language)
    const definition = row.api_definition || row.definition || '';
    const example = row.api_example || row.example || '';
    const distractors = row.distractors ? JSON.parse(row.distractors) : [];

    // Build example sentence if we don't have one
    let exampleSentence = example;
    if (!exampleSentence) {
        // Fallback: generate a generic but usable example
        exampleSentence = `The spelling bee contestant was asked to spell "${row.word}."`;
    }

    return {
        word: row.word,
        definition: cleanDefinition(definition),
        exampleSentence,
        partOfSpeech: row.pos || 'noun',
        difficulty: row.difficulty,
        pattern: row.pattern || 'irregular',
        pronunciation: row.pronunciation || row.word.toUpperCase(),
        etymology: row.etymology || undefined,
        distractors,
        theme: row.theme || 'everyday',
    };
}

/** Clean up definition text for kid-friendliness */
function cleanDefinition(def) {
    if (!def) return '';
    // Remove parenthetical cross-references
    let cleaned = def.replace(/\(see also[^)]*\)/gi, '').trim();
    // Capitalize first letter
    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    // Ensure ends with period
    if (cleaned && !cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
        cleaned += '.';
    }
    return cleaned;
}

/** Quality score: how complete is this word entry? */
function qualityScore(row) {
    let score = 0;
    if (row.definition) score += 2;
    if (row.api_definition) score += 3; // API def is higher quality
    if (row.example || row.api_example) score += 2;
    if (row.pronunciation && row.pronunciation !== row.word.toUpperCase()) score += 2;
    if (row.etymology) score += 1;
    if (row.distractors) {
        const d = JSON.parse(row.distractors);
        if (d.length >= 3) score += 2;
        // Check distractors aren't same as word
        if (d.every(x => x !== row.word)) score += 1;
    }
    if (row.theme && row.theme !== 'everyday') score += 1;
    return score; // Max: 14
}

function main() {
    const args = process.argv.slice(2);
    const tierArg = args.find(a => a.startsWith('--tier='));
    const formatArg = args.find(a => a.startsWith('--format='));
    const minQualityArg = args.find(a => a.startsWith('--min-quality='));
    const statsOnly = args.includes('--stats');

    const tier = tierArg ? parseInt(tierArg.split('=')[1]) : null;
    const format = formatArg ? formatArg.split('=')[1] : 'json';
    const minQuality = minQualityArg ? parseInt(minQualityArg.split('=')[1]) : 5;

    if (!fs.existsSync(DB_PATH)) {
        console.error('Database not found. Run import-wordnet.cjs and enrich-batch.cjs first.');
        process.exit(1);
    }

    const db = new Database(DB_PATH, { readonly: true });

    // Stats mode: just show what we have
    if (statsOnly) {
        const stats = db.prepare(`
            SELECT
                tier,
                COUNT(*) as total,
                SUM(CASE WHEN enriched = 1 THEN 1 ELSE 0 END) as enriched,
                SUM(CASE WHEN api_definition IS NOT NULL THEN 1 ELSE 0 END) as has_api_def,
                SUM(CASE WHEN api_example IS NOT NULL THEN 1 ELSE 0 END) as has_api_example,
                SUM(CASE WHEN etymology IS NOT NULL THEN 1 ELSE 0 END) as has_etymology,
                AVG(difficulty) as avg_difficulty,
                MIN(LENGTH(word)) as min_len,
                MAX(LENGTH(word)) as max_len,
                AVG(LENGTH(word)) as avg_len
            FROM words
            GROUP BY tier
            ORDER BY tier
        `).all();

        console.log('-- Database Stats ----------------------------------------');
        console.log('Tier | Total | Enriched | API Def | API Ex | Etym | Avg Diff | Avg Len');
        console.log('-----|-------|----------|---------|--------|------|----------|--------');
        for (const s of stats) {
            console.log(
                `  ${s.tier}  | ${String(s.total).padStart(5)} | ${String(s.enriched).padStart(8)} | ` +
                `${String(s.has_api_def).padStart(7)} | ${String(s.has_api_example).padStart(6)} | ` +
                `${String(s.has_etymology).padStart(4)} | ${s.avg_difficulty?.toFixed(1).padStart(8)} | ${s.avg_len?.toFixed(1).padStart(6)}`,
            );
        }

        const total = db.prepare('SELECT COUNT(*) as cnt FROM words').get();
        const enriched = db.prepare('SELECT COUNT(*) as cnt FROM words WHERE enriched = 1').get();
        const unique = db.prepare('SELECT COUNT(DISTINCT word) as cnt FROM words').get();
        console.log(`\nTotal: ${total.cnt} entries, ${unique.cnt} unique words, ${enriched.cnt} enriched`);

        db.close();
        return;
    }

    ensureDir(OUT_DIR);

    // Load existing words for dedup
    const existingFile = path.join(__dirname, '..', '..', 'existing-words.txt');
    const existingWords = new Set(
        fs.existsSync(existingFile)
            ? fs.readFileSync(existingFile, 'utf8').trim().split('\n').map(w => w.trim().toLowerCase())
            : [],
    );

    // Query enriched words
    let whereClause = 'WHERE enriched = 1';
    const params = [];
    if (tier) {
        whereClause += ' AND tier = ?';
        params.push(tier);
    }

    const rows = db.prepare(`
        SELECT * FROM words
        ${whereClause}
        ORDER BY tier, difficulty, word
    `).all(...params);

    console.log(`Found ${rows.length} enriched words`);

    // Filter by quality and dedup
    const filtered = rows
        .filter(r => !existingWords.has(r.word.toLowerCase()))
        .filter(r => qualityScore(r) >= minQuality);

    console.log(`After quality filter (min=${minQuality}): ${filtered.length} words`);
    console.log(`After dedup with existing: ${filtered.length} words`);

    // Group by tier
    const byTier = {};
    for (const row of filtered) {
        const t = row.tier || 5;
        if (!byTier[t]) byTier[t] = [];
        byTier[t].push(row);
    }

    // Export
    for (const [t, words] of Object.entries(byTier)) {
        const spellingWords = words.map(toSpellingWord);
        const filename = `tier${t}-pipeline`;

        if (format === 'json') {
            const jsonPath = path.join(OUT_DIR, `${filename}.json`);
            fs.writeFileSync(jsonPath, JSON.stringify(spellingWords, null, 2));
            console.log(`  Tier ${t}: ${spellingWords.length} words -> ${jsonPath}`);
        } else if (format === 'ts') {
            const varName = `TIER_${t}_PIPELINE_WORDS`;
            const tsContent = `/**
 * words/tier${t}-pipeline.ts
 *
 * Auto-generated from WordNet 3.1 + Free Dictionary API enrichment pipeline.
 * ${spellingWords.length} words at difficulty tier ${t}.
 *
 * Sources:
 * - WordNet 3.1 (Princeton University, BSD license)
 * - Free Dictionary API (Wiktionary, CC-BY-SA 3.0)
 */
import type { SpellingWord } from './types';

export const ${varName}: SpellingWord[] = ${JSON.stringify(spellingWords, null, 4)};
`;
            const tsPath = path.join(OUT_DIR, `${filename}.ts`);
            fs.writeFileSync(tsPath, tsContent);
            console.log(`  Tier ${t}: ${spellingWords.length} words -> ${tsPath}`);
        }
    }

    // Summary
    const totalExported = filtered.length;
    console.log(`\n-- Export Complete ----------------------------------------`);
    console.log(`Total exported: ${totalExported} words`);
    console.log(`Format: ${format}`);
    console.log(`Output: ${OUT_DIR}`);

    db.close();
}

main();
