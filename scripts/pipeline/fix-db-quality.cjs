/**
 * fix-db-quality.cjs
 *
 * Fixes four data quality issues in the pipeline DB:
 *
 * 1. DEFINITION SENSE: For words with multiple POS rows, the "words" table
 *    may have the wrong row as primary. Fix: for each word, pick the row
 *    with the highest sense_count (most polysemous = most common usage).
 *    Among same sense_count, prefer verb > noun > adjective > adverb.
 *
 * 2. JUNK DERIVED WORDS: Filter out fabricated prefix+root combinations
 *    that no real person uses (unchild, outsend, misluck, etc.).
 *    Heuristic: word has a productive prefix (un-, out-, mis-, non-, pre-,
 *    over-) AND is not in the frequency list AND has ≤ 1 Wiktionary sense.
 *
 * 3. ABBREVIATIONS & NON-WORDS: Remove words ≤ 2 chars, words with periods,
 *    and single-letter words from the pipeline.
 *
 * 4. INAPPROPRIATE CONTENT: Flag words that are inappropriate for a kids'
 *    spelling app (profanity, sexual terms, slurs, etc.) by clearing their tier.
 *
 * Usage:
 *   node scripts/pipeline/fix-db-quality.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');
const FREQ_PATH = path.join(__dirname, '..', 'data', 'en_freq_full.txt');

// ── Load frequency data for junk-word detection ─────────────────────────────

function loadFreqSet() {
    console.log('Loading frequency data...');
    const text = fs.readFileSync(FREQ_PATH, 'utf8');
    const lines = text.split('\n');
    const set = new Set();
    for (const line of lines) {
        const sp = line.lastIndexOf(' ');
        if (sp < 0) continue;
        set.add(line.slice(0, sp).toLowerCase().trim());
    }
    console.log(`  ${set.size.toLocaleString()} entries`);
    return set;
}

// ── Fix 1: Promote best POS row to have the primary definition ──────────────

// POS priority: verb > noun > adjective > adverb (for common words,
// verb/noun senses are what people think of first)
const POS_PRIORITY = { verb: 4, noun: 3, adjective: 2, adverb: 1 };

/**
 * Score a definition's quality for a kids' spelling app.
 * Higher = better primary definition.
 */
function scoreDefinition(def) {
    if (!def) return 0;
    let score = 0;

    // Penalize cross-references, form-of, and meta-definitions
    if (/^(present participle|past tense|simple past|gerund|plural) (of|and)\b/i.test(def)) return -100;
    if (/^Ellipsis of\b/i.test(def)) score -= 50;
    if (/^(Clipping|Short form|Abbreviation) of\b/i.test(def)) score -= 20; // mild penalty — clippings are often the common usage
    if (/^(A member of|Someone from|Relating to|Pertaining to) (the|an?)\b/i.test(def)) score -= 20;

    // Penalize obscure/technical/archaic definitions
    if (/\b(obsolete|archaic|dialectal|rare|dated)\b/i.test(def)) score -= 40;
    if (/\b(heraldry|falconry|nautical|botany|zoology|mineralogy)\b/i.test(def)) score -= 15;
    if (/\bAncient Rome\b|In Ancient/i.test(def)) score -= 30;

    // Reward definitions that sound like everyday usage
    if (def.length >= 20 && def.length <= 200) score += 10; // good length
    if (/^(To |A |An |The |One who|Something|Someone)/.test(def)) score += 5; // standard pattern

    return score;
}

