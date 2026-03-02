/**
 * enrich-batch.cjs
 *
 * Enriches WordNet words with Free Dictionary API data (definitions, phonetics, etymology).
 * Processes a batch of words from the SQLite DB and adds API enrichment columns.
 *
 * Usage: node scripts/pipeline/enrich-batch.cjs [--tier=N] [--limit=N] [--offset=N] [--skip-api]
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

/** Estimate syllable count from word */
function estimateSyllables(word) {
    const w = word.toLowerCase().replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    const m = w.match(/[aeiouy]{1,2}/g);
    return m ? m.length : 1;
}

/** Estimate difficulty 1-10 based on word properties */
function estimateDifficulty(word, senseCount) {
    const len = word.length;
    const syllables = estimateSyllables(word);
    const hasDouble = /(.)\1/.test(word);
    const hasSilent = /^[kgpw]n|mb$|mn$|^ps|ph|ght/.test(word);
    const hasRareCluster = /th|sch|tch|ght|ough|eigh|tion|sion/.test(word);

    let score = 1;

    // Length-based
    if (len <= 4) score += 0;
    else if (len <= 6) score += 1;
    else if (len <= 8) score += 2;
    else if (len <= 10) score += 3;
    else if (len <= 12) score += 4;
    else score += 5;

    // Syllable-based
    if (syllables >= 4) score += 2;
    else if (syllables >= 3) score += 1;

    // Spelling difficulty modifiers
    if (hasDouble) score += 0.5;
    if (hasSilent) score += 1;
    if (hasRareCluster) score += 0.5;

    // Polysemy: more senses = more common = slightly easier
    if (senseCount > 5) score -= 1;
    if (senseCount > 10) score -= 1;

    return Math.max(1, Math.min(10, Math.round(score)));
}

/** Classify phonics pattern based on word structure */
function classifyPattern(word, difficulty) {
    const w = word.toLowerCase();

    // Check for specific language origins
    if (/tion$|sion$|ious$|eous$|ious$/.test(w)) return 'latin-roots';
    if (/ology$|itis$|osis$|phobia$|graph$|archy$|cracy$/.test(w)) return 'greek-roots';
    if (/ette$|ique$|oir$|aise$|esque$/.test(w)) return 'french-origin';
    if (/ung$|stein$|burg$/.test(w)) return 'irregular';

    // Difficulty-based pattern assignment
    if (difficulty <= 2) {
        if (/^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/.test(w)) return 'cvc';
        if (/bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|st|sw|tr/.test(w)) return 'blends';
        if (/ch|sh|th|wh|ck|ng/.test(w)) return 'digraphs';
        return 'cvc';
    }
    if (difficulty <= 4) {
        if (/[aeiou][bcdfghjklmnpqrstvwxyz]e$/.test(w)) return 'silent-e';
        if (/ai|ay|ea|ee|ie|oa|oe|oo|ou|ow|ue/.test(w)) return 'vowel-teams';
        if (/[aeiou]r/.test(w)) return 'r-controlled';
        return 'vowel-teams';
    }
    if (difficulty <= 6) {
        if (/^(un|re|pre|dis|mis|over|under|out|non)/.test(w)) return 'prefixes';
        if (/(ful|less|ness|ment|tion|sion|able|ible|ous|ive|ity|ly|er|or|ist|ism)$/.test(w)) return 'suffixes';
        if (/-/.test(w)) return 'compound';
        return 'multisyllable';
    }
    if (difficulty <= 8) {
        if (/tion$|sion$|ious$|eous$|ance$|ence$|ment$|ible$|able$/.test(w)) return 'latin-roots';
        if (/ology$|itis$|graph$|phobia$|archy$|cracy$/.test(w)) return 'greek-roots';
        return 'multisyllable';
    }
    return 'irregular';
}

