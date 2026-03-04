# Beta Readiness Audit — March 4, 2026

Comprehensive audit of the Spelling Bee app before beta testing. Covers functionality, performance, responsive design, error handling, offline behavior, code cleanliness, security, and privacy.

---

## Status Summary

| # | Check | Verdict | Score |
|---|-------|---------|-------|
| 1 | Core features — no critical bugs or crashes | PASS | 100% |
| 2 | Responsive UI — screen sizes, notches, safe areas | PASS | 95% |
| 3 | Loading states & error boundaries | NEEDS WORK | 64% |
| 4 | Offline / PWA graceful degradation | PASS | 95% |
| 5 | Dead links, placeholders, debug logs | PASS | 100% |
| 6 | Asset sizes & load performance | ACCEPTABLE | 80% |
| 7 | HTTPS enforcement | PASS | 100% |
| 8 | Local data storage security | PASS | 95% |
| 9 | Authentication & token management | PASS | 100% |
| 10 | API keys & environment variables | PASS | 100% |
| 11 | Privacy & data compliance | FAIL | 30% |

---

## 1. Core Features — No Critical Bugs or Crashes

**PASS**

- **129/129 tests pass** across 11 test files (Vitest v4.0.18)
- **Zero TypeScript errors** (`npx tsc --noEmit` clean)
- Error Boundary wraps entire app tree (`src/components/ErrorBoundary.tsx` → `src/main.tsx`)
- Global error monitor catches unhandled rejections, reports to Firestore `errors` collection (capped at 10/session)
- Web Vitals (CLS, INP, LCP, FCP, TTFB) reported to Firestore `vitals` collection

Slow tests (expected — they load the full 117K word bank):
- `wordRegistry.test.ts`: 39.9s
- `ukDialect.test.ts`: 26.8s
- `spellingGenerator.test.ts`: 21.1s

---

## 2. Responsive UI — Screen Sizes, Notches, Safe Areas

**PASS (95/100)**

### Viewport Configuration
- `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`
- `viewport-fit=cover` enables content to extend into notch areas (required for `env(safe-area-inset-*)`)

### Safe Area Inset Usage

`env(safe-area-inset-*)` used across 10+ components with fallback values:

| Component | Top Inset | Bottom Inset |
|-----------|-----------|--------------|
| BottomNav.tsx:56 | — | `pb-[env(safe-area-inset-bottom,4px)]` |
| FullScreenPanel.tsx:26 | `pt-[calc(env(safe-area-inset-top,12px)+12px)]` | `pb-[calc(env(safe-area-inset-bottom,16px)+16px)]` |
| LeaguePage.tsx:185 | `pt-[calc(env(safe-area-inset-top,16px)+40px)]` | `pb-24` |
| LeaguePage.tsx:388 (bottom sheet) | — | `pb-[calc(env(safe-area-inset-bottom,20px)+80px)]` |
| MePage.tsx:240 | `pt-[calc(env(safe-area-inset-top,12px)+48px)]` | `pb-20` |
| MultiplayerMatch.tsx:152 | `pt-[calc(env(safe-area-inset-top,16px)+16px)]` | `pb-24` |
| PathPage.tsx:543 | `pt-[calc(env(safe-area-inset-top,12px)+16px)]` | `pb-4` |
| TrickLesson.tsx:43 | `pt-[max(env(safe-area-inset-top,12px),12px)]` | `pb-[env(safe-area-inset-bottom,12px)]` |
| TricksPage.tsx:60 | `pt-[max(env(safe-area-inset-top,12px),12px)]` | `pb-24` |

Left/right insets not implemented — appropriate since app is portrait-locked and no current devices have side notches in portrait.

### Media Query Breakpoints (`src/index.css:562-696`)

