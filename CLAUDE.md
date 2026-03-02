# Spelling Bee — Project Guide

## PRINCIPLE 1: Accuracy is everything
This is a spelling app. **Accuracy of word data is the most important thing.** Every word's definition, example sentence, part of speech, difficulty rating, phonics pattern, theme assignment, and pronunciation must be correct. This principle overrides all other considerations — speed, convenience, code elegance. Never generate or accept inaccurate word data. When in doubt, verify. A wrong definition or misclassified theme undermines the entire product.

## Quick Commands
```bash
npm run dev       # Dev server with HMR
npm run build     # TypeScript check + Vite production build
npm run test      # Vitest watch mode
npx vitest run    # Run tests once
npx tsc --noEmit  # Type-check only
npm run verify    # Full check: lint + tsc + test + build
```

## Tech Stack
- **React 19** + **TypeScript 5.9** + **Vite 7**
- **Tailwind CSS 4** (via Vite plugin, utility-first)
- **Framer Motion** (animations, swipe gestures, AnimatePresence)
- **Firebase** (Auth + Firestore for cloud sync, leaderboards, pings)
- **Vitest** + React Testing Library (8 test files, 80 tests)
- **PWA** via vite-plugin-pwa with offline caching

## Architecture

### Directory Layout
```
src/
├── App.tsx              # Root component, wires hooks → UI
├── config.ts            # Storage keys, Firestore collections, app identity
├── engine/              # Domain-agnostic game engine (types, scoring)
├── domains/spelling/    # Spelling-specific logic
│   ├── spellingCategories.ts   # Category/band/group definitions
│   ├── spellingGenerator.ts    # Word selection + distractor generation
│   ├── spellingAchievements.ts # Achievement definitions
│   └── words/                  # Word bank (100K target across 10 tiers)
│       ├── registry.ts         # Lazy-loading tier registry
│       ├── index.ts            # Lookup utilities (wordsByPattern, getWordMap, etc.)
│       └── tier[1-5].ts        # Word data files (tier 3-5 lazy-loaded)
├── hooks/               # Custom React hooks
│   ├── useGameLoop.ts   # Core swipe game loop (problems, scoring, streaks)
│   ├── useStats.ts      # Persistent stats (localStorage + Firestore sync)
│   ├── useWordHistory.ts # Leitner spaced repetition (5 boxes, review queue)
│   └── ...
├── components/          # UI components
│   ├── Icons.tsx        # Centralized SVG icon library (settings, speaker, etc.)
│   ├── MePage.tsx       # Profile/stats page
│   ├── LeaguePage.tsx   # Leaderboard
│   ├── BeeSimPage.tsx   # Bee simulation mode
│   ├── WordBookModal.tsx # Vocabulary browser
│   └── ...
├── utils/               # Pure utilities (themes, achievements, daily challenge)
└── tests/               # Vitest test files
```

### Key Patterns
- **Band system**: 3 difficulty bands (starter/rising/sigma) gate which word tiers and categories are available
- **Category → Generator**: `spellingCategories.ts` defines IDs/groups, `spellingGenerator.ts` maps them to word selection logic
- **Leitner boxes**: Words progress through boxes 0-4 based on correct/incorrect answers, with increasing review delays
- **Lazy loading**: Tiers 3-5 load on demand via `ensureTiersForBand()`. Registry version counter triggers re-renders
- **Stats merge**: Local-first with Firestore sync. `mergeStats()` takes the best of each field from local vs. cloud
- **Modal pattern**: `AnimatePresence` + `motion.div` with overlay click-to-close, consistent 340px width

### Word Bank Structure
Each `SpellingWord` has: word, definition, exampleSentence, partOfSpeech, difficulty (1-10), pattern, pronunciation, optional etymology/source.

**Target: 100,000 words across 10 tiers** (matching competitor scale).

| Tier | Grade | Difficulty | Patterns | DB Supply | Target |
|------|-------|-----------|----------|-----------|--------|
| 1 | Pre-K / K | 1-2 | cvc, blends, digraphs, sight words | 22,531 | 20,000 |
| 2 | 1st-2nd | 3 | silent-e, vowel-teams | 20,166 | 18,000 |
| 3 | 2nd-3rd | 4 | r-controlled, diphthongs | 21,193 | 15,000 |
| 4 | 3rd-4th | 5 | prefixes, suffixes, multisyllable | 19,417 | 13,000 |
| 5 | 4th-5th | 6 | compound, irregular, latin-roots | 17,828 | 10,000 |
| 6 | 6th-7th | 7 | latin-roots, greek-roots, french-origin | 14,903 | 8,000 |
| 7 | 7th-8th | 8 | Advanced roots, etymology required | 12,709 | 6,000 |
| 8 | 9th-10th | 9 | All patterns, etymology required | 7,271 | 5,000 |
| 9 | Competition | 10 | Competition words, full etymology | 414* | 3,000 |
| 10 | Championship | 10 | Scripps/state-level, full etymology | 414* | 2,000 |

*Tiers 9-10 share the diff-10 pool (currently 414). ~4,600 more diff-10 words need enrichment from the 566K DB.

**Current state**: ~2,900 hand-curated + ~2,353 pipeline words in app. Pipeline DB has **566,664 words** (2.7GB Wiktionary dump + WordNet 3.1), with **137,749 fully enriched** (definition + example + distractors). Of those, **~127K pass quality filters** — more than enough for 100K without generating any new data.

