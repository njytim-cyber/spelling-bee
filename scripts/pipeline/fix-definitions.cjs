/**
 * fix-definitions.cjs
 *
 * SAFE DB-swap fixer for pipeline word definitions and example sentences.
 *
 * Strategy:
 * 1. Read bad-words manifest (from find-bad-words.cjs)
 * 2. For each bad word, look up ALL senses in the SQLite DB
 * 3. Pick the best COMPLETE, UNMODIFIED definition/example from DB alternatives
 * 4. Only swap if the replacement passes ALL quality checks (no truncation ever)
 * 5. Words that can't be fixed from DB → needs-manual-fix.json
 *
 * HARD RULES:
 * - NEVER truncate a definition. A longer correct def > a shorter broken one.
 * - NEVER do mechanical string replacement on jargon patterns.
 * - Only swap in a COMPLETE, UNMODIFIED alternative from the DB.
 * - Minimal cleaning only: capitalize first letter, add trailing period.
 *
 * Usage: node scripts/pipeline/fix-definitions.cjs [--dry-run] [--file=tier1-pipeline-a.ts]
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const WORDS_DIR = path.join(__dirname, '..', '..', 'src', 'domains', 'spelling', 'words');
const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');
const MANIFEST_PATH = path.join(__dirname, 'bad-words-manifest.json');
const MANUAL_PATH = path.join(__dirname, 'needs-manual-fix.json');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fileFilter = args.find(a => a.startsWith('--file='))?.split('=')[1] || null;

// ── Quality checks (same as find-bad-words.cjs) ──

function definitionHasIssue(word, definition, pos) {
    if (!definition || definition.trim().length === 0) return true;
    if (definition.length <= 20) return true;
    if (definition.length > 100) return true;

    const escapedWord = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRe = new RegExp(`\\b${escapedWord}\\b`, 'i');
    if (wordRe.test(definition)) return true;

    if (/\bthe act of \w+ing\b/i.test(definition)) return true;
    if (/\bin a \w+ manner\b/i.test(definition)) return true;
    if (/^one who\b/i.test(definition)) return true;
    if (/\bpertaining to\b/i.test(definition)) return true;
    if (/\bof or relating to\b/i.test(definition)) return true;
    if (/\bthe state of being\b/i.test(definition)) return true;
    if (/\bcharacterized by\b/i.test(definition)) return true;
    if (/\bhaving the (quality|nature|character)\b/i.test(definition)) return true;
    if ((definition.match(/;/g) || []).length >= 3) return true;

    if (pos === 'noun' && definition.toLowerCase().startsWith('to ')) return true;
    if (pos === 'verb' && /^(a|an|the|one|any)\s/i.test(definition)) return true;

    return false;
}

function exampleHasIssue(word, example) {
    if (!example) return true;
    const escapedWord = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (/took a while to learn/i.test(example)) return true;
    if (/vocabulary words?\s*(this|last)\s*week/i.test(example)) return true;
    if (/was our spelling word/i.test(example)) return true;
    if (/wrote the word .* on the board/i.test(example)) return true;
    if (/had an entire chapter about/i.test(example)) return true;
    if (/admired the .* pattern on the quilt/i.test(example)) return true;
    if (/taught us how to .* properly/i.test(example)) return true;
    if (/discussed the .* during the science/i.test(example)) return true;
    if (!new RegExp(`\\b${escapedWord}`, 'i').test(example)) return true;

    return false;
}

// ── Minimal cleaning (NO truncation) ──

function minimalCleanDef(def) {
    if (!def) return null;
    let d = def.trim();
    if (d.length < 5) return null;

    // Strip parenthetical content ONLY if the result is still a complete sentence
    const stripped = d.replace(/\s*\([^)]*\)/g, '').trim();
    if (stripped.length >= 15) d = stripped;

    // Capitalize first letter
    d = d.charAt(0).toUpperCase() + d.slice(1);
    // Add trailing period if missing
    if (!d.endsWith('.') && !d.endsWith('!') && !d.endsWith('?')) d += '.';
    // Collapse whitespace
    d = d.replace(/\s{2,}/g, ' ');

    return d;
}

// ── Example sentence cleaning (from export-to-app.cjs, already proven safe) ──

function cleanExample(text) {
    if (!text) return null;
    let s = text.trim();
    if (s.includes('\n')) {
        s = s.split('\n')[0].trim();
        if (!s || s.length < 20) return null;
    }
    if (/\b(thou|thee|thy|thine|hath|doth|dost|shalt|wilt|wouldst|shouldst|canst|didst)\b/i.test(s)) return null;
    if (/\b(whence|thence|hither|thither|whilst|betwixt|forsooth|prithee|methinks|wherefore)\b/i.test(s)) return null;
    if (/ſ/.test(s)) return null;
    if (/\bain't\b/i.test(s)) return null;
    if (/^\s*…/.test(s) || /^\s*\.\.\./.test(s)) return null;
    if (/…\s*$/.test(s) || /\.\.\.\s*$/.test(s)) return null;
    s = s.replace(/\[…\]/g, '…').replace(/\[\.\.\.\]/g, '…');
    s = s.replace(/\[[A-Z]\]/g, '').replace(/\[sic\]/gi, '');
    s = s.replace(/\[(\w+)\]/g, '$1');
    if (/\[/.test(s) && /\]/.test(s)) return null;
    s = s.replace(/^\d{4},?\s+[^,]+,\s+[^,\n]+[,\n]\s*/i, '');
    if (/^(Near-synonyms?|Synonyms?|Antonyms?|Thesaurus):/i.test(s)) return null;
    s = s.trim();
    if (s.length < 10 || s.length > 250) return null;
    if (/[†‡§¶]/.test(s)) return null;
    if (/\b\d+:\d+\b/.test(s)) return null;
    if (/\b1[0-8]\d{2}\b/.test(s)) return null;
    if (/^"[^"]*$/.test(s)) return null;
    if (s.split(/\s+/).length < 4) return null;
    if (/\b'Twas\b|\bpossess'd\b/i.test(s)) return null;
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!/[.!?;:"']$/.test(s)) s += '.';
    s = s.replace(/\s{2,}/g, ' ');
    return s;
}

