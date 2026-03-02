/**
 * enrich-words.cjs
 *
 * Word enrichment pipeline:
 * 1. Takes a list of candidate words
 * 2. Fetches definitions, etymology, pronunciation, POS from Free Dictionary API (Wiktionary-backed, CC-BY-SA)
 * 3. Enriches with our custom fields: difficulty, pattern, theme, distractors, child-friendly definition, example sentence
 * 4. Detects US/UK spelling variants and generates UK overrides
 * 5. Outputs SpellingWord TypeScript entries + UK overrides
 *
 * Usage: node scripts/enrich-words.cjs <word-list-file> <tier> [--dry-run]
 *
 * The word list file should have one word per line.
 * Tier: 3, 4, or 5 (determines difficulty range)
 */

const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const RATE_LIMIT_MS = 200; // be nice to the free API
const MAX_RETRIES = 2;

// ── US/UK spelling rules ────────────────────────────────────────────────────

const US_UK_RULES = [
    // -or → -our
    { us: /or$/, uk: 'our', test: /(?:color|favor|honor|humor|labor|neighbor|vigor|glamor|harbor|parlor|savior|tumor|candor|valor|splendor|ardor|clamor|endeavor|rancor|fervor|succor|valor|behavior|demeanor|savour)/ },
    // -er → -re (for specific words)
    { us: /er$/, uk: 're', test: /(?:center|fiber|liter|meter|theater|scepter|caliber|somber|luster|specter|meager|saber)/ },
    // -ize → -ise
    { us: /ize$/, uk: 'ise', test: /./ },
    { us: /ization$/, uk: 'isation', test: /./ },
    // -yze → -yse
    { us: /yze$/, uk: 'yse', test: /./ },
    // -ense → -ence
    { us: /ense$/, uk: 'ence', test: /(?:defense|offense|license|pretense)/ },
    // -og → -ogue
    { us: /og$/, uk: 'ogue', test: /(?:analog|catalog|dialog|monolog|prolog|epilog)/ },
    // -ment (US drops e)
    { us: /dgment$/, uk: 'dgement', test: /(?:judgment|acknowledgment)/ },
    { us: /llment$/, uk: 'lment', test: /(?:fulfillment|enrollment|installment)/ },
    // ae/oe digraphs
    { us: /e(?=mia|mic|tic|sia|sis)/, uk: 'ae', test: /(?:anemia|anemic|esthetic|orthopedic|pediatric|leukemia|hemoglobin|anesthesia|encyclopedia)/, replace: true },
    { us: /rrhea$/, uk: 'rrhoea', test: /./ },
];

/**
 * Given a US spelling, return the UK variant if one exists, else null.
 */
function getUkSpelling(usWord) {
    const lower = usWord.toLowerCase();

    // Common specific overrides
    const specifics = {
        'aluminum': 'aluminium',
        'plow': 'plough',
        'snowplow': 'snowplough',
        'curb': 'kerb',
        'draft': 'draught',
        'gray': 'grey',
        'mold': 'mould',
        'molt': 'moult',
        'smolder': 'smoulder',
        'skeptic': 'sceptic',
        'skepticism': 'scepticism',
        'pajamas': 'pyjamas',
        'tire': 'tyre',
        'artifact': 'artefact',
        'jail': 'gaol',
        'sulfur': 'sulphur',
        'check': 'cheque',
        'maneuver': 'manoeuvre',
        'diarrhea': 'diarrhoea',
        'hemorrhage': 'haemorrhage',
        'hemorrhoid': 'haemorrhoid',
        'synesthesia': 'synaesthesia',
        'encyclopedia': 'encyclopaedia',
        'fetus': 'foetus',
        'estrogen': 'oestrogen',
    };
    if (specifics[lower]) return specifics[lower];

    // Rule-based
    for (const rule of US_UK_RULES) {
        if (rule.us.test(lower) && rule.test.test(lower)) {
            return lower.replace(rule.us, rule.uk);
        }
    }

    return null;
}

// ── Pattern classification ──────────────────────────────────────────────────