/** Classify semantic theme based on definition text */
function classifyTheme(word, definition) {
    const d = (definition || '').toLowerCase();

    if (/animal|bird|fish|insect|mammal|reptile|creature/.test(d)) return 'animals';
    if (/plant|tree|flower|leaf|seed|root|botanical|shrub/.test(d)) return 'plants';
    if (/weather|rain|wind|storm|climate|snow|temperature/.test(d)) return 'weather';
    if (/earth|rock|mountain|ocean|river|volcano|geology/.test(d)) return 'earth';
    if (/body|bone|muscle|organ|limb|blood|skin|heart/.test(d)) return 'body';
    if (/disease|medical|health|medicine|illness|symptom|treatment|doctor/.test(d)) return 'health';
    if (/food|eat|cook|meal|taste|fruit|vegetable|bread|meat/.test(d)) return 'food';
    if (/person|people|human|man|woman|child|individual/.test(d)) return 'people';
    if (/society|government|law|political|social|community|public/.test(d)) return 'society';
    if (/money|financial|wealth|payment|currency|economic|profit/.test(d)) return 'money';
    if (/music|art|paint|sing|dance|perform|theater|literary/.test(d)) return 'art';
    if (/think|mind|thought|mental|brain|intellectual|cognit/.test(d)) return 'mind';
    if (/feel|emotion|happy|sad|angry|fear|joy|love|anxie/.test(d)) return 'feelings';
    if (/speak|language|word|write|read|communicate|speech/.test(d)) return 'language';
    if (/character|personality|temperament|disposition|trait/.test(d)) return 'character';
    if (/move|action|do|make|create|build|destroy|change/.test(d)) return 'actions';
    if (/travel|journey|trip|voyage|explore|navigate|wander/.test(d)) return 'travel';
    if (/school|learn|study|teach|education|academic|science/.test(d)) return 'academic';
    if (/see|hear|smell|taste|touch|vision|sound|bright|loud/.test(d)) return 'sensory';
    if (/time|day|year|hour|moment|period|season|century/.test(d)) return 'time';
    if (/much|many|few|large|small|amount|quantity|number/.test(d)) return 'quantity';
    if (/home|house|room|building|door|window|furniture/.test(d)) return 'home';

    return 'everyday';
}

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

    // Ensure we have at least 3
    while (result.length < 3) {
        const idx = Math.floor(Math.random() * (w.length - 2)) + 1;
        const dropped = w.slice(0, idx) + w.slice(idx + 1);
        if (dropped !== w && !result.includes(dropped)) {
            result.push(dropped);
        }
    }

    return result;
}

/** Fetch definition enrichment from Free Dictionary API */
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

