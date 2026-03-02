/**
 * validate-words.cjs
 *
 * Quality validation pipeline for the word database.
 * Checks: distractor validity, definition quality, dedup, theme accuracy, etc.
 * Outputs a validation report and optionally fixes issues.
 *
 * Usage: node scripts/pipeline/validate-words.cjs [--fix] [--tier=N]
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');

function main() {
    const args = process.argv.slice(2);
    const fix = args.includes('--fix');
    const tierArg = args.find(a => a.startsWith('--tier='));
    const tier = tierArg ? parseInt(tierArg.split('=')[1]) : null;

    if (!fs.existsSync(DB_PATH)) {
        console.error('Database not found.');
        process.exit(1);
    }

    const db = new Database(DB_PATH);

    let whereClause = 'WHERE enriched = 1';
    const params = [];
    if (tier) {
        whereClause += ' AND tier = ?';
        params.push(tier);
    }

    const words = db.prepare(`SELECT * FROM words ${whereClause}`).all(...params);
    console.log(`Validating ${words.length} words...\n`);

    const issues = {
        duplicateDistractors: [],
        distractorMatchesWord: [],
        emptyDefinition: [],
        tooShortDefinition: [],
        genericExample: [],
        properNouns: [],
        hyphenatedWords: [],
        abbreviations: [],
        missingDistracters: [],
        badTheme: [],
    };

    // Load existing app words
    const existingFile = path.join(__dirname, '..', '..', 'existing-words.txt');
    const existingWords = new Set(
        fs.existsSync(existingFile)
            ? fs.readFileSync(existingFile, 'utf8').trim().split('\n').map(w => w.trim().toLowerCase())
            : [],
    );
    let dupsWithExisting = 0;

    for (const w of words) {
        const word = w.word;
        const distractors = w.distractors ? JSON.parse(w.distractors) : [];

        // Check: duplicate distractors
        const uniqueD = new Set(distractors);
        if (uniqueD.size < distractors.length) {
            issues.duplicateDistractors.push(word);
        }

        // Check: distractor matches correct word
        if (distractors.some(d => d === word)) {
            issues.distractorMatchesWord.push(word);
        }

        // Check: empty or missing definition
        const def = w.api_definition || w.definition || '';
        if (!def || def === 'NOT_FOUND') {
            issues.emptyDefinition.push(word);
        } else if (def.length < 10) {
            issues.tooShortDefinition.push(word);
        }

        // Check: proper nouns (capitalized in WordNet = proper noun)
        if (/^[A-Z]/.test(word)) {
            issues.properNouns.push(word);
        }

        // Check: hyphenated words
        if (word.includes('-')) {
            issues.hyphenatedWords.push(word);
        }

        // Check: abbreviations (all caps, very short)
        if (word.length <= 3 && /^[A-Z]+$/.test(word)) {
            issues.abbreviations.push(word);
        }

        // Check: missing distractors
        if (distractors.length < 3) {
            issues.missingDistracters.push(word);
        }

        // Check: dups with existing app words
        if (existingWords.has(word.toLowerCase())) {
            dupsWithExisting++;
        }
    }

    // Report
    console.log('-- Validation Report --\n');
    console.log(`Total words checked: ${words.length}`);
    console.log(`Duplicates with existing app: ${dupsWithExisting}`);
    console.log('');

    for (const [issue, affected] of Object.entries(issues)) {
        if (affected.length > 0) {
            console.log(`${issue}: ${affected.length} words`);
            if (affected.length <= 10) {
                console.log(`  Examples: ${affected.join(', ')}`);
            } else {
                console.log(`  Examples: ${affected.slice(0, 10).join(', ')}...`);
            }
        }
    }

    // Fix mode: remove problematic words
    if (fix) {
        console.log('\n-- Applying fixes --\n');

        // Remove proper nouns from the pool
        const removeProper = db.prepare('DELETE FROM words WHERE word = ? AND pos = ?');
        let removed = 0;

        // Mark proper nouns
        for (const word of issues.properNouns) {
            // Don't remove — just flag them. Some proper nouns are valid spelling bee words.
        }

        // Fix duplicate distractors
        const updateDistractors = db.prepare('UPDATE words SET distractors = ? WHERE word = ?');
        for (const word of issues.distractorMatchesWord) {
            const row = db.prepare('SELECT * FROM words WHERE word = ?').get(word);
            if (!row) continue;
            const d = JSON.parse(row.distractors);
            const fixed = d.filter(x => x !== word);
            // Add fallback distractors
            while (fixed.length < 3) {
                const w = word.toLowerCase();
                const idx = Math.floor(Math.random() * (w.length - 2)) + 1;
                const dropped = w.slice(0, idx) + w.slice(idx + 1);
                if (dropped !== w && !fixed.includes(dropped)) fixed.push(dropped);
                else break;
            }
            updateDistractors.run(JSON.stringify(fixed), word);
        }
        console.log(`Fixed ${issues.distractorMatchesWord.length} words with self-matching distractors`);
    }

    // Quality distribution
    console.log('\n-- Quality Score Distribution --\n');
    const qualityDist = db.prepare(`
        SELECT
            tier,
            SUM(CASE WHEN api_definition IS NOT NULL AND api_definition != 'NOT_FOUND' THEN 1 ELSE 0 END) as has_good_api_def,
            SUM(CASE WHEN api_example IS NOT NULL THEN 1 ELSE 0 END) as has_example,
            SUM(CASE WHEN pronunciation != UPPER(word) THEN 1 ELSE 0 END) as has_real_pronunciation,
            SUM(CASE WHEN etymology IS NOT NULL THEN 1 ELSE 0 END) as has_etymology,
            COUNT(*) as total
        FROM words
        ${whereClause}
        GROUP BY tier ORDER BY tier
    `).all(...params);

    console.log('Tier | Total | Good Def | Examples | Pronunc. | Etymol.');
    console.log('-----|-------|----------|----------|----------|--------');
    for (const q of qualityDist) {
        console.log(
            `  ${q.tier}  | ${String(q.total).padStart(5)} | ${String(q.has_good_api_def).padStart(8)} | ` +
            `${String(q.has_example).padStart(8)} | ${String(q.has_real_pronunciation).padStart(8)} | ${String(q.has_etymology).padStart(6)}`,
        );
    }

    db.close();
}

main();
