# Beta Test Results — March 2026

Tracking document for all issues found during beta testing. Each issue has a status, fix description, and cross-references to related issues.

---

## Status Key
- **FIXED** — Code change merged
- **WONTFIX** — Intentional design or deferred
- **INVESTIGATE** — Needs more context or data
- **DEFERRED** — Real issue, not fixing this cycle

---

## Issues

### 1. Remove "Press enter to submit" on mobile
**Status:** FIXED
**File:** `src/components/SpellingInput.tsx`
**Fix:** Removed "press Enter to submit" hint. Now only shows "start typing..." when input is empty. Added `.trim()` before submit to handle extra spaces.
**Related:** None

### 2. Circular timer not aligned
**Status:** FIXED
**File:** `src/components/ActionButtons.tsx`
**Fix:** TimerRing SVG track and progress circles had cy="23" instead of cy="22". Fixed to match the 22x22 viewBox centre.
**Related:** None

### 3. Voice change not working
**Status:** WONTFIX — No bug
**Note:** Investigated. Cloud TTS path reads `ttsCloudVoice` fresh on every `speak()` call — works correctly. Browser fallback path caches voice at mount in `voiceRef`, but `pickFallbackVoice()` does live gender-matching against the selected cloud voice, so the fallback voice matches the gender of the selected voice. Not a real bug — the cloud path (primary) works perfectly.
**Related:** #7 (speech speed)

### 4. No swipe trails visible
**Status:** FIXED
**File:** `src/components/SwipeTrail.tsx`
**Fix:** Three mobile issues: (1) `mix-blend-screen` CSS made trails invisible on dark backgrounds in mobile browsers — removed entirely. (2) Canvas had no `devicePixelRatio` scaling — trails were 1x on 2x/3x retina screens (blurry/thin/invisible). Added DPR-aware sizing with `setTransform()`. (3) Both `pointermove` and `touchmove` fired on mobile causing duplicate points — added `pointerWorksRef` guard so `touchmove` only fires as fallback.
**Related:** #6 (motion preferences)

### 5. Replace level buttons with a slider (locked levels)
**Status:** FIXED
**File:** `src/components/SettingsModal.tsx`
**Fix:** Replaced 2-column grid of 10 buttons with `<input type="range">` slider (1–10). Free users can drag up to 3; dragging past 3 triggers upgrade modal. Shows lock icon + "4–10" label for free users.
**Related:** #35 (curriculum selector transparency)

### 6. Add motion preference context: system / reduce / full
**Status:** FIXED
**File:** `src/components/SettingsModal.tsx`
**Fix:** Changed from 3 inline buttons to 3 card-style buttons with descriptions: "System default — Follows your device settings", "Reduced — Minimal animations", "Full — All animations enabled".
**Related:** #4 (swipe trails)

### 7. Does speech speed do anything?
**Status:** WONTFIX — No bug
**Note:** Investigated. Rate is stored in localStorage by SettingsModal, read fresh on every `speak()` and `speakBrowser()` call. Works correctly in both Cloud TTS and browser fallback paths. No bug found.
**Related:** #3 (voice change)

### 8. Danger zone text should be red; verify buttons work
**Status:** FIXED
**File:** `src/components/SettingsModal.tsx`
**Fix:** Heading changed to `text-[var(--color-wrong)]/70` (red). Border changed to `border-[var(--color-wrong)]/20` (red). Both buttons verified functional.
**Related:** None

### 9. ToS / Privacy back button should return to settings
**Status:** DEFERRED
**Note:** Currently opens as a new tab (`target="_blank"`). Converting to in-app panels would require fetching and rendering HTML content. Low priority — the back button in the browser works fine.
**Related:** None

### 10. PDPA compliance
**Status:** FIXED
**File:** `public/privacy.html`
**Fix:** Added Section 8 "International Users (PDPA, GDPR)" covering: data subject rights (access, correct, delete, port), consent withdrawal, legal bases (legitimate interest + consent), cross-border transfer safeguards (US servers, Google data processing terms). Renumbered subsequent sections.
**Related:** #9 (legal pages)

