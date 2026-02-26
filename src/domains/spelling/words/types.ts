/**
 * words/types.ts
 *
 * Types for the rich word content engine.
 * Every word in the bank carries metadata for definitions, pronunciation,
 * etymology, and difficulty — enabling adaptive difficulty, bee simulation,
 * and study analytics.
 */

/** English dialect for spelling conventions */
export type Dialect = 'en-US' | 'en-GB';

export type PartOfSpeech =
    | 'noun' | 'verb' | 'adjective' | 'adverb'
    | 'preposition' | 'conjunction' | 'pronoun' | 'interjection';

/** 1 = Kindergarten CVC, 10 = national spelling bee championship */
export type DifficultyTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Scripps Words of the Champions tiers */
export type WotcTier = 'one-bee' | 'two-bee' | 'three-bee';

/** Phonics pattern categories — superset of the original 5 SpellingCategory patterns */
export type PhonicsPattern =
    | 'cvc' | 'blends' | 'digraphs' | 'silent-e' | 'vowel-teams'
    | 'r-controlled' | 'diphthongs' | 'prefixes' | 'suffixes'
    | 'compound' | 'multisyllable' | 'irregular'
    | 'latin-roots' | 'greek-roots' | 'french-origin';

/** Semantic theme for topic-based word grouping (27 themes) */
export type SemanticTheme =
    | 'actions' | 'people' | 'mind' | 'home' | 'character'
    | 'feelings' | 'sensory' | 'academic' | 'animals' | 'food'
    | 'body' | 'language' | 'art' | 'communication' | 'plants'
    | 'time' | 'health' | 'earth' | 'society' | 'quantity'
    | 'money' | 'clothing' | 'nature' | 'travel' | 'everyday'
    | 'weather' | 'water';

/**
 * A single curated spelling word with rich metadata.
 * This is the data-at-rest format stored statically in tier files.
 */
export interface SpellingWord {
    /** Correctly spelled word (canonical form, lowercase) */
    word: string;
    /** Brief, child-friendly definition */
    definition: string;
    /** Example sentence using the word in context */
    exampleSentence: string;
    /** Part of speech */
    partOfSpeech: PartOfSpeech;
    /** Difficulty 1 (K CVC) → 10 (national bee) */
    difficulty: DifficultyTier;
    /** Primary phonics pattern this word demonstrates */
    pattern: PhonicsPattern;
    /** Simplified phonetic pronunciation guide, e.g. "kat", "byoo-tuh-ful" */
    pronunciation: string;
    /** Optional etymology for competitive learners */
    etymology?: string;
    /** Pre-computed plausible misspellings (baked at build time) */
    distractors?: string[];
    /** Semantic theme for topic-based filtering */
    theme?: SemanticTheme;
    /** Optional secondary patterns */
    secondaryPatterns?: PhonicsPattern[];
    /** Source provenance tag for competition word packs */
    source?: 'core' | 'scripps' | 'state-bee';
    /** Competition word lists this word belongs to (e.g. 'school-bee-study', 'spell-it-g') */
    lists?: string[];
}

/**
 * Competition word list metadata.
 * Each list is a curated collection (e.g. Scripps School Bee Study List).
 * Words reference lists by ID; lists are registered here with display info.
 */
export interface CompetitionList {
    id: string;
    name: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'championship';
}
