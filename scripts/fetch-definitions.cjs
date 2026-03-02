/**
 * fetch-definitions.cjs
 *
 * Pass 1: Fetch raw dictionary data from Free Dictionary API (Wiktionary-backed).
 * Outputs a JSON file with definitions, POS, phonetics, and etymology for each word.
 * This raw data serves as the source of truth for Pass 2 (AI enrichment).
 *
 * Usage: node scripts/fetch-definitions.cjs <word-list-file> [--resume]
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const RATE_LIMIT_MS = 250;
const MAX_RETRIES = 2;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWord(word) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(`${API_BASE}/${encodeURIComponent(word)}`);
            if (res.status === 404) return { word, found: false };
            if (!res.ok) {
                if (attempt < MAX_RETRIES) { await sleep(1000); continue; }
                return { word, found: false, error: `HTTP ${res.status}` };
            }
            const data = await res.json();
            const entry = data[0] || {};

            // Extract all meanings
            const meanings = (entry.meanings || []).map(m => ({
                partOfSpeech: m.partOfSpeech,
                definitions: (m.definitions || []).map(d => ({
                    definition: d.definition,
                    example: d.example || null,
                    synonyms: d.synonyms || [],
                })),
            }));

            // Extract phonetics
            const phonetics = (entry.phonetics || [])
                .filter(p => p.text)
                .map(p => ({ text: p.text, audio: p.audio || null }));

            return {
                word,
                found: true,
                phonetic: entry.phonetic || null,
                phonetics,
                meanings,
                origin: entry.origin || null,
                sourceUrls: entry.sourceUrls || [],
            };
        } catch (e) {
            if (attempt < MAX_RETRIES) { await sleep(1000); continue; }
            return { word, found: false, error: e.message };
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log('Usage: node scripts/fetch-definitions.cjs <word-list-file> [--resume]');
        process.exit(1);
    }

    const wordListFile = args[0];
    const resume = args.includes('--resume');

    // Load word list
    const candidateWords = fs.readFileSync(wordListFile, 'utf8')
        .trim().split('\n')
        .map(w => w.trim().toLowerCase())
        .filter(w => w && !w.startsWith('#'));

    // Load existing words for dedup
    const existingFile = path.join(__dirname, '..', 'existing-words.txt');
    const existing = new Set(
        fs.existsSync(existingFile)
            ? fs.readFileSync(existingFile, 'utf8').trim().split('\n')
            : []
    );

    const newWords = candidateWords.filter(w => !existing.has(w));
    console.log(`Candidates: ${candidateWords.length}, New: ${newWords.length}, Dupes skipped: ${candidateWords.length - newWords.length}`);

    // Resume support
    const outDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'raw-definitions.json');

    let results = [];
    let alreadyFetched = new Set();
    if (resume && fs.existsSync(outFile)) {
        results = JSON.parse(fs.readFileSync(outFile, 'utf8'));
        alreadyFetched = new Set(results.map(r => r.word));
        console.log(`Resuming: ${alreadyFetched.size} already fetched`);
    }

    const toFetch = newWords.filter(w => !alreadyFetched.has(w));
    console.log(`Fetching: ${toFetch.length} words\n`);

    for (let i = 0; i < toFetch.length; i++) {
        const word = toFetch[i];
        process.stdout.write(`[${i + 1}/${toFetch.length}] ${word}... `);

        const result = await fetchWord(word);
        results.push(result);

        if (result.found) {
            const nDefs = result.meanings.reduce((sum, m) => sum + m.definitions.length, 0);
            console.log(`OK (${nDefs} defs, ${result.meanings.map(m => m.partOfSpeech).join('/')})`);
        } else {
            console.log(`NOT FOUND${result.error ? ` (${result.error})` : ''}`);
        }

        // Save progress every 25 words
        if ((i + 1) % 25 === 0) {
            fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
        }

        await sleep(RATE_LIMIT_MS);
    }

    // Final save
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2));

    const found = results.filter(r => r.found).length;
    const notFound = results.filter(r => !r.found).length;
    console.log(`\n── Done ──────────────────────────────────────`);
    console.log(`Found: ${found}, Not found: ${notFound}`);
    console.log(`Results saved to ${outFile}`);

    // List not-found words
    const missing = results.filter(r => !r.found).map(r => r.word);
    if (missing.length > 0) {
        console.log(`\nNot found: ${missing.join(', ')}`);
        fs.writeFileSync(path.join(outDir, 'not-found.txt'), missing.join('\n'));
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
