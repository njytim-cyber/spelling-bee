const fs = require('fs');
const path = require('path');

const wordsDir = path.join(__dirname, '..', 'src', 'domains', 'spelling', 'words');
const tierFiles = ['tier1', 'tier2', 'tier3', 'tier4', 'tier5', 'tier5-scripps', 'tier5-state'];

const results = [];

tierFiles.forEach(tier => {
    const fileStr = fs.readFileSync(path.join(wordsDir, tier + '.ts'), 'utf8');

    // Need to parse word, definition, partOfSpeech, theme
    const blockRegex = /\{\s*word:\s*'([^']+)',[\s\S]*?definition:\s*'([^']+)',[\s\S]*?partOfSpeech:\s*'([^']+)',[\s\S]*?theme:\s*'([^']+)'/g;

    let match;
    while ((match = blockRegex.exec(fileStr)) !== null) {
        results.push({
            word: match[1],
            def: match[2],
            pos: match[3],
            theme: match[4],
            tier: tier
        });
    }
});

// Let's find suspicious ones: 
// General rule: Concrete object themes should almost exclusively be nouns.
// Action themes should mostly be verbs.
const nounOnlyThemes = ['animals', 'plants', 'body', 'clothing', 'home', 'money', 'water', 'weather', 'earth', 'food'];

const suspicious = results.filter(r => {
    // 1. Existing checks
    if (r.theme === 'people' && r.pos !== 'noun') return true;
    if (r.theme === 'time' && r.def.includes('past tense')) return true;

    // 2. Strict Noun checks for object categories
    if (nounOnlyThemes.includes(r.theme) && r.pos !== 'noun') {
        // Allow a few exceptions where a verb genuinely maps well locally
        // Just flag anything that is an adjective or adverb
        if (r.pos === 'adjective' || r.pos === 'adverb') {
            return true;
        }

        // Flag verbs in highly strict noun categories
        if (['animals', 'plants', 'body', 'clothing'].includes(r.theme) && r.pos === 'verb') {
            return true;
        }
    }

    // 3. Strict Verb checks for action categories
    if (r.theme === 'actions' && (r.pos === 'adjective' || r.pos === 'adverb')) {
        return true;
    }

    return false;
});

console.log(`Found ${suspicious.length} suspicious classifications out of ${results.length} total words.`);

const byTheme = {};
suspicious.forEach(s => {
    byTheme[s.theme] = byTheme[s.theme] || [];
    byTheme[s.theme].push(`${s.word} (${s.pos}): ${s.def}`);
});

Object.keys(byTheme).forEach(t => {
    console.log(`\n=== SUSPICIOUS [${t.toUpperCase()}] ===`);
    byTheme[t].forEach(w => console.log('  ' + w));
});
