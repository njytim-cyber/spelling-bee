# Feature Backlog

Features planned for post-launch. Code may already exist in the codebase but is not user-facing.

---

## Multiplayer (1v1 Match)

**Status**: Code complete, not launched

Realtime 1v1 spelling races against another player (ghost replay). Infrastructure exists:
- `useMultiplayerRoom.ts` — Firestore-backed room creation, joining, ready state, match phases
- `MultiplayerLobby.tsx` — room code UI for creating/joining matches
- `MultiplayerMatch.tsx` — full-screen match gameplay overlay
- `useAppModals.ts` — `showMultiplayerLobby` modal state

**Why deferred**: Needs matchmaking, abuse prevention, and load testing before public release. The Compete page button is hidden but the code is retained.

---

## Parent/Teacher Dashboard

**Status**: Not started

Class management, homework assignments, weekly recap emails. Not the target market yet.

---

## Completionist Progress

**Status**: Not started

Per-level percentile ("You know 3% of all words at your level") + milestone badges at 100, 500, 1K, 5K, 10K words mastered.