const PATTERN_RULES = {
    'greek-roots': /Greek|Hellenic/i,
    'latin-roots': /Latin|Roman/i,
    'french-origin': /French|Anglo-Norman|Old French|Norman/i,
};

function classifyPattern(etymology, word) {
    if (!etymology) return 'irregular';
    for (const [pattern, regex] of Object.entries(PATTERN_RULES)) {
        if (regex.test(etymology)) return pattern;
    }
    // Check word features
    if (/ph|th|ch|ps|mn|pn|rh/.test(word)) return 'greek-roots';
    if (/tion|sion|ment|ible|able/.test(word)) return 'latin-roots';
    if (/ette|esque|ique|eau|oir/.test(word)) return 'french-origin';
    return 'irregular';
}

// ── Theme classification ────────────────────────────────────────────────────

const THEME_KEYWORDS = {
    health: /disease|medical|medicine|health|illness|symptom|treatment|cure|doctor|patient|surgery|diagnosis|body|organ|blood|nerve|muscle/i,
    body: /body|anatomy|bone|skin|limb|organ|cell|tissue/i,
    animals: /animal|bird|fish|mammal|insect|reptile|species|creature|dog|cat|horse/i,
    plants: /plant|flower|tree|leaf|root|seed|botanical|garden|herb|fungus/i,
    food: /food|cook|eat|taste|meal|dish|ingredient|cuisine|recipe|flavor/i,
    academic: /study|science|theory|research|mathematics|philosophy|education|scholar|knowledge|university/i,
    society: /government|political|social|law|country|nation|power|authority|community|culture|rule|class/i,
    art: /art|music|paint|sculpture|theater|dance|literature|poetry|creative|aesthetic|performance/i,
    language: /word|speech|language|writing|grammar|literary|text|letter|meaning|rhetoric/i,
    communication: /speak|talk|say|tell|express|announce|declare|communicate|message|signal/i,
    mind: /think|thought|mind|mental|brain|cognitive|consciousness|reason|logic|philosophy|belief|opinion/i,
    feelings: /feel|emotion|happy|sad|angry|fear|love|hate|joy|anxiety|mood|sentiment/i,
    character: /character|personality|behavior|trait|virtue|vice|moral|attitude|disposition/i,
    nature: /nature|natural|earth|environment|weather|climate|wilderness|landscape|forest/i,
    earth: /rock|stone|mountain|river|ocean|land|soil|mineral|geological|terrain/i,
    time: /time|period|era|age|ancient|modern|history|date|century|year/i,
    actions: /action|move|do|make|create|build|break|throw|carry|push|pull/i,
    people: /person|people|human|man|woman|child|individual|group|crowd|population/i,
    money: /money|pay|cost|price|wealth|rich|poor|economic|financial|currency|trade/i,
    travel: /travel|journey|trip|voyage|road|path|route|destination|explore/i,
    home: /home|house|room|building|furniture|domestic|kitchen|door|wall/i,
    clothing: /cloth|wear|dress|fashion|garment|fabric|textile|suit|shoe/i,
    sensory: /sense|sight|sound|touch|smell|hear|see|bright|loud|soft/i,
    quantity: /number|count|amount|measure|size|large|small|many|few|total/i,
    everyday: /common|daily|ordinary|regular|usual|normal|routine/i,
    weather: /weather|rain|wind|storm|cloud|sun|snow|temperature|climate/i,
    water: /water|sea|ocean|lake|river|swim|wave|tide|aqua/i,
};

function classifyTheme(definition) {
    if (!definition) return 'academic';
    let bestTheme = 'academic';
    let bestScore = 0;
    for (const [theme, regex] of Object.entries(THEME_KEYWORDS)) {
        const matches = (definition.match(regex) || []).length;
        if (matches > bestScore) {
            bestScore = matches;
            bestTheme = theme;
        }
    }
    return bestTheme;
}

// ── Distractor generation ───────────────────────────────────────────────────

