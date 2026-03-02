/**
 * reassign-difficulty.cjs
 *
 * Reassigns difficulty for ALL pipeline words using word frequency as the
 * primary signal, with spelling regularity as a modifier.
 *
 * Frequency source: OpenSubtitles 2018 (hermitdave/FrequencyWords)
 * File: scripts/data/en_freq_full.txt — 1.6M entries, word + raw frequency.
 *
 * Updates the SQLite DB (difficulty + tier columns), then re-exports
 * all tier*-pipeline-*.ts files via export-to-app.cjs.
 *
 * Usage:
 *   node scripts/pipeline/reassign-difficulty.cjs [--dry-run] [--sample=20]
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');
const FREQ_PATH = path.join(__dirname, '..', 'data', 'en_freq_full.txt');

// ── Frequency rank → difficulty mapping ─────────────────────────────────────

/**
 * Maps frequency rank to base difficulty (1-10).
 * Lower rank = more common = easier.
 *
 * Thresholds tuned to spread 188K pipeline words across difficulty 1-10
 * given the OpenSubtitles rank distribution of those words:
 *   ranks 1-500: ~1.5K words    → diff 1
 *   ranks 501-2K: ~4.4K         → diff 2
 *   ranks 2K-6K: ~7.5K          → diff 3
 *   ranks 6K-15K: ~12K          → diff 4
 *   ranks 15K-35K: ~17K         → diff 5
 *   ranks 35K-80K: ~21K         → diff 6
 *   ranks 80K-200K: ~21K        → diff 7
 *   ranks 200K-600K: ~23K       → diff 8
 *   ranks 600K+: ~20K           → diff 9
 *   no match (~60K): diff 6-10 based on word properties
 */
function rankToDifficulty(rank) {
    if (rank <= 500) return 1;
    if (rank <= 2000) return 2;
    if (rank <= 6000) return 3;
    if (rank <= 15000) return 4;
    if (rank <= 35000) return 5;
    if (rank <= 80000) return 6;
    if (rank <= 200000) return 7;
    if (rank <= 600000) return 8;
    return 9;
}

// ── Load frequency data ─────────────────────────────────────────────────────

function loadFrequencyMap() {
    console.log('Loading frequency data...');
    const text = fs.readFileSync(FREQ_PATH, 'utf8');
    const lines = text.split('\n');
    const map = new Map();
    let rank = 0;

    for (const line of lines) {
        const sp = line.lastIndexOf(' ');
        if (sp < 0) continue;
        const word = line.slice(0, sp).toLowerCase().trim();
        if (!word || word.length === 0) continue;
        if (!map.has(word)) {
            rank++;
            map.set(word, rank);
        }
    }

    console.log(`  Loaded ${map.size.toLocaleString()} frequency entries`);
    return map;
}

// ── Root-form frequency lookup ──────────────────────────────────────────────

const SUFFIXES = [
    'ingly', 'edly', 'ation', 'tion', 'sion', 'ment', 'ness', 'ible', 'able',
    'ious', 'eous', 'ance', 'ence', 'ful', 'less', 'ous', 'ive', 'ial', 'ity',
    'ing', 'est', 'ies', 'ier', 'ily', 'ers', 'ism', 'ist',
    'ed', 'er', 'ly', 'al', 'es', 's',
];

const PREFIXES = ['un', 're', 'dis', 'pre', 'mis', 'over', 'out', 'non', 'under', 'inter', 'super', 'anti'];

