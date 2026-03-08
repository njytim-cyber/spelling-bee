/**
 * debug-uk-text.cjs - quick debug to find words still containing "color"
 * after UK text substitution.
 */
const fs = require('fs');
const path = require('path');

// Reproduce the regex building logic from registry.ts
const ukContent = fs.readFileSync(
    path.join(__dirname, '../../src/domains/spelling/words/uk-overrides.ts'), 'utf8'
);
const overrides = {};
const entryRegex = /'([a-z]+)':\s*\{[^}]*word:\s*'([^']+)'/g;
let match;
while ((match = entryRegex.exec(ukContent)) !== null) {
    overrides[match[1]] = match[2];
}

// Build regex (longest first)
const pairs = Object.entries(overrides).sort((a, b) => b[0].length - a[0].length);
const ukTextMap = {};
for (const [us, uk] of pairs) ukTextMap[us] = uk;
const pattern = pairs.map(([us]) => us.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const ukTextRegex = new RegExp(`\\b(${pattern})\\b`, 'gi');

function ukTextReplace(text) {
    return text.replace(ukTextRegex, (m) => {
        const uk = ukTextMap[m.toLowerCase()];
        if (!uk) return m;
        if (m === m.toUpperCase()) return uk.toUpperCase();
        if (m[0] === m[0].toUpperCase()) return uk[0].toUpperCase() + uk.slice(1);
        return uk;
    });
}

// Test some known strings
const tests = [
    'What color are your eyes?',
    'The colorful painting was beautiful.',
    'A colorless solution.',
    'He wore multicolored socks.',
    'To add color to a film.',
    'discoloration of the skin',
    'The colors were vivid.',
    'technicolor dreamcoat',
    'watercolored painting',
];

for (const t of tests) {
    const result = ukTextReplace(t);
    const hasColor = result.toLowerCase().includes('color');
    console.log(`${hasColor ? 'STILL HAS COLOR' : 'OK'}: "${t}" => "${result}"`);
}

// Now check real word bank
const wordsDir = path.join(__dirname, '../../src/domains/spelling/words');
const files = fs.readdirSync(wordsDir).filter(f =>
    f.match(/^tier\d+(-pipeline-[a-z])?\.ts$/) && !f.match(/^tier\d+-pipeline\.ts$/)
);

let remaining = 0;
const examples = [];
for (const f of files) {
    const content = fs.readFileSync(path.join(wordsDir, f), 'utf8');
    for (const m of content.matchAll(/"word":\s*"([^"]+)".*?"definition":\s*"([^"]+)".*?"exampleSentence":\s*"([^"]+)"/gs)) {
        const word = m[1];
        const def = ukTextReplace(m[2]);
        const ex = ukTextReplace(m[3]);
        if (def.toLowerCase().includes('color') || ex.toLowerCase().includes('color')) {
            remaining++;
            if (examples.length < 20) {
                const field = def.toLowerCase().includes('color') ? 'DEF' : 'EX';
                const text = field === 'DEF' ? def : ex;
                const idx = text.toLowerCase().indexOf('color');
                examples.push({ word, field, context: text.substring(Math.max(0, idx - 15), idx + 25) });
            }
        }
    }
}

console.log('\n=== Remaining "color" in word bank after substitution ===');
console.log(`Total: ${remaining}`);
for (const e of examples) {
    console.log(`  ${e.word} [${e.field}]: "...${e.context}..."`);
}
