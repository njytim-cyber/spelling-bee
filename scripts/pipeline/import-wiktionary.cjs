/**
 * import-wiktionary.cjs
 *
 * Parses the kaikki.org Wiktionary JSONL dump and merges high-quality
 * definitions, etymology, IPA pronunciation, and example sentences
 * into the existing WordNet-seeded SQLite database.
 *
 * Wiktionary data takes priority over WordNet for:
 *   - definitions (richer, more readable)
 *   - example sentences (real literary/usage examples)
 *   - etymology (full narrative text)
 *   - pronunciation (real IPA from native speakers)
 *
 * Also imports NEW words not in WordNet, dramatically expanding coverage.
 *
 * Sources: kaikki.org (CC-BY-SA 3.0, Wiktionary extraction)
 * Usage: node scripts/pipeline/import-wiktionary.cjs [--limit=N] [--stats-only]
 *
 * Prerequisites:
 *   - scripts/output/words.db (from import-wordnet.cjs)
 *   - scripts/output/kaikki.org-dictionary-English.jsonl (2.7GB download)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');
const JSONL_PATH = path.join(__dirname, '..', 'output', 'kaikki.org-dictionary-English.jsonl');

// Only import these parts of speech (skip particles, interjections, etc.)
const VALID_POS = new Set([
    'noun', 'verb', 'adj', 'adv', 'adjective', 'adverb',
]);

// Normalize kaikki POS to our standard
const POS_NORMALIZE = {
    noun: 'noun',
    verb: 'verb',
    adj: 'adjective',
    adjective: 'adjective',
    adv: 'adverb',
    adverb: 'adverb',
};

/**
 * Validate a word for inclusion in the spelling bank.
 * Rejects proper nouns, abbreviations, multi-word, etc.
 */
