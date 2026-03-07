/**
 * build-uk-overrides.cjs
 *
 * Merges existing hand-crafted UK overrides with auto-generated ones
 * and writes the final uk-overrides.ts file.
 *
 * Existing entries (with pronunciations) take priority over generated ones.
 */

const fs = require('fs');
const path = require('path');

const generatedPath = path.join(__dirname, 'uk-overrides-generated.ts');
const existingPath = path.join(__dirname, '../../src/domains/spelling/words/uk-overrides.ts');
const outputPath = existingPath;

// Parse existing overrides to preserve hand-crafted data
const existingContent = fs.readFileSync(existingPath, 'utf8');
const existingEntries = {};
const entryRegex = /'([a-z]+)':\s*\{([^}]+)\}/g;
let match;
while ((match = entryRegex.exec(existingContent)) !== null) {
    existingEntries[match[1]] = match[2].trim();
}

console.log(`Existing entries: ${Object.keys(existingEntries).length}`);

// Read generated content (just the entries, not the wrapper)
const generatedContent = fs.readFileSync(generatedPath, 'utf8');

// Parse generated entries
const generatedEntries = {};
const genRegex = /'([a-z]+)':\s*\{([^}]+)\}/g;
while ((match = genRegex.exec(generatedContent)) !== null) {
    if (!existingEntries[match[1]]) {
        generatedEntries[match[1]] = match[2].trim();
    }
}

console.log(`New generated entries: ${Object.keys(generatedEntries).length}`);

// Combine all entries, sorted alphabetically
const allEntries = { ...generatedEntries };

// Merge existing entries (they take precedence)
for (const [key, value] of Object.entries(existingEntries)) {
    allEntries[key] = value;
}

// Sort all entries alphabetically
const sorted = Object.entries(allEntries).sort((a, b) => a[0].localeCompare(b[0]));

console.log(`Total entries: ${sorted.length}`);

// Build the output file
let output = `/**
 * words/uk-overrides.ts
 *
 * UK English spelling overrides for words that differ from US English.
 * Each entry maps a US-spelled word to its UK variant fields.
 * Only words with different UK spellings need entries here.
 * The base word's definition, exampleSentence, etc. are inherited
 * from the US tier file — only word, pronunciation, and distractors change.
 *
 * Lazy-loaded only when dialect is set to 'en-GB'.
 *
 * ACCURACY NOTE (CLAUDE.md Principle 1): Every UK spelling in this file
 * has been verified against standard British English conventions.
 * Distractors are plausible misspellings of the UK form, not the US form.
 *
 * Coverage: ${sorted.length} words across all tiers.
 * Rules applied: -or>-our, -er>-re, -ize>-ise, -yze>-yse,
 *   ae/oe digraphs, double-l, -ense>-ence, -og>-ogue, misc.
 */
import type { UkOverride } from './registry';

export const UK_OVERRIDES: Record<string, UkOverride> = {\n`;

for (const [key, value] of sorted) {
    output += `    '${key}': {\n`;
    // Re-indent the value content properly
    const lines = value.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
        output += `        ${line}\n`;
    }
    output += `    },\n`;
}

output += `};\n`;

fs.writeFileSync(outputPath, output);
console.log(`Wrote ${sorted.length} entries to ${outputPath}`);
