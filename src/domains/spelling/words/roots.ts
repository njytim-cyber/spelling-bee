/**
 * words/roots.ts
 *
 * Curated word roots (prefixes, suffixes, root words) with pre-verified
 * example words from the word bank. Per PRINCIPLE 1, every example
 * has been verified to exist in the tier files.
 *
 * ~150 roots covering Latin, Greek, French, German, Italian — comprehensive
 * enough for national (Scripps) spelling bee preparation.
 */

export interface WordRoot {
    /** The root morpheme (e.g., "spect") */
    root: string;
    /** Brief meaning (e.g., "to look") */
    meaning: string;
    /** Language of origin */
    origin: 'Latin' | 'Greek' | 'French' | 'German' | 'Italian';
    /** Morpheme type */
    type: 'prefix' | 'suffix' | 'root';
    /** Pre-verified example words from the word bank */
    examples: string[];
}

// ── Latin Roots ──────────────────────────────────────────────────────────────

const LATIN_ROOTS: WordRoot[] = [
    // ── Existing roots (enriched examples) ──
    { root: 'spect', meaning: 'to look', origin: 'Latin', type: 'root', examples: ['spectacle', 'spectacular', 'inspector', 'perspective', 'retrospective', 'respectful', 'disrespect', 'specious', 'specimen', 'prospicience'] },
    { root: 'scrib/script', meaning: 'to write', origin: 'Latin', type: 'root', examples: ['describe', 'subscription', 'manuscript', 'inscription', 'circumscribe', 'proscribe'] },
    { root: 'port', meaning: 'to carry', origin: 'Latin', type: 'root', examples: ['transport', 'export', 'portable', 'opportunity', 'rapport', 'portmanteau'] },
    { root: 'dict', meaning: 'to say', origin: 'Latin', type: 'root', examples: ['dictionary', 'dictator', 'contradict', 'prediction', 'verdict', 'indict'] },
    { root: 'duct/duc', meaning: 'to lead', origin: 'Latin', type: 'root', examples: ['conductor', 'aqueduct', 'misconduct', 'reintroduce'] },
    { root: 'form', meaning: 'shape', origin: 'Latin', type: 'root', examples: ['formidable', 'information', 'transformation', 'misinform'] },
    { root: 'struct', meaning: 'to build', origin: 'Latin', type: 'root', examples: ['construct', 'infrastructure'] },
    { root: 'rupt', meaning: 'to break', origin: 'Latin', type: 'root', examples: ['interrupt', 'rupture'] },
    { root: 'vert/vers', meaning: 'to turn', origin: 'Latin', type: 'root', examples: ['traversal', 'verse', 'vertiginous', 'tergiversation', 'tergiversate', 'diversion'] },
    { root: 'fac/fect', meaning: 'to make/do', origin: 'Latin', type: 'root', examples: ['perfect', 'imperfect', 'manufacture', 'manufacturer', 'beneficence', 'beneficial', 'efficacious', 'facetious', 'magnificent', 'munificent'] },
    { root: 'mit/miss', meaning: 'to send', origin: 'Latin', type: 'root', examples: ['transmit', 'manumission', 'pretermit', 'disseminate', 'promulgate'] },
    { root: 'pend/pens', meaning: 'to hang/weigh', origin: 'Latin', type: 'root', examples: ['spend', 'independent', 'suspenseful'] },
    { root: 'tract', meaning: 'to pull/draw', origin: 'Latin', type: 'root', examples: ['attract'] },
    { root: 'cred', meaning: 'to believe', origin: 'Latin', type: 'root', examples: ['credentials', 'incredulous'] },
    { root: 'voc/vok', meaning: 'voice/call', origin: 'Latin', type: 'root', examples: ['vocabulary', 'vociferous', 'advocate', 'convocation', 'equivocate', 'revocable', 'unequivocally'] },
    { root: 'vis/vid', meaning: 'to see', origin: 'Latin', type: 'root', examples: ['visible', 'invisible', 'individual'] },

    // ── New Latin roots ──
    { root: 'aud', meaning: 'to hear', origin: 'Latin', type: 'root', examples: ['audacious', 'auditorium'] },
    { root: 'bell', meaning: 'war', origin: 'Latin', type: 'root', examples: ['bellicose', 'belligerent'] },
    { root: 'ben/bon', meaning: 'good/well', origin: 'Latin', type: 'root', examples: ['beneficence', 'beneficial', 'benevolent'] },
    { root: 'capt/cip', meaning: 'to seize/take', origin: 'Latin', type: 'root', examples: ['capacious', 'capitulate', 'capitulation', 'captivate', 'emancipate', 'participate', 'recapitulate'] },
    { root: 'ced/cess', meaning: 'to go/yield', origin: 'Latin', type: 'root', examples: ['antecedent', 'incessant', 'intercede', 'necessary', 'predecessor', 'succedaneum'] },
    { root: 'cogn', meaning: 'to know', origin: 'Latin', type: 'root', examples: ['cognizant', 'cognoscente'] },
    { root: 'corp', meaning: 'body', origin: 'Latin', type: 'root', examples: ['corporal', 'corps'] },
    { root: 'culp', meaning: 'fault/blame', origin: 'Latin', type: 'root', examples: ['exculpate'] },
    { root: 'cur', meaning: 'to care', origin: 'Latin', type: 'root', examples: ['pococurante', 'mercurial'] },
    { root: 'dur', meaning: 'to harden/last', origin: 'Latin', type: 'root', examples: ['obdurate'] },
    { root: 'equ', meaning: 'equal/even', origin: 'Latin', type: 'root', examples: ['equanimity', 'equilibrium', 'equitable', 'equivalent', 'equivocate', 'prerequisite', 'requisite'] },
    { root: 'fer', meaning: 'to carry/bear', origin: 'Latin', type: 'root', examples: ['transferable', 'vociferous'] },
    { root: 'fid', meaning: 'to trust', origin: 'Latin', type: 'root', examples: ['diffident', 'fiduciary'] },
    { root: 'flu/flux', meaning: 'to flow', origin: 'Latin', type: 'root', examples: ['fluctuate', 'fluorescent', 'mellifluous'] },
    { root: 'gen', meaning: 'birth/race/kind', origin: 'Latin', type: 'root', examples: ['disingenuous', 'genealogy', 'generation', 'genuflect', 'heterogeneous', 'homogeneous', 'iatrogenic'] },
    { root: 'grad/gress', meaning: 'to step/go', origin: 'Latin', type: 'root', examples: ['aggrandizement'] },
    { root: 'grat', meaning: 'pleasing/thankful', origin: 'Latin', type: 'root', examples: ['gratitude', 'gratuitous', 'ingratiate'] },
    { root: 'greg', meaning: 'flock/herd', origin: 'Latin', type: 'root', examples: ['egregious', 'gregarious'] },
    { root: 'ject', meaning: 'to throw', origin: 'Latin', type: 'root', examples: ['projection'] },
    { root: 'jud/jur/jus', meaning: 'law/right', origin: 'Latin', type: 'root', examples: ['adjudicate', 'jurisprudence'] },
    { root: 'loc/loqu', meaning: 'to speak', origin: 'Latin', type: 'root', examples: ['circumlocution', 'elocution', 'eloquence', 'grandiloquent', 'loquacious', 'magniloquent', 'soliloquize', 'soliloquy', 'ventriloquist'] },
    { root: 'luc/lum', meaning: 'light', origin: 'Latin', type: 'root', examples: ['elucidate', 'illuminate', 'lucrative', 'luminous', 'pellucid', 'translucent'] },
    { root: 'magn', meaning: 'great', origin: 'Latin', type: 'root', examples: ['magnanimity', 'magnanimous', 'magnificent', 'magnifique', 'magnify', 'magniloquent', 'magnolia'] },
    { root: 'mal', meaning: 'bad/evil', origin: 'Latin', type: 'root', examples: ['malaise', 'malapropism', 'malevolent', 'malfeasance', 'malfeasant', 'malodorous'] },
    { root: 'man/manu', meaning: 'hand', origin: 'Latin', type: 'root', examples: ['emancipate', 'manufacture', 'manufacturer', 'manumission', 'manuscript'] },
    { root: 'medi', meaning: 'middle', origin: 'Latin', type: 'root', examples: ['mediocre'] },
    { root: 'memor', meaning: 'mindful', origin: 'Latin', type: 'root', examples: ['commemorate', 'memento', 'reminiscence'] },
    { root: 'misc', meaning: 'to mix', origin: 'Latin', type: 'root', examples: ['miscellaneous', 'promiscuous'] },
    { root: 'mort', meaning: 'death', origin: 'Latin', type: 'root', examples: ['mortar', 'mortgage'] },
    { root: 'mut', meaning: 'to change', origin: 'Latin', type: 'root', examples: ['communicate', 'community', 'immutable', 'transmogrify'] },
    { root: 'nasc/nat', meaning: 'to be born', origin: 'Latin', type: 'root', examples: ['nascent', 'renaissance', 'renascence'] },
    { root: 'nihil', meaning: 'nothing', origin: 'Latin', type: 'root', examples: ['floccinaucinihilipilification', 'nihilism'] },
    { root: 'nom/nomen', meaning: 'name', origin: 'Latin', type: 'root', examples: ['ignominious', 'ignominiously', 'ignominy', 'nomenclature'] },
    { root: 'omni', meaning: 'all', origin: 'Latin', type: 'root', examples: ['omnivore'] },
    { root: 'pac', meaning: 'peace', origin: 'Latin', type: 'root', examples: ['implacable'] },
    { root: 'patr', meaning: 'father/fatherland', origin: 'Latin', type: 'root', examples: ['expatriate'] },
    { root: 'ped', meaning: 'foot', origin: 'Latin', type: 'root', examples: ['expedite', 'sesquipedalian'] },
    { root: 'plic', meaning: 'to fold', origin: 'Latin', type: 'root', examples: ['multiplication', 'supplicate'] },
    { root: 'prob', meaning: 'to prove/test', origin: 'Latin', type: 'root', examples: ['approbation', 'probity', 'reprobate'] },
    { root: 'pugn', meaning: 'to fight', origin: 'Latin', type: 'root', examples: ['impugn', 'oppugn'] },
    { root: 'punct', meaning: 'to prick/point', origin: 'Latin', type: 'root', examples: ['punctilious', 'punctual'] },
    { root: 'sacr/sanct', meaning: 'sacred', origin: 'Latin', type: 'root', examples: ['sacerdotal', 'sacrilege', 'sacrilegious', 'sacrosanct'] },
    { root: 'sci', meaning: 'to know', origin: 'Latin', type: 'root', examples: ['conscience', 'conscientious', 'pseudoscience', 'unconscionable'] },
    { root: 'sequ/secut', meaning: 'to follow', origin: 'Latin', type: 'root', examples: ['consecutive', 'obsequious'] },
    { root: 'serv', meaning: 'to serve/keep', origin: 'Latin', type: 'root', examples: ['servitude'] },
    { root: 'simul', meaning: 'together/likeness', origin: 'Latin', type: 'root', examples: ['simulacrum', 'simultaneous', 'simultaneously'] },
    { root: 'sol', meaning: 'alone', origin: 'Latin', type: 'root', examples: ['desolate', 'soliloquize', 'soliloquy', 'solipsism', 'solitary'] },
    { root: 'somn', meaning: 'sleep', origin: 'Latin', type: 'root', examples: ['somnambulism', 'somnolent'] },
    { root: 'tang', meaning: 'to touch', origin: 'Latin', type: 'root', examples: ['tangible'] },
    { root: 'temp', meaning: 'time', origin: 'Latin', type: 'root', examples: ['extemporaneous', 'temperamental', 'temperature'] },
    { root: 'ten', meaning: 'to hold', origin: 'Latin', type: 'root', examples: ['continuity', 'pertinacious', 'tenacious'] },
    { root: 'terr', meaning: 'earth/land', origin: 'Latin', type: 'root', examples: ['extraterrestrial', 'souterrain', 'subterranean', 'terraqueous', 'terrestrial', 'territory'] },
    { root: 'tort', meaning: 'to twist', origin: 'Latin', type: 'root', examples: ['torsade'] },
    { root: 'umbr', meaning: 'shadow', origin: 'Latin', type: 'root', examples: ['penumbra', 'umbrage'] },
    { root: 'vac', meaning: 'empty', origin: 'Latin', type: 'root', examples: ['vacillate', 'vacuum'] },
    { root: 'val', meaning: 'to be strong/worthy', origin: 'Latin', type: 'root', examples: ['convalescence', 'equivalent', 'prevalent', 'valet'] },
    { root: 'ver', meaning: 'truth', origin: 'Latin', type: 'root', examples: ['veracious', 'veridical', 'verisimilar', 'verisimilitude'] },
    { root: 'verb', meaning: 'word', origin: 'Latin', type: 'root', examples: ['verbiage'] },
    { root: 'viv/vit', meaning: 'to live', origin: 'Latin', type: 'root', examples: ['vivacious', 'vivisepulture'] },
    { root: 'vol', meaning: 'to wish/will', origin: 'Latin', type: 'root', examples: ['benevolent', 'malevolent', 'voluminous'] },
    { root: 'rog', meaning: 'to ask', origin: 'Latin', type: 'root', examples: ['supererogatory'] },
    { root: 'sed/sid', meaning: 'to sit/settle', origin: 'Latin', type: 'root', examples: ['assiduous', 'assiduously'] },
    { root: 'anim', meaning: 'spirit/mind', origin: 'Latin', type: 'root', examples: ['equanimity', 'magnanimity', 'magnanimous', 'pusillanimous'] },
    { root: 'ferv', meaning: 'to boil/glow', origin: 'Latin', type: 'root', examples: ['effervescent'] },
    { root: 'fug', meaning: 'to flee', origin: 'Latin', type: 'root', examples: ['fugacious', 'subterfuge'] },
    { root: 'ambi', meaning: 'both/around', origin: 'Latin', type: 'root', examples: ['ambidextrous', 'ambiguous'] },
    { root: 'brev', meaning: 'short', origin: 'Latin', type: 'root', examples: ['abbreviation'] },
    { root: 'celer', meaning: 'swift', origin: 'Latin', type: 'root', examples: ['celerity'] },
    { root: 'confab', meaning: 'to talk together', origin: 'Latin', type: 'root', examples: ['confabulate'] },
    { root: 'deprec', meaning: 'to pray against', origin: 'Latin', type: 'root', examples: ['deprecate'] },
    { root: 'ven/vent', meaning: 'to come', origin: 'Latin', type: 'root', examples: ['adventure', 'convalescence', 'intervene', 'peradventure'] },
    { root: 'vinc/vict', meaning: 'to conquer', origin: 'Latin', type: 'root', examples: ['invincible'] },
    { root: 'vor', meaning: 'to devour', origin: 'Latin', type: 'root', examples: ['devour', 'omnivore'] },
    { root: 'rap', meaning: 'to seize', origin: 'Latin', type: 'root', examples: ['rapacious', 'rapprochement'] },
    { root: 'pars', meaning: 'to spare/save', origin: 'Latin', type: 'root', examples: ['parsimonious'] },
    { root: 'plac', meaning: 'to please/calm', origin: 'Latin', type: 'root', examples: ['implacable'] },
    { root: 'plen', meaning: 'full', origin: 'Latin', type: 'root', examples: ['plentiful', 'pleonasm'] },
];

