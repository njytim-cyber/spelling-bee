/**
 * api-enrich.cjs
 *
 * Targeted API enrichment: fetches definitions, phonetics, and etymology
 * from the Free Dictionary API for the highest-value words.
 * Prioritizes words with the most WordNet senses (= most common words).
 *
 * Usage: node scripts/pipeline/api-enrich.cjs [--tier=N] [--limit=N] [--resume]
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');
const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const RATE_LIMIT_MS = 200;
const MAX_RETRIES = 2;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** Convert IPA to readable pronunciation guide */
function ipaToReadable(ipa) {
    if (!ipa) return null;
    return ipa
        .replace(/\//g, '')
        .replace(/ˈ/g, '')
        .replace(/ˌ/g, '')
        .replace(/ə/g, 'uh')
        .replace(/æ/g, 'a')
        .replace(/ɑː/g, 'ah')
        .replace(/ɒ/g, 'o')
        .replace(/ɔː/g, 'aw')
        .replace(/ɛ/g, 'eh')
        .replace(/ɪ/g, 'ih')
        .replace(/iː/g, 'ee')
        .replace(/ʊ/g, 'oo')
        .replace(/uː/g, 'oo')
        .replace(/ʌ/g, 'uh')
        .replace(/ɜː/g, 'ur')
        .replace(/aɪ/g, 'eye')
        .replace(/eɪ/g, 'ay')
        .replace(/ɔɪ/g, 'oy')
        .replace(/aʊ/g, 'ow')
        .replace(/əʊ/g, 'oh')
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
        .replace(/j/g, 'y');
}

async function fetchApiData(word) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(`${API_BASE}/${encodeURIComponent(word)}`);
            if (res.status === 404) return null;
            if (!res.ok) {
                if (attempt < MAX_RETRIES) { await sleep(1000); continue; }
                return null;
            }
            const data = await res.json();
            const entry = data[0] || {};

            return {
                phonetic: entry.phonetic || null,
                phonetics: (entry.phonetics || []).filter(p => p.text).map(p => p.text),
                meanings: (entry.meanings || []).map(m => ({
                    pos: m.partOfSpeech,
                    definitions: (m.definitions || []).slice(0, 3).map(d => ({
                        definition: d.definition,
                        example: d.example || null,
                    })),
                })),
                origin: entry.origin || null,
            };
        } catch (e) {
            if (attempt < MAX_RETRIES) { await sleep(1000); continue; }
            return null;
        }
    }
    return null;
}

async function main() {
    const args = process.argv.slice(2);
    const tierArg = args.find(a => a.startsWith('--tier='));
    const limitArg = args.find(a => a.startsWith('--limit='));
    const resume = args.includes('--resume');

    const tier = tierArg ? parseInt(tierArg.split('=')[1]) : null;
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 500;

    if (!fs.existsSync(DB_PATH)) {
        console.error('Database not found.');
        process.exit(1);
    }

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    // Load existing app words for filtering
    const existingFile = path.join(__dirname, '..', '..', 'existing-words.txt');
    const existingWords = new Set(
        fs.existsSync(existingFile)
            ? fs.readFileSync(existingFile, 'utf8').trim().split('\n').map(w => w.trim().toLowerCase())
            : [],
    );

    // Select words needing API enrichment
    // Prioritize: no API data yet, single-word entries, sorted by sense_count DESC (most common first)
    let whereClause = 'WHERE api_definition IS NULL AND word NOT LIKE \'%-%\' AND word NOT LIKE \'% %\' AND LENGTH(word) >= 3';
    const params = [];

    if (tier) {
        whereClause += ' AND tier = ?';
        params.push(tier);
    }

    const candidates = db.prepare(`
        SELECT id, word, pos, sense_count, definition, tier, difficulty
        FROM words
        ${whereClause}
        ORDER BY sense_count DESC, difficulty DESC
        LIMIT ?
    `).all(...params, limit * 2);

    // Filter out existing words
    const batch = candidates
        .filter(w => !existingWords.has(w.word.toLowerCase()))
        .filter(w => /^[a-zA-Z']+$/.test(w.word))
        .slice(0, limit);

    console.log(`API enrichment: ${batch.length} words (tier=${tier || 'all'})`);
    console.log(`Rate: ${RATE_LIMIT_MS}ms/word, ETA: ~${Math.ceil(batch.length * RATE_LIMIT_MS / 60000)} minutes\n`);

    const update = db.prepare(`
        UPDATE words SET
            api_definition = ?,
            api_example = ?,
            api_phonetic = ?,
            pronunciation = COALESCE(?, pronunciation),
            etymology = COALESCE(?, etymology)
        WHERE id = ?
    `);

    let hits = 0;
    let misses = 0;

    for (let i = 0; i < batch.length; i++) {
        const word = batch[i];

        const apiData = await fetchApiData(word.word);

        if (apiData) {
            hits++;
            const phonetic = apiData.phonetic || (apiData.phonetics.length > 0 ? apiData.phonetics[0] : null);
            const pronunciation = ipaToReadable(phonetic);
            const etymology = apiData.origin || null;

            let apiDef = null;
            let apiExample = null;

            if (apiData.meanings.length > 0) {
                const meaning = apiData.meanings[0];
                if (meaning.definitions.length > 0) {
                    apiDef = meaning.definitions[0].definition;
                    apiExample = meaning.definitions[0].example;
                }
            }

            update.run(apiDef, apiExample, phonetic, pronunciation, etymology, word.id);

            if ((i + 1) % 100 === 0) {
                console.log(`[${i + 1}/${batch.length}] ${hits} hits, ${misses} misses`);
            }
        } else {
            misses++;
            // Mark as attempted so we don't retry
            update.run('NOT_FOUND', null, null, null, null, word.id);
        }

        await sleep(RATE_LIMIT_MS);
    }

    // Stats
    const apiStats = db.prepare(`
        SELECT tier,
               COUNT(*) as total,
               SUM(CASE WHEN api_definition IS NOT NULL AND api_definition != 'NOT_FOUND' THEN 1 ELSE 0 END) as has_api,
               SUM(CASE WHEN api_example IS NOT NULL THEN 1 ELSE 0 END) as has_example
        FROM words
        GROUP BY tier ORDER BY tier
    `).all();

    console.log(`\n-- API Enrichment Complete --`);
    console.log(`Hits: ${hits}, Misses: ${misses}`);
    console.log(`\nBy tier:`);
    for (const s of apiStats) {
        console.log(`  Tier ${s.tier}: ${s.has_api} with API def, ${s.has_example} with examples`);
    }

    db.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
