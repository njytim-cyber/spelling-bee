const data = require('./output/raw-definitions.json');
const found = data.filter(d => d.found);
console.log('Words to enrich:', found.length);
found.forEach(d => {
    const def = (d.meanings[0] && d.meanings[0].definitions[0] && d.meanings[0].definitions[0].definition) || 'no def';
    const pos = (d.meanings[0] && d.meanings[0].partOfSpeech) || '?';
    const hasOrigin = d.origin ? 'Y' : 'N';
    const hasExample = (d.meanings[0] && d.meanings[0].definitions[0] && d.meanings[0].definitions[0].example) ? 'Y' : 'N';
    const ph = d.phonetic || 'none';
    console.log(d.word + ' | ' + pos + ' | origin:' + hasOrigin + ' | ex:' + hasExample + ' | ph:' + ph);
});
