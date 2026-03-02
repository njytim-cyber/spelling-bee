const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'domains', 'spelling', 'words');
const files = fs.readdirSync(dir).filter(f => f.match(/tier\d+-pipeline/));

let allWords = [];
for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  // Extract the array from the TypeScript file
  const startIdx = content.indexOf('= [');
  const endIdx = content.lastIndexOf('];');
  if (startIdx === -1 || endIdx === -1) continue;
  const jsonStr = content.substring(startIdx + 2, endIdx + 1);
  try {
    const words = JSON.parse(jsonStr);
    for (const w of words) {
      allWords.push({
        word: w.word,
        def: w.definition || '',
        example: w.exampleSentence || '',
        diff: w.difficulty,
        pattern: w.pattern,
        pos: w.partOfSpeech,
        file: f
      });
    }
  } catch (e) {
    console.error('Failed to parse', f, e.message);
  }
}
console.log('Total pipeline words parsed:', allWords.length);
if (allWords.length === 0) {
  process.exit(1);
}

// CHECK 1: Bad definition starts
const badStarts = ['Obsolete', 'Archaic', 'Alternative form', 'Alternative spelling', 'Misspelling', 'Dated form', 'Eye dialect', 'Ellipsis of'];
let bad1 = allWords.filter(w => badStarts.some(s => w.def.startsWith(s)));
console.log('\n=== BAD DEF STARTS (' + bad1.length + ') ===');
bad1.slice(0, 40).forEach(w => console.log('  ' + w.word.padEnd(22) + ' [d' + w.diff + '] ' + w.def.substring(0, 70)));
if (bad1.length > 40) console.log('  ... +' + (bad1.length - 40) + ' more');

// CHECK 2: Misspelling in definition
let misspell = allWords.filter(w => /\bmisspelling\b/i.test(w.def));
console.log('\n=== MISSPELLING IN DEF (' + misspell.length + ') ===');
misspell.forEach(w => console.log('  ' + w.word.padEnd(22) + ' [d' + w.diff + '] ' + w.def.substring(0, 70)));

// CHECK 3: Known misspelled words in the bank
const knownMisspellings = ['ommited', 'ommitted', 'occured', 'occurence', 'seperate', 'definately', 'accomodate', 'recieve', 'wierd', 'thier', 'untill', 'managment', 'goverment', 'enviroment', 'acheive', 'arguement', 'beleive', 'calender', 'cemetary', 'collegue', 'concious', 'embarass', 'foriegn', 'garentee', 'harrass', 'independant', 'knowlege', 'liason', 'millenium', 'neccessary', 'occassion', 'parliment', 'perseverence', 'posession', 'privelege', 'questionaire', 'reccomend', 'refering', 'relevent', 'resistence', 'supercede', 'threshhold', 'tommorow', 'vaccuum', 'wether'];
let misspelledWords = allWords.filter(w => knownMisspellings.includes(w.word.toLowerCase()));
console.log('\n=== KNOWN MISSPELLED WORDS (' + misspelledWords.length + ') ===');
misspelledWords.forEach(w => console.log('  ' + w.word + ' [d' + w.diff + '] ' + w.def.substring(0, 70)));

// CHECK 4: Duplicate words
const wordCounts = {};
allWords.forEach(w => { wordCounts[w.word] = (wordCounts[w.word] || 0) + 1; });
const dupes = Object.entries(wordCounts).filter(([, c]) => c > 1);
console.log('\n=== DUPLICATES (' + dupes.length + ') ===');
dupes.slice(0, 20).forEach(([w, c]) => console.log('  ' + w + ' x' + c));

// CHECK 5: Very short defs
let shortDef = allWords.filter(w => w.def.length < 10);
console.log('\n=== VERY SHORT DEFS <10 chars (' + shortDef.length + ') ===');
shortDef.slice(0, 30).forEach(w => console.log('  ' + w.word.padEnd(20) + ' "' + w.def + '"'));
if (shortDef.length > 30) console.log('  ... +' + (shortDef.length - 30) + ' more');

// CHECK 6: Place names / personal names at low difficulty
let placeNames = allWords.filter(w => w.diff <= 4 && /^(A|The) (city|town|village|borough|county|parish|municipality|region|province|state|country|river|lake|mountain|island|surname|male|female|unisex)/i.test(w.def));
console.log('\n=== PLACE/PERSONAL NAMES at diff<=4 (' + placeNames.length + ') ===');
placeNames.slice(0, 30).forEach(w => console.log('  ' + w.word.padEnd(20) + ' [d' + w.diff + '] ' + w.def.substring(0, 70)));