// ── Greek Roots ──────────────────────────────────────────────────────────────

const GREEK_ROOTS: WordRoot[] = [
    // ── Existing roots (enriched examples) ──
    { root: 'bio', meaning: 'life', origin: 'Greek', type: 'root', examples: ['biography', 'amphibious', 'symbiosis'] },
    { root: 'graph', meaning: 'to write/draw', origin: 'Greek', type: 'root', examples: ['geography', 'biography', 'photography', 'autograph', 'photograph', 'bibliography', 'calligraphy', 'topography', 'hagiography', 'demographic'] },
    { root: 'phon', meaning: 'sound', origin: 'Greek', type: 'root', examples: ['telephone', 'symphony', 'cacophony', 'polyphony', 'xylophone', 'vibraphone', 'colophon'] },
    { root: 'log/logy', meaning: 'word/study of', origin: 'Greek', type: 'root', examples: ['analogy', 'mythology', 'technology', 'etymology', 'psychology', 'neurology', 'pathology', 'genealogy', 'tautology', 'zoology', 'archaeology'] },
    { root: 'scope', meaning: 'to see/examine', origin: 'Greek', type: 'root', examples: ['microscope', 'stethoscope', 'kaleidoscope', 'kaleidoscopic'] },
    { root: 'auto', meaning: 'self', origin: 'Greek', type: 'root', examples: ['autograph', 'autonomous', 'autobahn', 'autochthonous', 'autarky'] },
    { root: 'psych', meaning: 'mind/soul', origin: 'Greek', type: 'root', examples: ['psychology', 'psychiatry', 'psychedelic'] },
    { root: 'chron', meaning: 'time', origin: 'Greek', type: 'root', examples: ['chronological', 'anachronism'] },
    { root: 'geo', meaning: 'earth', origin: 'Greek', type: 'root', examples: ['geography', 'geocentric', 'geocaching'] },
    { root: 'photo', meaning: 'light', origin: 'Greek', type: 'root', examples: ['photograph', 'photography', 'photosynthesis'] },
    { root: 'micro', meaning: 'small', origin: 'Greek', type: 'root', examples: ['microscope'] },
    { root: 'therm', meaning: 'heat', origin: 'Greek', type: 'root', examples: ['thermometer', 'hypothermia'] },
    { root: 'morph', meaning: 'shape/form', origin: 'Greek', type: 'root', examples: ['metamorphosis', 'anthropomorphism', 'anamorphosis'] },
    { root: 'path', meaning: 'feeling/suffering', origin: 'Greek', type: 'root', examples: ['empathy', 'apathy', 'pathology', 'parasympathetic'] },

    // ── New Greek roots ──
    { root: 'agon', meaning: 'contest/struggle', origin: 'Greek', type: 'root', examples: ['antagonist', 'deuteragonist', 'protagonist'] },
    { root: 'anthrop', meaning: 'human', origin: 'Greek', type: 'root', examples: ['anthropomorphism', 'misanthrope', 'misanthropy', 'philanthropic', 'philanthropical', 'philanthropist', 'philanthropy'] },
    { root: 'arch', meaning: 'rule/chief', origin: 'Greek', type: 'root', examples: ['archipelago', 'architecture', 'oligarchy'] },
    { root: 'archaeo', meaning: 'ancient', origin: 'Greek', type: 'root', examples: ['archaeology'] },
    { root: 'aster/astro', meaning: 'star', origin: 'Greek', type: 'root', examples: ['astronaut'] },
    { root: 'biblio', meaning: 'book', origin: 'Greek', type: 'root', examples: ['bibliography', 'bibliophile'] },
    { root: 'cata', meaning: 'down/against', origin: 'Greek', type: 'root', examples: ['catachresis', 'cataclysm', 'catastrophe', 'catastrophic'] },
    { root: 'cephal', meaning: 'head', origin: 'Greek', type: 'root', examples: ['encephalitis'] },
    { root: 'chrom', meaning: 'color', origin: 'Greek', type: 'root', examples: ['chromatic'] },
    { root: 'cosm', meaning: 'order/world', origin: 'Greek', type: 'root', examples: ['ecosystem'] },
    { root: 'crat/cracy', meaning: 'power/rule', origin: 'Greek', type: 'root', examples: ['aristocrat', 'bureaucracy', 'democracy', 'theocracy'] },
    { root: 'crypt', meaning: 'hidden', origin: 'Greek', type: 'root', examples: ['cryptic'] },
    { root: 'cycl', meaning: 'circle/wheel', origin: 'Greek', type: 'root', examples: ['encyclopedia', 'recycle'] },
    { root: 'dem/demo', meaning: 'people', origin: 'Greek', type: 'root', examples: ['demagogue', 'demagoguery', 'democracy', 'demographic', 'demographics', 'endemic', 'epidemic'] },
    { root: 'didact', meaning: 'to teach', origin: 'Greek', type: 'root', examples: ['didactic', 'propaedeutic'] },
    { root: 'dox', meaning: 'opinion/belief', origin: 'Greek', type: 'root', examples: ['orthodox', 'paradox'] },
    { root: 'dyn', meaning: 'power/force', origin: 'Greek', type: 'root', examples: ['dynasty'] },
    { root: 'ec/oik', meaning: 'house/dwelling', origin: 'Greek', type: 'root', examples: ['ecosystem', 'ecumenical'] },
    { root: 'erg', meaning: 'work', origin: 'Greek', type: 'root', examples: ['ergodic'] },
    { root: 'esth/aesthet', meaning: 'feeling/perception', origin: 'Greek', type: 'root', examples: ['aesthetic'] },
    { root: 'etym', meaning: 'true sense', origin: 'Greek', type: 'root', examples: ['etymology'] },
    { root: 'eu', meaning: 'good/well', origin: 'Greek', type: 'root', examples: ['euonym', 'euphemism', 'euphoria', 'ecumenical'] },
    { root: 'glyph', meaning: 'carving', origin: 'Greek', type: 'root', examples: ['hieroglyphic'] },
    { root: 'gon', meaning: 'angle', origin: 'Greek', type: 'root', examples: ['polygon'] },
    { root: 'heli', meaning: 'sun', origin: 'Greek', type: 'root', examples: ['heliocentric', 'heliotrope'] },
    { root: 'hem/haem', meaning: 'blood', origin: 'Greek', type: 'root', examples: ['haemophilia', 'hemorrhage', 'hemorrhoid'] },
    { root: 'hetero', meaning: 'different/other', origin: 'Greek', type: 'root', examples: ['heterogeneous'] },
    { root: 'homo', meaning: 'same', origin: 'Greek', type: 'root', examples: ['homogeneous'] },
    { root: 'hydr', meaning: 'water', origin: 'Greek', type: 'root', examples: ['hydrate'] },
    { root: 'icon', meaning: 'image', origin: 'Greek', type: 'root', examples: ['iconoclast', 'lexicon'] },
    { root: 'idio', meaning: 'one\'s own/peculiar', origin: 'Greek', type: 'root', examples: ['idiomatic', 'idiosyncrasy', 'idiosyncratic'] },
    { root: 'iso', meaning: 'equal', origin: 'Greek', type: 'root', examples: ['isosceles', 'isthmus'] },
    { root: 'kine', meaning: 'movement', origin: 'Greek', type: 'root', examples: ['kinetic'] },
    { root: 'mega', meaning: 'great/large', origin: 'Greek', type: 'root', examples: ['megalomania'] },
    { root: 'mim', meaning: 'to imitate', origin: 'Greek', type: 'root', examples: ['mimesis'] },
    { root: 'miso/mis', meaning: 'to hate', origin: 'Greek', type: 'root', examples: ['misanthrope', 'misanthropy', 'misogyny'] },
    { root: 'mnem', meaning: 'memory', origin: 'Greek', type: 'root', examples: ['mnemonic'] },
    { root: 'neur', meaning: 'nerve/sinew', origin: 'Greek', type: 'root', examples: ['neurological', 'neurology'] },
    { root: 'nym/onym', meaning: 'name/word', origin: 'Greek', type: 'root', examples: ['anonymous', 'euonym', 'metonymical', 'pseudonym', 'synonym', 'toponym'] },
    { root: 'olig', meaning: 'few', origin: 'Greek', type: 'root', examples: ['oligarchy'] },
    { root: 'ortho', meaning: 'straight/correct', origin: 'Greek', type: 'root', examples: ['orthodox'] },
    { root: 'pan', meaning: 'all', origin: 'Greek', type: 'root', examples: ['panache', 'panegyric', 'panorama'] },
    { root: 'para', meaning: 'beside/beyond', origin: 'Greek', type: 'root', examples: ['paradigm', 'paradox', 'parallelogram', 'paraphernalia', 'parasympathetic'] },
    { root: 'ped (Greek)', meaning: 'child/education', origin: 'Greek', type: 'root', examples: ['encyclopedia', 'pedagogue', 'pedagogy'] },
    { root: 'phag', meaning: 'to eat', origin: 'Greek', type: 'root', examples: ['onychophagy', 'sarcophagus'] },
    { root: 'phantas', meaning: 'to appear/illusion', origin: 'Greek', type: 'root', examples: ['phantasmagoria', 'sycophant', 'sycophantic'] },
    { root: 'phil', meaning: 'to love', origin: 'Greek', type: 'root', examples: ['bibliophile', 'philanthropic', 'philanthropical', 'philanthropist', 'philanthropy', 'philosophical'] },
    { root: 'phob', meaning: 'fear', origin: 'Greek', type: 'root', examples: ['arachnophobia', 'claustrophobia', 'phobia', 'triskaidekaphobia', 'xenophobia'] },
    { root: 'phyl', meaning: 'tribe/race', origin: 'Greek', type: 'root', examples: ['phylogeny'] },
    { root: 'physi', meaning: 'nature', origin: 'Greek', type: 'root', examples: ['physician', 'physiognomy'] },
    { root: 'pleth', meaning: 'full/multitude', origin: 'Greek', type: 'root', examples: ['plethora'] },
    { root: 'pneum', meaning: 'air/breath', origin: 'Greek', type: 'root', examples: ['pneumatic', 'pneumonia', 'pneumonoultramicroscopicsilicovolcanoconiosis'] },
    { root: 'poli/polis', meaning: 'city', origin: 'Greek', type: 'root', examples: ['metropolitan'] },
    { root: 'proto/prot', meaning: 'first', origin: 'Greek', type: 'root', examples: ['protagonist', 'protege'] },
    { root: 'pseud', meaning: 'false', origin: 'Greek', type: 'root', examples: ['pseudonym', 'pseudoscience'] },
    { root: 'pter', meaning: 'wing', origin: 'Greek', type: 'root', examples: ['pterodactyl'] },
    { root: 'pyr', meaning: 'fire', origin: 'Greek', type: 'root', examples: ['antipyretic', 'empyrean'] },
    { root: 'rhin', meaning: 'nose', origin: 'Greek', type: 'root', examples: ['otorhinolaryngology', 'rhinoceros'] },
    { root: 'soph', meaning: 'wisdom', origin: 'Greek', type: 'root', examples: ['philosophical', 'sophisticated', 'sophomoric'] },
    { root: 'tach', meaning: 'speed', origin: 'Greek', type: 'root', examples: ['tachycardia'] },
    { root: 'techn', meaning: 'skill/craft', origin: 'Greek', type: 'root', examples: ['polytechnic', 'technique', 'technology'] },
    { root: 'theo', meaning: 'god', origin: 'Greek', type: 'root', examples: ['theocracy'] },
    { root: 'top', meaning: 'place', origin: 'Greek', type: 'root', examples: ['topography', 'toponym'] },
    { root: 'xen', meaning: 'foreign/stranger', origin: 'Greek', type: 'root', examples: ['xenophobia'] },
    { root: 'xer', meaning: 'dry', origin: 'Greek', type: 'root', examples: ['xerophyte'] },
    { root: 'xyl', meaning: 'wood', origin: 'Greek', type: 'root', examples: ['xylophone'] },
    { root: 'zoo/zo', meaning: 'animal', origin: 'Greek', type: 'root', examples: ['zoology'] },
];

