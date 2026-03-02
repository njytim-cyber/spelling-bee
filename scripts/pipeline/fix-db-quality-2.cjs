/**
 * fix-db-quality-2.cjs — Second pass DB quality cleanup
 *
 * Issues found by audit:
 * 1. 56 words whose definition IS "Misspelling of X" — these are actual misspellings, not words
 * 2. 5 inappropriate words that slipped through
 * 3. 203+ fabricated prefix words at low difficulty (mis-, non-, un-, re-, out-, over-, under-)
 * 4. 449+ suffix junk words at low difficulty (-less, -ful, -ness, -ly with trivial definitions)
 * 5. 145 "Ellipsis of" definitions — abbreviations, not real definitions
 * 6. 27 very short definitions (<10 chars)
 * 7. 38 Wiktionary artifacts in definitions (references to "sense 1", "Wikipedia", etc.)
 * 8. 165 "Clipping of" definitions — slang abbreviations, not real definitions
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

let totalRemoved = 0;
let totalFixed = 0;

// ═══════════════════════════════════════════════════════════════
// FIX 1: Remove words whose primary definition is "Misspelling of X"
// ═══════════════════════════════════════════════════════════════
function removeMisspellings() {
    console.log('\n═══ FIX 1: Remove misspelling entries ═══');

    const rows = db.prepare(`
        SELECT word, wikt_definition, difficulty
        FROM words
        WHERE 1=1
        AND (wikt_definition LIKE 'Misspelling of %'
             OR wikt_definition LIKE 'Deliberate misspelling of %')
    `).all();

    console.log(`Found ${rows.length} misspelling entries`);
    rows.slice(0, 20).forEach(r => console.log(`  ${r.word.padEnd(22)} [d${r.difficulty}] ${r.wikt_definition.substring(0, 60)}`));
    if (rows.length > 20) console.log(`  ... +${rows.length - 20} more`);

    const stmt = db.prepare(`DELETE FROM words WHERE 1=1 AND (wikt_definition LIKE 'Misspelling of %' OR wikt_definition LIKE 'Deliberate misspelling of %')`);
    const result = stmt.run();
    console.log(`Removed: ${result.changes}`);
    totalRemoved += result.changes;
}

// ═══════════════════════════════════════════════════════════════
// FIX 2: Remove inappropriate words that slipped through
// ═══════════════════════════════════════════════════════════════
function removeInappropriate() {
    console.log('\n═══ FIX 2: Remove inappropriate words ═══');

    const badWords = [
        'pussyboy', 'ballsily', 'wenchful', 'cuckold', 'cuckquean',
        'cuckoldry', 'cuckoldize', 'concubine', 'concubinage',
        'harlot', 'harlotry', 'strumpet', 'trollop',
        'dominatrix', 'bondage', 'sadist', 'masochist',
        'voyeur', 'exhibitionist', 'fetish', 'fetishism', 'fetishist',
        'orgasm', 'orgasmic', 'erotic', 'erotica', 'eroticism', 'erotically',
        'erection', 'erectile',
        'genital', 'genitalia', 'genitals',
        'phallus', 'phallic', 'phallicism',
        'clitoris', 'clitoral',
        'vulva', 'vulvar',
        'scrotum', 'scrotal',
        'testicle', 'testicular',
        'penis', 'penile',
        'vagina', 'vaginal',
        'coitus', 'coital',
        'fornicate', 'fornication', 'fornicator',
        'sodomy', 'sodomite', 'sodomize', 'sodomise',
        'bugger', 'buggery',
        'brothel',
        'prostitute', 'prostitution', 'prostituting',
        'pimp', 'pimping',
        'whoremonger', 'whoremaster',
        'debauch', 'debauchery', 'debauched',
        'lascivious', 'lasciviousness',
        'lechery', 'lecherous', 'lecher',
        'lubricious', 'lubriciously',
        'prurient', 'prurience',
        'salacious', 'salaciousness',
        'licentious', 'licentiousness',
        'nymphomania', 'nymphomaniac',
        'satyriasis',
        'priapism', 'priapic',
    ];

    const placeholders = badWords.map(() => '?').join(',');
    const rows = db.prepare(`SELECT word, wikt_definition FROM words WHERE 1=1 AND word IN (${placeholders})`).all(...badWords);
    console.log(`Found ${rows.length} inappropriate words`);
    rows.forEach(r => console.log(`  ${r.word}`));

    const result = db.prepare(`DELETE FROM words WHERE 1=1 AND word IN (${placeholders})`).run(...badWords);
    console.log(`Removed: ${result.changes}`);
    totalRemoved += result.changes;
}

// ═══════════════════════════════════════════════════════════════
// FIX 3: Remove "Ellipsis of" definitions
// These are abbreviations/shortenings, not real definitions
// e.g., "henry" -> "Ellipsis of Henry hoover"
// ═══════════════════════════════════════════════════════════════
function removeEllipsis() {
    console.log('\n═══ FIX 3: Remove "Ellipsis of" definitions ═══');

    // First check if word has alternative rows with better definitions
    const ellipsisRows = db.prepare(`
        SELECT w1.rowid, w1.word, w1.wikt_definition, w1.difficulty
        FROM words w1
        WHERE 1=1
        AND w1.wikt_definition LIKE 'Ellipsis of %'
    `).all();

    console.log(`Found ${ellipsisRows.length} "Ellipsis of" entries`);

    let removedCount = 0;
    const deleteStmt = db.prepare(`DELETE FROM words WHERE rowid = ?`);

    for (const row of ellipsisRows) {
        // Check if there's another row for this word with a real definition
        const altRow = db.prepare(`
            SELECT rowid, wikt_definition
            FROM words
            WHERE word = ? AND 1=1 AND rowid != ?
            AND wikt_definition NOT LIKE 'Ellipsis of %'
            AND wikt_definition NOT LIKE 'Misspelling of %'
            AND wikt_definition NOT LIKE 'Clipping of %'
            AND wikt_definition NOT LIKE 'Alternative form%'
            ORDER BY sense_count DESC
            LIMIT 1
        `).get(row.word, row.rowid);

        if (altRow) {
            // Delete only the ellipsis row, keep the good one
            deleteStmt.run(row.rowid);
        } else {
            // No alternative — delete the word entirely
            deleteStmt.run(row.rowid);
        }
        removedCount++;
    }

    console.log(`Removed: ${removedCount} ellipsis rows`);
    totalRemoved += removedCount;
}

// ═══════════════════════════════════════════════════════════════
// FIX 4: Remove "Clipping of" definitions
// Same issue — "cap" -> "Clipping of Capricorn" is not a useful definition
// EXCEPT: keep if it's a genuinely common clipping (like "exam", "auto", "sub")
// ═══════════════════════════════════════════════════════════════
function removeClippings() {
    console.log('\n═══ FIX 4: Remove "Clipping of" definitions ═══');

    // Keep these common clippings that have become words in their own right
    // They should have proper definitions elsewhere in the DB
    const keepWords = new Set([
        'exam', 'auto', 'sub', 'gym', 'lab', 'vet', 'cab', 'pub', 'flu',
        'bus', 'van', 'bike', 'memo', 'photo', 'phone', 'fridge', 'plane',
        'dorm', 'grad', 'prof', 'tech', 'demo', 'promo', 'info', 'intro',
        'app', 'blog', 'vlog', 'fax', 'limo', 'condo', 'combo', 'disco',
        'hippo', 'rhino', 'deli', 'sushi', 'anime', 'manga'
    ]);

    const clippingRows = db.prepare(`
        SELECT w1.rowid, w1.word, w1.wikt_definition, w1.difficulty
        FROM words w1
        WHERE 1=1
        AND w1.wikt_definition LIKE 'Clipping of %'
    `).all();

    console.log(`Found ${clippingRows.length} "Clipping of" entries`);

    let removedCount = 0;
    let keptCount = 0;
    const deleteStmt = db.prepare(`DELETE FROM words WHERE rowid = ?`);

    for (const row of clippingRows) {
        // Check if this word has a better definition in another row
        const altRow = db.prepare(`
            SELECT rowid, wikt_definition
            FROM words
            WHERE word = ? AND 1=1 AND rowid != ?
            AND wikt_definition NOT LIKE 'Clipping of %'
            AND wikt_definition NOT LIKE 'Ellipsis of %'
            AND wikt_definition NOT LIKE 'Misspelling of %'
            AND wikt_definition NOT LIKE 'Alternative form%'
            AND length(wikt_definition) > 10
            ORDER BY sense_count DESC
            LIMIT 1
        `).get(row.word, row.rowid);

        if (altRow) {
            // Has better definition — delete the clipping row
            deleteStmt.run(row.rowid);
            removedCount++;
        } else if (keepWords.has(row.word)) {
            keptCount++;
        } else {
            // No alternative definition — remove entirely
            deleteStmt.run(row.rowid);
            removedCount++;
        }
    }

    console.log(`Removed: ${removedCount}, Kept: ${keptCount}`);
    totalRemoved += removedCount;
}

// ═══════════════════════════════════════════════════════════════
// FIX 5: Remove "Alternative form/spelling" definitions
// ═══════════════════════════════════════════════════════════════
function removeAlternativeForms() {
    console.log('\n═══ FIX 5: Remove "Alternative form/spelling" definitions ═══');

    const rows = db.prepare(`
        SELECT rowid, word, wikt_definition, difficulty
        FROM words
        WHERE 1=1
        AND (wikt_definition LIKE 'Alternative form of %'
             OR wikt_definition LIKE 'Alternative spelling of %'
             OR wikt_definition LIKE 'Dated form of %'
             OR wikt_definition LIKE 'Eye dialect of %'
             OR wikt_definition LIKE 'Archaic form of %'
             OR wikt_definition LIKE 'Obsolete form of %')
    `).all();

    console.log(`Found ${rows.length} alternative form entries`);
    rows.slice(0, 15).forEach(r => console.log(`  ${r.word.padEnd(22)} [d${r.difficulty}] ${r.wikt_definition.substring(0, 60)}`));

    let removedCount = 0;
    const deleteStmt = db.prepare(`DELETE FROM words WHERE rowid = ?`);

    for (const row of rows) {
        // Check for better definition
        const altRow = db.prepare(`
            SELECT rowid FROM words
            WHERE word = ? AND 1=1 AND rowid != ?
            AND wikt_definition NOT LIKE 'Alternative %'
            AND wikt_definition NOT LIKE 'Misspelling %'
            AND wikt_definition NOT LIKE 'Ellipsis of %'
            AND wikt_definition NOT LIKE 'Clipping of %'
            AND wikt_definition NOT LIKE 'Dated form %'
            AND wikt_definition NOT LIKE 'Eye dialect %'
            AND wikt_definition NOT LIKE 'Archaic form %'
            AND wikt_definition NOT LIKE 'Obsolete form %'
            AND length(wikt_definition) > 10
            ORDER BY sense_count DESC
            LIMIT 1
        `).get(row.word, row.rowid);

        // Delete the bad row regardless — if alt exists, it'll be used instead
        deleteStmt.run(row.rowid);
        removedCount++;
    }

    console.log(`Removed: ${removedCount}`);
    totalRemoved += removedCount;
}

// ═══════════════════════════════════════════════════════════════
// FIX 6: Remove very short definitions (<10 chars)
// These are usually single-word "definitions" like "Lamé." or "Cousin."
// ═══════════════════════════════════════════════════════════════
function removeShortDefs() {
    console.log('\n═══ FIX 6: Remove very short definitions ═══');

    const rows = db.prepare(`
        SELECT rowid, word, wikt_definition, difficulty
        FROM words
        WHERE 1=1
        AND length(wikt_definition) < 10
    `).all();

    console.log(`Found ${rows.length} short-definition entries`);
    rows.slice(0, 20).forEach(r => console.log(`  ${r.word.padEnd(20)} "${r.wikt_definition}"`));

    let removedCount = 0;
    const deleteStmt = db.prepare(`DELETE FROM words WHERE rowid = ?`);

    for (const row of rows) {
        // Check if there's a longer definition available
        const altRow = db.prepare(`
            SELECT rowid, wikt_definition FROM words
            WHERE word = ? AND 1=1 AND rowid != ?
            AND length(wikt_definition) >= 15
            ORDER BY sense_count DESC
            LIMIT 1
        `).get(row.word, row.rowid);

        // Delete the short-def row
        deleteStmt.run(row.rowid);
        removedCount++;
    }

    console.log(`Removed: ${removedCount}`);
    totalRemoved += removedCount;
}

// ═══════════════════════════════════════════════════════════════
// FIX 7: Clean Wiktionary artifacts from definitions
// Remove "(sense 1)", "(noun etymology 1 sense 1.2)", "Wikipedia" references etc.
// ═══════════════════════════════════════════════════════════════
function cleanWiktionaryArtifacts() {
    console.log('\n═══ FIX 7: Clean Wiktionary artifacts ═══');

    const rows = db.prepare(`
        SELECT rowid, word, wikt_definition
        FROM words
        WHERE 1=1
        AND (wikt_definition LIKE '%sense %'
             OR wikt_definition LIKE '%Wikipedia%'
             OR wikt_definition LIKE '%Wiktionary%'
             OR wikt_definition LIKE '%etymology %'
             OR wikt_definition LIKE '%(proper noun %'
             OR wikt_definition LIKE '%(noun noun %'
             OR wikt_definition LIKE '%(adjective sense%')
    `).all();

    console.log(`Found ${rows.length} definitions with Wiktionary artifacts`);

    let fixedCount = 0;
    const updateStmt = db.prepare(`UPDATE words SET wikt_definition = ? WHERE rowid = ?`);

    for (const row of rows) {
        let def = row.wikt_definition;

        // Remove parenthetical references like "(sense 1)", "(noun etymology 1 sense 1.2)", etc.
        def = def.replace(/\s*\([^)]*(?:sense|etymology|noun noun|proper noun|adjective sense)[^)]*\)/gi, '');

        // Remove ", see X on Wikipedia" or "see Wikipedia"
        def = def.replace(/[,;]\s*see\s+.*?(?:Wikipedia|Wiktionary).*?$/i, '');

        // Remove standalone Wikipedia/Wiktionary references
        def = def.replace(/\s*(?:on|in|at|see)\s+(?:Wikipedia|Wiktionary)/gi, '');

        // Clean up any resulting double spaces or trailing punctuation
        def = def.replace(/\s+/g, ' ').trim();
        def = def.replace(/[,;]\s*$/, '');
        def = def.replace(/\(\s*\)/g, '').trim();

        if (def !== row.wikt_definition && def.length > 10) {
            updateStmt.run(def, row.rowid);
            fixedCount++;
        } else if (def.length <= 10) {
            // Cleaning made it too short — delete
            db.prepare(`DELETE FROM words WHERE rowid = ?`).run(row.rowid);
            totalRemoved++;
        }
    }

    console.log(`Fixed: ${fixedCount}, Removed (too short after cleaning): ${totalRemoved - fixedCount}`);
    totalFixed += fixedCount;
}

// ═══════════════════════════════════════════════════════════════
// FIX 8: Remove fabricated prefix words at low difficulty
// Words like "misfriend", "redrink", "nonmoney" at difficulty 1-3
// These are technically in Wiktionary but nobody uses them
// ═══════════════════════════════════════════════════════════════
function removeFabricatedPrefixWords() {
    console.log('\n═══ FIX 8: Remove fabricated prefix words at low difficulty ═══');

    const productivePrefixes = ['un', 'mis', 'non', 'out', 'over', 'under', 'pre', 're', 'anti', 'super', 'mega', 'ultra'];

    // Words that are genuinely common despite having a productive prefix
    const allowlist = new Set([
        'unable', 'under', 'until', 'unless', 'unlike', 'undo', 'unfair', 'unknown', 'unlock',
        'unhappy', 'unusual', 'uncover', 'understand', 'understood', 'uncle', 'uniform', 'union',
        'unique', 'unit', 'unite', 'united', 'universe', 'university',
        'return', 'report', 'remember', 'require', 'result', 'receive', 'record', 'region',
        'remain', 'remove', 'replace', 'reply', 'represent', 'request', 'research', 'resource',
        'respond', 'rest', 'result', 'review', 'remind', 'repeat', 'reveal', 'reverse', 'reward',
        'really', 'ready', 'read', 'reach', 'reason', 'recent', 'reduce', 'reflect', 'refuse',
        'release', 'rely', 'remark', 'repair', 'respect', 'responsible',
        'mistake', 'missing', 'mission', 'misery', 'mister', 'mystery', 'missile',
        'nothing', 'notice', 'novel', 'none', 'normal', 'noise', 'noble', 'nonsense', 'nor',
        'outside', 'outfit', 'outline', 'output', 'outcome', 'outstanding', 'outward', 'outrage',
        'overcome', 'overlap', 'overlook', 'overnight', 'overseas', 'overtime', 'overview', 'overwhelming',
        'understand', 'underwater', 'underground', 'underline', 'undermine', 'underneath', 'undertake',
        'preview', 'prevent', 'previous', 'present', 'president', 'pressure', 'pretend', 'pretty',
        'prepare', 'prefer', 'predict', 'precise', 'pregnant', 'preserve', 'press',
        'super', 'support', 'supply', 'suppose', 'surface', 'surprise', 'surround', 'survey', 'survive',
        'suspect', 'suspend', 'superb', 'superhero', 'superman', 'supernatural', 'superstar',
        'automatic', 'antibiotic', 'antique', 'anticipate', 'anxiety',
    ]);

    // Load frequency data
    const fs = require('fs');
    const freqPath = path.join(__dirname, '..', 'data', 'en_freq_full.txt');
    const freqMap = new Map();
    if (fs.existsSync(freqPath)) {
        const freqData = fs.readFileSync(freqPath, 'utf8');
        let rank = 0;
        for (const line of freqData.split('\n')) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
                rank++;
                if (!freqMap.has(parts[0].toLowerCase())) {
                    freqMap.set(parts[0].toLowerCase(), rank);
                }
            }
        }
        console.log(`Loaded ${freqMap.size} frequency entries`);
    }

    const rows = db.prepare(`
        SELECT rowid, word, wikt_definition, difficulty, sense_count
        FROM words
        WHERE 1=1
        AND difficulty <= 4
    `).all();

    let removedCount = 0;
    const deleteStmt = db.prepare(`DELETE FROM words WHERE rowid = ?`);

    for (const row of rows) {
        if (allowlist.has(row.word)) continue;

        let isFabricated = false;
        for (const prefix of productivePrefixes) {
            if (row.word.startsWith(prefix) && row.word.length > prefix.length + 2) {
                const root = row.word.substring(prefix.length);
                // Check if the root is a common word but the prefixed form is obscure
                const rootRank = freqMap.get(root);
                const wordRank = freqMap.get(row.word);

                if (rootRank && rootRank < 10000 && (!wordRank || wordRank > 200000)) {
                    // Root is common, prefixed form is very rare
                    isFabricated = true;
                    break;
                }

                // Also flag if definition matches fabrication patterns
                if (/^(Not |Without |Lacking |Opposite of |To .* (again|improperly|wrongly|incorrectly|badly|in error))/.test(row.wikt_definition)) {
                    if (!wordRank || wordRank > 100000) {
                        isFabricated = true;
                        break;
                    }
                }
            }
        }

        if (isFabricated) {
            deleteStmt.run(row.rowid);
            removedCount++;
        }
    }

    console.log(`Removed: ${removedCount} fabricated prefix words`);
    totalRemoved += removedCount;
}

// ═══════════════════════════════════════════════════════════════
// FIX 9: Remove suffix junk words at low difficulty
// Words like "gameless", "bloodful", "carness" at difficulty 1-4
// ═══════════════════════════════════════════════════════════════
function removeSuffixJunk() {
    console.log('\n═══ FIX 9: Remove suffix junk words at low difficulty ═══');

    const suffixes = ['less', 'ful', 'ness', 'ly'];

    const allowlist = new Set([
        'really', 'actually', 'finally', 'only', 'usually', 'especially', 'certainly',
        'quickly', 'clearly', 'simply', 'easily', 'nearly', 'likely', 'exactly', 'directly',
        'suddenly', 'slowly', 'carefully', 'seriously', 'recently', 'currently', 'badly',
        'hardly', 'merely', 'slightly', 'totally', 'entirely', 'fairly', 'rarely',
        'possibly', 'probably', 'apparently', 'obviously', 'basically', 'generally', 'naturally',
        'surely', 'mostly', 'largely', 'partly', 'fully', 'highly', 'widely', 'deeply',
        'closely', 'strongly', 'properly', 'perfectly', 'absolutely', 'firmly', 'safely',
        'lovely', 'lonely', 'friendly', 'deadly', 'daily', 'early', 'fairly', 'family',
        'illness', 'business', 'darkness', 'weakness', 'sadness', 'happiness', 'kindness',
        'madness', 'fitness', 'awareness', 'illness', 'witness', 'princess', 'goddess',
        'progress', 'success', 'process', 'address', 'congress', 'express', 'impress',
        'unless', 'endless', 'homeless', 'helpless', 'careless', 'useless', 'wireless',
        'restless', 'harmless', 'countless', 'nonetheless', 'regardless', 'breathless',
        'hopeless', 'meaningless', 'needless', 'reckless', 'ruthless', 'senseless', 'sleepless',
        'thoughtless', 'timeless', 'worthless',
        'beautiful', 'wonderful', 'powerful', 'careful', 'helpful', 'useful', 'successful',
        'cheerful', 'colorful', 'graceful', 'grateful', 'handful', 'hopeful', 'joyful',
        'meaningful', 'mindful', 'painful', 'peaceful', 'playful', 'plentiful', 'prayerful',
        'purposeful', 'resourceful', 'respectful', 'skillful', 'thankful', 'thoughtful',
        'truthful', 'wasteful', 'watchful', 'willful', 'wishful', 'wrathful', 'youthful',
        'faithful', 'fearful', 'forgetful', 'fruitful', 'delightful', 'dreadful', 'dutiful',
        'awful', 'lawful', 'unlawful',
    ]);

    // Load frequency data
    const fs = require('fs');
    const freqPath = path.join(__dirname, '..', 'data', 'en_freq_full.txt');
    const freqMap = new Map();
    if (fs.existsSync(freqPath)) {
        const freqData = fs.readFileSync(freqPath, 'utf8');
        let rank = 0;
        for (const line of freqData.split('\n')) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
                rank++;
                if (!freqMap.has(parts[0].toLowerCase())) {
                    freqMap.set(parts[0].toLowerCase(), rank);
                }
            }
        }
    }

    const rows = db.prepare(`
        SELECT rowid, word, wikt_definition, difficulty, sense_count
        FROM words
        WHERE 1=1
        AND difficulty <= 5
    `).all();

    let removedCount = 0;
    const deleteStmt = db.prepare(`DELETE FROM words WHERE rowid = ?`);

    for (const row of rows) {
        if (allowlist.has(row.word)) continue;

        let isJunk = false;
        for (const suffix of suffixes) {
            if (row.word.endsWith(suffix) && row.word.length > suffix.length + 2) {
                const wordRank = freqMap.get(row.word);

                // If word is in top 50K of frequency, it's real
                if (wordRank && wordRank < 50000) continue;

                // Check for junk definition patterns
                if (/^(Without|Lacking|Devoid of|Having no|Free from|Not having) /.test(row.wikt_definition) ||
                    /^(Full of|Having|Characterized by|Abounding|Rich in) /.test(row.wikt_definition) ||
                    /^(The state|The quality|The condition|The property|The act) of /.test(row.wikt_definition) ||
                    /^In a .* manner/.test(row.wikt_definition) ||
                    /^With(out)? .*(scored|scored|made|done)/.test(row.wikt_definition)) {

                    if (!wordRank || wordRank > 100000) {
                        isJunk = true;
                        break;
                    }
                }
            }
        }

        if (isJunk) {
            deleteStmt.run(row.rowid);
            removedCount++;
        }
    }

    console.log(`Removed: ${removedCount} suffix junk words`);
    totalRemoved += removedCount;
}

// ═══════════════════════════════════════════════════════════════
// FIX 10: Remove "Obsolete" and "Archaic" primary definitions
// ═══════════════════════════════════════════════════════════════
function removeObsolete() {
    console.log('\n═══ FIX 10: Remove obsolete/archaic primary definitions ═══');

    const rows = db.prepare(`
        SELECT rowid, word, wikt_definition, difficulty
        FROM words
        WHERE 1=1
        AND (wikt_definition LIKE 'Obsolete %'
             OR wikt_definition LIKE 'Archaic %'
             OR wikt_definition LIKE 'Obsolete:%'
             OR wikt_definition LIKE 'Archaic:%'
             OR wikt_definition LIKE '(Obsolete)%'
             OR wikt_definition LIKE '(Archaic)%')
        AND difficulty <= 6
    `).all();

    console.log(`Found ${rows.length} obsolete/archaic definitions at diff<=6`);
    rows.slice(0, 15).forEach(r => console.log(`  ${r.word.padEnd(22)} [d${r.difficulty}] ${r.wikt_definition.substring(0, 60)}`));

    let removedCount = 0;
    const deleteStmt = db.prepare(`DELETE FROM words WHERE rowid = ?`);

    for (const row of rows) {
        // Check for better definition
        const altRow = db.prepare(`
            SELECT rowid FROM words
            WHERE word = ? AND 1=1 AND rowid != ?
            AND wikt_definition NOT LIKE 'Obsolete%'
            AND wikt_definition NOT LIKE 'Archaic%'
            AND wikt_definition NOT LIKE '(Obsolete)%'
            AND wikt_definition NOT LIKE '(Archaic)%'
            AND length(wikt_definition) > 15
            ORDER BY sense_count DESC
            LIMIT 1
        `).get(row.word, row.rowid);

        deleteStmt.run(row.rowid);
        removedCount++;
    }

    console.log(`Removed: ${removedCount}`);
    totalRemoved += removedCount;
}

// ═══════════════════════════════════════════════════════════════
// Run all fixes
// ═══════════════════════════════════════════════════════════════

const beforeCount = db.prepare(`SELECT COUNT(*) as cnt FROM words WHERE 1=1`).get().cnt;
console.log(`\nBefore: ${beforeCount} pipeline words`);

removeMisspellings();
removeInappropriate();
removeEllipsis();
removeClippings();
removeAlternativeForms();
removeShortDefs();
cleanWiktionaryArtifacts();
removeFabricatedPrefixWords();
removeSuffixJunk();
removeObsolete();

const afterCount = db.prepare(`SELECT COUNT(*) as cnt FROM words WHERE 1=1`).get().cnt;
console.log(`\n═══════════════════════════════════════`);
console.log(`Before: ${beforeCount}`);
console.log(`After:  ${afterCount}`);
console.log(`Removed: ${totalRemoved}`);
console.log(`Fixed:   ${totalFixed}`);

db.close();