function fixDefinitionSenses(db, dryRun) {
    console.log('\n── Fix 1: Definition sense selection ──');

    // Find words with multiple rows
    const dupes = db.prepare(`
        SELECT word, COUNT(*) as cnt
        FROM words
        WHERE tier IS NOT NULL AND tier > 0
        GROUP BY word HAVING cnt > 1
    `).all();

    console.log(`  Words with multiple POS rows: ${dupes.length.toLocaleString()}`);

    let fixed = 0;
    const examples = [];

    for (const { word } of dupes) {
        const rows = db.prepare(
            'SELECT id, pos, definition, wikt_definition, sense_count, wikt_sense_count, wikt_example, wikt_ipa, wikt_etymology FROM words WHERE word = ? ORDER BY sense_count DESC'
        ).all(word);

        // Score each row holistically:
        //   - sense_count (more senses = more common usage)
        //   - POS priority (verb/noun preferred over adj/adv for ambiguous words)
        //   - definition quality (penalize archaic/obscure defs)
        //   - has example sentence (more useful for export)
        let bestRow = rows[0];
        let bestScore = -Infinity;

        for (const row of rows) {
            const def = row.wikt_definition || row.definition || '';
            let score = 0;

            // Sense count: primary signal
            score += (row.sense_count || 0) * 10;

            // POS priority: small tiebreaker
            score += (POS_PRIORITY[row.pos] || 0) * 3;

            // Definition quality
            score += scoreDefinition(def);

            // Bonus for having supplementary data
            if (row.wikt_example) score += 5;
            if (row.wikt_ipa) score += 3;
            if (row.wikt_etymology) score += 2;

            if (score > bestScore) {
                bestRow = row;
                bestScore = score;
            }
        }

        // Only swap if the current primary has a genuinely bad definition
        // AND the best row has a meaningfully better one.
        // Don't swap just because another POS has marginally more senses.
        const primaryRow = rows[0];
        const primaryDef = primaryRow.wikt_definition || primaryRow.definition || '';
        const primaryDefScore = scoreDefinition(primaryDef);
        const bestDef = bestRow.wikt_definition || bestRow.definition || '';
        const bestDefScore = scoreDefinition(bestDef);

        // Only swap if: (a) different row, (b) primary def is bad OR best def is significantly better
        const shouldSwap = primaryRow.id !== bestRow.id &&
            (primaryDefScore < -20 || bestDefScore - primaryDefScore > 30);

        if (shouldSwap) {
            fixed++;
            if (examples.length < 10) {
                examples.push({
                    word,
                    oldDef: (primaryRow.wikt_definition || primaryRow.definition || '').slice(0, 50),
                    oldPOS: primaryRow.pos,
                    newDef: (bestRow.wikt_definition || bestRow.definition || '').slice(0, 50),
                    newPOS: bestRow.pos,
                });
            }

            if (!dryRun) {
                // Copy the best row's data to the primary row (the one export will pick)
                db.prepare(`
                    UPDATE words SET
                        definition = ?,
                        wikt_definition = ?,
                        pos = ?,
                        sense_count = ?,
                        wikt_sense_count = ?,
                        wikt_example = COALESCE(?, wikt_example),
                        wikt_ipa = COALESCE(?, wikt_ipa),
                        wikt_etymology = COALESCE(?, wikt_etymology)
                    WHERE id = ?
                `).run(
                    bestRow.wikt_definition || bestRow.definition,
                    bestRow.wikt_definition,
                    bestRow.pos,
                    bestRow.sense_count,
                    bestRow.wikt_sense_count,
                    bestRow.wikt_example,
                    bestRow.wikt_ipa,
                    bestRow.wikt_etymology,
                    primaryRow.id,
                );
            }
        }
    }

    console.log(`  Fixed: ${fixed} words promoted to better POS/definition`);
    if (examples.length > 0) {
        console.log('  Examples:');
        for (const e of examples) {
            console.log(`    ${e.word}: ${e.oldPOS}("${e.oldDef}") → ${e.newPOS}("${e.newDef}")`);
        }
    }
    return fixed;
}

// ── Fix 2: Remove junk derived words ────────────────────────────────────────

const PRODUCTIVE_PREFIXES = ['un', 'out', 'mis', 'non', 'pre', 'over', 'under', 'anti', 'dis', 're', 'super', 'semi', 'inter'];
const PRODUCTIVE_SUFFIXES = ['ness', 'less', 'ful', 'ment', 'tion', 'sion', 'ish', 'like', 'wise', 'ward', 'wards'];

// Some prefix+root combos that are real words despite being uncommon
const PREFIX_ALLOWLIST = new Set([
    'unicorn', 'uniform', 'universe', 'understand', 'undo', 'unfair', 'unknown',
    'review', 'return', 'record', 'remove', 'replace', 'resist', 'respond',
    'disagree', 'disappear', 'discover', 'discuss', 'disease', 'display',
    'prevent', 'prepare', 'present', 'pretend', 'preserve',
    'mistake', 'misery', 'mission', 'missile', 'mischief',
    'outside', 'output', 'outline', 'outstanding', 'outcome',
    'overcome', 'overlap', 'overlook', 'overnight', 'oversee',
    'underground', 'underneath',
    'antique', 'anticipate', 'antibody', 'antibiotic',
    'interact', 'interest', 'internet', 'interview', 'interrupt',
    'superhero', 'supermarket', 'superman', 'supernatural',
]);