// ── French Roots ─────────────────────────────────────────────────────────────

const FRENCH_ROOTS: WordRoot[] = [
    { root: '-ette', meaning: 'small/diminutive', origin: 'French', type: 'suffix', examples: ['silhouette', 'etiquette', 'pirouette', 'vignette', 'baguette', 'brunette', 'epaulette'] },
    { root: '-eur', meaning: 'one who does', origin: 'French', type: 'suffix', examples: ['entrepreneur', 'connoisseur', 'chauffeur', 'amateur', 'raconteur', 'saboteur', 'grandeur'] },
    { root: '-eau', meaning: 'water/beautiful', origin: 'French', type: 'suffix', examples: ['plateau', 'tableau', 'trousseau', 'chateau', 'bureau', 'portmanteau'] },
    { root: '-ique/-que', meaning: 'distinctive quality', origin: 'French', type: 'suffix', examples: ['technique', 'boutique', 'critique', 'clique', 'antique', 'baroque', 'grotesque', 'opaque'] },
    { root: '-age', meaning: 'action/result', origin: 'French', type: 'suffix', examples: ['camouflage', 'sabotage', 'entourage', 'montage', 'collage', 'corsage', 'mirage', 'fuselage'] },
    { root: '-ade', meaning: 'action/product', origin: 'French', type: 'suffix', examples: ['facade', 'charade', 'masquerade', 'balustrade', 'roulade'] },
    { root: '-oir/-oire', meaning: 'place/instrument', origin: 'French', type: 'suffix', examples: ['reservoir', 'repertoire'] },
    { root: '-ance/-ence', meaning: 'state/quality', origin: 'French', type: 'suffix', examples: ['surveillance', 'renaissance', 'ambiance', 'reconnaissance', 'insouciance', 'acquiescence', 'eloquence', 'convalescence'] },
    { root: 'entre-', meaning: 'between/among', origin: 'French', type: 'prefix', examples: ['entrepreneur'] },
    { root: 'renais-', meaning: 'rebirth', origin: 'French', type: 'root', examples: ['renaissance', 'renascence', 'rendezvous'] },
];

