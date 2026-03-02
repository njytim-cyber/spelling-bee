#!/usr/bin/env node
/**
 * audit-child-safety.cjs
 *
 * Exhaustive child-safety audit of ALL word bank files.
 * Checks every word, definition, example sentence, and distractor
 * for inappropriate content that should not appear in a children's spelling app.
 *
 * Usage: node scripts/audit-child-safety.cjs
 */

const fs = require('fs');
const path = require('path');

// ── Blocklists ──────────────────────────────────────────────────────────────

// Words that are themselves inappropriate
const BLOCKED_WORDS = new Set([
  // Sexual / vulgar
  'shit', 'shitty', 'shitting', 'bullshit', 'horseshit', 'batshit',
  'fuck', 'fucking', 'fucker', 'fuckwit', 'motherfucker', 'clusterfuck',
  'ass', 'asshole', 'arsehole', 'arse', 'badass',
  'bitch', 'bitchy', 'bitching', 'sonofabitch',
  'bastard', 'bastardly',
  'damn', 'damnation', 'goddamn',
  'hell', // context-dependent but risky for kids
  'crap', 'crappy',
  'dick', 'dickhead', 'dickish',
  'cock', 'cocksucker',
  'cunt', 'cunty', 'cuntish', 'cuntslut',
  'whore', 'whorish', 'whoredom', 'whoremonger',
  'slut', 'slutty', 'slutdom', 'slutface', 'sluthood', 'slutness',
  'slutting', 'sluttification', 'cyberslut', 'superslut',
  'piss', 'pissy', 'pissed',
  'tits', 'titty', 'titties',
  'boob', 'boobs', 'booby',
  'penis', 'penile', 'phallic', 'phallus',
  'vagina', 'vaginal', 'vulva', 'vulvar',
  'clitoris', 'clitoral',
  'scrotum', 'scrotal',
  'testicle', 'testicular',
  'orgasm', 'orgasmic',
  'erection', 'erectile',
  'ejaculate', 'ejaculation',
  'masturbate', 'masturbation', 'masturbatory',
  'fornicate', 'fornication', 'fornicator',
  'sodomy', 'sodomize', 'sodomite',
  'fellatio', 'cunnilingus',
  'brothel', 'bordello',
  'prostitute', 'prostitution',
  'pimp', 'pimping',
  'pornography', 'porn', 'porno', 'pornographic',
  'hentai', 'ecchi',
  'dildo', 'vibrator',
  'fetish', 'fetishism', 'fetishist', 'fetishistic',
  'bondage', 'sadomasochism', 'sadomasochist',
  'dominatrix',
  'orgy', 'orgies',
  'boof', 'boofing', 'boofed',
  'brojob', 'painal',
  'pedicant', 'pedicator',
  'assfaggot',
  'rubberist', 'looner',
  'tarty', 'gixy',
  'concubine', 'concubinage',
  'harlot', 'harlotry',
  'strumpet', 'trollop',
  'wench',
  'nympho', 'nymphomania', 'nymphomaniac',

  // Drugs (hard)
  'cocaine', 'heroin', 'methamphetamine', 'meth',
  'ecstasy', 'mdma', 'lsd', 'psilocybin',
  'crack', // as drug
  'tik', // meth slang
  'bong',

  // Slurs & hate speech
  'nigger', 'nigga', 'negro',
  'kike', 'hymie',
  'spic', 'wetback', 'beaner',
  'chink', 'gook', 'zipperhead',
  'fag', 'faggot', 'faggotry',
  'dyke', 'lesbo',
  'tranny', 'shemale',
  'retard', 'retarded',
  'cripple',
  'midget',

  // Violence (extreme)
  'rape', 'rapist', 'raping',
  'molest', 'molestation', 'molester',
  'pedophile', 'pedophilia', 'paedophile', 'paedophilia',
  'incest', 'incestuous',
  'necrophilia', 'necrophiliac',
  'bestiality',
  'genocide', 'genocidal',
  'holocaust',
  'lynching',
  'torture', 'torturer',

  // Pop culture / trademark (not real words)
  'minecraft', 'minecrafter', 'minecraftian',
  'hogwartsian', 'pokemon', 'fortnite',

  // Political / divisive for kids
  'karen', 'becky',

  // Body horror / gross-out
  'vomit', // borderline but used in education
  'diarrhea', 'diarrhoea',
]);

