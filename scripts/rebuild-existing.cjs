const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'domains', 'spelling', 'words');
// Only hand-curated tiers (not pipeline)
const files = fs.readdirSync(dir).filter(f =>
    f.match(/^tier\d+\.ts$/) ||
    f.match(/^tier\d+-(?:scripps|state|expansion)\.ts$/)
);

console.log('Hand-curated files:', files);

let words = new Set();
for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const regex = /"word":\s*"([^"]+)"/g;
    let m;
    while ((m = regex.exec(content)) !== null) {
        words.add(m[1].toLowerCase());
    }
    // Also try single-quote format
    const regex2 = /word:\s*'([^']+)'/g;
    while ((m = regex2.exec(content)) !== null) {
        words.add(m[1].toLowerCase());
    }
}

console.log('Hand-curated words:', words.size);
fs.writeFileSync(path.join(__dirname, '..', 'existing-words.txt'), [...words].sort().join('\n') + '\n');
console.log('Wrote existing-words.txt');
