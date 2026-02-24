# Math Swipe ✏️

A fast-paced mental math game with a chalkboard aesthetic. Built with React, TypeScript, Vite, and Firebase.

## Quick Start

```bash
npm install
npm run dev        # Start dev server
npm run verify     # Lint + typecheck + test + build
```

## Git Workflow

> **⚠️ NEVER push directly to `master`.** All changes go through PRs.

```
master (production — auto-deploys to Cloudflare Pages)
  └── dev (integration branch for PRs)
        └── feature/* | fix/* | chore/*
```

### Steps

1. **Branch** from `dev`: `git checkout -b fix/description`
2. **Develop** — commit early and often
3. **Verify**: `npm run verify` (eslint + tsc + vitest + vite build)
4. **Push** the branch: `git push -u origin fix/description`
5. **Open PR** → `dev` on GitHub
6. **Merge PR** on GitHub (squash recommended)
7. **Release**: PR `dev` → `master` to deploy to production

### Pre-push Hook

The `prepare` script installs a git hook that runs `npm run verify` before every push. If it fails, the push is blocked.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion |
| Backend | Firebase Auth + Firestore |
| Deploy | Cloudflare Pages (auto-deploy on `master`) |
| Tests | Vitest |

## Project Structure

```
src/
├── App.tsx                  # Main app component
├── components/              # UI components
├── hooks/                   # Custom React hooks
│   ├── useGameLoop.ts       # Core game logic
│   ├── useStats.ts          # Stats persistence
│   ├── useSessionUI.ts      # Auto-summary + PB detection
│   └── ...
├── utils/                   # Pure utilities
│   ├── mathGenerator.ts     # Question generation
│   ├── achievements.ts      # Badge system
│   └── ...
└── tests/                   # Vitest tests
```

## Version

Current: **v1.0.2** (semver)