function generateDistractors(word) {
    const w = word.toLowerCase();
    const distractors = new Set();

    // Strategy 1: swap adjacent letters
    for (let i = 0; i < w.length - 1 && distractors.size < 1; i++) {
        if (w[i] !== w[i + 1]) {
            const d = w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
            if (d !== w) distractors.add(d);
        }
    }

    // Strategy 2: double a consonant
    const consonants = 'bcdfghjklmnpqrstvwxyz';
    for (let i = 0; i < w.length && distractors.size < 2; i++) {
        if (consonants.includes(w[i]) && w[i] !== w[i + 1]) {
            const d = w.slice(0, i) + w[i] + w[i] + w.slice(i + 1);
            if (d !== w && !distractors.has(d)) distractors.add(d);
            break;
        }
    }

    // Strategy 3: swap a vowel
    const vowels = 'aeiou';
    for (let i = 0; i < w.length && distractors.size < 3; i++) {
        if (vowels.includes(w[i])) {
            const replacement = vowels[(vowels.indexOf(w[i]) + 1) % 5];
            const d = w.slice(0, i) + replacement + w.slice(i + 1);
            if (d !== w && !distractors.has(d)) {
                distractors.add(d);
                break;
            }
        }
    }

    // Strategy 4: drop a silent or doubled letter
    for (let i = 0; i < w.length && distractors.size < 3; i++) {
        if (w[i] === w[i + 1]) {
            const d = w.slice(0, i) + w.slice(i + 1);
            if (d !== w && !distractors.has(d)) distractors.add(d);
            break;
        }
    }

    // Strategy 5: common suffix confusion
    const suffixSwaps = [
        [/tion$/, 'sion'], [/sion$/, 'tion'],
        [/ence$/, 'ance'], [/ance$/, 'ence'],
        [/ible$/, 'able'], [/able$/, 'ible'],
        [/ous$/, 'ious'], [/ious$/, 'ous'],
        [/ent$/, 'ant'], [/ant$/, 'ent'],
    ];
    for (const [from, to] of suffixSwaps) {
        if (from.test(w) && distractors.size < 3) {
            const d = w.replace(from, to);
            if (d !== w && !distractors.has(d)) distractors.add(d);
        }
    }

    // Fallback: ensure we have at least 3
    while (distractors.size < 3) {
        const i = Math.floor(Math.random() * w.length);
        const c = w[i];
        let replacement;
        if (vowels.includes(c)) {
            replacement = vowels[(vowels.indexOf(c) + 2) % 5];
        } else {
            replacement = consonants[(consonants.indexOf(c) + 3) % consonants.length];
        }
        const d = w.slice(0, i) + replacement + w.slice(i + 1);
        if (d !== w) distractors.add(d);
    }

    // Final safety: ensure correct spelling is never a distractor
    const result = [...distractors].filter(d => d !== w).slice(0, 3);
    return result;
}

// ── Simplified pronunciation ────────────────────────────────────────────────

function simplifyIPA(phonetic, word) {
    if (!phonetic) {
        // Generate basic pronunciation from word
        return word.toUpperCase().replace(/([aeiou]+)/gi, (m) => m.toUpperCase());
    }
    // Strip IPA slashes and brackets
    let p = phonetic.replace(/[\/\[\]]/g, '');
    // Basic IPA → readable conversions
    p = p.replace(/ˈ/g, '').replace(/ˌ/g, '');
    p = p.replace(/ə/g, 'uh').replace(/æ/g, 'a').replace(/ɑ/g, 'ah');
    p = p.replace(/ɛ/g, 'eh').replace(/ɪ/g, 'ih').replace(/ʊ/g, 'oo');
    p = p.replace(/ʌ/g, 'uh').replace(/ɔ/g, 'aw').replace(/ɒ/g, 'o');
    p = p.replace(/θ/g, 'th').replace(/ð/g, 'th');
    p = p.replace(/ʃ/g, 'sh').replace(/ʒ/g, 'zh');
    p = p.replace(/tʃ/g, 'ch').replace(/dʒ/g, 'j');
    p = p.replace(/ŋ/g, 'ng').replace(/ɹ/g, 'r');
    p = p.replace(/j/g, 'y').replace(/ɡ/g, 'g');
    p = p.replace(/iː/g, 'ee').replace(/uː/g, 'oo');
    p = p.replace(/eɪ/g, 'ay').replace(/aɪ/g, 'eye');
    p = p.replace(/ɔɪ/g, 'oy').replace(/aʊ/g, 'ow');
    p = p.replace(/oʊ/g, 'oh').replace(/ɪə/g, 'eer');
    return p || word.toUpperCase();
}