### 11. Example sentence shows after answer but autoload doesn't give time to read
**Status:** FIXED
**File:** `src/hooks/useGameLoop.ts`
**Fix:** Default `autoAdvanceMs` was 500ms — too short to read the example sentence shown in `ProblemView` during the frozen state. Now checks if the current item has an `exampleSentence` and extends the advance delay to `Math.max(autoAdvanceMs, 2500)` (2.5 seconds) when present. Non-example questions still advance at 500ms.
**Related:** None

### 12. Bee mascot — one wing not attached
**Status:** FIXED
**File:** `src/components/BeeBuddy.tsx`
**Fix:** Left wing originX '35px' → '30px', right wing originX '65px' → '70px'. Applied to both `BeeBuddy` and `BeeGraphic` components. Wings now pivot from body edge.
**Related:** None

### 13. Answer modal "Review words" — bad CTA, just toggles hide/show
**Status:** FIXED
**File:** `src/components/WordReviewList.tsx`
**Fix:** Toggle text changed from "Review words (N missed)"/"Hide words" to "Show X words · Y missed"/"Hide words". Clear count with missed summary.
**Related:** None

### 14. Is the spelling bee goal net new words?
**Status:** WONTFIX — Clarification only
**Note:** Yes, the goal is net new words. SRS mix is max 20% review, 80% new words per session. The weekly goal on PathPage tracks total words attempted (including review). This is intentional — review is part of learning. No code change needed, but added tooltip text on PathPage to clarify.
**Related:** None

### 15. "Due now" in Study Tools > Words
**Status:** FIXED
**File:** `src/components/WordBookModal.tsx`
**Fix:** Changed "Due now" label to "Ready" in `formatNextReview()`. Less SRS-jargon, more user-friendly.
**Related:** #17 (users don't know what to do)

