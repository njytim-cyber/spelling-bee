# Word Bank Pipeline — Status

## Current State

**117,324 total words** in the app — 2,796 hand-curated + 91,569 pipeline across 9 tiers.

| Tier | Level | Difficulty | Curated | Pipeline | Total |
|------|-------|-----------|---------|----------|-------|
| 1 | Level 1 | 1 | 510 | 14,997 | 15,507 |
| 2 | Level 2 | 2 | 505 | 14,571 | 15,076 |
| 3 | Level 3 | 3 | 505 | 15,000 | 15,505 |
| 4 | Level 4 | 4 | 504 | 13,000 | 13,504 |
| 5 | Level 5 | 5 | 481 + 110 exp | 10,000 | 10,591 |
| 6 | Level 6 | 6 | — | 8,000 | 8,000 |
| 7 | Level 7 | 7 | — | 6,000 | 6,000 |
| 8 | Level 8 | 8 | — | 5,000 | 5,000 |
| 9 | Level 9 | 9 | — | 5,000 | 5,000 |
| Scripps | Competition | 8-10 | 259 | — | 259 |
| State | Competition | 8-10 | 96 | — | 96 |

## Data Sources

| Source | License | Status |
|--------|---------|--------|
| **Wiktionary** (kaikki.org dump) | CC-BY-SA 3.0 | Imported — 525K unique words |
| **WordNet 3.1** (en-wordnet npm) | BSD (Princeton) | Imported into SQLite |

## Pipeline Architecture

```
Wiktionary dump + WordNet 3.1
  → SQLite staging DB (scripts/output/words.db — 566K entries)
  → Difficulty classification (heuristic: length, syllables, patterns)
  → Distractor generation (phonetically plausible mistakes)
  → Quality filter (require real Wiktionary example + definition ≥10 chars)
  → Child safety filter (2,694-word blocklist + profane roots + 130+ regex patterns)
  → Export to TypeScript chunk files (1000 words/file, a-z suffix)
  → Register in registry.ts (lazy-loaded per tier)
```

## Pipeline Scripts

| Script | Purpose |
|--------|---------|
| `scripts/pipeline/import-wordnet.cjs` | Parse WordNet 3.1 → SQLite |
| `scripts/pipeline/import-wiktionary.cjs` | Parse Wiktionary JSONL → merge into SQLite |
| `scripts/pipeline/re-enrich.cjs` | Reclassify + generate plausible distractors |
| `scripts/pipeline/export-to-app.cjs` | Export SQLite → TypeScript files (with child safety filtering) |
| `scripts/audit-child-safety.cjs` | Scan all word files for inappropriate content |

## Child Safety Filtering

Three-layer system in `export-to-app.cjs`:
1. **WORD_BLOCKLIST** — 2,694 master + 400 custom profane words
2. **PROFANE_ROOTS** — substring matching for profane roots
3. **CONTENT_BLOCKLIST_PATTERNS** — 130+ regex patterns on definitions/examples

Result: **7,773 inappropriate words blocked** from 162K candidates.

Policy: violence/cruelty words are acceptable. Sexually suggestive content = zero tolerance.

## Quality Rules

- Every word must have: accurate definition, correct POS, plausible distractors
- All example sentences are real Wiktionary citations — no AI-generated content
- Etymology required for difficulty 8+ (competition words)
- IPA pronunciation required for tiers 1-4; word-as-fallback OK for tiers 5+
- Distractors must never contain the correct spelling or any profane word
- Per-tier obscurity gates (tier 1: senseCount ≥ 5, tier 2: ≥ 3, tier 3: ≥ 2)
- Chunk size: 1000 words per file (avoids TS2590 limit)

## Licensing

- WordNet 3.1: BSD — free commercial use, attribution required
- Wiktionary/kaikki.org: CC-BY-SA 3.0 — attribution required, share-alike
