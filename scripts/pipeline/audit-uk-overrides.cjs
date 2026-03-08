/**
 * audit-uk-overrides.cjs
 *
 * Comprehensive validation of UK overrides against:
 * 1. The Wiktionary DB — verifies UK spellings are real words
 * 2. The word bank — verifies US keys actually exist in tier files
 * 3. Distractor quality — checks for real-word distractors, duplicates, US form as distractor
 * 4. Rule stacking — catches missing dual-rule applications
 * 5. False friends — catches words where -ize is part of root
 *
 * Usage: node scripts/pipeline/audit-uk-overrides.cjs
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');
const OVERRIDES_PATH = path.join(__dirname, '../../src/domains/spelling/words/uk-overrides.ts');

// ── Load the DB ──────────────────────────────────────────────────────────
const db = new Database(DB_PATH, { readonly: true });

// Get all words in the Wiktionary DB (lowercase)
const allDbWords = new Set();
const rows = db.prepare('SELECT DISTINCT LOWER(word) as w FROM words').all();
for (const r of rows) allDbWords.add(r.w);
console.log(`Wiktionary DB words: ${allDbWords.size}`);

// ── Load word bank (all tier files) ─────────────────────────────────────
const wordsDir = path.join(__dirname, '../../src/domains/spelling/words');
const wordBankWords = new Set();
const tierFiles = fs.readdirSync(wordsDir).filter(f =>
    f.match(/^tier\d+(-pipeline-[a-z])?\.ts$/) && !f.match(/^tier\d+-pipeline\.ts$/)
);

for (const f of tierFiles) {
    const content = fs.readFileSync(path.join(wordsDir, f), 'utf8');
    for (const m of content.matchAll(/"word":\s*"([^"]+)"/g)) {
        wordBankWords.add(m[1].toLowerCase());
    }
    for (const m of content.matchAll(/\bword:\s*'([^']+)'/g)) {
        wordBankWords.add(m[1].toLowerCase());
    }
}
console.log(`Word bank words: ${wordBankWords.size}`);

// ── Parse UK overrides ──────────────────────────────────────────────────
const ukContent = fs.readFileSync(OVERRIDES_PATH, 'utf8');
const overrides = {};
// Parse each entry properly
const entryRegex = /'([a-z]+)':\s*\{([^}]+)\}/g;
let match;
while ((match = entryRegex.exec(ukContent)) !== null) {
    const usKey = match[1];
    const body = match[2];

    const wordMatch = body.match(/word:\s*'([^']+)'/);
    const pronMatch = body.match(/pronunciation:\s*'([^']+)'/);
    const distMatch = body.match(/distractors:\s*\[([^\]]+)\]/);

    if (wordMatch) {
        const distractors = distMatch
            ? distMatch[1].match(/'([^']+)'/g)?.map(d => d.replace(/'/g, '')) || []
            : [];

        overrides[usKey] = {
            word: wordMatch[1],
            pronunciation: pronMatch ? pronMatch[1] : null,
            distractors,
        };
    }
}
console.log(`UK overrides parsed: ${Object.keys(overrides).length}\n`);

// ── Issue trackers ──────────────────────────────────────────────────────
const issues = {
    ukNotInWiktionary: [],      // UK spelling not found in Wiktionary
    usNotInWordBank: [],        // US key not in our word bank
    distractorIsRealWord: [],   // Distractor is an actual English word
    distractorIsUsForm: [],     // Distractor = the US spelling (tricky for kids)
    distractorIsUkForm: [],     // Distractor = the correct UK answer
    distractorDuplicate: [],    // Duplicate distractors
    missingRuleStack: [],       // -or->-our + -ize->-ise both needed but only one applied
    possibleFalseFriend: [],    // Might not be a real -ize word
};

// ── Known false friends (-ize is part of root) ──────────────────────────
const FALSE_FRIEND_ROOTS = [
    'capsize', 'seize', 'prize', 'size', 'resize', 'downsize', 'oversize',
    'outsiz', 'upsize', 'midsize',
];

// ── -or stems that require -our in UK ──────────────────────────────────
const OUR_STEMS = new Set([
    'color', 'favor', 'honor', 'humor', 'labor', 'neighbor',
    'harbor', 'vigor', 'valor', 'glamor', 'armor', 'savior',
    'behavior', 'endeavor', 'clamor', 'candor', 'rancor',
    'splendor', 'parlor', 'vapor', 'odor', 'fervor', 'rigor',
    'demeanor', 'rumor', 'flavor', 'tumor',
]);

// ── Run checks ──────────────────────────────────────────────────────────
for (const [usKey, entry] of Object.entries(overrides)) {
    const { word: ukWord, distractors } = entry;

    // 1. Is UK spelling in Wiktionary?
    if (!allDbWords.has(ukWord)) {
        issues.ukNotInWiktionary.push({ usKey, ukWord });
    }

    // 2. Is US key in our word bank?
    if (!wordBankWords.has(usKey)) {
        issues.usNotInWordBank.push({ usKey, ukWord });
    }

    // 3. Check distractors
    const seenDistractors = new Set();
    for (const d of distractors) {
        // Distractor is a real English word?
        if (allDbWords.has(d)) {
            issues.distractorIsRealWord.push({ usKey, ukWord, distractor: d });
        }
        // Distractor = US form?
        if (d === usKey) {
            issues.distractorIsUsForm.push({ usKey, ukWord, distractor: d });
        }
        // Distractor = correct UK answer?
        if (d === ukWord) {
            issues.distractorIsUkForm.push({ usKey, ukWord, distractor: d });
        }
        // Duplicate?
        if (seenDistractors.has(d)) {
            issues.distractorDuplicate.push({ usKey, ukWord, distractor: d });
        }
        seenDistractors.add(d);
    }

    // 4. Rule stacking: -or word + -ize suffix -> needs BOTH -our AND -ise
    for (const stem of OUR_STEMS) {
        if (usKey.startsWith(stem) && usKey !== stem) {
            // Check if UK word has -our
            const expectedOurStem = stem.replace(/or$/, 'our');
            if (!ukWord.startsWith(expectedOurStem) && !ukWord.includes('our')) {
                if (ukWord.startsWith(stem.replace(/or$/, ''))) {
                    issues.missingRuleStack.push({
                        usKey, ukWord,
                        note: `US stem "${stem}" -> UK should have "-our" but got "${ukWord}"`,
                    });
                }
            }
        }
    }

    // Also check sulfur->sulphur stacking
    if (usKey.startsWith('sulfur') && !ukWord.startsWith('sulphur')) {
        issues.missingRuleStack.push({
            usKey, ukWord,
            note: `sulfur->sulphur rule not applied: got "${ukWord}"`,
        });
    }

    // 5. False friend check
    for (const ff of FALSE_FRIEND_ROOTS) {
        if (usKey.includes(ff) || usKey.endsWith(ff.replace(/e$/, 'ed')) || usKey.endsWith(ff.replace(/e$/, 'ing'))) {
            issues.possibleFalseFriend.push({ usKey, ukWord, root: ff });
        }
    }
}

// ── Print results ───────────────────────────────────────────────────────
let totalIssues = 0;

function printSection(title, items, formatter) {
    if (items.length === 0) {
        console.log(`\nOK: ${title} — no issues`);
        return;
    }
    console.log(`\n${'='.repeat(70)}`);
    console.log(`ISSUE: ${title} (${items.length})`);
    console.log('='.repeat(70));
    for (const item of items) {
        console.log(`  ${formatter(item)}`);
    }
    totalIssues += items.length;
}

printSection(
    'UK spelling NOT found in Wiktionary DB',
    issues.ukNotInWiktionary,
    i => `${i.usKey} -> ${i.ukWord} (UK form not in DB)`
);

printSection(
    'US key NOT in word bank (orphan override)',
    issues.usNotInWordBank,
    i => `${i.usKey} -> ${i.ukWord}`
);

printSection(
    'Distractor is a REAL English word (in Wiktionary)',
    issues.distractorIsRealWord,
    i => `${i.usKey} -> ${i.ukWord}: distractor "${i.distractor}" is a real word`
);

printSection(
    'Distractor IS the US spelling',
    issues.distractorIsUsForm,
    i => `${i.usKey} -> ${i.ukWord}: distractor "${i.distractor}" = US form`
);

printSection(
    'Distractor IS the correct UK answer',
    issues.distractorIsUkForm,
    i => `${i.usKey} -> ${i.ukWord}: distractor "${i.distractor}" = correct answer!`
);

printSection(
    'Duplicate distractors',
    issues.distractorDuplicate,
    i => `${i.usKey} -> ${i.ukWord}: duplicate distractor "${i.distractor}"`
);

printSection(
    'Missing rule stacking (-or->-our + -ize->-ise)',
    issues.missingRuleStack,
    i => `${i.usKey} -> ${i.ukWord}: ${i.note}`
);

printSection(
    'Possible false friend (root contains -ize/-size/-prize)',
    issues.possibleFalseFriend,
    i => `${i.usKey} -> ${i.ukWord} (root: ${i.root})`
);

console.log(`\n${'_'.repeat(70)}`);
console.log(`Total issues found: ${totalIssues}`);
console.log(`Total overrides: ${Object.keys(overrides).length}`);

db.close();