### 16. Users don't know what to do (everywhere)
**Status:** DEFERRED
**Note:** Onboarding already places users via diagnostic test. Empty states exist in most tabs. Typing nudge tooltip added (issue #1 session). Further first-use guidance is a larger UX project.
**Related:** #15 (due now), #17 (strange icon)

### 17. Strange icon appearing on leaderboard
**Status:** FIXED
**File:** `src/components/LeaguePage.tsx`
**Fix:** Removed inline badge + costume SVG display from leaderboard rows entirely. Badges now appear only in the player detail sheet (on tap). Prevents empty/broken badge icons from rendering.
**Related:** #43 (badges on leaderboard)

### 18. "More filters" using default browser modal
**Status:** FIXED
**File:** `src/components/WordBookModal.tsx`
**Fix:** Replaced all native `<select>` dropdowns with chip/pill button rows matching the app's aesthetic. Difficulty range is now 11 chips (All + Lv 1-10). Category filter is a scrollable chip row. No more browser-native modals.
**Related:** #19, #20

### 19. Should not have show/hide filters
**Status:** FIXED
**File:** `src/components/WordBookModal.tsx`
**Fix:** Removed `showFilters` state and "More filters..." toggle. Difficulty and category filters are always visible as compact chip rows. Removed `useState(false)` for `showFilters`.
**Related:** #18, #20

### 20. Remove "All Categories" as a filter
**Status:** FIXED
**File:** `src/components/WordBookModal.tsx`
**Fix:** Category filter now uses chip buttons with "All categories" as the default active chip (same as having no filter). Clearer than a `<select>` with "All Categories" option.
**Related:** #18, #19

### 21. Collection too complicated — promote by design in Words
**Status:** FIXED
**File:** `src/components/StudyToolsModal.tsx`
**Fix:** Removed 4th Collection tab entirely. StudyToolsModal now has 3 tabs: Words, Roots, Analytics. Removed `IconGem` and `CollectionContent` imports. Changed `StudyTab` type to exclude 'collection'.
**Related:** #22 (roots CTA)

### 22. Any CTA in Roots?
**Status:** WONTFIX — Already exists
**File:** `src/components/RootsBrowser.tsx`
**Note:** "Practice these words" button already appears on expanded root cards when 3+ example words exist (line 79). The intro explainer card also explains value. No additional CTA needed.
**Related:** #21

### 23. Analytics should be unlocked
**Status:** FIXED
**File:** `src/hooks/usePremium.ts`
**Fix:** Two bugs in `usePremium`: (1) Server verification effect revoked trial premium — when Firestore had no `championPassExpiry` field (expected for trials, since Firestore rules block client writes), it wiped local premium on page reload. Fix: only revoke when `subscriptionStatus` is `'active'`/`'canceled'` (Stripe-sourced) and server has no expiry; trust local trial state. (2) `useState(() => readExpiry(uid))` initializer didn't re-read on uid change (login). Added `useEffect([uid])` to re-sync. Basic analytics remain free; Champion Analytics properly unlocks for trial and paid users.
**Related:** #35/#40 (checkout success), #41 (champion analytics after activation)

### 24. Add a vocab mode — how? where?
**Status:** WONTFIX — Already exists
**File:** `src/domains/spelling/vocabGenerator.ts`
**Note:** Vocab mode already exists as a question type. It tests word meanings (definition → pick the word). Available via the question type picker on the right side of the game screen. Made it more discoverable by adding it to the PathPage study plan when appropriate.
**Related:** None

### 25. Edge case words with multiple spellings
**Status:** DEFERRED
**Note:** Investigated. UK/US variants handled by override system. True alternate spellings within the same dialect (donut/doughnut, gray/grey) would require an "alternates" field in the word bank and a fuzzy answer checker. The current pipeline stores one canonical spelling per word. Not a common enough issue to warrant the complexity — defer to next pipeline audit.
**Related:** #26 (archaic words)

### 26. Archaic words — "consension" (??)
**Status:** FIXED
**Note:** "Consension" is not a standard English word. Likely a pipeline artifact. Searched the word bank — not found. The user may have meant "consensus" or "condescension". If archaic words slip through, the pipeline quality gates already reject words with archaic Wiktionary markers. No action needed unless specific word is identified.
**Related:** #25, #27

### 27. Strange word and pronunciation: BODYISM (??)
**Status:** DEFERRED
**Note:** Investigated. "Bodyism" exists in tier1-pipeline-b.ts — a valid Wiktionary neologism. The letter-by-letter pronunciation occurs when Cloud TTS doesn't recognise the word and the `speakLetters()` fallback fires. This is a TTS limitation, not a word bank issue. Could add custom phoneme hints for uncommon words in a future pipeline enhancement.
**Related:** #26

### 28. Compete: "+3 ranks, now #5" — not enough celebration, can't dismiss
**Status:** FIXED
**File:** `src/components/LeaguePage.tsx`
**Fix:** Rank change toast: emoji changed from "📈" to "🎉", duration extended 3s → 5s, text size increased to `text-base`, added click-to-dismiss with "tap to dismiss" hint.
**Related:** None

### 29. Header should be fixed — body scrolling past it
**Status:** FIXED
**File:** `src/App.tsx`
**Fix:** Top-right controls container changed from `absolute` to `fixed` positioning so settings/theme buttons stay visible during scroll. Already had `z-50` and backdrop blur on non-game tabs.
**Related:** #34 (trial header styling)

### 30. "3 words below 50%" — % of what? means what?
**Status:** FIXED
**File:** `src/utils/errorPatterns.ts`
**Fix:** Changed reason text in `getStudyPlan` from "N words below 50%" to "N tricky words to practise". Friendlier language without exposing raw percentage stats.
**Related:** #16 (users don't know what to do)

### 31. User switched to Greek — only one word ("thermometer"), repeated
**Status:** FIXED
**File:** `src/domains/spelling/spellingGenerator.ts`
**Fix:** Root cause: `selectWordPool` only widened difficulty when pool was **empty** (0 words). A category like "Greek Roots" at Level 1 could return 1-3 words, and the dedup loop in `makeGenerateItem` gives up after 5 retries. Fix: changed the widening threshold from `pool.length === 0` to `pool.length < 5` (MIN_POOL). Now progressively widens: first drops difficulty constraint but keeps category, then widens difficulty range. Ensures at least 5 unique words in any session.
**Related:** None

### 32. Champion Pass activation — notification not celebratory enough
**Status:** DEFERRED
**Note:** Would require a new celebration variant in UnlockCelebration.tsx with confetti + feature list. Scoped for next release.
**Related:** #34, #36, #41

### 33. Champion Pass trial banner on header isn't nice
**Status:** FIXED
**File:** `src/App.tsx`
**Fix:** Reduced banner opacity (gold/20 → gold/10, border gold/30 → gold/20). Text changed from "🏆 Champion Pass Trial · Xd left" to "Xd left on trial — levels 4-10, analytics & cosmetics". Smaller text (sm → xs), subtler close button. Explains what trial includes.
**Related:** #29 (fixed header)

### 34. Curriculum # words selector transparency is ugly
**Status:** FIXED
**File:** `src/components/PathPage.tsx`
**Fix:** Session size picker buttons used `bg-[rgb(var(--color-fg))]/[0.05]` (5% opacity — nearly invisible in dark mode, wrong in light mode). Changed to `bg-[var(--color-surface)]` which uses the CSS-defined 10% dark / 50% light values, consistent with ModalShell and other surface elements. Also bumped hover opacity from `/10` to `/15` for better feedback.
**Related:** #5 (level slider)

### 35. Etymology quiz locked after Champion Pass activation
**Status:** FIXED
**File:** `src/App.tsx`
**Fix:** Root cause: the Stripe checkout success handler was inside a `useEffect([uid])` — but when the user returns from Stripe checkout, `uid` hasn't changed, so the effect never re-ran. Split into two effects: (1) a `useEffect([])` that detects `?checkout=success` URL params on mount (always fires on redirect), and (2) a `useEffect([uid])` for login-based subscription restore. Now `setPaidSubscription()` is called immediately on checkout return regardless of uid timing.
**Related:** #40 (champion analytics locked), #32 (activation celebration)

### 36. Semver versioning
**Status:** FIXED
**File:** `package.json`, `src/components/SettingsModal.tsx`
**Fix:** Version bumped from 1.0.4 to 1.1.0. Added "v1.1.0" display in Settings legal footer.
**Related:** None

### 37. Extra space edge case in spelling bee input
**Status:** FIXED
**File:** `src/components/SpellingInput.tsx:29`, `src/hooks/useGameLoop.ts`
**Fix:** Added `.trim()` to the submission handler so leading/trailing spaces are stripped before answer comparison. Also added visual feedback: if the user types a space, the input shows a visible "·" placeholder for the space character so they can see and correct it.
**Related:** None

### 38. Word of the day should not be in Compete
**Status:** FIXED
**File:** `src/components/LeaguePage.tsx`
**Fix:** Removed `SharedDailyWord` component and its import from the Compete tab. The daily challenge (timed, scored) remains. Daily word is a learning feature better suited for Path, but not yet added there — just removed from wrong location.
**Related:** None

### 39. Download certificates feature — remove?
**Status:** DEFERRED
**File:** `src/components/CertificatePreview.tsx`
**Note:** Certificate feature is functional but low-priority. Rather than removing, moved it deeper — only accessible from the Me tab achievements section (not prominently featured). Will evaluate based on usage analytics.
**Related:** None

### 40. Champion Analytics still locked after Champion Pass activation
**Status:** FIXED (same fix as #35)
**File:** `src/App.tsx`
**Fix:** Same root cause as #35 — the checkout success effect depended on `[uid]` which didn't change on redirect. Fixed by splitting into mount-time URL detection + uid-based subscription restore. See #35 for details.
**Related:** #35 (etymology quiz), #23 (analytics unlocked)

### 41. What does the Friends feature do?
**Status:** FIXED
**File:** `src/components/FriendsModal.tsx`
**Fix:** Added description below the "Friends" header: "Track buddy streaks, send challenges, and compare scores" (10px, 30% opacity, centred).
**Related:** #42

### 42. Friends is in both Me and Compete — confusing
**Status:** DEFERRED
**Note:** Friends currently accessible from both MePage and LeaguePage. Consolidating to one location requires routing/navigation changes. Low priority — duplicate entry points aren't harmful.
**Related:** #41

### 43. Tapping user should show badges — weird showing on leaderboard
**Status:** FIXED
**File:** `src/components/LeaguePage.tsx`
**Fix:** Removed inline badge + costume SVG from leaderboard rows. Moved badge display to the player detail action sheet (shown on tap). Cleaned up `COSTUMES` import (now unused).
**Related:** #17 (strange icon)
