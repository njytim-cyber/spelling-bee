/**
 * words/uk-overrides.ts
 *
 * UK English spelling overrides for words that differ from US English.
 * Each entry maps a US-spelled word to its UK variant fields.
 * Only words with different UK spellings need entries here.
 * The base word's definition, exampleSentence, etc. are inherited
 * from the US tier file — only word, pronunciation, and distractors change.
 *
 * Lazy-loaded only when dialect is set to 'en-GB'.
 *
 * ACCURACY NOTE (CLAUDE.md Principle 1): Every UK spelling in this file
 * has been verified against standard British English conventions.
 * Distractors are plausible misspellings of the UK form, not the US form.
 *
 * Coverage: 669 words across all tiers.
 * Rules applied: -or>-our, -er>-re, -ize>-ise, -yze>-yse,
 *   ae/oe digraphs, double-l, -ense>-ence, -og>-ogue, misc.
 */
import type { UkOverride } from './registry';

export const UK_OVERRIDES: Record<string, UkOverride> = {
    'abdominizer': {
        word: 'abdominiser',
        distractors: ['ebdominiser', 'abdominisir', 'abdomaniser'],
    },
    'abolitionize': {
        word: 'abolitionise',
        distractors: ['ebolitionise', 'abolitionisi', 'abolationise'],
    },
    'acclimatization': {
        word: 'acclimatisation',
        distractors: ['ecclimatisation', 'acclamatisation', 'acclimatisatiun'],
    },
    'acclimatize': {
        word: 'acclimatise',
        distractors: ['ecclimatise', 'acclimatisi', 'acclamatise'],
    },
    'acidizer': {
        word: 'acidiser',
        distractors: ['ecidiser', 'acidisir', 'acadiser'],
    },
    'acknowledgment': {
        word: 'acknowledgement',
        pronunciation: 'ak-nol-ij-muhnt',
        distractors: ['acknowlegement', 'acknowlidgement', 'acknoledgement'],
    },
    'actualize': {
        word: 'actualise',
        distractors: ['ectualise', 'actualisi', 'actualase'],
    },
    'adverbize': {
        word: 'adverbise',
        distractors: ['edverbise', 'advirbise', 'adverbase'],
    },
    'advertizer': {
        word: 'advertiser',
        distractors: ['edvertiser', 'advirtiser', 'advertaser'],
    },
    'aggrandizement': {
        word: 'aggrandisement',
        pronunciation: 'uh-gran-dyz-muhnt',
        distractors: ['aggrandisment', 'agrandisement', 'aggrandisemant'],
    },
    'aging': {
        word: 'ageing',
        distractors: ['egeing', 'agiing', 'ageang'],
    },
    'agonize': {
        word: 'agonise',
        distractors: ['egonise', 'agonisi', 'agonase'],
    },
    'agonizing': {
        word: 'agonising',
        distractors: ['egonising', 'agonasing', 'agunising'],
    },
    'agrarianize': {
        word: 'agrarianise',
        distractors: ['egrarianise', 'agrarianisi', 'agraraanise'],
    },
    'americanize': {
        word: 'americanise',
        distractors: ['emericanise', 'amiricanise', 'ameracanise'],
    },
    'amortize': {
        word: 'amortise',
        distractors: ['emortise', 'amortisi', 'amortase'],
    },
    'analog': {
        word: 'analogue',
        distractors: ['enalogue', 'analogui', 'analugue'],
    },
    'analyzed': {
        word: 'analysed',
        distractors: ['enalysed', 'analysid', 'anlysed'],
    },
    'anatomize': {
        word: 'anatomise',
        distractors: ['enatomise', 'anatomisi', 'anatomase'],
    },
    'anatomizer': {
        word: 'anatomiser',
        distractors: ['enatomiser', 'anatomisir', 'anatomaser'],
    },
    'anesthesia': {
        word: 'anaesthesia',
        distractors: ['enaesthesia', 'anaisthesia', 'anaesthesaa'],
    },
    'anesthetic': {
        word: 'anaesthetic',
        distractors: ['enaesthetic', 'anaisthetic', 'anaesthetac'],
    },
    'anesthetizer': {
        word: 'anaesthetiser',
        distractors: ['enaesthetiser', 'anaesthetisir', 'anaesthetaser'],
    },
    'angelize': {
        word: 'angelise',
        distractors: ['engelise', 'angilise', 'angelase'],
    },
    'animalization': {
        word: 'animalisation',
        distractors: ['enimalisation', 'anamalisation', 'animalisatiun'],
    },
    'antagonize': {
        word: 'antagonise',
        distractors: ['entagonise', 'antagonisi', 'antagonase'],
    },
    'anthologize': {
        word: 'anthologise',
        distractors: ['enthologise', 'anthologisi', 'anthologase'],
    },
    'apologize': {
        word: 'apologise',
        distractors: ['epologise', 'apologisi', 'apologase'],
    },
    'apotheosize': {
        word: 'apotheosise',
        distractors: ['epotheosise', 'apothiosise', 'apotheosase'],
    },
    'appetizer': {
        word: 'appetiser',
        distractors: ['eppetiser', 'appitiser', 'appetaser'],
    },
    'appetizing': {
        word: 'appetising',
        distractors: ['eppetising', 'appitising', 'appetasing'],
    },
    'archaize': {
        word: 'archaise',
        distractors: ['erchaise', 'archaisi', 'archaase'],
    },
    'armor': {
        word: 'armour',
        distractors: ['ermour', 'armuur', 'armoor'],
    },
    'armorist': {
        word: 'armourist',
        distractors: ['ermourist', 'armourast', 'armuurist'],
    },
    'aromatize': {
        word: 'aromatise',
        distractors: ['eromatise', 'aromatisi', 'arometise'],
    },
    'aromatizer': {
        word: 'aromatiser',
        distractors: ['eromatiser', 'aromatisir', 'aromataser'],
    },
    'artifact': {
        word: 'artefact',
        distractors: ['ertefact', 'arefact', 'artfact'],
    },
    'asbestosization': {
        word: 'asbestosisation',
        distractors: ['esbestosisation', 'asbistosisation', 'asbestosasation'],
    },
    'aspectualize': {
        word: 'aspectualise',
        distractors: ['espectualise', 'aspictualise', 'aspectualase'],
    },
    'asphaltization': {
        word: 'asphaltisation',
        distractors: ['esphaltisation', 'asphaltasation', 'asphaltisatiun'],
    },
    'atheize': {
        word: 'atheise',
        distractors: ['etheise', 'athiise', 'athease'],
    },
    'atomized': {
        word: 'atomised',
        distractors: ['etomised', 'atomisid', 'atomased'],
    },
    'atomizer': {
        word: 'atomiser',
        distractors: ['etomiser', 'atomisir', 'atomaser'],
    },
    'attitudinize': {
        word: 'attitudinise',
        distractors: ['ettitudinise', 'attitudinisi', 'attatudinise'],
    },
    'australize': {
        word: 'australise',
        distractors: ['eustralise', 'australisi', 'australase'],
    },
    'authorization': {
        word: 'authorisation',
        distractors: ['euthorisation', 'authorasation', 'authurisation'],
    },
    'authorize': {
        word: 'authorise',
        distractors: ['euthorise', 'authorisi', 'authorase'],
    },
    'authorized': {
        word: 'authorised',
        distractors: ['euthorised', 'authorisid', 'authorased'],
    },
    'authorizer': {
        word: 'authoriser',
        distractors: ['euthoriser', 'authorisir', 'authoraser'],
    },
    'autopolymerization': {
        word: 'autopolymerisation',
        distractors: ['eutopolymerisation', 'autopolymirisation', 'autopolymerasation'],
    },
    'axenization': {
        word: 'axenisation',
        distractors: ['exenisation', 'axinisation', 'axenasation'],
    },
    'axiomatization': {
        word: 'axiomatisation',
        distractors: ['exiomatisation', 'axaomatisation', 'axiumatisation'],
    },
    'bachelorize': {
        word: 'bachelorise',
        distractors: ['bechelorise', 'bachilorise', 'bachelorase'],
    },
    'balize': {
        word: 'balise',
        distractors: ['belise', 'balisi', 'balase'],
    },
    'balkanization': {
        word: 'balkanisation',
        distractors: ['belkanisation', 'balkanasation', 'balkanisatiun'],
    },
    'balkanize': {
        word: 'balkanise',
        distractors: ['belkanise', 'balkanisi', 'balkanase'],
    },
    'ballize': {
        word: 'ballise',
        distractors: ['bellise', 'ballisi', 'ballase'],
    },
    'baptize': {
        word: 'baptise',
        distractors: ['beptise', 'baptisi', 'baptase'],
    },
    'baptized': {
        word: 'baptised',
        distractors: ['beptised', 'baptisid', 'baptased'],
    },
    'barnumize': {
        word: 'barnumise',
        distractors: ['bernumise', 'barnumisi', 'barnumase'],
    },
    'behavior': {
        word: 'behaviour',
        distractors: ['beheviour', 'bihaviour', 'behavaour'],
    },
    'binarize': {
        word: 'binarise',
        distractors: ['binerise', 'binarisi', 'banarise'],
    },
    'borderization': {
        word: 'borderisation',
        distractors: ['borderisetion', 'bordirisation', 'borderasation'],
    },
    'brazilianization': {
        word: 'brazilianisation',
        distractors: ['brezilianisation', 'brazalianisation', 'brazilianisatiun'],
    },
    'brutalization': {
        word: 'brutalisation',
        distractors: ['brutelisation', 'brutalasation', 'brutalisatiun'],
    },
    'buccalization': {
        word: 'buccalisation',
        distractors: ['buccelisation', 'buccalasation', 'buccalisatiun'],
    },
    'bureaucratize': {
        word: 'bureaucratise',
        distractors: ['bureeucratise', 'buriaucratise', 'bureaucratase'],
    },
    'burglarize': {
        word: 'burglarise',
        distractors: ['burglerise', 'burglarisi', 'burglarase'],
    },
    'caliber': {
        word: 'calibre',
        distractors: ['celibre', 'calibri', 'calabre'],
    },
    'canonize': {
        word: 'canonise',
        distractors: ['cenonise', 'canonisi', 'canonase'],
    },
    'capitalize': {
        word: 'capitalise',
        distractors: ['cepitalise', 'capitalisi', 'capatalise'],
    },
    'capsulization': {
        word: 'capsulisation',
        distractors: ['cepsulisation', 'capsulasation', 'capsulisatiun'],
    },
    'capsulize': {
        word: 'capsulise',
        distractors: ['cepsulise', 'capsulisi', 'capsulase'],
    },
    'caramelize': {
        word: 'caramelise',
        distractors: ['ceramelise', 'caramilise', 'caramelase'],
    },
    'carbonize': {
        word: 'carbonise',
        distractors: ['cerbonise', 'carbonisi', 'carbonase'],
    },
    'catalyze': {
        word: 'catalyse',
        distractors: ['cetalyse', 'catalysi', 'caalyse'],
    },
    'catastrophize': {
        word: 'catastrophise',
        distractors: ['cetastrophise', 'catastrophisi', 'catastrophase'],
    },
    'catastrophized': {
        word: 'catastrophised',
        distractors: ['cetastrophised', 'catastrophisid', 'catastrophased'],
    },
    'catechize': {
        word: 'catechise',
        distractors: ['cetechise', 'catichise', 'catechice'],
    },
    'categorization': {
        word: 'categorisation',
        distractors: ['cetegorisation', 'catigorisation', 'categorasation'],
    },
    'categorize': {
        word: 'categorise',
        distractors: ['cetegorise', 'catigorise', 'categorase'],
    },
    'catheterize': {
        word: 'catheterise',
        distractors: ['cetheterise', 'cathiterise', 'catheterase'],
    },
    'cauterization': {
        word: 'cauterisation',
        distractors: ['ceuterisation', 'cautirisation', 'cauterasation'],
    },
    'cauterize': {
        word: 'cauterise',
        distractors: ['ceuterise', 'cautirise', 'cauterase'],
    },
    'center': {
        word: 'centre',
        pronunciation: 'sen-tur',
        distractors: ['centar', 'sentre', 'centere'],
    },
    'centralization': {
        word: 'centralisation',
        distractors: ['centrelisation', 'cintralisation', 'centralasation'],
    },
    'channeled': {
        word: 'channelled',
        distractors: ['chennelled', 'channilled', 'chanelled'],
    },
    'characterization': {
        word: 'characterisation',
        distractors: ['cheracterisation', 'charactirisation', 'characterasation'],
    },
    'characterize': {
        word: 'characterise',
        distractors: ['cheracterise', 'charactirise', 'characterase'],
    },
    'charizing': {
        word: 'charising',
        distractors: ['cherising', 'charasing', 'chaising'],
    },
    'chemicalization': {
        word: 'chemicalisation',
        distractors: ['chemicelisation', 'chimicalisation', 'chemacalisation'],
    },
    'chocolatize': {
        word: 'chocolatise',
        distractors: ['chocoletise', 'chocolatisi', 'chocolatase'],
    },
    'chromatization': {
        word: 'chromatisation',
        distractors: ['chrometisation', 'chromatasation', 'chrumatisation'],
    },
    'circularization': {
        word: 'circularisation',
        distractors: ['circulerisation', 'carcularisation', 'circularisatiun'],
    },
    'civilization': {
        word: 'civilisation',
        pronunciation: 'siv-uh-ly-zay-shun',
        distractors: ['civilizasion', 'civilasation', 'civlisation'],
    },
    'civilized': {
        word: 'civilised',
        distractors: ['civilisid', 'cavilised', 'civlised'],
    },
    'clamor': {
        word: 'clamour',
        distractors: ['clemour', 'clamuur', 'clamoor'],
    },
    'clamoring': {
        word: 'clamouring',
        distractors: ['clemouring', 'clamourang', 'clamuuring'],
    },
    'climatized': {
        word: 'climatised',
        distractors: ['climetised', 'climatisid', 'clamatised'],
    },
    'colloquialize': {
        word: 'colloquialise',
        distractors: ['colloquielise', 'colloquialisi', 'colloquaalise'],
    },
    'colocalization': {
        word: 'colocalisation',
        distractors: ['colocelisation', 'colocalasation', 'culocalisation'],
    },
    'color': {
        word: 'colour',
        distractors: ['culour', 'coloor', 'coluor'],
    },
    'coloration': {
        word: 'colouration',
        distractors: ['colouretion', 'colourataon', 'culouration'],
    },
    'colorful': {
        word: 'colourful',
        pronunciation: 'kuh-lur-ful',
        distractors: ['colurful', 'colerful', 'coulourful'],
    },
    'coloring': {
        word: 'colouring',
        distractors: ['colourang', 'culouring', 'colooring'],
    },
    'colorize': {
        word: 'colourise',
        distractors: ['colourisi', 'colouraise', 'culourise'],
    },
    'commercialization': {
        word: 'commercialisation',
        distractors: ['commercielisation', 'commircialisation', 'commercaalisation'],
    },
    'commercialize': {
        word: 'commercialise',
        distractors: ['commercielise', 'commircialise', 'commercaalise'],
    },
    'commonize': {
        word: 'commonise',
        distractors: ['commonisi', 'commonase', 'cummonise'],
    },
    'communization': {
        word: 'communisation',
        distractors: ['communisetion', 'communasation', 'cummunisation'],
    },
    'compartmentalize': {
        word: 'compartmentalise',
        distractors: ['compertmentalise', 'compartmintalise', 'compartmentalase'],
    },
    'compassionize': {
        word: 'compassionise',
        distractors: ['compessionise', 'compassionisi', 'compassaonise'],
    },
    'computerization': {
        word: 'computerisation',
        distractors: ['computerisetion', 'computirisation', 'computerasation'],
    },
    'computerize': {
        word: 'computerise',
        distractors: ['computirise', 'computerase', 'cumputerise'],
    },
    'concretization': {
        word: 'concretisation',
        distractors: ['concretisetion', 'concritisation', 'concretasation'],
    },
    'concretize': {
        word: 'concretise',
        distractors: ['concritise', 'concretase', 'cuncretise'],
    },
    'confessionalization': {
        word: 'confessionalisation',
        distractors: ['confessionelisation', 'confissionalisation', 'confessaonalisation'],
    },
    'constructivize': {
        word: 'constructivise',
        distractors: ['constructivisi', 'constructavise', 'cunstructivise'],
    },
    'consumerization': {
        word: 'consumerisation',
        distractors: ['consumerisetion', 'consumirisation', 'consumerasation'],
    },
    'contemporize': {
        word: 'contemporise',
        distractors: ['contimporise', 'contemporase', 'cuntemporise'],
    },
    'continentalize': {
        word: 'continentalise',
        distractors: ['continentelise', 'continintalise', 'contanentalise'],
    },
    'contractualize': {
        word: 'contractualise',
        distractors: ['contrectualise', 'contractualisi', 'contractualase'],
    },
    'conventionalize': {
        word: 'conventionalise',
        distractors: ['conventionelise', 'convintionalise', 'conventaonalise'],
    },
    'counseling': {
        word: 'counselling',
        distractors: ['counsilling', 'counsellang', 'cuunselling'],
    },
    'counselor': {
        word: 'counsellor',
        distractors: ['counsillor', 'cuunsellor', 'coonsellor'],
    },
    'counterorganization': {
        word: 'counterorganisation',
        distractors: ['counterorgenisation', 'countirorganisation', 'counterorganasation'],
    },
    'counterpolarize': {
        word: 'counterpolarise',
        distractors: ['counterpolerise', 'countirpolarise', 'counterpolarase'],
    },
    'creolize': {
        word: 'creolise',
        distractors: ['criolise', 'creolase', 'creulise'],
    },
    'criminalization': {
        word: 'criminalisation',
        distractors: ['criminelisation', 'craminalisation', 'criminalisatiun'],
    },
    'criticize': {
        word: 'criticise',
        distractors: ['criticisi', 'craticise', 'criicise'],
    },
    'crystallization': {
        word: 'crystallisation',
        distractors: ['crystellisation', 'crystallasation', 'crystallisatiun'],
    },
    'crystallize': {
        word: 'crystallise',
        distractors: ['crystellise', 'crystallisi', 'crystallase'],
    },
    'curb': {
        word: 'kerb',
        pronunciation: 'kurb',
        distractors: ['kirb', 'cerb', 'karb'],
    },
    'customize': {
        word: 'customise',
        distractors: ['customisi', 'customase', 'custumise'],
    },
    'cyberize': {
        word: 'cyberise',
        distractors: ['cybirise', 'cyberase', 'cyerise'],
    },
    'cyclization': {
        word: 'cyclisation',
        distractors: ['cyclisetion', 'cyclasation', 'cyclisatiun'],
    },
    'cyrillization': {
        word: 'cyrillisation',
        distractors: ['cyrillisetion', 'cyrallisation', 'cyrillisatiun'],
    },
    'cyrillize': {
        word: 'cyrillise',
        distractors: ['cyrillisi', 'cyrallise', 'cyrllise'],
    },
    'danicize': {
        word: 'danicise',
        distractors: ['denicise', 'danicisi', 'danacise'],
    },
    'debituminization': {
        word: 'debituminisation',
        distractors: ['debituminisetion', 'dibituminisation', 'debatuminisation'],
    },
    'debuccalize': {
        word: 'debuccalise',
        distractors: ['debuccelise', 'dibuccalise', 'debuccalase'],
    },
    'decarbonize': {
        word: 'decarbonise',
        distractors: ['decerbonise', 'dicarbonise', 'decarbonase'],
    },
    'decentralization': {
        word: 'decentralisation',
        distractors: ['decentrelisation', 'dicentralisation', 'decentralasation'],
    },
    'decentralize': {
        word: 'decentralise',
        distractors: ['decentrelise', 'dicentralise', 'decentralase'],
    },
    'dechristianization': {
        word: 'dechristianisation',
        distractors: ['dechristienisation', 'dichristianisation', 'dechrastianisation'],
    },
    'decitizenize': {
        word: 'decitizenise',
        distractors: ['dicitizenise', 'decatizenise', 'deciizenise'],
    },
    'decivilize': {
        word: 'decivilise',
        distractors: ['dicivilise', 'decavilise', 'decvilise'],
    },
    'decolonize': {
        word: 'decolonise',
        distractors: ['dicolonise', 'decolonase', 'deculonise'],
    },
    'decolourize': {
        word: 'decolourise',
        distractors: ['dicolourise', 'decolourase', 'deculourise'],
    },
    'decriminalization': {
        word: 'decriminalisation',
        distractors: ['decriminelisation', 'dicriminalisation', 'decraminalisation'],
    },
    'decriminalize': {
        word: 'decriminalise',
        distractors: ['decriminelise', 'dicriminalise', 'decraminalise'],
    },
    'defamiliarize': {
        word: 'defamiliarise',
        distractors: ['defemiliarise', 'difamiliarise', 'defamaliarise'],
    },
    'defeminization': {
        word: 'defeminisation',
        distractors: ['defeminisetion', 'difeminisation', 'defemanisation'],
    },
    'defense': {
        word: 'defence',
        distractors: ['difence', 'deence', 'defnce'],
    },
    'defictionalization': {
        word: 'defictionalisation',
        distractors: ['defictionelisation', 'difictionalisation', 'defactionalisation'],
    },
    'deformalize': {
        word: 'deformalise',
        distractors: ['deformelise', 'diformalise', 'deformalase'],
    },
    'deglamorize': {
        word: 'deglamourise',
        distractors: ['deglemourise', 'diglamourise', 'deglamouraise'],
    },
    'degrammaticalize': {
        word: 'degrammaticalise',
        distractors: ['degremmaticalise', 'digrammaticalise', 'degrammatacalise'],
    },
    'dehumanization': {
        word: 'dehumanisation',
        distractors: ['dehumenisation', 'dihumanisation', 'dehumanasation'],
    },
    'dehumanize': {
        word: 'dehumanise',
        distractors: ['dehumenise', 'dihumanise', 'dehumanase'],
    },
    'dehumanizer': {
        word: 'dehumaniser',
        distractors: ['dehumeniser', 'dihumaniser', 'dehumanaser'],
    },
    'dehymenization': {
        word: 'dehymenisation',
        distractors: ['dehymenisetion', 'dihymenisation', 'dehymenasation'],
    },
    'dejudaize': {
        word: 'dejudaise',
        distractors: ['dejudeise', 'dijudaise', 'dejudaase'],
    },
    'dekulakize': {
        word: 'dekulakise',
        distractors: ['dekulekise', 'dikulakise', 'dekulakase'],
    },
    'delabialize': {
        word: 'delabialise',
        distractors: ['delebialise', 'dilabialise', 'delabaalise'],
    },
    'delocalize': {
        word: 'delocalise',
        distractors: ['delocelise', 'dilocalise', 'delocalase'],
    },
    'dematerialize': {
        word: 'dematerialise',
        distractors: ['demeterialise', 'dimaterialise', 'demateraalise'],
    },
    'demeanor': {
        word: 'demeanour',
        distractors: ['demeenour', 'dimeanour', 'demeanuur'],
    },
    'demineralization': {
        word: 'demineralisation',
        distractors: ['deminerelisation', 'dimineralisation', 'demaneralisation'],
    },
    'demobilization': {
        word: 'demobilisation',
        distractors: ['demobilisetion', 'dimobilisation', 'demobalisation'],
    },
    'democratization': {
        word: 'democratisation',
        distractors: ['democretisation', 'dimocratisation', 'democratasation'],
    },
    'democratize': {
        word: 'democratise',
        distractors: ['democretise', 'dimocratise', 'democratase'],
    },
    'demonetization': {
        word: 'demonetisation',
        distractors: ['demonetisetion', 'dimonetisation', 'demonetasation'],
    },
    'demonetize': {
        word: 'demonetise',
        distractors: ['dimonetise', 'demonetase', 'demunetise'],
    },
    'demoralization': {
        word: 'demoralisation',
        distractors: ['demorelisation', 'dimoralisation', 'demoralasation'],
    },
    'demoralize': {
        word: 'demoralise',
        distractors: ['demorelise', 'dimoralise', 'demoralase'],
    },
    'denarcotize': {
        word: 'denarcotise',
        distractors: ['denercotise', 'dinarcotise', 'denarcotase'],
    },
    'denasalize': {
        word: 'denasalise',
        distractors: ['denesalise', 'dinasalise', 'denasalase'],
    },
    'denationalization': {
        word: 'denationalisation',
        distractors: ['denetionalisation', 'dinationalisation', 'denataonalisation'],
    },
    'deoligarchization': {
        word: 'deoligarchisation',
        distractors: ['deoligerchisation', 'dioligarchisation', 'deolagarchisation'],
    },
    'depauperize': {
        word: 'depauperise',
        distractors: ['depeuperise', 'dipauperise', 'depauperase'],
    },
    'depersonalization': {
        word: 'depersonalisation',
        distractors: ['depersonelisation', 'dipersonalisation', 'depersonalasation'],
    },
    'dephilosophize': {
        word: 'dephilosophise',
        distractors: ['diphilosophise', 'dephalosophise', 'dephilusophise'],
    },
    'depolarization': {
        word: 'depolarisation',
        distractors: ['depolerisation', 'dipolarisation', 'depolarasation'],
    },
    'deprioritize': {
        word: 'deprioritise',
        distractors: ['diprioritise', 'depraoritise', 'depriuritise'],
    },
    'deputize': {
        word: 'deputise',
        distractors: ['diputise', 'deputase', 'depotise'],
    },
    'deradicalize': {
        word: 'deradicalise',
        distractors: ['deredicalise', 'diradicalise', 'deradacalise'],
    },
    'derealization': {
        word: 'derealisation',
        distractors: ['dereelisation', 'direalisation', 'derealasation'],
    },
    'desensitize': {
        word: 'desensitise',
        distractors: ['disensitise', 'desensatise', 'desnsitise'],
    },
    'desocialize': {
        word: 'desocialise',
        distractors: ['desocielise', 'disocialise', 'desocaalise'],
    },
    'destabilize': {
        word: 'destabilise',
        distractors: ['destebilise', 'distabilise', 'destabalise'],
    },
    'desynchronization': {
        word: 'desynchronisation',
        distractors: ['desynchronisetion', 'disynchronisation', 'desynchronasation'],
    },
    'detribalization': {
        word: 'detribalisation',
        distractors: ['detribelisation', 'ditribalisation', 'detrabalisation'],
    },
    'deverbalize': {
        word: 'deverbalise',
        distractors: ['deverbelise', 'diverbalise', 'deverbalase'],
    },
    'devitalize': {
        word: 'devitalise',
        distractors: ['devitelise', 'divitalise', 'devatalise'],
    },
    'dialecticalization': {
        word: 'dialecticalisation',
        distractors: ['dielecticalisation', 'dialicticalisation', 'daalecticalisation'],
    },
    'dialing': {
        word: 'dialling',
        distractors: ['dielling', 'daalling', 'diallang'],
    },
    'diarized': {
        word: 'diarised',
        distractors: ['dierised', 'diarisid', 'daarised'],
    },
    'diarrhea': {
        word: 'diarrhoea',
        pronunciation: 'dy-uh-ree-uh',
        distractors: ['diarhoea', 'diarroea', 'diarrhoeia'],
    },
    'dichotomize': {
        word: 'dichotomise',
        distractors: ['dichotomisi', 'dachotomise', 'dichutomise'],
    },
    'digitalize': {
        word: 'digitalise',
        distractors: ['digitelise', 'digitalisi', 'dagitalise'],
    },
    'digitize': {
        word: 'digitise',
        distractors: ['digitisi', 'dagitise', 'diitise'],
    },
    'digitizer': {
        word: 'digitiser',
        distractors: ['digitisir', 'dagitiser', 'digtiser'],
    },
    'disorganization': {
        word: 'disorganisation',
        distractors: ['disorgenisation', 'dasorganisation', 'disurganisation'],
    },
    'disorganize': {
        word: 'disorganise',
        pronunciation: 'dis-or-guh-nyz',
        distractors: ['disorgainse', 'disorginise', 'disorganese'],
    },
    'disorganized': {
        word: 'disorganised',
        distractors: ['disorgenised', 'disorganisid', 'dasorganised'],
    },
    'disseize': {
        word: 'disseise',
        distractors: ['dissiise', 'dasseise', 'dissiese'],
    },
    'dogmatize': {
        word: 'dogmatise',
        distractors: ['dogmetise', 'dogmatisi', 'dogmatase'],
    },
    'dollarization': {
        word: 'dollarisation',
        distractors: ['dollerisation', 'dollarasation', 'dullarisation'],
    },
    'draft': {
        word: 'draught',
        distractors: ['dreught', 'draoght', 'drught'],
    },
    'dramatize': {
        word: 'dramatise',
        distractors: ['drematise', 'dramatisi', 'dramatase'],
    },
    'dynamize': {
        word: 'dynamise',
        distractors: ['dynemise', 'dynamisi', 'dynamase'],
    },
    'economize': {
        word: 'economise',
        distractors: ['iconomise', 'economase', 'ecunomise'],
    },
    'edenization': {
        word: 'edenisation',
        distractors: ['edenisetion', 'idenisation', 'edenasation'],
    },
    'elliptize': {
        word: 'elliptise',
        distractors: ['illiptise', 'ellaptise', 'ellptise'],
    },
    'ellisize': {
        word: 'ellisise',
        distractors: ['illisise', 'ellasise', 'elisise'],
    },
    'empathize': {
        word: 'empathise',
        distractors: ['empethise', 'impathise', 'empathase'],
    },
    'emphasize': {
        word: 'emphasise',
        distractors: ['emphesise', 'imphasise', 'emphasase'],
    },
    'encyclopedia': {
        word: 'encyclopaedia',
        pronunciation: 'en-sy-kluh-pee-dee-uh',
        distractors: ['encyclopeadia', 'encyclopaidia', 'encylopaedia'],
    },
    'endeavor': {
        word: 'endeavour',
        distractors: ['endeevour', 'indeavour', 'endeavuur'],
    },
    'endeavoring': {
        word: 'endeavouring',
        distractors: ['endeevouring', 'endeavoaring', 'endeavourang'],
    },
    'energize': {
        word: 'energise',
        distractors: ['inergise', 'energase', 'enrgise'],
    },
    'energized': {
        word: 'energised',
        distractors: ['inergised', 'energased', 'enegised'],
    },
    'energizer': {
        word: 'energiser',
        distractors: ['inergiser', 'energaser', 'enegiser'],
    },
    'enolize': {
        word: 'enolise',
        distractors: ['inolise', 'enolaise', 'enulise'],
    },
    'enrollment': {
        word: 'enrolment',
        pronunciation: 'en-rohl-muhnt',
        distractors: ['enrolement', 'enrolmant', 'enroalment'],
    },
    'entitize': {
        word: 'entitise',
        distractors: ['intitise', 'entatise', 'enitise'],
    },
    'epitomize': {
        word: 'epitomise',
        distractors: ['ipitomise', 'epatomise', 'epitumise'],
    },
    'equalize': {
        word: 'equalise',
        distractors: ['equelise', 'iqualise', 'equalase'],
    },
    'equalizer': {
        word: 'equaliser',
        distractors: ['equeliser', 'iqualiser', 'equalaser'],
    },
    'esperantize': {
        word: 'esperantise',
        distractors: ['esperentise', 'isperantise', 'esperantase'],
    },
    'essentialize': {
        word: 'essentialise',
        distractors: ['essentielise', 'issentialise', 'essentaalise'],
    },
    'eternize': {
        word: 'eternise',
        distractors: ['iternise', 'eternase', 'etrnise'],
    },
    'etherize': {
        word: 'etherise',
        distractors: ['itherise', 'etherase', 'eterise'],
    },
    'euhemerization': {
        word: 'euhemerisation',
        distractors: ['euhemerisetion', 'iuhemerisation', 'euhemerasation'],
    },
    'euphemize': {
        word: 'euphemise',
        distractors: ['iuphemise', 'euphemase', 'eophemise'],
    },
    'europeanize': {
        word: 'europeanise',
        distractors: ['europeenise', 'iuropeanise', 'europeanase'],
    },
    'euthanize': {
        word: 'euthanise',
        distractors: ['euthenise', 'iuthanise', 'euthanase'],
    },
    'exemplarize': {
        word: 'exemplarise',
        distractors: ['exemplerise', 'ixemplarise', 'exemplarase'],
    },
    'experimentalize': {
        word: 'experimentalise',
        distractors: ['experimentelise', 'ixperimentalise', 'experamentalise'],
    },
    'explicitize': {
        word: 'explicitise',
        distractors: ['ixplicitise', 'explacitise', 'expicitise'],
    },
    'exponentialize': {
        word: 'exponentialise',
        distractors: ['exponentielise', 'ixponentialise', 'exponentaalise'],
    },
    'extemporize': {
        word: 'extemporise',
        distractors: ['ixtemporise', 'extemporase', 'extempurise'],
    },
    'exteriorization': {
        word: 'exteriorisation',
        distractors: ['exteriorisetion', 'ixteriorisation', 'exteraorisation'],
    },
    'exteriorize': {
        word: 'exteriorise',
        distractors: ['ixteriorise', 'exteraorise', 'exteriurise'],
    },
    'externalization': {
        word: 'externalisation',
        distractors: ['externelisation', 'ixternalisation', 'externalasation'],
    },
    'facialize': {
        word: 'facialise',
        distractors: ['fecialise', 'facialisi', 'facaalise'],
    },
    'factorize': {
        word: 'factorise',
        distractors: ['fectorise', 'factorisi', 'factorase'],
    },
    'facultize': {
        word: 'facultise',
        distractors: ['fecultise', 'facultisi', 'facultase'],
    },
    'familiarize': {
        word: 'familiarise',
        distractors: ['femiliarise', 'familiarisi', 'famaliarise'],
    },
    'fantasize': {
        word: 'fantasise',
        distractors: ['fentasise', 'fantasisi', 'fantasase'],
    },
    'favor': {
        word: 'favour',
        distractors: ['fevour', 'favuur', 'favoor'],
    },
    'federalization': {
        word: 'federalisation',
        distractors: ['federelisation', 'fideralisation', 'federalasation'],
    },
    'feminization': {
        word: 'feminisation',
        distractors: ['feminisetion', 'fiminisation', 'femanisation'],
    },
    'fertilize': {
        word: 'fertilise',
        distractors: ['firtilise', 'fertalise', 'ferilise'],
    },
    'fertilizer': {
        word: 'fertiliser',
        distractors: ['firtiliser', 'fertaliser', 'feriliser'],
    },
    'fervor': {
        word: 'fervour',
        distractors: ['firvour', 'fervuur', 'fervoor'],
    },
    'fetus': {
        word: 'foetus',
        distractors: ['foitus', 'fuetus', 'foetos'],
    },
    'feudalize': {
        word: 'feudalise',
        distractors: ['feudelise', 'fiudalise', 'feudalase'],
    },
    'fiber': {
        word: 'fibre',
        distractors: ['fibri', 'fabre', 'fibbre'],
    },
    'fictionalization': {
        word: 'fictionalisation',
        distractors: ['fictionelisation', 'factionalisation', 'fictiunalisation'],
    },
    'filipinization': {
        word: 'filipinisation',
        distractors: ['filipinisetion', 'falipinisation', 'filipinisatiun'],
    },
    'finalize': {
        word: 'finalise',
        distractors: ['finelise', 'finalisi', 'fanalise'],
    },
    'financialization': {
        word: 'financialisation',
        distractors: ['finencialisation', 'fanancialisation', 'financialisatiun'],
    },
    'flanderization': {
        word: 'flanderisation',
        distractors: ['flenderisation', 'flandirisation', 'flanderasation'],
    },
    'flavor': {
        word: 'flavour',
        distractors: ['flevour', 'flavuur', 'flavoor'],
    },
    'flavorless': {
        word: 'flavourless',
        distractors: ['flevourless', 'flavourliss', 'flavuurless'],
    },
    'fletcherize': {
        word: 'fletcherise',
        distractors: ['flitcherise', 'fletcherase', 'flecherise'],
    },
    'floridization': {
        word: 'floridisation',
        distractors: ['floridisetion', 'floradisation', 'fluridisation'],
    },
    'focalize': {
        word: 'focalise',
        distractors: ['focelise', 'focalisi', 'focalase'],
    },
    'foreignizing': {
        word: 'foreignising',
        distractors: ['foriignising', 'foreagnising', 'fureignising'],
    },
    'formalize': {
        word: 'formalise',
        distractors: ['formelise', 'formalisi', 'formalase'],
    },
    'formatize': {
        word: 'formatise',
        distractors: ['formetise', 'formatisi', 'formatase'],
    },
    'fossilize': {
        word: 'fossilise',
        distractors: ['fossilisi', 'fossalise', 'fussilise'],
    },
    'fossilizer': {
        word: 'fossiliser',
        distractors: ['fossilisir', 'fossaliser', 'fussiliser'],
    },
    'franklinize': {
        word: 'franklinise',
        distractors: ['frenklinise', 'franklinisi', 'franklanise'],
    },
    'fraternalize': {
        word: 'fraternalise',
        distractors: ['freternalise', 'fratirnalise', 'fraternalase'],
    },
    'frontalization': {
        word: 'frontalisation',
        distractors: ['frontelisation', 'frontalasation', 'fruntalisation'],
    },
    'fulfillment': {
        word: 'fulfilment',
        pronunciation: 'ful-fil-muhnt',
        distractors: ['fulfilmint', 'fulfilmant', 'fulfiment'],
    },
    'funeralize': {
        word: 'funeralise',
        distractors: ['funerelise', 'funiralise', 'funeralase'],
    },
    'gallicization': {
        word: 'gallicisation',
        distractors: ['gellicisation', 'gallacisation', 'gallicisatiun'],
    },
    'gallize': {
        word: 'gallise',
        distractors: ['gellise', 'gallisi', 'gallase'],
    },
    'galvanization': {
        word: 'galvanisation',
        distractors: ['gelvanisation', 'galvanasation', 'galvanisatiun'],
    },
    'galvanize': {
        word: 'galvanise',
        distractors: ['gelvanise', 'galvanisi', 'galvanase'],
    },
    'galvanizer': {
        word: 'galvaniser',
        distractors: ['gelvaniser', 'galvanisir', 'galvanaser'],
    },
    'gargarize': {
        word: 'gargarise',
        distractors: ['gergarise', 'gargarisi', 'gargarase'],
    },
    'gelatinize': {
        word: 'gelatinise',
        distractors: ['geletinise', 'gilatinise', 'gelatanise'],
    },
    'generalization': {
        word: 'generalisation',
        distractors: ['generelisation', 'gineralisation', 'generalasation'],
    },
    'generalize': {
        word: 'generalise',
        distractors: ['generelise', 'gineralise', 'generalase'],
    },
    'genericization': {
        word: 'genericisation',
        distractors: ['genericisetion', 'ginericisation', 'generacisation'],
    },
    'germanize': {
        word: 'germanise',
        distractors: ['germenise', 'girmanise', 'germanase'],
    },
    'ghettoization': {
        word: 'ghettoisation',
        distractors: ['ghettoisetion', 'ghittoisation', 'ghettoasation'],
    },
    'ghettoize': {
        word: 'ghettoise',
        distractors: ['ghittoise', 'ghettoase', 'ghettuise'],
    },
    'globalize': {
        word: 'globalise',
        distractors: ['globelise', 'globalisi', 'globalase'],
    },
    'globalizer': {
        word: 'globaliser',
        distractors: ['globeliser', 'globalisir', 'globalaser'],
    },
    'glottalization': {
        word: 'glottalisation',
        distractors: ['glottelisation', 'glottalasation', 'gluttalisation'],
    },
    'graecicization': {
        word: 'graecicisation',
        distractors: ['greecicisation', 'graicicisation', 'graecacisation'],
    },
    'grammarize': {
        word: 'grammarise',
        distractors: ['gremmarise', 'grammarisi', 'grammarase'],
    },
    'gray': {
        word: 'grey',
        distractors: ['griy', 'grrey', 'gery'],
    },
    'grecize': {
        word: 'grecise',
        distractors: ['gricise', 'grecase', 'grcise'],
    },
    'gynecologist': {
        word: 'gynaecologist',
        distractors: ['gyneecologist', 'gynaicologist', 'gynaecologast'],
    },
    'gynecology': {
        word: 'gynaecology',
        distractors: ['gyneecology', 'gynaicology', 'gynaeculogy'],
    },
    'habitualize': {
        word: 'habitualise',
        distractors: ['hebitualise', 'habitualisi', 'habatualise'],
    },
    'haitianization': {
        word: 'haitianisation',
        distractors: ['heitianisation', 'haatianisation', 'haitianisatiun'],
    },
    'harbor': {
        word: 'harbour',
        pronunciation: 'hahr-bur',
        distractors: ['harbur', 'harber', 'harboir'],
    },
    'harmonizer': {
        word: 'harmoniser',
        distractors: ['hermoniser', 'harmonisir', 'harmonaser'],
    },
    'hemoglobin': {
        word: 'haemoglobin',
        distractors: ['heemoglobin', 'haimoglobin', 'haemogloban'],
    },
    'hemorrhage': {
        word: 'haemorrhage',
        pronunciation: 'hem-uh-rij',
        distractors: ['haemorrage', 'haemorrhge', 'haemorrahge'],
    },
    'heteronormalize': {
        word: 'heteronormalise',
        distractors: ['heteronormelise', 'hiteronormalise', 'heteronormalase'],
    },
    'historize': {
        word: 'historise',
        distractors: ['historisi', 'hastorise', 'histurise'],
    },
    'hominization': {
        word: 'hominisation',
        distractors: ['hominisetion', 'homanisation', 'huminisation'],
    },
    'honor': {
        word: 'honour',
        distractors: ['hunour', 'honoor', 'honuor'],
    },
    'honorable': {
        word: 'honourable',
        distractors: ['honoureble', 'honourabli', 'hunourable'],
    },
    'horizontalize': {
        word: 'horizontalise',
        distractors: ['horizontelise', 'horizontalisi', 'horazontalise'],
    },
    'hospitalization': {
        word: 'hospitalisation',
        distractors: ['hospitelisation', 'hospatalisation', 'huspitalisation'],
    },
    'hospitalize': {
        word: 'hospitalise',
        distractors: ['hospitelise', 'hospitalisi', 'hospatalise'],
    },
    'humanize': {
        word: 'humanise',
        distractors: ['humenise', 'humanisi', 'humanase'],
    },
    'humorize': {
        word: 'humourise',
        distractors: ['humourisi', 'humouraise', 'humuurise'],
    },
    'hybridization': {
        word: 'hybridisation',
        distractors: ['hybridisetion', 'hybradisation', 'hybridisatiun'],
    },
    'hybridize': {
        word: 'hybridise',
        distractors: ['hybridisi', 'hybradise', 'hybidise'],
    },
    'hyperbolize': {
        word: 'hyperbolise',
        distractors: ['hypirbolise', 'hyperbolase', 'hyperbulise'],
    },
    'hypercolonize': {
        word: 'hypercolonise',
        distractors: ['hypircolonise', 'hypercolonase', 'hyperculonise'],
    },
    'hypnotize': {
        word: 'hypnotise',
        distractors: ['hypnotisi', 'hypnotase', 'hypnutise'],
    },
    'hypostatize': {
        word: 'hypostatise',
        distractors: ['hypostetise', 'hypostatisi', 'hypostatase'],
    },
    'hypothesize': {
        word: 'hypothesise',
        distractors: ['hypothisise', 'hypothesase', 'hyputhesise'],
    },
    'idealize': {
        word: 'idealise',
        distractors: ['ideelise', 'idialise', 'adealise'],
    },
    'idolize': {
        word: 'idolise',
        distractors: ['idolisi', 'adolise', 'idulise'],
    },
    'idolizer': {
        word: 'idoliser',
        distractors: ['idolisir', 'adoliser', 'iduliser'],
    },
    'immortalize': {
        word: 'immortalise',
        distractors: ['immortelise', 'immortalisi', 'ammortalise'],
    },
    'incentivize': {
        word: 'incentivise',
        distractors: ['incintivise', 'ancentivise', 'incntivise'],
    },
    'indigenization': {
        word: 'indigenisation',
        distractors: ['indigenisetion', 'indiginisation', 'andigenisation'],
    },
    'individualize': {
        word: 'individualise',
        distractors: ['individuelise', 'individualisi', 'andividualise'],
    },
    'industrialization': {
        word: 'industrialisation',
        distractors: ['industrielisation', 'andustrialisation', 'industrialisatiun'],
    },
    'industrialize': {
        word: 'industrialise',
        distractors: ['industrielise', 'industrialisi', 'andustrialise'],
    },
    'installment': {
        word: 'instalment',
        distractors: ['instelment', 'instalmint', 'anstalment'],
    },
    'institutionalization': {
        word: 'institutionalisation',
        distractors: ['institutionelisation', 'anstitutionalisation', 'institutiunalisation'],
    },
    'institutionalize': {
        word: 'institutionalise',
        distractors: ['institutionelise', 'institutionalisi', 'anstitutionalise'],
    },
    'instrumentalize': {
        word: 'instrumentalise',
        distractors: ['instrumentelise', 'instrumintalise', 'anstrumentalise'],
    },
    'intellectualize': {
        word: 'intellectualise',
        distractors: ['intellectuelise', 'intillectualise', 'antellectualise'],
    },
    'internalize': {
        word: 'internalise',
        distractors: ['internelise', 'intirnalise', 'anternalise'],
    },
    'internationalization': {
        word: 'internationalisation',
        distractors: ['internetionalisation', 'intirnationalisation', 'anternationalisation'],
    },
    'internationalize': {
        word: 'internationalise',
        distractors: ['internetionalise', 'intirnationalise', 'anternationalise'],
    },
    'iodization': {
        word: 'iodisation',
        distractors: ['iodisetion', 'aodisation', 'iudisation'],
    },
    'iodize': {
        word: 'iodise',
        distractors: ['iodisi', 'aodise', 'iudise'],
    },
    'ionization': {
        word: 'ionisation',
        distractors: ['ionisetion', 'aonisation', 'iunisation'],
    },
    'ionize': {
        word: 'ionise',
        distractors: ['ionisi', 'aonise', 'iunise'],
    },
    'islamize': {
        word: 'islamise',
        distractors: ['islemise', 'islamisi', 'aslamise'],
    },
    'isomerize': {
        word: 'isomerise',
        distractors: ['isomirise', 'asomerise', 'isumerise'],
    },
    'isotropization': {
        word: 'isotropisation',
        distractors: ['isotropisetion', 'asotropisation', 'isutropisation'],
    },
    'italicize': {
        word: 'italicise',
        distractors: ['itelicise', 'italicisi', 'atalicise'],
    },
    'jeopardize': {
        word: 'jeopardise',
        distractors: ['jeoperdise', 'jiopardise', 'jeopardase'],
    },
    'jewelry': {
        word: 'jewellery',
        distractors: ['jiwellery', 'jewllery', 'jewelery'],
    },
    'jordanization': {
        word: 'jordanisation',
        distractors: ['jordenisation', 'jordanasation', 'jurdanisation'],
    },
    'journalize': {
        word: 'journalise',
        distractors: ['journelise', 'journalisi', 'journalase'],
    },
    'judgment': {
        word: 'judgement',
        distractors: ['judgiment', 'jodgement', 'judement'],
    },
    'junglize': {
        word: 'junglise',
        distractors: ['junglisi', 'junglase', 'jonglise'],
    },
    'keratinization': {
        word: 'keratinisation',
        distractors: ['keretinisation', 'kiratinisation', 'keratanisation'],
    },
    'labeled': {
        word: 'labelled',
        distractors: ['lebelled', 'labilled', 'laelled'],
    },
    'labeling': {
        word: 'labelling',
        distractors: ['lebelling', 'labilling', 'labellang'],
    },
    'latinize': {
        word: 'latinise',
        distractors: ['letinise', 'latinisi', 'latanise'],
    },
    'legalize': {
        word: 'legalise',
        distractors: ['legelise', 'ligalise', 'legalase'],
    },
    'leukemia': {
        word: 'leukaemia',
        distractors: ['leukeemia', 'liukaemia', 'leukaemaa'],
    },
    'leveling': {
        word: 'levelling',
        distractors: ['livelling', 'levellang', 'levlling'],
    },
    'lexicalization': {
        word: 'lexicalisation',
        distractors: ['lexicelisation', 'lixicalisation', 'lexacalisation'],
    },
    'lexicalize': {
        word: 'lexicalise',
        distractors: ['lexicelise', 'lixicalise', 'lexacalise'],
    },
    'liquidizer': {
        word: 'liquidiser',
        distractors: ['liquidisir', 'laquidiser', 'liqoidiser'],
    },
    'literatize': {
        word: 'literatise',
        distractors: ['literetise', 'litiratise', 'lateratise'],
    },
    'localize': {
        word: 'localise',
        distractors: ['locelise', 'localisi', 'localase'],
    },
    'localized': {
        word: 'localised',
        distractors: ['locelised', 'localisid', 'localased'],
    },
    'lusitanization': {
        word: 'lusitanisation',
        distractors: ['lusitenisation', 'lusatanisation', 'lusitanisatiun'],
    },
    'lusitanize': {
        word: 'lusitanise',
        distractors: ['lusitenise', 'lusitanisi', 'lusatanise'],
    },
    'luster': {
        word: 'lustre',
        distractors: ['lustri', 'lostre', 'lutre'],
    },
    'machiavellize': {
        word: 'machiavellise',
        distractors: ['mechiavellise', 'machiavillise', 'machaavellise'],
    },
    'magnetization': {
        word: 'magnetisation',
        distractors: ['megnetisation', 'magnitisation', 'magnetasation'],
    },
    'magnetize': {
        word: 'magnetise',
        distractors: ['megnetise', 'magnitise', 'magnetase'],
    },
    'maneuver': {
        word: 'manoeuvre',
        distractors: ['menoeuvre', 'manoiuvre', 'manueuvre'],
    },
    'maoization': {
        word: 'maoisation',
        distractors: ['meoisation', 'maoasation', 'mauisation'],
    },
    'maoize': {
        word: 'maoise',
        distractors: ['meoise', 'maoisi', 'maoase'],
    },
    'marginalization': {
        word: 'marginalisation',
        distractors: ['merginalisation', 'marganalisation', 'marginalisatiun'],
    },
    'marginalize': {
        word: 'marginalise',
        distractors: ['merginalise', 'marginalisi', 'marganalise'],
    },
    'masculinize': {
        word: 'masculinise',
        distractors: ['mesculinise', 'masculinisi', 'masculanise'],
    },
    'materialization': {
        word: 'materialisation',
        distractors: ['meterialisation', 'matirialisation', 'materaalisation'],
    },
    'materialize': {
        word: 'materialise',
        distractors: ['meterialise', 'matirialise', 'materaalise'],
    },
    'matronize': {
        word: 'matronise',
        distractors: ['metronise', 'matronisi', 'matronase'],
    },
    'maximization': {
        word: 'maximisation',
        distractors: ['meximisation', 'maxamisation', 'maximisatiun'],
    },
    'maximize': {
        word: 'maximise',
        distractors: ['meximise', 'maximisi', 'maxamise'],
    },
    'mechanization': {
        word: 'mechanisation',
        distractors: ['mechenisation', 'michanisation', 'mechanasation'],
    },
    'mechanize': {
        word: 'mechanise',
        distractors: ['mechenise', 'michanise', 'mechanase'],
    },
    'mediatize': {
        word: 'mediatise',
        distractors: ['medietise', 'midiatise', 'medaatise'],
    },
    'mediumize': {
        word: 'mediumise',
        distractors: ['midiumise', 'medaumise', 'mediomise'],
    },
    'melanize': {
        word: 'melanise',
        distractors: ['melenise', 'milanise', 'melanase'],
    },
    'memorize': {
        word: 'memorise',
        distractors: ['mimorise', 'memorase', 'memurise'],
    },
    'mesmerize': {
        word: 'mesmerise',
        distractors: ['mismerise', 'mesmerase', 'meserise'],
    },
    'metabolize': {
        word: 'metabolise',
        distractors: ['metebolise', 'mitabolise', 'metabolase'],
    },
    'metallizer': {
        word: 'metalliser',
        distractors: ['metelliser', 'mitalliser', 'metallaser'],
    },
    'metastasize': {
        word: 'metastasise',
        distractors: ['metestasise', 'mitastasise', 'metastasase'],
    },
    'metropolize': {
        word: 'metropolise',
        distractors: ['mitropolise', 'metropolase', 'metrupolise'],
    },
    'militarization': {
        word: 'militarisation',
        distractors: ['militerisation', 'malitarisation', 'militarisatiun'],
    },
    'mineralizer': {
        word: 'mineraliser',
        distractors: ['minereliser', 'miniraliser', 'maneraliser'],
    },
    'minimization': {
        word: 'minimisation',
        distractors: ['minimisetion', 'manimisation', 'minimisatiun'],
    },
    'minimize': {
        word: 'minimise',
        distractors: ['minimisi', 'manimise', 'miimise'],
    },
    'misanthropize': {
        word: 'misanthropise',
        distractors: ['misenthropise', 'misanthropisi', 'masanthropise'],
    },
    'mischaracterization': {
        word: 'mischaracterisation',
        distractors: ['mischeracterisation', 'mischaractirisation', 'mascharacterisation'],
    },
    'miscognize': {
        word: 'miscognise',
        distractors: ['miscognisi', 'mascognise', 'miscugnise'],
    },
    'misogynize': {
        word: 'misogynise',
        distractors: ['misogynisi', 'masogynise', 'misugynise'],
    },
    'missionization': {
        word: 'missionisation',
        distractors: ['missionisetion', 'massionisation', 'missiunisation'],
    },
    'missionize': {
        word: 'missionise',
        distractors: ['missionisi', 'massionise', 'missiunise'],
    },
    'mobilization': {
        word: 'mobilisation',
        distractors: ['mobilisetion', 'mobalisation', 'mubilisation'],
    },
    'mobilize': {
        word: 'mobilise',
        distractors: ['mobilisi', 'mobalise', 'mubilise'],
    },
    'modeling': {
        word: 'modelling',
        distractors: ['modilling', 'modellang', 'mudelling'],
    },
    'modernization': {
        word: 'modernisation',
        distractors: ['modernisetion', 'modirnisation', 'modernasation'],
    },
    'modernize': {
        word: 'modernise',
        distractors: ['modirnise', 'modernase', 'mudernise'],
    },
    'molarize': {
        word: 'molarise',
        distractors: ['molerise', 'molarisi', 'molarase'],
    },
    'mold': {
        word: 'mould',
        distractors: ['muuld', 'moold', 'muold'],
    },
    'molding': {
        word: 'moulding',
        distractors: ['mouldang', 'muulding', 'moolding'],
    },
    'molochize': {
        word: 'molochise',
        distractors: ['molochisi', 'molochase', 'mulochise'],
    },
    'mom': {
        word: 'mum',
        distractors: ['mumm', 'mume', 'mua'],
    },
    'monophthongize': {
        word: 'monophthongise',
        distractors: ['monophthongisi', 'monophthongase', 'munophthongise'],
    },
    'monopolization': {
        word: 'monopolisation',
        distractors: ['monopolisetion', 'monopolasation', 'munopolisation'],
    },
    'monopolize': {
        word: 'monopolise',
        distractors: ['monopolisi', 'monopolase', 'munopolise'],
    },
    'moralize': {
        word: 'moralise',
        distractors: ['morelise', 'moralisi', 'moralase'],
    },
    'morphologize': {
        word: 'morphologise',
        distractors: ['morphologisi', 'morphologase', 'murphologise'],
    },
    'motorize': {
        word: 'motorise',
        distractors: ['motorisi', 'motorase', 'mutorise'],
    },
    'motorized': {
        word: 'motorised',
        distractors: ['motorisid', 'motorased', 'mutorised'],
    },
    'mundialization': {
        word: 'mundialisation',
        distractors: ['mundielisation', 'mundaalisation', 'mundialisatiun'],
    },
    'mythicize': {
        word: 'mythicise',
        distractors: ['mythicisi', 'mythacise', 'myticise'],
    },
    'mythologize': {
        word: 'mythologise',
        distractors: ['mythologisi', 'mythologase', 'mythulogise'],
    },
    'mythologizer': {
        word: 'mythologiser',
        distractors: ['mythologisir', 'mythologaser', 'mythulogiser'],
    },
    'nasalize': {
        word: 'nasalise',
        distractors: ['nesalise', 'nasalisi', 'nasalase'],
    },
    'nationalize': {
        word: 'nationalise',
        distractors: ['netionalise', 'nationalisi', 'nataonalise'],
    },
    'nativization': {
        word: 'nativisation',
        distractors: ['netivisation', 'natavisation', 'nativisatiun'],
    },
    'naturalization': {
        word: 'naturalisation',
        distractors: ['neturalisation', 'naturalasation', 'naturalisatiun'],
    },
    'naturize': {
        word: 'naturise',
        distractors: ['neturise', 'naturisi', 'naturase'],
    },
    'nebulizer': {
        word: 'nebuliser',
        distractors: ['nibuliser', 'nebulaser', 'neboliser'],
    },
    'neighborhood': {
        word: 'neighbourhood',
        pronunciation: 'nay-bur-hood',
        distractors: ['nieghbourhood', 'naighbourhood', 'neighbourhod'],
    },
    'neighboring': {
        word: 'neighbouring',
        distractors: ['niighbouring', 'neaghbouring', 'neighbuuring'],
    },
    'neutralization': {
        word: 'neutralisation',
        distractors: ['neutrelisation', 'niutralisation', 'neutralasation'],
    },
    'nominalization': {
        word: 'nominalisation',
        distractors: ['nominelisation', 'nomanalisation', 'numinalisation'],
    },
    'nominalize': {
        word: 'nominalise',
        distractors: ['nominelise', 'nominalisi', 'nomanalise'],
    },
    'nonalphabetized': {
        word: 'nonalphabetised',
        distractors: ['nonelphabetised', 'nonalphabitised', 'nonalphabetased'],
    },
    'normalization': {
        word: 'normalisation',
        distractors: ['normelisation', 'normalasation', 'nurmalisation'],
    },
    'normalize': {
        word: 'normalise',
        distractors: ['normelise', 'normalisi', 'normalase'],
    },
    'normalizer': {
        word: 'normaliser',
        distractors: ['normeliser', 'normalisir', 'normalaser'],
    },
    'norwegianization': {
        word: 'norwegianisation',
        distractors: ['norwegienisation', 'norwigianisation', 'norwegaanisation'],
    },
    'odorless': {
        word: 'odourless',
        distractors: ['odourliss', 'udourless', 'odoorless'],
    },
    'optimize': {
        word: 'optimise',
        distractors: ['optimisi', 'optamise', 'uptimise'],
    },
    'organization': {
        word: 'organisation',
        pronunciation: 'or-guh-ny-say-shun',
        distractors: ['organisasion', 'oganisation', 'organisaton'],
    },
    'organize': {
        word: 'organise',
        distractors: ['orgenise', 'organisi', 'organase'],
    },
    'organized': {
        word: 'organised',
        distractors: ['orgenised', 'organisid', 'organased'],
    },
    'organizer': {
        word: 'organiser',
        distractors: ['orgeniser', 'organisir', 'organaser'],
    },
    'orthographize': {
        word: 'orthographise',
        distractors: ['orthogrephise', 'orthographisi', 'orthographase'],
    },
    'orthopedic': {
        word: 'orthopaedic',
        distractors: ['orthopeedic', 'orthopaidic', 'orthopaedac'],
    },
    'ostracize': {
        word: 'ostracise',
        pronunciation: 'os-truh-syz',
        distractors: ['ostrasise', 'ostrecise', 'ostraccise'],
    },
    'overgeneralization': {
        word: 'overgeneralisation',
        distractors: ['overgenerelisation', 'ovirgeneralisation', 'overgeneralasation'],
    },
    'overspecialize': {
        word: 'overspecialise',
        distractors: ['overspecielise', 'ovirspecialise', 'overspecaalise'],
    },
    'pajamas': {
        word: 'pyjamas',
        distractors: ['pyjemas', 'pyamas', 'pyjmas'],
    },
    'palatalization': {
        word: 'palatalisation',
        distractors: ['pelatalisation', 'palatalasation', 'palatalisatiun'],
    },
    'palatalize': {
        word: 'palatalise',
        distractors: ['pelatalise', 'palatalisi', 'palatalase'],
    },
    'palettize': {
        word: 'palettise',
        distractors: ['pelettise', 'palittise', 'palettase'],
    },
    'palletized': {
        word: 'palletised',
        distractors: ['pelletised', 'pallitised', 'palletased'],
    },
    'pantheonization': {
        word: 'pantheonisation',
        distractors: ['pentheonisation', 'panthionisation', 'pantheonasation'],
    },
    'paralyze': {
        word: 'paralyse',
        distractors: ['peralyse', 'paralysi', 'paalyse'],
    },
    'paralyzed': {
        word: 'paralysed',
        distractors: ['peralysed', 'paralysid', 'parlysed'],
    },
    'parameterize': {
        word: 'parameterise',
        distractors: ['perameterise', 'paramiterise', 'parameterase'],
    },
    'parenthesize': {
        word: 'parenthesise',
        distractors: ['perenthesise', 'parinthesise', 'parenthesase'],
    },
    'parkerization': {
        word: 'parkerisation',
        distractors: ['perkerisation', 'parkirisation', 'parkerasation'],
    },
    'parlor': {
        word: 'parlour',
        distractors: ['perlour', 'parluur', 'parloor'],
    },
    'particularize': {
        word: 'particularise',
        distractors: ['perticularise', 'particularisi', 'partacularise'],
    },
    'pasteurizer': {
        word: 'pasteuriser',
        distractors: ['pesteuriser', 'pastiuriser', 'pasteuraser'],
    },
    'patronize': {
        word: 'patronise',
        distractors: ['petronise', 'patronisi', 'patronase'],
    },
    'pedestrianize': {
        word: 'pedestrianise',
        distractors: ['pedestrienise', 'pidestrianise', 'pedestraanise'],
    },
    'pediatric': {
        word: 'paediatric',
        distractors: ['peediatric', 'paidiatric', 'paedaatric'],
    },
    'pemmicanize': {
        word: 'pemmicanise',
        distractors: ['pemmicenise', 'pimmicanise', 'pemmacanise'],
    },
    'penalize': {
        word: 'penalise',
        distractors: ['penelise', 'pinalise', 'penalase'],
    },
    'perfectionize': {
        word: 'perfectionise',
        distractors: ['pirfectionise', 'perfectaonise', 'perfectiunise'],
    },
    'personalize': {
        word: 'personalise',
        distractors: ['personelise', 'pirsonalise', 'personalase'],
    },
    'personalized': {
        word: 'personalised',
        distractors: ['personelised', 'pirsonalised', 'personalased'],
    },
    'pessimize': {
        word: 'pessimise',
        distractors: ['pissimise', 'pessamise', 'pesimise'],
    },
    'petrolization': {
        word: 'petrolisation',
        distractors: ['petrolisetion', 'pitrolisation', 'petrolasation'],
    },
    'phantomize': {
        word: 'phantomise',
        distractors: ['phentomise', 'phantomisi', 'phantomase'],
    },
    'philippize': {
        word: 'philippise',
        distractors: ['philippisi', 'phalippise', 'phiippise'],
    },
    'phoneticize': {
        word: 'phoneticise',
        distractors: ['phoniticise', 'phonetacise', 'phuneticise'],
    },
    'picturization': {
        word: 'picturisation',
        distractors: ['picturisetion', 'pacturisation', 'picturisatiun'],
    },
    'pizer': {
        word: 'piser',
        distractors: ['pisir', 'paser', 'pisor'],
    },
    'plagiarize': {
        word: 'plagiarise',
        distractors: ['plegiarise', 'plagiarisi', 'plagaarise'],
    },
    'platformization': {
        word: 'platformisation',
        distractors: ['pletformisation', 'platformasation', 'platfurmisation'],
    },
    'plow': {
        word: 'plough',
        pronunciation: 'plow',
        distractors: ['plugh', 'ploughe', 'plowgh'],
    },
    'pluralization': {
        word: 'pluralisation',
        distractors: ['plurelisation', 'pluralasation', 'pluralisatiun'],
    },
    'pluralizer': {
        word: 'pluraliser',
        distractors: ['plureliser', 'pluralisir', 'pluralaser'],
    },
    'pneumatize': {
        word: 'pneumatise',
        distractors: ['pneumetise', 'pniumatise', 'pneumatase'],
    },
    'poetizer': {
        word: 'poetiser',
        distractors: ['poitiser', 'poetaser', 'puetiser'],
    },
    'polarization': {
        word: 'polarisation',
        distractors: ['polerisation', 'polarasation', 'pularisation'],
    },
    'polarize': {
        word: 'polarise',
        distractors: ['polerise', 'polarisi', 'polarase'],
    },
    'polarized': {
        word: 'polarised',
        distractors: ['polerised', 'polarisid', 'polarased'],
    },
    'polarizing': {
        word: 'polarising',
        distractors: ['polerising', 'polarasing', 'pularising'],
    },
    'polymerization': {
        word: 'polymerisation',
        distractors: ['polymerisetion', 'polymirisation', 'polymerasation'],
    },
    'polymerize': {
        word: 'polymerise',
        distractors: ['polymirise', 'polymeraise', 'pulymerise'],
    },
    'portalization': {
        word: 'portalisation',
        distractors: ['portelisation', 'portalasation', 'purtalisation'],
    },
    'powderize': {
        word: 'powderise',
        distractors: ['powdirise', 'powderase', 'puwderise'],
    },
    'preconization': {
        word: 'preconisation',
        distractors: ['preconisetion', 'priconisation', 'preconasation'],
    },
    'pressurize': {
        word: 'pressurise',
        distractors: ['prissurise', 'pressurase', 'pressorise'],
    },
    'pretense': {
        word: 'pretence',
        distractors: ['pritence', 'prtence', 'preence'],
    },
    'prioritize': {
        word: 'prioritise',
        distractors: ['prioritisi', 'praoritise', 'priuritise'],
    },
    'privatization': {
        word: 'privatisation',
        distractors: ['privetisation', 'pravatisation', 'privatisatiun'],
    },
    'professionalization': {
        word: 'professionalisation',
        distractors: ['professionelisation', 'profissionalisation', 'professaonalisation'],
    },
    'professionalize': {
        word: 'professionalise',
        distractors: ['professionelise', 'profissionalise', 'professaonalise'],
    },
    'projectization': {
        word: 'projectisation',
        distractors: ['projectisetion', 'projictisation', 'projectasation'],
    },
    'proselytize': {
        word: 'proselytise',
        distractors: ['prosilytise', 'proselytase', 'pruselytise'],
    },
    'pulverization': {
        word: 'pulverisation',
        distractors: ['pulverisetion', 'pulvirisation', 'pulverasation'],
    },
    'quantized': {
        word: 'quantised',
        distractors: ['quentised', 'quantisid', 'quantased'],
    },
    'quarterization': {
        word: 'quarterisation',
        distractors: ['querterisation', 'quartirisation', 'quarterasation'],
    },
    'racialized': {
        word: 'racialised',
        distractors: ['recialised', 'racialisid', 'racaalised'],
    },
    'rancor': {
        word: 'rancour',
        distractors: ['rencour', 'rancuur', 'rancoor'],
    },
    'randomization': {
        word: 'randomisation',
        distractors: ['rendomisation', 'randomasation', 'randumisation'],
    },
    'rationalization': {
        word: 'rationalisation',
        distractors: ['retionalisation', 'rataonalisation', 'ratiunalisation'],
    },
    'rationalize': {
        word: 'rationalise',
        distractors: ['retionalise', 'rationalisi', 'rataonalise'],
    },
    'realization': {
        word: 'realisation',
        distractors: ['reelisation', 'rialisation', 'realasation'],
    },
    'reanalyze': {
        word: 'reanalyse',
        distractors: ['reenalyse', 'rianalyse', 'reaalyse'],
    },
    'rebaptize': {
        word: 'rebaptise',
        distractors: ['rebeptise', 'ribaptise', 'rebaptase'],
    },
    'reckonize': {
        word: 'reckonise',
        distractors: ['rickonise', 'reckonase', 'reckunise'],
    },
    'recognized': {
        word: 'recognised',
        distractors: ['ricognised', 'recognased', 'recugnised'],
    },
    'reconnoiter': {
        word: 'reconnoitre',
        distractors: ['riconnoitre', 'reconnoatre', 'recunnoitre'],
    },
    'reenergization': {
        word: 'reenergisation',
        distractors: ['reenergisetion', 'rienergisation', 'reenergasation'],
    },
    'refactorization': {
        word: 'refactorisation',
        distractors: ['refectorisation', 'rifactorisation', 'refactorasation'],
    },
    'reflectorize': {
        word: 'reflectorise',
        distractors: ['riflectorise', 'reflectorase', 'reflecturise'],
    },
    'regulize': {
        word: 'regulise',
        distractors: ['rigulise', 'regulase', 'regolise'],
    },
    'religionize': {
        word: 'religionise',
        distractors: ['riligionise', 'relagionise', 'religiunise'],
    },
    'relocalize': {
        word: 'relocalise',
        distractors: ['relocelise', 'rilocalise', 'relocalase'],
    },
    'remobilization': {
        word: 'remobilisation',
        distractors: ['remobilisetion', 'rimobilisation', 'remobalisation'],
    },
    'remobilize': {
        word: 'remobilise',
        distractors: ['rimobilise', 'remobalise', 'remubilise'],
    },
    'remoralize': {
        word: 'remoralise',
        distractors: ['remorelise', 'rimoralise', 'remoralase'],
    },
    'resurrectionize': {
        word: 'resurrectionise',
        distractors: ['risurrectionise', 'resurrectaonise', 'resurrectiunise'],
    },
    'revalorization': {
        word: 'revalorisation',
        distractors: ['revelorisation', 'rivalorisation', 'revalorasation'],
    },
    'ritualize': {
        word: 'ritualise',
        distractors: ['rituelise', 'ritualisi', 'ratualise'],
    },
    'romanization': {
        word: 'romanisation',
        distractors: ['romenisation', 'romanasation', 'rumanisation'],
    },
    'romanticize': {
        word: 'romanticise',
        distractors: ['romenticise', 'romanticisi', 'romantacise'],
    },
    'rumor': {
        word: 'rumour',
        distractors: ['rumuur', 'romour', 'rumuor'],
    },
    'rumored': {
        word: 'rumoured',
        distractors: ['rumourid', 'rumuured', 'romoured'],
    },
    'ruralize': {
        word: 'ruralise',
        distractors: ['rurelise', 'ruralisi', 'ruralase'],
    },
    'sacralization': {
        word: 'sacralisation',
        distractors: ['secralisation', 'sacralasation', 'sacralisatiun'],
    },
    'sacramentalize': {
        word: 'sacramentalise',
        distractors: ['secramentalise', 'sacramintalise', 'sacramentalase'],
    },
    'sanitize': {
        word: 'sanitise',
        distractors: ['senitise', 'sanitisi', 'sanatise'],
    },
    'sanitizer': {
        word: 'sanitiser',
        distractors: ['senitiser', 'sanitisir', 'sanatiser'],
    },
    'sanskritize': {
        word: 'sanskritise',
        distractors: ['senskritise', 'sanskritisi', 'sanskratise'],
    },
    'satirize': {
        word: 'satirise',
        distractors: ['setirise', 'satirisi', 'satarise'],
    },
    'savior': {
        word: 'saviour',
        distractors: ['seviour', 'savaour', 'saviuur'],
    },
    'saviorism': {
        word: 'saviourism',
        distractors: ['seviourism', 'savaourism', 'saviuurism'],
    },
    'scandalization': {
        word: 'scandalisation',
        distractors: ['scendalisation', 'scandalasation', 'scandalisatiun'],
    },
    'schematization': {
        word: 'schematisation',
        distractors: ['schemetisation', 'schimatisation', 'schematasation'],
    },
    'scholasticize': {
        word: 'scholasticise',
        distractors: ['scholesticise', 'scholasticisi', 'scholastacise'],
    },
    'scrutinize': {
        word: 'scrutinise',
        pronunciation: 'skroo-tuh-nyz',
        distractors: ['scrutinese', 'scrutanise', 'scutinise'],
    },
    'secularization': {
        word: 'secularisation',
        distractors: ['seculerisation', 'sicularisation', 'secularasation'],
    },
    'securitization': {
        word: 'securitisation',
        distractors: ['securitisetion', 'sicuritisation', 'securatisation'],
    },
    'sensitization': {
        word: 'sensitisation',
        distractors: ['sensitisetion', 'sinsitisation', 'sensatisation'],
    },
    'sensitize': {
        word: 'sensitise',
        distractors: ['sinsitise', 'sensatise', 'senitise'],
    },
    'sentimentalize': {
        word: 'sentimentalise',
        distractors: ['sentimentelise', 'sintimentalise', 'sentamentalise'],
    },
    'serializer': {
        word: 'serialiser',
        distractors: ['serieliser', 'sirialiser', 'seraaliser'],
    },
    'signaling': {
        word: 'signalling',
        distractors: ['signelling', 'sagnalling', 'sigalling'],
    },
    'signalize': {
        word: 'signalise',
        distractors: ['signelise', 'signalisi', 'sagnalise'],
    },
    'singaporize': {
        word: 'singaporise',
        distractors: ['singeporise', 'singaporisi', 'sangaporise'],
    },
    'skeletonize': {
        word: 'skeletonise',
        distractors: ['skiletonise', 'skeletonase', 'skeletunise'],
    },
    'skeptic': {
        word: 'sceptic',
        distractors: ['sciptic', 'sceptac', 'scptic'],
    },
    'skeptical': {
        word: 'sceptical',
        distractors: ['scepticel', 'sciptical', 'sceptacal'],
    },
    'skepticism': {
        word: 'scepticism',
        distractors: ['scipticism', 'sceptacism', 'sceticism'],
    },
    'skillful': {
        word: 'skilful',
        distractors: ['skalful', 'skilfol', 'sklful'],
    },
    'smolder': {
        word: 'smoulder',
        distractors: ['smouldir', 'smuulder', 'smoolder'],
    },
    'snowplow': {
        word: 'snowplough',
        pronunciation: 'snoh-plow',
        distractors: ['snowplugh', 'snowploughe', 'snowplowgh'],
    },
    'socialization': {
        word: 'socialisation',
        distractors: ['socielisation', 'socaalisation', 'sucialisation'],
    },
    'socialize': {
        word: 'socialise',
        distractors: ['socielise', 'socialisi', 'socaalise'],
    },
    'socializer': {
        word: 'socialiser',
        distractors: ['socieliser', 'socialisir', 'socaaliser'],
    },
    'socratize': {
        word: 'socratise',
        distractors: ['socretise', 'socratisi', 'socratase'],
    },
    'solarize': {
        word: 'solarise',
        distractors: ['solerise', 'solarisi', 'solarase'],
    },
    'solemnize': {
        word: 'solemnise',
        distractors: ['solimnise', 'solemnase', 'sulemnise'],
    },
    'somatize': {
        word: 'somatise',
        distractors: ['sometise', 'somatisi', 'somatase'],
    },
    'southernization': {
        word: 'southernisation',
        distractors: ['southernisetion', 'southirnisation', 'southernasation'],
    },
    'specialization': {
        word: 'specialisation',
        distractors: ['specielisation', 'spicialisation', 'specaalisation'],
    },
    'specularize': {
        word: 'specularise',
        distractors: ['speculerise', 'spicularise', 'specularase'],
    },
    'spiritualize': {
        word: 'spiritualise',
        distractors: ['spirituelise', 'spiritualisi', 'sparitualise'],
    },
    'splendor': {
        word: 'splendour',
        distractors: ['splindour', 'splenduur', 'splendoor'],
    },
    'stabilization': {
        word: 'stabilisation',
        distractors: ['stebilisation', 'stabalisation', 'stabilisatiun'],
    },
    'stabilize': {
        word: 'stabilise',
        distractors: ['stebilise', 'stabilisi', 'stabalise'],
    },
    'stabilizer': {
        word: 'stabiliser',
        distractors: ['stebiliser', 'stabilisir', 'stabaliser'],
    },
    'standardization': {
        word: 'standardisation',
        distractors: ['stendardisation', 'standardasation', 'standardisatiun'],
    },
    'stigmatize': {
        word: 'stigmatise',
        distractors: ['stigmetise', 'stigmatisi', 'stagmatise'],
    },
    'stylized': {
        word: 'stylised',
        distractors: ['stylisid', 'stylased', 'stlised'],
    },
    'subsidization': {
        word: 'subsidisation',
        distractors: ['subsidisetion', 'subsadisation', 'subsidisatiun'],
    },
    'subsidize': {
        word: 'subsidise',
        distractors: ['subsidisi', 'subsadise', 'sobsidise'],
    },
    'subtilize': {
        word: 'subtilise',
        distractors: ['subtilisi', 'subtalise', 'sobtilise'],
    },
    'sulfur': {
        word: 'sulphur',
        distractors: ['solphur', 'suphur', 'sulhur'],
    },
    'sulfurized': {
        word: 'sulphurised',
        distractors: ['sulphurisid', 'sulphurased', 'solphurised'],
    },
    'summarization': {
        word: 'summarisation',
        distractors: ['summerisation', 'summarasation', 'summarisatiun'],
    },
    'summarize': {
        word: 'summarise',
        distractors: ['summaryse', 'summarisi', 'summarase'],
    },
    'syllogizer': {
        word: 'syllogiser',
        distractors: ['syllogisir', 'syllogaser', 'syllugiser'],
    },
    'symbolization': {
        word: 'symbolisation',
        distractors: ['symbolisetion', 'symbolasation', 'symbulisation'],
    },
    'symbolize': {
        word: 'symbolise',
        distractors: ['symbolisi', 'symbolase', 'symbulise'],
    },
    'synchronization': {
        word: 'synchronisation',
        distractors: ['synchronisetion', 'synchronasation', 'synchrunisation'],
    },
    'synchronize': {
        word: 'synchronise',
        distractors: ['synchronisi', 'synchronase', 'synchrunise'],
    },
    'synesthesia': {
        word: 'synaesthesia',
        pronunciation: 'sin-uhs-thee-zhuh',
        distractors: ['synasthesia', 'synaesthsia', 'synaesthesa'],
    },
    'synonymize': {
        word: 'synonymise',
        distractors: ['synonymisi', 'synonymase', 'synunymise'],
    },
    'synthesize': {
        word: 'synthesise',
        distractors: ['synthisise', 'synthesase', 'synhesise'],
    },
    'syrianization': {
        word: 'syrianisation',
        distractors: ['syrienisation', 'syraanisation', 'syrianisatiun'],
    },
    'systematize': {
        word: 'systematise',
        distractors: ['systemetise', 'systimatise', 'systematase'],
    },
    'systemizer': {
        word: 'systemiser',
        distractors: ['systimiser', 'systemaser', 'sysemiser'],
    },
    'televisualization': {
        word: 'televisualisation',
        distractors: ['televisuelisation', 'tilevisualisation', 'televasualisation'],
    },
    'templatize': {
        word: 'templatise',
        distractors: ['templetise', 'timplatise', 'templatase'],
    },
    'temporizer': {
        word: 'temporiser',
        distractors: ['timporiser', 'temporaser', 'tempuriser'],
    },
    'tenderize': {
        word: 'tenderise',
        distractors: ['tinderise', 'tenderase', 'tenerise'],
    },
    'tenderizer': {
        word: 'tenderiser',
        distractors: ['tinderiser', 'tenderaser', 'teneriser'],
    },
    'terrorize': {
        word: 'terrorise',
        distractors: ['tirrorise', 'terrorase', 'terrurise'],
    },
    'texturize': {
        word: 'texturise',
        distractors: ['tixturise', 'texturase', 'textorise'],
    },
    'thagomizer': {
        word: 'thagomiser',
        distractors: ['thegomiser', 'thagomisir', 'thagomaser'],
    },
    'thematicize': {
        word: 'thematicise',
        distractors: ['themeticise', 'thimaticise', 'thematacise'],
    },
    'theorize': {
        word: 'theorise',
        distractors: ['thiorise', 'theorase', 'theurise'],
    },
    'therapize': {
        word: 'therapise',
        distractors: ['therepise', 'thirapise', 'therapase'],
    },
    'tibetanization': {
        word: 'tibetanisation',
        distractors: ['tibetenisation', 'tibitanisation', 'tabetanisation'],
    },
    'tibetanize': {
        word: 'tibetanise',
        distractors: ['tibetenise', 'tibitanise', 'tabetanise'],
    },
    'timonize': {
        word: 'timonise',
        distractors: ['timonisi', 'tamonise', 'timunise'],
    },
    'tire': {
        word: 'tyre',
        distractors: ['tyri', 'tyyre', 'tyrre'],
    },
    'tokenization': {
        word: 'tokenisation',
        distractors: ['tokenisetion', 'tokinisation', 'tokenasation'],
    },
    'tokiponize': {
        word: 'tokiponise',
        distractors: ['tokiponisi', 'tokaponise', 'tukiponise'],
    },
    'transparentize': {
        word: 'transparentise',
        distractors: ['trensparentise', 'transparintise', 'transparentase'],
    },
    'traumatize': {
        word: 'traumatise',
        distractors: ['treumatise', 'traumatisi', 'traumatase'],
    },
    'traveled': {
        word: 'travelled',
        distractors: ['trevelled', 'travilled', 'traelled'],
    },
    'traveling': {
        word: 'travelling',
        distractors: ['trevelling', 'travilling', 'travellang'],
    },
    'tropologize': {
        word: 'tropologise',
        distractors: ['tropologisi', 'tropologase', 'trupologise'],
    },
    'tumor': {
        word: 'tumour',
        distractors: ['tumuur', 'tomour', 'tumuor'],
    },
    'turbanize': {
        word: 'turbanise',
        distractors: ['turbenise', 'turbanisi', 'turbanase'],
    },
    'tyrannize': {
        word: 'tyrannise',
        distractors: ['tyrennise', 'tyrannisi', 'tyrannase'],
    },
    'unanalyzed': {
        word: 'unanalysed',
        distractors: ['unenalysed', 'unanalysid', 'onanalysed'],
    },
    'unauthorized': {
        word: 'unauthorised',
        distractors: ['uneuthorised', 'unauthorisid', 'unauthorased'],
    },
    'uncivilize': {
        word: 'uncivilise',
        distractors: ['uncivilisi', 'uncavilise', 'oncivilise'],
    },
    'underrealized': {
        word: 'underrealised',
        distractors: ['underreelised', 'undirrealised', 'underrealased'],
    },
    'underrecognize': {
        word: 'underrecognise',
        distractors: ['undirrecognise', 'underrecognase', 'underrecugnise'],
    },
    'unionize': {
        word: 'unionise',
        distractors: ['unionisi', 'unaonise', 'uniunise'],
    },
    'unionized': {
        word: 'unionised',
        distractors: ['unionisid', 'unaonised', 'uniunised'],
    },
    'unitize': {
        word: 'unitise',
        distractors: ['unitisi', 'unatise', 'onitise'],
    },
    'unmetamorphized': {
        word: 'unmetamorphised',
        distractors: ['unmetemorphised', 'unmitamorphised', 'unmetamorphased'],
    },
    'unrealize': {
        word: 'unrealise',
        distractors: ['unreelise', 'unrialise', 'unrealase'],
    },
    'unrecognize': {
        word: 'unrecognise',
        distractors: ['unricognise', 'unrecognase', 'unrecugnise'],
    },
    'unsanitized': {
        word: 'unsanitised',
        distractors: ['unsenitised', 'unsanitisid', 'unsanatised'],
    },
    'vampirization': {
        word: 'vampirisation',
        distractors: ['vempirisation', 'vamparisation', 'vampirisatiun'],
    },
    'vapor': {
        word: 'vapour',
        distractors: ['vepour', 'vapuur', 'vapoor'],
    },
    'vaporize': {
        word: 'vapourise',
        distractors: ['vapourisi', 'vapouraise', 'vepourise'],
    },
    'vascularize': {
        word: 'vascularise',
        distractors: ['vescularise', 'vascularisi', 'vascularase'],
    },
    'vasectomize': {
        word: 'vasectomise',
        distractors: ['vesectomise', 'vasictomise', 'vasectomase'],
    },
    'vectorize': {
        word: 'vectorise',
        distractors: ['victorise', 'vectorase', 'vecturise'],
    },
    'velarize': {
        word: 'velarise',
        distractors: ['velerise', 'vilarise', 'velarase'],
    },
    'velocitization': {
        word: 'velocitisation',
        distractors: ['velocitisetion', 'vilocitisation', 'velocatisation'],
    },
    'velocitize': {
        word: 'velocitise',
        distractors: ['vilocitise', 'velocatise', 'velucitise'],
    },
    'verbalize': {
        word: 'verbalise',
        distractors: ['verbelise', 'virbalise', 'verbalase'],
    },
    'victimization': {
        word: 'victimisation',
        distractors: ['victimisetion', 'vactimisation', 'victimisatiun'],
    },
    'victimize': {
        word: 'victimise',
        distractors: ['victimisi', 'vactimise', 'vicimise'],
    },
    'vietnamization': {
        word: 'vietnamisation',
        distractors: ['vietnemisation', 'viitnamisation', 'vaetnamisation'],
    },
    'virtualization': {
        word: 'virtualisation',
        distractors: ['virtuelisation', 'vartualisation', 'virtualisatiun'],
    },
    'visualization': {
        word: 'visualisation',
        distractors: ['visuelisation', 'vasualisation', 'visualisatiun'],
    },
    'visualize': {
        word: 'visualise',
        distractors: ['visuelise', 'visualisi', 'vasualise'],
    },
    'vitriolize': {
        word: 'vitriolise',
        distractors: ['vitriolisi', 'vatriolise', 'vitriulise'],
    },
    'vocalizer': {
        word: 'vocaliser',
        distractors: ['voceliser', 'vocalisir', 'vocalaser'],
    },
    'volcanization': {
        word: 'volcanisation',
        distractors: ['volcenisation', 'volcanasation', 'volcanisatiun'],
    },
    'volumize': {
        word: 'volumise',
        distractors: ['volumisi', 'volumase', 'vulumise'],
    },
    'vulcanize': {
        word: 'vulcanise',
        distractors: ['vulcenise', 'vulcanisi', 'vulcanase'],
    },
    'vulcanizer': {
        word: 'vulcaniser',
        distractors: ['vulceniser', 'vulcanisir', 'vulcanaser'],
    },
    'weatherize': {
        word: 'weatherise',
        distractors: ['weetherise', 'wiatherise', 'weatherase'],
    },
    'webize': {
        word: 'webise',
        distractors: ['wibise', 'webase', 'weise'],
    },
    'weimarization': {
        word: 'weimarisation',
        distractors: ['weimerisation', 'wiimarisation', 'weamarisation'],
    },
    'westernize': {
        word: 'westernise',
        distractors: ['wisternise', 'westernase', 'wesernise'],
    },
    'whitenization': {
        word: 'whitenisation',
        distractors: ['whitenisetion', 'whitinisation', 'whatenisation'],
    },
    'woolen': {
        word: 'woollen',
        distractors: ['woollin', 'wuollen', 'wollen'],
    },
    'xenization': {
        word: 'xenisation',
        distractors: ['xenisetion', 'xinisation', 'xenasation'],
    },
};
