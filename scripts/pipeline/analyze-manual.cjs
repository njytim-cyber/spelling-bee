const manifest = require('./needs-manual-fix.json');
const counts = { defOnly: 0, exOnly: 0, both: 0 };
const defIssues = { long: 0, short: 0, circular: 0, jargon: 0, multiSense: 0, posMismatch: 0 };
const exIssues = { template: 0, missingWord: 0 };

for (const [file, words] of Object.entries(manifest)) {
    for (const w of words) {
        if (w.defStillBad && w.exStillBad) counts.both++;
        else if (w.defStillBad) counts.defOnly++;
        else counts.exOnly++;

        if (w.defStillBad) {
            const d = w.bestDefFound || w.currentDef;
            if (d.length > 100) defIssues.long++;
            if (d.length <= 20) defIssues.short++;
            const escaped = w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp('\\b' + escaped + '\\b', 'i').test(d)) defIssues.circular++;
            if (/pertaining to|of or relating to|the act of \w+ing|in a \w+ manner|^one who|the state of being|characterized by/i.test(d)) defIssues.jargon++;
            if ((d.match(/;/g) || []).length >= 3) defIssues.multiSense++;
            if ((w.partOfSpeech === 'noun' && d.toLowerCase().startsWith('to ')) ||
                (w.partOfSpeech === 'verb' && /^(a|an|the|one|any)\s/i.test(d))) defIssues.posMismatch++;
        }

        if (w.exStillBad) {
            const ex = w.bestExFound || w.currentEx;
            if (/took a while|vocabulary words|on the board|chapter about|pattern on the quilt|taught us how|science lesson|spelling word/i.test(ex)) {
                exIssues.template++;
            } else {
                exIssues.missingWord++;
            }
        }
    }
}
console.log('Manual fix breakdown:');
console.log('  Def only bad:', counts.defOnly);
console.log('  Ex only bad:', counts.exOnly);
console.log('  Both bad:', counts.both);
console.log('  Total:', counts.defOnly + counts.exOnly + counts.both);
console.log('\nDef issue types:', JSON.stringify(defIssues, null, 2));
console.log('\nEx issue types:', JSON.stringify(exIssues, null, 2));

// Sample 10 "both bad" words
console.log('\nSample "both bad" words:');
let shown = 0;
for (const [file, words] of Object.entries(manifest)) {
    for (const w of words) {
        if (w.defStillBad && w.exStillBad && shown < 10) {
            console.log(`  ${w.word} [${w.partOfSpeech}] (${w.issues.join(', ')})`);
            console.log(`    def: ${(w.bestDefFound || w.currentDef).slice(0, 80)}`);
            console.log(`    ex:  ${(w.bestExFound || w.currentEx).slice(0, 80)}`);
            shown++;
        }
    }
}
