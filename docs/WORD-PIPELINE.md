# Word Bank & Pipeline

## Principle 1: Accuracy Is Everything

This is a spelling app. **Accuracy of word data is the most important thing.** Every word's definition, example sentence, part of speech, difficulty rating, phonics pattern, theme assignment, and pronunciation must be correct. This principle overrides all other considerations. A wrong definition or misclassified theme undermines the entire product.

## Word Structure

Each `SpellingWord` has: word, definition, exampleSentence, partOfSpeech, difficulty (1–10), pattern, pronunciation, optional etymology/source.

## Bank Size

**117,324 total words** — 2,796 hand-curated + 91,569 pipeline across 9 tiers.

| Tier | Level | Difficulty | Words |
|------|-------|-----------|-------|
| 1 | Level 1 | 1 | 510 + 14,997 pipeline |
| 2 | Level 2 | 2 | 505 + 14,571 pipeline |
| 3 | Level 3 | 3 | 505 + 15,000 pipeline |
| 4 | Level 4 | 4 | 504 + 13,000 pipeline |
| 5 | Level 5 | 5 | 481 + 110 expansion + 10,000 pipeline |
| 6 | Level 6 | 6 | 8,000 |
| 7 | Level 7 | 7 | 6,000 |
| 8 | Level 8 | 8 | 5,000 |
| 9 | Level 9 | 9 | 5,000 |
| — | Level 10 | 10 | (words from tiers 5, 9 at difficulty 10) |
| Scripps | Competition | 8–10 | 259 |
| State | Competition | 8–10 | 96 |

## Pipeline Tools

| Tool | Path | Purpose |
|------|------|---------|
| Source DB | `scripts/output/words.db` | Wiktionary + WordNet 3.1 |
| Export script | `scripts/pipeline/export-to-app.cjs` | SQLite → quality filters → TypeScript chunk files |
| Audit script | `scripts/audit-child-safety.cjs` | Scans all word files for inappropriate content |
| Registry | `src/domains/spelling/words/registry.ts` | Lazy-loading with chunked pipeline files |

## Quality Rules

- Every word must have accurate: definition, example sentence, part of speech, difficulty, pattern, pronunciation, distractors, theme
- Etymology required for difficulty 8+ (competition words)
- IPA pronunciation required for tiers 1–4; word-as-fallback OK for tiers 5+
- Distractors must never contain the correct spelling or any profane word
- No duplicates across hand-curated and pipeline files
- Per-tier obscurity gates: tier 1 `senseCount >= 5`, tier 2 `>= 3`, tier 3 `>= 2`
- All example sentences are real Wiktionary citations — no AI-generated content
- Chunk size: 1,000 words per file (avoids TS2590 compiler limit)

## Child Safety Filtering

Three-layer system in `export-to-app.cjs`:

1. **WORD_BLOCKLIST** — 2,694 master profanity list + 400 custom words
2. **PROFANE_ROOTS** — substring matching against profane roots
3. **CONTENT_BLOCKLIST_PATTERNS** — 130+ regex patterns on definitions/examples

Result: 7,773 inappropriate words blocked from 162K candidates.

**Policy**: violence/cruelty words are FINE. Sexually suggestive = ZERO TOLERANCE.

## Export Gotchas

- `existing-words.txt` must be reset to 2,796 curated words before re-export (export appends pipeline words; re-run would reject all as duplicates)
- PWA config: `maximumFileSizeToCacheInBytes: 8MB` for large tier chunks