```
Portrait (default)
├── Width < 500px  → --content-w: min(320px, 85vw)  [phones, Galaxy Fold]
├── 500px–768px    → --content-w: 400px              [large phones, Fold unfolded]
├── 768px + fine   → max-width: 430px centered       [desktop — TikTok-style column]
└── 768px + coarse → max-width: 600px centered       [tablets]

Landscape
├── Height > 820px    → moderate compaction
├── 501px–820px       → score 2.25rem, buttons auto-height, icons 1.25rem
└── ≤500px            → aggressive: score 2.5rem, buttons 3.5rem, icons 1rem
```

### Modals (`src/components/ModalShell.tsx`)
- Width: `w-[min(340px,90vw)]` — 340px on wide screens, 90% on narrow
- Height: `max-h-[80vh]` — scrolls if content exceeds
- Fixed centered positioning with `z-50`

### Issue Found
- **`public/manifest.json` says "Math Swipe"** — stale leftover. Build-time manifest (from Vite config) is correct ("Spelling Bee"). Should be updated or deleted.

---

## 3. Loading States & Error Boundaries

**NEEDS WORK (64/100)**

### What's Good

- **Error Boundary**: `src/components/ErrorBoundary.tsx` wraps entire app, catches render crashes
- **Global error monitor**: `src/utils/errorMonitor.ts` catches `error` + `unhandledrejection` events, reports to Firestore
- **Auth module** (`src/hooks/useFirebaseAuth.ts`): 95% protected — try/catch on Google link, email link, display name update; `.catch()` on anonymous sign-in, user doc fetch
- **Stats sync** (`src/hooks/useStats.ts`): 100% protected — local-first, try/catch on cloud operations
- **Leaderboard** (`src/components/LeaguePage.tsx`): 100% protected — loading state, error callback on `onSnapshot`
- **Preferences** (`src/hooks/useLocalState.ts`): 100% protected — silent fallback to localStorage

### Critical: useMultiplayerRoom.ts — 0% Error Handling

All 6 async Firestore operations have **NO try/catch**:

| Operation | Function | Line | Risk |
|-----------|----------|------|------|
| `setDoc()` | `createRoom()` | ~132 | HIGH — room creation fails silently |
| `getDocs()` | `joinRoom()` | ~144 | HIGH — query fails, unhandled rejection |
| `updateDoc()` | `joinRoom()` | ~168 | HIGH — player add fails silently |
| `onSnapshot()` | `subscribeToRoom()` | ~83 | MEDIUM — no error callback, listener fails silently |
| `updateDoc()` | `setReady()` | ~186 | HIGH — ready state fails silently |
| `updateDoc()` | `startMatch()` | ~194 | HIGH — match start fails silently |
| `runTransaction()` | `submitAnswer()` | ~206 | CRITICAL — answer submission fails, game freezes |

**Any network error in multiplayer will cause an unhandled promise rejection.**

### Other Missing Error Handling

| Location | Operation | Risk |
|----------|-----------|------|
| `useFirebaseAuth.ts:183` | `sendSignInLinkToEmail()` — no try/catch | MEDIUM |
| `App.tsx:294` | `ensureAllWords().then()` — no `.catch()` | MEDIUM |
| `App.tsx:525` | `onSnapshot()` for pings — no error callback | MEDIUM |
| `App.tsx:557` | `restoreUnlockedFromCloud().then()` — no `.catch()` (internally catches) | LOW |
| `achievements.ts:57-65` | `saveUnlocked()` — nested dynamic imports without `.catch()` | LOW |
| `webVitals.ts:26` | `import('web-vitals')` — no `.catch()` | VERY LOW |

### Loading States

| Component | Loading State? | Visual Indicator? |
|-----------|---------------|-------------------|
| LeaguePage | Yes | "Loading leaderboard..." text |
| useFirebaseAuth | Yes (`loading` state) | Returned via hook |
| useStats | No (local-first, instant) | Not needed |
| useMultiplayerRoom | Partial (`phase` state) | No spinner/skeleton |

---

## 4. Offline / PWA Graceful Degradation

**PASS (Excellent)**

### Service Worker & Caching (`vite.config.ts:18-55`)

