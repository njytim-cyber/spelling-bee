const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "src", "domains", "spelling", "words");
const files = fs.readdirSync(dir).filter(f => /tier\d+-pipeline-[a-z]\.ts$/.test(f));
console.log("Pipeline chunk files found:", files.length);

let allWords = [];
for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), "utf8");
  const arrStart = content.indexOf("[");
  if (arrStart === -1) continue;
  let i = arrStart;
  while (i < content.length) {
    if (content[i] === "{") {
      let depth = 1, start = i; i++;
      while (i < content.length && depth > 0) {
        if (content[i] === "{") depth++;
        else if (content[i] === "}") depth--;
        i++;
      }
      const block = content.slice(start, i);
      const wm = block.match(/"word":\s*"([^"]+)"/);
      const dm = block.match(/"definition":\s*"([^"]+)"/);
      const em = block.match(/"exampleSentence":\s*"([^"]+)"/);
      const dfm = block.match(/"difficulty":\s*(\d+)/);
      const pm = block.match(/"pattern":\s*"([^"]+)"/);
      const psm = block.match(/"partOfSpeech":\s*"([^"]+)"/);
      if (wm && dm && dfm) {
        allWords.push({word: wm[1], definition: dm[1], example: em?em[1]:"", difficulty: parseInt(dfm[1]), pattern: pm?pm[1]:"", pos: psm?psm[1]:"", file: f});
      }
    } else { i++; }
  }
}

console.log("Total pipeline words parsed:", allWords.length);
console.log("");
// CHECK 1: Bad definition starts
console.log("=== CHECK 1: Bad definition starts ===");
const badDefStarts = ["Obsolete", "Archaic", "Clipping of", "Ellipsis of", "Alternative form", "Alternative spelling", "Misspelling", "Dated form", "Eye dialect"];
let badDefs = [];
for (const w of allWords) {
  for (const pat of badDefStarts) {
    if (w.definition.startsWith(pat)) { badDefs.push(w); break; }
  }
}
console.log("Found:", badDefs.length);
badDefs.slice(0, 30).forEach(w => console.log("  " + w.word + " [d" + w.difficulty + "] (" + w.file + "): " + w.definition.substring(0, 80)));
if (badDefs.length > 30) console.log("  ... and " + (badDefs.length - 30) + " more");

// CHECK 2: Very short definitions
console.log("\n=== CHECK 2: Very short definitions ===");
const shortDefs = allWords.filter(w => w.definition.length < 15);
console.log("Found:", shortDefs.length);
shortDefs.slice(0, 30).forEach(w => console.log("  " + w.word.padEnd(20) + " [d" + w.difficulty + "] " + JSON.stringify(w.definition) + " (" + w.file + ")"));
if (shortDefs.length > 30) console.log("  ... and " + (shortDefs.length - 30) + " more");

// CHECK 3: Archaic/obsolete in low-diff definitions
console.log("\n=== CHECK 3: Archaic/obsolete in definition (difficulty <= 5) ===");
const archaicDefs = allWords.filter(w => /\b(obsolete|archaic)\b/i.test(w.definition) && w.difficulty <= 5);
console.log("Found:", archaicDefs.length);
archaicDefs.slice(0, 20).forEach(w => console.log("  " + w.word.padEnd(20) + " [d" + w.difficulty + "] " + w.definition.substring(0, 80)));

// CHECK 4: Duplicate words
console.log("\n=== CHECK 4: Duplicate words ===");
const wordCounts = {};
for (const w of allWords) { wordCounts[w.word] = (wordCounts[w.word] || 0) + 1; }
const dupes = Object.entries(wordCounts).filter(([, c]) => c > 1);
console.log("Found:", dupes.length);
dupes.slice(0, 30).forEach(([word, count]) => console.log("  " + word + " x" + count));
if (dupes.length > 30) console.log("  ... and " + (dupes.length - 30) + " more");

// CHECK 5: Words with unusual characters
console.log("\n=== CHECK 5: Words with unusual characters ===");
const unusualWords = allWords.filter(w => /[^a-z\-]/.test(w.word));
console.log("Found:", unusualWords.length);
unusualWords.slice(0, 20).forEach(w => console.log("  " + JSON.stringify(w.word) + " [d" + w.difficulty + "] (" + w.file + ")"));
if (unusualWords.length > 20) console.log("  ... and " + (unusualWords.length - 20) + " more");