// ── API fetching ────────────────────────────────────────────────────────────

async function fetchWordData(word) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(`${API_BASE}/${encodeURIComponent(word)}`);
            if (res.status === 404) return null;
            if (!res.ok) {
                if (attempt < MAX_RETRIES) {
                    await sleep(1000);
                    continue;
                }
                return null;
            }
            const data = await res.json();
            return data[0] || null;
        } catch (e) {
            if (attempt < MAX_RETRIES) {
                await sleep(1000);
                continue;
            }
            return null;
        }
    }
    return null;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Difficulty assignment ───────────────────────────────────────────────────

function assignDifficulty(word, tier, etymology) {
    const len = word.length;
    if (tier === 3) {
        // Tier 3: difficulty 5-6
        return len > 10 ? 6 : 5;
    }
    if (tier === 4) {
        // Tier 4: difficulty 7-8
        return len > 10 ? 8 : 7;
    }
    // Tier 5: difficulty 9-10
    // Longer, more obscure words get 10
    const hasRarePattern = /ph|rrh|pn|mn|gn|ps|ght|ough|eigh|oeuvre|eux|aille/.test(word);
    const isLong = len >= 12;
    const hasGreekLatin = /Greek|Latin|French/i.test(etymology || '');
    if ((isLong && hasRarePattern) || len >= 15) return 10;
    if (hasRarePattern || isLong || hasGreekLatin) return 9;
    return 9;
}