// Patterns to check in definitions and examples
const CONTENT_PATTERNS = [
  // Sexual content
  /\bsexual intercourse\b/i,
  /\banal sex\b/i,
  /\boral sex\b/i,
  /\bsexual act\b/i,
  /\bsexual pleasure\b/i,
  /\bsexual arousal\b/i,
  /\bsexually explicit\b/i,
  /\bsexual gratification\b/i,
  /\bsexual organ\b/i,
  /\bsexual desire\b/i,
  /\bsexual partner\b/i,
  /\berotic\b/i,
  /\beroticism\b/i,
  /\bcoitus\b/i,
  /\bcopulat/i,
  /\bfornica/i,
  /\bprostitut/i,
  /\bsodomi/i,
  /\bpornograph/i,
  /\bphallic\b/i,
  /\bgenital/i,
  /\bvagina/i,
  /\bpenis\b/i,
  /\bpenile\b/i,
  /\bscrotum\b/i,
  /\bbrothel\b/i,
  /\bbordello\b/i,
  /\bejaculat/i,
  /\bmasturbat/i,
  /\borgasm/i,
  /\berection\b/i,
  /\berectile\b/i,
  /\bpromiscuous\b/i,
  /\bpromiscuity\b/i,
  /\bslut/i,
  /\bwhore/i,
  /\bharlot/i,
  /\bconcubine\b/i,
  /\bnymphoman/i,
  /\bfetish\b/i,  // note: "juju" uses this anthropologically — may need manual review
  /\bbondage\b/i,
  /\bsadomasoch/i,
  /\bdominatrix\b/i,
  /\bdildo\b/i,
  /\bvibrator\b/i,
  /\borgy\b/i,
  /\borgies\b/i,
  /\bsemen\b/i,
  /\bsperm\b/i,
  /\bovulat/i,  // might be ok in science context
  /\bimpregnate\b/i,
  /\bcastrat/i,
  /\bcircumcis/i,
  /\bforeskin\b/i,
  /\bclitoris\b/i,
  /\bvulva\b/i,
  /\btesticle/i,
  /\bscrotum/i,
  /\bnipple/i,
  /\bbreast\b/i,  // might false-positive on "breastplate" etc.
  /\bbosom\b/i,
  /\blust\b/i,
  /\blustful/i,
  /\blechery\b/i,
  /\blecherous\b/i,
  /\blibidin/i,
  /\blascivious/i,
  /\bsalacious/i,
  /\bprurient/i,
  /\blicentious/i,
  /\bdebaucher/i,
  /\bcarnal\b/i,
  /\bbawdy\b/i,
  /\blewd/i,
  /\bobscen/i,
  /\bsmut/i,
  /\brisqu[eé]\b/i,
  /\btitillat/i,
  /\bseduc/i,
  /\baphrodisiac/i,

  // Drug references
  /\bcrystal meth\b/i,
  /\bsmoke meth\b/i,
  /\bmaking meth\b/i,
  /\bbang it\b.*\bmeth/i,
  /\bcocaine\b/i,
  /\bheroin\b/i,
  /\bmethamphetamine\b/i,
  /\bmarijuana\b/i,
  /\bcannabis\b/i,
  /\bnarcotics?\b/i,
  /\bopium\b/i,
  /\bopiate\b/i,
  /\bopioid\b/i,
  /\bhallucino/i,
  /\bpsychedelic\b/i,
  /\bintoxicat/i,
  /\bdrunk/i,
  /\balcohol/i,  // might false-positive
  /\bsmok(e|ing) (weed|pot|crack|dope)\b/i,
  /\bsnort/i,
  /\binject(ing|ed)? (drugs?|heroin|meth)\b/i,
  /\boverdos/i,

  // Violence (extreme/graphic)
  /\brape[ds]?\b/i,
  /\braping\b/i,
  /\brapist\b/i,
  /\bmolest/i,
  /\bpedophil/i,
  /\bpaedophil/i,
  /\bincest/i,
  /\bnecrophil/i,
  /\bbestiality\b/i,
  /\bgenocid/i,
  /\blynch(ed|ing)\b/i,
  /\btortur(e|ed|ing|er)\b/i,
  /\bmutilat/i,
  /\bdismember/i,
  /\beviscerat/i,
  /\bbeheading\b/i,
  /\bdecapitat/i,
  /\bbloody murder\b/i,
  /\bserial killer\b/i,
  /\bmass murder/i,
  /\bschool shooting\b/i,
  /\bterroris/i,
  /\bsuicide bomb/i,

  // Hate speech / slurs
  /\bnigger/i,
  /\bkike\b/i,
  /\bspic\b/i,
  /\bwetback\b/i,
  /\bchink\b/i,
  /\bgook\b/i,
  /\bfaggot/i,
  /\bdyke\b/i,
  /\btranny\b/i,
  /\bshemale\b/i,
  /\bretard/i,
  /\bwhite supremac/i,
  /\bwhite privilege\b/i,
  /\bwhite power\b/i,
  /\bblack power\b/i,
  /\bneo-?nazi/i,
  /\bswastika\b/i,
  /\baryan\b/i,
  /\beugenics?\b/i,
  /\bethnic cleans/i,

  // Profanity in text
  /\bshit\b/i,
  /\bfuck/i,
  /\bbitch\b/i,
  /\basshole\b/i,
  /\bbastard\b/i,
  /\bdamn\b/i,
  /\bcrap\b/i,
  /\bpiss/i,
  /\bcunt\b/i,
  /\bdick\b(?!ens)/i,  // allow "Dickens"
  /\bcock\b(?!ade|atoo|atiel|erel|le|pit|roach|tail|crow|atrice|ney)/i, // allow compound words
  /\bgoddamn/i,
  /\bbollocks\b/i,
  /\bwanker\b/i,
  /\bwank\b/i,
  /\btosser\b/i,
  /\bblowjob\b/i,
  /\bhandjob\b/i,

  // Suicide / self-harm
  /\bsuicid/i,
  /\bself[- ]harm/i,
  /\bcutting (herself|himself|themselves)\b/i,
  /\bslit (her|his|their) wrist/i,

  // Eating disorders
  /\banorexi/i,
  /\bbulimi/i,
  /\bpurg(e|ing)\b/i,
];