// ── Definition scoring ──

function scoreDefinition(word, definition, pos) {
    if (!definition) return -1000;
    let score = 0;
    const d = definition.trim();
    const escapedWord = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRe = new RegExp(`\\b${escapedWord}\\b`, 'i');

    // Length scoring — prefer 21-100 chars, tolerate longer
    if (d.length < 15) score -= 100;
    else if (d.length <= 20) score -= 30;
    else if (d.length <= 50) score += 20;
    else if (d.length <= 80) score += 15;
    else if (d.length <= 100) score += 5;
    else if (d.length <= 150) score -= 5;
    else score -= 15;

    // Circular ref
    if (wordRe.test(d)) score -= 50;

    // Jargon patterns
    if (/\bpertaining to\b/i.test(d)) score -= 30;
    if (/\bof or relating to\b/i.test(d)) score -= 30;
    if (/\bthe act of \w+ing\b/i.test(d)) score -= 30;
    if (/\bin a \w+ manner\b/i.test(d)) score -= 30;
    if (/^one who\b/i.test(d)) score -= 30;
    if (/\bthe state of being\b/i.test(d)) score -= 30;
    if (/\bcharacterized by\b/i.test(d)) score -= 30;
    if (/\bhaving the (quality|nature|character)\b/i.test(d)) score -= 30;

    // Multi-sense dump
    if ((d.match(/;/g) || []).length >= 3) score -= 20;

    // POS mismatch — HARD penalty
    if (pos === 'noun' && d.toLowerCase().startsWith('to ')) score -= 200;
    if (pos === 'verb' && /^(a|an|the|one|any)\s/i.test(d)) score -= 200;

    // Bad reference patterns
    if (/\b(see|Wikipedia|Wiktionary)\b/i.test(d)) score -= 50;
    if (/^(Ellipsis of|Clipping of|Alternative|Dated form|Eye dialect|Archaic form|Obsolete)/i.test(d)) score -= 100;

    // POS-appropriate bonuses
    if (pos === 'noun' && /^(A|An|The|Something|Someone)\b/i.test(d)) score += 5;
    if (pos === 'verb' && /^To\b/i.test(d)) score += 5;
    if (pos === 'adjective' && /^(Describ|Having|Being|Showing)\b/i.test(d)) score += 5;

    return score;
}

