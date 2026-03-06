# Spelling Bee

A spelling practice app with swipe-based gameplay, spaced repetition, and a chalkboard aesthetic. Built with React, TypeScript, Vite, and Firebase.

## Quick Start

```bash
npm install
npm run dev        # Start dev server
npm run verify     # Lint + typecheck + test + build
```

## Features

- **Swipe/MCQ gameplay** — hear a word, pick the correct spelling from 3 options
- **10 difficulty levels** — from CVC words (cat, dog) to competition-level vocabulary
- **117K word bank** — 2,796 hand-curated + 91,569 pipeline words across 9 tiers
- **Spaced repetition** — Leitner 5-box system tracks mastery per word
- **Spelling Bee simulation** — multi-round competition with NPC opponents
- **Daily challenge** — seeded RNG gives everyone the same words (10/25/50 sizes)
- **Weekly leaderboard** — XP-based with rival ping system
- **Achievements** — 27 badges across core, hard mode, timed, and mastery categories
- **Cosmetics** — chalk themes, swipe trails, stick-figure avatars with flair
- **Champion Pass** — premium tier with all 10 levels, unlimited SRS, etymology, roots
- **Bee Team** — family tier with 5 learner profiles + parent dashboard
- **Certificates** — printable level completion, bee champion, weekly champion certificates
- **PWA** — installable, offline-capable

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion |
| Backend | Firebase Auth + Firestore |
| Tests | Vitest (23 files, 328 tests) |

## Project Structure

```
src/
├── App.tsx                  # Main app, wires hooks to UI
├── config.ts                # Storage keys, Firestore collections, app identity
├── engine/                  # Domain-agnostic game engine
├── domains/spelling/        # Spelling-specific logic + 117K word bank
├── components/              # UI components
├── hooks/                   # Custom React hooks
├── utils/                   # Pure utilities
└── tests/                   # Vitest tests
```

## Pre-push Hook

`npm run verify` runs automatically before every `git push`. Blocks push on failure.