// CHECK 7: Inappropriate words that slipped through
const badWordsList = ['pussyboy', 'ballsily', 'wenchful', 'cuckold', 'cuckquean', 'concubine', 'harlot', 'strumpet', 'trollop', 'dominatrix', 'bondage', 'sadist', 'masochist', 'pervert', 'voyeur', 'exhibitionist', 'fetish', 'orgasm', 'erotic', 'erotica', 'eroticism', 'erection', 'genital', 'genitalia', 'phallus', 'phallic', 'clitoris', 'vulva', 'scrotum', 'testicle', 'penis', 'vagina', 'coitus', 'fornicate', 'fornication', 'fornicator', 'sodomy', 'sodomite', 'sodomize', 'bugger', 'buggery', 'bastard', 'bitch', 'bitches', 'whore', 'slut', 'slutty', 'cock', 'cocks', 'damn', 'damned', 'piss', 'pissed', 'shit', 'shitty', 'fuck', 'fucking', 'ass', 'asses', 'anal', 'anus', 'dildo', 'condom', 'brothel', 'prostitute', 'prostitution', 'pimp', 'rapist', 'rape', 'molest', 'molestation', 'incest', 'pedophile', 'paedophile', 'necrophilia', 'bestiality'];
const badWordsSet = new Set(badWordsList);
let inapprop = allWords.filter(w => badWordsSet.has(w.word.toLowerCase()));
console.log('\n=== INAPPROPRIATE WORDS (' + inapprop.length + ') ===');
inapprop.forEach(w => console.log('  ' + w.word + ' [d' + w.diff + '] ' + w.def.substring(0, 70)));

// Also check for inappropriate substrings in definitions (for kids app)
let badDefContent = allWords.filter(w => w.diff <= 6 && /\b(sexual|sexually|genitals?|penis|vagina|erotic|orgasm|masturbat|ejaculat|pornograph|prostitut|rape|incest|bestiality|pedophil|paedophil|sodom|fornic|coitus)\b/i.test(w.def));
console.log('\n=== INAPPROPRIATE CONTENT IN DEFS (diff<=6) (' + badDefContent.length + ') ===');
badDefContent.slice(0, 20).forEach(w => console.log('  ' + w.word.padEnd(22) + ' [d' + w.diff + '] ' + w.def.substring(0, 70)));

// CHECK 8: Wrong POS (noun with verb-style def, etc.)
let wrongPOS = allWords.filter(w => {
  if (w.pos === 'noun' && /^To /.test(w.def)) return true;
  if (w.pos === 'verb' && /^(A|An|The|One|Any) /.test(w.def) && !/^(A|An?) .*(manner|way)/.test(w.def)) return true;
  if (w.pos === 'adjective' && /^(A|An|The|One) [a-z]/.test(w.def) && w.def.length > 20) return true;
  return false;
});
console.log('\n=== LIKELY WRONG POS (' + wrongPOS.length + ') ===');
wrongPOS.slice(0, 50).forEach(w => console.log('  ' + w.word.padEnd(22) + ' [' + w.pos.padEnd(10) + '] ' + w.def.substring(0, 65)));
if (wrongPOS.length > 50) console.log('  ... +' + (wrongPOS.length - 50) + ' more');

// CHECK 9: Fabricated prefix/suffix words that slipped through at low difficulty
const fabPrefixes = ['un', 'mis', 'non', 'out', 'over', 'under', 'pre', 're', 'anti', 'super', 'mega', 'ultra'];
let fabricatedLow = allWords.filter(w => {
  if (w.diff > 3) return false;
  for (const p of fabPrefixes) {
    if (w.word.startsWith(p) && w.word.length > p.length + 3) {
      if (/^(Not |Without |Lacking |Opposite of )/.test(w.def)) return true;
      if (/^To .* (again|improperly|wrongly|incorrectly)/.test(w.def)) return true;
    }
  }
  return false;
});
console.log('\n=== FABRICATED PREFIX WORDS at diff<=3 (' + fabricatedLow.length + ') ===');
fabricatedLow.slice(0, 30).forEach(w => console.log('  ' + w.word.padEnd(22) + ' [d' + w.diff + '] ' + w.def.substring(0, 65)));
if (fabricatedLow.length > 30) console.log('  ... +' + (fabricatedLow.length - 30) + ' more');

