/**
 * words/competitionLists.ts
 *
 * Competition word list definitions and per-word tagging.
 * Words can belong to multiple lists (e.g. a Scripps word can also be in
 * the school-bee-study list). Deduplication is automatic — the lists field
 * is an array of list IDs, and getWordsByList() returns unique SpellingWord[].
 */
import type { CompetitionList } from './types';

// ── List definitions ─────────────────────────────────────────────────────────

export const COMPETITION_LISTS: CompetitionList[] = [
    {
        id: 'school-bee-study',
        name: 'School Bee Study List',
        description: '450 words for classroom and school-level spelling bees',
        difficulty: 'intermediate',
    },
    {
        id: 'school-bee-championship',
        name: 'School Bee Championship',
        description: 'Advanced words for school-level championship rounds',
        difficulty: 'advanced',
    },
    {
        id: 'county-bee',
        name: 'County/Regional Bee',
        description: 'Words for county and regional spelling bee competitions',
        difficulty: 'advanced',
    },
    {
        id: 'state-bee',
        name: 'State Bee',
        description: 'Words for state-level spelling bee competitions',
        difficulty: 'championship',
    },
    {
        id: 'spell-it-a-c',
        name: 'Spell It! A-C',
        description: 'Words from Spell It! guide, sections A through C',
        difficulty: 'intermediate',
    },
    {
        id: 'spell-it-d-f',
        name: 'Spell It! D-F',
        description: 'Words from Spell It! guide, sections D through F',
        difficulty: 'advanced',
    },
    {
        id: 'spell-it-g-i',
        name: 'Spell It! G-I',
        description: 'Words from Spell It! guide, sections G through I',
        difficulty: 'championship',
    },
    {
        id: 'one-bee',
        name: 'One Bee (WOTC)',
        description: 'Words of the Champions — easiest tier (grades 1-3)',
        difficulty: 'beginner',
    },
    {
        id: 'two-bee',
        name: 'Two Bee (WOTC)',
        description: 'Words of the Champions — middle tier (grades 4-6)',
        difficulty: 'intermediate',
    },
    {
        id: 'three-bee',
        name: 'Three Bee (WOTC)',
        description: 'Words of the Champions — hardest tier (grades 7+)',
        difficulty: 'advanced',
    },
    {
        id: 'scripps-historical',
        name: 'Scripps Historical Winners',
        description: 'Winning and notable words from past Scripps National Spelling Bees',
        difficulty: 'championship',
    },
];

// ── Word → list tagging ──────────────────────────────────────────────────────

/**
 * Maps word strings to the competition list IDs they belong to.
 * Applied at registry load time via applyCompetitionTags().
 * A word can appear in multiple lists.
 */
