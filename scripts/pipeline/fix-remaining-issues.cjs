/**
 * fix-remaining-issues.cjs — Fix obsolete_tag_def, html_in_example, long_example
 *
 * - Strips "(archaic)" and "(obsolete)" from definitions
 * - Replaces specific HTML/long examples with clean ones
 */
const fs = require('fs');
const path = require('path');

const WORDS_DIR = path.join(__dirname, '..', '..', 'src', 'domains', 'spelling', 'words');
const files = fs.readdirSync(WORDS_DIR)
    .filter(f => /^tier\d+.*pipeline.*\.ts$/.test(f) && !f.match(/^tier\d+-pipeline\.ts$/))
    .sort();

// Specific example replacements for html_in_example and long_example
const EXAMPLE_REPLACEMENTS = {
    pdoc: "After months of therapy, she finally found a pdoc who understood her needs.",
    strikethrough: "The editor drew a strikethrough across the sentence to show it should be deleted.",
    addressing: "The addressing of hundreds of wedding invitations took the whole family an entire weekend.",
};

let tagsFix = 0;
let exFix = 0;

for (const f of files) {
    const filePath = path.join(WORDS_DIR, f);
    const src = fs.readFileSync(filePath, 'utf-8');
    const assignMatch = src.match(/SpellingWord\[\]\s*=\s*/);
    if (!assignMatch) continue;
    const prefix = src.slice(0, assignMatch.index + assignMatch[0].length);
    let arrayContent = src.slice(assignMatch.index + assignMatch[0].length).trimEnd();
    if (arrayContent.endsWith(';')) arrayContent = arrayContent.slice(0, -1);

    let words;
    try { words = JSON.parse(arrayContent); } catch(e) { continue; }

    let fileChanged = false;
    for (const w of words) {
        // Strip "(archaic)" and "(obsolete)" from definitions
        if (/\(obsolete\)|\(archaic\)/i.test(w.definition)) {
            const oldDef = w.definition;
            w.definition = w.definition
                .replace(/\s*\(archaic\)\s*/gi, ' ')
                .replace(/\s*\(obsolete\)\s*/gi, ' ')
                .replace(/\s{2,}/g, ' ')
                .trim();
            // If the tag was at the end, re-trim and ensure period
            if (w.definition.endsWith(' .')) w.definition = w.definition.slice(0, -2) + '.';
            console.log(`  DEF TAG: "${w.word}" in ${f} — removed archaic/obsolete tag`);
            tagsFix++;
            fileChanged = true;
        }

        // Replace specific examples
        const word = w.word.toLowerCase();
        if (Object.hasOwn(EXAMPLE_REPLACEMENTS, word)) {
            w.exampleSentence = EXAMPLE_REPLACEMENTS[word];
            console.log(`  EXAMPLE: "${w.word}" in ${f} — replaced`);
            exFix++;
            fileChanged = true;
        }
    }

    if (fileChanged) {
        const output = prefix + JSON.stringify(words, null, 4) + ';\n';
        fs.writeFileSync(filePath, output);
    }
}

console.log(`\nDone: ${tagsFix} definition tags stripped, ${exFix} examples replaced`);
