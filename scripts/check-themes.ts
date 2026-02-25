import { TIER_1_WORDS } from '../src/domains/spelling/words/tier1';
import { TIER_2_WORDS } from '../src/domains/spelling/words/tier2';
import { TIER_3_WORDS } from '../src/domains/spelling/words/tier3';
import { TIER_4_WORDS } from '../src/domains/spelling/words/tier4';
import { TIER_5_WORDS } from '../src/domains/spelling/words/tier5';
import { TIER_5_SCRIPPS_WORDS } from '../src/domains/spelling/words/tier5-scripps';
import { TIER_5_STATE_WORDS } from '../src/domains/spelling/words/tier5-state';

const all = [...TIER_1_WORDS, ...TIER_2_WORDS, ...TIER_3_WORDS, ...TIER_4_WORDS, ...TIER_5_WORDS, ...TIER_5_SCRIPPS_WORDS, ...TIER_5_STATE_WORDS];
const themed = all.filter(w => w.theme);
const unthemed = all.filter(w => !w.theme);
console.log('Total:', all.length, '| Themed:', themed.length, '| Unthemed:', unthemed.length);

const counts: Record<string, number> = {};
for (const w of themed) counts[w.theme!] = (counts[w.theme!] || 0) + 1;
console.log('\nTheme counts:');
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);

console.log('\nSample unthemed words (first 80):');
for (const w of unthemed.slice(0, 80)) console.log(`  ${w.word} — ${w.definition}`);
console.log('\n... middle sample (500-560):');
for (const w of unthemed.slice(500, 560)) console.log(`  ${w.word} — ${w.definition}`);
console.log('\n... late sample (1200-1260):');
for (const w of unthemed.slice(1200, 1260)) console.log(`  ${w.word} — ${w.definition}`);