// ── German Roots ─────────────────────────────────────────────────────────────

const GERMAN_ROOTS: WordRoot[] = [
    { root: 'Bildung', meaning: 'formation/education', origin: 'German', type: 'root', examples: ['bildungsroman'] },
    { root: 'Geist/Zeit', meaning: 'spirit/time', origin: 'German', type: 'root', examples: ['zeitgeist'] },
    { root: 'Schaden', meaning: 'damage/harm', origin: 'German', type: 'root', examples: ['schadenfreude'] },
    { root: 'Wander', meaning: 'to wander', origin: 'German', type: 'root', examples: ['wanderlust'] },
    { root: 'Wunder', meaning: 'wonder/miracle', origin: 'German', type: 'root', examples: ['wunderkind'] },
];

// ── Italian Roots ────────────────────────────────────────────────────────────

const ITALIAN_ROOTS: WordRoot[] = [
    { root: 'chiaro/scuro', meaning: 'light/dark', origin: 'Italian', type: 'root', examples: ['chiaroscurist', 'chiaroscuro'] },
    { root: 'sfumato', meaning: 'smoky/faded', origin: 'Italian', type: 'root', examples: ['sfumato'] },
];

// ── Prefixes ─────────────────────────────────────────────────────────────────

const PREFIXES: WordRoot[] = [
    { root: 'pre-', meaning: 'before', origin: 'Latin', type: 'prefix', examples: ['prediction', 'precaution', 'precursor', 'predecessor', 'preliminary', 'prerequisite', 'precipitation', 'prevaricate', 'premonition', 'presumptuous'] },
    { root: 'dis-', meaning: 'apart/not', origin: 'Latin', type: 'prefix', examples: ['disagree', 'disappear', 'disappoint', 'disqualify', 'disseminate', 'discombobulate', 'disrespect', 'disingenuous'] },
    { root: 'trans-', meaning: 'across', origin: 'Latin', type: 'prefix', examples: ['transport', 'transformation', 'transmit', 'transparent', 'transatlantic', 'translucent', 'transplant', 'transmogrify', 'transhumance'] },
    { root: 'sub-', meaning: 'under', origin: 'Latin', type: 'prefix', examples: ['subordinate', 'subpoena', 'subscription', 'subterfuge', 'subterranean', 'subtle', 'succedaneum'] },
    { root: 'super-', meaning: 'above', origin: 'Latin', type: 'prefix', examples: ['superhero', 'superhuman', 'supernatural', 'supersede', 'supermarket', 'supercilious', 'supererogatory'] },
    { root: 'inter-', meaning: 'between', origin: 'Latin', type: 'prefix', examples: ['interaction', 'international', 'interpretation', 'interrupt', 'intersection', 'intervene', 'intercede', 'internecine'] },
    { root: 'un-', meaning: 'not', origin: 'Latin', type: 'prefix', examples: ['unable', 'unaware', 'unbelievable', 'unbreakable', 'uncertain', 'uncomfortable', 'undeniable', 'unconscionable', 'unequivocally'] },
    { root: 'mis-', meaning: 'wrong/bad', origin: 'Latin', type: 'prefix', examples: ['misbehave', 'misconduct', 'misfortune', 'misinform', 'misinterpret', 'misspell', 'mischief', 'miscellaneous'] },
    { root: 'anti-', meaning: 'against', origin: 'Greek', type: 'prefix', examples: ['antique', 'antithesis', 'antipyretic', 'antinomy', 'antidisestablishmentarianism'] },

    // ── New prefixes ──
    { root: 'ab-/abs-', meaning: 'away from', origin: 'Latin', type: 'prefix', examples: ['abnegate', 'abnegation', 'absquatulate', 'abstemious'] },
    { root: 'ad-', meaning: 'toward/to', origin: 'Latin', type: 'prefix', examples: ['adjudicate', 'adventure', 'advocate', 'aggrandizement'] },
    { root: 'circum-', meaning: 'around', origin: 'Latin', type: 'prefix', examples: ['circumference', 'circumlocution', 'circumscribe'] },
    { root: 'con-/com-', meaning: 'together/with', origin: 'Latin', type: 'prefix', examples: ['commemorate', 'communicate', 'community', 'competition', 'consecutive', 'convalescence', 'convocation'] },
    { root: 'de-', meaning: 'down/from', origin: 'Latin', type: 'prefix', examples: ['deprecate', 'desolate', 'deteriorate', 'demagogue'] },
    { root: 'ex-/e-', meaning: 'out of', origin: 'Latin', type: 'prefix', examples: ['effervescent', 'egregious', 'elucidate', 'emancipate', 'exculpate', 'expedite', 'extemporaneous', 'extraterrestrial'] },
    { root: 'in-/im-', meaning: 'not', origin: 'Latin', type: 'prefix', examples: ['immutable', 'implacable', 'incredulous', 'independent', 'indefatigable', 'invincible', 'invisible'] },
    { root: 'ob-', meaning: 'against/toward', origin: 'Latin', type: 'prefix', examples: ['obdurate', 'obsequious', 'obstinate'] },
    { root: 'per-', meaning: 'through/thoroughly', origin: 'Latin', type: 'prefix', examples: ['peradventure', 'perfect', 'pernicious', 'perpetual', 'perspicacious', 'pertinacious'] },
    { root: 'pro-', meaning: 'forward/for', origin: 'Latin', type: 'prefix', examples: ['probity', 'proclaim', 'prodigious', 'projection', 'promulgate', 'propaedeutic'] },
    { root: 're-', meaning: 'again/back', origin: 'Latin', type: 'prefix', examples: ['recapitulate', 'recycle', 'reminiscence', 'renaissance', 'resuscitate', 'retrospective', 'revocable'] },

    // ── New Greek prefixes ──
    { root: 'a-/an-', meaning: 'without/not', origin: 'Greek', type: 'prefix', examples: ['anachronism', 'anonymous', 'apathy', 'atavism'] },
    { root: 'dia-', meaning: 'through/across', origin: 'Greek', type: 'prefix', examples: ['diagnosis', 'dialogue', 'diaphanous'] },
    { root: 'dys-', meaning: 'bad/difficult', origin: 'Greek', type: 'prefix', examples: ['dyslexia', 'dyspepsia'] },
    { root: 'epi-', meaning: 'upon/over', origin: 'Greek', type: 'prefix', examples: ['epidemic', 'epiphany', 'epitome'] },
    { root: 'hyper-', meaning: 'over/above', origin: 'Greek', type: 'prefix', examples: ['hyperbole'] },
    { root: 'hypo-', meaning: 'under/below', origin: 'Greek', type: 'prefix', examples: ['hypotenuse', 'hypothermia', 'hypothesis'] },
    { root: 'meta-', meaning: 'beyond/change', origin: 'Greek', type: 'prefix', examples: ['metamorphosis', 'metathesis', 'metonymical'] },
    { root: 'mono-', meaning: 'one/single', origin: 'Greek', type: 'prefix', examples: ['monologue', 'monotonous'] },
    { root: 'peri-', meaning: 'around', origin: 'Greek', type: 'prefix', examples: ['perimeter', 'peripatetic', 'periphery', 'peristyle'] },
    { root: 'poly-', meaning: 'many', origin: 'Greek', type: 'prefix', examples: ['polyglot', 'polygon', 'polyphony', 'polytechnic'] },
    { root: 'pseudo-', meaning: 'false', origin: 'Greek', type: 'prefix', examples: ['pseudonym', 'pseudoscience'] },
    { root: 'syn-/sym-', meaning: 'together/with', origin: 'Greek', type: 'prefix', examples: ['symbiosis', 'symphony', 'synecdoche', 'synesthesia', 'synonym', 'synopsis', 'synthesis'] },
    { root: 'tele-', meaning: 'far/distant', origin: 'Greek', type: 'prefix', examples: ['telephone', 'tellurian'] },
];

