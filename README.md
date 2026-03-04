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
- **Written test mode** — type-to-spell with no multiple choice
- **1v1 multiplayer** — real-time matches via Firestore rooms
- **Daily challenge** — seeded RNG gives everyone the same words (10/25/50 sizes)
- **Weekly leaderboard** — "All Time" and "This Week" tabs
- **Weekly goals** — set a word count target, track progress
- **Stats dashboard** — 7-day accuracy trend, Leitner distribution, category heatmap
- **Word book** — browse vocabulary filtered by origin, difficulty, and Leitner box
- **Etymology explorer** — Latin/Greek/French root analysis
- **Competition prep** — Scripps/State/WOTC mastery tracking
- **Achievements** — 21 badges across core, hard mode, timed, and mastery categories
- **Cosmetics** — chalk themes, swipe trails, stick figure costumes (unlocked by progress)
- **PWA** — installable, offline-capable, Cloudflare Pages deployment

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion |
| Backend | Firebase Auth + Firestore |
| Deploy | Cloudflare Pages |
| Tests | Vitest (11 files, 127 tests) |

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
