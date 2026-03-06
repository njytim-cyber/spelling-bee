# Frontend Conventions

## CSS

### Font Families
- `chalk` — display font (headings, game text)
- `ui` — interface font (body, labels, buttons)

### Color Variables
| Variable | Usage |
|----------|-------|
| `--color-gold` | XP, achievements |
| `--color-correct` | Correct answers |
| `--color-wrong` | Incorrect answers |
| `--color-streak-fire` | Streak indicators |
| `--color-chalk` | Primary chalk color |
| `--color-fg` | Foreground (RGB triplet) |
| `--color-overlay` | Modal overlays |

### Opacity Pattern
```css
text-[rgb(var(--color-fg))]/60   /* Tailwind opacity shorthand */
```

### Text Sizes
- `text-2xl chalk` — headings
- `text-sm ui` — body text
- `text-[10px] ui` — tiny labels

## Modal Pattern
- `AnimatePresence` + `motion.div` with overlay click-to-close
- Consistent 340px width
- **NEVER use native browser dialogs** (`alert()`, `confirm()`, `prompt()`)
- Always use `ModalShell` or `InputModal` from `components/`

## Icon Conventions: SVG vs. Emoji

The app maintains a clear distinction to preserve its chalk-line aesthetic.

### Use SVG Icons For:
- Navigation elements (bottom nav, tabs)
- Interactive UI controls (buttons, settings, close/check/edit)
- Study tools (book, tree, chart icons)
- Leaderboard ranks (crown, medal, star for top 3)
- Achievement badges (all 21 achievement icons)
- Category icons (all 65+ phonics/theme icons)
- Any structural UI element that should match the chalk aesthetic

### Use Emojis For:
- Swipe trail effects (🖍️🌈🔥⚡)
- Streak indicators (🔥 fire for streaks)
- Achievement celebrations (trophy, stars in toasts)
- Share text grids (🟩🟥 for social sharing)
- Mode badges (💀⏱️💯🐝)
- Rank emojis in player profiles (🌱📚🔤✏️ etc.)
- Playful, celebratory, or cosmetic elements

### Centralized Icon Library
All SVG icons live in `src/components/Icons.tsx`. Icons use:
- 24×24 viewBox (standard UI size)
- `stroke="currentColor"` for theme color inheritance
- `strokeWidth="2"` with `strokeLinecap="round"` `strokeLinejoin="round"`
- Consistent chalk-line hand-drawn aesthetic

### Examples
```tsx
// ✅ CORRECT - SVG for structural UI
import { IconSettings, IconCheck, IconClose } from './Icons';
<button><IconSettings className="w-5 h-5" /></button>

// ✅ CORRECT - Emoji for celebration/playful context
<div className="text-2xl">🏆 PERFECT</div>
<div>{streak}🔥</div>

// ❌ WRONG - Don't use emojis for structural UI
<button>⚙️</button> // Should use <IconSettings />

// ❌ WRONG - Don't use HTML entities or Unicode escapes
<span>&#127941;</span> // Use 🏆 directly
<span>{'\u{1F451}'}</span> // Use 👑 or <IconCrown /> depending on context
```
