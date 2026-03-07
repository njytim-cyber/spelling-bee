/**
 * find-uk-gaps.cjs
 *
 * Scans all pipeline + curated word files and finds words that need
 * UK English overrides but don't have them yet.
 *
 * Applies rule-based patterns for known US→UK spelling differences.
 * Only flags words that ACTUALLY exist in the word bank.
 */

const fs = require('fs');
const path = require('path');

// Load existing UK overrides to skip already-handled words
const ukOverridesPath = path.join(__dirname, '../../src/domains/spelling/words/uk-overrides.ts');
const ukContent = fs.readFileSync(ukOverridesPath, 'utf8');
const existingOverrides = new Set();
for (const m of ukContent.matchAll(/'([a-z]+)':\s*\{/g)) {
    existingOverrides.add(m[1]);
}

console.log(`Existing UK overrides: ${existingOverrides.size}`);

// Collect all words from tier files
const wordsDir = path.join(__dirname, '../../src/domains/spelling/words');
const allWords = new Set();
const files = fs.readdirSync(wordsDir).filter(f => f.match(/^tier\d+(-pipeline-[a-z])?\.ts$/) && !f.match(/^tier\d+-pipeline\.ts$/));

for (const f of files) {
    const content = fs.readFileSync(path.join(wordsDir, f), 'utf8');
    // Pipeline files: "word": "xxx"
    for (const m of content.matchAll(/"word":\s*"([^"]+)"/g)) {
        allWords.add(m[1].toLowerCase());
    }
    // Curated files: word: 'xxx'
    for (const m of content.matchAll(/\bword:\s*'([^']+)'/g)) {
        allWords.add(m[1].toLowerCase());
    }
}

console.log(`Total words in bank: ${allWords.size}`);

