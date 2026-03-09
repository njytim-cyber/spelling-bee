# Spelling Bee — Project Guide

## Principle 1: Accuracy Is Everything
This is a spelling app. **Accuracy of word data is the most important thing.** Every word's definition, example sentence, part of speech, difficulty rating, phonics pattern, theme assignment, and pronunciation must be correct. This principle overrides all other considerations. Never generate or accept inaccurate word data.

## Quick Commands
```bash
npm run dev       # Dev server with HMR
npm run build     # TypeScript check + Vite production build
npx vitest run    # Run tests once (30 files, 492 tests)
npx tsc --noEmit  # Type-check only
npm run verify    # Full check: lint + tsc + test + build (runs on pre-push)
```

## Tech Stack
React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4 + Framer Motion + Firebase (Auth + Firestore) + Vitest + PWA via vite-plugin-pwa

## Architecture at a Glance
- **10 levels** (Level 1–10), each mapped 1:1 to difficulty 1–10. No K-12 grade names.
- **Session-based play**: pick level → pick size (10/20/50) → SRS determines mix (max 20% review)
- **50K word bank** across 9 tiers. Tiers 1–2 eager-loaded, 3–9 lazy via `ensureAllTiers()`. All definitions and examples quality-audited (20,502 fixes applied).
- **Leitner SRS**: 5 boxes (0–4). Mastered = `box >= 4 && typedAttempts >= 1`.
- **Input**: MCQ tap + typed entry. Keyboard: 1/2/3 for options, ↑ skip. No swipe gestures.
- **Stats**: local-first with Firestore sync. `mergeStats()` takes best of each field.
- **Modals**: `ModalShell` / `InputModal` only. **Never** use `alert()`, `confirm()`, `prompt()`.
- **Icons**: SVGs in `Icons.tsx` for structural UI, emojis only for celebrations/cosmetics.

See `docs/ARCHITECTURE.md` for full directory layout, data flow, and detailed patterns.

## Key Files
| File | Purpose |
|------|---------|
| `src/App.tsx` | Root component |
| `src/config.ts` | Storage keys, Firestore collections |
| `src/domains/spelling/words/registry.ts` | Lazy-loading tier registry |
| `src/domains/spelling/spellingCategories.ts` | Categories, curriculum |
| `src/domains/spelling/spellingGenerator.ts` | Word selection + distractors |
| `src/hooks/useGameLoop.ts` | Core game loop |
| `src/hooks/useWordHistory.ts` | Leitner SRS |
| `src/hooks/useStats.ts` | Stats persistence + sync |
| `src/components/Icons.tsx` | Centralized SVG icon library |
| `src/utils/analytics.ts` | GA4 analytics wrapper (events, user ID, properties, latency) |
| `scripts/pipeline/export-to-app.cjs` | Pipeline export + child safety filtering |

## Documentation Map

This file is a map, not a manual. Deep knowledge lives in `docs/`:

```
CLAUDE.md               ← You are here (the map)
MONETIZATION.md          ← Pending monetization work (Phases 0-3 complete)
docs/
├── ARCHITECTURE.md      ← Directory layout, data flow, key patterns, lazy loading
├── FRONTEND.md          ← CSS conventions, icon rules (SVG vs emoji), modal pattern
├── TESTING.md           ← Test categories, canonical definitions, regression strategy
├── WORD-PIPELINE.md     ← Word bank structure, pipeline, quality rules, child safety
└── REMOVED-FEATURES.md  ← What was removed and why (do not re-implement)
```

**Before implementing any changes**, read the relevant doc(s) from the table below. Do not start writing code until you have read them — even if you think you remember the content from a previous session.

- Adding/changing UI → `docs/FRONTEND.md`
- Adding a feature or understanding data flow → `docs/ARCHITECTURE.md`
- Adding tests or checking mastery definitions → `docs/TESTING.md`
- Touching the word bank or pipeline → `docs/WORD-PIPELINE.md`
- Before re-implementing a feature that might have existed → `docs/REMOVED-FEATURES.md`
- Working on payments, subscriptions, or gating → `MONETIZATION.md`
