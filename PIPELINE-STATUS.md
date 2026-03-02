# Word Bank Expansion Pipeline — Status

## Goal
Scale from ~3,000 words to 100,000 using open-source dictionaries.

## Data Sources
| Source | License | What it provides | Status |
|--------|---------|-----------------|--------|
| **Wiktionary** (kaikki.org dump) | CC-BY-SA 3.0 | Definitions, etymology, IPA, examples | **Imported** — 525K unique words, 144K with examples |
| **WordNet 3.1** (en-wordnet npm) | BSD (Princeton) | 82,918 words, definitions, synsets, examples | **Imported** into SQLite |
| **Free Dictionary API** | CC-BY-SA (Wiktionary) | Better definitions, IPA, etymology | **Partially enriched** ~1,600 words |

## Pipeline Architecture
```
Wiktionary dump (primary: definitions, etymology, IPA, examples)
  + WordNet 3.1 (coverage, synsets, additional definitions)
  → SQLite staging DB (scripts/output/words.db — 566K entries)
  → Difficulty classification (heuristic: length, syllables, patterns)
  → Distractor generation (phonetically plausible: suffix confusion, double letters, schwa, silent letters)
  → Quality filter (require real Wiktionary example sentence + definition ≥10 chars)
  → Export to TypeScript files (per-tier chunks for lazy loading)
  → Register in registry.ts (tiers 1-2 pipeline = lazy, tiers 3-5 merged with core)
```

## Pipeline Scripts
| Script | Purpose | Status |
|--------|---------|--------|
| `scripts/pipeline/import-wordnet.cjs` | Parse WordNet 3.1 → SQLite | **Done** |
| `scripts/pipeline/import-wiktionary.cjs` | Parse Wiktionary JSONL → merge into SQLite | **Done** (525K words) |
| `scripts/pipeline/re-enrich.cjs` | Reclassify + generate plausible distractors | **Done** (136K words) |
| `scripts/pipeline/export-to-app.cjs` | Export SQLite → TypeScript files (Wiktionary-quality only) | **Done** |
| `scripts/pipeline/enrich-batch.cjs` | Combined classification + API enrichment (legacy) | Done |
| `scripts/pipeline/bulk-enrich.cjs` | Generate distractors for all words (legacy) | Done |
| `scripts/pipeline/api-enrich.cjs` | Fetch API definitions in batches (legacy) | Done |
| `scripts/pipeline/validate-words.cjs` | Quality validation report | Done |

## SQLite Database (scripts/output/words.db)
- **566,664 total entries** (WordNet + Wiktionary merged)
- **525,244 unique words**
- **371,516** with etymology
- **143,988** with real example sentences (Wiktionary)
- **85,939** with IPA pronunciation
- Columns: word, pos, sense_count, definition, example, difficulty, tier, pattern, theme, distractors, pronunciation, etymology, wikt_definition, wikt_example, wikt_ipa, wikt_etymology, wikt_sense_count, wikt_imported, api_definition, api_example, api_phonetic, enriched

## Generated App Files (REGISTERED & WORKING)
Pipeline-generated TS files with Wiktionary-quality data, registered in registry.ts:
- `src/domains/spelling/words/tier1-pipeline.ts` — 1,556 words (lazy-loaded via `ensurePipelineWords()`)
- `src/domains/spelling/words/tier2-pipeline.ts` — 1,819 words (lazy-loaded via `ensurePipelineWords()`)
- `src/domains/spelling/words/tier3-pipeline.ts` — 2,817 words (merged with core tier3 on load)
- `src/domains/spelling/words/tier4-pipeline.ts` — 2,834 words (merged with core tier4 on load)
- `src/domains/spelling/words/tier5-pipeline.ts` — 972 words (merged with core tier5 on load)

**Total pipeline words: ~10,000** (all with real Wiktionary example sentences)

## What's Registered & Working
- 5 core hand-curated tiers (~2,800 words)
- 5 pipeline expansion tiers (~10,000 words)
- `tier5-expansion.ts` — 110 hand-curated competition words
- Scripps + State competition packs
- Tests pass: 121/121
- Full verify passes (lint + tsc + test + build)

## Word Count Summary
| Pool | Before | After | Source |
|------|--------|-------|--------|
| Hand-curated (tiers 1-5) | 2,800 | 2,800 | Manual |
| Pipeline expansion | 0 | 10,000 | Wiktionary + WordNet |
| **Total in app** | **~2,800** | **~12,800** | |
| Available in DB | 82,918 | 525,244 | Ready for future export |

## Distractor Quality (Improved)
Old algorithm used random character swaps producing nonsense like:
- `deletion → edletion, dleetion, deeltion`

New algorithm generates phonetically plausible student mistakes:
- `occurrence → occurrance, ocurrence, occurence` (ence/ance, double-letter)
- `separate → sepparate, separrate, separatte` (double-letter confusion)
- `independent → independant, inndependent, indeppendent` (ent/ant, doubles)
- `mischievous → mischievus, mischievious, misschievous` (suffix, double)

Strategies: suffix confusion, double-letter errors, silent letter traps, vowel digraph swaps, schwa confusion.

## Next Steps
1. Export more pipeline words (DB has 136K with examples, only 10K exported)
2. Increase per-tier limits as bundle splitting improves
3. Content filtering for kid-appropriateness (currently some obscure/adult words)
4. Consider JSON-based lazy loading instead of TS files for larger exports

## Quality Rules (from CLAUDE.md)
- Every word must have: accurate definition, correct POS, plausible distractors
- Distractors must NOT be the correct word, must NOT have duplicates
- Definitions should be kid-friendly, not overly technical
- Example sentences must be real (from Wiktionary), not generated filler
- Etymology required for tier 5 (competition words)
- No proper nouns, no hyphenated words, no abbreviations in the word bank

## Licensing
- WordNet 3.1: BSD — free commercial use, attribution required
- Wiktionary/kaikki.org: CC-BY-SA 3.0 — attribution required, share-alike
- Free Dictionary API: CC-BY-SA (wraps Wiktionary)
- Attribution must be included in app credits
