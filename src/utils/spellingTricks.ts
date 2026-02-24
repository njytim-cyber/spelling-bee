/** Data structures defining the Spelling Tricks curriculum */

export interface SpellingTrick {
    id: string;
    title: string;
    description: string;
    difficulty: number;
    icon: string;
    lesson: {
        word: string;
        steps: string[];
        rule: string;
    };
    generatePractice: () => {
        prompt: string;
        answer: string;
        options: string[];
        correctIndex: number;
    };
}

export interface SpellingTrickCategory {
    id: string;
    label: string;
    emoji: string;
    trickIds: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface PracticeItem {
    prompt: string;
    answer: string;
    wrong: string[];
}

/** Pick a random item from the pool, shuffle options, and return a practice object. */
function buildPractice(pool: PracticeItem[]): {
    prompt: string;
    answer: string;
    options: string[];
    correctIndex: number;
} {
    const item = pool[Math.floor(Math.random() * pool.length)];
    const options = [item.answer, ...item.wrong].sort(() => Math.random() - 0.5);
    return {
        prompt: item.prompt,
        answer: item.answer,
        options,
        correctIndex: options.indexOf(item.answer),
    };
}

// ── Tricks ───────────────────────────────────────────────────────────────────

export const SPELLING_TRICKS: SpellingTrick[] = [
    // ── Phonics Fundamentals (difficulty 1) ──────────────────────────────────

    {
        id: 'magic-e',
        title: 'Magic E',
        description: 'Adding a silent e changes a short vowel to a long vowel',
        difficulty: 1,
        icon: '🪄',
        lesson: {
            word: 'hope',
            steps: [
                'Start with "hop" — the o says its short sound.',
                'Add an e to the end: "hope".',
                'Now the o says its name (long o)!',
                'The e is silent but it changes the vowel sound.',
            ],
            rule: 'A silent e at the end makes the vowel say its name: hop -> hope, cap -> cape, kit -> kite.',
        },
        generatePractice: () => buildPractice([
            { prompt: 'Which word has a long vowel sound?', answer: 'hope', wrong: ['hop', 'hopp'] },
            { prompt: 'Which word has a long vowel sound?', answer: 'cape', wrong: ['cap', 'capp'] },
            { prompt: 'Which word has a long vowel sound?', answer: 'kite', wrong: ['kit', 'kitt'] },
            { prompt: 'Which word has a long vowel sound?', answer: 'pine', wrong: ['pin', 'pinn'] },
            { prompt: 'Which word has a long vowel sound?', answer: 'cute', wrong: ['cut', 'cutt'] },
            { prompt: 'Which word has a long vowel sound?', answer: 'tape', wrong: ['tap', 'tapp'] },
            { prompt: 'Which word has a long vowel sound?', answer: 'note', wrong: ['not', 'nott'] },
            { prompt: 'Which word has a long vowel sound?', answer: 'tube', wrong: ['tub', 'tubb'] },
        ]),
    },
    {
        id: 'ck-vs-k',
        title: 'CK or K?',
        description: 'Use ck after a short vowel, k after everything else',
        difficulty: 1,
        icon: '🔑',
        lesson: {
            word: 'back',
            steps: [
                '"Back" has a short a vowel sound.',
                'After a short vowel, we use ck.',
                'After a long vowel, consonant, or vowel pair, just use k.',
                'Examples: back, deck, sick — but book, bark, peak.',
            ],
            rule: 'Short vowel + /k/ = ck (back, deck, sick). Otherwise use k (book, bark, peak).',
        },
        generatePractice: () => buildPractice([
            { prompt: 'Which spelling is correct? ba__', answer: 'back', wrong: ['bak', 'bakk'] },
            { prompt: 'Which spelling is correct? de__', answer: 'deck', wrong: ['dek', 'dekk'] },
            { prompt: 'Which spelling is correct? si__', answer: 'sick', wrong: ['sik', 'sikk'] },
            { prompt: 'Which spelling is correct? du__', answer: 'duck', wrong: ['duk', 'dukk'] },
            { prompt: 'Which spelling is correct? lo__', answer: 'lock', wrong: ['lok', 'lokk'] },
            { prompt: 'Which spelling is correct? boo__', answer: 'book', wrong: ['boock', 'bookk'] },
            { prompt: 'Which spelling is correct? bar__', answer: 'bark', wrong: ['barck', 'barkk'] },
            { prompt: 'Which spelling is correct? pea__', answer: 'peak', wrong: ['peack', 'peakk'] },
        ]),
    },
    {
        id: 'double-consonants',
        title: 'Double Trouble',
        description: 'Double the final consonant when adding -ing/-ed to short vowel words',
        difficulty: 1,
        icon: '2️⃣',
        lesson: {
            word: 'hopping',
            steps: [
                '"Hop" has a short vowel (short o) and ends in one consonant.',
                'When adding -ing or -ed, double the last consonant first.',
                'hop + ing = hopping (not hoping!).',
                '"Hoping" would mean something different — it comes from "hope".',
            ],
            rule: 'Short vowel + single consonant: double it before -ing/-ed. hop -> hopping, run -> running, sit -> sitting.',
        },
        generatePractice: () => buildPractice([
            { prompt: 'hop + ing = ?', answer: 'hopping', wrong: ['hoping', 'hoping'] },
            { prompt: 'run + ing = ?', answer: 'running', wrong: ['runing', 'runeing'] },
            { prompt: 'sit + ing = ?', answer: 'sitting', wrong: ['siting', 'siteing'] },
            { prompt: 'swim + ing = ?', answer: 'swimming', wrong: ['swiming', 'swimmeng'] },
            { prompt: 'stop + ed = ?', answer: 'stopped', wrong: ['stoped', 'stoppd'] },
            { prompt: 'plan + ed = ?', answer: 'planned', wrong: ['planed', 'plannd'] },
            { prompt: 'cut + ing = ?', answer: 'cutting', wrong: ['cuting', 'cuteing'] },
        ]),
    },

    // ── Vowel Patterns (difficulty 2) ────────────────────────────────────────

    {
        id: 'i-before-e',
        title: 'I Before E',
        description: 'I before e, except after c',
        difficulty: 2,
        icon: '🔤',
        lesson: {
            word: 'believe',
            steps: [
                'The classic rule: i before e, except after c.',
                '"Believe" — no c before it, so i comes first: ie.',
                '"Receive" — there is a c, so e comes first: ei.',
                'Watch out for exceptions like "weird" and "their"!',
            ],
            rule: 'I before E except after C: believe, achieve, receive, ceiling. Exceptions: weird, their, seize.',
        },
        generatePractice: () => buildPractice([
            { prompt: 'Which is correct? bel___ve', answer: 'believe', wrong: ['beleive', 'beleave'] },
            { prompt: 'Which is correct? rec___ve', answer: 'receive', wrong: ['recieve', 'receeve'] },
            { prompt: 'Which is correct? ach___ve', answer: 'achieve', wrong: ['acheive', 'acheeve'] },
            { prompt: 'Which is correct? c___ling', answer: 'ceiling', wrong: ['cieling', 'ceeling'] },
            { prompt: 'Which is correct? p___ce', answer: 'piece', wrong: ['peice', 'peece'] },
            { prompt: 'Which is correct? dec___ve', answer: 'deceive', wrong: ['decieve', 'deceeve'] },
            { prompt: 'Which is correct? n___ce', answer: 'niece', wrong: ['neice', 'neece'] },
        ]),
    },
    {
        id: 'ou-ow',
        title: 'OU vs OW',
        description: 'OU usually in the middle of a word, OW at the end or before n/l',
        difficulty: 2,
        icon: '🦉',
        lesson: {
            word: 'house',
            steps: [
                'The /ow/ sound can be spelled OU or OW.',
                'OU is usually found in the middle of a word: house, cloud, mouse.',
                'OW is usually at the end of a word: cow, now, plow.',
                'OW also appears before n and l: town, owl, brown.',
            ],
            rule: 'OU mid-word (house, cloud, mouse). OW at word end (cow, now) or before n/l (town, owl).',
        },
        generatePractice: () => buildPractice([
            { prompt: 'Which is correct? h___se', answer: 'house', wrong: ['howse', 'hose'] },
            { prompt: 'Which is correct? cl___d', answer: 'cloud', wrong: ['clowd', 'clood'] },
            { prompt: 'Which is correct? m___se', answer: 'mouse', wrong: ['mowse', 'moose'] },
            { prompt: 'Which is correct? t___n', answer: 'town', wrong: ['toun', 'tone'] },
            { prompt: 'Which is correct? c___', answer: 'cow', wrong: ['cou', 'coue'] },
            { prompt: 'Which is correct? ___l', answer: 'owl', wrong: ['oul', 'ole'] },
            { prompt: 'Which is correct? br___n', answer: 'brown', wrong: ['broun', 'brone'] },
        ]),
    },
    {
        id: 'oi-oy',
        title: 'OI vs OY',
        description: 'OI in the middle of a word, OY at the end',
        difficulty: 2,
        icon: '🪙',
        lesson: {
            word: 'coin',
            steps: [
                'The /oi/ sound is spelled two ways: oi and oy.',
                'Use OI in the middle of a word: coin, point, boil.',
                'Use OY at the end of a word: boy, joy, toy.',
                '"Enjoy" uses OY because the sound is at the end!',
            ],
            rule: 'OI mid-word (coin, point, boil). OY at word end (boy, joy, enjoy).',
        },
        generatePractice: () => buildPractice([
            { prompt: 'Which is correct? enj___', answer: 'enjoy', wrong: ['enjoi', 'enjoye'] },
            { prompt: 'Which is correct? c___n', answer: 'coin', wrong: ['coyn', 'cone'] },
            { prompt: 'Which is correct? p___nt', answer: 'point', wrong: ['poynt', 'pont'] },
            { prompt: 'Which is correct? b___l', answer: 'boil', wrong: ['boyl', 'bole'] },
            { prompt: 'Which is correct? t___', answer: 'toy', wrong: ['toi', 'toye'] },
            { prompt: 'Which is correct? j___', answer: 'joy', wrong: ['joi', 'joye'] },
            { prompt: 'Which is correct? n___se', answer: 'noise', wrong: ['noyse', 'nose'] },
        ]),
    },
    {
        id: 'ways-to-say-a',
        title: 'Ways to Say Long A',
        description: 'AI mid-word, AY at word end, A_E with magic e',
        difficulty: 2,
        icon: '🅰️',
        lesson: {
            word: 'train',
            steps: [
                'The long A sound has three common spellings.',
                'AI in the middle of a word: rain, train, brain.',
                'AY at the end of a word: play, day, stay.',
                'A_E with the magic e pattern: cake, lake, make.',
            ],
            rule: 'AI mid-word (rain, train). AY at word end (play, day). A_E with magic e (cake, lake).',
        },
        generatePractice: () => buildPractice([
            { prompt: 'Which is correct? tr___n', answer: 'train', wrong: ['trayn', 'trane'] },
            { prompt: 'Which is correct? pl___', answer: 'play', wrong: ['plai', 'plae'] },
            { prompt: 'Which is correct? r___n', answer: 'rain', wrong: ['rayn', 'rane'] },
            { prompt: 'Which is correct? d___', answer: 'day', wrong: ['dai', 'dae'] },
            { prompt: 'Which is correct? br___n', answer: 'brain', wrong: ['brayn', 'brane'] },
            { prompt: 'Which is correct? st___', answer: 'stay', wrong: ['stai', 'stae'] },
            { prompt: 'Which is correct? c___ke', answer: 'cake', wrong: ['caike', 'cayke'] },
        ]),
    },

    // ── Tricky Endings (difficulty 3) ────────────────────────────────────────

    {
        id: 'tion-sion',
        title: '-TION vs -SION',
        description: 'TION after most consonants, SION after vowels or l/n/r',
        difficulty: 3,
        icon: '🏷️',
        lesson: {
            word: 'nation',
            steps: [
                'Both -tion and -sion make the /shun/ sound.',
                '-TION is far more common and follows most consonants: nation, action, direction.',
                '-SION follows vowels or the letters l, n, r: vision, tension, version.',
                '-SION sometimes makes the /zhun/ sound: vision, television.',
            ],
            rule: '-TION after most consonants (nation, action). -SION after vowels or l/n/r (vision, tension).',
        },
        generatePractice: () => buildPractice([
            { prompt: 'Which is correct? na____', answer: 'nation', wrong: ['nashion', 'nacion'] },
            { prompt: 'Which is correct? ac____', answer: 'action', wrong: ['acshion', 'aksion'] },
            { prompt: 'Which is correct? vi____', answer: 'vision', wrong: ['vition', 'vishion'] },
            { prompt: 'Which is correct? ten____', answer: 'tension', wrong: ['tention', 'tenshion'] },
            { prompt: 'Which is correct? direc____', answer: 'direction', wrong: ['direcsion', 'direcshion'] },
            { prompt: 'Which is correct? ver____', answer: 'version', wrong: ['vertion', 'vershion'] },
            { prompt: 'Which is correct? educa____', answer: 'education', wrong: ['educasion', 'educashion'] },
            { prompt: 'Which is correct? deci____', answer: 'decision', wrong: ['decition', 'decishion'] },
        ]),
    },
    {
        id: 'ible-able',
        title: '-IBLE vs -ABLE',
        description: 'ABLE if the root is a complete word, IBLE if not',
        difficulty: 3,
        icon: '📖',
        lesson: {
            word: 'comfortable',
            steps: [
                'Both -able and -ible mean "can be" or "capable of".',
                'If the root is a complete word, use -ABLE: comfort -> comfortable.',
                'If the root is NOT a complete word on its own, use -IBLE: vis -> visible.',
                'Tip: you can "comfort" someone, so it is "comfortable".',
            ],
            rule: 'Root is a full word? Add -ABLE (comfortable, enjoyable). Root is not? Use -IBLE (visible, possible).',
        },
        generatePractice: () => buildPractice([
            { prompt: 'Which is correct?', answer: 'comfortable', wrong: ['comfortible', 'comfertable'] },
            { prompt: 'Which is correct?', answer: 'visible', wrong: ['visable', 'viseable'] },
            { prompt: 'Which is correct?', answer: 'enjoyable', wrong: ['enjoyible', 'enjoiable'] },
            { prompt: 'Which is correct?', answer: 'possible', wrong: ['possable', 'posible'] },
            { prompt: 'Which is correct?', answer: 'reasonable', wrong: ['reasonible', 'resonable'] },
            { prompt: 'Which is correct?', answer: 'terrible', wrong: ['terrable', 'terible'] },
            { prompt: 'Which is correct?', answer: 'washable', wrong: ['washible', 'wachable'] },
            { prompt: 'Which is correct?', answer: 'flexible', wrong: ['flexable', 'flexeble'] },
        ]),
    },
    {
        id: 'adding-ly',
        title: 'Adding -LY',
        description: 'Rules for turning adjectives into adverbs with -ly',
        difficulty: 3,
        icon: '🏃',
        lesson: {
            word: 'happily',
            steps: [
                'Usually just add -ly: quick -> quickly, slow -> slowly.',
                'If the word ends in y, change y to i first: happy -> happily.',
                'If the word ends in -le, drop the le and add -ly: gentle -> gently.',
                'If the word ends in -ic, add -ally: basic -> basically.',
            ],
            rule: 'Just add -ly (quickly). Y endings: change y to i (happily). LE endings: drop le, add ly (gently).',
        },
        generatePractice: () => buildPractice([
            { prompt: 'happy + ly = ?', answer: 'happily', wrong: ['happyly', 'hapily'] },
            { prompt: 'gentle + ly = ?', answer: 'gently', wrong: ['gentlely', 'gentley'] },
            { prompt: 'quick + ly = ?', answer: 'quickly', wrong: ['quickely', 'quikly'] },
            { prompt: 'easy + ly = ?', answer: 'easily', wrong: ['easyly', 'easly'] },
            { prompt: 'simple + ly = ?', answer: 'simply', wrong: ['simplely', 'simpley'] },
            { prompt: 'basic + ally = ?', answer: 'basically', wrong: ['basicly', 'basicaly'] },
            { prompt: 'lucky + ly = ?', answer: 'luckily', wrong: ['luckyly', 'luckly'] },
        ]),
    },
    {
        id: 'plural-rules',
        title: 'Plural Rules',
        description: 'How to make words plural: -s, -es, -ies, -ves',
        difficulty: 3,
        icon: '📦',
        lesson: {
            word: 'babies',
            steps: [
                'Most words: just add s (cat -> cats, dog -> dogs).',
                'Words ending in s, sh, ch, x, z: add es (bus -> buses, box -> boxes).',
                'Words ending in consonant + y: change y to ies (baby -> babies).',
                'Some words ending in f: change f to ves (leaf -> leaves).',
            ],
            rule: 'Add s (cats). S/sh/ch/x/z add es (boxes). Consonant+y -> ies (babies). F -> ves (leaves).',
        },
        generatePractice: () => buildPractice([
            { prompt: 'baby -> ?', answer: 'babies', wrong: ['babys', 'babyes'] },
            { prompt: 'box -> ?', answer: 'boxes', wrong: ['boxs', 'boxies'] },
            { prompt: 'leaf -> ?', answer: 'leaves', wrong: ['leafs', 'leafes'] },
            { prompt: 'church -> ?', answer: 'churches', wrong: ['churchs', 'churchies'] },
            { prompt: 'city -> ?', answer: 'cities', wrong: ['citys', 'cityes'] },
            { prompt: 'bus -> ?', answer: 'buses', wrong: ['buss', 'busies'] },
            { prompt: 'wolf -> ?', answer: 'wolves', wrong: ['wolfs', 'wolfes'] },
            { prompt: 'story -> ?', answer: 'stories', wrong: ['storys', 'storyes'] },
        ]),
    },

    // ── Memory Tricks (difficulty 2) ─────────────────────────────────────────

    {
        id: 'because-mnemonic',
        title: 'BECAUSE',
        description: 'Big Elephants Can Always Understand Small Elephants',
        difficulty: 2,
        icon: '🐘',
        lesson: {
            word: 'because',
            steps: [
                'Many people misspell "because" as "becuase" or "becouse".',
                'Remember the mnemonic:',
                'Big Elephants Can Always Understand Small Elephants',
                'B-E-C-A-U-S-E!',
            ],
            rule: 'Big Elephants Can Always Understand Small Elephants = B.E.C.A.U.S.E.',
        },
        generatePractice: () => buildPractice([
            { prompt: 'Which spelling is correct?', answer: 'because', wrong: ['becuase', 'becouse'] },
            { prompt: 'B.E.C.A.U.S.E — which is right?', answer: 'because', wrong: ['becasue', 'becuase'] },
            { prompt: 'Fill in: I stayed home be____', answer: 'because', wrong: ['becouse', 'becuz'] },
            { prompt: 'Big Elephants Can Always Understand Small Elephants =', answer: 'because', wrong: ['becuase', 'beacuse'] },
            { prompt: 'Which is spelled correctly?', answer: 'because', wrong: ['becuase', 'becouse'] },
        ]),
    },
    {
        id: 'separate-mnemonic',
        title: 'SEPARATE',
        description: 'There is A RAT in sepARATE',
        difficulty: 2,
        icon: '🐀',
        lesson: {
            word: 'separate',
            steps: [
                '"Separate" is one of the most commonly misspelled words.',
                'People often write "seperate" — using an e instead of the second a.',
                'Remember: there is A RAT in sep-A-R-A-T-E!',
                'The a-r-a-t pattern helps you get it right.',
            ],
            rule: 'There is A RAT in sepARATE. Never "seperate"!',
        },
        generatePractice: () => buildPractice([
            { prompt: 'Which spelling is correct?', answer: 'separate', wrong: ['seperate', 'separete'] },
            { prompt: 'There is A RAT in ___', answer: 'separate', wrong: ['seperate', 'seperete'] },
            { prompt: 'Which is right? sep_r_te', answer: 'separate', wrong: ['seperate', 'sepurate'] },
            { prompt: 'Choose the correct spelling:', answer: 'separate', wrong: ['seperate', 'separite'] },
            { prompt: 'Which has A RAT inside?', answer: 'separate', wrong: ['seperate', 'sepperate'] },
        ]),
    },
    {
        id: 'necessary-mnemonic',
        title: 'NECESSARY',
        description: 'A shirt has 1 Collar and 2 Sleeves (1 c, 2 s)',
        difficulty: 2,
        icon: '👕',
        lesson: {
            word: 'necessary',
            steps: [
                '"Necessary" trips people up — is it one c or two? One s or two?',
                'Think of a shirt: 1 collar and 2 sleeves.',
                'Necessary has 1 C and 2 S letters!',
                'ne-C-e-SS-ary',
            ],
            rule: 'A shirt has 1 Collar, 2 Sleeves. NeCeSSary = 1 C, 2 S.',
        },
        generatePractice: () => buildPractice([
            { prompt: 'Which spelling is correct?', answer: 'necessary', wrong: ['neccessary', 'necesary'] },
            { prompt: '1 Collar, 2 Sleeves = ?', answer: 'necessary', wrong: ['neccessary', 'neccesary'] },
            { prompt: 'Which has 1 c and 2 s?', answer: 'necessary', wrong: ['necesary', 'neccessary'] },
            { prompt: 'Choose the correct spelling:', answer: 'necessary', wrong: ['nessecary', 'necesarry'] },
            { prompt: 'ne_e__ary — fill the blanks:', answer: 'necessary', wrong: ['neccessary', 'neccesary'] },
        ]),
    },
    {
        id: 'rhythm-mnemonic',
        title: 'RHYTHM',
        description: 'Rhythm Has Your Two Hips Moving',
        difficulty: 2,
        icon: '🥁',
        lesson: {
            word: 'rhythm',
            steps: [
                '"Rhythm" has no regular vowels — just two y letters!',
                'This makes it very hard to spell from memory.',
                'Use the mnemonic: Rhythm Has Your Two Hips Moving.',
                'R-H-Y-T-H-M!',
            ],
            rule: 'Rhythm Has Your Two Hips Moving = R.H.Y.T.H.M.',
        },
        generatePractice: () => buildPractice([
            { prompt: 'Which spelling is correct?', answer: 'rhythm', wrong: ['rythm', 'rythum'] },
            { prompt: 'R.H.Y.T.H.M — which is right?', answer: 'rhythm', wrong: ['rhythem', 'rythm'] },
            { prompt: 'Rhythm Has Your Two Hips Moving =', answer: 'rhythm', wrong: ['rythm', 'rhythum'] },
            { prompt: 'Which word has no regular vowels?', answer: 'rhythm', wrong: ['rythm', 'rythum'] },
            { prompt: 'Choose the correct spelling:', answer: 'rhythm', wrong: ['rhytm', 'rythm'] },
        ]),
    },

    // ── Silent Letters (difficulty 3) ────────────────────────────────────────

    {
        id: 'silent-letters',
        title: 'Ghost Letters',
        description: 'Some letters are written but never pronounced',
        difficulty: 3,
        icon: '👻',
        lesson: {
            word: 'knight',
            steps: [
                'English has many silent letters — ghosts from old pronunciation!',
                'Silent K: know, knight, knee, knock, knit.',
                'Silent W: write, wrong, wrist, wrap.',
                'Silent B: thumb, climb, lamb, comb.',
            ],
            rule: 'Silent K before n (know, knight). Silent W before r (write, wrong). Silent B after m (thumb, climb).',
        },
        generatePractice: () => buildPractice([
            { prompt: 'Which spelling is correct for the pointy thing?', answer: 'knife', wrong: ['nife', 'knive'] },
            { prompt: 'Which spelling has a silent k?', answer: 'knight', wrong: ['night', 'nite'] },
            { prompt: 'Which is correct? To ___ a letter', answer: 'write', wrong: ['rite', 'writ'] },
            { prompt: 'Which spelling is correct?', answer: 'thumb', wrong: ['thum', 'tumb'] },
            { prompt: 'To ___ on a door:', answer: 'knock', wrong: ['nock', 'knok'] },
            { prompt: 'A ____ in a fairy tale:', answer: 'castle', wrong: ['casle', 'cassle'] },
            { prompt: 'An ___ in the sea:', answer: 'island', wrong: ['iland', 'ilsand'] },
            { prompt: 'You ___ the answer:', answer: 'know', wrong: ['now', 'kno'] },
        ]),
    },
];

// ── Categories ───────────────────────────────────────────────────────────────

export const SPELLING_TRICK_CATEGORIES: SpellingTrickCategory[] = [
    {
        id: 'phonics',
        label: 'Phonics Fundamentals',
        emoji: '🔊',
        trickIds: ['magic-e', 'ck-vs-k', 'double-consonants'],
    },
    {
        id: 'vowel-patterns',
        label: 'Vowel Patterns',
        emoji: '🔡',
        trickIds: ['i-before-e', 'ou-ow', 'oi-oy', 'ways-to-say-a'],
    },
    {
        id: 'tricky-endings',
        label: 'Tricky Endings',
        emoji: '🎯',
        trickIds: ['tion-sion', 'ible-able', 'adding-ly', 'plural-rules'],
    },
    {
        id: 'memory-tricks',
        label: 'Memory Tricks',
        emoji: '🧠',
        trickIds: ['because-mnemonic', 'separate-mnemonic', 'necessary-mnemonic', 'rhythm-mnemonic'],
    },
    {
        id: 'silent-letters',
        label: 'Silent Letters & Word Building',
        emoji: '👻',
        trickIds: ['silent-letters'],
    },
];

// ── Recommendation ───────────────────────────────────────────────────────────

/** Find the next recommended trick: first unmastered by difficulty order. */
export function getRecommendedTrick(mastered: Set<string>): SpellingTrick | null {
    const sorted = [...SPELLING_TRICKS].sort((a, b) => a.difficulty - b.difficulty);
    return sorted.find(t => !mastered.has(t.id)) ?? null;
}