function isJunkDerived(word, freqSet, senseCount) {
    const w = word.toLowerCase();

    // If it's in the frequency list, it's a real word people use
    if (freqSet.has(w)) return false;

    // If allowlisted, keep it
    if (PREFIX_ALLOWLIST.has(w)) return false;

    // Must have ≤ 2 Wiktionary senses to be considered junk
    // (words with many senses are almost certainly real)
    if (senseCount > 2) return false;

    // Check productive prefix patterns that generate junk
    for (const pre of PRODUCTIVE_PREFIXES) {
        if (w.startsWith(pre) && w.length > pre.length + 2) {
            const root = w.slice(pre.length);
            // If the root is a common word but the prefixed form isn't in freq list → junk
            if (freqSet.has(root) && !freqSet.has(w)) return true;
        }
    }

    // Check productive suffix patterns
    for (const suf of PRODUCTIVE_SUFFIXES) {
        if (w.endsWith(suf) && w.length > suf.length + 2) {
            const root = w.slice(0, -suf.length);
            // Restore silent-e for -ness/-less/-ful/-ment etc.
            const rootE = root + 'e';
            if ((freqSet.has(root) || freqSet.has(rootE)) && !freqSet.has(w)) {
                // Only flag if sense count is 1 (trivially derived)
                if (senseCount <= 1) return true;
            }
        }
    }

    return false;
}

function removeJunkWords(db, freqSet, dryRun) {
    console.log('\n── Fix 2: Remove junk derived words ──');

    const words = db.prepare(
        'SELECT id, word, sense_count, wikt_sense_count FROM words WHERE tier IS NOT NULL AND tier > 0'
    ).all();

    let removed = 0;
    const examples = [];

    for (const w of words) {
        const sc = w.wikt_sense_count || w.sense_count || 1;
        if (isJunkDerived(w.word, freqSet, sc)) {
            removed++;
            if (examples.length < 15) examples.push(w.word);
            if (!dryRun) {
                db.prepare('UPDATE words SET tier = NULL WHERE id = ?').run(w.id);
            }
        }
    }

    console.log(`  Junk derived words removed: ${removed.toLocaleString()}`);
    if (examples.length > 0) {
        console.log(`  Examples: ${examples.join(', ')}`);
    }
    return removed;
}

// ── Fix 3: Remove abbreviations, non-alpha, too-short words ─────────────────

function removeNonWords(db, dryRun) {
    console.log('\n── Fix 3: Remove non-words ──');

    // Words with periods, digits, spaces, ≤ 2 chars, or > 25 chars
    const bad = db.prepare(`
        SELECT id, word FROM words
        WHERE tier IS NOT NULL AND tier > 0
        AND (
            LENGTH(word) <= 2
            OR LENGTH(word) > 25
            OR word LIKE '%.%'
            OR word LIKE '% %'
            OR word GLOB '*[0-9]*'
            OR word != LOWER(word)
        )
    `).all();

    console.log(`  Non-words found: ${bad.length}`);
    if (bad.length > 0) {
        console.log(`  Examples: ${bad.slice(0, 15).map(w => w.word).join(', ')}`);
    }

    if (!dryRun) {
        db.prepare(`
            UPDATE words SET tier = NULL
            WHERE tier IS NOT NULL AND tier > 0
            AND (
                LENGTH(word) <= 2
                OR LENGTH(word) > 25
                OR word LIKE '%.%'
                OR word LIKE '% %'
                OR word GLOB '*[0-9]*'
                OR word != LOWER(word)
            )
        `).run();
    }

    return bad.length;
}

// ── Fix 4: Remove inappropriate words ───────────────────────────────────────