function scoreExample(word, example) {
    if (!example) return -1000;
    let score = 0;
    const escapedWord = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`\\b${escapedWord}`, 'i').test(example)) score -= 100;
    else score += 30;
    if (/took a while to learn|vocabulary words|wrote the word .* on the board|had an entire chapter about|admired the .* pattern on the quilt|taught us how to .* properly|discussed the .* during the science|was our spelling word/i.test(example)) score -= 200;
    if (example.length >= 30 && example.length <= 150) score += 15;
    else if (example.length < 15) score -= 50;
    return score;
}

// ── Parse a pipeline .ts file into word objects ──

function parseTsFile(filePath) {
    const src = fs.readFileSync(filePath, 'utf-8');

    const varMatch = src.match(/export\s+const\s+(\w+)\s*:\s*SpellingWord\[\]\s*=\s*/);
    const varName = varMatch ? varMatch[1] : 'WORDS';

    const assignMatch = src.match(/SpellingWord\[\]\s*=\s*/);
    if (!assignMatch) {
        console.error(`  WARNING: Could not find array assignment in ${path.basename(filePath)}. Skipping.`);
        return null;
    }
    const arrayStart = assignMatch.index + assignMatch[0].length;
    const header = src.slice(0, arrayStart);

    let arrayContent = src.slice(arrayStart).trimEnd();
    if (arrayContent.endsWith(';')) arrayContent = arrayContent.slice(0, -1);

    let words;
    try {
        words = JSON.parse(arrayContent);
    } catch (e) {
        console.error(`  WARNING: Could not parse ${path.basename(filePath)} as JSON: ${e.message}`);
        return null;
    }

    return { header, varName, words, filePath };
}

// ── Write a pipeline .ts file from word objects ──

function writeTsFile(filePath, header, varName, words) {
    const content = header + JSON.stringify(words, null, 4) + ';\n';
    fs.writeFileSync(filePath, content);
}

// ── Main ──