| Config | Value | Purpose |
|--------|-------|---------|
| `registerType` | `'prompt'` | User chooses when to update |
| `maximumFileSizeToCacheInBytes` | 8 MB | Large tier chunks |
| `globIgnores` | `**/tier*-pipeline*.js`, `**/words-tier*.js` | Exclude lazy tiers from precache |
| `navigateFallback` | `'index.html'` | SPA routing |
| `cleanupOutdatedCaches` | `true` | Auto-delete old caches |

**Precache**: 56 static assets (HTML, JS, CSS, icons, fonts) — ~1.7 MB
**Runtime caching** (3 strategies):

| Pattern | Strategy | Cache Name | TTL |
|---------|----------|------------|-----|
| `fonts.googleapis.com/*` | CacheFirst | `google-fonts-stylesheets` | 1 year, 10 entries |
| `fonts.gstatic.com/*` | CacheFirst | `google-fonts-webfonts` | 1 year, 20 entries |
| `(words-tier\|tier\d+-pipeline).*\.js$` | CacheFirst | `word-packs` | 1 year, 30 entries |

### Update UI (`src/components/ReloadPrompt.tsx`)
- 60-minute auto-check interval
- Suppressed during gameplay (`suppress={activeTab === 'game'}`)
- Toast with "Update" button → `updateServiceWorker(true)` + 2s reload fallback

### Offline Detection (`src/components/OfflineBanner.tsx`)
- `navigator.onLine` + `online`/`offline` event listeners
- Animated banner: "📡 Offline — progress saves locally and syncs when you're back"

### Firestore Persistence (`src/utils/firebase.ts:18-20`)
```typescript
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
```
- Writes queue in IndexedDB, sync on reconnect
- Multi-tab coordination

### Stats Sync (`src/hooks/useStats.ts`)
1. **T=0ms**: `loadStatsLocal()` — synchronous from localStorage (instant render)
2. **T=100-500ms**: `loadStatsCloud()` — async, merges with local
3. **On change**: `saveStatsLocal()` (sync) + `saveStatsCloud()` (debounced 2s)
4. **On unmount**: Flush pending cloud write immediately
5. **Merge**: Version-aware — takes max of each counter, newest date, non-empty preferences

### TTS Fallback Chain (`src/hooks/usePronunciation.ts`)
1. Cloud TTS (Google Neural2) → if fails:
2. Browser Web Speech API → if fails:
3. Silent play (`ttsFailed` flag set)

### Offline Feature Matrix

| Feature | Offline? | Notes |
|---------|----------|-------|
| Core spelling game | FULL | All cached word data |
| Score/streak tracking | FULL | localStorage + Firestore queue |
| Daily challenge | FULL | Deterministic seed from date |
| Leitner SRS progression | FULL | localStorage-backed |
| Theme/cosmetics switching | FULL | localStorage |
| Custom word lists | FULL | localStorage, syncs later |
| Bee simulation mode | FULL | Local state only |
| TTS pronunciation | DEGRADED | Browser fallback (lower quality) |
| Leaderboard | UNAVAILABLE | Requires Firestore query |
| Multiplayer | UNAVAILABLE | Requires realtime sync |
| Google/Email sign-in | UNAVAILABLE | Anonymous works offline |
| Cloud TTS | UNAVAILABLE | Falls back to browser TTS |

---

## 5. Dead Links, Placeholders, Debug Logs

**PASS (Clean)**

### Console Statements (19 total — all legitimate)

- **4 `console.error()`**: ErrorBoundary crash handler, Firestore ping update, anonymous auth failure, Google link failure
- **14 `console.warn()`**: Firestore query/sync failures (LeaguePage, useStats, useFirebaseAuth, achievements), SW registration error, sound playback failures, max timer warning
- **1 `console.log()`**: `useStats.ts:181` — "Local stats are newer than cloud, skipping merge" (informational, could remove)

### Scan Results

| Category | Found | Details |
|----------|-------|---------|
| TODO/FIXME/HACK/XXX | 0 | Clean |
| Placeholder text (lorem, TBD, etc.) | 0 | Clean |
| `debugger` statements | 0 | Clean |
| Dead links (`href=""`, `href="#"`, etc.) | 0 | Clean |
| Commented-out code blocks | 0 | Only documentation comments |
| Unreachable code | 0 | Clean |

