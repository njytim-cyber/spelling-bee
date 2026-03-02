/**
 * import-wordnet.cjs
 *
 * Imports WordNet 3.1 data into a SQLite database.
 * Parses index files (lemma → synsets) and data files (synset → definition).
 * Creates a clean word table with: word, POS, definitions, sense count, etc.
 *
 * Usage: node scripts/pipeline/import-wordnet.cjs
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const WN_DIR = path.join(__dirname, '..', '..', 'node_modules', 'en-wordnet', 'database', '3.1');
const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');

const POS_MAP = { noun: 'n', verb: 'v', adj: 'a', adv: 'r' };
const POS_FULL = { n: 'noun', v: 'verb', a: 'adjective', r: 'adverb', s: 'adjective' };

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Parse a WordNet data file (data.noun, data.verb, etc.)
 * Returns Map<synset_offset, { pos, words: string[], definition, examples: string[] }>
 */
function parseDataFile(filename) {
    const lines = fs.readFileSync(path.join(WN_DIR, filename), 'utf8').split('\n');
    const synsets = new Map();

    for (const line of lines) {
        if (line.startsWith('  ') || !line.trim()) continue;

        const pipeIdx = line.indexOf('|');
        if (pipeIdx === -1) continue;

        const header = line.slice(0, pipeIdx).trim();
        const gloss = line.slice(pipeIdx + 1).trim();

        const parts = header.split(/\s+/);
        const offset = parts[0];
        const pos = parts[2];

        // Parse word count (hex) and word lemmas
        const wordCount = parseInt(parts[3], 16);
        const words = [];
        for (let i = 0; i < wordCount; i++) {
            const word = parts[4 + i * 2].replace(/_/g, ' ');
            words.push(word);
        }

        // Split gloss into definition and examples
        const glossParts = gloss.split(';').map(s => s.trim()).filter(Boolean);
        const definition = glossParts.length > 0 ? glossParts[0].replace(/^"/, '').replace(/"$/, '') : '';
        const examples = glossParts.slice(1)
            .filter(s => s.startsWith('"'))
            .map(s => s.replace(/^"/, '').replace(/"$/, ''));

        synsets.set(offset, { pos, words, definition, examples });
    }

    return synsets;
}

/**
 * Parse a WordNet index file (index.noun, index.verb, etc.)
 * Returns Array<{ lemma, pos, senseCount, synsetOffsets: string[] }>
 */
function parseIndexFile(filename) {
    const lines = fs.readFileSync(path.join(WN_DIR, filename), 'utf8').split('\n');
    const entries = [];

    for (const line of lines) {
        if (line.startsWith('  ') || !line.trim()) continue;

        const parts = line.split(/\s+/);
        const lemma = parts[0].replace(/_/g, ' ');
        const pos = parts[1];
        const senseCount = parseInt(parts[2], 10);
        const ptrCount = parseInt(parts[3], 10);

        // Synset offsets start after: lemma, pos, sense_cnt, p_cnt, [p_cnt pointers], sense_cnt, tagsense_cnt
        const offsetStart = 4 + ptrCount + 2;
        const synsetOffsets = parts.slice(offsetStart).filter(s => /^\d{8}$/.test(s));

        entries.push({ lemma, pos, senseCount, synsetOffsets });
    }

    return entries;
}

function createSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            pos TEXT NOT NULL,
            sense_count INTEGER DEFAULT 1,
            definition TEXT,
            example TEXT,
            synset_offset TEXT,
            UNIQUE(word, pos, synset_offset)
        );

        CREATE TABLE IF NOT EXISTS word_senses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            pos TEXT NOT NULL,
            sense_index INTEGER DEFAULT 0,
            synset_offset TEXT NOT NULL,
            definition TEXT,
            example TEXT,
            related_words TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
        CREATE INDEX IF NOT EXISTS idx_words_pos ON words(pos);
        CREATE INDEX IF NOT EXISTS idx_senses_word ON word_senses(word);
    `);
}

function main() {
    ensureDir(path.dirname(DB_PATH));

    // Remove old DB
    if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = OFF');

    createSchema(db);

    console.log('Parsing WordNet 3.1 data files...');

    // Parse all data files
    const allSynsets = new Map();
    for (const [name] of Object.entries(POS_MAP)) {
        const dataFile = `data.${name}`;
        console.log(`  Parsing ${dataFile}...`);
        const synsets = parseDataFile(dataFile);
        for (const [offset, data] of synsets) {
            allSynsets.set(offset, data);
        }
        console.log(`    -> ${synsets.size} synsets`);
    }

    console.log(`Total synsets: ${allSynsets.size}\n`);

    // Parse all index files and insert into DB
    const insertWord = db.prepare(`
        INSERT OR IGNORE INTO words (word, pos, sense_count, definition, example, synset_offset)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertSense = db.prepare(`
        INSERT INTO word_senses (word, pos, sense_index, synset_offset, definition, example, related_words)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let totalWords = 0;
    let totalSenses = 0;

    const insertAll = db.transaction(() => {
        for (const [name] of Object.entries(POS_MAP)) {
            const indexFile = `index.${name}`;
            console.log(`  Importing ${indexFile}...`);
            const entries = parseIndexFile(indexFile);

            for (const entry of entries) {
                // Skip multi-word phrases and entries with digits
                const word = entry.lemma;
                if (word.includes(' ') || /\d/.test(word)) continue;
                // Skip very short words
                if (word.length < 2) continue;

                const fullPos = POS_FULL[entry.pos] || entry.pos;

                // Get primary definition from first synset
                const primarySynset = allSynsets.get(entry.synsetOffsets[0]);
                const primaryDef = primarySynset?.definition || '';
                const primaryExample = primarySynset?.examples?.[0] || '';

                insertWord.run(word, fullPos, entry.senseCount, primaryDef, primaryExample, entry.synsetOffsets[0]);
                totalWords++;

                // Insert all senses
                for (let i = 0; i < entry.synsetOffsets.length; i++) {
                    const synset = allSynsets.get(entry.synsetOffsets[i]);
                    if (!synset) continue;

                    const relatedWords = synset.words
                        .filter(w => w.toLowerCase() !== word.toLowerCase())
                        .join(', ');

                    insertSense.run(
                        word, fullPos, i, entry.synsetOffsets[i],
                        synset.definition, synset.examples?.[0] || '', relatedWords,
                    );
                    totalSenses++;
                }
            }
            console.log(`    -> ${entries.length} lemmas processed`);
        }
    });

    insertAll();

    // Count unique words
    const uniqueWords = db.prepare('SELECT COUNT(DISTINCT word) as cnt FROM words').get();
    const byPos = db.prepare('SELECT pos, COUNT(*) as cnt FROM words GROUP BY pos ORDER BY cnt DESC').all();

    console.log(`\n-- WordNet Import Complete ----------------------------------------`);
    console.log(`Total word entries: ${totalWords}`);
    console.log(`Total senses: ${totalSenses}`);
    console.log(`Unique words: ${uniqueWords.cnt}`);
    console.log(`By POS:`);
    for (const row of byPos) {
        console.log(`  ${row.pos}: ${row.cnt}`);
    }
    console.log(`Database: ${DB_PATH}`);

    db.close();
}

main();