**Pipeline**: `scripts/pipeline/export-to-app.cjs` — SQLite → quality filters → TypeScript files. 11 rounds of quality iteration completed. ~25 content rejection rules, 200+ word blocklist, per-tier obscurity gates. No generated example sentences — all examples are real Wiktionary citations.

### CSS Conventions
- Two font families: `chalk` (display) and `ui` (interface)
- Color variables: `--color-gold`, `--color-correct`, `--color-wrong`, `--color-streak-fire`, `--color-chalk`, `--color-fg` (RGB triplet), `--color-overlay`
- Opacity via Tailwind: `text-[rgb(var(--color-fg))]/60` pattern
- Text sizes: `text-2xl chalk` (headings), `text-sm ui` (body), `text-[10px] ui` (tiny labels)

### Icon Conventions: SVG vs. Emoji
The app maintains a clear distinction between SVG icons and emojis to preserve its distinctive chalk-line aesthetic.

**USE SVG ICONS FOR:**
- Navigation elements (bottom nav, tabs)
- Interactive UI controls (buttons, settings, close/check/edit)
- Study tools (book, tree, chart icons)
- Leaderboard ranks (crown, medal, star for top 3)
- Achievement badges (all 21 achievement icons)
- Category icons (all 65+ phonics/theme icons)
- Any structural UI element that should match the chalk aesthetic

**USE EMOJIS FOR:**
- Swipe trail effects (🖍️🌈🔥⚡)
- Streak indicators (🔥 fire for streaks)
- Achievement celebrations (trophy, stars in toasts)
- Share text grids (🟩🟥 for social sharing)
- Mode badges (💀⏱️💯🐝)
- Rank emojis in player profiles (🌱📚🔤✏️ etc.)
- Playful, celebratory, or cosmetic elements

**Centralized Icon Library:**
All SVG icons live in `src/components/Icons.tsx`. Icons use:
- 24×24 viewBox (standard UI size)
- `stroke="currentColor"` for theme color inheritance
- `strokeWidth="2"` with `strokeLinecap="round"` `strokeLinejoin="round"`
- Consistent chalk-line hand-drawn aesthetic

**Examples:**
```tsx
// ✅ CORRECT - SVG for structural UI
import { IconSettings, IconCheck, IconClose } from './Icons';
<button><IconSettings className="w-5 h-5" /></button>

// ✅ CORRECT - Emoji for celebration/playful context
<div className="text-2xl">🏆 PERFECT</div>
<div>{streak}🔥</div>

// ❌ WRONG - Don't use emojis for structural UI
<button>⚙️</button> // Should use <IconSettings />

// ❌ WRONG - Don't use HTML entities or Unicode escapes
<span>&#127941;</span> // Use 🏆 directly
<span>{'\u{1F451}'}</span> // Use 👑 or <IconCrown /> depending on context
```

## Testing
Tests live in `src/tests/`. Run with `npx vitest run`. Key test areas:
- Stats merge logic
- Day streak calculations
- Spelling word generation
- Leitner spaced repetition
- Daily challenge seeding
- Word registry loading

## Word Bank Expansion (Active Goal)
**Target: 100,000 words across 10 tiers** — matching competitor scale while maintaining Principle 1 quality standards.

### Pipeline Architecture
- **Source DB**: `scripts/output/words.db` — 566,664 words from Wiktionary (2.7GB kaikki.org dump) + WordNet 3.1
- **Enriched pool**: 137,749 words with definition + example + distractors (ready for export)
- **IPA coverage**: 85,939 words with Wiktionary IPA pronunciations
- **Export script**: `scripts/pipeline/export-to-app.cjs` — 11 rounds of quality iteration
- **Registry**: `src/domains/spelling/words/registry.ts` — lazy-loading with chunked pipeline files

### Quality Rules (Principle 1 still applies)
- Every word must have accurate: definition, example sentence, part of speech, difficulty, pattern, pronunciation, distractors, theme
- Etymology required for difficulty 8+ (competition words)
- IPA pronunciation required for tiers 1-4; word-as-fallback OK for tiers 5+
- Distractors must never contain the correct spelling
- No duplicates across hand-curated and pipeline files
- ~25 content rejection rules (archaic language, inappropriate content, broken references, etc.)
- 200+ word blocklist + 90+ content pattern blocklist
- Per-tier obscurity gates (tier 1: senseCount >= 5, tier 2: >= 3, tier 3: >= 2)
- Difficulty 10 = genuinely championship-obscure; don't inflate easy words

### Scaling from 5 to 10 Tiers
The current app uses 5 tiers (difficulty 1-2, 3-4, 5-6, 7-8, 9-10). Expanding to 10 tiers means each difficulty level gets its own tier, allowing finer-grained progression. This requires:
1. Update `GradeLevel` type and `GradeConfig` to support tiers 1-10
2. Update `SpellingCategory` union with tier-6 through tier-10
3. Update band system to map to 10 tiers instead of 5
4. Update registry lazy-loading for tiers 6-10
5. Update export script tier mapping (difficulty → tier is now 1:1)
6. Update UI (grade picker, progression display)

## Pre-push Hook
`npm run verify` runs automatically before every `git push`. It runs lint, type-check, tests, and build — blocks push on failure.
