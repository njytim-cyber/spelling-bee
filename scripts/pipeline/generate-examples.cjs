/**
 * generate-examples.cjs
 *
 * Generates simple, kid-appropriate example sentences for words that have
 * definitions and distractors but no example sentence.
 *
 * Strategy: template-based generation using part-of-speech and definition.
 * No AI/LLM — deterministic, fast, and controllable.
 *
 * Usage: node scripts/pipeline/generate-examples.cjs [--diff 1-4] [--limit 5000] [--dry-run]
 */
const Database = require('better-sqlite3');
const path = require('path');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const allWords = args.includes('--all');
const diffFlag = args.find(a => a.startsWith('--diff'));
const diffRange = diffFlag ? diffFlag.split('=')[1] || args[args.indexOf(diffFlag) + 1] : '1-4';
const limitFlag = args.find(a => a.startsWith('--limit'));
const limit = limitFlag ? parseInt(limitFlag.split('=')[1] || args[args.indexOf(limitFlag) + 1]) : 20000;

const [diffMin, diffMax] = diffRange.includes('-')
    ? diffRange.split('-').map(Number)
    : [Number(diffRange), Number(diffRange)];

console.log(`Generating examples for diff ${diffMin}-${diffMax}, limit ${limit}${dryRun ? ' (DRY RUN)' : ''}${allWords ? ' (ALL words)' : ''}`);

const db = new Database(path.join(__dirname, '..', 'output', 'words.db'));

// Get words needing examples
// --all: generate for ALL words (overwrite existing example column with template)
// default: only words missing any example
const exampleFilter = allWords
    ? ''
    : "AND (COALESCE(wikt_example, api_example, example) IS NULL OR COALESCE(wikt_example, api_example, example) = '')";

const rows = db.prepare(`
    SELECT id, word, pos,
           COALESCE(wikt_definition, api_definition, definition) as def,
           difficulty, sense_count
    FROM words
    WHERE difficulty BETWEEN ? AND ?
    AND (definition IS NOT NULL OR wikt_definition IS NOT NULL OR api_definition IS NOT NULL)
    AND distractors IS NOT NULL
    ${exampleFilter}
    AND word GLOB '[a-z]*'
    ORDER BY sense_count DESC, difficulty ASC
    LIMIT ?
`).all(diffMin, diffMax, limit);

console.log(`Found ${rows.length} words needing examples\n`);

// Template-based sentence generation
// Uses the word + POS to pick a natural-sounding template

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function article(word) {
    return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

// Extract a short gloss from the definition (first phrase, max 40 chars)
function shortGloss(def) {
    if (!def) return '';
    let s = def
        .replace(/\([^)]*\)/g, '')       // remove parentheticals
        .replace(/\[[^\]]*\]/g, '')       // remove bracketed refs
        .replace(/;.*$/, '')              // take first clause
        .replace(/,\s*(especially|particularly|typically|usually|often|mainly|chiefly).*$/i, '')
        .trim();
    if (s.length > 60) s = s.substring(0, 60).replace(/\s+\S*$/, '');
    return s.toLowerCase().replace(/\.$/, '');
}