function isValidWord(word) {
    if (!word || word.length < 2 || word.length > 30) return false;
    // No spaces, no digits
    if (/[\s\d]/.test(word)) return false;
    // Must be lowercase alpha (allow apostrophes and hyphens within)
    if (!/^[a-z]([a-z'-]*[a-z])?$/.test(word)) return false;
    // No double hyphens or leading/trailing hyphens
    if (/--|^-|-$/.test(word)) return false;
    // Skip abbreviations (all caps in original would have been lowered)
    if (word.length <= 3 && /^[bcdfghjklmnpqrstvwxyz]+$/.test(word)) return false;
    return true;
}

/**
 * Extract the best IPA pronunciation from sounds array.
 * Prefers General American, then Received Pronunciation, then any.
 */
function extractIPA(sounds) {
    if (!sounds || !Array.isArray(sounds) || sounds.length === 0) return null;

    // Filter to entries that have IPA
    const withIPA = sounds.filter(s => s.ipa);
    if (withIPA.length === 0) return null;

    // Prefer General American
    const ga = withIPA.find(s =>
        s.tags && (
            s.tags.some(t => /general.american|GenAm|US|United.States/i.test(t))
        ),
    );
    if (ga) return ga.ipa;

    // Then Received Pronunciation
    const rp = withIPA.find(s =>
        s.tags && s.tags.some(t => /received.pronunciation|RP|UK|British/i.test(t)),
    );
    if (rp) return rp.ipa;

    // Any IPA
    return withIPA[0].ipa;
}

/**
 * Convert IPA to a readable pronunciation guide.
 * e.g. /dɪk.ʃən.ɛɹ.i/ → "dik-shun-air-ee"
 */
function ipaToReadable(ipa) {
    if (!ipa) return null;
    return ipa
        .replace(/[\/.]/g, '')
        .replace(/ˈ/g, '')
        .replace(/ˌ/g, '')
        .replace(/ə/g, 'uh')
        .replace(/æ/g, 'a')
        .replace(/ɑː/g, 'ah')
        .replace(/ɑ/g, 'ah')
        .replace(/ɒ/g, 'o')
        .replace(/ɔː/g, 'aw')
        .replace(/ɔ/g, 'aw')
        .replace(/ɛ/g, 'eh')
        .replace(/ɪ/g, 'ih')
        .replace(/iː/g, 'ee')
        .replace(/i/g, 'ee')
        .replace(/ʊ/g, 'oo')
        .replace(/uː/g, 'oo')
        .replace(/u/g, 'oo')
        .replace(/ʌ/g, 'uh')
        .replace(/ɜː/g, 'ur')
        .replace(/ɜ/g, 'ur')
        .replace(/aɪ/g, 'eye')
        .replace(/eɪ/g, 'ay')
        .replace(/ɔɪ/g, 'oy')
        .replace(/aʊ/g, 'ow')
        .replace(/əʊ/g, 'oh')
        .replace(/oʊ/g, 'oh')
        .replace(/ɪə/g, 'eer')
        .replace(/eə/g, 'air')
        .replace(/ʊə/g, 'oor')
        .replace(/ʃ/g, 'sh')
        .replace(/ʒ/g, 'zh')
        .replace(/tʃ/g, 'ch')
        .replace(/dʒ/g, 'j')
        .replace(/θ/g, 'th')
        .replace(/ð/g, 'th')
        .replace(/ŋ/g, 'ng')
        .replace(/ɹ/g, 'r')
        .replace(/ɾ/g, 'r')
        .replace(/j/g, 'y')
        .replace(/ɡ/g, 'g')
        .replace(/ː/g, '');
}

/**
 * Extract the best definition from senses.
 * Picks the first non-empty gloss that doesn't look like a cross-reference.
 */
function extractDefinition(senses) {
    if (!senses || !Array.isArray(senses)) return null;

    for (const sense of senses) {
        if (!sense.glosses || !Array.isArray(sense.glosses)) continue;

        // Take the last gloss (most specific - kaikki format puts specific last)
        const gloss = sense.glosses[sense.glosses.length - 1];
        if (!gloss || gloss.length < 5) continue;

        // Skip cross-references and form-of entries
        if (/^(alternative|obsolete|archaic|rare) (form|spelling) of\b/i.test(gloss)) continue;
        if (/^plural of\b/i.test(gloss)) continue;
        if (/^(simple past|past participle|present participle) of\b/i.test(gloss)) continue;
        if (/^(synonym|abbreviation|initialism|acronym) of\b/i.test(gloss)) continue;

        // Clean up wiki markup remnants
        let clean = gloss
            .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')  // [[link|text]] -> text
            .replace(/\{\{[^}]*\}\}/g, '')                     // {{templates}}
            .replace(/\s{2,}/g, ' ')
            .trim();

        if (clean.length >= 10) return clean;
    }

    return null;
}

/**
 * Extract example sentences from senses.
 * Returns the best (longest, most natural) example.
 */
function extractExamples(senses) {
    if (!senses || !Array.isArray(senses)) return [];

    const examples = [];
    for (const sense of senses) {
        if (!sense.examples || !Array.isArray(sense.examples)) continue;

        for (const ex of sense.examples) {
            const text = ex.text;
            if (!text || text.length < 10) continue;
            // Skip examples that are just word usage instructions
            if (/spelling bee|word list|vocabulary/i.test(text)) continue;
            // Skip very long literary quotes (>200 chars)
            if (text.length > 200) continue;

            examples.push(text);
        }
    }

    // Sort by length - prefer medium-length examples (30-100 chars)
    examples.sort((a, b) => {
        const aScore = a.length >= 30 && a.length <= 100 ? 1 : 0;
        const bScore = b.length >= 30 && b.length <= 100 ? 1 : 0;
        return bScore - aScore || a.length - b.length;
    });

    return examples.slice(0, 3);
}

/**
 * Clean etymology text - strip wiki markup, shorten if too long.
 */
function cleanEtymology(etymologyText) {
    if (!etymologyText) return null;

    let clean = etymologyText
        // Remove "Etymology tree\n..." prefix (kaikki artifact)
        .replace(/^Etymology\s*(?:tree)?\s*\n/i, '')
        // Clean wiki markup
        .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')
        .replace(/\{\{[^}]*\}\}/g, '')
        // Clean up whitespace
        .replace(/\n+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

    // Skip if it's just a tree of proto-language forms with no prose
    if (/^(Proto-|Middle |Old |Medieval |Late )/m.test(clean) && !clean.includes('from') && !clean.includes('From')) {
        return null;
    }

    // Skip very short etymologies
    if (clean.length < 10) return null;

    // Truncate very long etymologies (keep it practical)
    if (clean.length > 300) {
        // Try to cut at a sentence boundary
        const cut = clean.slice(0, 300).lastIndexOf('.');
        clean = cut > 100 ? clean.slice(0, cut + 1) : clean.slice(0, 300) + '...';
    }

    return clean;
}

function addWiktionaryColumns(db) {
    const columns = db.pragma('table_info(words)').map(c => c.name);
    const toAdd = [
        ['wikt_definition', 'TEXT'],
        ['wikt_example', 'TEXT'],
        ['wikt_ipa', 'TEXT'],
        ['wikt_etymology', 'TEXT'],
        ['wikt_sense_count', 'INTEGER DEFAULT 0'],
        ['wikt_imported', 'INTEGER DEFAULT 0'],
    ];
    for (const [name, type] of toAdd) {
        if (!columns.includes(name)) {
            db.exec(`ALTER TABLE words ADD COLUMN ${name} ${type}`);
        }
    }
    // Also ensure enrichment columns exist
    const enrichCols = [
        ['difficulty', 'INTEGER DEFAULT 5'],
        ['pattern', 'TEXT'],
        ['theme', 'TEXT'],
        ['distractors', 'TEXT'],
        ['pronunciation', 'TEXT'],
        ['etymology', 'TEXT'],
        ['api_definition', 'TEXT'],
        ['api_example', 'TEXT'],
        ['api_phonetic', 'TEXT'],
        ['enriched', 'INTEGER DEFAULT 0'],
        ['tier', 'INTEGER'],
    ];
    for (const [name, type] of enrichCols) {
        if (!columns.includes(name)) {
            db.exec(`ALTER TABLE words ADD COLUMN ${name} ${type}`);
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    const limitArg = args.find(a => a.startsWith('--limit='));
    const statsOnly = args.includes('--stats-only');
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;

    if (!fs.existsSync(JSONL_PATH)) {
        console.error('Wiktionary JSONL not found at: ' + JSONL_PATH);
        console.error('Download from: https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl');
        process.exit(1);
    }

    if (!fs.existsSync(DB_PATH)) {
        console.error('Database not found. Run import-wordnet.cjs first.');
        process.exit(1);
    }

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = OFF');

    addWiktionaryColumns(db);

    // Create index for fast word+pos lookup
    db.exec('CREATE INDEX IF NOT EXISTS idx_words_word_pos ON words(word, pos)');

    // Prepare statements
    const findWord = db.prepare(
        'SELECT id, word, pos, definition, example FROM words WHERE word = ? AND pos = ? LIMIT 1',
    );

    const updateWiktionary = db.prepare(`
        UPDATE words SET
            wikt_definition = ?,
            wikt_example = ?,
            wikt_ipa = ?,
            wikt_etymology = ?,
            wikt_sense_count = ?,
            wikt_imported = 1
        WHERE id = ?
    `);

    const insertNew = db.prepare(`
        INSERT OR IGNORE INTO words (word, pos, sense_count, definition, example, wikt_definition, wikt_example, wikt_ipa, wikt_etymology, wikt_sense_count, wikt_imported)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    // Stats
    let totalLines = 0;
    let englishEntries = 0;
    let validWords = 0;
    let updatedExisting = 0;
    let insertedNew = 0;
    let skippedPOS = 0;
    let skippedInvalid = 0;
    let skippedFormOf = 0;
    let skippedNoDef = 0;

    console.log('Parsing Wiktionary JSONL dump...');
    console.log('File: ' + JSONL_PATH);
    const fileSize = fs.statSync(JSONL_PATH).size;
    console.log('Size: ' + (fileSize / 1024 / 1024 / 1024).toFixed(2) + ' GB\n');

    const fileStream = fs.createReadStream(JSONL_PATH, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    // Accumulate entries by word+pos (kaikki has multiple entries per word/sense)
    // We'll batch-process them
    const BATCH_SIZE = 10000;

    let lastReport = Date.now();

    const processBatch = db.transaction((entries) => {
        for (const entry of entries) {
            const { word, pos, definition, example, ipa, etymology, senseCount } = entry;

            const existing = findWord.get(word, pos);

            if (existing) {
                // Update existing WordNet entry with Wiktionary data
                updateWiktionary.run(
                    definition,
                    example,
                    ipa,
                    etymology,
                    senseCount,
                    existing.id,
                );
                updatedExisting++;
            } else {
                // Insert as new word
                insertNew.run(
                    word,
                    pos,
                    senseCount,
                    definition,   // Also set as primary definition
                    example,      // Also set as primary example
                    definition,
                    example,
                    ipa,
                    etymology,
                    senseCount,
                );
                insertedNew++;
            }
        }
    });

    // Track best entry per word+pos (since kaikki has multiple lines per word)
    const wordBests = new Map();

    for await (const line of rl) {
        totalLines++;
        if (totalLines > limit) break;

        // Progress report every 30 seconds
        if (Date.now() - lastReport > 30000) {
            const pct = fileStream.bytesRead ? ((fileStream.bytesRead / fileSize) * 100).toFixed(1) : '?';
            console.log('  Progress: ' + totalLines.toLocaleString() + ' lines (' + pct + '%) | updated: ' + updatedExisting.toLocaleString() + ' | new: ' + insertedNew.toLocaleString());
            lastReport = Date.now();
        }

        let obj;
        try {
            obj = JSON.parse(line);
        } catch {
            continue;
        }

        // Only English
        if (obj.lang_code !== 'en') continue;
        englishEntries++;

        const rawWord = (obj.word || '').toLowerCase().trim();
        const rawPos = (obj.pos || '').toLowerCase();

        // Validate POS
        if (!VALID_POS.has(rawPos)) {
            skippedPOS++;
            continue;
        }

        // Validate word
        if (!isValidWord(rawWord)) {
            skippedInvalid++;
            continue;
        }

        const pos = POS_NORMALIZE[rawPos] || rawPos;

        // Extract definition
        const definition = extractDefinition(obj.senses);
        if (!definition) {
            skippedNoDef++;
            continue;
        }

        // Check if this is just a "form of" entry
        if (/\b(form|spelling|tense|participle) of\b/i.test(definition)) {
            skippedFormOf++;
            continue;
        }

        validWords++;

        // Extract other fields
        const examples = extractExamples(obj.senses);
        const ipa = extractIPA(obj.sounds);
        const etymology = cleanEtymology(obj.etymology_text);
        const senseCount = obj.senses ? obj.senses.length : 1;

        // Deduplicate: keep the best entry per word+pos
        const key = rawWord + '|' + pos;
        const prev = wordBests.get(key);

        // Score this entry: prefer entries with more data
        const score =
            (definition ? definition.length : 0) +
            (examples.length > 0 ? 50 : 0) +
            (ipa ? 30 : 0) +
            (etymology ? 40 : 0) +
            senseCount * 5;

        if (!prev || score > prev.score) {
            wordBests.set(key, {
                word: rawWord,
                pos,
                definition,
                example: examples[0] || null,
                ipa,
                etymology,
                senseCount,
                score,
            });
        }

        // Flush when map gets large
        if (wordBests.size >= BATCH_SIZE) {
            const entries = [...wordBests.values()];
            wordBests.clear();
            processBatch(entries);

            if (statsOnly && totalLines > 100000) break; // Quick stats mode
        }
    }

    // Flush remaining
    if (wordBests.size > 0) {
        processBatch([...wordBests.values()]);
        wordBests.clear();
    }

    // Post-import: promote Wiktionary data to primary columns where it's better
    console.log('\nPromoting best data to primary columns...');

    // Update definitions: prefer Wiktionary (richer) over WordNet
    const promoted = db.prepare(`
        UPDATE words SET
            definition = COALESCE(wikt_definition, definition),
            example = COALESCE(wikt_example, example),
            pronunciation = COALESCE(?, pronunciation),
            etymology = COALESCE(wikt_etymology, etymology)
        WHERE wikt_imported = 1 AND id = ?
    `);

    const toPromote = db.prepare(
        'SELECT id, wikt_ipa FROM words WHERE wikt_imported = 1',
    ).all();

    const promoteAll = db.transaction(() => {
        let count = 0;
        for (const row of toPromote) {
            const readable = ipaToReadable(row.wikt_ipa);
            promoted.run(readable, row.id);
            count++;
        }
        return count;
    });

    const promotedCount = promoteAll();
    console.log('  Promoted data for ' + promotedCount.toLocaleString() + ' words');

    // Create useful indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_words_tier ON words(tier)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_words_enriched ON words(enriched)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_words_wikt ON words(wikt_imported)');

    // Final stats
    const totalWords = db.prepare('SELECT COUNT(*) as cnt FROM words').get();
    const uniqueWords = db.prepare('SELECT COUNT(DISTINCT word) as cnt FROM words').get();
    const withWikt = db.prepare('SELECT COUNT(*) as cnt FROM words WHERE wikt_imported = 1').get();
    const withEtymology = db.prepare("SELECT COUNT(*) as cnt FROM words WHERE wikt_etymology IS NOT NULL AND wikt_etymology != ''").get();
    const withIPA = db.prepare("SELECT COUNT(*) as cnt FROM words WHERE wikt_ipa IS NOT NULL AND wikt_ipa != ''").get();
    const withExample = db.prepare("SELECT COUNT(*) as cnt FROM words WHERE wikt_example IS NOT NULL AND wikt_example != ''").get();
    const byPos = db.prepare('SELECT pos, COUNT(*) as cnt FROM words GROUP BY pos ORDER BY cnt DESC').all();

    console.log('\n' + '='.repeat(60));
    console.log('WIKTIONARY IMPORT COMPLETE');
    console.log('='.repeat(60));
    console.log('\nJSONL lines processed: ' + totalLines.toLocaleString());
    console.log('English entries: ' + englishEntries.toLocaleString());
    console.log('Valid words extracted: ' + validWords.toLocaleString());
    console.log('  Updated existing (WordNet): ' + updatedExisting.toLocaleString());
    console.log('  Inserted new: ' + insertedNew.toLocaleString());
    console.log('\nSkipped:');
    console.log('  Invalid POS: ' + skippedPOS.toLocaleString());
    console.log('  Invalid word format: ' + skippedInvalid.toLocaleString());
    console.log('  Form-of / cross-ref: ' + skippedFormOf.toLocaleString());
    console.log('  No definition: ' + skippedNoDef.toLocaleString());
    console.log('\nDatabase totals:');
    console.log('  Total entries: ' + totalWords.cnt.toLocaleString());
    console.log('  Unique words: ' + uniqueWords.cnt.toLocaleString());
    console.log('  With Wiktionary data: ' + withWikt.cnt.toLocaleString());
    console.log('  With etymology: ' + withEtymology.cnt.toLocaleString());
    console.log('  With IPA: ' + withIPA.cnt.toLocaleString());
    console.log('  With example sentence: ' + withExample.cnt.toLocaleString());
    console.log('\nBy POS:');
    for (const row of byPos) {
        console.log('  ' + row.pos + ': ' + row.cnt.toLocaleString());
    }
    console.log('\nDatabase: ' + DB_PATH);

    db.close();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