// UK spelling rules - only apply where the result is a REAL UK spelling
// Each rule: [name, regex to match US word, transform function for UK word]
const rules = [
    // -or → -our (but NOT words like mentor, author, mirror, tractor, doctor)
    // Only applies to: color/colour, favor/favour, honor/honour, etc.
    ['or-to-our', /^(.+)(or)$/, (w) => {
        // Known -or → -our stems
        const ourWords = [
            'color', 'colour', 'favor', 'favour', 'honor', 'honour',
            'humor', 'humour', 'labor', 'labour', 'neighbor', 'neighbour',
            'harbor', 'harbour', 'vigor', 'vigour', 'valor', 'valour',
            'tumor', 'tumour', 'glamor', 'glamour', 'armor', 'armour',
            'savior', 'saviour', 'behavior', 'behaviour', 'endeavor', 'endeavour',
            'clamor', 'clamour', 'candor', 'candour', 'rancor', 'rancour',
            'splendor', 'splendour', 'parlor', 'parlour', 'vapor', 'vapour',
            'odor', 'odour', 'fervor', 'fervour', 'rigor', 'rigour',
            'demeanor', 'demeanour', 'rumor', 'rumour', 'flavor', 'flavour',
        ];
        const ourStems = ourWords.filter(x => x.endsWith('or')).map(x => x);
        if (ourStems.includes(w)) return w.replace(/or$/, 'our');
        return null;
    }],

    // Derived -or words: colorful, flavoring, etc.
    // Note: -orous derivatives are tricky — glamorous stays glamorous in UK,
    // but humorous → humourous is debated. We skip -ous derivatives to be safe.
    ['or-derivatives', /^(.+)(or)(ful|less|ing|ed|able|ite|ation|ment|ist|ism)$/, (w, m) => {
        const base = m[1] + m[2];
        const suffix = m[3];
        const ourBases = ['color', 'favor', 'honor', 'humor', 'labor', 'neighbor',
            'harbor', 'vigor', 'valor', 'glamor', 'armor', 'savior', 'behavior',
            'endeavor', 'clamor', 'candor', 'splendor', 'vapor', 'odor',
            'fervor', 'rigor', 'demeanor', 'rumor', 'flavor', 'tumor', 'rancor', 'parlor'];
        if (ourBases.includes(base)) return m[1] + 'our' + suffix;
        return null;
    }],

    // -er → -re (center/centre, meter/metre, etc.)
    ['er-to-re', /^(.+)(er)$/, (w) => {
        const reWords = [
            'center', 'meter', 'liter', 'fiber', 'saber', 'theater',
            'somber', 'luster', 'meager', 'specter', 'scepter',
            'caliber', 'reconnoiter',
        ];
        if (reWords.includes(w)) return w.replace(/er$/, 're');
        // maneuver → manoeuvre (special case, not simple er→re)
        if (w === 'maneuver') return 'manoeuvre';
        return null;
    }],

    // -ize → -ise
    ['ize-to-ise', /^(.+)(ize)$/, (w) => {
        // Almost all -ize words become -ise in UK English
        // Exceptions: capsize, seize (these don't have -ise forms)
        const exceptions = ['capsize', 'seize', 'prize', 'size', 'resize'];
        if (exceptions.includes(w)) return null;
        if (w.length >= 6) return w.replace(/ize$/, 'ise');
        return null;
    }],

    // -ization → -isation
    ['ization-to-isation', /^(.+)(ization)$/, (w) => {
        return w.replace(/ization$/, 'isation');
    }],

    // -izing → -ising
    ['izing-to-ising', /^(.+)(izing)$/, (w) => {
        const base = w.replace(/izing$/, 'ize');
        const exceptions = ['capsize', 'seize', 'prize', 'size', 'resize'];
        if (exceptions.includes(base)) return null;
        return w.replace(/izing$/, 'ising');
    }],

    // -ized → -ised
    ['ized-to-ised', /^(.+)(ized)$/, (w) => {
        const base = w.replace(/ized$/, 'ize');
        const exceptions = ['capsize', 'seize', 'prize', 'size', 'resize'];
        if (exceptions.includes(base)) return null;
        return w.replace(/ized$/, 'ised');
    }],

    // -izer → -iser
    ['izer-to-iser', /^(.+)(izer)$/, (w) => {
        return w.replace(/izer$/, 'iser');
    }],

    // -yze → -yse (analyze → analyse, paralyze → paralyse)
    ['yze-to-yse', /^(.+)(yze)$/, (w) => {
        return w.replace(/yze$/, 'yse');
    }],

    // -yzed → -ysed
    ['yzed-to-ysed', /^(.+)(yzed)$/, (w) => {
        return w.replace(/yzed$/, 'ysed');
    }],

    // -yzing → -ysing
    ['yzing-to-ysing', /^(.+)(yzing)$/, (w) => {
        return w.replace(/yzing$/, 'ysing');
    }],

    // -ense → -ence (defense → defence, offense → offence, license → licence, pretense → pretence)
    ['ense-to-ence', /^(.+)(ense)$/, (w) => {
        const enceWords = ['defense', 'offense', 'pretense', 'license'];
        if (enceWords.includes(w)) return w.replace(/ense$/, 'ence');
        return null;
    }],

    // -og → -ogue (catalog → catalogue, dialog → dialogue, analog → analogue)
    ['og-to-ogue', /^(.+)(og)$/, (w) => {
        const ogueWords = ['catalog', 'dialog', 'analog', 'epilog', 'prolog', 'monolog', 'demagog', 'pedagog'];
        if (ogueWords.includes(w)) return w + 'ue';
        return null;
    }],

    // -ment variations (judgment → judgement)
    ['ment-extra-e', /^(.+)(ment)$/, (w) => {
        const ementWords = { 'judgment': 'judgement', 'acknowledgment': 'acknowledgement',
            'enrollment': 'enrolment', 'fulfillment': 'fulfilment', 'installment': 'instalment' };
        return Object.hasOwn(ementWords, w) ? ementWords[w] : null;
    }],

    // ae/oe digraphs (anesthesia → anaesthesia, pediatric → paediatric, etc.)
    ['ae-oe-digraph', /^(.+)$/, (w) => {
        const digraphMap = {
            'anesthesia': 'anaesthesia', 'anesthetic': 'anaesthetic',
            'anesthetize': 'anaesthetise', 'anesthetist': 'anaesthetist',
            'pediatric': 'paediatric', 'pediatrician': 'paediatrician',
            'encyclopedia': 'encyclopaedia', 'hemorrhage': 'haemorrhage',
            'hemorrhoid': 'haemorrhoid', 'hemoglobin': 'haemoglobin',
            'hemophilia': 'haemophilia', 'diarrhea': 'diarrhoea',
            'synesthesia': 'synaesthesia', 'esthete': 'aesthete',
            'esthetic': 'aesthetic', 'estrogen': 'oestrogen',
            'fetus': 'foetus', 'esophagus': 'oesophagus',
            'leukemia': 'leukaemia', 'orthopedic': 'orthopaedic',
            'gynecology': 'gynaecology', 'gynecologist': 'gynaecologist',
            'archeology': 'archaeology', 'archeologist': 'archaeologist',
            'paleontology': 'palaeontology', 'paleontologist': 'palaeontologist',
            'medieval': 'mediaeval',
        };
        return Object.hasOwn(digraphMap, w) ? digraphMap[w] : null;
    }],

    // Double-l in UK (traveling → travelling, counselor → counsellor, etc.)
    ['single-l-to-double', /^(.+)$/, (w) => {
        const llMap = {
            'traveling': 'travelling', 'traveled': 'travelled', 'traveler': 'traveller',
            'counselor': 'counsellor', 'counseling': 'counselling', 'counseled': 'counselled',
            'modeling': 'modelling', 'modeled': 'modelled', 'modeler': 'modeller',
            'labeling': 'labelling', 'labeled': 'labelled',
            'leveling': 'levelling', 'leveled': 'levelled',
            'canceled': 'cancelled', 'canceling': 'cancelling',
            'channeling': 'channelling', 'channeled': 'channelled',
            'dialing': 'dialling', 'dialed': 'dialled',
            'fueling': 'fuelling', 'fueled': 'fuelled',
            'jeweler': 'jeweller', 'jewelry': 'jewellery',
            'marshaling': 'marshalling', 'marshaled': 'marshalled',
            'paneling': 'panelling', 'paneled': 'panelled',
            // riveting keeps single t in UK English
            'signaling': 'signalling', 'signaled': 'signalled',
            'totaling': 'totalling', 'totaled': 'totalled',
            'tunneling': 'tunnelling', 'tunneled': 'tunnelled',
            'woolen': 'woollen', 'woolens': 'woollens',
            'skillful': 'skilful', 'willful': 'wilful',
            'enrollment': 'enrolment', 'fulfillment': 'fulfilment',
            'installment': 'instalment',
        };
        return Object.hasOwn(llMap, w) ? llMap[w] : null;
    }],

    // Miscellaneous one-offs
    ['misc', /^(.+)$/, (w) => {
        const miscMap = {
            'plow': 'plough', 'snowplow': 'snowplough',
            'curb': 'kerb', 'gray': 'grey',
            'check': 'cheque', 'checkbook': 'chequebook',
            'tire': 'tyre', 'aluminum': 'aluminium',
            'draft': 'draught', 'draftsman': 'draughtsman',
            'mold': 'mould', 'moldy': 'mouldy', 'molding': 'moulding',
            'molt': 'moult', 'molting': 'moulting',
            'smolder': 'smoulder', 'smoldering': 'smouldering',
            'peddler': 'pedlar', 'sulfur': 'sulphur',
            'skeptic': 'sceptic', 'skeptical': 'sceptical', 'skepticism': 'scepticism',
            'cozy': 'cosy', 'donut': 'doughnut',
            'pajamas': 'pyjamas', 'mom': 'mum',
            'ax': 'axe', 'aging': 'ageing',
            'artifact': 'artefact',
        };
        return Object.hasOwn(miscMap, w) ? miscMap[w] : null;
    }],
];

