/**
 * types/customList.ts
 *
 * Types for user-created custom word lists.
 */

export interface CustomWord {
    /** The word itself */
    word: string;
    /** Definition (from word bank if enriched, or user-provided) */
    definition?: string;
    /** Pronunciation guide */
    pronunciation?: string;
    /** Part of speech */
    partOfSpeech?: string;
    /** Whether this word was found in and enriched from the word bank */
    enriched: boolean;
    /** Pre-baked distractors (from word bank) */
    distractors?: string[];
}

export interface CustomWordList {
    /** Unique list identifier */
    id: string;
    /** User-provided name */
    name: string;
    /** Words in the list */
    words: CustomWord[];
    /** ISO timestamp */
    createdAt: string;
    /** ISO timestamp */
    updatedAt: string;
}