// Filter out words that are proper nouns, currencies, place names, or otherwise
// inappropriate for generic example sentence templates
function shouldSkip(word, def) {
    if (!def) return false;
    const d = def.toLowerCase();

    // Names of people, places, organizations
    if (/^(a |an |the )?(city|town|village|county|state|province|region|country|kingdom|empire|republic|territory|island|mountain|river|lake|peninsula|district|borough|commune|department|prefecture)\b/i.test(d)) return true;
    if (/^(a |an |the )?(king|queen|prince|princess|emperor|pope|president|prime minister|saint|bishop|duke|earl|baron|lord|monarch|sultan|caliph|pharaoh|czar|tsar)\b/i.test(d)) return true;
    if (/\b(born \d|died \d|\d{4}-\d{4}|\(\d{4})/i.test(def)) return true; // biographical dates

    // Nationalities + professions (biographical entries)
    if (/^(english|french|german|italian|spanish|american|british|scottish|irish|welsh|roman|greek|dutch|swedish|norwegian|danish|russian|chinese|japanese|indian|australian|canadian|swiss|austrian|portuguese|polish|czech|hungarian|belgian|finnish|turkish|persian|arab|korean|mexican|brazilian|cuban|african|egyptian|israeli) \w/i.test(d)) return true;

    // "United States" anything — usually biographical or geographic
    if (/^united states\b/i.test(d)) return true;

    // Currency definitions — don't make good example sentences
    if (/\b(currency|banknote|monetary unit|coin|USD|dollar|pound|euro|yen|rupee)\b/i.test(d)) return true;

    // Slang for money amounts (like "jackson" = $20 bill)
    if (/\b(u\.s\.\s+\d+.dollar|portrait of|denomination)\b/i.test(d)) return true;

    // "A Stuart king", "a daughter of Henry", etc. — biographical
    if (/\b(stuart|tudor|plantagenet|bourbon|habsburg|romanov|dynasty|throne|regent)\b/i.test(d)) return true;

    // Telephone / radio codes
    if (/\b(radiotelephony|clear-code|nato phonetic)\b/i.test(d)) return true;

    // "a low-lying region in central France" — geographic
    if (/\b(region in|located in|situated in|found in|native to|endemic to)\b.*\b(france|germany|italy|spain|england|britain|scotland|ireland|wales|china|japan|india|russia|america|africa|europe|asia|australia|arctic|antarctic|atlantic|pacific|mediterranean)\b/i.test(d)) return true;

    // Single-letter or two-letter words rarely make good sentences
    if (word.length <= 2) return true;

    return false;
}

// Generate example based on POS
function generateExample(word, pos, def) {
    if (!def || def.length < 3) return null;
    if (shouldSkip(word, def)) return null;

    const gloss = shortGloss(def);
    if (!gloss || gloss.length < 3) return null;

    const art = article(word);

    switch (pos) {
        case 'noun': {
            const templates = [
                `She wrote about the ${word} in her school report.`,
                `The teacher asked us to define the word ${word}.`,
                `We learned about the ${word} in class today.`,
                `My teacher explained what ${art} ${word} is during our lesson.`,
                `The book had an entire chapter about the ${word}.`,
                `He wrote the word ${word} on the board for everyone to see.`,
                `Can you use the word ${word} in a sentence?`,
                `They discussed the ${word} during the science lesson.`,
                `The ${word} was one of our vocabulary words this week.`,
                `Learning about the ${word} was the best part of the day.`,
            ];
            return templates[word.length % templates.length];
        }
        case 'verb': {
            const base = word.replace(/(ed|ing|es|s)$/, '');
            const templates = [
                `She likes to ${word} whenever she gets the chance.`,
                `They decided to ${word} before the sun went down.`,
                `He learned how to ${word} from watching a tutorial.`,
                `We need to ${word} this before the deadline.`,
                `The coach taught us how to ${word} properly.`,
                `It took a while to learn how to ${word}.`,
                `She would ${word} every morning before school.`,
                `They always ${word} when they visit the park.`,
                `The instructions said to ${word} gently and carefully.`,
                `He promised to ${word} as soon as he got home.`,
            ];
            return templates[word.length % templates.length];
        }
        case 'adjective': {
            const templates = [
                `The ${word} colors of the sunset were beautiful.`,
                `She wore ${art} ${word} scarf to school.`,
                `The ${word} surface made it hard to walk across.`,
                `He described the painting as quite ${word}.`,
                `The ${word} weather made everyone want to stay inside.`,
                `They admired the ${word} pattern on the quilt.`,
                `Her ${word} voice filled the concert hall.`,
                `The garden looked especially ${word} in the morning light.`,
                `The old house had ${art} ${word} appearance.`,
                `Everyone agreed that the dessert was wonderfully ${word}.`,
            ];
            return templates[word.length % templates.length];
        }
        case 'adverb': {
            const templates = [
                `She ${word} completed her homework before dinner.`,
                `He ran ${word} across the field to catch the ball.`,
                `The cat ${word} crept across the room.`,
                `They ${word} agreed to help with the project.`,
                `She ${word} opened the gift, excited to see what was inside.`,
                `The bird sang ${word} from the top of the tree.`,
                `He ${word} raised his hand to answer the question.`,
                `They worked ${word} to finish the puzzle together.`,
            ];
            return templates[word.length % templates.length];
        }
        default: {
            // Fallback for other POS
            const templates = [
                `The word ${word} came up during our vocabulary lesson.`,
                `She used the word ${word} correctly in her essay.`,
                `He looked up ${word} in the dictionary to check the spelling.`,
                `The teacher asked us to use ${word} in a sentence.`,
                `We practiced spelling ${word} during our study session.`,
            ];
            return templates[word.length % templates.length];
        }
    }
}

// Generate and store
const update = db.prepare(`UPDATE words SET example = ? WHERE id = ?`);
let generated = 0;
let skipped = 0;
let skippedReasons = 0;

const insertMany = db.transaction((items) => {
    for (const { id, example } of items) {
        update.run(example, id);
    }
});

const batch = [];

for (const row of rows) {
    const example = generateExample(row.word, row.pos, row.def);
    if (!example) {
        skipped++;
        if (shouldSkip(row.word, row.def)) skippedReasons++;
        continue;
    }

    if (dryRun) {
        if (generated < 20) {
            console.log(`  ${row.word} (${row.pos}, diff${row.difficulty}): "${example}"`);
        }
    } else {
        batch.push({ id: row.id, example });
    }
    generated++;
}

if (!dryRun && batch.length > 0) {
    insertMany(batch);
}

console.log(`\nGenerated: ${generated}`);
console.log(`Skipped: ${skipped} (${skippedReasons} proper nouns)`);
if (!dryRun) {
    console.log(`Updated ${batch.length} rows in DB`);
}

db.close();