function addEnrichmentColumns(db) {
    const columns = db.pragma('table_info(words)').map(c => c.name);
    const toAdd = [
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
    for (const [name, type] of toAdd) {
        if (!columns.includes(name)) {
            db.exec(`ALTER TABLE words ADD COLUMN ${name} ${type}`);
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    const tierArg = args.find(a => a.startsWith('--tier='));
    const limitArg = args.find(a => a.startsWith('--limit='));
    const offsetArg = args.find(a => a.startsWith('--offset='));
    const skipApi = args.includes('--skip-api');

    const tier = tierArg ? parseInt(tierArg.split('=')[1]) : null;
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 500;
    const offset = offsetArg ? parseInt(offsetArg.split('=')[1]) : 0;

    if (!fs.existsSync(DB_PATH)) {
        console.error('Database not found. Run import-wordnet.cjs first.');
        process.exit(1);
    }

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    addEnrichmentColumns(db);

    // Load existing words to dedup
    const existingFile = path.join(__dirname, '..', '..', 'existing-words.txt');
    const existingWords = new Set(
        fs.existsSync(existingFile)
            ? fs.readFileSync(existingFile, 'utf8').trim().split('\n').map(w => w.trim().toLowerCase())
            : [],
    );
    console.log(`Existing app words: ${existingWords.size}`);

    // Step 1: Compute difficulty for ALL words (fast, no API)
    console.log('\nStep 1: Computing difficulty scores...');
    const allWords = db.prepare(`
        SELECT id, word, pos, sense_count, definition
        FROM words
        WHERE difficulty IS NULL OR difficulty = 5
    `).all();

    const updateDifficulty = db.prepare(`
        UPDATE words SET difficulty = ?, pattern = ?, theme = ?, tier = ?
        WHERE id = ?
    `);

    const updateBatch = db.transaction((rows) => {
        for (const row of rows) {
            const diff = estimateDifficulty(row.word, row.sense_count);
            const pattern = classifyPattern(row.word, diff);
            const theme = classifyTheme(row.word, row.definition);
            const t = diff <= 2 ? 1 : diff <= 4 ? 2 : diff <= 6 ? 3 : diff <= 8 ? 4 : 5;
            updateDifficulty.run(diff, pattern, theme, t, row.id);
        }
    });

    updateBatch(allWords);
    console.log(`  Classified ${allWords.length} words`);

    // Step 2: Select batch for enrichment
    let whereClause = 'WHERE enriched = 0';
    const params = [];

    if (tier) {
        whereClause += ' AND tier = ?';
        params.push(tier);
    }

    const candidates = db.prepare(`
        SELECT id, word, pos, sense_count, definition, example, difficulty, tier
        FROM words
        ${whereClause}
        ORDER BY sense_count DESC, LENGTH(word) ASC
        LIMIT ? OFFSET ?
    `).all(...params, limit * 2, offset);

    // Filter out existing words and non-alpha entries
    const batch = candidates
        .filter(w => !existingWords.has(w.word.toLowerCase()))
        .filter(w => !w.word.includes('-') || w.word.split('-').length <= 2)
        .filter(w => /^[a-zA-Z'-]+$/.test(w.word))
        .slice(0, limit);

    console.log(`\nStep 2: Enriching ${batch.length} words (tier=${tier || 'all'})...`);

    const updateEnriched = db.prepare(`
        UPDATE words SET
            distractors = ?,
            pronunciation = ?,
            etymology = ?,
            api_definition = ?,
            api_example = ?,
            api_phonetic = ?,
            enriched = 1
        WHERE id = ?
    `);

    let enriched = 0;
    let apiHits = 0;
    let apiMisses = 0;

    for (let i = 0; i < batch.length; i++) {
        const word = batch[i];
        process.stdout.write(`[${i + 1}/${batch.length}] ${word.word}... `);

        const distractors = generateDistractors(word.word);

        let pronunciation = null;
        let etymology = null;
        let apiDef = null;
        let apiExample = null;
        let apiPhonetic = null;

        if (!skipApi) {
            const apiData = await fetchApiData(word.word);

            if (apiData) {
                apiHits++;
                apiPhonetic = apiData.phonetic || (apiData.phonetics.length > 0 ? apiData.phonetics[0] : null);
                pronunciation = ipaToReadable(apiPhonetic) || word.word.toUpperCase();
                etymology = apiData.origin || null;

                if (apiData.meanings.length > 0) {
                    const meaning = apiData.meanings[0];
                    if (meaning.definitions.length > 0) {
                        apiDef = meaning.definitions[0].definition;
                        apiExample = meaning.definitions[0].example;
                    }
                }
                console.log(`OK (${apiData.meanings.length} meanings)`);
            } else {
                apiMisses++;
                pronunciation = word.word.toUpperCase();
                console.log('NOT FOUND');
            }
        } else {
            pronunciation = word.word.toUpperCase();
            console.log('(skip API)');
        }

        updateEnriched.run(
            JSON.stringify(distractors),
            pronunciation,
            etymology,
            apiDef,
            apiExample,
            apiPhonetic,
            word.id,
        );

        enriched++;

        if (enriched % 50 === 0) {
            console.log(`  -- Progress: ${enriched}/${batch.length} --`);
        }

        if (!skipApi) await sleep(RATE_LIMIT_MS);
    }

    // Summary
    const stats = db.prepare(`
        SELECT tier, COUNT(*) as total,
               SUM(CASE WHEN enriched = 1 THEN 1 ELSE 0 END) as enriched_count
        FROM words
        GROUP BY tier
        ORDER BY tier
    `).all();

    console.log(`\n-- Enrichment Complete ----------------------------------------`);
    console.log(`Batch: ${enriched} words enriched`);
    if (!skipApi) console.log(`API: ${apiHits} hits, ${apiMisses} misses`);
    console.log(`\nBy tier:`);
    for (const row of stats) {
        console.log(`  Tier ${row.tier}: ${row.enriched_count}/${row.total} enriched`);
    }

    db.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
