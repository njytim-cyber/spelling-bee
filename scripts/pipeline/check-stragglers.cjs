const fs = require('fs');
const src = fs.readFileSync('src/domains/spelling/words/tier7-pipeline-c.ts', 'utf8');
const words = ['mendip','kenning','sinopia','aldehyde','dearness','donatist','borogove'];

for (const w of words) {
  const idx = src.indexOf(`"word": "${w}"`);
  if (idx === -1) {
    console.log(w + ': NOT FOUND');
    continue;
  }
  const chunk = src.substring(idx, idx + 800);
  const defMatch = chunk.match(/"definition":\s*"([^"]*)"/);
  if (defMatch) {
    console.log(w + ' (' + defMatch[1].length + ' chars): ' + defMatch[1]);
  } else {
    console.log(w + ': found but no def match');
    console.log('  chunk:', chunk.substring(0, 300));
  }
}
