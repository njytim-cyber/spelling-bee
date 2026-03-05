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
- **Vitest** (18 test files, 251 tests)
- **PWA** via vite-plugin-pwa with offline caching

## Architecture

### Directory Layout
```
src/
├── App.tsx              # Root component, wires hooks → UI
├── config.ts            # Storage keys, Firestore collections, app identity
├── engine/              # Domain-agnostic game engine (types, scoring)
├── domains/spelling/    # Spelling-specific logic
│   ├── spellingCategories.ts   # Category/grade/group definitions
│   ├── spellingGenerator.ts    # Word selection + distractor generation
│   ├── spellingAchievements.ts # Achievement definitions
│   └── words/                  # Word bank (117K words across 9 tiers)
│       ├── registry.ts         # Lazy-loading tier registry
│       ├── index.ts            # Lookup utilities (wordsByPattern, getWordMap, etc.)
│       ├── tier[1-5].ts        # Hand-curated word files
│       └── tier[1-9]-pipeline*.ts  # Pipeline-generated word files (lazy-loaded)
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

### Hidden / Removed UI Elements
- **Syllables button** in Spelling Bee — removed from `SECONDARY_INFO` in `BeeSimPage.tsx`. The `spellInSections` hook logic is retained but unreachable from UI.
- **Rank emojis** — replaced with chalk-line SVG icons (`RankIcon` in `Icons.tsx`). Emoji field kept on `Rank` type for share text only.
- **Leaderboard NPC backfill** — 10 NPC entries fill the Compete leaderboard when fewer than 10 real players exist. NPCs are non-interactive (no ping/race).

### Key Patterns
- **Levels**: 10 levels (Level 1–10), each mapped 1:1 to difficulty values 1–10. Selected during onboarding, stored in UserContext. No K-12 grade names.
- **Session-based play**: User picks a level from the curriculum, then chooses session size (10/20/50 words). SRS determines mix (max 20% review, rest new).
- **Category → Generator**: `spellingCategories.ts` defines IDs/groups, `spellingGenerator.ts` maps them to word selection logic via `selectWordPool()`
- **Adaptive difficulty**: `useDifficulty` hook adjusts within the level's range based on answer speed
- **Leitner boxes**: Words progress through boxes 0-4 based on correct/incorrect answers, with increasing review delays
- **Lazy loading**: Tiers 1-2 core words are eager-loaded. Pipeline expansions + tiers 3-9 load on demand via `ensureAllTiers()`. Registry version counter triggers re-renders.
- **Stats merge**: Local-first with Firestore sync. `mergeStats()` takes the best of each field from local vs. cloud
- **Weekly XP**: `weeklyXP` + `weeklyXPWeek` fields in stats, reset each Monday. Firestore synced for weekly leaderboard.
- **Weekly goal**: localStorage-based goal tracker on PathPage (50/100/200/500 words), resets each week
- **Daily challenge sizes**: 10 (Quick) / 25 (Standard) / 50 (Marathon), all using same daily seed
- **Word book filters**: Origin tabs (Latin/Greek/French/Germanic/English/Other) + difficulty range selectors
- **Modal pattern**: `AnimatePresence` + `motion.div` with overlay click-to-close, consistent 340px width

### Word Bank Structure
Each `SpellingWord` has: word, definition, exampleSentence, partOfSpeech, difficulty (1-10), pattern, pronunciation, optional etymology/source.

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
| Scripps | Competition | 8-10 | 259 |
| State | Competition | 8-10 | 96 |

**Pipeline**: `scripts/pipeline/export-to-app.cjs` — SQLite → quality filters → TypeScript files. Three-layer child safety filtering: 2,694-word master profanity list + profane root substring matching + 130+ content regex patterns on definitions/examples. 7,773 inappropriate words blocked. All examples are real Wiktionary citations — no AI-generated sentences.

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

**Framework**: Vitest (no DOM/browser deps — tests run in Node). 18 test files, 251 tests.

**Run**: `npx vitest run` (once) or `npm run test` (watch mode).

### Test Categories

| Category | Files | What's covered |
|----------|-------|----------------|
| **Core game logic** | `useWordHistory`, `statsIntegration`, `dailyChallenge`, `seededRng` | Leitner SRS boxes, stats merge, day streaks, daily seed |
| **Word bank** | `wordRegistry`, `spellingGenerator`, `ukDialect`, `etymologyParser` | Tier loading, distractor generation, UK overrides, etymology parsing |
| **Scoring & progression** | `achievements`, `ranks`, `difficulty`, `curriculum` | All 27 achievements, rank transitions, adaptive difficulty algorithm, per-level progress |
| **Analytics** | `errorPatterns` | Error categorization, mistake insights, study plan, difficulty nudge |
| **UI utilities** | `spellingDiff`, `cloudTts`, `customLists` | LCS diff + hint detection, TTS caching, custom list CRUD |
| **Bee simulation** | `useBeeSimulation` | Round progression, elimination, no-help tracking |
| **Integration** | `integration-session` | Full flow: word generation → answer recording → stats → achievements → SRS |

### Canonical Definitions (must stay consistent across codebase)

- **Mastered word**: `box >= 4 && (typedAttempts ?? 0) >= 1` — requires both Leitner mastery AND at least one typed-answer attempt
- **6-bucket classification**: Practicing (box 0-1, ≥3 attempts, <50% accuracy), New (0 attempts), Learning (box 0-1), Reviewing (box 2), Familiar (box 3 or box 4 without typed), Mastered (canonical above)

### Test Strategy: Preventing Regressions

When adding a new feature, follow this checklist:

1. **Pure logic → unit test**: If the feature has pure functions (no React), add tests in `src/tests/`. Test edge cases and boundaries, not just happy paths.
2. **Hook logic → algorithm test**: For React hooks, extract and test the core algorithm as a plain-JS simulation (see `difficulty.test.ts`). Avoid `@testing-library/dom` dependency.
3. **Cross-module flow → integration test**: If the feature touches multiple modules (e.g., word selection + stats + achievements), add a case to `integration-session.test.ts`.
4. **Canonical definitions**: If the feature uses "mastered", "learning", or any mastery bucket, use the canonical definition above. The `useWordHistory.test.ts` has a test that enforces the mastery definition.
5. **Achievement additions**: Update the count assertion in `achievements.test.ts` and add a test for the new achievement's trigger condition.
6. **Word bank changes**: Run the full suite — `wordRegistry.test.ts` validates all loaded words have required fields.

## Word Bank Pipeline
- **Source DB**: `scripts/output/words.db` — Wiktionary + WordNet 3.1
- **Export script**: `scripts/pipeline/export-to-app.cjs` — SQLite → quality filters → TypeScript chunk files
- **Audit script**: `scripts/audit-child-safety.cjs` — scans all word files for inappropriate content
- **Registry**: `src/domains/spelling/words/registry.ts` — lazy-loading with chunked pipeline files

### Quality Rules (Principle 1 still applies)
- Every word must have accurate: definition, example sentence, part of speech, difficulty, pattern, pronunciation, distractors, theme
- Etymology required for difficulty 8+ (competition words)
- IPA pronunciation required for tiers 1-4; word-as-fallback OK for tiers 5+
- Distractors must never contain the correct spelling or any profane word
- No duplicates across hand-curated and pipeline files
- Three-layer child safety filtering: master profanity list (2,694 words) + profane root substring matching + 130+ content regex patterns
- Per-tier obscurity gates (tier 1: senseCount >= 5, tier 2: >= 3, tier 3: >= 2)
- All example sentences are real Wiktionary citations — no AI-generated content

## Pre-push Hook
`npm run verify` runs automatically before every `git push`. It runs lint, type-check, tests, and build — blocks push on failure.

## Related Documents
- `BETA-READINESS.md` — Comprehensive audit: functionality, performance, security, privacy, action items
- `FEATURE-BACKLOG.md` — Post-launch features (multiplayer, parent dashboard, completionist progress)
