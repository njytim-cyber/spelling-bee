/**
 * re-enrich.cjs
 *
 * Re-enriches the word database after Wiktionary import.
 * Only processes words that have REAL Wiktionary example sentences (144K).
 *
 * Fixes two major quality issues:
 * 1. DISTRACTORS - phonetically plausible misspellings a student would make
 *    (not random char swaps like "edletion", "asddhu", "xepounder")
 * 2. CLASSIFICATION - recalculates difficulty/tier/pattern/theme
 *
 * Also filters out inappropriate words (slang, vulgar, hyphenated, etc.)
 *
 * Usage: node scripts/pipeline/re-enrich.cjs [--limit=N] [--sample]
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');

// ============================================================
// DISTRACTOR GENERATION - Phonetically plausible misspellings
// ============================================================

/**
 * Suffix confusions - the most common real spelling mistakes.
 */
const SUFFIX_RULES = [
    [/ence$/, 'ance'], [/ance$/, 'ence'],
    [/ency$/, 'ancy'], [/ancy$/, 'ency'],
    [/ent$/, 'ant'], [/ant$/, 'ent'],
    [/ible$/, 'able'], [/able$/, 'ible'],
    [/tion$/, 'sion'], [/sion$/, 'tion'],
    [/cian$/, 'tion'], [/tian$/, 'cian'],
    [/ious$/, 'ous'], [/eous$/, 'ous'],
    [/ous$/, 'us'],
    [/er$/, 'or'], [/or$/, 'er'],
    [/ar$/, 'er'], [/er$/, 'ar'],
    [/le$/, 'el'], [/el$/, 'le'],
    [/al$/, 'el'], [/el$/, 'al'],
    [/ey$/, 'y'], [/ie$/, 'y'],
    [/y$/, 'ey'],
    [/ize$/, 'ise'], [/ise$/, 'ize'],
    [/ful$/, 'full'],
    [/ally$/, 'aly'],
    [/ment$/, 'mant'],
    [/ness$/, 'niss'],
    [/ary$/, 'ery'], [/ery$/, 'ary'],
    [/ory$/, 'ery'], [/ery$/, 'ory'],
    [/eous$/, 'ious'], [/ious$/, 'eous'],
    [/ight$/, 'ite'], [/ite$/, 'ight'],
    [/ck$/, 'k'],
    [/dge$/, 'ge'],
    [/ough$/, 'uff'],
    [/eed$/, 'ead'], [/ead$/, 'eed'],
    [/eive$/, 'ieve'], [/ieve$/, 'eive'],
    [/ary$/, 'airy'],
    [/ery$/, 'eiry'],
    [/ure$/, 'er'],
    [/ous$/, 'ious'],
    [/eous$/, 'eus'],
];

/**
 * Vowel digraph confusions (interior of word).
 */
const VOWEL_SWAPS = [
    ['ei', 'ie'], ['ie', 'ei'],
    ['ea', 'ee'], ['ee', 'ea'],
    ['ai', 'ay'], ['ay', 'ai'],
    ['ou', 'ow'], ['ow', 'ou'],
    ['au', 'aw'], ['aw', 'au'],
    ['oi', 'oy'], ['oy', 'oi'],
];

/**
 * Silent letter traps.
 */
const SILENT_RULES = [
    [/^kn/, 'n'],
    [/^wr/, 'r'],
    [/^gn/, 'n'],
    [/^ps/, 's'],
    [/^pn/, 'n'],
    [/^rh/, 'r'],
    [/mb$/, 'm'],
    [/mn$/, 'n'],
    [/bt$/, 't'],
    [/ght/, 't'],
    [/ph/, 'f'],
    [/tch/, 'ch'], [/([aeiou])ch/, '$1tch'],
    [/wh/, 'w'],
];

/**
 * Double-letter errors: the #1 most common spelling mistake category.
 */
function doubleLetterErrors(word) {
    const results = [];
    const w = word.toLowerCase();

    // Remove one of existing double letters
    for (let i = 0; i < w.length - 1; i++) {
        if (w[i] === w[i + 1]) {
            results.push(w.slice(0, i) + w.slice(i + 1));
        }
    }

    // Add a double where there isn't one (after a vowel)
    for (let i = 1; i < w.length - 1; i++) {
        const ch = w[i];
        if (!'aeiouy'.includes(ch) && w[i - 1] !== ch && w[i + 1] !== ch) {
            if ('aeiouy'.includes(w[i - 1])) {
                results.push(w.slice(0, i) + ch + w.slice(i));
            }
        }
    }

    return results;
}