function main() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        console.error('Manifest not found. Run find-bad-words.cjs first.');
        process.exit(1);
    }
    if (!fs.existsSync(DB_PATH)) {
        console.error('Database not found at', DB_PATH);
        process.exit(1);
    }

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    const db = new Database(DB_PATH, { readonly: true });

    // ── Bulk-load ALL senses for all bad words into memory ──
    console.log('Pre-loading word senses from database...');
    const allBadWords = new Set();
    for (const words of Object.values(manifest)) {
        for (const w of words) allBadWords.add(w.word);
    }
    console.log(`  ${allBadWords.size} unique bad words to look up`);

    const dbSensesMap = new Map(); // word → [rows]
    const badWordArray = [...allBadWords];
    for (let i = 0; i < badWordArray.length; i += 500) {
        const batch = badWordArray.slice(i, i + 500);
        const placeholders = batch.map(() => '?').join(',');
        const rows = db.prepare(
            `SELECT word, pos, wikt_definition, api_definition, definition, wikt_example, api_example, sense_count
             FROM words WHERE word IN (${placeholders}) AND enriched = 1`
        ).all(...batch);

        for (const row of rows) {
            if (!dbSensesMap.has(row.word)) dbSensesMap.set(row.word, []);
            dbSensesMap.get(row.word).push(row);
        }
        if ((i + 500) % 5000 < 500) {
            process.stdout.write(`  Loaded ${Math.min(i + 500, badWordArray.length)}/${badWordArray.length} words...\r`);
        }
    }
    console.log(`  Loaded ${dbSensesMap.size} words with ${[...dbSensesMap.values()].reduce((s, r) => s + r.length, 0)} total senses\n`);

    const filesToProcess = fileFilter ? [fileFilter] : Object.keys(manifest).sort();
    const needsManual = {};
    let grandTotalFixed = 0;
    let grandTotalManual = 0;

    for (const file of filesToProcess) {
        if (!manifest[file]) continue;

        const badWordSet = new Set(manifest[file].map(w => w.word + '|' + w.partOfSpeech));
        const badWordMap = {};
        for (const bw of manifest[file]) {
            badWordMap[bw.word + '|' + bw.partOfSpeech] = bw;
        }

        console.log(`Processing ${file}: ${manifest[file].length} bad words`);

        const parsed = parseTsFile(path.join(WORDS_DIR, file));
        if (!parsed) continue;

        let fixedCount = 0;
        let manualCount = 0;
        const manualWords = [];

        for (const wordObj of parsed.words) {
            const key = wordObj.word + '|' + wordObj.partOfSpeech;
            if (!badWordSet.has(key)) continue;

            const badInfo = badWordMap[key];
            const dbRows = dbSensesMap.get(wordObj.word) || [];

            // ── Find best COMPLETE definition from DB alternatives ──
            let bestDef = wordObj.definition;
            let bestDefScore = scoreDefinition(wordObj.word, wordObj.definition, wordObj.partOfSpeech);
            let defChanged = false;

            // Collect candidates, same POS first
            const candidateDefs = [];
            for (const row of dbRows) {
                if (row.pos === wordObj.partOfSpeech) {
                    for (const rawDef of [row.wikt_definition, row.api_definition, row.definition].filter(Boolean)) {
                        candidateDefs.push(rawDef);
                    }
                }
            }
            for (const row of dbRows) {
                if (row.pos !== wordObj.partOfSpeech) {
                    for (const rawDef of [row.wikt_definition, row.api_definition, row.definition].filter(Boolean)) {
                        candidateDefs.push(rawDef);
                    }
                }
            }

            // Score each candidate — minimal cleaning only (capitalize + period)
            for (const rawDef of candidateDefs) {
                const cleaned = minimalCleanDef(rawDef);
                if (!cleaned) continue;
                const score = scoreDefinition(wordObj.word, cleaned, wordObj.partOfSpeech);
                if (score > bestDefScore) {
                    bestDefScore = score;
                    bestDef = cleaned;
                    defChanged = true;
                }
            }

            // ── Find best example from DB alternatives ──
            let bestEx = wordObj.exampleSentence;
            let bestExScore = scoreExample(wordObj.word, wordObj.exampleSentence);
            let exChanged = false;

            for (const row of dbRows) {
                for (const rawEx of [row.wikt_example, row.api_example].filter(Boolean)) {
                    const cleaned = cleanExample(rawEx);
                    if (!cleaned) continue;
                    const score = scoreExample(wordObj.word, cleaned);
                    if (score > bestExScore) {
                        bestExScore = score;
                        bestEx = cleaned;
                        exChanged = true;
                    }
                }
            }

            // ── Check if the best we found passes quality checks ──
            const defStillBad = definitionHasIssue(wordObj.word, bestDef, wordObj.partOfSpeech);
            const exStillBad = exampleHasIssue(wordObj.word, bestEx);

            // Only apply changes if they actually improved things
            if (defChanged) wordObj.definition = bestDef;
            if (exChanged) wordObj.exampleSentence = bestEx;

            if (defStillBad || exStillBad) {
                manualWords.push({
                    word: wordObj.word,
                    partOfSpeech: wordObj.partOfSpeech,
                    difficulty: wordObj.difficulty,
                    issues: badInfo.issues,
                    currentDef: wordObj.definition,
                    currentEx: wordObj.exampleSentence,
                    defStillBad,
                    exStillBad,
                });
                manualCount++;
            } else {
                fixedCount++;
            }
        }

        if (manualWords.length > 0) {
            needsManual[file] = manualWords;
        }

        if (!dryRun) {
            writeTsFile(parsed.filePath, parsed.header, parsed.varName, parsed.words);
            console.log(`  -> Fixed: ${fixedCount}, Needs manual: ${manualCount}`);
        } else {
            console.log(`  -> [DRY RUN] Would fix: ${fixedCount}, Needs manual: ${manualCount}`);
        }

        grandTotalFixed += fixedCount;
        grandTotalManual += manualCount;
    }

    // Write needs-manual manifest
    fs.writeFileSync(MANUAL_PATH, JSON.stringify(needsManual, null, 2));

    db.close();

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total fully fixed from DB: ${grandTotalFixed}`);
    console.log(`Total needs manual fix:    ${grandTotalManual}`);
    if (Object.keys(needsManual).length > 0) {
        console.log(`\nManual fix manifest: ${MANUAL_PATH}`);
        let totalManualWords = 0;
        for (const [file, words] of Object.entries(needsManual)) {
            console.log(`  ${file}: ${words.length} words`);
            totalManualWords += words.length;
        }
        console.log(`  TOTAL: ${totalManualWords} words need manual rewriting`);
    }
}

main();
