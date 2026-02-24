# Forking the Swipe Engine

> This file documents how to create a new educational game (e.g. **Spelling Bee**) by copying the engine from `math-swipe` into a fresh VS Code repo.

---

## 1. Repo Setup (empty VS Code workspace)

```bash
# 1. Copy the full math-swipe directory
cp -r math-swipe spelling-bee

# 2. Open in VS Code
code spelling-bee

# 3. Install dependencies (identical package.json)
npm install

# 4. Verify everything still works
npm test && npm run build
```

> **Do not start from scratch.** The Firebase setup, auth, leaderboard, themes, trails, achievements engine, PWA config, and CSP headers are all already wired in. Just replace the domain layer.

---

## 2. The Five Files to Edit / Create

### 2a. `src/config.ts` — rebrand the app

```ts
export const APP_ID = 'spell-bee';           // ← change
export const STORAGE_PREFIX = 'spell-bee';   // ← change (different from math-swipe)
export const FIRESTORE = {
    USERS: 'users',
    PINGS: 'pings',
} as const;
export const NAV_TABS = [
    { id: 'game'   as const, label: "Spell!",    ariaLabel: 'Play'        },
    { id: 'league' as const, label: 'League',    ariaLabel: 'Leaderboard' },
    { id: 'magic'  as const, label: 'Word Lab',  ariaLabel: 'Lessons'     },
    { id: 'me'     as const, label: 'Me',        ariaLabel: 'Profile'     },
] as const;
```

⚠️ **`STORAGE_PREFIX` must be different** from `math-swipe` or you'll read the wrong localStorage data if both apps are deployed on the same domain.

---

### 2b. `src/domains/spelling/spellingCategories.ts` — difficulty bands & categories

```ts
import type { CategoryEntry, BandEntry } from '../../engine/categories';

export type SpellingCategory = 'cvc' | 'blends' | 'digraphs' | 'silent-e' | 'vowel-teams' | 'mix';
export type SpellingBand = 'starter' | 'rising' | 'sigma';

export const SPELLING_CATEGORIES: ReadonlyArray<CategoryEntry<SpellingCategory>> = [
    { id: 'cvc',        icon: '🐱', label: 'CVC Words',    group: 'basic'    },
    { id: 'blends',     icon: '🌬️', label: 'Blends',       group: 'basic'    },
    { id: 'digraphs',   icon: '🔤', label: 'Digraphs',     group: 'core'     },
    { id: 'silent-e',   icon: '🤫', label: 'Silent E',     group: 'core'     },
    { id: 'vowel-teams',icon: '🎭', label: 'Vowel Teams',  group: 'advanced' },
    { id: 'mix',        icon: '🌀', label: 'Mix',          group: 'mixed',  hidden: false },
];

export const SPELLING_BANDS: ReadonlyArray<BandEntry<SpellingBand>> = [
    { id: 'starter', emoji: '🐣', label: 'Starter Pack', groups: new Set(['basic']),              defaultCategoryId: 'cvc'         },
    { id: 'rising',  emoji: '📚', label: 'Rising',       groups: new Set(['basic', 'core']),     defaultCategoryId: 'digraphs'    },
    { id: 'sigma',   emoji: '🚀', label: 'Sigma Speller',groups: new Set(['core', 'advanced', 'mixed']), defaultCategoryId: 'vowel-teams' },
];
```

---

### 2c. `src/domains/spelling/spellingGenerator.ts` — produce EngineItems

```ts
import type { EngineItem } from '../../engine/domain';

// Word bank (can be loaded from JSON file instead)
const WORD_BANKS: Record<string, string[]> = {
    cvc:         ['cat', 'dog', 'hip', 'fun', 'bed'],
    blends:      ['flag', 'grip', 'stop', 'clam', 'drip'],
    digraphs:    ['chat', 'ship', 'thin', 'whip', 'when'],
    'silent-e':  ['cake', 'bike', 'note', 'cute', 'pine'],
    'vowel-teams':['rain', 'seat', 'boat', 'food', 'loud'],
};

function pickWord(category: string, rng?: () => number): string {
    const bank = WORD_BANKS[category] ?? WORD_BANKS['cvc'];
    const rand = rng ?? Math.random;
    return bank[Math.floor(rand() * bank.length)];
}

function makeDistractors(correct: string, category: string, rng?: () => number): string[] {
    const bank = (WORD_BANKS[category] ?? []).filter(w => w !== correct);
    const rand = rng ?? Math.random;
    const shuffled = [...bank].sort(() => rand() - 0.5);
    return shuffled.slice(0, 2);
}

export function generateSpellingItem(
    _difficulty: number,
    category: string,
    _hardMode: boolean,
    rng?: () => number,
): EngineItem {
    const correct = pickWord(category, rng);
    const rand = rng ?? Math.random;
    const distractors = makeDistractors(correct, category, rng);
    const options = [...distractors, correct].sort(() => rand() - 0.5);
    const correctIndex = options.indexOf(correct);

    return {
        id:           `${category}-${correct}-${Date.now()}`,
        prompt:       correct.toUpperCase(),  // shown as the display (could be audio cue instead)
        answer:       correct,
        options,
        correctIndex,
    };
}
```