const INAPPROPRIATE_WORDS = new Set([
    // Sexual/anatomical terms inappropriate for kids
    'cuckold', 'cuckoldry', 'cuckquean', 'concubine', 'concubinage',
    'dominatrix', 'orgasm', 'orgasmic', 'coitus', 'copulate', 'copulation',
    'fornicate', 'fornication', 'fornicator', 'ejaculate', 'ejaculation',
    'phallus', 'phallic', 'priapism', 'erection', 'erectile',
    'sodomite', 'sodomy', 'sodomize', 'bugger', 'buggery',
    'masturbate', 'masturbation', 'fellatio', 'cunnilingus',
    'prostitute', 'prostitution', 'harlot', 'whore', 'whorehouse',
    'brothel', 'bordello', 'pimp', 'pimping',
    'adultery', 'adulterer', 'adulteress',
    'testicle', 'testicular', 'scrotum', 'scrotal',
    'vagina', 'vaginal', 'vulva', 'vulvar',
    'penis', 'penile', 'clitoris', 'clitoral',
    'nipple', 'areola', 'bosom', 'breast',
    'buttock', 'buttocks',

    // Profanity
    'damn', 'damnation', 'damned', 'goddamn',
    'hell', 'hellish', 'hellfire',
    'bastard', 'bitch', 'bitchy',
    'crap', 'crappy',
    'piss', 'pissed',
    'slut', 'slutty', 'sluttish',
    'whoredom',

    // Slurs and derogatory terms
    'retard', 'retarded', 'retardation',
    'midget', 'cripple', 'crippled',
    'idiot', 'idiotic', 'imbecile', 'moron', 'moronic',

    // Drug references
    'cocaine', 'heroin', 'methamphetamine', 'marijuana',
    'cannabis', 'opium', 'morphine',

    // Violence (extremely graphic)
    'disembowel', 'disembowelment', 'dismember', 'dismemberment',
    'decapitate', 'decapitation', 'eviscerate', 'evisceration',

    // Brand names / proper nouns that snuck through
    'lexus', 'velux', 'xerox', 'teflon', 'jacuzzi',
    'adidas', 'nike', 'gucci', 'prada',
]);

// Pattern-based inappropriate detection
const INAPPROPRIATE_PATTERNS = [
    /^fuck/i, /fuck$/i,
    /^shit/i, /shit$/i, /^ass(?:hole|wipe|hat)/i,
    /^cock(?!ade|atoo|atiel|erel|le|ney|pit|roach|tail)/i,  // Exclude cockade, cockatoo, etc.
    /^dic?k(?!ey|ens)/i,   // Exclude dickey, dickens
    /^tit(?!an|le|he|ular|bit)/i,  // Exclude titan, title, tithe, titular, titbit
    /^nig(?!ht|ger|eria)/i,   // Avoid partial matches to legitimate words
    /^fag(?!ot)/i,
];

function removeInappropriate(db, dryRun) {
    console.log('\n── Fix 4: Remove inappropriate words ──');

    const words = db.prepare(
        'SELECT id, word FROM words WHERE tier IS NOT NULL AND tier > 0'
    ).all();

    let removed = 0;
    const examples = [];

    for (const w of words) {
        const wl = w.word.toLowerCase();
        let inappropriate = INAPPROPRIATE_WORDS.has(wl);

        if (!inappropriate) {
            for (const pat of INAPPROPRIATE_PATTERNS) {
                if (pat.test(wl)) { inappropriate = true; break; }
            }
        }

        if (inappropriate) {
            removed++;
            if (examples.length < 20) examples.push(w.word);
            if (!dryRun) {
                db.prepare('UPDATE words SET tier = NULL WHERE id = ?').run(w.id);
            }
        }
    }

    console.log(`  Inappropriate words removed: ${removed}`);
    if (examples.length > 0) {
        console.log(`  Examples: ${examples.join(', ')}`);
    }
    return removed;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    const freqSet = loadFreqSet();
    const db = new Database(DB_PATH);

    const beforeCount = db.prepare('SELECT COUNT(*) as c FROM words WHERE tier IS NOT NULL AND tier > 0').get().c;
    console.log(`\nPipeline words before: ${beforeCount.toLocaleString()}`);

    // Run all fixes
    const fix1 = fixDefinitionSenses(db, dryRun);
    const fix2 = removeJunkWords(db, freqSet, dryRun);
    const fix3 = removeNonWords(db, dryRun);
    const fix4 = removeInappropriate(db, dryRun);

    const afterCount = db.prepare('SELECT COUNT(*) as c FROM words WHERE tier IS NOT NULL AND tier > 0').get().c;
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Pipeline words after: ${afterCount.toLocaleString()} (removed ${(beforeCount - afterCount).toLocaleString()})`);
    console.log(`  Fix 1 (definition senses): ${fix1} promoted`);
    console.log(`  Fix 2 (junk derived): ${fix2} removed`);
    console.log(`  Fix 3 (non-words): ${fix3} removed`);
    console.log(`  Fix 4 (inappropriate): ${fix4} removed`);

    if (dryRun) {
        console.log('\n[DRY RUN] No changes written.');
    } else {
        console.log('\nDB updated. Next steps:');
        console.log('  1. node scripts/pipeline/reassign-difficulty.cjs');
        console.log('  2. node scripts/pipeline/export-to-app.cjs');
    }

    db.close();
}

main();