// ── Main pipeline ───────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: node scripts/enrich-words.cjs <word-list-file> <tier> [--dry-run]');
        process.exit(1);
    }

    const wordListFile = args[0];
    const tier = parseInt(args[1]);
    const dryRun = args.includes('--dry-run');

    if (![3, 4, 5].includes(tier)) {
        console.error('Tier must be 3, 4, or 5');
        process.exit(1);
    }

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

    console.log(`\nPipeline: ${candidateWords.length} candidates → tier ${tier}`);
    console.log(`Existing words: ${existing.size}`);

    // Dedup
    const newWords = candidateWords.filter(w => !existing.has(w));
    const skippedDupes = candidateWords.length - newWords.length;
    console.log(`Skipped ${skippedDupes} duplicates, processing ${newWords.length} new words\n`);

    if (dryRun) {
        console.log('DRY RUN — would process these words:');
        newWords.forEach(w => console.log(`  ${w}`));
        return;
    }

    const results = [];
    const ukOverrides = [];
    const failed = [];

    for (let i = 0; i < newWords.length; i++) {
        const word = newWords[i];
        process.stdout.write(`[${i + 1}/${newWords.length}] ${word}... `);

        const data = await fetchWordData(word);
        if (!data) {
            console.log('NOT FOUND');
            failed.push(word);
            await sleep(RATE_LIMIT_MS);
            continue;
        }

        // Extract fields from API response
        const meanings = data.meanings || [];
        const firstMeaning = meanings[0] || {};
        const firstDef = (firstMeaning.definitions || [])[0] || {};

        const definition = firstDef.definition || '';
        const exampleSentence = firstDef.example || '';
        const partOfSpeech = firstMeaning.partOfSpeech || 'noun';

        // Get phonetic
        const phonetic = data.phonetic || (data.phonetics || []).find(p => p.text)?.text || '';

        // Get etymology (may not be available from free API)
        const etymology = (data.origin || '');

        // Get source URL for attribution
        const sourceUrl = ((data.sourceUrls || [])[0]) || '';

        // Classify
        const pattern = classifyPattern(etymology, word);
        const theme = classifyTheme(definition);
        const difficulty = assignDifficulty(word, tier, etymology);
        const pronunciation = simplifyIPA(phonetic, word);
        const distractors = generateDistractors(word);

        const entry = {
            word,
            definition,
            exampleSentence: exampleSentence || `The word "${word}" appeared on the spelling bee study list.`,
            partOfSpeech,
            difficulty,
            pattern,
            pronunciation,
            etymology: etymology || `Origin: see ${pattern.replace('-', ' ')}`,
            distractors,
            theme,
        };

        results.push(entry);

        // Check for UK variant
        const ukSpelling = getUkSpelling(word);
        if (ukSpelling && ukSpelling !== word) {
            const ukDistractors = generateDistractors(ukSpelling);
            ukOverrides.push({
                usWord: word,
                ukWord: ukSpelling,
                distractors: ukDistractors,
            });
        }

        console.log(`OK (${partOfSpeech}, diff ${difficulty}, ${pattern})`);
        await sleep(RATE_LIMIT_MS);
    }

    console.log(`\n── Results ────────────────────────────────────────`);
    console.log(`Enriched: ${results.length}`);
    console.log(`Failed: ${failed.length}${failed.length ? ' → ' + failed.join(', ') : ''}`);
    console.log(`UK overrides: ${ukOverrides.length}`);

    // Write TypeScript word entries
    const tierLabel = tier === 3 ? 'Tier 3 Expansion' : tier === 4 ? 'Tier 4 Expansion' : 'Tier 5 Expansion';
    let ts = `\n    // ── ${tierLabel} (API-enriched) ────────────────────────────\n`;
    for (const w of results) {
        ts += `    {\n`;
        ts += `        word: '${w.word}',\n`;
        ts += `        definition: '${w.definition.replace(/'/g, "\\'")}',\n`;
        ts += `        exampleSentence: '${w.exampleSentence.replace(/'/g, "\\'")}',\n`;
        ts += `        partOfSpeech: '${w.partOfSpeech}',\n`;
        ts += `        difficulty: ${w.difficulty},\n`;
        ts += `        pattern: '${w.pattern}',\n`;
        ts += `        pronunciation: '${w.pronunciation}',\n`;
        ts += `        etymology: '${w.etymology.replace(/'/g, "\\'")}',\n`;
        ts += `        distractors: [${w.distractors.map(d => `'${d.replace(/'/g, "\\'")}'`).join(', ')}],\n`;
        ts += `        theme: '${w.theme}',\n`;
        ts += `    },\n`;
    }

    const outDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const outFile = path.join(outDir, `enriched-tier${tier}-words.ts`);
    fs.writeFileSync(outFile, ts);
    console.log(`\nWord entries written to ${outFile}`);

    // Write UK overrides
    if (ukOverrides.length > 0) {
        let ukTs = '\n    // ── UK overrides for new words ────────────────────────────\n';
        for (const o of ukOverrides) {
            ukTs += `    '${o.usWord}': {\n`;
            ukTs += `        word: '${o.ukWord}',\n`;
            ukTs += `        distractors: [${o.distractors.map(d => `'${d}'`).join(', ')}],\n`;
            ukTs += `    },\n`;
        }
        const ukOutFile = path.join(outDir, 'enriched-uk-overrides.ts');
        fs.writeFileSync(ukOutFile, ukTs);
        console.log(`UK overrides written to ${ukOutFile}`);
    }

    // Write failed words for retry
    if (failed.length > 0) {
        const failedFile = path.join(outDir, 'enrichment-failed.txt');
        fs.writeFileSync(failedFile, failed.join('\n'));
        console.log(`Failed words written to ${failedFile}`);
    }

    // Update existing-words.txt
    const updatedWords = [...existing, ...results.map(w => w.word)].sort();
    fs.writeFileSync(existingFile, updatedWords.join('\n'));
    console.log(`Updated existing-words.txt (${updatedWords.length} total)`);
}

main().catch(err => {
    console.error('Pipeline error:', err);
    process.exit(1);
});