### Leftover Files to Clean Up
- `public/vite.svg` — Vite template default, unreferenced
- `src/assets/react.svg` — React template default, unreferenced

---

## 6. Asset Sizes & Load Performance

**ACCEPTABLE (with optimization opportunities)**

### Critical Path (every page load)

| Chunk | Raw | Gzipped | Contents |
|-------|-----|---------|----------|
| `index-*.js` | 731 KB | 197 KB | React, ReactDOM, tier 1-2 core words, all hooks, game engine, Icons.tsx |
| `firebase-*.js` | 464 KB | 141 KB | Firebase App + Auth + Firestore SDK |
| `framer-motion-*.js` | 139 KB | 46 KB | Animation library |
| `index-*.css` | 87 KB | 13 KB | Tailwind CSS output |
| **Total** | **~1,425 KB** | **~399 KB** | |

### Lazy-Loaded Pages (on navigation)

| Chunk | Raw | Gzipped |
|-------|-----|---------|
| BeeSimPage | 56 KB | 14 KB |
| PathPage | 51 KB | 13 KB |
| MePage | 27 KB | 8 KB |
| AchievementBadge | 14 KB | 3 KB |
| LeaguePage | 12 KB | 4 KB |
| GuidedSpellingPage | 12 KB | 4 KB |
| WrittenTestPage | 10 KB | 3 KB |
| MultiplayerMatch | 7 KB | 2 KB |

Page-level code splitting is excellent — all use `React.lazy()` with a retry wrapper.

### Lazy-Loaded Word Tiers (on level selection)

| Tier | Raw | Gzipped | ~Words |
|------|-----|---------|--------|
| tier1-pipeline | 606 KB | 174 KB | 14,997 |
| tier2-pipeline | 1,154 KB | 330 KB | 14,571 |
| tier3-pipeline | 1,938 KB | 555 KB | 15,000 |
| tier4-pipeline | 3,470 KB | 987 KB | 13,000 |
| tier5-pipeline | 4,342 KB | 1,286 KB | 10,000 |
| tier6-pipeline | 3,545 KB | 1,044 KB | 8,000 |
| tier7-pipeline | 2,670 KB | 790 KB | 6,000 |
| tier8-pipeline | 2,154 KB | 619 KB | 5,000 |
| tier9-pipeline | 2,083 KB | 552 KB | 5,000 |

Each tier is a single monolith. Level 5 downloads 4.3 MB in one request even though a session uses only 10-50 words.

### Transfer Size by User Scenario

| Scenario | Gzipped Transfer |
|----------|-----------------|
| First visit, app shell only | ~399 KB |
| + Play Level 1 | +174 KB |
| + Play Level 5 | +1,286 KB |
| All tiers + all pages loaded | ~7 MB |
| Repeat visit (cached) | 0 KB |

### Build Warnings
- 14 chunks exceed 500 KB (all word tiers + main index + firebase)
- Mixed import warning: `firebase.ts` statically imported by 8 modules AND dynamically imported by 2 — static wins, dynamic imports achieve nothing

### Optimization Opportunities (not blockers)

1. **Split React/ReactDOM into vendor chunk** — independent cache lifetime, saves ~140 KB on app updates
2. **Defer Firebase from critical path** — it's statically imported but not needed at first paint; saves 141 KB gzipped
3. **Sub-chunk word tiers** — remove `manualChunks` merge so Rollup keeps `tier5-pipeline-a` through `tier5-pipeline-j` separate; load first chunk (~430 KB) for immediate gameplay, prefetch rest
4. **Suppress expected chunk warnings** — set `chunkSizeWarningLimit: 2000`
5. **Remove unused devDeps** — `autoprefixer` and `postcss` likely unused with Tailwind CSS 4 Vite plugin

---

## 7. HTTPS Enforcement

