# Spelling Bee — Student Personas & Gap Analysis

Four student personas representing the app's core audience. No parents, no teachers — just the people swiping.

---

## Persona 1: Mia, age 7 — "The Beginner"

**Profile:** 2nd grader, just learning to read fluently. Uses mom's iPad after school. Short attention span (5-10 min sessions). Gets upset when she gets things wrong. Loves collecting things.

**Goals:**
- Learn to spell the words her teacher writes on the board
- Feel smart, not stupid
- Collect badges and dress up her bee

**How she uses the app:**
- Picks Level 1 or 2 (CVC words: cat, dog, run)
- Plays 10-word sessions (can't focus for 50)
- Taps answers more than swipes (swipe gesture is hard for small hands)
- Relies on audio pronunciation — she sounds out words before choosing
- Checks her badges after every session

**What works for Mia today:**
- Swipe/tap game is intuitive — gold glow on correct answer feels great
- Speaker icon lets her hear words (critical for early readers)
- Emoji badges are exciting to collect
- Short sessions (10 words) respect her attention span
- Adaptive difficulty keeps her in range — not too hard

**Gaps & checklist:**

- [ ] **Forgiving streaks for Level 1-3** — she gets 4 right, misses 1, streak resets, she cries, closes the app
  - [ ] Add `streakForgiveness` config per level (levels 1-3 get 1 free miss before streak breaks)
  - [ ] Show "Nice try! Keep going!" instead of streak-break animation for forgiven misses
  - [ ] Still mark the answer wrong for SRS purposes — just don't reset the streak counter
  - [ ] No forgiveness in hard mode or timed mode (those are opt-in challenge modes)
- [ ] **Level recommendation in onboarding** — she picks Level 7 because the wizard emoji looks cool, gets "ambiguous," quits
  - [ ] Add "Recommended" badge on Level 1 for new users (no prior data)
  - [ ] Add subtitle text under "Pick your level": "Not sure? Start with Level 1!"
  - [ ] Pre-select Level 1 so it's highlighted by default (user can change)
- [ ] **Simpler wrong-answer panel for low levels** — after a miss she sees definition + etymology + "Explore origin" + pronunciation, overwhelming
  - [ ] For levels 1-3: hide etymology section and "Explore origin" button in wrong-answer panel
  - [ ] Show only: correct word (big chalk letters) + "Hear it" button + "Tap to continue"
  - [ ] Keep definition visible (it's the prompt anyway)
- [ ] **Pattern tooltips on PathPage** — Level 1 says "CVC," she doesn't know what that means
  - [ ] Add tap-to-reveal tooltip on category labels in curriculum list
  - [ ] Content: "CVC = consonant-vowel-consonant, like c-a-t" etc. for each phonics pattern
  - [ ] Show tooltip inline below the label, not a modal (less disruptive)
- [ ] **Gentler "audio unavailable" state** — red error text scares her ~~(FIXED)~~
  - [x] Fixed: TTS storage key mismatch resolved, cloud TTS now initializes correctly

---

## Persona 2: Jayden, age 10 — "The Competitor"

**Profile:** 5th grader, plays everything competitively. Checks the leaderboard before he even starts playing. Has a 34-day streak and will NOT let it break. Uses his own phone.

**Goals:**
- Be #1 on the leaderboard (or at least top 10)
- Maintain his streak at all costs
- Unlock everything — badges, costumes, trails, themes
- Beat his friends

**How he uses the app:**
- Plays 50-word sessions on Level 5-6 (knows his sweet spot)
- Grinds daily for XP — leaderboard rank is identity
- Checks leaderboard after every session to see if he moved
- Uses shields strategically to protect streaks
- Pings friends from the leaderboard to flex
- Plays daily challenge every single day

**What works for Jayden today:**
- Streak mechanic is his entire motivation — 34 days and counting
- XP/Rank progression gives clear goals
- Leaderboard with rank-up/rank-down toasts creates urgency
- Shields add strategy — spend or save?
- Session sizes (10/20/50) let him grind efficiently
- Ping mechanic on leaderboard is social proof

**Gaps & checklist:**

- [ ] **Weekly leaderboard tab** — he joined month 1 with 15K XP, friends who started late can never catch up
  - [ ] Add "This Week" tab alongside "All Time" on LeaguePage
  - [ ] Track `weeklyXP` field in Firestore user doc (reset each Monday UTC)
  - [ ] Cloud Function or client-side logic to reset weekly XP at week boundary
  - [ ] Show both tabs with same rank UI (crown/medal/star for top 3)
  - [ ] Weekly board should use same ping/race mechanics
- [ ] **Tiered cosmetic unlocks** — all themes and trails available immediately, nothing feels earned
  - [ ] Define unlock conditions for each trail: e.g., Rainbow = 10-day streak, Fire = 25-day streak, Lightning = 50 correct in timed mode
  - [ ] Define unlock conditions for each chalk theme: e.g., Ocean = 500 words mastered, Neon = 95%+ accuracy over 200 words
  - [ ] Show locked cosmetics with greyed-out preview + unlock requirement text
  - [ ] Toast notification when a cosmetic unlocks: "New trail unlocked: Fire!"
  - [ ] Keep 2-3 basic options unlocked by default so new users have choice
- [ ] **Error pattern dashboard** — he's at 88% accuracy but doesn't know which patterns drag him down
  - [ ] Aggregate `byType` stats from useStats to compute per-category accuracy
  - [ ] New section on PathPage or MePage: "Your weakest patterns" with accuracy bars
  - [ ] Sort by accuracy ascending (worst first)
  - [ ] "Drill weak spots" button that starts a session filtered to weakest category
  - [ ] Show pattern name + accuracy % + word count (e.g., "Silent-E: 72% on 45 words")
- [ ] **Real-time 1v1 multiplayer** — pings are one-way, he wants to race friends head-to-head
  - [ ] Both players see same 10-word set (seeded from shared challenge ID)
  - [ ] Real-time progress indicators (opponent's score visible)
  - [ ] Win/loss/draw result screen with XP bonus for winner
  - [ ] Invite via share link or in-app ping → accept flow
  - [ ] **Note: Large effort — defer to future version**
- [ ] **Longer daily challenge option** — 10 words takes 90 seconds, he wants 25 or 50
  - [ ] Add daily challenge size selector: 10 (Quick) / 25 (Standard) / 50 (Marathon)
  - [ ] All sizes use same daily seed for fairness
  - [ ] Leaderboard shows daily score regardless of size chosen
- [ ] **Active difficulty nudge** — "Ready for harder words!" appears but doesn't push him
  - [ ] When accuracy > 90% over 20+ words at current level, show a "Level up?" prompt with one-tap upgrade
  - [ ] Auto-dismiss after 5 seconds if ignored (not annoying)

---

## Persona 3: Sofia, age 13 — "The Spelling Bee Competitor"

**Profile:** 8th grader preparing for the county spelling bee. Already an excellent speller — she needs obscure, competition-level words. Studies etymology and word roots strategically. Uses a laptop at her desk.

**Goals:**
- Master Scripps-level vocabulary (difficulty 8-10)
- Understand word origins to deduce unknown spellings
- Track exactly how prepared she is for competition
- Practice under pressure (timed, no hints)

**How she uses the app:**
- Plays Level 8-9 exclusively, occasionally Level 10
- Uses Bee Sim mode to simulate competition conditions
- Reads every etymology — "Explore origin" is her favorite feature
- Prefers text input over MCQ (real bees don't have multiple choice)
- Plays with timer on to simulate pressure
- Checks the Roots tool to study word families

**What works for Sofia today:**
- Levels 8-9 pull from competition-quality words (Scripps + State bee lists)
- Etymology explainer breaks down Latin/Greek roots
- Bee Sim mode recreates the spelling bee experience
- Written Test mode forces real spelling (no guessing from options)
- Roots/analytics tools are genuinely useful for pattern study
- Timed mode adds competitive pressure

**Gaps & checklist:**

- [ ] **Competition prep tracker** — she can't see "You know 78% of Scripps words" or how many remain
  - [ ] New section on PathPage: "Competition Prep" below the curriculum list
  - [ ] Show cards for each competition list: Scripps Historical, State Bee, WOTC 1/2/3
  - [ ] Each card shows: mastery count / total count, percentage bar
  - [ ] Use `wordsByList()` from words/index.ts + cross-reference with `wordRecords` from useWordHistory
  - [ ] "Drill remaining" button per list → starts session filtered to unmastered words from that list
  - [ ] Ensure competition list words load (they're in tier5-scripps.ts and tier5-state.ts, plus competitionLists.ts tags)
- [ ] **Filter word book by etymology/origin** — she wants to drill all Latin-root words, then Greek, then French
  - [ ] Add origin-language filter tabs to WordBookModal: "All", "Latin", "Greek", "French", "Germanic", "Other"
  - [ ] Use existing `origin-latin`, `origin-greek`, `origin-french`, `origin-german`, `origin-other` categories from spellingCategories
  - [ ] Each tab filters the word list to words tagged with that origin
  - [ ] Show word count per origin tab
- [ ] **Keyboard shortcuts for desktop play** — arrow keys work but no shortcut for audio, skip, etc.
  - [ ] `Space` or `R` = replay audio (call speak() on current word)
  - [ ] `1` / `2` / `3` = pick answer option (left/down/right)
  - [ ] `S` or `ArrowUp` = skip (already works with ArrowUp)
  - [ ] `?` = show keyboard shortcut overlay/help
  - [ ] Add handler in ProblemView.tsx alongside existing KEY_MAP
  - [ ] Only active when not in text-input mode (avoid conflict with typing)
  - [ ] Show subtle "Press ? for shortcuts" hint on first desktop visit
- [ ] **Mature stats dashboard** — badges and costumes feel childish to a 13-year-old
  - [ ] Add "Stats" toggle on MePage that swaps cosmetics grid for analytics view
  - [ ] Show: accuracy trend (last 7 days), words mastered per week, total by difficulty tier
  - [ ] Pattern heatmap: accuracy per phonics category as colored grid
  - [ ] **Note: Medium effort — consider for future version**
- [ ] **Focused study set creation** — can't filter to "only difficulty 9+ words with Greek roots"
  - [ ] Add filter controls to WordBookModal: difficulty range slider + origin + pattern checkboxes
  - [ ] "Start drill" button that creates a session from filtered word set
  - [ ] **Note: Medium effort — consider for future version**
- [ ] **Bee Sim format improvements** — real bees let you ask for definition, origin, use in sentence
  - [ ] Add "Ask the pronouncer" buttons during Bee Sim: Definition, Language of Origin, Sentence
  - [ ] Each ask uses one of the word's metadata fields (already stored)
  - [ ] Track asks-per-word as a skill metric (fewer asks = better)
  - [ ] **Note: Medium effort — consider for future version**

---

## Persona 4: Marcus, age 11 — "The Reluctant Learner"

**Profile:** 6th grader who doesn't like reading or spelling. His school assigned the app as homework. He'll do the minimum required. Easily bored, easily frustrated. Plays games on his phone all day — Roblox, Fortnite — so he knows good UX when he sees it.

**Goals:**
- Finish his homework as fast as possible
- Not feel dumb
- Maybe have some fun if the app doesn't suck

**How he uses the app:**
- Opens it, does 10 words on Level 3, closes it
- Swipes randomly when he doesn't know the answer (gaming the system)
- Ignores review notifications
- Never checks the leaderboard (doesn't want to see his rank)
- Skips the daily challenge

**What works for Marcus today:**
- Swipe mechanic is at least fun — feels like a mobile game, not a textbook
- 10-word sessions are short — he can be done in 2 minutes
- No nagging — the app doesn't shame him for inactivity
- Correct answer glow + streak fire give dopamine hits even on easy words
- MCQ format means he can guess (33% chance) without feeling stuck

**Gaps & checklist:**

- [ ] **Minimum accuracy gate** — he swipes randomly at 33% accuracy with no consequence
  - [ ] Track rolling accuracy over last 5 answers in useGameLoop
  - [ ] If accuracy drops below 40% after 5+ answers, show a gentle interstitial: "Let's slow down! 🤔"
  - [ ] Interstitial offers: "Hear the word again" (replays TTS) + "Show a hint" (first letter reveal) + "Keep going"
  - [ ] Don't block play entirely — just create a speed bump that makes random-swiping slower than actually trying
  - [ ] Reset the gate after 2 consecutive correct answers
  - [ ] Don't trigger the gate in the first 3 questions (warmup grace period)
  - [ ] Never show the gate in daily challenge or multiplayer (competitive modes should be uninterrupted)
- [ ] **Improvement celebrations** — went from 40% to 55% accuracy this week, but the app didn't notice
  - [ ] Store weekly accuracy snapshots: `{ weekKey: 'YYYY-WW', accuracy: number, wordCount: number }` in localStorage
  - [ ] On session start, compare current week accuracy to last week
  - [ ] If accuracy improved by 10%+: show toast "Your accuracy is up {X}% this week! 📈"
  - [ ] If words-per-week increased by 25%+: show toast "You practiced {X}% more words this week!"
  - [ ] If new best streak: show toast "New personal best streak: {N}! 🔥"
  - [ ] Show celebration once per session start, not repeatedly
- [ ] **Hint system after repeated misses** — same word 3 times in a row from Leitner box 0 with no help
  - [ ] After 2 wrong answers on the same word in a session, auto-show hint on third appearance
  - [ ] Hint: highlight correct answer option with subtle gold glow (don't give it away completely)
  - [ ] Track per-word miss count in session state (not persisted)
  - [ ] Only in MCQ mode (written/guided modes already have different hint mechanics)
- [ ] **Weekly goal tracker** — teacher said "do 50 words this week," he has no idea where he stands
  - [ ] Add optional weekly goal: user sets target word count (e.g., 50, 100, 200)
  - [ ] Show compact progress bar on game tab header: "32/50 this week"
  - [ ] Store goal + progress in localStorage with weekly reset
  - [ ] Celebration when goal is met: "Weekly goal complete! 🎯"
  - [ ] Allow teachers to set goals via custom list metadata (future)
- [ ] **Review words reframed as positive** — "12 words to review" badge feels like punishment
  - [ ] Rename badge text from "to review" to "to master" or "almost learned"
  - [ ] Change Path tab badge aria-label to match
  - [ ] On PathPage, reframe review CTA: "12 words almost mastered — one more practice!" instead of "Review 12 words"

---

## Implementation Checklist — Priority Order

### Wave 1: Quick wins (small effort, high impact)

- [x] **1. Level recommendation in onboarding** *(Mia)*
  - Pre-select Level 1, add "Not sure? Start here!" hint text
  - Files: `OnboardingModal.tsx`
  - Effort: ~20 lines changed

- [x] **2. Minimum accuracy gate** *(Marcus)*
  - Gentle interstitial when rolling accuracy < 40% after 5+ answers
  - Files: `useGameLoop.ts`, `ProblemView.tsx` or new `AccuracyGate` component
  - Effort: ~80 lines new

- [x] **3. Competition prep tracker** *(Sofia)*
  - Scripps/State/WOTC mastery % cards on PathPage
  - Files: `PathPage.tsx`, reads from `competitionLists.ts` + `useWordHistory`
  - Effort: ~100 lines new

- [x] **4. Improvement celebrations** *(Marcus)*
  - Weekly accuracy trend toast on session start
  - Files: `App.tsx`, `useStats.ts` (add weekly snapshot), new toast component or inline
  - Effort: ~60 lines new

- [x] **5. Forgiving streaks for Level 1-3** *(Mia)*
  - 1 free miss before streak breaks at low levels
  - Files: `useGameLoop.ts` (modify wrong-answer handler)
  - Effort: ~15 lines changed

- [x] **6. Keyboard shortcuts** *(Sofia)*
  - Space=audio, 1/2/3=answers, ?=help overlay
  - Files: `ProblemView.tsx` (extend existing KEY_MAP handler)
  - Effort: ~40 lines new

### Wave 2: Medium effort, high value

- [x] **7. Error pattern dashboard** *(Jayden, Sofia)*
  - Per-category accuracy breakdown with "Drill weak spots" action
  - Files: `PathPage.tsx` or `MePage.tsx`, reads `byType` from stats
  - Effort: ~120 lines new

- [x] **8. Simpler wrong-answer panel for low levels** *(Mia)*
  - Hide etymology/origin for levels 1-3
  - Files: `ProblemView.tsx` (conditional render based on level)
  - Effort: ~20 lines changed

- [x] **9. Review words reframed** *(Marcus)*
  - "to master" instead of "to review," rewrite CTA copy
  - Files: `BottomNav.tsx`, `PathPage.tsx`
  - Effort: ~10 lines changed

- [x] **10. Pattern tooltips on PathPage** *(Mia)*
  - Tap-to-reveal explanations for phonics categories
  - Files: `PathPage.tsx`
  - Effort: ~60 lines new

- [x] **11. Hint system after repeated misses** *(Marcus, Mia)*
  - Auto-highlight correct answer after 2 wrong on same word
  - Files: `useGameLoop.ts`, `ProblemView.tsx`
  - Effort: ~40 lines new

### Wave 3: Larger features (future versions)

- [x] **12. Weekly leaderboard tab** *(Jayden)*
  - Separate "This Week" XP tracking + Firestore field + weekly reset
  - Files: `LeaguePage.tsx`, `useStats.ts`, Firestore schema
  - Effort: ~200 lines new + Cloud Function

- [x] **13. Tiered cosmetic unlocks** *(Jayden)*
  - Lock conditions per trail/theme, greyed preview, unlock toasts
  - Files: `MePage.tsx`, `useStats.ts`, new unlock-conditions config
  - Effort: ~200 lines new

- [x] **14. Weekly goal tracker** *(Marcus)*
  - Set word count target, show progress bar, weekly reset
  - Files: `App.tsx`, new `useWeeklyGoal` hook, `config.ts`
  - Effort: ~150 lines new

- [x] **15. Filter word book by origin** *(Sofia)*
  - Origin-language tabs in WordBookModal
  - Files: `WordBookModal.tsx`
  - Effort: ~80 lines new

- [x] **16. Mature stats dashboard** *(Sofia)*
  - Toggle cosmetics grid for analytics view on MePage
  - Files: `MePage.tsx`, new analytics component
  - Effort: ~200 lines new

- [x] **17. Real-time 1v1 multiplayer** *(Jayden)*
  - Shared word sets, real-time scoring, invite flow
  - Files: New multiplayer infrastructure
  - Effort: Large — full feature build

- [x] **18. Bee Sim format improvements** *(Sofia)*
  - "Ask the pronouncer" buttons for definition/origin/sentence
  - Files: `BeeSimPage.tsx`
  - Effort: ~100 lines new

- [x] **19. Longer daily challenge sizes** *(Jayden)*
  - 10/25/50 word daily options
  - Files: `App.tsx`, daily challenge generator
  - Effort: ~60 lines new

- [x] **20. Focused study set filters** *(Sofia)*
  - Difficulty + origin + pattern filter in WordBookModal
  - Files: `WordBookModal.tsx`
  - Effort: ~120 lines new