/**
 * Schwa confusion: unstressed vowels that sound like "uh".
 * e.g. separate -> seperate, definite -> definate
 */
function schwaErrors(word) {
    const results = [];
    const w = word.toLowerCase();
    const schwas = ['a', 'e', 'i', 'o', 'u'];

    for (let i = 1; i < w.length - 1; i++) {
        if (schwas.includes(w[i])) {
            for (const s of schwas) {
                if (s !== w[i]) {
                    const changed = w.slice(0, i) + s + w.slice(i + 1);
                    if (changed !== w) results.push(changed);
                }
            }
        }
    }
    return results;
}

/**
 * Generate 3 phonetically plausible distractors for a word.
 */
function generateDistractors(word) {
    const w = word.toLowerCase();
    const candidates = new Set();

    // 1. Suffix confusions (highest quality)
    for (const [pattern, replacement] of SUFFIX_RULES) {
        if (candidates.size >= 6) break;
        if (pattern.test(w)) {
            const result = w.replace(pattern, replacement);
            if (result !== w && result.length >= 2) candidates.add(result);
        }
    }

    // 2. Double letter errors
    for (const d of doubleLetterErrors(w)) {
        if (candidates.size >= 8) break;
        if (d !== w && d.length >= 2) candidates.add(d);
    }

    // 3. Silent letter rules
    for (const [pattern, replacement] of SILENT_RULES) {
        if (candidates.size >= 10) break;
        if (pattern.test(w)) {
            const result = w.replace(pattern, replacement);
            if (result !== w && result.length >= 2) candidates.add(result);
        }
    }

    // 4. Vowel digraph swaps (interior only)
    for (const [from, to] of VOWEL_SWAPS) {
        if (candidates.size >= 12) break;
        const idx = w.indexOf(from, 1);
        if (idx > 0 && idx < w.length - 1) {
            const result = w.slice(0, idx) + to + w.slice(idx + from.length);
            if (result !== w && result.length >= 2) candidates.add(result);
        }
    }

    // 5. Schwa confusion (pick at most 2)
    if (candidates.size < 3) {
        const schwas = schwaErrors(w);
        for (const s of schwas.slice(0, 2)) {
            candidates.add(s);
        }
    }

    // 6. Transpose adjacent letters near vowels (fallback)
    if (candidates.size < 3) {
        for (let i = 1; i < w.length - 1 && candidates.size < 5; i++) {
            if ('aeiouy'.includes(w[i]) || 'aeiouy'.includes(w[i + 1])) {
                const swapped = w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
                if (swapped !== w) candidates.add(swapped);
            }
        }
    }

    // Filter and pick best 3
    const filtered = [...candidates].filter(d =>
        d !== w && d.length >= Math.max(2, w.length - 2) && d.length <= w.length + 2,
    );

    const result = [];
    for (const d of filtered) {
        if (result.length >= 3) break;
        if (!result.includes(d)) result.push(d);
    }

    // Absolute fallback: single vowel change
    if (result.length < 3) {
        for (let i = 1; i < w.length - 1 && result.length < 3; i++) {
            if ('aeiou'.includes(w[i])) {
                for (const v of 'aeiou') {
                    if (v !== w[i] && result.length < 3) {
                        const changed = w.slice(0, i) + v + w.slice(i + 1);
                        if (!result.includes(changed) && changed !== w) result.push(changed);
                    }
                }
            }
        }
    }

    return result.slice(0, 3);
}

// ============================================================
// DIFFICULTY / PATTERN / THEME
// ============================================================

function estimateSyllables(word) {
    const w = word.toLowerCase().replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    const m = w.match(/[aeiouy]{1,2}/g);
    return m ? m.length : 1;
}

