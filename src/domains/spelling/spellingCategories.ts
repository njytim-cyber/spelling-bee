/**
 * domains/spelling/spellingCategories.ts
 *
 * Spelling domain category and band definitions.
 */
import type { CategoryEntry, BandEntry } from '../../engine/categories';
import { typesForBand as _typesForBand, defaultTypeForBand as _defaultTypeForBand } from '../../engine/categories';

// ── Type unions ───────────────────────────────────────────────────────────────

export type SpellingCategory =
    | 'cvc'
    | 'blends'
    | 'digraphs'
    | 'silent-e'
    | 'vowel-teams'
    | 'r-controlled'
    | 'diphthongs'
    | 'prefixes'
    | 'suffixes'
    | 'multisyllable'
    | 'latin-roots'
    | 'greek-roots'
    | 'french-origin'
    | 'competition'
    | 'review'
    | 'bee'
    | 'tournament'
    | 'mix'
    | 'daily'
    | 'challenge'
    | 'speedrun'
    | 'ghost';

export type SpellingGroup = 'daily' | 'basic' | 'core' | 'advanced' | 'expert' | 'competition' | 'mixed';

export type SpellingBand = 'starter' | 'rising' | 'sigma';

// ── Category entries ──────────────────────────────────────────────────────────

export const SPELLING_CATEGORIES: ReadonlyArray<CategoryEntry<SpellingCategory>> = [
    // Daily
    { id: 'daily',          icon: '📅', label: 'Daily',         group: 'daily'       },
    // Basic (K-1st)
    { id: 'cvc',            icon: '🐱', label: 'CVC Words',     group: 'basic'       },
    { id: 'blends',         icon: '🌬️', label: 'Blends',        group: 'basic'       },
    // Core (2nd-3rd)
    { id: 'digraphs',       icon: '🔤', label: 'Digraphs',      group: 'core'        },
    { id: 'silent-e',       icon: '🤫', label: 'Silent E',      group: 'core'        },
    { id: 'vowel-teams',    icon: '🎭', label: 'Vowel Teams',   group: 'core'        },
    { id: 'r-controlled',   icon: '🏴‍☠️', label: 'R-Controlled',  group: 'core'        },
    { id: 'diphthongs',     icon: '🎵', label: 'Diphthongs',    group: 'core'        },
    // Advanced (4th-5th)
    { id: 'prefixes',       icon: '🔧', label: 'Prefixes',      group: 'advanced'    },
    { id: 'suffixes',       icon: '🧩', label: 'Suffixes',      group: 'advanced'    },
    { id: 'multisyllable',  icon: '📏', label: 'Multisyllable', group: 'advanced'    },
    // Expert (6th-8th)
    { id: 'latin-roots',    icon: '🏛️', label: 'Latin Roots',   group: 'expert'      },
    { id: 'greek-roots',    icon: '🏺', label: 'Greek Roots',   group: 'expert'      },
    { id: 'french-origin',  icon: '🥐', label: 'French Origin', group: 'expert'      },
    // Competition (Scripps level)
    { id: 'competition',    icon: '🏆', label: 'Competition',   group: 'competition' },
    // Mixed
    { id: 'mix',            icon: '🌀', label: 'Mix',           group: 'mixed'       },
] as const;

// ── Band definitions ──────────────────────────────────────────────────────────

export const SPELLING_BANDS: ReadonlyArray<BandEntry<SpellingBand>> = [
    {
        id: 'starter',
        emoji: '🐣',
        label: 'Starter',
        groups: new Set(['daily', 'basic']),
        defaultCategoryId: 'cvc',
    },
    {
        id: 'rising',
        emoji: '📚',
        label: 'Rising',
        groups: new Set(['daily', 'basic', 'core', 'advanced', 'mixed']),
        defaultCategoryId: 'digraphs',
    },
    {
        id: 'sigma',
        emoji: '🚀',
        label: 'Sigma',
        groups: new Set(['daily', 'basic', 'core', 'advanced', 'expert', 'competition', 'mixed']),
        defaultCategoryId: 'vowel-teams',
    },
];

export const SPELLING_BAND_LABELS: Record<SpellingBand, { emoji: string; label: string }> = {
    starter: { emoji: '🐣', label: 'Starter' },
    rising:  { emoji: '📚', label: 'Rising'  },
    sigma:   { emoji: '🚀', label: 'Sigma'   },
};

export const SPELLING_AGE_BANDS: SpellingBand[] = ['starter', 'rising', 'sigma'];

export const SPELLING_GROUP_LABELS: Record<SpellingGroup, string> = {
    daily: 'Daily',
    basic: 'Basic',
    core: 'Core',
    advanced: 'Advanced',
    expert: 'Expert',
    competition: 'Competition',
    mixed: 'Mixed',
};

// ── Convenience wrappers ──────────────────────────────────────────────────────

export function typesForBand(band: SpellingBand): ReadonlyArray<CategoryEntry<SpellingCategory>> {
    return _typesForBand(band, SPELLING_BANDS, SPELLING_CATEGORIES) as ReadonlyArray<CategoryEntry<SpellingCategory>>;
}

export function defaultTypeForBand(band: SpellingBand): SpellingCategory {
    return _defaultTypeForBand(band, SPELLING_BANDS) as SpellingCategory;
}