// CHECK 10: Definitions that reference Wiktionary artifacts
let wiktArtifacts = allWords.filter(w => /\b(sense \d|gloss|Wiktionary|Wikipedia|cf\.|q\.v\.|ibid|sic|viz\.|loc\.cit)\b/i.test(w.def));
console.log('\n=== WIKTIONARY ARTIFACTS IN DEFS (' + wiktArtifacts.length + ') ===');
wiktArtifacts.slice(0, 20).forEach(w => console.log('  ' + w.word.padEnd(22) + ' [d' + w.diff + '] ' + w.def.substring(0, 70)));

// CHECK 11: Words where example sentence doesn't contain the word
let badExamples = allWords.filter(w => {
  if (!w.example || w.example.length < 5) return false;
  return !w.example.toLowerCase().includes(w.word.toLowerCase());
});
console.log('\n=== EXAMPLE MISSING THE WORD (' + badExamples.length + ' total, showing 30) ===');
badExamples.slice(0, 30).forEach(w => console.log('  ' + w.word.padEnd(22) + ' ex: "' + w.example.substring(0, 60) + '"'));

// CHECK 12: Tier/difficulty distribution
console.log('\n=== TIER/DIFFICULTY DISTRIBUTION ===');
const distrib = {};
allWords.forEach(w => {
  const key = 'd' + w.diff;
  distrib[key] = (distrib[key] || 0) + 1;
});
Object.keys(distrib).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1))).forEach(k => console.log('  ' + k + ': ' + distrib[k]));

// CHECK 13: Suffix junk words: -less, -ful, -ness, -ly applied to odd roots at low diff
const suffixPatterns = [
  { suffix: 'less', minLen: 6 },
  { suffix: 'ful', minLen: 5 },
  { suffix: 'ness', minLen: 6 },
  { suffix: 'ly', minLen: 5 }
];
let suffixJunk = allWords.filter(w => {
  if (w.diff > 4) return false;
  for (const sp of suffixPatterns) {
    if (w.word.endsWith(sp.suffix) && w.word.length >= sp.minLen) {
      const root = w.word.slice(0, -sp.suffix.length);
      // Check if the definition is just "Without X", "Full of X", "The state of being X", "In a X manner"
      if (/^(Without|Lacking|Devoid of|Having no|Free from|Not having) /.test(w.def)) return true;
      if (/^(Full of|Having|Characterized by|Abounding|Rich in) /.test(w.def)) return true;
      if (/^(The state|The quality|The condition|The property|The act) of /.test(w.def)) return true;
      if (/^In a .* manner/.test(w.def)) return true;
    }
  }
  return false;
});
console.log('\n=== SUFFIX JUNK WORDS at diff<=4 (' + suffixJunk.length + ') ===');
suffixJunk.slice(0, 40).forEach(w => console.log('  ' + w.word.padEnd(22) + ' [d' + w.diff + '] ' + w.def.substring(0, 65)));
if (suffixJunk.length > 40) console.log('  ... +' + (suffixJunk.length - 40) + ' more');

// CHECK 14: Words with "Clipping of" definition
let clippings = allWords.filter(w => /^Clipping of\b/.test(w.def));
console.log('\n=== CLIPPING OF definitions (' + clippings.length + ') ===');
clippings.slice(0, 20).forEach(w => console.log('  ' + w.word.padEnd(22) + ' [d' + w.diff + '] ' + w.def.substring(0, 70)));

// CHECK 15: Obscure words at very low difficulty (d1-d2)
let obscureLow = allWords.filter(w => w.diff <= 2 && (
  /\b(archaic|dialectal|obsolete|rare|literary|poetic|historical|dated)\b/i.test(w.def) ||
  w.word.length > 10
));
console.log('\n=== OBSCURE/LONG WORDS at diff<=2 (' + obscureLow.length + ') ===');
obscureLow.slice(0, 30).forEach(w => console.log('  ' + w.word.padEnd(22) + ' [d' + w.diff + '] ' + w.def.substring(0, 65)));
if (obscureLow.length > 30) console.log('  ... +' + (obscureLow.length - 30) + ' more');