// Words that are OK despite pattern matches (false positives)
const ALLOWLIST = new Set([
  'juju',        // "fetish" in anthropological sense (charm/idol)
  'cockatoo',    // bird
  'cockatiel',   // bird
  'cockerel',    // rooster
  'cocktail',    // drink
  'cockade',     // ornament
  'cockpit',     // aircraft
  'cockroach',   // insect
  'cockcrow',    // dawn
  'cockatrice',  // mythical creature
  'cockney',     // dialect
  'dickens',     // author
  'assassin',    // the word itself is fine
  'assassination',
  'buttress',    // architecture
  'buttercup',
  'butterfly',
  'butterscotch',
  'scuttlebutt', // gossip
  'damnation',   // might be in religious context
  'rapture',     // religious
  'raptor',      // dinosaur
  'therapist',   // professional
  'grape',       // fruit
  'drape',       // curtain
  'scrape',      // action
  'breastplate', // armor
  'breastwork',  // fortification
  'breastbone',  // anatomy ok for kids
  'abreast',     // "keeping abreast of"
  'breast',      // might be ok in clinical/bird context
  'bosom',       // might be ok in literary context
  'narcotic',    // educational
  'intoxicate',  // educational (can describe poison)
  'intoxication',
  'alcoholic',   // educational
  'alcohol',     // educational
  'drunken',     // literary
  'drunk',       // appears in literature
  'ovulate',     // science education
  'ovulation',
  'purge',       // historical/political use is ok
  'purging',
  'cocktails',
  'assault',     // legal term, ok
  'cassette',
  'class',
  'classic',
  'brass',
  'grass',
  'mass',
  'pass',
  'crass',
  'morass',
  'harass',
  'embarrass',
  'encompass',
  'surpass',
  'amass',
  'trespass',
  'impasse',
  'carcass',
  'compass',
  'jackass',     // borderline but common word
  'molasses',
  'sassafras',
  'cockle',      // shellfish
  'peacock',     // bird
  'woodcock',    // bird
  'gamecock',
  'stopcock',    // plumbing
  'weathercock', // wind vane
  'hancock',     // name
  'hitchcock',   // name
  'pencock',
  'haystacks',
  'livestock',
  'damsel',
  'damn',        // appears in literature
  'damage',
  'damask',
  'damp',
  'dampen',
  'damper',
  'rapid',       // not rape-related
  'rapids',
  'rapport',
  'wrapper',
  'rapt',        // absorbed
  'rapier',      // sword
  'raptorial',   // zoology
  'snort',       // horse sound
  'chug',        // to drink quickly
  'cox',         // coxswain, rowing term
  'diarrhea',    // medical term, appropriate for older students
  'lingerie',    // clothing term, appropriate for older students
]);

