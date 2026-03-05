# MONETIZATION.md — Implementation Checklist

> Strategy source: Detailed Monetization Strategy infographic (v1.0.4)
> Current state: **Phases 0-2.5 complete — Stripe subscriptions + one-time IAP, cosmetic shop (5 packs), referral system, paywall, content gating, trial flow, analytics, custom list/TTS gating, viral growth (streak milestones, invite-to-compete, 1v1 multiplayer). Phases 3-4 deferred (need users first).**
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
- [ ] Apple IAP setup (App Store review guidelines for kids' apps)
- [ ] Google Play Billing setup
- [x] Web Stripe Checkout for PWA users — `createCheckoutSession` Cloud Function
- [x] Receipt validation Cloud Function (server-side webhook verification) — `stripeWebhook`

### 1.2 Subscription Tiers
- [x] **Tier 1: Free** — Levels 1-3, 30 SRS reviews/day, public leaderboard, basic achievements — `FREE_LEVEL_CAP`, `FREE_DAILY_REVIEW_CAP`
- [x] **Tier 2: Champion Pass ($4.99/mo or $29.99/yr)** — All 10 levels, unlimited SRS, etymology quiz, roots study, premium cosmetics — Stripe products configured
- [ ] **Tier 3: Bee Team (~$7.99/mo or $49.99/yr)** — Family/classroom: up to 5 learner profiles, parent/teacher dashboard, custom word list creator (assigned), printable progress reports

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
- [x] Graceful degradation: stats, SRS boxes, word history all preserved on lapse — levels re-lock but data stays, reviews capped to 30/day

### 2.2 SRS Gating
- [x] Leitner SRS exists (5 boxes) — daily review cap implemented for free tier
- [x] Free tier: cap at 30 SRS reviews/day (FREE_DAILY_REVIEW_CAP in config.ts)
- [x] Champion Pass: unlimited reviews
- [x] UI indicator showing remaining free reviews (PathPage CTA + "X reviews remaining")

### 2.3 Premium Tools Gating
- [x] Etymology data exists — etymology quiz gated as Champion-only in QuestionTypePicker
- [x] Roots browser exists — gated as Champion-only (premium flag on CategoryEntry)
- [ ] Advanced Timed Mode (e.g., speed rounds, endurance mode) — Champion only — DEFERRED
- [ ] Full Analytics & Report Cards — Champion only — DEFERRED (View Stats already removed)
- [~] Basic stats exist; need "full analytics" view behind paywall — DEFERRED

### 2.4 Cosmetics Gating
- [x] 22 chalk themes: 4 Champion-only + 9 IAP pack items — `premium`/`packItem` flags on ChalkTheme
- [x] 7 swipe trails: 2 Champion-only + 3 IAP pack items — `premium`/`packItem` flags on TrailConfig
- [x] Lock icon (🔒) + UpgradeModal on premium cosmetics in MePage pickers
- [x] Shop icon (🛒) + ShopModal on IAP pack items in MePage pickers
- [~] 8 flair items exist (achievement-unlocked) — add paid-exclusive flair later

---

## 3. COSMETIC IN-APP PURCHASES (One-Time)

### 3.1 Cosmetic Packs ($0.99-$2.99)
- [x] 3 themed chalk packs: Neon Glow ($0.99), Pastel Dreams ($0.99), Nature's Palette ($0.99) — 9 colors total
- [x] Trail Variety pack ($1.49) — Snowflake, Sparkle, Comet trails
- [x] Ultimate Collection ($2.99) — all 9 colors + all 3 trails (best value)
- [ ] Holiday icon packs (seasonal avatar accessories)
- [x] Shop UI modal (browse packs, preview swatches/emoji, purchase via Stripe) — ShopModal.tsx
- [x] "Owned" badge on purchased items + "Already owned via other packs" for redundant items
- [x] IAP pack items in MePage pickers — 🛒 icon badge, click → shop modal
- [x] Stripe one-time payment flow — `createPackCheckout` Cloud Function + `purchasePack` client
- [x] Webhook handling — `checkout.session.completed` with `type: 'cosmetic_pack'` → Firestore `purchasedPacks` arrayUnion
- [x] Ownership tracking — localStorage + Firestore sync via `purchasedPacks` field

### 3.2 Competition Word Packs ($2.99-$4.99)
- [ ] Scripps Regionals pack
- [ ] State-level / SAT vocabulary pack
- [ ] Pack preview (sample 10 words free, rest locked)
- [ ] Download + unlock flow

### 3.3 "Bee Coach" AI Add-On ($2.99/mo)
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
- [ ] "Beat my score" challenge with trackable link
- [x] Share achievements to social media — achievement toast "Share" action button
- [x] Share streak milestones ("I'm on a 30-day streak!") — toast + share at 7/14/30/60/100-day milestones (STREAK_MILESTONES config)
- [x] Share leaderboard rank changes — share button on user's own rank row
- [x] Weekly recap shareable card — "Share" button in WeeklyRecap component

### 4.3 Challenge & Competition Virality
- [x] "Challenge a friend" flow — challenge URL already embedded in SessionSummary share (createChallengeId)
- [ ] Head-to-head async challenges (play same set, compare scores)
- [x] 1v1 multiplayer — unhidden for Champion users on Compete page (🔒 for free → UpgradeModal)
- [ ] Classroom challenge codes (teacher creates, students join)
- [ ] Weekly tournament with shareable bracket

### 4.4 Leaderboard Virality
- [x] Weekly XP leaderboard — EXISTS
- [x] Rival ping system — EXISTS
- [x] "Invite to compete" button on leaderboard — share button with referral link (LeaguePage)
- [ ] Weekly leaderboard push notification ("New week! Defend your rank")
- [ ] End-of-week summary push ("You finished #3 this week!")

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
- [ ] Up to 5 learner profiles per Bee Team account
- [ ] Profile switcher UI
- [ ] Per-profile stats, SRS boxes, achievements
- [ ] Parent/admin profile (non-learner, dashboard-only)

### 6.2 Parent/Teacher Dashboard
- [ ] Progress overview per child (words mastered, accuracy trends)
- [ ] Weakness tracking (error patterns per child)
- [ ] Weekly email digest to parent (auto-triggered)
- [ ] Assignment feature (assign specific word lists to learners)
- [ ] Printable progress reports / report cards

### 6.3 Parent Achievement Emails
- [ ] Email triggered by milestone achievements (Word Wizard, Bee Champion, etc.)
- [ ] Include progress stats in email body
- [ ] "Share your child's achievement" CTA in email (viral loop)
- [ ] COPPA-compliant: parent email collected at signup, verified

---

## 7. CERTIFICATES & SOCIAL PROOF

### 7.1 Printable Certificates
- [ ] Level completion certificate (PDF generation)
- [ ] Bee Simulation win certificate
- [ ] Weekly champion certificate (top leaderboard)
- [ ] Custom branding for Bee Team (school/class name on certificate)

### 7.2 Digital Badges
- [ ] Shareable badge images for achievements
- [ ] "Verified Speller" badge (mastered 100+ words at Level 5+)
- [ ] Embed in social share cards

---

## 8. ANALYTICS & CONVERSION TRACKING

### 8.1 Product Analytics
- [x] Firebase Analytics initialized (lazy, browser-only) — firebase.ts + analytics.ts
- [x] Key funnel events: `onboarding_complete`, `session_complete`, `paywall_shown`, `trial_started`, `purchase_clicked`, `referral_shared`, `level_gated`
- [ ] Firebase Analytics dashboard setup (conversion funnels, retention cohorts)
- [ ] Retention cohorts (Day 1, Day 7, Day 30)
- [ ] Feature usage tracking (which modes are most popular)

### 8.2 Revenue Analytics
- [ ] MRR / ARR tracking
- [ ] Subscriber LTV calculation
- [ ] Trial-to-paid conversion rate
- [ ] Churn rate monitoring
- [ ] Referral attribution tracking (K-factor measurement)

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
8. ✅ SRS daily review cap (Free: 30/day, Champion: unlimited)
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
10. ✅ Cosmetic IAP shop — 5 packs (3 chalk + 1 trail + 1 ultimate), ShopModal, Stripe one-time payment, ownership tracking
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

### Phase 3: Family & Classroom — DEFERRED (need users first)
14. Multi-profile support (Bee Team tier)
15. Parent/teacher dashboard
16. Achievement emails to parents
17. Printable certificates and report cards

### Phase 4: Lifecycle & Campaigns — DEFERRED (need users first)
18. Seasonal events framework
19. Lifecycle notification sequences
20. Win-back campaigns
21. Revenue analytics dashboard

---

## CURRENT APP ASSETS (Already Built)

These features exist and just need a monetization layer or viral enhancement:

| Feature | Status | Monetization Action |
|---------|--------|-------------------|
| 10 curriculum levels | **Gated** | ✅ Levels 4-10 behind Champion Pass |
| Leitner SRS (5 boxes) | **Capped** | ✅ Free: 30/day, Champion: unlimited |
| 22 chalk themes | **4 Champion, 9 IAP** | ✅ 4 Champion-only + 9 in shop packs (Neon/Pastel/Nature) |
| 7 swipe trails | **2 Champion, 3 IAP** | ✅ 2 Champion-only + 3 in Trail Variety pack |
| 8 flair items | Free (achievement unlock) | Add paid-exclusive flair |
| Session share cards | **Referral-enabled** | ✅ Referral code in all share text |
| Challenge URLs | Free | Add referral tracking |
| Weekly leaderboard | **Share-enabled** | ✅ Share button on user's rank row |
| Rival pings | Free | Add "challenge" deeplink |
| Custom word lists | **Gated** | ✅ Free: 10 lists, Champion: 20 (FREE_CUSTOM_LIST_CAP) |
| Cloud TTS | **Gated** | ✅ Free: 200/day, Champion: unlimited (synthesizeSpeech bypass) |
| Bee Simulation | Free | Keep free (engagement) |
| Daily Challenge | **Referral-enabled** | ✅ Referral code in share text |
| Etymology/Roots tools | **Champion-only** | ✅ Gated in QuestionTypePicker |
| Error pattern analysis | Free | Gate full analytics |
| 1v1 Multiplayer | **Champion-only** | ✅ Unhidden for Champions, 🔒 for free → UpgradeModal |
| Print study sheet | Free | Add certificates for Champion |