function findFrequencyRank(word, freqMap) {
    const w = word.toLowerCase();

    // 1. Direct lookup
    if (freqMap.has(w)) return freqMap.get(w);

    // 2. Try stripping suffixes
    for (const suf of SUFFIXES) {
        if (w.endsWith(suf) && w.length > suf.length + 2) {
            const root = w.slice(0, -suf.length);
            if (freqMap.has(root)) return freqMap.get(root);
            // Try adding back silent-e (e.g., "loving" → "love")
            if (freqMap.has(root + 'e')) return freqMap.get(root + 'e');
            // Try deduplicating final consonant (e.g., "running" → "run")
            if (root.length > 2 && root[root.length - 1] === root[root.length - 2]) {
                const dedup = root.slice(0, -1);
                if (freqMap.has(dedup)) return freqMap.get(dedup);
            }
            // Try converting -i- back to -y- (e.g., "happier" → "happy")
            if (root.endsWith('i') && root.length > 2) {
                const yRoot = root.slice(0, -1) + 'y';
                if (freqMap.has(yRoot)) return freqMap.get(yRoot);
            }
        }
    }

    // 3. Try stripping prefixes
    for (const pre of PREFIXES) {
        if (w.startsWith(pre) && w.length > pre.length + 2) {
            const root = w.slice(pre.length);
            if (freqMap.has(root)) return freqMap.get(root);
        }
    }

    // 4. No match
    return null;
}

// ── Spelling regularity modifier ────────────────────────────────────────────

/**
 * Returns a difficulty modifier based on spelling irregularity.
 * +1 for irregular/tricky spellings, -1 for very regular patterns, 0 otherwise.
 */
function spellingModifier(word) {
    const w = word.toLowerCase();
    let mod = 0;

    // Silent letters → harder to spell
    if (/^(kn|wr|gn|pn|ps|pt|mn|rh)/.test(w)) mod += 1;
    if (/mb$|mn$|bt$|gn$/.test(w)) mod += 1;

    // Double letters that don't follow simple rules
    if (/([a-z])\1/.test(w) && w.length > 5) mod += 0; // neutral — doubles are common

    // Unusual letter combos
    if (/ph/.test(w)) mod += 1; // "ph" as /f/
    if (/ght/.test(w)) mod += 1; // "ght" cluster
    if (/ough/.test(w)) mod += 1; // "ough" — the worst
    if (/eigh/.test(w)) mod += 1; // "eigh"
    if (/sch/.test(w)) mod += 1; // German-origin

    // Very regular CVC/CVCV patterns → easier
    if (/^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/i.test(w)) mod -= 1;

    // Long words are inherently harder to spell
    if (w.length >= 10) mod += 1;
    if (w.length >= 14) mod += 1;

    // Cap modifier to ±2
    return Math.max(-2, Math.min(2, mod));
}

// ── Compute new difficulty ──────────────────────────────────────────────────

/**
 * Compute final difficulty for a word.
 *
 * @param word - the word string
 * @param freqMap - Map<string, number> of word → frequency rank
 * @param existingDiff - the current DB difficulty (fallback)
 * @param senseCount - number of WordNet senses (more senses = more common)
 * @returns new difficulty 1-10
 */
function computeDifficulty(word, freqMap, existingDiff, senseCount) {
    const rank = findFrequencyRank(word, freqMap);
    let diff;

    if (rank !== null) {
        // We have frequency data — use it as primary signal
        diff = rankToDifficulty(rank);

        // Root-form matches (rank found via suffix/prefix stripping) get a +1 bump
        // because derived forms are slightly harder than their roots
        if (!freqMap.has(word.toLowerCase())) {
            diff = Math.min(10, diff + 1);
        }
    } else {
        // No frequency data at all — word is genuinely rare.
        // Use word length + existing difficulty as heuristic:
        //   Short words (≤4 chars) are at least diff 5 (might be abbreviations or archaic)
        //   Medium words (5-7 chars) are at least diff 6
        //   Long words (8+ chars) are at least diff 7
        //   Very long words (12+ chars) are at least diff 8
        const lenFloor = word.length <= 4 ? 5 : word.length <= 7 ? 6 : word.length <= 11 ? 7 : 8;
        diff = Math.max(lenFloor, Math.min(10, existingDiff));
    }

    // Apply spelling regularity modifier
    diff += spellingModifier(word);

    // Sense count as minor signal: many senses = common word
    if (senseCount > 15 && diff > 2) diff -= 1;
    if (senseCount > 30 && diff > 1) diff -= 1;

    // Clamp to 1-10
    return Math.max(1, Math.min(10, diff));
}

