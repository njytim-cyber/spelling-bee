/**
 * extract-tier-metas.cjs — Extract meta template words for a given tier
 * Usage: node scripts/pipeline/extract-tier-metas.cjs <tier-number>
 * Output: JSON with word, definition, partOfSpeech for each meta template word
 */
const fs = require('fs');
const path = require('path');

const tier = process.argv[2];
if (!tier) { console.error('Usage: node extract-tier-metas.cjs <tier-number>'); process.exit(1); }

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'all-issues-manifest.json'), 'utf-8'));
const result = {};
const prefix = `tier${tier}`;

for (const [f, words] of Object.entries(manifest)) {
    if (!f.startsWith(prefix)) continue;
    for (const w of words) {
        if (w.issues.includes('meta_template')) {
            result[w.word] = { def: w.definition, pos: w.partOfSpeech, file: f };
        }
    }
}

console.log(JSON.stringify(result, null, 2));
console.error(`\nTotal: ${Object.keys(result).length} words in tier ${tier}`);
