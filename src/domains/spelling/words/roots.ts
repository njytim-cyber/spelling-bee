/**
 * words/roots.ts
 *
 * Curated word roots (prefixes, suffixes, root words) with pre-verified
 * example words from the word bank. Per PRINCIPLE 1, every example
 * has been verified to exist in the tier files.
 */

export interface WordRoot {
    /** The root morpheme (e.g., "spect") */
    root: string;
    /** Brief meaning (e.g., "to look") */
    meaning: string;
    /** Language of origin */
    origin: 'Latin' | 'Greek' | 'French';
    /** Morpheme type */
    type: 'prefix' | 'suffix' | 'root';
    /** Pre-verified example words from the word bank */
    examples: string[];
}

// ── Latin Roots ──────────────────────────────────────────────────────────────

const LATIN_ROOTS: WordRoot[] = [
    { root: 'spect', meaning: 'to look', origin: 'Latin', type: 'root', examples: ['spectacle', 'spectacular', 'inspector', 'perspective', 'retrospective', 'respectful', 'disrespect'] },
    { root: 'scrib/script', meaning: 'to write', origin: 'Latin', type: 'root', examples: ['describe', 'subscription', 'manuscript', 'inscription', 'circumscribe', 'transcribe'] },
    { root: 'port', meaning: 'to carry', origin: 'Latin', type: 'root', examples: ['transport', 'export', 'portable', 'opportunity', 'rapport', 'portmanteau'] },
    { root: 'dict', meaning: 'to say', origin: 'Latin', type: 'root', examples: ['dictionary', 'dictator', 'contradict', 'prediction', 'verdict', 'indict'] },
    { root: 'duct', meaning: 'to lead', origin: 'Latin', type: 'root', examples: ['conductor', 'aqueduct', 'misconduct', 'reintroduce'] },
    { root: 'form', meaning: 'shape', origin: 'Latin', type: 'root', examples: ['formidable', 'information', 'transformation', 'misinform'] },
    { root: 'struct', meaning: 'to build', origin: 'Latin', type: 'root', examples: ['construct', 'infrastructure'] },
    { root: 'rupt', meaning: 'to break', origin: 'Latin', type: 'root', examples: ['interrupt', 'rupture'] },
    { root: 'vis', meaning: 'to see', origin: 'Latin', type: 'root', examples: ['visible', 'individual'] },
    { root: 'vert/vers', meaning: 'to turn', origin: 'Latin', type: 'root', examples: ['traversal', 'verse', 'vertiginous', 'tergiversation'] },
    { root: 'fect/fact', meaning: 'to make', origin: 'Latin', type: 'root', examples: ['perfect', 'imperfect', 'manufacture', 'manufacturer'] },
    { root: 'mit/miss', meaning: 'to send', origin: 'Latin', type: 'root', examples: ['transmit', 'manumission', 'pretermit'] },
    { root: 'pend', meaning: 'to hang/weigh', origin: 'Latin', type: 'root', examples: ['spend', 'independent', 'suspenseful'] },
    { root: 'tract', meaning: 'to pull', origin: 'Latin', type: 'root', examples: ['attract'] },
    { root: 'cred', meaning: 'to believe', origin: 'Latin', type: 'root', examples: ['credentials', 'incredulous'] },
    { root: 'voc', meaning: 'voice/call', origin: 'Latin', type: 'root', examples: ['vocabulary', 'vociferous', 'advocate', 'convocation', 'equivocate', 'revocable', 'unequivocally'] },
];

// ── Greek Roots ──────────────────────────────────────────────────────────────

const GREEK_ROOTS: WordRoot[] = [
    { root: 'bio', meaning: 'life', origin: 'Greek', type: 'root', examples: ['biography', 'amphibious', 'symbiosis'] },
    { root: 'graph', meaning: 'to write', origin: 'Greek', type: 'root', examples: ['geography', 'biography', 'photography', 'autograph', 'photograph', 'bibliography', 'calligraphy', 'topography', 'hagiography', 'demographic'] },
    { root: 'phon', meaning: 'sound', origin: 'Greek', type: 'root', examples: ['telephone', 'symphony', 'cacophony', 'polyphony', 'xylophone', 'vibraphone', 'colophon'] },
    { root: 'log/logy', meaning: 'word/study of', origin: 'Greek', type: 'root', examples: ['analogy', 'mythology', 'technology', 'etymology', 'psychology', 'neurology', 'pathology', 'genealogy', 'tautology', 'zoology', 'archaeology'] },
    { root: 'scope', meaning: 'to see', origin: 'Greek', type: 'root', examples: ['microscope', 'stethoscope', 'kaleidoscope'] },
    { root: 'auto', meaning: 'self', origin: 'Greek', type: 'root', examples: ['autograph', 'autonomous', 'autobahn', 'autochthonous'] },
    { root: 'psych', meaning: 'mind/soul', origin: 'Greek', type: 'root', examples: ['psychology', 'psychiatry', 'psychedelic'] },
    { root: 'chron', meaning: 'time', origin: 'Greek', type: 'root', examples: ['chronological', 'anachronism'] },
    { root: 'geo', meaning: 'earth', origin: 'Greek', type: 'root', examples: ['geography', 'geocentric', 'geocaching'] },
    { root: 'photo', meaning: 'light', origin: 'Greek', type: 'root', examples: ['photograph', 'photography', 'photosynthesis'] },
    { root: 'micro', meaning: 'small', origin: 'Greek', type: 'root', examples: ['microscope'] },
    { root: 'therm', meaning: 'heat', origin: 'Greek', type: 'root', examples: ['thermometer', 'hypothermia'] },
    { root: 'morph', meaning: 'shape/form', origin: 'Greek', type: 'root', examples: ['metamorphosis', 'anthropomorphism', 'anamorphosis'] },
    { root: 'path', meaning: 'feeling/suffering', origin: 'Greek', type: 'root', examples: ['empathy', 'apathy', 'pathology', 'parasympathetic'] },
];