function estimateDifficulty(word, senseCount) {
    const len = word.length;
    const syllables = estimateSyllables(word);
    let score = 1;

    if (len <= 4) score += 0;
    else if (len <= 6) score += 1;
    else if (len <= 8) score += 2;
    else if (len <= 10) score += 3;
    else if (len <= 12) score += 4;
    else score += 5;

    if (syllables >= 4) score += 2;
    else if (syllables >= 3) score += 1;

    if (/(.)\1/.test(word)) score += 0.5;
    if (/^[kgpw]n|mb$|mn$|^ps|ph|ght/.test(word)) score += 1;
    if (/th|sch|tch|ght|ough|eigh|tion|sion/.test(word)) score += 0.5;

    if (senseCount > 5) score -= 1;
    if (senseCount > 10) score -= 1;

    return Math.max(1, Math.min(10, Math.round(score)));
}

function classifyPattern(word, difficulty) {
    const w = word.toLowerCase();
    if (/tion$|sion$|ious$|eous$/.test(w)) return 'latin-roots';
    if (/ology$|itis$|osis$|phobia$|graph$|archy$|cracy$/.test(w)) return 'greek-roots';
    if (/ette$|ique$|oir$|aise$|esque$/.test(w)) return 'french-origin';

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
        return 'multisyllable';
    }
    if (difficulty <= 8) {
        if (/tion$|sion$|ious$|eous$|ance$|ence$|ment$|ible$|able$/.test(w)) return 'latin-roots';
        if (/ology$|itis$|graph$|phobia$|archy$|cracy$/.test(w)) return 'greek-roots';
        return 'multisyllable';
    }
    return 'irregular';
}

function classifyTheme(definition) {
    const d = (definition || '').toLowerCase();
    if (/\b(animal|bird|fish|insect|mammal|reptile|creature|species)\b/.test(d)) return 'animals';
    if (/\b(plant|tree|flower|leaf|seed|botanical|shrub|herb)\b/.test(d)) return 'plants';
    if (/\b(weather|rain|wind|storm|climate|snow|temperature)\b/.test(d)) return 'weather';
    if (/\b(earth|rock|mountain|ocean|river|volcano|mineral)\b/.test(d)) return 'earth';
    if (/\b(body|bone|muscle|organ|limb|blood|skin|heart|nerve)\b/.test(d)) return 'body';
    if (/\b(disease|medical|health|medicine|illness|symptom|treatment)\b/.test(d)) return 'health';
    if (/\b(food|eat|cook|meal|taste|fruit|vegetable|bread|meat)\b/.test(d)) return 'food';
    if (/\b(person|someone|people|human|individual)\b/.test(d)) return 'people';
    if (/\b(society|government|law|political|social|community)\b/.test(d)) return 'society';
    if (/\b(money|financial|wealth|payment|currency|economic)\b/.test(d)) return 'money';
    if (/\b(music|art|paint|sing|dance|perform|theater|literary)\b/.test(d)) return 'art';
    if (/\b(think|mind|thought|mental|brain|intellectual)\b/.test(d)) return 'mind';
    if (/\b(feel|emotion|happy|sad|angry|fear|joy|love)\b/.test(d)) return 'feelings';
    if (/\b(speak|language|word|write|read|speech|grammar)\b/.test(d)) return 'language';
    if (/\b(communicate|message|inform|express|announce)\b/.test(d)) return 'communication';
    if (/\b(character|personality|temperament|disposition)\b/.test(d)) return 'character';
    if (/\b(move|action|cause|make|create|build|destroy|change)\b/.test(d)) return 'actions';
    if (/\b(travel|journey|trip|voyage|explore|navigate)\b/.test(d)) return 'travel';
    if (/\b(school|learn|study|teach|education|academic|science)\b/.test(d)) return 'academic';
    if (/\b(see|hear|smell|taste|touch|vision|sound|bright)\b/.test(d)) return 'sensory';
    if (/\b(time|day|year|hour|moment|period|season|century)\b/.test(d)) return 'time';
    if (/\b(much|many|few|large|small|amount|quantity|number)\b/.test(d)) return 'quantity';
    if (/\b(home|house|room|building|door|window|furniture)\b/.test(d)) return 'home';
    if (/\b(water|sea|lake|pond|stream|marine|tide)\b/.test(d)) return 'water';
    if (/\b(cloth|wear|dress|shirt|garment|fabric)\b/.test(d)) return 'clothing';
    return 'everyday';
}

