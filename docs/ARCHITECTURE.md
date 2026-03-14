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
│   ├── BeeBuddy.tsx     # Animated bee mascot (7 emotional states, costumes)
│   ├── PathPage.tsx     # Study dashboard (weekly goals, study plan, curriculum)
│   ├── MePage.tsx       # Profile/stats page
│   ├── LeaguePage.tsx   # Leaderboard + competition cards
│   ├── BeeSimPage.tsx   # Bee simulation mode
│   ├── SharedDailyWord.tsx # Daily word challenge (same word for all users)
│   ├── OnboardingModal.tsx # Dialect picker + diagnostic placement test
│   ├── FriendsModal.tsx # Friend management (add, accept, buddy streaks)
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

### Cloud TTS & CDN Caching
- **4 Neural2 voices**: US male/female (`en-US-Neural2-D`/`C`), UK male/female (`en-GB-Neural2-B`/`A`)
- **4-layer cache**: in-memory LRU (50 entries) → CDN miss cache → public Cloud Storage URL → Cloud Function fallback
- **Cache key**: MD5 of `${text.toLowerCase()|ssml}|${voiceName}|${rate}` — client-side MD5 matches server `crypto.createHash('md5')`
- **CDN URL**: `https://storage.googleapis.com/spelling-bee-prod-tts/tts-cache/{hash}.mp3` (public, 30-day Cache-Control)
- **Cost control**: each word+voice+rate synthesized at most once; subsequent requests served from Cloud Storage
- **Dedup**: client-side `inflightRequests` Map + server-side `ttsInflight` Map + server re-checks storage before synthesis (cold-start race guard)
- **Fallback**: Cloud TTS → browser Web Speech API → silent (graceful degradation in `usePronunciation`)
- **Rate limits**: 200/day free, 2000/day premium (Firestore `ttsRateLimit` collection, server-only)
- **Voice migration**: `initializeDefaultVoice()` in `main.tsx` auto-migrates removed voices on startup
- **Bucket**: `spelling-bee-prod-tts` in `us-central1`, lifecycle: 365-day auto-delete

### Analytics & Telemetry
- **GA4 via Firebase Analytics** (`src/utils/analytics.ts`): fire-and-forget wrapper, no-op in test/SSR
- **User identity**: `setAnalyticsUserId(uid)` on auth, `setAnalyticsUserProperties()` syncs level/subscription/profile
- **Retention signals**: `app_open` event on auth, `screen_view` on tab change — GA4 computes D1/D7/D30 from these
- **API latency**: `trackLatency(service, operation, fn)` wraps async calls, logs `api_latency` event with `duration_ms` + `success`. Instrumented on Cloud TTS, Stripe, multiplayer, referral redeem.
- **Web Vitals**: CLS, INP, LCP, FCP, TTFB → Firestore `vitals` collection
- **Error monitoring**: `window.error` + `unhandledrejection` → Firestore `errors` (10/session cap, sanitized URLs)
- **Session history**: localStorage-only, 90-day rolling window (`src/utils/sessionHistory.ts`)
- **Word retention**: daily `word_retention_check` event for mastered words > 30 days old

### Game Loop & Scoring Mechanics

**Buffer model**: `useGameLoop` pre-generates 8 items in a buffer. As items are consumed (answered), the replenishment effect adds one at a time. Score, streak, totalCorrect, totalAnswered are tracked in `GameState`.

**Score lifecycle**:
- Score accumulates within a play session and **persists across category changes** (intentional: switching level-3 → level-5 keeps the running score)
- `totalCorrect` and `totalAnswered` **reset** on category change (they track per-category stats)
- `recordSession()` is called when the user leaves the game tab. It records the **score delta** (score minus what was already recorded) to prevent double-counting XP
- The `hasUnrecordedAnswers` ref guards against recording the same session data twice on repeated tab switches

**Session phases** (for sized sessions only):
- `computePhaseLayout(size)` divides the session: warmup → build → boss → victory
- Each phase adjusts word difficulty: warmup = 1 level easier, build = current level, boss = 1 level harder, victory = 1 level easier
- Items are generated with a `generationCount` counter so batch-generated buffer items each get the correct phase (not all warmup)
- SRS words (box 3+) are preferentially used for warmup/victory phases

**Deduplication**:
- `usedWords` Set in `makeGenerateItem` prevents the same word appearing twice in the buffer
- SRS picks are excluded from the Set after selection; regular picks retry up to 5 times
- The Set resets when the generator closure is recreated (tier load, custom list change)

**Finite sets**: `GAME_CONFIG.finiteTypeIds` (`['daily', 'challenge', 'review']`) marks categories that use a fixed problem list instead of the infinite buffer. The engine calls `generateFiniteSet()` for these and skips buffer refill.

**Tutorial mode**: First answer (`totalAnswered === 0`, non-finite modes only) has no score penalty on wrong answer and no auto-advance — user must see the correct answer.

**Forgiving streaks**: Levels 1-3 (non-timed) get one free miss per streak without breaking it.

### Onboarding & Placement
- **Dialect picker** — first screen, choose US English or UK English
- **Diagnostic placement test** — 5 adaptive MCQ questions (difficulties 2, 4, 6, 7, 8) → auto-place user at Level 1–8
- Returning users skip diagnostic

### Referral & Friends (Unified Code System)
- **Single code**: SPELL-XXXX (referral code) works for both referrals and friend requests
- `addFriend()` accepts both BEE-XXXX (legacy friend codes) and SPELL-XXXX (referral codes via Firestore query)
- Auto-friend-add on referral redemption (`redeemedCode` state in `useReferral` → effect in App.tsx)
- `shareReferral()` uses Web Share API with clipboard fallback

### Hidden / Removed UI Elements
- **Rank emojis** — replaced with chalk-line SVG icons (`RankIcon` in `Icons.tsx`). Emoji field kept on `Rank` type for share text only.
- **Leaderboard NPC backfill** — 10 NPC entries fill the Compete leaderboard when < 10 real players. NPCs are non-interactive (no ping/race).
- **Separate friend code** — BEE-XXXX code display removed from Me page; referral code used for both purposes
