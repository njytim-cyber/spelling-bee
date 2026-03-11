# Word Games

Six mini-games accessible from the **Compete** tab, below the Weekly Tournament button. Each game draws words from the existing word bank (via `getWordsByDifficulty()` or `getCachedByDifficulty()`), respects the user's current level difficulty, and awards XP upon completion.

## Layout

2×3 grid of square-ish buttons inside a "Word Games" section header. Each button shows:
- A chalk-line SVG icon (28×28, `currentColor`)
- The game name in `ui` font
- A one-line subtitle in 10px `ui` opacity-40

The grid uses `grid grid-cols-3 gap-2` with each cell being a `rounded-2xl` card using the standard secondary button style (`border-[rgb(var(--color-fg))]/20`, gold hover).

---

## 1. Anagrams

**Concept**: Given a word's definition, rearrange shuffled letters to spell the word.

**Flow**:
1. Show definition + part of speech at top
2. Below: shuffled letter tiles in a row (tap to select → placed in answer row)
3. Tap placed letter to return it to pool
4. Auto-submit when all letters placed; flash green/red
5. 10 words per round, difficulty matched to user level

**Scoring**: 10 XP per correct, +5 bonus if solved without removing any letters (no backtrack). Streak multiplier applies.

**UI Details**:
- Letter tiles: `rounded-lg bg-[rgb(var(--color-fg))]/10 border border-[rgb(var(--color-fg))]/20`, `chalk` font, `text-lg`
- Answer slots: dashed border initially, solid when filled
- Correct: tile flashes `bg-[var(--color-correct)]/20`
- Wrong: shake animation + tiles return to pool

---

## 2. Root Constructor

**Concept**: Build words by combining root/prefix/suffix morphemes.

**Flow**:
1. Show a target definition (e.g., "the study of life")
2. Display a pool of 6-8 morpheme tiles (mix of correct parts + distractors)
3. User taps morphemes in order to build the word (e.g., "bio" + "logy")
4. Visual: selected morphemes snap into a "construction zone" bar
5. Submit button checks the assembled word
6. 8 words per round

**Word Source**: `WORD_ROOTS` from `src/domains/spelling/words/roots.ts` — each root has prefix/suffix/meaning. Generator picks words that decompose into known roots.

**Scoring**: 15 XP per correct (harder game). Bonus +10 if built on first attempt.

**UI Details**:
- Morpheme tiles: slightly larger than letter tiles, `rounded-xl`, subtle color coding (prefix=blue tint, root=gold tint, suffix=green tint via low-opacity bg)
- Construction zone: horizontal bar with `+` separators between placed morphemes
- Correct: morphemes glow gold
- Wrong: shake + clear construction zone

---

## 3. Word Search

**Concept**: Classic word search grid — find hidden words by swiping across letters.

**Flow**:
1. Generate an 8×8 grid with 6 hidden words (difficulty-appropriate)
2. Words can be placed horizontally (L→R) or vertically (T→B) only (no diagonals — keeps it accessible)
3. Show word list on the side/below with definitions as hints
4. User drags across letters to highlight a word
5. Found words get struck through in the list and highlighted in the grid
6. Complete when all 6 found

**Grid Generation**: Place target words first, fill remaining cells with random letters weighted toward common English letters (ETAOINSHRDLU distribution).

**Scoring**: 10 XP per word found. Time bonus: +30 XP if all found under 60s, +15 under 90s.

**UI Details**:
- Grid cells: `text-sm chalk`, `w-8 h-8` squares, `rounded-sm`
- Found words: highlighted with `bg-[var(--color-correct)]/20` + strikethrough in list
- Drag selection: `bg-[var(--color-gold)]/20` highlight following finger/mouse
- Word list: `text-[10px] ui` with definition tooltips

---

## 4. Typing Defender

**Concept**: Words fall from the top of the screen. Type them correctly before they reach the bottom.

**Flow**:
1. Words appear at top and drift downward at steady pace
2. User types the word — as letters match, the word highlights green letter-by-letter
3. Complete word = word explodes with particle effect
4. If a word reaches the bottom = lose a life (3 lives total)
5. Speed increases every 5 words
6. Endless mode — score tracks how many words survived

**Word Selection**: Start with difficulty = user level - 1, increment by 0.5 every 10 words. Max 2 words on screen at once (3 at high speed).

**Scoring**: 5 XP per word defended. Streak bonus: every 5 consecutive = +10 XP bonus. High score persisted to localStorage.

**UI Details**:
- Falling words: `chalk` font, `text-lg`, white with subtle glow
- Typed progress: letters turn `text-[var(--color-correct)]` as matched
- Lives: 3 heart emojis top-right, lost hearts go gray
- Input: auto-focused text input at bottom, `rounded-xl border-2 border-[var(--color-gold)]/40`
- Explosion: scale-up + fade-out + particle burst (framer motion)
- Game over: overlay with score, words defended count, "Play Again" button

---

## 5. Crossword

**Concept**: Small crossword puzzle (5×5 to 7×7) with spelling-focused clues.

**Flow**:
1. Generate a mini crossword from 4-6 intersecting words
2. Show numbered clue list (Across / Down)
3. Tap a cell to select it + highlight the word direction
4. Type letters — auto-advance to next cell in the word
5. Tab or tap to switch between across/down
6. Complete when all cells correct

**Grid Generation**: Pick anchor word, then greedily intersect remaining words on shared letters. Fill blocked cells with black squares.

**Scoring**: 20 XP per completed crossword. Bonus +10 if no incorrect letters submitted (clean solve).

**UI Details**:
- Grid: `bg-[rgb(var(--color-fg))]/5` cells, black cells `bg-[rgb(var(--color-fg))]/20`
- Active cell: `border-2 border-[var(--color-gold)]`
- Active word highlight: `bg-[var(--color-gold)]/10`
- Clue numbers: tiny `text-[8px]` in cell top-left
- Clues panel: scrollable below grid, `text-xs ui`
- Correct word: cells flash green briefly
- Letter input: `chalk` font centered in cell

---

## 6. Unscramble

**Concept**: Race against the clock to unscramble as many words as possible.

**Flow**:
1. Show a scrambled word + its definition as a hint
2. Text input below — type the unscrambled word
3. Correct → next word instantly, score ticks up
4. Wrong → input shakes, try again (no penalty, just time lost)
5. 60-second timer, as many words as possible
6. Words get progressively harder

**Word Selection**: Start at difficulty = user level - 1, +0.3 per correct answer. Scramble algorithm: Fisher-Yates shuffle, re-shuffle if result equals original.

**Scoring**: 5 XP per word + speed bonus (2 XP extra if solved in under 3s). Final score = total words × 5 + speed bonuses.

**UI Details**:
- Scrambled word: `text-2xl chalk text-[var(--color-gold)]` centered
- Definition hint: `text-xs ui text-[rgb(var(--color-fg))]/40` below
- Timer: circular progress ring top-right, gold → red in last 10s
- Score: `chalk text-lg` top-left with pop animation on increment
- Input: large `rounded-xl` text input, auto-clear on correct
- Correct flash: brief green border pulse
- Game over: score + words count + "Play Again"

---

## Shared Patterns

- All games use `ModalShell`-style full-screen overlay (not a modal — full game view)
- Back button (chevron left) in top-left to exit game
- XP earned shown in gold at game end, auto-added to user's stats via `recordSession()`
- All games respect `useReducedMotion` — disable particle effects and use instant transitions
- Words sourced from `getCachedByDifficulty(level, level)` for the user's current level
- Game state is ephemeral (no save/resume mid-game)
- Each game tracks `wordGames_{name}_highScore` in localStorage