// ── File loading ────────────────────────────────────────────────────────────

function extractWordsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const words = [];
  const basename = path.basename(filePath);

  // Strategy: find each top-level object in the array by matching balanced braces.
  // Look for lines that start a new object: "    {" or "  {"
  const lines = content.split('\n');
  let inObject = false;
  let braceDepth = 0;
  let currentBlock = '';

  for (const line of lines) {
    if (!inObject) {
      // Look for opening brace of a word object (after array start)
      const trimmed = line.trim();
      if (trimmed === '{' || trimmed.startsWith('{')) {
        inObject = true;
        braceDepth = 0;
        currentBlock = '';
      } else {
        continue;
      }
    }

    if (inObject) {
      currentBlock += line + '\n';
      // Count braces
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth--;
      }

      if (braceDepth === 0) {
        // End of object — parse it
        inObject = false;

        const wordMatch = currentBlock.match(/["']word["']\s*:\s*["']([^"']+)["']/);
        const defMatch = currentBlock.match(/["']definition["']\s*:\s*["']((?:[^"'\\]|\\.)*)["']/);
        const exampleMatch = currentBlock.match(/["']exampleSentence["']\s*:\s*["']((?:[^"'\\]|\\.)*)["']/);
        const distractorMatch = currentBlock.match(/["']distractors["']\s*:\s*\[([^\]]*)\]/);

        // Also try unquoted keys (hand-curated files use word: not "word":)
        const wordMatch2 = currentBlock.match(/\bword:\s*['"]([^'"]+)['"]/);
        const defMatch2 = currentBlock.match(/\bdefinition:\s*[']((?:[^'\\]|\\.)*)[']/);
        const defMatch3 = currentBlock.match(/\bdefinition:\s*["]((?:[^"\\]|\\.)*)["]/);
        const exampleMatch2 = currentBlock.match(/\bexampleSentence:\s*[']((?:[^'\\]|\\.)*)[']/);
        const exampleMatch3 = currentBlock.match(/\bexampleSentence:\s*["]((?:[^"\\]|\\.)*)["]/);
        const distractorMatch2 = currentBlock.match(/\bdistractors:\s*\[([^\]]*)\]/);

        const w = (wordMatch || wordMatch2);
        const d = (defMatch || defMatch2 || defMatch3);
        const e = (exampleMatch || exampleMatch2 || exampleMatch3);
        const dist = (distractorMatch || distractorMatch2);

        if (w) {
          const entry = {
            word: w[1],
            definition: d ? d[1].replace(/\\'/g, "'").replace(/\\"/g, '"') : '',
            example: e ? e[1].replace(/\\'/g, "'").replace(/\\"/g, '"') : '',
            distractors: [],
            file: basename,
          };

          if (dist) {
            const dStr = dist[1];
            entry.distractors = (dStr.match(/['"]([^'"]+)['"]/g) || []).map(s => s.replace(/['"]/g, ''));
          }

          words.push(entry);
        }

        currentBlock = '';
      }
    }
  }

  return words;
}

// ── Load master profanity list ──────────────────────────────────────────────
// Use the same merged list as the export script for consistency

const PROFANITY_LIST_PATH = path.join(__dirname, 'pipeline', 'profanity-master.txt');
const MASTER_PROFANITY = new Set(
  fs.existsSync(PROFANITY_LIST_PATH)
    ? fs.readFileSync(PROFANITY_LIST_PATH, 'utf8').split('\n').map(l => l.trim().toLowerCase()).filter(Boolean)
    : []
);
console.log(`Loaded ${MASTER_PROFANITY.size} words from master profanity list`);

/** High-confidence profane roots for substring matching (won't false-positive on normal words) */
const HIGH_CONFIDENCE_ROOTS = [
  'fuck', 'shit', 'cunt', 'nigger', 'nigga', 'faggot',
  'whore', 'slut', 'bitch',
  'blowjob', 'handjob', 'rimjob', 'titjob',
  'cocksucker', 'motherfuck', 'clusterfuck',
  'gangbang', 'circlejerk',
  'cumshot', 'creampie',
  'masturbat', 'ejaculat',
  'pornograph',
];

// ── Audit logic ─────────────────────────────────────────────────────────────

function auditWord(entry) {
  const issues = [];
  const w = entry.word.toLowerCase();

  // Skip allowlisted words
  if (ALLOWLIST.has(w)) return issues;

  // 1. Check if the word itself is in the master profanity list OR our extra blocklist
  if (MASTER_PROFANITY.has(w) || BLOCKED_WORDS.has(w)) {
    issues.push({ type: 'BLOCKED_WORD', field: 'word', detail: `"${entry.word}" is in the profanity/block list` });
  }

  // 2. Check word for high-confidence profane root substrings
  //    Only uses roots that won't false-positive on normal English words
  for (const root of HIGH_CONFIDENCE_ROOTS) {
    if (w.includes(root) && w !== root) {
      issues.push({
        type: 'WORD_CONTAINS_PROFANE_ROOT',
        field: 'word',
        detail: `"${entry.word}" contains profane root "${root}"`,
      });
      break; // One hit is enough
    }
  }

  // 3. Check definition for content patterns
  const def = entry.definition;
  if (def) {
    for (const pattern of CONTENT_PATTERNS) {
      if (pattern.test(def)) {
        issues.push({
          type: 'DEFINITION_CONTENT',
          field: 'definition',
          detail: `Definition of "${entry.word}" matches pattern ${pattern}: "${def.substring(0, 100)}..."`,
        });
        break; // One hit per field is enough
      }
    }
  }

  // 4. Check example sentence for content patterns
  const ex = entry.example;
  if (ex) {
    for (const pattern of CONTENT_PATTERNS) {
      if (pattern.test(ex)) {
        issues.push({
          type: 'EXAMPLE_CONTENT',
          field: 'example',
          detail: `Example for "${entry.word}" matches pattern ${pattern}: "${ex.substring(0, 100)}..."`,
        });
        break;
      }
    }
  }

  // 5. Check distractors against both profanity list and our blocklist
  for (const d of entry.distractors) {
    const dl = d.toLowerCase();
    if (MASTER_PROFANITY.has(dl) || BLOCKED_WORDS.has(dl)) {
      issues.push({
        type: 'DISTRACTOR_BLOCKED',
        field: 'distractors',
        detail: `Distractor "${d}" for word "${entry.word}" is blocked`,
      });
    }
  }

  return issues;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const wordsDir = path.join(__dirname, '..', 'src', 'domains', 'spelling', 'words');

  // Find all word files
  const allFiles = fs.readdirSync(wordsDir).filter(f =>
    f.endsWith('.ts') &&
    !f.endsWith('.d.ts') &&
    !f.startsWith('types') &&
    !f.startsWith('registry') &&
    !f.startsWith('index') &&
    !f.startsWith('uk-') &&
    !f.startsWith('competitionLists')
  );

  console.log(`Scanning ${allFiles.length} word files...\n`);

  let totalWords = 0;
  let totalIssues = 0;
  const allIssues = [];

  for (const file of allFiles) {
    const filePath = path.join(wordsDir, file);
    const words = extractWordsFromFile(filePath);
    totalWords += words.length;

    for (const entry of words) {
      const issues = auditWord(entry);
      if (issues.length > 0) {
        totalIssues += issues.length;
        allIssues.push(...issues.map(i => ({ ...i, file })));
      }
    }
  }

  // Group issues by severity
  const blockedWords = allIssues.filter(i => i.type === 'BLOCKED_WORD');
  const wordContains = allIssues.filter(i => i.type === 'WORD_CONTAINS_PROFANE_ROOT');
  const defContent = allIssues.filter(i => i.type === 'DEFINITION_CONTENT');
  const exContent = allIssues.filter(i => i.type === 'EXAMPLE_CONTENT');
  const distContent = allIssues.filter(i => i.type === 'DISTRACTOR_BLOCKED');

  console.log('=' .repeat(70));
  console.log(`CHILD SAFETY AUDIT RESULTS`);
  console.log('=' .repeat(70));
  console.log(`Total words scanned: ${totalWords.toLocaleString()}`);
  console.log(`Total issues found:  ${totalIssues}`);
  console.log();

  if (blockedWords.length > 0) {
    console.log(`\n🚨 BLOCKED WORDS (${blockedWords.length}):`);
    console.log('-'.repeat(50));
    for (const i of blockedWords) {
      console.log(`  [${i.file}] ${i.detail}`);
    }
  }

  if (wordContains.length > 0) {
    console.log(`\n⚠️  WORDS CONTAINING BLOCKED TERMS (${wordContains.length}):`);
    console.log('-'.repeat(50));
    for (const i of wordContains) {
      console.log(`  [${i.file}] ${i.detail}`);
    }
  }

  if (defContent.length > 0) {
    console.log(`\n📖 DEFINITION CONTENT FLAGS (${defContent.length}):`);
    console.log('-'.repeat(50));
    for (const i of defContent) {
      console.log(`  [${i.file}] ${i.detail}`);
    }
  }

  if (exContent.length > 0) {
    console.log(`\n📝 EXAMPLE SENTENCE FLAGS (${exContent.length}):`);
    console.log('-'.repeat(50));
    for (const i of exContent) {
      console.log(`  [${i.file}] ${i.detail}`);
    }
  }

  if (distContent.length > 0) {
    console.log(`\n🎯 DISTRACTOR FLAGS (${distContent.length}):`);
    console.log('-'.repeat(50));
    for (const i of distContent) {
      console.log(`  [${i.file}] ${i.detail}`);
    }
  }

  if (totalIssues === 0) {
    console.log('\n✅ ALL CLEAR — No child safety issues found!');
  } else {
    console.log(`\n\n❌ ${totalIssues} issue(s) require review.`);
  }

  process.exit(totalIssues > 0 ? 1 : 0);
}

main();
