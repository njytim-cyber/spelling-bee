# Architecture

## Directory Layout

```
src/
├── App.tsx              # Root component, wires hooks → UI
├── config.ts            # Storage keys, Firestore collections, app identity
├── engine/              # Domain-agnostic game engine (types, scoring)
├── domains/spelling/    # Spelling-specific logic
│   ├── spellingCategories.ts   # Category/grade/group definitions
│   ├── spellingGenerator.ts    # Word selection + distractor generation
│   ├── spellingAchievements.ts # Achievement definitions
│   └── words/                  # Word bank (51K words across 9 tiers)
│       ├── registry.ts         # Lazy-loading tier registry
│       ├── index.ts            # Lookup utilities (wordsByPattern, getWordMap, etc.)
│       ├── tier[1-5].ts        # Hand-curated word files
│       └── tier[1-9]-pipeline*.ts  # Pipeline-generated word files (lazy-loaded)
├── hooks/               # Custom React hooks
│   ├── useGameLoop.ts   # Core game loop (problems, scoring, streaks)
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

## Data Flow

```
User selects level → picks session size (10/20/50)
  → spellingGenerator.selectWordPool() picks words
  → SRS (useWordHistory) determines mix: max 20% review, rest new
  → useGameLoop runs the session (problems, scoring, streaks)
  → useStats persists results (localStorage + Firestore sync)
  → achievements evaluated after each answer
```

## Key Patterns

### Levels & Difficulty
- 10 levels (Level 1–10), each mapped 1:1 to difficulty values 1–10
- Selected during onboarding, stored in UserContext
- No K-12 grade names — just "Level N"
- `useDifficulty` hook adjusts within the level's range based on answer speed

### Input Model
- Answers via MCQ tap or typed entry — no swipe gestures
- Keyboard shortcuts: 1/2/3 for MCQ options, ↑ to skip
- Pinch zoom enabled for accessibility

### Session-Based Play
- User picks a level from the curriculum, then chooses session size (10/20/50 words)
- SRS determines mix (max 20% review, rest new)
- Daily challenge sizes: 10 (Quick) / 25 (Standard) / 50 (Marathon), all using same daily seed

### Category → Generator Pipeline
- `spellingCategories.ts` defines IDs/groups
- `spellingGenerator.ts` maps them to word selection logic via `selectWordPool()`

### Spaced Repetition (Leitner Boxes)
- Words progress through boxes 0–4 based on correct/incorrect answers
- Increasing review delays per box
- Mastered = `box >= 4 && (typedAttempts ?? 0) >= 1`

### Lazy Loading
- Tiers 1–2 core words are eager-loaded
- Pipeline expansions + tiers 3–9 load on demand via `ensureAllTiers()`
- Registry version counter triggers re-renders

### Stats & Sync
- Local-first with Firestore sync
- `mergeStats()` takes the best of each field from local vs. cloud
- `weeklyXP` + `weeklyXPWeek` fields in stats, reset each Monday, Firestore synced for weekly leaderboard
- Weekly goal: localStorage-based goal tracker on PathPage (50/100/200/500 words), resets each week

### Word Book
- Origin tabs: Latin/Greek/French/Germanic/English/Other
- Difficulty range selectors

### Analytics & Telemetry
- **GA4 via Firebase Analytics** (`src/utils/analytics.ts`): fire-and-forget wrapper, no-op in test/SSR
- **User identity**: `setAnalyticsUserId(uid)` on auth, `setAnalyticsUserProperties()` syncs level/subscription/profile
- **Retention signals**: `app_open` event on auth, `screen_view` on tab change — GA4 computes D1/D7/D30 from these
- **API latency**: `trackLatency(service, operation, fn)` wraps async calls, logs `api_latency` event with `duration_ms` + `success`. Instrumented on Cloud TTS, Stripe, multiplayer, referral redeem.
- **Web Vitals**: CLS, INP, LCP, FCP, TTFB → Firestore `vitals` collection
- **Error monitoring**: `window.error` + `unhandledrejection` → Firestore `errors` (10/session cap, sanitized URLs)
- **Session history**: localStorage-only, 90-day rolling window (`src/utils/sessionHistory.ts`)
- **Word retention**: daily `word_retention_check` event for mastered words > 30 days old

### Hidden / Removed UI Elements
- **Rank emojis** — replaced with chalk-line SVG icons (`RankIcon` in `Icons.tsx`). Emoji field kept on `Rank` type for share text only.
- **Leaderboard NPC backfill** — 10 NPC entries fill the Compete leaderboard when < 10 real players. NPCs are non-interactive (no ping/race).
