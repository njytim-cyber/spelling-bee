/**
 * utils/etymologyParser.ts
 *
 * Parses etymology strings from the word bank to extract language of origin,
 * root words, and compound information.
 *
 * Format: "Language: rootWord (meaning)" or compound "Lang1: ... + Lang2: ..."
 */

export type LanguageOfOrigin =
    | 'Latin' | 'Greek' | 'French' | 'German'
    | 'Italian' | 'Spanish' | 'English' | 'Other';

/** Normalise variant language labels to canonical LanguageOfOrigin. */
const LANGUAGE_MAP: Record<string, LanguageOfOrigin> = {
    'latin': 'Latin',
    'medieval latin': 'Latin',
    'new latin': 'Latin',
    'late latin': 'Latin',
    'vulgar latin': 'Latin',
    'greek': 'Greek',
    'ancient greek': 'Greek',
    'old greek': 'Greek',
    'french': 'French',
    'old french': 'French',
    'middle french': 'French',
    'anglo-french': 'French',
    'norman french': 'French',
    'german': 'German',
    'old high german': 'German',
    'middle high german': 'German',
    'italian': 'Italian',
    'spanish': 'Spanish',
    'old spanish': 'Spanish',
    'english': 'English',
    'old english': 'English',
    'middle english': 'English',
    'anglo-saxon': 'English',
};

export interface ParsedEtymology {
    /** Primary (first-mentioned) language of origin */
    language: LanguageOfOrigin;
    /** Root words extracted from the etymology */
    roots: string[];
    /** Whether the word is a compound from multiple languages */
    isCompound: boolean;
    /** All languages mentioned in the etymology */
    allLanguages: LanguageOfOrigin[];
}

/**
 * Extract the language prefix from an etymology string.
 * Fast-path for filtering — just reads the text before the first colon.
 */
export function extractLanguage(etymology?: string): LanguageOfOrigin {
    if (!etymology) return 'Other';
    const colonIdx = etymology.indexOf(':');
    if (colonIdx < 0) return 'Other';
    const prefix = etymology.slice(0, colonIdx).trim().toLowerCase();
    return LANGUAGE_MAP[prefix] ?? 'Other';
}

/**
 * Full parse of an etymology string.
 * Handles single-language and compound (Lang1 + Lang2) formats.
 */
export function parseEtymology(text: string): ParsedEtymology {
    if (!text) {
        return { language: 'Other', roots: [], isCompound: false, allLanguages: [] };
    }

    // Split on " + " for compound etymologies
    const parts = text.split(/\s*\+\s*/);
    const allLanguages: LanguageOfOrigin[] = [];
    const roots: string[] = [];

    for (const part of parts) {
        const colonIdx = part.indexOf(':');
        if (colonIdx < 0) continue;

        const langStr = part.slice(0, colonIdx).trim().toLowerCase();
        const lang = LANGUAGE_MAP[langStr] ?? 'Other';
        allLanguages.push(lang);

        // Extract root word: text between colon and opening paren
        const afterColon = part.slice(colonIdx + 1).trim();
        const parenIdx = afterColon.indexOf('(');
        const rootWord = parenIdx >= 0
            ? afterColon.slice(0, parenIdx).trim()
            : afterColon.split(',')[0].trim();
        if (rootWord) roots.push(rootWord);
    }

    return {
        language: allLanguages[0] ?? 'Other',
        roots,
        isCompound: allLanguages.length > 1,
        allLanguages: [...new Set(allLanguages)],
    };
}