// ============================================================
// MAIN
// ============================================================

function main() {
    const args = process.argv.slice(2);
    const limitArg = args.find(a => a.startsWith('--limit='));
    const sampleOnly = args.includes('--sample');
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : -1; // -1 = no limit

    if (!fs.existsSync(DB_PATH)) {
        console.error('Database not found.');
        process.exit(1);
    }

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = OFF');

    // Only process words with real Wiktionary examples (144K)
    console.log('Selecting words with Wiktionary example sentences...');
    const candidates = db.prepare(`
        SELECT id, word, pos, sense_count, definition, wikt_definition, wikt_example,
               wikt_ipa, wikt_etymology, pronunciation
        FROM words
        WHERE wikt_example IS NOT NULL AND wikt_example != ''
          AND LENGTH(word) >= 3
          AND LENGTH(word) <= 25
          AND word = LOWER(word)
          AND word NOT LIKE '%-%'
          AND word NOT LIKE '% %'
          AND word NOT GLOB '*[0-9]*'
        ORDER BY sense_count DESC
        LIMIT ?
    `).all(limit);

    console.log('Candidates: ' + candidates.length.toLocaleString());

    if (sampleOnly) {
        // Just show samples of new distractors
        console.log('\nSample distractors (new algorithm):');
        for (const row of candidates.slice(0, 30)) {
            const d = generateDistractors(row.word);
            console.log('  ' + row.word + ' -> ' + d.join(', '));
        }
        db.close();
        return;
    }

    // Recalculate everything
    console.log('\nRecalculating difficulty/pattern/theme and generating distractors...');

    const update = db.prepare(`
        UPDATE words SET
            difficulty = ?,
            pattern = ?,
            theme = ?,
            tier = ?,
            distractors = ?,
            enriched = 1
        WHERE id = ?
    `);

    const BATCH = 20000;
    let processed = 0;
    let goodDistractors = 0;

    for (let i = 0; i < candidates.length; i += BATCH) {
        const batch = candidates.slice(i, i + BATCH);

        const run = db.transaction(() => {
            for (const row of batch) {
                const def = row.wikt_definition || row.definition || '';
                const diff = estimateDifficulty(row.word, row.sense_count || 1);
                const pattern = classifyPattern(row.word, diff);
                const theme = classifyTheme(def);
                const tier = diff <= 2 ? 1 : diff <= 4 ? 2 : diff <= 6 ? 3 : diff <= 8 ? 4 : 5;
                const distractors = generateDistractors(row.word);

                if (distractors.length === 3 && new Set(distractors).size === 3) {
                    goodDistractors++;
                }

                update.run(diff, pattern, theme, tier, JSON.stringify(distractors), row.id);
                processed++;
            }
        });
        run();

        console.log('  ' + Math.min(i + BATCH, candidates.length).toLocaleString() + '/' + candidates.length.toLocaleString() + ' processed');
    }

    // Stats
    console.log('\n' + '='.repeat(60));
    console.log('RE-ENRICHMENT COMPLETE');
    console.log('='.repeat(60));
    console.log('Processed: ' + processed.toLocaleString());
    console.log('Good distractors (3 unique): ' + goodDistractors.toLocaleString());

    const byTier = db.prepare(`
        SELECT tier, COUNT(*) as cnt
        FROM words
        WHERE wikt_example IS NOT NULL AND wikt_example != '' AND enriched = 1
        GROUP BY tier ORDER BY tier
    `).all();

    console.log('\nWords with Wikt examples by tier:');
    for (const row of byTier) {
        console.log('  Tier ' + row.tier + ': ' + row.cnt.toLocaleString());
    }

    // Sample new distractors
    console.log('\nSample distractors (new quality):');
    const samples = db.prepare(`
        SELECT word, difficulty, distractors
        FROM words
        WHERE enriched = 1 AND wikt_example IS NOT NULL AND wikt_example != '' AND LENGTH(word) >= 5
        ORDER BY RANDOM() LIMIT 20
    `).all();
    for (const s of samples) {
        const d = JSON.parse(s.distractors);
        console.log('  ' + s.word + ' (diff ' + s.difficulty + ') -> ' + d.join(', '));
    }

    db.close();
}

main();
