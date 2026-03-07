/**
 * generate-uk-overrides.cjs
 *
 * Reads uk-gaps.json and generates TypeScript override entries
 * with plausible distractors for each UK spelling.
 */

const fs = require('fs');
const path = require('path');

const gaps = JSON.parse(fs.readFileSync(path.join(__dirname, 'uk-gaps.json'), 'utf8'));

/**
 * Generate 3 plausible misspelling distractors for a UK-spelled word.
 * These are common mistakes a student might make spelling the UK form.
 */
function generateDistractors(ukWord, usWord) {
    const distractors = new Set();

    // Strategy 1: Swap a vowel
    const vowelSwaps = { 'a': 'e', 'e': 'i', 'i': 'a', 'o': 'u', 'u': 'o',
                         'ou': 'uo', 'ae': 'ea', 'oe': 'eo', 'ei': 'ie' };
    for (const [from, to] of Object.entries(vowelSwaps)) {
        const idx = ukWord.indexOf(from);
        if (idx !== -1 && distractors.size < 5) {
            const d = ukWord.slice(0, idx) + to + ukWord.slice(idx + from.length);
            if (d !== ukWord && d !== usWord) distractors.add(d);
        }
    }

    // Strategy 2: Drop a letter (common in long words)
    if (ukWord.length > 5) {
        for (let i = Math.floor(ukWord.length / 3); i < ukWord.length - 1; i++) {
            if (distractors.size >= 5) break;
            const d = ukWord.slice(0, i) + ukWord.slice(i + 1);
            if (d !== ukWord && d !== usWord && d.length >= 4) {
                distractors.add(d);
            }
        }
    }

    // Strategy 3: Double a consonant
    const consonants = 'bcdfghjklmnpqrstvwxyz';
    for (let i = 1; i < ukWord.length - 1; i++) {
        if (distractors.size >= 5) break;
        if (consonants.includes(ukWord[i]) && ukWord[i] !== ukWord[i-1] && ukWord[i] !== ukWord[i+1]) {
            const d = ukWord.slice(0, i) + ukWord[i] + ukWord.slice(i);
            if (d !== ukWord && d !== usWord) distractors.add(d);
        }
    }

    // Strategy 4: Swap two adjacent letters
    for (let i = 1; i < ukWord.length - 2; i++) {
        if (distractors.size >= 5) break;
        const d = ukWord.slice(0, i) + ukWord[i+1] + ukWord[i] + ukWord.slice(i+2);
        if (d !== ukWord && d !== usWord) distractors.add(d);
    }

    // Strategy 5: Use the US spelling as a distractor (always relevant)
    if (usWord !== ukWord) {
        distractors.add(usWord);
    }

    // Take the best 3
    const result = [...distractors].slice(0, 3);

    // If we still need more, add simple suffix mutations
    while (result.length < 3) {
        const d = ukWord + 'e';
        if (!result.includes(d) && d !== ukWord) {
            result.push(d);
        } else {
            result.push(ukWord.slice(0, -1) + 'a');
        }
    }

    return result;
}

// Group by rule category for organized output
const ruleOrder = [
    'or-to-our', 'or-derivatives', 'er-to-re', 'ize-to-ise', 'ization-to-isation',
    'izing-to-ising', 'ized-to-ised', 'izer-to-iser', 'yze-to-yse', 'yzed-to-ysed',
    'yzing-to-ysing', 'ense-to-ence', 'og-to-ogue', 'ment-extra-e',
    'ae-oe-digraph', 'single-l-to-double', 'misc'
];

const ruleLabels = {
    'or-to-our': '-or → -our',
    'or-derivatives': '-or derivative → -our derivative',
    'er-to-re': '-er → -re',
    'ize-to-ise': '-ize → -ise',
    'ization-to-isation': '-ization → -isation',
    'izing-to-ising': '-izing → -ising',
    'ized-to-ised': '-ized → -ised',
    'izer-to-iser': '-izer → -iser',
    'yze-to-yse': '-yze → -yse',
    'yzed-to-ysed': '-yzed → -ysed',
    'yzing-to-ysing': '-yzing → -ysing',
    'ense-to-ence': '-ense → -ence',
    'og-to-ogue': '-og → -ogue',
    'ment-extra-e': '-ment → -ement',
    'ae-oe-digraph': 'ae/oe digraph restoration',
    'single-l-to-double': 'single-l → double-l',
    'misc': 'miscellaneous',
};

// Build grouped entries
const grouped = {};
for (const [usWord, { ukSpelling, rule }] of Object.entries(gaps)) {
    if (!grouped[rule]) grouped[rule] = [];
    grouped[rule].push({ us: usWord, uk: ukSpelling });
}

// Generate TypeScript
let ts = '';

for (const rule of ruleOrder) {
    const words = grouped[rule];
    if (!words || words.length === 0) continue;

    words.sort((a, b) => a.us.localeCompare(b.us));

    ts += `\n    // ── ${ruleLabels[rule] || rule} ──${'─'.repeat(Math.max(0, 60 - (ruleLabels[rule] || rule).length))}\n`;

    for (const { us, uk } of words) {
        const distractors = generateDistractors(uk, us);
        ts += `    '${us}': {\n`;
        ts += `        word: '${uk}',\n`;
        ts += `        distractors: [${distractors.map(d => `'${d}'`).join(', ')}],\n`;
        ts += `    },\n`;
    }
}

fs.writeFileSync(path.join(__dirname, 'uk-overrides-generated.ts'), ts);
console.log(`Generated ${Object.keys(gaps).length} override entries → uk-overrides-generated.ts`);