export const WORD_LIST_TAGS: Record<string, string[]> = {
    // ── One Bee (WOTC) — grades 1-3, difficulty 1-2 ──
    'cat': ['one-bee'],
    'dog': ['one-bee'],
    'bed': ['one-bee'],
    'hat': ['one-bee'],
    'run': ['one-bee'],
    'sun': ['one-bee'],
    'map': ['one-bee'],
    'pen': ['one-bee'],
    'cup': ['one-bee'],
    'hop': ['one-bee'],
    'stop': ['one-bee'],
    'trip': ['one-bee'],
    'plan': ['one-bee'],
    'drum': ['one-bee'],
    'clap': ['one-bee'],
    'swim': ['one-bee'],
    'ship': ['one-bee'],
    'thin': ['one-bee'],
    'chat': ['one-bee'],
    'much': ['one-bee'],
    'cake': ['one-bee'],
    'make': ['one-bee'],
    'ride': ['one-bee'],
    'home': ['one-bee'],
    'name': ['one-bee'],
    'rain': ['one-bee'],
    'boat': ['one-bee'],
    'team': ['one-bee'],
    'road': ['one-bee'],
    'play': ['one-bee'],

    // ── Two Bee (WOTC) — grades 4-6, difficulty 3-6 ──
    'circle': ['two-bee', 'school-bee-study'],
    'bridge': ['two-bee', 'school-bee-study'],
    'trouble': ['two-bee', 'school-bee-study'],
    'surprise': ['two-bee', 'school-bee-study'],
    'different': ['two-bee', 'school-bee-study'],
    'imagine': ['two-bee', 'school-bee-study'],
    'favorite': ['two-bee', 'school-bee-study'],
    'important': ['two-bee', 'school-bee-study'],
    'celebrate': ['two-bee', 'school-bee-study'],
    'beautiful': ['two-bee', 'school-bee-study'],
    'adventure': ['two-bee', 'school-bee-study'],
    'knowledge': ['two-bee', 'school-bee-study'],
    'discover': ['two-bee', 'school-bee-study'],
    'experience': ['two-bee', 'school-bee-study'],
    'education': ['two-bee', 'school-bee-study'],
    'example': ['two-bee', 'school-bee-study'],
    'accident': ['two-bee', 'school-bee-study'],
    'calendar': ['two-bee', 'school-bee-study'],
    'opinion': ['two-bee', 'school-bee-study'],
    'available': ['two-bee', 'school-bee-study'],
    'decision': ['two-bee', 'school-bee-study'],
    'excellent': ['two-bee', 'school-bee-study'],
    'ordinary': ['two-bee', 'school-bee-study'],
    'remember': ['two-bee', 'school-bee-study'],
    'whisper': ['two-bee'],
    'creature': ['two-bee'],
    'frighten': ['two-bee'],
    'capture': ['two-bee'],
    'prepare': ['two-bee'],
    'inspire': ['two-bee'],

    // ── Three Bee (WOTC) — grades 7+, difficulty 7-10 ──
    'bureaucracy': ['three-bee', 'school-bee-championship', 'county-bee'],
    'acquaintance': ['three-bee', 'school-bee-championship', 'county-bee'],
    'conscientious': ['three-bee', 'county-bee'],
    'exaggerate': ['three-bee', 'school-bee-championship'],
    'mischievous': ['three-bee', 'school-bee-championship'],
    'phenomenon': ['three-bee', 'county-bee'],
    'surveillance': ['three-bee', 'county-bee', 'state-bee'],
    'entrepreneur': ['three-bee', 'county-bee', 'state-bee'],
    'sovereignty': ['three-bee', 'state-bee'],
    'hemorrhage': ['three-bee', 'state-bee'],
    'lieutenant': ['three-bee', 'county-bee'],
    'pneumonia': ['three-bee', 'county-bee'],
    'silhouette': ['three-bee', 'county-bee', 'state-bee'],
    'reconnaissance': ['three-bee', 'state-bee'],
    'bourgeois': ['three-bee', 'state-bee'],
    'connoisseur': ['three-bee', 'state-bee'],
    'rendezvous': ['three-bee', 'county-bee'],
    'ecstasy': ['three-bee', 'school-bee-championship'],
    'onomatopoeia': ['three-bee', 'state-bee', 'scripps-historical'],
    'sacrilege': ['three-bee', 'county-bee'],

    // ── School Bee Study List — intermediate difficulty ──
    'achievement': ['school-bee-study'],
    'acknowledge': ['school-bee-study'],
    'argument': ['school-bee-study'],
    'believe': ['school-bee-study'],
    'committee': ['school-bee-study'],
    'conscience': ['school-bee-study'],
    'definition': ['school-bee-study'],
    'disappear': ['school-bee-study'],
    'environment': ['school-bee-study'],
    'fortunate': ['school-bee-study'],
    'government': ['school-bee-study'],
    'guarantee': ['school-bee-study', 'school-bee-championship'],
    'independent': ['school-bee-study'],
    'judgment': ['school-bee-study'],
    'lightning': ['school-bee-study'],
    'maintenance': ['school-bee-study', 'school-bee-championship'],
    'necessary': ['school-bee-study'],
    'occurrence': ['school-bee-study', 'school-bee-championship'],
    'particular': ['school-bee-study'],
    'privilege': ['school-bee-study', 'school-bee-championship'],
    'recommend': ['school-bee-study'],
    'separate': ['school-bee-study'],
    'temperature': ['school-bee-study'],
    'vacuum': ['school-bee-study'],
    'weird': ['school-bee-study'],

    // ── School Bee Championship ──
    'accommodate': ['school-bee-championship', 'county-bee'],
    'bibliography': ['school-bee-championship'],
    'chrysanthemum': ['school-bee-championship', 'county-bee'],
    'dilapidated': ['school-bee-championship'],
    'eloquent': ['school-bee-championship'],
    'fluorescent': ['school-bee-championship', 'county-bee'],
    'gymnasium': ['school-bee-championship'],
    'hypocrite': ['school-bee-championship', 'county-bee'],
    'incandescent': ['school-bee-championship', 'county-bee'],
    'juxtapose': ['school-bee-championship', 'county-bee'],

    // ── County/Regional Bee ──
    'archipelago': ['county-bee', 'state-bee'],
    'cataclysm': ['county-bee', 'state-bee'],
    'demagogue': ['county-bee', 'state-bee'],
    'ephemeral': ['county-bee', 'state-bee'],
    'idiosyncrasy': ['county-bee', 'state-bee'],
    'labyrinth': ['county-bee'],
    'metamorphosis': ['county-bee', 'state-bee'],
    'nomenclature': ['county-bee', 'state-bee'],
    'paradigm': ['county-bee', 'state-bee'],
    'ubiquitous': ['county-bee', 'state-bee'],

    // ── State Bee ──
    'abscission': ['state-bee'],
    'accouterments': ['state-bee'],
    'adjudicate': ['state-bee'],
    'ambidextrous': ['state-bee'],
    'antithesis': ['state-bee'],
    'bacchanalia': ['state-bee', 'scripps-historical'],
    'bellicose': ['state-bee'],
    'cacophony': ['state-bee'],
    'conflagration': ['state-bee'],
    'disingenuous': ['state-bee'],

    // ── Scripps Historical Winners ──
    'knack': ['scripps-historical'],
    'chlorophyll': ['scripps-historical', 'county-bee'],
    'incisor': ['scripps-historical'],
    'vouchsafe': ['scripps-historical'],
    'croissant': ['scripps-historical'],
    'luge': ['scripps-historical'],
    'strophanthus': ['scripps-historical'],
    'appoggiatura': ['scripps-historical'],
    'succedaneum': ['scripps-historical'],
    'laodicean': ['scripps-historical'],
    'guetapens': ['scripps-historical'],
    'cymotrichous': ['scripps-historical'],

    // ── Spell It! A-C ──
    'aberration': ['spell-it-a-c', 'county-bee'],
    'acumen': ['spell-it-a-c'],
    'aesthetic': ['spell-it-a-c', 'school-bee-championship'],
    'ameliorate': ['spell-it-a-c', 'county-bee'],
    'anomaly': ['spell-it-a-c'],
    'benevolent': ['spell-it-a-c', 'school-bee-championship'],
    'cachet': ['spell-it-a-c'],
    'camaraderie': ['spell-it-a-c', 'county-bee'],
    'catharsis': ['spell-it-a-c'],
    'clandestine': ['spell-it-a-c', 'county-bee'],

    // ── Spell It! D-F ──
    'debacle': ['spell-it-d-f'],
    'deferential': ['spell-it-d-f'],
    'egregious': ['spell-it-d-f', 'county-bee'],
    'enigma': ['spell-it-d-f'],
    'equivocate': ['spell-it-d-f', 'state-bee'],
    'facetious': ['spell-it-d-f', 'county-bee'],
    'fortuitous': ['spell-it-d-f'],

    // ── Spell It! G-I ──
    'garrulous': ['spell-it-g-i', 'state-bee'],
    'hegemony': ['spell-it-g-i', 'state-bee'],
    'iconoclast': ['spell-it-g-i'],
    'ignominy': ['spell-it-g-i', 'state-bee'],
    'impervious': ['spell-it-g-i'],
    'indefatigable': ['spell-it-g-i', 'state-bee'],
};

/**
 * Apply competition list tags to loaded words.
 * Called by the registry after tier loading. Mutates words in-place.
 */
export function applyCompetitionTags(words: import('./types').SpellingWord[]): void {
    for (const word of words) {
        const tags = WORD_LIST_TAGS[word.word];
        if (tags) {
            word.lists = tags;
        }
    }
}
