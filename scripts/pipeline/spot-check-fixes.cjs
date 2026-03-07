/**
 * spot-check-fixes.cjs
 *
 * Shows a sample of what the DB-swap fixer would change.
 * Run: node scripts/pipeline/spot-check-fixes.cjs [--file=tier1-pipeline-a.ts] [--count=20]
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const WORDS_DIR = path.join(__dirname, '..', '..', 'src', 'domains', 'spelling', 'words');
const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');
const MANIFEST_PATH = path.join(__dirname, 'bad-words-manifest.json');

const args = process.argv.slice(2);
const fileFilter = args.find(a => a.startsWith('--file='))?.split('=')[1] || 'tier1-pipeline-a.ts';
const maxCount = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1] || '20');

function minimalCleanDef(def) {
    if (!def) return null;
    let d = def.trim();
    if (d.length < 5) return null;
    const stripped = d.replace(/\s*\([^)]*\)/g, '').trim();
    if (stripped.length >= 15) d = stripped;
    d = d.charAt(0).toUpperCase() + d.slice(1);
    if (!d.endsWith('.') && !d.endsWith('!') && !d.endsWith('?')) d += '.';
    d = d.replace(/\s{2,}/g, ' ');
    return d;
}

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

function scoreDefinition(word, definition, pos) {
    if (!definition) return -1000;
    let score = 0;
    const d = definition.trim();
    if (d.length < 15) score -= 100;
    else if (d.length <= 20) score -= 30;
    else if (d.length <= 50) score += 20;
    else if (d.length <= 80) score += 15;
    else if (d.length <= 100) score += 5;
    else if (d.length <= 150) score -= 5;
    else score -= 15;
    const escapedWord = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRe = new RegExp(`\\b${escapedWord}\\b`, 'i');
    if (wordRe.test(d)) score -= 50;
    if (/\bpertaining to\b/i.test(d)) score -= 30;
    if (/\bof or relating to\b/i.test(d)) score -= 30;
    if (/\bthe act of \w+ing\b/i.test(d)) score -= 30;
    if (/\bin a \w+ manner\b/i.test(d)) score -= 30;
    if (/^one who\b/i.test(d)) score -= 30;
    if (/\bthe state of being\b/i.test(d)) score -= 30;
    if (/\bcharacterized by\b/i.test(d)) score -= 30;
    if (/\bhaving the (quality|nature|character)\b/i.test(d)) score -= 30;
    if ((d.match(/;/g) || []).length >= 3) score -= 20;
    if (pos === 'noun' && d.toLowerCase().startsWith('to ')) score -= 200;
    if (pos === 'verb' && /^(a|an|the|one|any)\s/i.test(d)) score -= 200;
    return score;
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
const db = new Database(DB_PATH, { readonly: true });

const badWords = manifest[fileFilter];
if (!badWords) {
    console.error(`No bad words found for ${fileFilter}`);
    process.exit(1);
}

console.log(`Spot-checking ${fileFilter}: ${badWords.length} bad words, showing up to ${maxCount} fixes\n`);

let shown = 0;
for (const bw of badWords) {
    if (shown >= maxCount) break;

    const rows = db.prepare(
        'SELECT pos, wikt_definition, api_definition, definition FROM words WHERE word = ? AND enriched = 1'
    ).all(bw.word);

    let bestDef = null;
    let bestScore = scoreDefinition(bw.word, bw.definition, bw.partOfSpeech);

    for (const row of rows) {
        // Prefer same POS
        const posPriority = row.pos === bw.partOfSpeech ? 1 : 0;
        for (const rawDef of [row.wikt_definition, row.api_definition, row.definition].filter(Boolean)) {
            const cleaned = minimalCleanDef(rawDef);
            if (!cleaned) continue;
            const score = scoreDefinition(bw.word, cleaned, bw.partOfSpeech) + posPriority;
            if (score > bestScore && !definitionHasIssue(bw.word, cleaned, bw.partOfSpeech)) {
                bestScore = score;
                bestDef = cleaned;
            }
        }
    }

    if (bestDef) {
        shown++;
        console.log(`${shown}. ${bw.word} (${bw.partOfSpeech}) [${bw.issues.join(', ')}]`);
        console.log(`   OLD: ${bw.definition}`);
        console.log(`   NEW: ${bestDef}`);
        console.log();
    }
}

console.log(`Showed ${shown} fixable words out of ${badWords.length} total bad words`);
db.close();