// ── Suffixes ─────────────────────────────────────────────────────────────────

const SUFFIXES: WordRoot[] = [
    { root: '-tion/-sion', meaning: 'act/state of', origin: 'Latin', type: 'suffix', examples: ['abbreviation', 'civilization', 'competition', 'information', 'transformation', 'precipitation', 'interpretation'] },
    { root: '-ment', meaning: 'result/state', origin: 'Latin', type: 'suffix', examples: ['accomplishment', 'achievement', 'advertisement', 'agreement', 'amazement', 'announcement', 'arrangement', 'aggrandizement'] },
    { root: '-ous', meaning: 'full of', origin: 'Latin', type: 'suffix', examples: ['ambiguous', 'amphibious', 'anonymous', 'audacious', 'auspicious', 'autonomous', 'vociferous', 'egregious', 'gregarious', 'loquacious', 'obsequious', 'pusillanimous'] },
    { root: '-able/-ible', meaning: 'capable of', origin: 'Latin', type: 'suffix', examples: ['comfortable', 'adaptable', 'formidable', 'transferable', 'discernible', 'immutable', 'equitable', 'implacable', 'intelligible', 'revocable'] },
    { root: '-ful', meaning: 'full of', origin: 'Latin', type: 'suffix', examples: ['beautiful', 'careful', 'cheerful', 'colorful', 'delightful', 'graceful', 'respectful', 'suspenseful'] },
    { root: '-ness', meaning: 'state/quality', origin: 'Latin', type: 'suffix', examples: ['awareness', 'brightness', 'cleverness', 'darkness', 'eagerness', 'forgiveness', 'emptiness', 'bitterness', 'restlessness'] },
    { root: '-ity', meaning: 'quality of', origin: 'Latin', type: 'suffix', examples: ['community', 'continuity', 'electricity', 'eccentricity', 'equanimity', 'accountability', 'magnanimity', 'perspicacity'] },

    // ── New suffixes ──
    { root: '-ism', meaning: 'belief/practice', origin: 'Greek', type: 'suffix', examples: ['anachronism', 'nihilism', 'stoicism', 'somnambulism', 'solipsism'] },
    { root: '-ist', meaning: 'one who', origin: 'Greek', type: 'suffix', examples: ['antagonist', 'protagonist', 'philanthropist', 'iconoclast'] },
    { root: '-ic/-ical', meaning: 'relating to', origin: 'Greek', type: 'suffix', examples: ['chromatic', 'cryptic', 'didactic', 'ergodic', 'kinetic', 'neurological', 'chronological'] },
    { root: '-sis', meaning: 'process/condition', origin: 'Greek', type: 'suffix', examples: ['metamorphosis', 'symbiosis', 'synopsis', 'synthesis', 'hypothesis'] },
    { root: '-ive', meaning: 'tending to', origin: 'Latin', type: 'suffix', examples: ['consecutive', 'perspective', 'retrospective'] },
    { root: '-acious', meaning: 'inclined to', origin: 'Latin', type: 'suffix', examples: ['audacious', 'capacious', 'efficacious', 'rapacious', 'vivacious', 'fugacious', 'contumacious', 'pertinacious', 'tenacious'] },
    { root: '-ent/-ant', meaning: 'being/doing', origin: 'Latin', type: 'suffix', examples: ['antecedent', 'diffident', 'effervescent', 'fluorescent', 'nascent', 'somnolent'] },
    { root: '-itude', meaning: 'state/quality', origin: 'Latin', type: 'suffix', examples: ['gratitude', 'servitude', 'pulchritude', 'verisimilitude'] },
];

/** All curated word roots. */
export const WORD_ROOTS: readonly WordRoot[] = [
    ...LATIN_ROOTS,
    ...GREEK_ROOTS,
    ...FRENCH_ROOTS,
    ...GERMAN_ROOTS,
    ...ITALIAN_ROOTS,
    ...PREFIXES,
    ...SUFFIXES,
];