// ── Pattern reassignment ────────────────────────────────────────────────────

/**
 * Classify phonics pattern based on word features and new difficulty.
 * Must match the patterns defined in spellingCategories.ts.
 */
function classifyPattern(word, difficulty) {
    const w = word.toLowerCase();

    // Competition tier (9-10): etymology-based patterns if available
    if (difficulty >= 9) {
        if (/tion$|sion$|cion$/.test(w)) return 'latin-roots';
        if (/ology$|graph|phon|psych|pneum|chron/.test(w)) return 'greek-roots';
        if (/ette$|ique$|eur$|eau$|oir$/.test(w)) return 'french-origin';
        return 'multisyllable';
    }

    // Check explicit Latin/Greek/French endings first (any difficulty)
    if (/ology$|graph$|psych|phon|pneum|chron|logy$|nomy$/.test(w)) return 'greek-roots';
    if (/ette$|ique$|eur$|eau$|oir$|esque$|aille$/.test(w)) return 'french-origin';

    if (difficulty <= 2) {
        // K-1st: basic phonics
        if (/^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/i.test(w)) return 'cvc';
        if (/^(bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|st|str|sw|tr|tw|spr|spl|scr|squ)/.test(w)) return 'blends';
        if (/^(ch|sh|th|wh|ph|ck)|ch$|sh$|th$|ck$/.test(w)) return 'digraphs';
        return 'cvc'; // default for easy words
    }

    if (difficulty <= 4) {
        // 2nd-3rd
        if (/[aeiou][aeiou]/.test(w) && !/[aeiou]{3}/.test(w)) return 'vowel-teams';
        if (/e$/.test(w) && w.length > 3) return 'silent-e';
        if (/[aeiou]r/.test(w)) return 'r-controlled';
        if (/oi|oy|ou|ow|au|aw/.test(w)) return 'diphthongs';
        return 'vowel-teams';
    }

    if (difficulty <= 6) {
        // 4th-5th
        if (/^(un|re|pre|dis|mis|non|over|under|out|up)/.test(w) && w.length > 5) return 'prefixes';
        if (/(?:tion|sion|ment|ness|ful|less|able|ible|ous|ive|ly|er|est|ity|ism|ist|ize)$/.test(w)) return 'suffixes';
        if (w.includes('-') || /^(any|every|some|no)(thing|one|where|body|time)$/.test(w)) return 'compound';
        if (w.length >= 8) return 'multisyllable';
        return 'irregular';
    }

    if (difficulty <= 8) {
        // 6th-8th
        if (/tion$|sion$|ment$|ance$|ence$|ible$|able$|ous$/.test(w)) return 'latin-roots';
        if (/ology$|graph|phon|psych|pneum|chron/.test(w)) return 'greek-roots';
        if (/ette$|ique$|eur$|eau$|oir$/.test(w)) return 'french-origin';
        if (/^(un|re|pre|dis|mis|non|over|under)/.test(w) && w.length > 6) return 'prefixes';
        if (/(?:ness|ful|less|able|ible|ous|ive|ity|ism|ist)$/.test(w)) return 'suffixes';
        return 'multisyllable';
    }

    // 9-10 already handled above
    return 'multisyllable';
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const sampleArg = args.find(a => a.startsWith('--sample='));
    const sampleSize = sampleArg ? parseInt(sampleArg.split('=')[1]) : 0;

    // Load frequency data
    const freqMap = loadFrequencyMap();

    // Open DB
    const db = new Database(DB_PATH);

    // Get all pipeline words (those with tier assigned)
    const words = db.prepare(
        'SELECT id, word, difficulty, tier, pattern, sense_count FROM words WHERE tier IS NOT NULL AND tier > 0'
    ).all();
    console.log(`\nProcessing ${words.length.toLocaleString()} pipeline words...`);

    // Compute new difficulties
    const updates = [];
    const tierDistBefore = {};
    const tierDistAfter = {};
    let changed = 0;
    let bigSwing = 0; // words that moved 3+ difficulty levels

    for (const w of words) {
        tierDistBefore[w.difficulty] = (tierDistBefore[w.difficulty] || 0) + 1;

        const newDiff = computeDifficulty(w.word, freqMap, w.difficulty, w.sense_count || 1);
        const newTier = newDiff <= 2 ? 1 : Math.min(newDiff, 10) - 1;
        const newPattern = classifyPattern(w.word, newDiff);

        tierDistAfter[newDiff] = (tierDistAfter[newDiff] || 0) + 1;

        if (newDiff !== w.difficulty) changed++;
        if (Math.abs(newDiff - w.difficulty) >= 3) bigSwing++;

        updates.push({
            id: w.id,
            word: w.word,
            oldDiff: w.difficulty,
            newDiff,
            oldTier: w.tier,
            newTier,
            oldPattern: w.pattern,
            newPattern,
        });
    }

    // Print stats
    console.log(`\nDifficulty distribution BEFORE:`);
    for (let d = 1; d <= 10; d++) {
        const count = tierDistBefore[d] || 0;
        const bar = '█'.repeat(Math.round(count / 1000));
        console.log(`  ${d}: ${count.toString().padStart(6)} ${bar}`);
    }

    console.log(`\nDifficulty distribution AFTER:`);
    for (let d = 1; d <= 10; d++) {
        const count = tierDistAfter[d] || 0;
        const bar = '█'.repeat(Math.round(count / 1000));
        console.log(`  ${d}: ${count.toString().padStart(6)} ${bar}`);
    }

    console.log(`\n${changed.toLocaleString()} words changed difficulty (${(100 * changed / words.length).toFixed(1)}%)`);
    console.log(`${bigSwing.toLocaleString()} words moved 3+ difficulty levels`);

    // Show tier migration matrix
    console.log('\nTier migration (old → new):');
    const migration = {};
    for (const u of updates) {
        const key = `${u.oldTier}→${u.newTier}`;
        migration[key] = (migration[key] || 0) + 1;
    }
    const sorted = Object.entries(migration).sort((a, b) => b[1] - a[1]);
    for (const [key, count] of sorted.slice(0, 15)) {
        console.log(`  ${key}: ${count.toLocaleString()}`);
    }

    // Sample output
    if (sampleSize > 0) {
        console.log(`\n── Sample of changes (${sampleSize} per difficulty level) ──`);
        for (let d = 1; d <= 10; d++) {
            const inBucket = updates.filter(u => u.newDiff === d);
            const sample = inBucket.sort(() => Math.random() - 0.5).slice(0, sampleSize);
            console.log(`\nDifficulty ${d}:`);
            for (const s of sample) {
                const arrow = s.oldDiff !== s.newDiff ? ` (was ${s.oldDiff})` : '';
                console.log(`  ${s.word}${arrow} [${s.newPattern}]`);
            }
        }
    }

    if (dryRun) {
        console.log('\n[DRY RUN] No changes written to DB.');
        db.close();
        return;
    }

    // Write changes to DB
    console.log('\nWriting changes to DB...');
    const updateStmt = db.prepare(
        'UPDATE words SET difficulty = ?, tier = ?, pattern = ? WHERE id = ?'
    );

    const tx = db.transaction(() => {
        for (const u of updates) {
            updateStmt.run(u.newDiff, u.newTier, u.newPattern, u.id);
        }
    });
    tx();

    db.close();
    console.log('Done! DB updated.');
    console.log('\nNext step: re-export with:\n  node scripts/pipeline/export-to-app.cjs');
}

main();
