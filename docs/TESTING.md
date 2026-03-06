# Testing

**Framework**: Vitest (no DOM/browser deps — tests run in Node). 23 test files, 328 tests.

**Run**: `npx vitest run` (once) or `npm run test` (watch mode).

## Test Categories

| Category | Files | What's covered |
|----------|-------|----------------|
| **Core game logic** | `useWordHistory`, `statsIntegration`, `dailyChallenge`, `seededRng` | Leitner SRS boxes, stats merge, day streaks, daily seed |
| **Word bank** | `wordRegistry`, `spellingGenerator`, `ukDialect`, `etymologyParser` | Tier loading, distractor generation, UK overrides, etymology parsing |
| **Scoring & progression** | `achievements`, `ranks`, `difficulty`, `curriculum` | All 27 achievements, rank transitions, adaptive difficulty algorithm, per-level progress |
| **Analytics** | `errorPatterns` | Error categorization, mistake insights, study plan, difficulty nudge |
| **UI utilities** | `spellingDiff`, `cloudTts`, `customLists` | LCS diff + hint detection, TTS caching, custom list CRUD |
| **Bee simulation** | `useBeeSimulation` | Round progression, elimination, no-help tracking |
| **Integration** | `integration-session` | Full flow: word generation → answer recording → stats → achievements → SRS |

## Canonical Definitions

These must stay consistent across the entire codebase:

- **Mastered word**: `box >= 4 && (typedAttempts ?? 0) >= 1` — requires both Leitner mastery AND at least one typed-answer attempt
- **6-bucket classification**:
  - Practicing: box 0–1, ≥3 attempts, <50% accuracy
  - New: 0 attempts
  - Learning: box 0–1
  - Reviewing: box 2
  - Familiar: box 3 or box 4 without typed attempt
  - Mastered: canonical definition above

## Test Strategy: Preventing Regressions

When adding a new feature, follow this checklist:

1. **Pure logic → unit test**: If the feature has pure functions (no React), add tests in `src/tests/`. Test edge cases and boundaries, not just happy paths.
2. **Hook logic → algorithm test**: For React hooks, extract and test the core algorithm as a plain-JS simulation (see `difficulty.test.ts`). Avoid `@testing-library/dom` dependency.
3. **Cross-module flow → integration test**: If the feature touches multiple modules (e.g., word selection + stats + achievements), add a case to `integration-session.test.ts`.
4. **Canonical definitions**: If the feature uses "mastered", "learning", or any mastery bucket, use the canonical definition above. `useWordHistory.test.ts` has a test that enforces the mastery definition.
5. **Achievement additions**: Update the count assertion in `achievements.test.ts` and add a test for the new achievement's trigger condition.
6. **Word bank changes**: Run the full suite — `wordRegistry.test.ts` validates all loaded words have required fields.