**PASS (Excellent)**

- All Firebase connections use HTTPS/WSS
- Zero `http://` URLs in entire codebase
- CSP in `index.html:34-43`:
  ```
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  connect-src 'self' https://*.googleapis.com https://*.firebaseio.com
              wss://*.firebaseio.com https://*.firebaseapp.com
              https://firestore.googleapis.com https://identitytoolkit.googleapis.com
              https://securetoken.googleapis.com;
  img-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  ```
- Security headers in `firebase.json`:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- Cache-Control: immutable assets cached 1 year, HTML always fresh

---

## 8. Local Data Storage Security

**PASS**

### What's in localStorage (all non-sensitive)

| Key | Data | Sensitivity |
|-----|------|-------------|
| `spell-bee-stats` | XP, streaks, accuracy | Public (leaderboard) |
| `spell-bee-achievements` | Achievement IDs | Public (profile) |
| `spell-bee-word-history` | Leitner SRS box data | Semi-public |
| `spell-bee-displayName` | Chosen display name | Semi-public |
| `spell-bee-uid` | Firebase UID | Semi-public |
| `spell-bee-theme` | Dark/light mode | Public |
| `spell-bee-costume`, `-trail`, `-chalk-theme` | Cosmetics | Public |
| `spell-bee-tts-voice`, `-rate`, `-engine`, `-dialect` | TTS settings | Public |
| `spell-bee-grade` | Selected level | Public |
| `spell-bee-daily-results` | Daily challenge scores | Private |
| `spell-bee-session-history` | Historical sessions | Private |

### Temporary Sensitive Data
- `spell-bee-email-for-signin` — magic link email, stored only during sign-in flow, **cleared immediately after auth** (`useFirebaseAuth.ts:104, 115`)

### What's NOT in localStorage
- Firebase Auth tokens (SDK manages in IndexedDB)
- Passwords (never captured)
- API keys/secrets
- Credit card / PII

### IndexedDB
- Firestore SDK uses IndexedDB for persistent cache + multi-tab sync
- Managed entirely by Firebase SDK, not accessible to app code

---

## 9. Authentication & Token Management

**PASS (Excellent)**

### Auth Methods
- Anonymous sign-in by default
- Google OAuth for account linking
- Email/Magic Link sign-in
- All managed by Firebase Auth SDK

### Token Security
- Tokens managed by Firebase SDK (IndexedDB, not localStorage)
- Auto-refresh handled transparently
- Not accessible to app code
- Session state via `onAuthStateChanged` listener

### Display Name Sanitization (`useFirebaseAuth.ts:126-154`)
- HTML tags stripped: `/<[^>]*>/g`
- Special chars removed: `/[^\w\s\-_.!]/g`
- Max length: 20 characters
- Applied to both manual entry and Google OAuth names

### Firestore Security Rules (`firestore.rules`)