// Find all words needing overrides
const needed = new Map(); // word → { ukSpelling, rule }
let alreadyCovered = 0;

for (const word of allWords) {
    if (existingOverrides.has(word)) {
        alreadyCovered++;
        continue;
    }

    for (const [ruleName, regex, transform] of rules) {
        const match = word.match(regex);
        if (!match) continue;

        const ukForm = transform(word, match);
        if (ukForm && ukForm !== word) {
            needed.set(word, { ukSpelling: ukForm, rule: ruleName });
            break; // First matching rule wins
        }
    }
}

console.log(`\nAlready covered: ${alreadyCovered}`);
console.log(`New overrides needed: ${needed.size}`);

// Group by rule
const byRule = {};
for (const [word, { ukSpelling, rule }] of needed) {
    if (!byRule[rule]) byRule[rule] = [];
    byRule[rule].push({ us: word, uk: ukSpelling });
}

console.log('\n=== Needed overrides by rule ===');
for (const [rule, words] of Object.entries(byRule).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${rule} (${words.length} words):`);
    words.sort((a, b) => a.us.localeCompare(b.us));
    for (const { us, uk } of words.slice(0, 10)) {
        console.log(`  ${us} → ${uk}`);
    }
    if (words.length > 10) console.log(`  ... and ${words.length - 10} more`);
}

// Write the full list as JSON for processing
const output = {};
for (const [word, { ukSpelling, rule }] of [...needed.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    output[word] = { ukSpelling, rule };
}
fs.writeFileSync(path.join(__dirname, 'uk-gaps.json'), JSON.stringify(output, null, 2));
console.log(`\nWrote uk-gaps.json with ${Object.keys(output).length} entries`);