// ── Prefixes ─────────────────────────────────────────────────────────────────

const PREFIXES: WordRoot[] = [
    { root: 'pre-', meaning: 'before', origin: 'Latin', type: 'prefix', examples: ['prediction', 'precaution', 'precursor', 'predecessor', 'preliminary', 'prerequisite', 'precipitation'] },
    { root: 'dis-', meaning: 'apart/not', origin: 'Latin', type: 'prefix', examples: ['disagree', 'disappear', 'disappoint', 'disqualify', 'disseminate', 'discombobulate', 'disrespect', 'disingenuous'] },
    { root: 'trans-', meaning: 'across', origin: 'Latin', type: 'prefix', examples: ['transport', 'transformation', 'transmit', 'transparent', 'transatlantic', 'translucent', 'transplant'] },
    { root: 'sub-', meaning: 'under', origin: 'Latin', type: 'prefix', examples: ['subordinate', 'subpoena', 'subscription', 'subterfuge', 'subterranean', 'subtle'] },
    { root: 'super-', meaning: 'above', origin: 'Latin', type: 'prefix', examples: ['superhero', 'superhuman', 'supernatural', 'supersede', 'supermarket', 'supercilious'] },
    { root: 'inter-', meaning: 'between', origin: 'Latin', type: 'prefix', examples: ['interaction', 'international', 'interpretation', 'interrupt', 'intersection', 'intervene', 'intercede'] },
    { root: 'un-', meaning: 'not', origin: 'Latin', type: 'prefix', examples: ['unable', 'unaware', 'unbelievable', 'unbreakable', 'uncertain', 'uncomfortable', 'undeniable'] },
    { root: 'mis-', meaning: 'wrong/bad', origin: 'Latin', type: 'prefix', examples: ['misbehave', 'misconduct', 'misfortune', 'misinform', 'misinterpret', 'misspell', 'mischief', 'miscellaneous'] },
    { root: 'anti-', meaning: 'against', origin: 'Greek', type: 'prefix', examples: ['antique', 'antithesis', 'antipyretic', 'antinomy'] },
];

// ── Suffixes ─────────────────────────────────────────────────────────────────

const SUFFIXES: WordRoot[] = [
    { root: '-tion/-sion', meaning: 'act/state of', origin: 'Latin', type: 'suffix', examples: ['abbreviation', 'civilization', 'competition', 'information', 'transformation', 'precipitation', 'interpretation'] },
    { root: '-ment', meaning: 'result/state', origin: 'Latin', type: 'suffix', examples: ['accomplishment', 'achievement', 'advertisement', 'agreement', 'amazement', 'announcement', 'arrangement'] },
    { root: '-ous', meaning: 'full of', origin: 'Latin', type: 'suffix', examples: ['ambiguous', 'amphibious', 'anonymous', 'audacious', 'auspicious', 'autonomous', 'vociferous'] },
    { root: '-able/-ible', meaning: 'capable of', origin: 'Latin', type: 'suffix', examples: ['comfortable', 'adaptable', 'formidable', 'transferable', 'discernible', 'immutable', 'equitable'] },
    { root: '-ful', meaning: 'full of', origin: 'Latin', type: 'suffix', examples: ['beautiful', 'careful', 'cheerful', 'colorful', 'delightful', 'graceful', 'respectful', 'suspenseful'] },
    { root: '-ness', meaning: 'state/quality', origin: 'Latin', type: 'suffix', examples: ['awareness', 'brightness', 'cleverness', 'darkness', 'eagerness', 'forgiveness', 'emptiness'] },
    { root: '-ity', meaning: 'quality of', origin: 'Latin', type: 'suffix', examples: ['community', 'continuity', 'electricity', 'eccentricity', 'equanimity', 'accountability'] },
];

/** All curated word roots. */
export const WORD_ROOTS: readonly WordRoot[] = [
    ...LATIN_ROOTS,
    ...GREEK_ROOTS,
    ...PREFIXES,
    ...SUFFIXES,
];
