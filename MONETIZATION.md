# MONETIZATION.md — Implementation Checklist

> Strategy source: Detailed Monetization Strategy infographic (v1.0.4)
> Current state: **Phase 1 complete — referral system, paywall gate, share virality, content gating, cosmetics gating, trial banner, purchase UI, subscription mgmt, referral milestones, analytics**
> Goal: 3-tier freemium + cosmetic IAP + viral K-factor growth

---

## Legend

- [ ] Not started
- [~] Partially exists (needs monetization layer)
- [x] Already shipped

---

## 1. PAYMENT & SUBSCRIPTION INFRASTRUCTURE

### 1.1 Payment Processor
- [ ] Integrate RevenueCat (or Stripe for web) for subscription management
- [ ] Apple IAP setup (App Store review guidelines for kids' apps)
- [ ] Google Play Billing setup
- [ ] Web Stripe Checkout fallback (PWA users)
- [ ] Receipt validation Cloud Function (server-side verification)

### 1.2 Subscription Tiers
- [ ] **Tier 1: Free ("Sprout")** — Levels 1-3, basic SRS (~30 daily reviews), public leaderboard, basic achievements
- [ ] **Tier 2: Champion Pass (~$4.99/mo or $29.99/yr)** — All 10 levels, unlimited SRS, full analytics, etymology quiz, roots study, advanced timed modes, locked cosmetics
- [ ] **Tier 3: Bee Team (~$7.99/mo or $49.99/yr)** — Family/classroom: up to 5 learner profiles, parent/teacher dashboard, custom word list creator (assigned), printable progress reports

### 1.3 Trial & Conversion
- [x] 7-day Champion Pass trial triggered at Level 3 completion — activateTrial(7) in usePremium
- [x] Trial banner UI (non-intrusive, tappable → UpgradeModal, session-dismissible) — App.tsx
- [x] Countdown timer for trial expiration — daysRemaining in trial banner + Settings
- [x] Paywall screen design (chalk aesthetic, feature comparison table) — UpgradeModal component
- [x] Purchase buttons ($4.99/mo, $29.99/yr) in UpgradeModal — TODO: STRIPE wire `handlePurchase()` to Stripe Checkout
- [x] Post-trial state: trial button hidden, only purchase buttons shown — trialUsed flag
- [ ] Restore purchases flow — TODO: STRIPE RevenueCat/Stripe customer portal link
- [x] Subscription management section in Settings — ChampionPassSection in SettingsModal (status badge + manage/upgrade button)

---

## 2. CONTENT GATING (Free vs. Paid)

### 2.1 Level Gating
- [x] Gate Levels 4-10 behind Champion Pass — UpgradeModal + isLevelPremium()
- [x] All 10 levels exist and work — gating logic wired in PathPage + QuestionTypePicker
- [x] "Unlock with Champion Pass" prompt when tapping Level 4+ — UpgradeModal shown
- [ ] Graceful degradation: free users keep progress if subscription lapses

### 2.2 SRS Gating
- [x] Leitner SRS exists (5 boxes) — daily review cap implemented for free tier
- [x] Free tier: cap at 30 SRS reviews/day (FREE_DAILY_REVIEW_CAP in config.ts)
- [x] Champion Pass: unlimited reviews
- [x] UI indicator showing remaining free reviews (PathPage CTA + "X reviews remaining")

### 2.3 Premium Tools Gating
- [x] Etymology data exists — etymology quiz gated as Champion-only in QuestionTypePicker
- [x] Roots browser exists — gated as Champion-only (premium flag on CategoryEntry)
- [ ] Advanced Timed Mode (e.g., speed rounds, endurance mode) — Champion only
- [ ] Full Analytics & Report Cards — Champion only
- [~] Basic stats exist; need "full analytics" view behind paywall

### 2.4 Cosmetics Gating
- [x] 13 chalk themes: 4 Champion-only (Shadow Flame, Neon Pulse, Void, Prismatic) — `premium: true` on ChalkTheme
- [x] 4 swipe trails: 2 Champion-only (Rainbow Ribbon, Static Shock) — `premium: true` on TrailConfig
- [x] Lock icon + UpgradeModal on premium cosmetics in MePage pickers
- [~] 8 flair items exist (achievement-unlocked) — add paid-exclusive flair later

---

## 3. COSMETIC IN-APP PURCHASES (One-Time)

### 3.1 Cosmetic Packs ($0.99-$1.99)
- [ ] Themed chalk packs (holiday, seasonal, neon, pastel)
- [ ] Themed trail packs (snowflake, firework, glitter)
- [ ] Holiday icon packs (seasonal avatar accessories)
- [ ] IAP product catalog in app stores
- [ ] Shop UI page (browse, preview, purchase)
- [ ] "Owned" badge on purchased items

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
- [ ] Share streak milestones ("I'm on a 30-day streak!")
- [x] Share leaderboard rank changes — share button on user's own rank row
- [x] Weekly recap shareable card — "Share" button in WeeklyRecap component

### 4.3 Challenge & Competition Virality
- [ ] "Challenge a friend" flow (send specific word list via link)
- [ ] Head-to-head async challenges (play same set, compare scores)
- [~] 1v1 multiplayer exists but hidden — UNHIDE when ready
- [ ] Classroom challenge codes (teacher creates, students join)
- [ ] Weekly tournament with shareable bracket

### 4.4 Leaderboard Virality
- [x] Weekly XP leaderboard — EXISTS
- [x] Rival ping system — EXISTS
- [ ] "Invite to compete" button on leaderboard (sends referral link)
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
- [ ] Ensure key gate is natural (Level 3 → 4 transition, not arbitrary popup)
- [ ] Ensure referral rewards don't create leaderboard imbalance

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
12. ✅ Purchase buttons in UpgradeModal ($4.99/mo + $29.99/yr — TODO: STRIPE)
13. ✅ Subscription management in Settings (status badge, manage/upgrade)
14. ✅ Referral milestone rewards (3/5/10 → 2wk/1mo/3mo auto-extend)
15. ✅ Firebase Analytics (7 key funnel events)

### Phase 1.5: Stripe Integration (TODO)
- [ ] TODO: STRIPE — Create Stripe products: Champion Pass Monthly ($4.99) + Annual ($29.99)
- [ ] TODO: STRIPE — Wire `handlePurchase('monthly'|'annual')` in UpgradeModal to Stripe Checkout session
- [ ] TODO: STRIPE — Cloud Function webhook for `checkout.session.completed` → set championPassExpiry
- [ ] TODO: STRIPE — Distinguish trial vs paid subscription (isTrial flag → Stripe subscription metadata)
- [ ] TODO: STRIPE — Customer portal link in Settings "Manage" button for paid subscribers
- [ ] TODO: STRIPE — Subscription renewal webhook → auto-extend expiry
- [ ] TODO: STRIPE — Cancellation webhook → expiry = current period end (no immediate revoke)
- [ ] TODO: STRIPE — Receipt/invoice emails via Stripe
- [ ] TODO: STRIPE — Restore purchases flow (check Stripe for active subscription on login)

### Phase 2: Revenue Expansion
10. Cosmetic IAP shop (chalk packs, trail packs)
11. Competition word packs
12. Bee Coach AI add-on
13. Product analytics (funnel tracking, retention cohorts)

### Phase 3: Family & Classroom
14. Multi-profile support (Bee Team tier)
15. Parent/teacher dashboard
16. Achievement emails to parents
17. Printable certificates and report cards

### Phase 4: Lifecycle & Campaigns
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
| 13 chalk themes | **4 Gated** | ✅ Shadow Flame, Neon Pulse, Void, Prismatic = Champion |
| 4 swipe trails | **2 Gated** | ✅ Rainbow Ribbon, Static Shock = Champion |
| 8 flair items | Free (achievement unlock) | Add paid-exclusive flair |
| Session share cards | **Referral-enabled** | ✅ Referral code in all share text |
| Challenge URLs | Free | Add referral tracking |
| Weekly leaderboard | **Share-enabled** | ✅ Share button on user's rank row |
| Rival pings | Free | Add "challenge" deeplink |
| Custom word lists (10 max) | Free | Unlimited for Champion |
| Cloud TTS (200/day) | Free | Unlimited for Champion |
| Bee Simulation | Free | Keep free (engagement) |
| Daily Challenge | **Referral-enabled** | ✅ Referral code in share text |
| Etymology/Roots tools | **Champion-only** | ✅ Gated in QuestionTypePicker |
| Error pattern analysis | Free | Gate full analytics |
| 1v1 Multiplayer | Hidden | Unhide for Champion users |
| Print study sheet | Free | Add certificates for Champion |
