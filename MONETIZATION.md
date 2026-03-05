# MONETIZATION.md — Implementation Checklist

> Strategy source: Detailed Monetization Strategy infographic (v1.0.4)
> Current state: **Phases 0-3 complete — All Phase 2.5 features + Phase 3: Bee Team tier (multi-profile, parent dashboard, profile switcher), printable certificates (level completion, bee win, weekly champion with custom branding), analytics dashboards (21 trackEvent types across all features, GA4 measurementId support). Phase 4 deferred (need users first).**
> Goal: 3-tier freemium + cosmetic IAP + viral K-factor growth

---

## Legend

- [ ] Not started
- [~] Partially exists (needs monetization layer)
- [x] Already shipped

---

## 1. PAYMENT & SUBSCRIPTION INFRASTRUCTURE

### 1.1 Payment Processor
- [x] Stripe for web subscription management — `services/stripe.ts` + Cloud Functions
- [ ] Apple IAP setup (App Store review guidelines for kids' apps) — DEFERRED (native app)
- [ ] Google Play Billing setup — DEFERRED (native app)
- [x] Web Stripe Checkout for PWA users — `createCheckoutSession` Cloud Function
- [x] Receipt validation Cloud Function (server-side webhook verification) — `stripeWebhook`

### 1.2 Subscription Tiers
- [x] **Tier 1: Free** — Levels 1-3, 2 SRS reviews/day, public leaderboard, basic achievements — `FREE_LEVEL_CAP`, `FREE_DAILY_REVIEW_CAP`
- [x] **Tier 2: Champion Pass ($4.99/mo or $29.99/yr)** — All 10 levels, unlimited SRS, etymology quiz, roots study, premium cosmetics — Stripe products configured
- [x] **Tier 3: Bee Team (~$7.99/mo or $49.99/yr)** — Family/classroom: up to 5 learner profiles, parent/teacher dashboard, profile switcher, printable certificates & reports, custom branding — UI complete in UpgradeModal (Stripe checkout TBD)

### 1.3 Trial & Conversion
- [x] 7-day Champion Pass trial triggered at Level 3 completion — activateTrial(7) in usePremium
- [x] Trial banner UI (non-intrusive, tappable → UpgradeModal, session-dismissible) — App.tsx
- [x] Countdown timer for trial expiration — daysRemaining in trial banner + Settings
- [x] Paywall screen design (chalk aesthetic, feature comparison table) — UpgradeModal component
- [x] Purchase buttons ($4.99/mo, $29.99/yr) in UpgradeModal → `startCheckout()` → Stripe Checkout
- [x] Post-trial state: trial button hidden, only purchase buttons shown — trialUsed flag
- [x] Restore purchases flow — `restoreSubscription()` Cloud Function checks Stripe on login
- [x] Subscription management section in Settings — ChampionPassSection in SettingsModal (status badge + manage/upgrade button)

---

## 2. CONTENT GATING (Free vs. Paid)

### 2.1 Level Gating
- [x] Gate Levels 4-10 behind Champion Pass — UpgradeModal + isLevelPremium()
- [x] All 10 levels exist and work — gating logic wired in PathPage + QuestionTypePicker
- [x] "Unlock with Champion Pass" prompt when tapping Level 4+ — UpgradeModal shown
- [x] Graceful degradation: stats, SRS boxes, word history all preserved on lapse — levels re-lock but data stays, reviews capped to 2/day

### 2.2 SRS Gating
- [x] Leitner SRS exists (5 boxes) — daily review cap implemented for free tier
- [x] Free tier: cap at 2 SRS reviews/day (FREE_DAILY_REVIEW_CAP in config.ts)
- [x] Champion Pass: unlimited reviews
- [x] UI indicator showing remaining free reviews (PathPage CTA + "X reviews remaining")

### 2.3 Premium Tools Gating
- [x] Etymology data exists — etymology quiz gated as Champion-only in QuestionTypePicker
- [x] Roots browser exists — gated as Champion-only (premium flag on CategoryEntry)
- [x] Advanced Timed Mode — Speed Round (5s) + Endurance (shrinking timer from 10s→3s) — Champion only, variant picker on stopwatch button
- [x] Champion Analytics — Session timeline (30-day sparkline), category breakdown heatmap, personal records, speed performance stats — in StudyAnalyticsModal, locked preview + upgrade CTA for free users

### 2.4 Cosmetics Gating
- [x] 22 chalk themes: 4 Champion-only + 9 IAP pack items — `premium`/`packItem` flags on ChalkTheme
- [x] 7 swipe trails: 2 Champion-only + 3 IAP pack items — `premium`/`packItem` flags on TrailConfig
- [x] Lock icon (🔒) + UpgradeModal on premium cosmetics in MePage pickers
- [x] Shop icon (🛒) + ShopModal on IAP pack items in MePage pickers
- [x] 14 flair items: 8 achievement-unlocked + 3 Champion Pass exclusive (Crown, Shield, Orbit) + 3 seasonal IAP (Snowfall, Petals, Sunbeam)
- [x] Flair lock badges (🔒 Champion, 🛒 shop) in AvatarBuilder
- [x] Seasonal flair packs in ShopModal (Winter/Spring/Summer + All Seasons Bundle)

---

## 3. COSMETIC IN-APP PURCHASES (One-Time)

### 3.1 Cosmetic Packs ($0.99-$2.99)
- [x] 3 themed chalk packs: Neon Glow ($0.99), Pastel Dreams ($0.99), Nature's Palette ($0.99) — 9 colors total
- [x] Trail Variety pack ($1.49) — Snowflake, Sparkle, Comet trails
- [x] Ultimate Collection ($2.99) — all 9 colors + all 3 trails (best value)
- [x] Seasonal flair packs: Winter Wonderland ($0.99), Spring Bloom ($0.99), Summer Rays ($0.99), All Seasons Bundle ($1.99)
- [x] Shop UI modal (browse packs, preview swatches/emoji, purchase via Stripe) — ShopModal.tsx
- [x] "Owned" badge on purchased items + "Already owned via other packs" for redundant items
- [x] IAP pack items in MePage pickers — 🛒 icon badge, click → shop modal
- [x] Stripe one-time payment flow — `createPackCheckout` Cloud Function + `purchasePack` client
- [x] Webhook handling — `checkout.session.completed` with `type: 'cosmetic_pack'` → Firestore `purchasedPacks` arrayUnion
- [x] Ownership tracking — localStorage + Firestore sync via `purchasedPacks` field

### 3.2 Competition Word Packs ($2.99-$4.99) — DEFERRED
- [ ] ~~Scripps Regionals pack~~ — removed (copyrighted content)
- [ ] SAT vocabulary pack
- [ ] Pack preview (sample 10 words free, rest locked)
- [ ] Download + unlock flow

### 3.3 "Bee Coach" AI Add-On ($2.99/mo) — DEFERRED
- [ ] Personalized practice recommendations (beyond current error patterns)
- [ ] Memory tricks / mnemonics generation
- [ ] AI-powered weakness analysis
- [ ] Separate subscription or add-on billing

---

## 4. VIRAL LOOPS & K-FACTOR GROWTH

> These are the highest-leverage features for organic growth.

### 4.1 Referral Program (Critical for K-factor)
- [x] Unique referral code per user (SPELL-XXXX format, ~1.7M codes)
- [x] Referral link generation + share sheet (shareHelper.ts)
- [x] **Reward: Both referrer AND invitee get 1 week free Champion Pass** — Cloud Function
- [x] Referral tracking Cloud Function (attribute signups to referrer)
- [x] Referral dashboard in profile ("You've invited X friends") — MePage section
- [x] Referral milestone rewards (3→2wk, 5→1mo, 10→3mo) — auto-reward via extendPass + toast in App.tsx
- [x] Deep link handling (open app → auto-apply referral code via ?ref= param)

### 4.2 Social Sharing Enhancements
- [x] Session result sharing with emoji grid — EXISTS
- [x] Challenge URL so friends play same words — EXISTS
- [x] **Add referral code to share cards** — all share touchpoints use appendReferralFooter()
- [x] "Beat my score" — challenge URL includes `&s=<score>&a=<accuracy>`, recipient sees comparison + win/lose/tie on SessionSummary
- [x] Share achievements to social media — achievement toast "Share" action button
- [x] Share streak milestones ("I'm on a 30-day streak!") — toast + share at 7/14/30/60/100-day milestones (STREAK_MILESTONES config)
- [x] Share leaderboard rank changes — share button on user's own rank row
- [x] Weekly recap shareable card — "Share" button in WeeklyRecap component

### 4.3 Challenge & Competition Virality
- [x] "Challenge a friend" flow — challenge URL already embedded in SessionSummary share (createChallengeId)
- [x] Head-to-head async challenges — ChallengeBanner on `?c=` links shows target score, SessionSummary shows "You won!/Almost!" comparison
- [x] 1v1 multiplayer — unhidden for Champion users on Compete page (🔒 for free → UpgradeModal)
- [x] Classroom challenge codes — teacher enters a code string, seeded → deterministic word set, students all get same words via `?class=` or Compete page button
- [x] Weekly tournament — deterministic 25-word set from ISO week seed, same for everyone all week, card on Compete page

### 4.4 Leaderboard Virality
- [x] Weekly XP leaderboard — EXISTS
- [x] Rival ping system — EXISTS
- [x] "Invite to compete" button on leaderboard — share button with referral link (LeaguePage)
- [ ] Weekly leaderboard push notification ("New week! Defend your rank") — DEFERRED (needs FCM)
- [ ] End-of-week summary push ("You finished #3 this week!") — DEFERRED (needs FCM)

---

## 5. PUSH NOTIFICATIONS (Retention & Re-engagement)

### 5.1 Infrastructure
- [ ] Firebase Cloud Messaging (FCM) integration
- [ ] Notification permission prompt (tasteful, after first session)
- [ ] FCM token storage in Firestore user doc
- [ ] Cloud Function for sending scheduled notifications
- [ ] Notification preferences in Settings (per-type toggles)

### 5.2 Notification Types
- [ ] **Streak protection**: "Your 15-day streak expires in 4 hours!"
- [ ] **Daily challenge reminder**: "Today's Daily Challenge is ready"
- [ ] **Weekly leaderboard**: Monday "New week live!" / Sunday "Final rank summary"
- [ ] **Achievement unlocked**: "You just earned Word Wizard!"
- [ ] **Rival activity**: "Alex just passed your weekly XP!"
- [ ] **Referral conversion**: "Your friend just joined! You both got Champion Pass"
- [ ] **Trial expiring**: "Your Champion Pass trial ends tomorrow"

---

## 6. PARENT & FAMILY FEATURES (Tier 3: Bee Team)

### 6.1 Multi-Profile Support
- [x] Up to 5 learner profiles per Bee Team account — `useProfiles` hook, localStorage per-profile isolation
- [x] Profile switcher UI — `ProfileSwitcher.tsx` with avatar bar, add/remove modals
- [x] Per-profile stats, SRS boxes, achievements — localStorage keyed by profileId
- [x] Parent/admin profile (non-learner, dashboard-only) — `activeProfileId === null` = parent mode

### 6.2 Parent/Teacher Dashboard
- [x] Progress overview per child (words mastered, accuracy trends) — `ParentDashboard.tsx` with per-learner cards (XP, words, accuracy, streak)
- [ ] Weakness tracking (error patterns per child) — DEFERRED (needs per-profile error pattern aggregation)
- [ ] Weekly email digest to parent (auto-triggered) — DEFERRED (needs email infrastructure)
- [ ] Assignment feature (assign specific word lists to learners) — DEFERRED
- [x] Printable progress reports / report cards — print button on each learner card → certificate

### 6.3 Parent Achievement Emails
- [ ] Email triggered by milestone achievements (Word Wizard, Bee Champion, etc.) — DEFERRED
- [ ] Include progress stats in email body — DEFERRED
- [ ] "Share your child's achievement" CTA in email (viral loop) — DEFERRED
- [ ] COPPA-compliant: parent email collected at signup, verified — DEFERRED

---

## 7. CERTIFICATES & SOCIAL PROOF

### 7.1 Printable Certificates
- [x] Level completion certificate (PNG generation via html-to-image + browser print) — `certificateGenerator.ts` + `CertificatePreview.tsx`
- [x] Bee Simulation win certificate — trigger on victory screen in BeeSimPage
- [x] Weekly champion certificate (top leaderboard) — 🏅 icon on #1 rank row in LeaguePage
- [x] Custom branding for Bee Team (school/class name on certificate) — `customBranding` field in UserContext
- [x] Certificate gallery in MePage — Bee Winner + Words Mastered certificates

### 7.2 Digital Badges
- [ ] Shareable badge images for achievements — DEFERRED
- [ ] "Verified Speller" badge (mastered 100+ words at Level 5+) — DEFERRED
- [ ] Embed in social share cards — DEFERRED

---

## 8. ANALYTICS & CONVERSION TRACKING

### 8.1 Product Analytics
- [x] Firebase Analytics initialized (lazy, browser-only) — firebase.ts + analytics.ts
- [x] Key funnel events: `onboarding_complete`, `session_complete`, `paywall_shown`, `trial_started`, `purchase_clicked`, `referral_shared`, `level_gated`
- [x] Feature usage events: `bee_sim_completed`, `timed_variant_selected`, `weekly_tournament_played`, `classroom_code_used`, `profile_created`, `profile_switched`, `certificate_downloaded`, `shop_purchase_clicked`, `pack_purchased`
- [x] GA4 measurement ID support added to firebase config (`VITE_FIREBASE_MEASUREMENT_ID` env var)
- [~] Firebase Analytics dashboard setup — GA4 must be enabled via Firebase Console → Analytics → Enable (not CLI-configurable). Once enabled, set `VITE_FIREBASE_MEASUREMENT_ID` in `.env`.
- [~] Retention cohorts (Day 1, Day 7, Day 30) — built-in to GA4 once enabled
- [x] Feature usage tracking — 21 event types across all features

### 8.2 Revenue Analytics
- [~] MRR / ARR tracking — use Stripe Dashboard (Dashboard → Revenue)
- [~] Subscriber LTV calculation — Stripe Dashboard → Revenue → LTV
- [~] Trial-to-paid conversion rate — Firebase funnel: `trial_started` → `purchase_clicked`
- [~] Churn rate monitoring — Stripe Dashboard → Subscriptions → Churn
- [~] Referral attribution tracking (K-factor measurement) — Firestore `referrals` collection + `referral_shared` events

### 8.3 KPI Targets (from Strategy)
- [ ] CPI < $2.00
- [ ] Day 1 Retention > 40%
- [ ] Day 7 Retention > 25%
- [ ] Day 30 Retention > 15%
- [ ] Free-to-Paid > 5%
- [ ] Session Length > 8 mins
- [ ] 50,000 installs in 90 days

---

## 9. SEASONAL & LIFECYCLE CAMPAIGNS

### 9.1 In-App Events
- [ ] "Road to the National Bee" (Jan-May) — weekly tournaments, competition words
- [ ] "Back to School" (Aug-Sep) — educator targeting, 30-day Bee Team trial
- [ ] "Summer Spelling Safari" (Jun-Aug) — 60-day challenge, exclusive cosmetics
- [ ] Seasonal cosmetic drops (Halloween chalk, Holiday trails, etc.)

### 9.2 Lifecycle Marketing
- [ ] Streak-at-risk notification (re-engagement)
- [ ] Milestone paywall prompt (Level 3 completion)
- [ ] Monday "New week!" leaderboard push
- [ ] Sunday "Final rank" summary push
- [ ] Trial expiration sequence (Day 5, Day 6, Day 7 reminders)
- [ ] Win-back campaign (lapsed users after 7 days inactive)

---

## 10. WHAT TO AVOID (from Strategy)

- [x] **No interstitial ads** between rounds — CONFIRMED, no ads anywhere
- [x] **No aggressive freeplay gating** — free tier is generous (Levels 1-3, daily challenge, leaderboard)
- [x] **No pay-to-win leaderboard** — XP earned by playing, not buying
- [x] Key gate is natural — Level 3 → 4 boundary, trial triggered at completion (not arbitrary popup)
- [x] Referral rewards don't affect leaderboard — rewards are Champion Pass time, not XP. Leaderboard is XP-only.

---

## PRIORITY ORDER (Recommended Implementation Sequence)

### Phase 0: Viral Foundation (Pre-Monetization) ✅ DONE
1. ✅ **Referral system** (unique codes, tracking, deep links, Cloud Function)
2. ✅ **Enhanced social sharing** (referral codes in all share cards: session, daily, weekly recap, achievements, leaderboard, rank-up)
3. **Push notifications** (streak protection, daily challenge, leaderboard) — deferred
4. ✅ Weekly recap shareable cards

### Phase 0.5: Content Gating & Paywall ✅ DONE
5. ✅ Paywall UI (UpgradeModal — chalk aesthetic, feature comparison)
6. ✅ Level gating (Levels 4-10 behind Champion Pass)
7. ✅ 7-day trial at Level 3 gate (activateTrial in usePremium)
8. ✅ SRS daily review cap (Free: 2/day, Champion: unlimited)
9. ✅ Premium category gating (Etymology Quiz + Word Roots = Champion-only)

### Phase 1: Payment-Ready Infrastructure ✅ DONE
10. ✅ Cosmetics gating (4 Champion themes, 2 Champion trails)
11. ✅ Trial expiration banner (session-dismissible, tappable → UpgradeModal)
12. ✅ Purchase buttons in UpgradeModal ($4.99/mo + $29.99/yr → Stripe Checkout)
13. ✅ Subscription management in Settings (status badge, manage/upgrade)
14. ✅ Referral milestone rewards (3/5/10 → 2wk/1mo/3mo auto-extend)
15. ✅ Firebase Analytics (7 key funnel events)

### Phase 1.5: Stripe Integration ✅ DONE
- [x] Stripe products: Champion Pass Monthly ($4.99) + Annual ($29.99) — price IDs via env vars
- [x] Wire `handlePurchase('monthly'|'annual')` in UpgradeModal → `startCheckout()` → Stripe Checkout redirect
- [x] Cloud Function `stripeWebhook` for `checkout.session.completed` → set championPassExpiry + subscriptionStatus
- [x] Distinguish trial vs paid subscription — `subscriptionStatus` field ('none'|'trial'|'active'|'canceled')
- [x] Customer portal link in Settings "Manage" button → `createPortalSession` Cloud Function
- [x] Subscription renewal webhook → `invoice.paid` event auto-extends expiry
- [x] Cancellation webhook → `customer.subscription.deleted` → expiry = current period end (no immediate revoke)
- [x] Receipt/invoice emails via Stripe (automatic with Stripe Checkout)
- [x] Restore purchases flow → `restoreSubscription` Cloud Function checks Stripe on login

### Phase 2: Revenue Expansion (Partial) ✅ SHOP DONE
10. ✅ Cosmetic IAP shop — 9 packs (3 chalk + 1 trail + 1 ultimate + 3 seasonal flair + 1 seasonal bundle), ShopModal, Stripe one-time payment, ownership tracking
11. Competition word packs — DEFERRED
12. Bee Coach AI add-on — DEFERRED
13. Product analytics (funnel tracking, retention cohorts)

### Phase 2.5: Content Gating + Viral Growth ✅ DONE
- ✅ Custom lists gating (Free: 10 lists, Champion: 20) — `FREE_CUSTOM_LIST_CAP` / `PREMIUM_CUSTOM_LIST_CAP`
- ✅ Cloud TTS premium bypass (Free: 200/day, Champion: unlimited) — `synthesizeSpeech` checks `championPassExpiry`
- ✅ Streak milestone share toast at 7/14/30/60/100-day streaks — `STREAK_MILESTONES` config + share action
- ✅ 1v1 multiplayer unhidden for Champion on Compete page (🔒 for free)
- ✅ Leaderboard "Invite to Compete" share button with referral link
- ✅ Challenge-a-friend flow already in SessionSummary share
- ✅ Advanced Timed Mode — Speed Round (5s) + Endurance (shrinking 10s→3s), Champion-only variant picker
- ✅ Champion Analytics — 30-day session timeline sparkline, category breakdown heatmap, personal records, speed performance, locked preview for free users
- ✅ "Beat my score" trackable challenge links — `&s=<score>&a=<accuracy>` in URL, comparison + ChallengeBanner
- ✅ Weekly tournament — 25-word deterministic set per ISO week, Compete page card
- ✅ Classroom codes — seed-based deterministic word sets, Compete page entry

### Phase 3: Family & Classroom + Certificates + Analytics ✅ DONE
14. ✅ Multi-profile support (Bee Team tier) — `useProfiles`, `ProfileSwitcher`, per-profile localStorage isolation
15. ✅ Parent/teacher dashboard — `ParentDashboard.tsx` with per-learner stats cards + print reports
16. Achievement emails to parents — DEFERRED (needs email infrastructure)
17. ✅ Printable certificates and report cards — `certificateGenerator.ts`, `CertificatePreview.tsx`, triggers in BeeSimPage/LeaguePage/MePage
18. ✅ Bee Team tier in UpgradeModal ($7.99/mo, $49.99/yr) — UI ready, Stripe checkout TBD
19. ✅ Analytics dashboards — 21 event types, GA4 measurementId support, Firebase Console + Stripe Dashboard for KPIs

### Phase 4: Lifecycle & Campaigns — DEFERRED (need users first)
20. Seasonal events framework
21. Lifecycle notification sequences
22. Win-back campaigns

---

## CURRENT APP ASSETS (Already Built)

These features exist and just need a monetization layer or viral enhancement:

| Feature | Status | Monetization Action |
|---------|--------|-------------------|
| 10 curriculum levels | **Gated** | ✅ Levels 4-10 behind Champion Pass |
| Leitner SRS (5 boxes) | **Capped** | ✅ Free: 2/day, Champion: unlimited |
| 22 chalk themes | **4 Champion, 9 IAP** | ✅ 4 Champion-only + 9 in shop packs (Neon/Pastel/Nature) |
| 7 swipe trails | **2 Champion, 3 IAP** | ✅ 2 Champion-only + 3 in Trail Variety pack |
| 14 flair items | **3 Champion, 3 IAP** | ✅ 3 Champion-only (Crown/Shield/Orbit) + 3 in seasonal flair packs |
| Session share cards | **Referral-enabled** | ✅ Referral code in all share text |
| Challenge URLs | **Referral-enabled** | ✅ Referral code in challenge share text |
| Weekly leaderboard | **Share-enabled** | ✅ Share button on user's rank row |
| Rival pings | Free | Add "challenge" deeplink — DEFERRED |
| Custom word lists | **Gated** | ✅ Free: 10 lists, Champion: 20 (FREE_CUSTOM_LIST_CAP) |
| Cloud TTS | **Gated** | ✅ Free: 200/day, Champion: unlimited (synthesizeSpeech bypass) |
| Bee Simulation | Free | Keep free (engagement) |
| Daily Challenge | **Referral-enabled** | ✅ Referral code in share text |
| Etymology/Roots tools | **Champion-only** | ✅ Gated in QuestionTypePicker |
| Error pattern analysis | Free | ✅ Champion Analytics (timeline, heatmap, records, speed) in Study Tools |
| Advanced Timed Mode | **Champion-only** | ✅ Speed Round (5s) + Endurance (shrinking timer) — variant picker |
| Weekly Tournament | Free | ✅ 25-word seeded weekly set on Compete page |
| Classroom Codes | Free | ✅ Teacher enters code → deterministic word set for students |
| Beat My Score | Free | ✅ Score/accuracy in challenge URL, comparison on SessionSummary |
| 1v1 Multiplayer | **Champion-only** | ✅ Unhidden for Champions, 🔒 for free → UpgradeModal |
| Print study sheet | Free | ✅ Plus certificates (level/bee/champion) with print + download |
| Multi-profile | **Bee Team** | ✅ Up to 5 learner profiles, per-profile stats isolation |
| Parent Dashboard | **Bee Team** | ✅ Per-learner stats cards, print reports |
| Certificates | Free | ✅ Bee win, weekly champion, level completion — print + PNG download |
| Custom Branding | **Bee Team** | ✅ School/class name on certificates |
| Analytics | Ops | ✅ 21 event types, GA4 support, Firebase + Stripe dashboards |