**User documents** (`/users/{uid}`):
- Read: any authenticated user (for leaderboard)
- Write: only document owner (`request.auth.uid == uid`)
- Field whitelist: 30+ allowed fields explicitly listed
- Type + range validation:
  - `displayName.size() <= 20`
  - `totalXP <= 1000000`
  - `bestStreak <= 1000`
  - `totalSolved <= 500000`
  - `accuracy >= 0 && accuracy <= 100`
  - `bestSpeedrunTime >= 5000` (anti-spoofing: can't finish in <5s)
  - `streakShields <= 10`
- Rate limiting: `request.time > resource.data.updatedAt + duration.value(1, 's')` (max 1 write/second)

**Pings** (`/pings/{pingId}`):
- Read: only target user
- Create: authenticated, sender identity validated, no self-pings, 30-second cooldown
- Update: only sender

**Errors** (`/errors/{errorId}`):
- Create only, authenticated
- Field whitelist: `message`, `stack`, `source`, `userAgent`, `url`, `timestamp`
- Size limits: message ≤500 chars, stack ≤2000 chars

---

## 10. API Keys & Environment Variables

**PASS (Acceptable)**

### Firebase Config
- Stored in `.env` (git-ignored) with `VITE_` prefix
- `.env.example` provides safe template
- Loaded via `import.meta.env.VITE_*` in `src/utils/firebase.ts`
- **Firebase API keys are public by design** — security is enforced by Firestore rules, not key secrecy

### Server-Side Secrets
- Cloud Function (`functions/src/index.ts`) uses Firebase Admin SDK
- Google Cloud TTS API called server-side only
- CORS restricted to production domains
- Rate limited: 200 requests/day/user, max 100 chars text, voice whitelist

### No Other Secrets Found
- No database passwords, admin tokens, OAuth client secrets, JWT secrets, or hardcoded access tokens

---

## 11. Privacy & Data Compliance

**FAIL — Critical gaps for public beta**

### What's Good (Technical)
- No third-party analytics (no Google Analytics, Mixpanel, etc.)
- Minimal data collection: auth, stats, preferences, web vitals, error reports
- No data sold or shared with third parties
- Firebase SOC2-certified infrastructure
- All connections encrypted (HTTPS/WSS)

### What's Missing (Legal/Compliance)

| Gap | Severity | Notes |
|-----|----------|-------|
| No Privacy Policy | CRITICAL | No document disclosing data collection, storage, retention, or user rights |
| No Terms of Service | CRITICAL | No terms for service use, limitations, liability |
| No account deletion feature | CRITICAL | Required for GDPR/CCPA — users cannot delete their data |
| No data export feature | HIGH | GDPR "right to data portability" |
| No COPPA compliance | CRITICAL | No age gate or parental consent — app targets children |
| No consent mechanism | HIGH | No explicit consent before data collection |
| Undisclosed web vitals collection | MEDIUM | Performance data collected without user notice |
| Undisclosed error reporting | MEDIUM | Stack traces + user agent sent to Firestore without notice |
| No data breach response plan | MEDIUM | No documented incident response process |

### User Data Collected

| Data | Storage | Purpose |
|------|---------|---------|
| UID | Firebase Auth + Firestore | User identification |
| Email (optional) | Firebase Auth | Account recovery |
| Display name | Firestore | Leaderboard profile |
| Game stats (XP, streaks, accuracy) | Firestore + localStorage | Leaderboard, personal tracking |
| Word history (Leitner boxes) | Firestore + localStorage | Spaced repetition |
| Achievements | Firestore | Profile display |
| Preferences (theme, TTS, cosmetics) | Firestore + localStorage | UI customization |
| Web Vitals (CLS, INP, LCP, FCP, TTFB) | Firestore | Performance monitoring |
| Error reports (message, stack, URL, user agent) | Firestore | Debugging |

### Third-Party Data Flow
1. **Firebase (Google Cloud)** — all data (required for core functionality)
2. **Google Cloud TTS API** — text to synthesize, voice settings (server-side only)
3. **Google Fonts** — no user data (IP address visible to Google, standard for any CDN)

---

## Action Items — All Complete

### Blockers (1-7) — DONE

| # | Item | Status |
|---|------|--------|
| 1 | Add try/catch to all 7 useMultiplayerRoom async operations | DONE |
| 2 | Add error callbacks to onSnapshot listeners | DONE |
| 3 | Add .catch() to sendEmailLink and ensureAllWords promises | DONE |
| 4 | Create Privacy Policy | DONE — `public/privacy.html` + Settings link |
| 5 | Create Terms of Service | DONE — `public/terms.html` + Settings link |
| 6 | Add account deletion feature | DONE — MePage button + Firestore + Auth cleanup |
| 7 | Fix stale manifest.json ("Math Swipe" → "Spelling Bee") | DONE |

### High Priority (8-12) — DONE

| # | Item | Status |
|---|------|--------|
| 8 | Add user-facing error toasts for network failures | DONE — `errorToast.ts` + global Toast |
| 9 | Add COPPA age gate | DONE — onboarding age confirmation step |
| 10 | Remove `console.log` in useStats.ts:181 | DONE |
| 11 | Remove template leftovers | DONE — deleted vite.svg, react.svg |
| 12 | Split React into vendor chunk | DONE — 192 KB separate chunk |

### Nice to Have (13-18) — DONE (4 of 6, 2 deferred)

| # | Item | Status |
|---|------|--------|
| 13 | Defer Firebase from critical path | DEFERRED — deep refactor, post-beta |
| 14 | Sub-chunk word tiers | DEFERRED — deep refactor, post-beta |
| 15 | Data export feature (GDPR portability) | DONE — JSON export in MePage |
| 16 | Self-host Google Fonts | DONE — woff2 in `public/fonts/`, CSP updated |
| 17 | Remove unused devDeps (autoprefixer, postcss) | DONE |
| 18 | Suppress expected chunk size warnings | DONE — `chunkSizeWarningLimit: 2000` |

---

## Reference: Firebase Operations Error Handling Coverage

Complete inventory of all 31 Firebase/Firestore operations and their protection status:

| File | Operation | Type | Protected? |
|------|-----------|------|-----------|
| useFirebaseAuth.ts | getDoc (user doc) | `.catch()` | YES |
| useFirebaseAuth.ts | signInAnonymously | `.catch()` | YES |
| useFirebaseAuth.ts | setDoc (new user) | `.catch()` | YES |
| useFirebaseAuth.ts | linkWithPopup | try/catch | YES |
| useFirebaseAuth.ts | signInWithPopup | try/catch | YES |
| useFirebaseAuth.ts | setDoc (Google link) | try/catch | YES |
| useFirebaseAuth.ts | setDisplayName | try/catch | YES |
| useFirebaseAuth.ts | linkWithCredential | `.catch()` | YES |
| useFirebaseAuth.ts | signInWithEmailLink | `.catch()` | YES |
| useFirebaseAuth.ts | **sendSignInLinkToEmail** | **NONE** | **NO** |
| useStats.ts | saveStatsCloud (setDoc) | try/catch | YES |
| useStats.ts | loadStatsCloud (getDoc) | try/catch | YES |
| useStats.ts | useEffect cloud load | Internal catch | YES |
| useStats.ts | unmount flush | `.catch()` | YES |
| useLocalState.ts | getDoc (cloud restore) | `.catch()` | YES |
| useLocalState.ts | setDoc (cloud sync) | `.catch()` | YES |
| **useMultiplayerRoom.ts** | **createRoom (setDoc)** | **NONE** | **NO** |
| **useMultiplayerRoom.ts** | **joinRoom (getDocs)** | **NONE** | **NO** |
| **useMultiplayerRoom.ts** | **joinRoom (updateDoc)** | **NONE** | **NO** |
| **useMultiplayerRoom.ts** | **subscribeToRoom (onSnapshot)** | **No error callback** | **NO** |
| **useMultiplayerRoom.ts** | **setReady (updateDoc)** | **NONE** | **NO** |
| **useMultiplayerRoom.ts** | **startMatch (updateDoc)** | **NONE** | **NO** |
| **useMultiplayerRoom.ts** | **submitAnswer (runTransaction)** | **NONE** | **NO** |
| LeaguePage.tsx | onSnapshot (leaderboard) | Error callback | YES |
| LeaguePage.tsx | addDoc (ping) | try/catch | YES |
| LeaguePage.tsx | setDoc (lastPingAt) | `.catch()` | YES |
| App.tsx | updateDoc (ping read) | `.catch()` | YES |
| **App.tsx** | **onSnapshot (pings)** | **No error callback** | **NO** |
| **App.tsx** | **ensureAllWords** | **No .catch()** | **NO** |
| App.tsx | restoreUnlockedFromCloud | Internal catch | YES |
| achievements.ts | restoreUnlockedFromCloud | try/catch | YES |
| achievements.ts | saveUnlocked (nested imports) | Nested `.catch()` | PARTIAL |
| webVitals.ts | import('web-vitals') | No `.catch()` | NO (non-critical) |

**Coverage: 22/31 protected (71%)**
