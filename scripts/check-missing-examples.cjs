const Database = require('better-sqlite3');
const db = new Database('scripts/output/words.db');

// Words with definition + distractors but NO example, by difficulty
const gaps = db.prepare(`
    SELECT difficulty, COUNT(*) as n
    FROM words
    WHERE (definition IS NOT NULL OR wikt_definition IS NOT NULL OR api_definition IS NOT NULL)
    AND distractors IS NOT NULL
    AND (COALESCE(wikt_example, api_example, example) IS NULL OR COALESCE(wikt_example, api_example, example) = '')
    AND word GLOB '[a-z]*'
    GROUP BY difficulty ORDER BY difficulty
`).all();

console.log('Words with def+distractors but NO example:');
let total = 0;
for (const r of gaps) { console.log('  diff ' + r.difficulty + ': ' + r.n); total += r.n; }
console.log('  Total:', total);

// Sample diff 1-3
for (const diff of [1, 2, 3]) {
    console.log('\nSample diff-' + diff + ' words without examples:');
    const samples = db.prepare(`
        SELECT word, COALESCE(wikt_definition, api_definition, definition) as def, pos
        FROM words
        WHERE difficulty = ?
        AND distractors IS NOT NULL
        AND (COALESCE(wikt_example, api_example, example) IS NULL OR COALESCE(wikt_example, api_example, example) = '')
        AND word GLOB '[a-z]*'
        ORDER BY sense_count DESC LIMIT 15
    `).all(diff);
    for (const s of samples) {
        console.log('  ' + s.word + ' (' + s.pos + '): ' + (s.def || '').substring(0, 80));
    }
}

db.close();