// CHECK 6: Common words at high difficulty
console.log("\n=== CHECK 6: Common words at difficulty 7+ ===");
const commonWords = new Set(["the","and","is","are","was","were","has","have","had","do","does","did","will","would","could","should","may","might","can","shall","go","come","make","take","give","get","say","see","know","think","want","use","find","tell","ask","work","seem","feel","try","leave","call","need","become","keep","let","begin","show","hear","play","run","move","live","believe","bring","happen","write","sit","stand","lose","pay","meet","set","learn","change","lead"]);
const commonHighDiff = allWords.filter(w => w.difficulty >= 7 && commonWords.has(w.word));
console.log("Found:", commonHighDiff.length);
commonHighDiff.forEach(w => console.log("  " + w.word.padEnd(20) + " [d" + w.difficulty + "] " + w.definition.substring(0, 60)));

// CHECK 7: Empty definitions
console.log("\n=== CHECK 7: Empty definitions ===");
const emptyDefs = allWords.filter(w => !w.definition || w.definition.trim() === "");
console.log("Found:", emptyDefs.length);
emptyDefs.slice(0, 10).forEach(w => console.log("  " + w.word + " (" + w.file + ")"));

// CHECK 8: Self-referencing definitions
console.log("\n=== CHECK 8: Self-referencing definitions ===");
const selfRef = allWords.filter(w => {
  const d = w.definition.toLowerCase().trim();
  return d === w.word || d === "a " + w.word || d === "the " + w.word || d.startsWith(w.word + ".");
});
console.log("Found:", selfRef.length);
selfRef.slice(0, 20).forEach(w => console.log("  " + w.word.padEnd(20) + " " + JSON.stringify(w.definition.substring(0, 60))));

// CHECK 9: Inappropriate words
console.log("\n=== CHECK 9: Potentially inappropriate words ===");
const badWords = new Set(["ass","asses","bitch","bitches","cock","cocks","damn","damned","crap","crappy","slut","whore","bastard","piss","pissed","shit","fuck","penis","vagina","testicle","scrotum","orgasm","erection","ejaculate","fetish","dildo","condom","coitus","fornicate","copulate","rape","rapist","molest","incest","bestiality","voyeur","genital","genitalia","pubic","groin","phallus","phallic","clitoris","vulva","uterus","sperm","semen"]);
const inapprop = allWords.filter(w => badWords.has(w.word.toLowerCase()));
console.log("Found:", inapprop.length);
inapprop.forEach(w => console.log("  " + w.word + " [d" + w.difficulty + "] (" + w.file + ")"));

// CHECK 10: Broken encoding
console.log("\n=== CHECK 10: Broken encoding in definitions ===");
const brokenEncoding = allWords.filter(w => /&amp;|&lt;|&gt;|&#\d+;/.test(w.definition));
console.log("Found:", brokenEncoding.length);
brokenEncoding.slice(0, 10).forEach(w => console.log("  " + w.word + ": " + w.definition.substring(0, 80)));

// SUMMARY
console.log("\n=== SUMMARY ===");
const tierCounts = {};
for (const w of allWords) { const t = w.file.match(/tier(\d+)/)[1]; tierCounts[t] = (tierCounts[t] || 0) + 1; }
console.log("Words by tier:");
Object.keys(tierCounts).sort((a,b) => a-b).forEach(t => console.log("  Tier " + t + ": " + tierCounts[t] + " words"));

const diffCounts = {};
for (const w of allWords) { diffCounts[w.difficulty] = (diffCounts[w.difficulty] || 0) + 1; }
console.log("Words by difficulty:");
Object.keys(diffCounts).sort((a,b) => a-b).forEach(d => console.log("  Difficulty " + d + ": " + diffCounts[d] + " words"));

const totalIssues = badDefs.length + shortDefs.length + archaicDefs.length + dupes.length + unusualWords.length + commonHighDiff.length + emptyDefs.length + selfRef.length + inapprop.length + brokenEncoding.length;
console.log("\nTotal issues found:", totalIssues);