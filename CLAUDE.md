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
│   └── words/                  # Word bank (2900+ words across 5 tiers)
│       ├── registry.ts         # Lazy-loading tier registry
│       ├── index.ts            # Lookup utilities (wordsByPattern, getWordMap, etc.)
│       └── tier[1-5].ts        # Word data files (tier 3-5 lazy-loaded)
├── hooks/               # Custom React hooks
│   ├── useGameLoop.ts   # Core swipe game loop (problems, scoring, streaks)
│   ├── useStats.ts      # Persistent stats (localStorage + Firestore sync)
│   ├── useWordHistory.ts # Leitner spaced repetition (5 boxes, review queue)
│   └── ...
├── components/          # UI components
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

| Tier | Grade | Difficulty | Patterns | Count |
|------|-------|-----------|----------|-------|
| 1 | K-1st | 1-2 | cvc, blends, digraphs | 510 |
| 2 | 2nd-3rd | 3-4 | silent-e, vowel-teams, r-controlled, diphthongs | 505 |
| 3 | 4th-5th | 5-6 | prefixes, suffixes, compound, multisyllable, irregular | 505 |
| 4 | 6th-8th | 7-8 | latin-roots, greek-roots, french-origin + above | 504 |
| 5 | Competition | 9-10 | All patterns, etymology required | 512 |
| Scripps | National Bee | 10 | Competition words with full etymology | 250 |
| State | State Bee | 8-10 | State competition words | 108 |

### CSS Conventions
- Two font families: `chalk` (display) and `ui` (interface)
- Color variables: `--color-gold`, `--color-correct`, `--color-wrong`, `--color-streak-fire`, `--color-chalk`, `--color-fg` (RGB triplet), `--color-overlay`
- Opacity via Tailwind: `text-[rgb(var(--color-fg))]/60` pattern
- Text sizes: `text-2xl chalk` (headings), `text-sm ui` (body), `text-[10px] ui` (tiny labels)

## Testing
Tests live in `src/tests/`. Run with `npx vitest run`. Key test areas:
- Stats merge logic
- Day streak calculations
- Spelling word generation
- Leitner spaced repetition
- Daily challenge seeding
- Word registry loading

## Pre-push Hook
`npm run verify` runs automatically before every `git push`. It runs lint, type-check, tests, and build — blocks push on failure.