> 💡 For **audio-first** spelling (word is spoken, not shown), set `prompt` to the audio URL or a description, and render via a custom `ProblemView` variant.

---

### 2d. `src/domains/spelling/spellingMessages.ts` — mascot quips

```ts
import type { ChalkMessageOverrides } from '../../utils/chalkMessages';

const TOPIC_SUCCESS: Record<string, string[]> = {
    'cvc':         ['Short and sweet! 🐱', 'Nailed that CVC! ✅'],
    'silent-e':    ['Silent but deadly! 🤫✨', 'Magic E mastered! 🪄'],
    'vowel-teams': ['Vowel power! 🎭', 'The team works! 🤝'],
};

const TOPIC_FAIL: Record<string, string[]> = {
    'cvc':         ['Short words, big practice! 💙', 'Sound it out! 🔊'],
    'silent-e':    ['That E is sneaky! 🤫', 'Magic takes practice! 🪄'],
};

const SPELLING_EGGS = [
    '"Rhythm" has no vowels — and you\'re still crushing it! 🎵',
    'Fun fact: "queue" is just the letter Q with 4 silent letters! 🤐',
    'The word "set" has 464 definitions. You\'ve got this! 📖',
];

export const SPELLING_MESSAGE_OVERRIDES: ChalkMessageOverrides = {
    topicSuccess: (id) => TOPIC_SUCCESS[id] ?? null,
    topicFail:    (id) => TOPIC_FAIL[id]    ?? null,
    easterEggs:   SPELLING_EGGS,
};
```

---

### 2e. `src/App.tsx` — wire it all together

Replace the three math adapter functions near the top of `App.tsx`:

```ts
// ── SWAP THESE for your domain ──────────────────────────────────────────────
import { generateSpellingItem } from './domains/spelling/spellingGenerator';
import { SPELLING_MESSAGE_OVERRIDES } from './domains/spelling/spellingMessages';
import { SPELLING_CATEGORIES, SPELLING_BANDS } from './domains/spelling/spellingCategories';

function generateMathItem(difficulty: number, categoryId: string, hardMode: boolean, rng?: () => number) {
    return generateSpellingItem(difficulty, categoryId, hardMode, rng);
}
function generateMathFiniteSet(categoryId: string, _challengeId: string | null) {
    // Spelling daily: 10 random words from mixed categories
    return Array.from({ length: 10 }, (_, i) =>
        generateSpellingItem(2 + Math.floor(i / 4), 'mix', false)
    );
}
// ─────────────────────────────────────────────────────────────────────────────
```

And pass overrides to `MrChalk`:
```tsx
<MrChalk
    ...
    messageOverrides={SPELLING_MESSAGE_OVERRIDES}   // ← add this
/>
```

---

## 3. What You Get for Free

Everything below works **unchanged** — zero edits needed:

- ✅ Firebase Auth (Google + email magic link)
- ✅ Firestore leaderboard (score + speedrun)
- ✅ Swipe gesture + keyboard arrow nav
- ✅ Lives / streak / combo system
- ✅ Hard mode + Timed mode
- ✅ Daily challenge (seeded RNG — same words for everyone)
- ✅ Challenge links (share URL → same problem set)
- ✅ Achievements system (add your own in `domains/spelling/spellingAchievements.ts`)
- ✅ XP / rank progression
- ✅ Costumes, chalk themes, swipe trails
- ✅ Skill tree ("Magic" tab — retitle lessons for spelling patterns)
- ✅ Me / Stats page (accuracy by category, streaks, badges)
- ✅ PWA (installable, offline-capable)
- ✅ Dark / light mode
- ✅ Cloudflare Pages deployment

---

## 4. Firebase Setup for the New App

The fork needs its own Firebase project (or a different Firestore namespace):

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → new project
2. Copy `.env` from math-swipe and update `VITE_FIREBASE_*` keys
3. Update `STORAGE_PREFIX` in `config.ts` (prevents localStorage collisions)
4. Firestore rules are in `firestore.rules` — copy across unchanged

---

## 5. Rename the App

| File | What to change |
|---|---|
| `index.html` | `<title>` and `<meta name="description">` |
| `vite.config.ts` | `manifest.name`, `manifest.short_name` |
| `public/manifest.webmanifest` | `name`, `short_name`, `description` |
| `src/config.ts` | `APP_ID`, `STORAGE_PREFIX`, `NAV_TABS` labels |

---

## 6. Key Architecture Reminder

```
src/
├── engine/          ← generic, never import math or spelling here
│   ├── domain.ts    ← EngineItem, GameConfig, DEFAULT_GAME_CONFIG
│   ├── scoring.ts   ← scoreCorrect, scorePenalty
│   └── categories.ts← CategoryEntry, BandEntry, typesForBand
│
├── domains/
│   ├── math/        ← math-swipe subject logic
│   └── spelling/    ← your new subject (create this folder)
│
├── config.ts        ← APP_ID, STORAGE_PREFIX, NAV_TABS, STORAGE_KEYS, FIRESTORE
│
└── hooks/
    └── useGameLoop.ts  ← accepts (generateItem, categoryId, hardMode, ..., config)
                           inject your domain's generator here (in App.tsx)
```

The engine never imports from `domains/`. The domain never imports from `engine/domain` except for `EngineItem` and `GameConfig`.
