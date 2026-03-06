# Monetization — Pending Work

> Phases 0–3 complete. This file tracks **only remaining work**.

---

## Completed (Summary)

- **Free tier**: Levels 1-3, 2 SRS reviews/day, public leaderboard, basic achievements
- **Champion Pass** ($4.99/mo, $29.99/yr): All 10 levels, unlimited SRS, etymology, roots, premium cosmetics, advanced timed, 1v1 multiplayer
- **Bee Team** ($7.99/mo, $49.99/yr): 5 learner profiles, parent dashboard, certificates, custom branding (Stripe checkout TBD)
- **Cosmetic shop**: 9 packs (chalk themes, trails, seasonal flair) via Stripe one-time payments
- **Referral system**: SPELL-XXXX codes, both parties get 7 days, milestone rewards
- **Certificates**: Level completion, bee champion, weekly champion — print + PNG download
- **Analytics**: 21 tracked event types, GA4 support
- **Social sharing**: Referral codes in all share cards, "Beat my score" challenge links, weekly tournament, classroom codes

---

## Pending: Payment Infrastructure

- [ ] Apple IAP setup (native app)
- [ ] Google Play Billing (native app)
- [ ] Bee Team Stripe Checkout (Champion Pass works, Bee Team buttons are UI-only)

---

## Pending: Content Packs

- [ ] SAT vocabulary pack ($2.99-$4.99)
- [ ] "Bee Coach" AI add-on ($2.99/mo) — personalized recommendations, mnemonics, weakness analysis

---

## Pending: Push Notifications (FCM)

- [ ] FCM integration + permission prompt
- [ ] Token storage in Firestore user doc
- [ ] Notification preferences in Settings
- [ ] Types: streak protection, daily challenge, weekly leaderboard, achievement unlocked, rival activity, referral conversion, trial expiring

---

## Pending: Parent/Family Features (Bee Team)

- [x] Per-child error pattern tracking (profile-isolated word history + insights in parent dashboard)
- [ ] Weekly email digest to parent
- [x] Assignment feature (assign word lists to learners, shown in practice tab)
- [ ] Parent achievement emails (milestone + share CTA)
- [ ] COPPA-compliant parent email verification

---

## Pending: Digital Badges & Social Proof

- [x] Shareable badge images for achievements (800×800 PNG share cards)
- [x] "Verified Speller" badge (mastered 100+ words at Level 5+)
- [x] Embed badges in share cards (session summary + badge share generator)

---

## Pending: Analytics KPI Targets

- [ ] CPI < $2.00
- [ ] Day 1 Retention > 40%, Day 7 > 25%, Day 30 > 15%
- [ ] Free-to-Paid > 5%
- [ ] Session Length > 8 mins
- [ ] 50,000 installs in 90 days

---

## Pending: Seasonal Campaigns

- [ ] "Road to the National Bee" (Jan-May)
- [ ] "Back to School" (Aug-Sep) — educator targeting, 30-day Bee Team trial
- [ ] "Summer Spelling Safari" (Jun-Aug)
- [ ] Seasonal cosmetic drops
- [ ] Lifecycle sequences: streak-at-risk, Monday "New week!", Sunday rank summary, trial expiration, win-back (7d inactive)

---

## Pending: Other Features

- [ ] Multiplayer matchmaking + abuse prevention (code exists, button shown for Champions)
- [ ] Completionist progress — per-level percentile + milestone badges at 100/500/1K/5K/10K words mastered

---

## What to Avoid

- No interstitial ads
- No aggressive freeplay gating (free tier is generous)
- No pay-to-win leaderboard (XP earned by playing, not buying)
- Natural gate at Level 3→4 boundary
- Referral rewards = Champion Pass time, not XP
