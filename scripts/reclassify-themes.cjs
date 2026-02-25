/**
 * reclassify-themes.cjs
 *
 * Reclassifies every word in the spelling bee word bank into accurate semantic themes.
 * Accuracy is the ONLY criterion — no splitting large themes, no merging thin ones.
 *
 * Three-pass approach:
 *   Pass 1: Check if the WORD ITSELF is in a curated word→theme lookup
 *   Pass 2: Check the DEFINITION against keyword patterns (strict \b boundaries)
 *   Pass 3: Looser fallback patterns for remaining unclassified words
 *   Default: 'everyday' for truly generic utility words
 *
 * Usage: node scripts/reclassify-themes.cjs [--dry-run]
 */
var fs = require('fs');
var path = require('path');

var DRY_RUN = process.argv.includes('--dry-run');
var wordsDir = path.join(__dirname, '..', 'src', 'domains', 'spelling', 'words');
var tierFiles = ['tier1', 'tier2', 'tier3', 'tier4', 'tier5', 'tier5-scripps', 'tier5-state'];

// ─── PASS 1: Word-level lookup ──────────────────────────────────────────────
// Handles short/ambiguous words where the word ITSELF tells you the theme.

var WORD_THEME = {
  // ── animals ──
  cat: 'animals', dog: 'animals', pig: 'animals', hen: 'animals', ram: 'animals',
  cow: 'animals', bat: 'animals', ant: 'animals', ape: 'animals', eel: 'animals',
  elk: 'animals', emu: 'animals', ewe: 'animals', fox: 'animals', gnu: 'animals',
  hog: 'animals', jay: 'animals', kit: 'animals', koi: 'animals', owl: 'animals',
  pup: 'animals', rat: 'animals', yak: 'animals', cub: 'animals', doe: 'animals',
  bug: 'animals', bee: 'animals', fly: 'animals', colt: 'animals', calf: 'animals',
  foal: 'animals', lamb: 'animals', fawn: 'animals', mare: 'animals', mule: 'animals',
  newt: 'animals', wren: 'animals', crab: 'animals', frog: 'animals', toad: 'animals',
  moth: 'animals', slug: 'animals', clam: 'animals', mink: 'animals', lion: 'animals',
  bear: 'animals', deer: 'animals', wolf: 'animals', duck: 'animals', seal: 'animals',
  swan: 'animals', lark: 'animals', hawk: 'animals', hare: 'animals', mole: 'animals',
  crow: 'animals', dove: 'animals', fish: 'animals', goat: 'animals', pony: 'animals',
  bull: 'animals', stag: 'animals', boar: 'animals', lynx: 'animals',
  sting: 'animals', gnaw: 'animals', hatch: 'animals',
  bred: 'animals',
  hippopotami: 'animals',
  herd: 'animals', hound: 'animals', whisker: 'animals',
  swoop: 'actions', esquamulose: 'animals',
  // moved from animals: net→tools, kit→everyday, scat→actions, decoy→actions, nocturnal→time
  symbiosis: 'nature', camouflage: 'nature', specimen: 'science',

  // ── food ──
  ham: 'food', jam: 'food', pie: 'food', yam: 'food', fig: 'food',
  nut: 'food', bun: 'food', tea: 'food', rye: 'food', oat: 'food',
  cob: 'food', swig: 'food', chug: 'food', whip: 'food',
  feast: 'food', broth: 'food', snack: 'food',
  restaurant: 'food', agriculture: 'food',
  raw: 'food', estaminet: 'food', cantaloupe: 'food',
  // moved from food: thicken→actions, booth→home, skimp→actions, surfeit→quantity, recherche→everyday, staphylococci→health

  // ── body ──
  rib: 'body', hip: 'body', lip: 'body', jaw: 'body',
  toe: 'body', shin: 'body', palm: 'body', cheek: 'body', snot: 'body',
  scab: 'body', strand: 'body', chafe: 'body',
  lap: 'body', heel: 'body', finger: 'body', eyebrow: 'body', eyelash: 'body',
  shank: 'body', heartbeat: 'body', ambidextrous: 'body',
  cymotrichous: 'body', callipygian: 'body', pulchritude: 'body',
  pulchritudinous: 'body', gubernaculum: 'body',
  genuflect: 'body',
  // moved from body: gum→food, stitch→clothing, flake→texture, tumescent→health

  // ── clothing ──
  hat: 'clothing', cap: 'clothing', wig: 'clothing', hem: 'clothing',
  bow: 'clothing', bib: 'clothing', vest: 'clothing', frill: 'clothing',
  cape: 'clothing', toupee: 'clothing', lingerie: 'clothing',
  fashionable: 'clothing',
  gown: 'clothing', faux: 'clothing', minaudiere: 'clothing',
  // moved from clothing: primp→actions (means to groom oneself)

  // ── home ──
  mug: 'home', cup: 'home', jug: 'home', lid: 'home', jar: 'home',
  pan: 'home', pot: 'home', mop: 'home', cot: 'home', mat: 'home',
  rug: 'home', bin: 'home', tub: 'home', fan: 'home', peg: 'home',
  clasp: 'home', clip: 'home', wheel: 'home', stool: 'home', bead: 'home',
  stain: 'home', chain: 'home', notch: 'home', tool: 'home', pole: 'home',
  chandelier: 'home', parquet: 'home',
  rim: 'home', yarn: 'home', cord: 'home', foil: 'home', twine: 'home',
  spool: 'home', thumbtack: 'home', parcel: 'home', clutter: 'home',
  newspaper: 'home', lean: 'home', corner: 'home', bleach: 'home',
  immaculate: 'home', snoop: 'home',

  // ── travel ──
  bus: 'travel', van: 'travel', cab: 'travel', car: 'travel', jet: 'travel',
  map: 'travel', hub: 'travel', zone: 'travel', train: 'travel',
  intersection: 'travel', excursion: 'travel',
  crossroads: 'travel', depot: 'travel', adventure: 'travel',
  dirigible: 'travel', blimp: 'travel', souvenir: 'travel',

  // ── earth ──
  mud: 'earth', ore: 'earth', gem: 'earth', pit: 'earth', slope: 'earth',
  cleft: 'earth', isthmus: 'earth', archipelago: 'earth',
  bog: 'earth', north: 'earth', ground: 'earth', south: 'earth', globe: 'earth',
  county: 'earth', plain: 'earth', hemisphere: 'earth', plateau: 'earth',
  heath: 'earth', subterranean: 'earth', tellurian: 'earth',
  appalachian: 'earth', couloir: 'earth', toponym: 'earth', endemic: 'earth',

  // ── weather ──
  fog: 'weather', ice: 'weather', dew: 'weather', frost: 'weather',
  froze: 'weather', sun: 'weather', moon: 'weather',
  constellation: 'science',

  // ── plants ──
  log: 'plants', oak: 'plants', elm: 'plants', ivy: 'plants', bud: 'plants',
  sap: 'plants', lop: 'plants', garden: 'plants', bouquet: 'plants',
  thrive: 'plants',

  // ── water ──
  dip: 'water', dam: 'water', bay: 'water', oar: 'water', wet: 'water',
  bob: 'water', congelation: 'water',

  // ── fire ──
  ash: 'fire',

  // ── tools ──
  pen: 'tools', axe: 'tools', saw: 'tools', awl: 'tools', nib: 'tools',
  snare: 'tools', arrowhead: 'tools', stopwatch: 'tools', semaphore: 'tools',
  shaft: 'tools', spur: 'tools',

  // ── music ──
  gig: 'music', hum: 'music',

  // ── sports ──
  gym: 'sports', ski: 'sports', win: 'sports', aim: 'sports',
  chess: 'sports', checker: 'sports', champ: 'sports',
  relay: 'sports', shot: 'sports', round: 'sports', join: 'sports',
  play: 'sports', skateboard: 'sports',

  // ── actions ──
  run: 'actions', hop: 'actions', jog: 'actions', dig: 'actions', hug: 'actions',
  mix: 'actions', rip: 'actions', nod: 'actions', tag: 'actions', tap: 'actions',
  wag: 'actions', jab: 'actions', tug: 'actions', dab: 'actions', pat: 'actions',
  rub: 'actions', zip: 'actions', grab: 'actions', chop: 'actions', toss: 'actions',
  hit: 'actions', stop: 'actions', skip: 'actions', spin: 'actions', drop: 'actions',
  flip: 'actions', slid: 'actions', shut: 'actions', throw: 'actions', fetch: 'actions',
  shook: 'actions', shred: 'actions', snag: 'actions', fled: 'actions', plop: 'actions',
  swap: 'actions', scan: 'actions', stare: 'actions', peep: 'actions',
  dug: 'actions', hid: 'actions', chomp: 'actions', scram: 'actions',
  step: 'actions', stomp: 'actions', blend: 'actions', split: 'actions',
  flop: 'actions', chose: 'actions', close: 'actions', share: 'actions',
  trace: 'actions', escape: 'actions', steal: 'actions', avoid: 'actions',
  destroy: 'actions', repeat: 'actions', shorten: 'actions', emerge: 'actions',
  scour: 'actions', gouge: 'actions', moisten: 'actions', shatter: 'actions',
  replace: 'actions', sort: 'actions', spoil: 'actions',
  disappear: 'actions', misplace: 'actions', disobey: 'actions',
  rewrite: 'actions', overreact: 'actions', uncover: 'actions',
  untangle: 'actions', reunite: 'actions', misbehave: 'actions', mismatch: 'actions',
  ricochet: 'actions', discombobulate: 'actions', disambiguate: 'actions',
  ameliorate: 'actions', acquiesce: 'actions',

  // ── feelings ── (TRUE emotions, moods, emotional states only)
  joy: 'feelings', awe: 'feelings', woe: 'feelings', ire: 'feelings',
  sob: 'feelings', grin: 'feelings', frown: 'feelings',
  whimper: 'feelings', enthusiasm: 'feelings',
  restlessness: 'feelings', schadenfreude: 'feelings',
  nonchalant: 'feelings', ebullient: 'feelings', morose: 'feelings',
  lachrymose: 'feelings', sanguine: 'feelings',
  peaceful: 'feelings', insatiable: 'feelings', querulousness: 'feelings',
  imbroglio: 'everyday', vulnerable: 'feelings',
  // moved out of feelings:
  prim: 'character', beg: 'communication', plead: 'communication',
  bad: 'everyday', cool: 'everyday', stern: 'character', devout: 'character',
  danger: 'feelings', turmoil: 'feelings', absurd: 'mind',
  outrageous: 'character', unkind: 'character', impatient: 'character',
  uncomfortable: 'feelings', spontaneity: 'actions',
  sacrilege: 'law', sacrosanct: 'law', obeisance: 'actions',
  ascetic: 'character', gratuitous: 'money', unconscionable: 'law',
  vitriolic: 'character', vituperative: 'character',
  insouciant: 'feelings', insouciance: 'feelings',
  sangfroid: 'feelings', vivacious: 'feelings', conscience: 'mind',

  // ── character ──
  polite: 'character', selfishness: 'character',
  determination: 'character', conscientious: 'character', meticulous: 'character',
  fastidious: 'character', punctilious: 'character', obsequious: 'character',
  cantankerous: 'character', irascible: 'character', obstreperous: 'character',
  indefatigable: 'character', quixotic: 'character', supercilious: 'character',
  pusillanimous: 'character', magnanimous: 'character',
  mischievous: 'character', mischief: 'character', amiable: 'character',
  audacious: 'character', resilient: 'character',
  prowess: 'character', powerful: 'character', disingenuous: 'character',
  veracious: 'character', veridical: 'character', assiduous: 'character',
  presumptuous: 'character', redoubtable: 'character',
  knowledgeable: 'character', strenuous: 'character', phlegmatic: 'character',
  sophomoric: 'character', fatuous: 'character', lax: 'character',

  // ── mind ──
  solve: 'mind', smart: 'mind', wise: 'mind',
  epiphany: 'mind', pedagogy: 'mind', didactic: 'mind',
  erudite: 'mind', perspicuous: 'mind', scrutinize: 'mind',
  paradox: 'mind', dilemma: 'mind', labyrinth: 'mind',
  labyrinthine: 'mind', paradigm: 'mind',
  imagination: 'mind', daydream: 'mind', nonsense: 'mind', perspective: 'mind',
  observation: 'mind', synesthesia: 'mind', solipsism: 'mind',
  omphaloskepsis: 'mind', oblivion: 'mind', velleity: 'mind',
  recondite: 'mind', cryptic: 'mind', ploy: 'mind',
  procrastination: 'mind', tsundoku: 'mind',

  // ── quantity ──
  lot: 'quantity', bit: 'quantity', few: 'quantity',
  thin: 'quantity', thick: 'quantity', slim: 'quantity', chunk: 'quantity',
  stub: 'quantity', clump: 'quantity', gob: 'quantity', nub: 'quantity',
  big: 'quantity', bunch: 'quantity', plethora: 'quantity', deep: 'quantity',
  infinitesimal: 'quantity',

  // ── texture ──
  wax: 'texture', gloss: 'texture', blunt: 'texture',
  tangible: 'texture',

  // ── light ──
  dim: 'light', glow: 'light', shade: 'light', dark: 'light',
  illuminate: 'light', incandescent: 'light', luminous: 'light',
  resplendent: 'light',
  shine: 'light', glare: 'light', darkness: 'light', invisible: 'light',
  crepuscular: 'light', pellucid: 'light', rubescent: 'light',

  // ── sound ──
  yap: 'sensory', hiss: 'sensory', buzz: 'sensory', bang: 'sensory', boom: 'sensory',
  pop: 'sensory', stink: 'sensory', whiff: 'sensory',
  squeal: 'sensory', monotonous: 'sensory',

  // ── communication ──
  whisper: 'communication', shout: 'communication', exaggerate: 'communication',
  loquacious: 'communication', garrulous: 'communication', vociferous: 'communication',
  repartee: 'communication', rodomontade: 'communication', expatiate: 'communication',
  castigate: 'communication', prevaricate: 'communication', obfuscate: 'communication',
  soliloquy: 'communication', blab: 'communication', chatter: 'communication',
  preach: 'communication', claim: 'communication',
  palindrome: 'communication', palindromic: 'communication',
  malapropism: 'communication', pleonasm: 'communication',
  tautology: 'communication', metonymical: 'communication',
  tmetic: 'communication', logorrhea: 'communication',
  parlance: 'communication', portmanteau: 'communication',
  colophon: 'communication', soliloquize: 'communication',
  gasconade: 'communication', palaver: 'communication',
  agglutination: 'communication', catachresis: 'communication',
  metathesis: 'communication', tergiversation: 'communication',

  // ── sleep ──
  nap: 'sleep', bed: 'sleep', somnambulism: 'sleep',

  // ── money ──
  tax: 'money', dime: 'money', trade: 'money',
  pecuniary: 'money', remuneration: 'money', emolument: 'money',
  worth: 'money', surplus: 'money', perquisite: 'money',
  lagniappe: 'money', guerdon: 'money', autarky: 'money',

  // ── time ──
  time: 'time', late: 'time', week: 'time',
  chronological: 'time', anachronism: 'time', ephemeral: 'time',
  simultaneous: 'time', millennium: 'time', quinquennial: 'time',
  nostalgia: 'time', renaissance: 'time', antique: 'time',
  concurrent: 'time', consecutive: 'time',
  penultimate: 'time', sesquicentennial: 'time',
  quotidian: 'time', seriatim: 'time', immediately: 'time',

  // ── language ──
  chapter: 'language', manuscript: 'language', calligraphy: 'language',
  bibliography: 'language', denouement: 'language', vignette: 'language',
  critique: 'language', stamp: 'language', print: 'language', jot: 'language',
  write: 'language', misspell: 'language', initials: 'language',
  nomenclature: 'language', corrigendum: 'language',

  // ── art ──
  craft: 'art', collage: 'art', photography: 'art', photograph: 'art',
  aesthetic: 'art', baroque: 'art', mosaic: 'art', decoration: 'art',
  pattern: 'art', colorful: 'art', masterpiece: 'art',
  kaleidoscopic: 'art', kaleidoscope: 'art', daguerreotype: 'art',
  grandeur: 'art', maculature: 'art',

  // ── performance ──
  skit: 'performance',
  stretto: 'performance', polyphony: 'performance', cymbaleer: 'performance',
  elegiacal: 'performance', caesura: 'performance', bathos: 'performance',

  // ── science ──
  speed: 'science', magnify: 'science', technology: 'science',
  hypothesis: 'science', algorithm: 'science', cybernetics: 'science',
  pseudoscience: 'science', demographics: 'science', demographic: 'science',
  circumference: 'math', mathematical: 'math', schematic: 'science',
  atmosphere: 'science', geocentric: 'science', heliocentric: 'science',
  syzygy: 'science',
  star: 'science', space: 'science', compound: 'science', decay: 'science',
  hyperbole: 'science', phenomenon: 'science', metamorphosis: 'science',
  concatenation: 'science', atavism: 'science', ergodic: 'science',
  idempotent: 'science',

  // ── health ──
  pox: 'health', vet: 'health', fit: 'health', diarrhea: 'health',
  pharmaceutical: 'health',
  faint: 'health', virulent: 'health', pernicious: 'health',
  recrudescence: 'health', sternutatory: 'health', anaphylaxis: 'health',
  xanthosis: 'health',

  // ── nature ──
  panorama: 'nature', topography: 'nature', autochthonous: 'nature',
  rot: 'nature', moist: 'nature', dense: 'nature', litter: 'nature',
  recycle: 'nature', slab: 'nature', cernuous: 'nature', empyrean: 'nature',

  // ── people ──
  man: 'people', dad: 'people', pal: 'people', kid: 'people', mob: 'people',
  job: 'people', lad: 'people', lass: 'people',
  aristocrat: 'people', bourgeois: 'people', bourgeoisie: 'people',
  tyro: 'people', fiance: 'people',
  caballero: 'people', dulcinea: 'people',
  gesellschaft: 'people',
  party: 'people', soiree: 'people', bacchanalia: 'people',
  rendezvous: 'people',
  // moved from people: echelon→power, hierarchy→power, renown→character, pram→home, geography→earth

  // ── law ──
  theft: 'law', sabotage: 'law', malfeasance: 'law', counterfeit: 'law',
  connivance: 'law',

  // ── power ──
  hegemony: 'power', power: 'power',

  // ── building ──
  flagpole: 'building', architecture: 'building',
  grout: 'building', balustrade: 'building', propylaea: 'building',

  // ── movement ──
  swift: 'movement', brisk: 'movement', shiver: 'movement',
  peripatetic: 'movement',
  movement: 'movement', slouch: 'movement', coil: 'movement',
  stride: 'movement', loiter: 'movement', bounce: 'movement',
  deasil: 'movement', luge: 'movement',

  // ── magic ──
  legerdemain: 'magic',
  sangoma: 'magic', haruspex: 'magic', duende: 'magic', afflatus: 'magic',
  prognosticate: 'magic', prospicience: 'magic',

  // ── war ──
  truce: 'war', kamikaze: 'war', demarche: 'war',

  // ── math ──
  circle: 'math', number: 'math', amount: 'math', third: 'math',
  grid: 'math', cone: 'math', shape: 'math', chart: 'math', loop: 'math',
  dot: 'math', orb: 'math', outline: 'math', tessellation: 'math',
  abscissa: 'math', commensurate: 'math',

  // ── school ──
  baccalaureate: 'school', propaedeutic: 'school', prolegomenon: 'school',

  // ── additional actions ──
  dwell: 'actions', unlock: 'actions', redo: 'actions', rearrange: 'actions',
  replay: 'actions', disconnect: 'actions', disorganize: 'actions',
  reappear: 'actions', regroup: 'actions', overpower: 'actions',
  interchange: 'actions', discover: 'actions', reintroduce: 'actions',
  disregard: 'actions', redistribute: 'actions', intervene: 'actions',
  participate: 'actions', deteriorate: 'actions', deteriorating: 'actions',
  circumscribe: 'actions', expedite: 'actions', relinquish: 'actions',
  ostracize: 'actions', disseminate: 'actions', extrapolate: 'actions',
  interpolate: 'actions', enumerate: 'actions', deprecate: 'actions',
  recapitulate: 'actions', abnegate: 'actions', peculate: 'actions',
  pretermit: 'actions', concatenate: 'actions', bifurcate: 'actions',
  delineate: 'actions', desiccate: 'actions', resuscitate: 'actions',
  overestimate: 'actions', overlook: 'actions', overachieve: 'actions',
  oversimplify: 'actions', disassemble: 'actions', disallow: 'actions',
  overreact: 'actions', absquatulate: 'actions', vacillate: 'actions',
  propitiate: 'actions', supplicate: 'actions', impugn: 'actions',
  mitigate: 'actions', surround: 'actions',

  // ── reclassified from feelings (second pass fine-tuning) ──
  unpleasant: 'feelings', overcome: 'actions',
  stubbornness: 'character', undeniable: 'mind', ridiculous: 'mind',
  extraordinary: 'mind', magnificent: 'art', imperfect: 'mind',
  unaware: 'mind', improper: 'character', unfamiliar: 'mind',
  solemn: 'character', solemnity: 'character',
  sacrilegious: 'law', querulous: 'feelings',
  egregious: 'character', facetious: 'character',
  mendacious: 'character', inchoate: 'time', specious: 'mind',
  spurious: 'mind', trenchant: 'character', vicissitude: 'time',
  precipitous: 'earth', surreptitious: 'actions',
  inimitable: 'character', apposite: 'mind',
  blandish: 'communication', laodicean: 'character',
  rapprochement: 'communication', ecumenical: 'people',
  discernible: 'mind', plausible: 'mind',
  incomprehensible: 'mind', equitable: 'law',
  malodorous: 'sensory', approbation: 'communication',
  ineluctable: 'time', implacable: 'character',

  // ── additional character ──
  honestly: 'character', outstanding: 'character', craftiness: 'character',
  invincible: 'character', competent: 'character', adaptable: 'character',
  vigilant: 'character', benevolent: 'character', oleaginous: 'character',
  mediocre: 'character', gaucherie: 'character', ostentatious: 'character',
  abnegation: 'character', assiduously: 'character', patiently: 'character',
  stubbornness: 'character', meticulosity: 'character',

  // ── additional mind ──
  reason: 'mind', nonsense: 'mind', perspective: 'mind', imagination: 'mind',
  daydream: 'mind', observation: 'mind', solipsism: 'mind',
  vague: 'mind', antithesis: 'mind', antinomy: 'mind',
  desideratum: 'mind', predilection: 'mind', proclivity: 'mind',
  apotheosis: 'mind', epitome: 'mind', sisyphean: 'mind',
  idiosyncrasy: 'mind', idiosyncratic: 'mind',

  // ── additional communication ──
  communicate: 'communication', describe: 'communication',
  announcement: 'communication', pronunciation: 'communication',
  abbreviation: 'communication', dictionary: 'communication',
  encyclopedia: 'communication', synonym: 'communication',
  sesquipedalian: 'communication', circumlocution: 'communication',
  platitude: 'communication', elucidate: 'communication',
  mispronounce: 'communication',

  // ── additional earth ──
  hemisphere: 'earth', plateau: 'earth',

  // ── additional science ──
  temperature: 'science', experiment: 'science', compound: 'science',
  conglomerate: 'science', equilibrium: 'science', pneumatic: 'science',
  concatenation: 'science', incontrovertible: 'science', concomitant: 'science',

  // ── additional health ──
  deleterious: 'health', emollient: 'health', nocuous: 'health',
  hazardous: 'health', rontgenize: 'health', efficacious: 'health',

  // ── additional math ──
  polygon: 'math', perimeter: 'math', approximately: 'math',
  measurement: 'math', equivalent: 'math', innumerable: 'math',
  commensurate: 'math',

  // ── additional time ──
  meanwhile: 'time', sometimes: 'time', overdue: 'time',
  perpetual: 'time', incessant: 'time', punctual: 'time',
  antecedent: 'time', simultaneously: 'time', nascent: 'time',
  incipient: 'time',

  // ── additional light ──
  sunshine: 'light', moonlight: 'light', brightness: 'light', visible: 'light',

  // ── additional sports ──
  scoreboard: 'sports', achievement: 'sports', nemesis: 'sports',

  // ── additional nature ──
  wreckage: 'nature', debris: 'nature', catastrophe: 'nature',
  catastrophic: 'nature', calamitous: 'nature', auspicious: 'nature',

  // ── additional home ──
  capacious: 'home', immaculate: 'home', clutter: 'home',
  thumbtack: 'home', miscellaneous: 'home',

  // ── additional law ──
  connivance: 'law', litigious: 'law', recidivism: 'law',
  fiduciary: 'law', accountability: 'law', manumission: 'law',
  laissez: 'law',

  // ── additional building ──
  underground: 'building', infrastructure: 'building',

  // ── additional travel ──
  headquarters: 'travel', marketplace: 'travel', international: 'travel',
  adieu: 'travel',

  // ── additional war ──
  internecine: 'war', subterfuge: 'war',

  // ── additional school ──
  elementary: 'school', chalkboard: 'school', pretest: 'school',
  miscount: 'school', polytechnic: 'school', orthodox: 'school',

  // ── additional people ──
  professional: 'people', teamwork: 'people', cooperation: 'people',
  anonymous: 'people', solitary: 'people', chauvinism: 'people',

  // ── additional texture ──
  thickness: 'texture', sharpness: 'texture',

  // ── additional body ──
  ambidextrous: 'body', cymotrichous: 'body', callipygian: 'body',

  // ── additional sound ──
  monotonous: 'sensory',

  // ── additional language ──
  nomenclature: 'language', corrigendum: 'language',
  logorrhea: 'language', colophon: 'language',

  // ── additional clothing ──
  faux: 'clothing',

  // ── additional money ──
  philanthropy: 'money', marketplace: 'money',

  // ── color (additional) ──
  red: 'color', pink: 'color', blue: 'color', gray: 'color', grey: 'color',
  tan: 'color', teal: 'color',

  // ── final specific classifications ──
  electricity: 'science', recharge: 'science', projection: 'science',
  pneumatic: 'science', extraterrestrial: 'science',
  disorder: 'health',
  plentiful: 'quantity', sufficient: 'quantity', emptiness: 'quantity',
  traversal: 'movement', fluctuate: 'movement', vertiginous: 'movement',
  misanthropy: 'character', reticent: 'character', grotesque: 'character',
  liaise: 'communication', tmesis: 'communication', parenthetical: 'communication',
  retrospective: 'time', simultaneously: 'time',
  oeillade: 'feelings', dalliance: 'feelings',
  tautological: 'language', laissez: 'law',
  insuperable: 'time', ambiance: 'sensory',
  charade: 'performance',
  juxtapose: 'mind', juxtaposition: 'mind',
  amalgamation: 'actions', prearrange: 'actions',
  certificate: 'school', prerequisite: 'school',
  infrastructure: 'building',

  // ── second pass: moved items ──
  // from animals
  net: 'tools', kit: 'everyday', scat: 'actions', decoy: 'actions', nocturnal: 'time',
  // from food
  thicken: 'actions', booth: 'home', skimp: 'actions', surfeit: 'quantity',
  recherche: 'art', staphylococci: 'health', whist: 'sports',
  // from body
  gum: 'food', stitch: 'clothing', flake: 'texture', tumescent: 'health',
  // from clothing
  primp: 'actions', pouch: 'home', valet: 'people', toupee: 'body',
  // from people
  echelon: 'power', hierarchy: 'power', renown: 'character',
  pram: 'home', geography: 'earth',
  // from mind (not about thinking/knowledge)
  labyrinth: 'building', labyrinthine: 'building',
  paradox: 'language', paradigm: 'language',
  sisyphean: 'character', obstinate: 'character', obdurate: 'character',
  adjudicate: 'law', vicarious: 'mind',
  // additional corrections from spot-check
  hubris: 'character', temerity: 'character', diffident: 'character',
  pejorative: 'language', acquiescence: 'character',
  panache: 'character', aplomb: 'character', prestige: 'character',
  flamboyant: 'character', effervescent: 'feelings',
  boastful: 'character', insecure: 'feelings',
  respectful: 'feelings', conscience: 'mind', gratitude: 'feelings',
  // from actions that aren't actions
  boutonniere: 'plants', keystroke: 'actions', hike: 'actions',
  // additional reclassifications
  agriculture: 'food',
  magnificent: 'art', extraordinary: 'mind',
  turmoil: 'feelings', bravely: 'character', courageously: 'character',
  ridiculous: 'mind', magnifique: 'art',
  unequivocally: 'communication', expurgated: 'language', imbroglio: 'communication',
  redolent: 'sensory', surreptitiously: 'actions', spontaneity: 'actions',
  ameliorative: 'health', unilateral: 'power',
  apropos: 'communication', laissez: 'power',
  diversion: 'actions', impervious: 'texture',
  // competitive words needing better themes
  spunk: 'character', exploit: 'actions',
  joyful: 'feelings',
  uncertain: 'mind',
  // common adverbs/adjectives → better themes
  fiercely: 'character', playful: 'character', wasteful: 'character',
  friendliness: 'character', steadiness: 'character',
  carefully: 'character', cautiously: 'character', deliberately: 'character',
  patiently: 'character', successfully: 'actions',
  correctly: 'mind', completely: 'quantity', entirely: 'quantity',
  separately: 'quantity', repeatedly: 'time',
  fortunately: 'feelings', accidentally: 'actions', suddenly: 'time',
  noticeably: 'sensory', acknowledgment: 'communication',
  // everyday words with better fits
  technique: 'mind', beneficial: 'health', development: 'actions',
  improvement: 'actions', preparation: 'actions', precaution: 'health',
  peculiar: 'mind', inevitable: 'time', thorough: 'character',
  unbreakable: 'texture', instability: 'earth',
  nonviolent: 'character', undecided: 'mind', uneventful: 'time',
  inaccurate: 'mind', unoccupied: 'home',
  adjacent: 'earth', immutable: 'time',
  notwithstanding: 'communication',
  ubiquitous: 'quantity', quintessential: 'mind',
  heterogeneous: 'science', homogeneous: 'science',
  reciprocal: 'math', revocable: 'law', subordinate: 'power',
  tendentious: 'character', prevalence: 'quantity',
  ersatz: 'texture', liminal: 'time', ludic: 'actions',
  geminate: 'science', stichous: 'science',
  sacerdotal: 'people', congeries: 'quantity', nugatory: 'quantity',
  weissnichtwo: 'travel', metier: 'people', querencia: 'mind',
  niche: 'earth', occurrence: 'time',
  contretemps: 'actions', supererogatory: 'character',
  floccinaucinihilipilification: 'language',
  peradventure: 'time', promiscuous: 'character',
  onychophagy: 'body', intelligible: 'mind',
  sufficiency: 'quantity',
  // additional specific corrections
  certificate: 'school', prerequisite: 'school',
  accomplishment: 'actions', voila: 'communication', impromptu: 'performance',
  opportunity: 'time', responsibility: 'character',
  significance: 'mind', continuity: 'time', meaningful: 'mind',
  misfortune: 'feelings', disadvantage: 'character',
  arrangement: 'actions', adjustment: 'actions',
  comfortable: 'feelings', impossible: 'mind', unable: 'actions',
  irregular: 'math', nonstop: 'time', unsteady: 'movement',
  unusual: 'mind', impractical: 'mind', unfinished: 'actions',
  independent: 'character', particular: 'mind',
  capacious: 'quantity', miscellaneous: 'quantity',
  multifarious: 'quantity', requisite: 'actions',
  preliminary: 'time', preparatory: 'time',
  prevalent: 'quantity',

  // ── everyday (truly generic function words) ──
  the: 'everyday', and: 'everyday', but: 'everyday', for: 'everyday', nor: 'everyday',
  yet: 'everyday', not: 'everyday', set: 'everyday', got: 'everyday', let: 'everyday',
  put: 'everyday', get: 'everyday', had: 'everyday', has: 'everyday', his: 'everyday',
  her: 'everyday', its: 'everyday', our: 'everyday', did: 'everyday',
  use: 'everyday', new: 'everyday', now: 'everyday', way: 'everyday',
  say: 'everyday', who: 'everyday', how: 'everyday', too: 'everyday',
  any: 'everyday', own: 'everyday', try: 'everyday', ask: 'everyday',
  also: 'everyday', just: 'everyday', than: 'everyday', them: 'everyday',
  then: 'everyday', when: 'everyday', what: 'everyday', that: 'everyday',
  this: 'everyday', with: 'everyday', will: 'everyday', each: 'everyday',
  from: 'everyday', such: 'everyday', much: 'everyday', very: 'everyday',
  even: 'everyday', most: 'everyday', some: 'everyday', here: 'everyday',
  where: 'everyday', there: 'everyday', quite: 'everyday', since: 'everyday',
  still: 'everyday', while: 'everyday', which: 'everyday', about: 'everyday',
  after: 'everyday', other: 'everyday', those: 'everyday', these: 'everyday',
  their: 'everyday', would: 'everyday', could: 'everyday', should: 'everyday',
  often: 'everyday', never: 'everyday', always: 'everyday', maybe: 'everyday',
  perhaps: 'everyday', indeed: 'everyday', rather: 'everyday', hence: 'everyday',
  thus: 'everyday', furthermore: 'everyday', moreover: 'everyday', however: 'everyday',
  therefore: 'everyday', nevertheless: 'everyday', nonetheless: 'everyday',
  necessary: 'everyday',
  // Remaining legitimate everyday words (generic adjectives, adverbs, function words)
  tip: 'everyday', gap: 'everyday', top: 'everyday', pun: 'language', spot: 'everyday',
  thing: 'everyday', blip: 'everyday', fluke: 'nature', whether: 'everyday',
  whither: 'everyday', place: 'everyday', beside: 'everyday', wait: 'everyday',
  need: 'everyday', main: 'everyday', remain: 'everyday', further: 'everyday',
  perfect: 'everyday', apart: 'everyday', center: 'math', choice: 'mind',
  perk: 'everyday', preview: 'time', brunt: 'everyday',
};

// ─── PASS 2: Definition-based keyword matching ──────────────────────────────
// Single-keyword patterns with \b boundaries on BOTH sides.
// Tested against DEFINITION ONLY (word itself was handled in Pass 1).

var DEF_THEMES = [
  // --- Most specific first ---
  ['animals', /\banimal\b|\bcreature\b|\bmammal\b|\breptile\b|\bbird\b|\bbirds\b|\bfish\b|\binsect\b|\bspider\b|\bsnake\b|\blizard\b|\bfrog\b|\btoad\b|\bwhale\b|\bshark\b|\bdolphin\b|\belephant\b|\bmonkey\b|\bwolf\b|\bwolves\b|\bdeer\b|\bhorse\b|\bhorses\b|\bdonkey\b|\bchicken\b|\bduck\b|\bgoose\b|\bgeese\b|\bsheep\b|\brabbit\b|\bmouse\b|\bmice\b|\bowl\b|\beagle\b|\bhawk\b|\bturtle\b|\btortoise\b|\blobster\b|\bbutterfly\b|\bbeetle\b|\bworm\b|\bcaterpillar\b|\bsquid\b|\boctopus\b|\blion\b|\btiger\b|\bzebra\b|\bgiraffe\b|\bpenguin\b|\botter\b|\bbeaver\b|\bsquirrel\b|\bporcupine\b|\bgorilla\b|\bdinosaur\b|\bpterodactyl\b|\bpuppy\b|\bkitten\b|\bhatchling\b|\bzoo\b|\bherd\b|\bflock\b|\bburrow\b|\bkennel\b|\baquarium\b|\bwildlife\b|\bpredator\b|\bprey\b|\bcarnivore\b|\bherbivore\b|\bomnivore\b|\bcanine\b|\bfeline\b|\bequine\b|\bbovine\b|\bporcine\b|\bavian\b|\bprimate\b|\barachnid\b|\bcrustacean\b|\bmollusk\b|\bamphibian\b|\bvenomous\b|\bpaw\b|\bpaws\b|\bclaw\b|\bclaws\b|\bbeak\b|\bwing\b|\bwings\b|\bfeather\b|\bfeathers\b|\btail\b.*\banimal\b|\bbug\b.*\binsect\b|\bpet\b|\bspecies\b|\bhippopotamus\b/i],

  ['plants', /\bplant\b|\bplants\b|\btree\b|\btrees\b|\bflower\b|\bgrass\b|\bleaf\b|\bleaves\b|\bseed\b|\bseeds\b|\bgarden\b|\bvine\b|\bbush\b|\bshrub\b|\bherb\b|\bmoss\b|\bfern\b|\bweed\b|\bbloom\b|\bblossom\b|\bpetal\b|\bbranch\b|\blumber\b|\btimber\b|\bforest\b|\borchid\b|\bchrysanthemum\b|\bbotanical\b|\bpollen\b|\bchlorophyll\b|\bvegetation\b|\bfoliage\b|\bevergreen\b|\bdeciduous\b|\bconifer\b|\bsprout\b|\bsapling\b|\bacorn\b|\bmushroom\b|\bfungus\b|\bfungi\b|\blichen\b|\balgae\b|\bseaweed\b|\btulip\b|\bdaisy\b|\blily\b|\bsunflower\b|\blavender\b|\bjasmine\b|\bdandelion\b|\bclover\b|\bbamboo\b|\bcactus\b|\bflora\b|\btwig\b|\bchanterelle\b|\bcrop\b|\bcrops\b|\bgrowing\b.*\bsoil\b/i],

  ['weather', /\bweather\b|\brain\b|\brainy\b|\bsnow\b|\bsnowy\b|\bstorm\b|\bwind\b|\bwindy\b|\bcloud\b|\bcloudy\b|\bthunder\b|\blightning\b|\bfoggy\b|\bfrost\b|\bfrosty\b|\bhail\b|\btornado\b|\bhurricane\b|\btyphoon\b|\bcyclone\b|\brainbow\b|\bsunshine\b|\bsunny\b|\bclimate\b|\bdrought\b|\bflood\b|\btemperature\b|\bhumid\b|\bbreeze\b|\bgust\b|\bblizzard\b|\bmonsoon\b|\bovercast\b|\bdrizzle\b|\bsleet\b|\bicicle\b|\bavalanche\b|\bmeteorol\b|\bfreeze\b|\bfreezing\b|\bice\b.*\bcold\b|\bcold\b.*\bice\b|\bsky\b.*\bnight\b/i],

  ['earth', /\brock\b|\brocks\b|\bstone\b|\bstones\b|\bmountain\b|\bvolcano\b|\bearthquake\b|\bmineral\b|\bcrystal\b|\bfossil\b|\bcave\b|\bcanyon\b|\bcliff\b|\bvalley\b|\briver\b|\blake\b|\bocean\b|\bisland\b|\bpeninsula\b|\bglacier\b|\bdesert\b|\bsoil\b|\bsand\b|\bmud\b|\bdirt\b|\bcontinent\b|\bterrain\b|\bgeology\b|\blandform\b|\bplateau\b|\bgorge\b|\bravine\b|\bcrater\b|\bgeyser\b|\bstalactite\b|\bstalagmite\b|\berosion\b|\bsediment\b|\blimestone\b|\bgranite\b|\bquartz\b|\blava\b|\bmagma\b|\btectonic\b|\breef\b|\btide\b|\bshore\b|\bbeach\b|\bcoast\b|\blagoon\b|\bmarsh\b|\bswamp\b|\bwetland\b|\bestuary\b|\bwaterfall\b|\bcreek\b|\bpond\b|\bbrook\b|\btributary\b|\bsubterranean\b|\bunderground\b|\bhill\b|\bpebble\b|\bboulder\b|\bgravel\b|\bclay\b|\bground\b.*\bhole\b|\bhole\b.*\bground\b/i],

  ['food', /\bfood\b|\beat\b|\beaten\b|\bcook\b|\bcooking\b|\bbake\b|\bbaking\b|\bmeal\b|\bfruit\b|\bvegetable\b|\bmeat\b|\bbread\b|\bcheese\b|\bsugar\b|\bspice\b|\bflavor\b|\btaste\b|\brecipe\b|\bingredient\b|\bdelicious\b|\bappetite\b|\bgrain\b|\bcereal\b|\bsoup\b|\bstew\b|\bsauce\b|\bpastry\b|\bdessert\b|\bcandy\b|\bchocolate\b|\bbutter\b|\bmilk\b|\bjuice\b|\bcoffee\b|\bwine\b|\bbeer\b|\bfeast\b|\bbanquet\b|\bsnack\b|\bbreakfast\b|\blunch\b|\bdinner\b|\bsupper\b|\bdining\b|\bbroth\b|\bdough\b|\bflour\b|\byeast\b|\bcinnamon\b|\bvanilla\b|\bgarlic\b|\bonion\b|\bpotato\b|\btomato\b|\bcarrot\b|\bpasta\b|\bnoodle\b|\bpizza\b|\bsandwich\b|\bcookie\b|\bmuffin\b|\bpancake\b|\bwaffle\b|\byogurt\b|\bhoney\b|\bsyrup\b|\bvinegar\b|\bberry\b|\bapple\b|\bbanana\b|\bgrape\b|\blemon\b|\bpeach\b|\bpear\b|\bplum\b|\bcherry\b|\bstrawberry\b|\bmelon\b|\bmango\b|\bpineapple\b|\bavocado\b|\bnutrition\b|\bvitamin\b|\bcalorie\b|\bculinary\b|\bgourmet\b|\bsavory\b|\bspicy\b|\bedible\b|\bstarch\b|\bfarinaceous\b|\bkernels\b|\bcorn\b.*\bfood\b|\bdrink\b|\bgulp\b|\btasty\b|\bsalty\b|\bsweet\b.*\bfood\b/i],

  ['body', /\bbody\b|\bmuscle\b|\bbone\b|\bbones\b|\bblood\b|\bbrain\b|\blung\b|\blungs\b|\bliver\b|\bkidney\b|\bstomach\b|\btooth\b|\bteeth\b|\bmouth\b|\bneck\b|\bshoulder\b|\bfinger\b|\bthumb\b|\bknee\b|\belbow\b|\bwrist\b|\bankle\b|\bspine\b|\bskull\b|\btongue\b|\bthroat\b|\bvein\b|\bartery\b|\bnerve\b|\bskeleton\b|\banatomy\b|\blimb\b|\btorso\b|\babdomen\b|\bpelvis\b|\bthigh\b|\bknuckle\b|\beyelash\b|\beyebrow\b|\bnostril\b|\bforehead\b|\bscalp\b|\bdiaphragm\b|\btendon\b|\bligament\b|\bcartilage\b|\bretina\b|\bcornea\b|\beardrum\b|\btonsil\b|\bintestine\b|\besophagus\b|\btrachea\b|\blarynx\b|\bpharynx\b|\bcallipygian\b|\bcymotrichous\b|\bwhisker\b|\bmucus\b|\bnose\b.*\bface\b|\bskin\b.*\bsore\b|\bhair\b.*\bstring\b|\bleg\b.*\blower\b|\bcheek\b.*\bface\b/i],

  ['health', /\bhealth\b|\bhealthy\b|\bmedical\b|\bmedicine\b|\bdisease\b|\billness\b|\binfect\b|\bsymptom\b|\bcure\b|\bdiagnos\b|\bsurgery\b|\bsurgeon\b|\bhospital\b|\bdoctor\b|\bwound\b|\binjury\b|\bfever\b|\bcough\b|\bsneeze\b|\bache\b|\bbleed\b|\bitch\b|\brash\b|\bscar\b|\bheal\b|\bpill\b|\bvaccine\b|\btherapy\b|\bremedy\b|\bailment\b|\bdisorder\b|\bsyndrome\b|\bchronic\b|\bcontagious\b|\bepidemic\b|\bpandemic\b|\bantibiotic\b|\bantiseptic\b|\bbandage\b|\bsplint\b|\bcrutch\b|\bambulance\b|\bparamedic\b|\bpharmac\b|\beczema\b|\bdiphtheria\b|\bhemorrhage\b|\basthma\b|\ballergy\b|\bdiabetes\b|\bcancer\b|\btumor\b|\bmalaria\b|\bplague\b|\bpneumonia\b|\bbronchitis\b|\barthritis\b|\banemia\b|\bnausea\b|\bseizure\b|\bcardiac\b|\brespiratory\b|\bimmune\b|\bpatholog\b|\btachycardia\b|\bpsoriasis\b|\bstethoscope\b|\bscalpel\b|\bsyringe\b|\bquarantine\b|\bsick\b|\bsickness\b|\bmalady\b|\bred spots\b|\bbowel\b|\bsomnambulism\b/i],

  ['home', /\bhouse\b|\bhome\b|\broom\b|\bdoor\b|\bwindow\b|\bwall\b|\bfloor\b|\broof\b|\bceiling\b|\bstair\b|\bbasement\b|\battic\b|\bgarage\b|\bporch\b|\bfence\b|\byard\b|\bfurniture\b|\bchair\b|\btable\b|\bdesk\b|\bsofa\b|\bcouch\b|\bshelf\b|\bshelves\b|\bdrawer\b|\bcabinet\b|\bcloset\b|\blamp\b|\bcarpet\b|\bcurtain\b|\bpillow\b|\bblanket\b|\btowel\b|\bmirror\b|\bclock\b|\bvase\b|\bbucket\b|\bbasket\b|\bbroom\b|\bvacuum\b|\bappliance\b|\boven\b|\bstove\b|\brefrigerator\b|\bdishwasher\b|\bsink\b|\bfaucet\b|\bbathtub\b|\bshower\b|\btoilet\b|\bplumbing\b|\bfireplace\b|\bchimney\b|\bbalcony\b|\bhallway\b|\bcorridor\b|\bpatio\b|\bchandelier\b|\bdoorbell\b|\bladder\b|\bdomestic\b|\bkitchen\b|\bhousehold\b|\bplate\b.*\bdish\b|\bbowl\b.*\bdish\b|\bfork\b|\bspoon\b|\bpin\b.*\bhang\b|\bcontainer\b/i],

  ['clothing', /\bcloth\b|\bclothes\b|\bclothing\b|\bgarment\b|\bshirt\b|\bblouse\b|\bpants\b|\btrousers\b|\bjeans\b|\bskirt\b|\bjacket\b|\bshoe\b|\bshoes\b|\bsock\b|\bsocks\b|\bglove\b|\bgloves\b|\bscarf\b|\bzipper\b|\bpocket\b|\bsleeve\b|\bcollar\b|\bfabric\b|\bcotton\b|\bsilk\b|\bwool\b|\blinen\b|\bleather\b|\bsew\b|\bsewing\b|\bknit\b|\btailor\b|\bfashion\b|\battire\b|\bwardrobe\b|\bcostume\b|\buniform\b|\boutfit\b|\brobe\b|\bapron\b|\bhelmet\b|\bribbon\b|\bjewelry\b|\bnecklace\b|\bbracelet\b|\bearing\b|\bbrooch\b|\bpendant\b|\btiara\b|\bsweater\b|\bhoodie\b|\braincoat\b|\bumbrella\b|\bsunglasses\b|\bmitten\b|\bsandal\b|\bslipper\b|\bsneaker\b|\bbonnet\b|\bveil\b|\bgown\b|\btuxedo\b|\bcorsage\b|\bchiffon\b|\btaffeta\b|\bvelvet\b|\bsatin\b|\bdenim\b|\bflannel\b|\btweed\b|\bcashmere\b|\bembroid\b|\bcrochet\b|\btextile\b|\baccouterments\b|\bdecolletage\b|\bboutonniere\b|\bruffle\b|\bundergarment\b|\bsleepwear\b/i],

  ['music', /\bmusic\b|\bmusical\b|\bsing\b|\bsinger\b|\bsinging\b|\bsong\b|\bsongs\b|\bdance\b|\bdancer\b|\bdancing\b|\bmelody\b|\brhythm\b|\bharmony\b|\binstrument\b|\bpiano\b|\bguitar\b|\bdrum\b|\bdrums\b|\bviolin\b|\bviola\b|\bcello\b|\bflute\b|\btrumpet\b|\btrombone\b|\bsaxophone\b|\bclarinet\b|\boboe\b|\bharp\b|\bbanjo\b|\bukulele\b|\baccordion\b|\bharmonica\b|\btambourine\b|\bcymbal\b|\bxylophone\b|\borchestra\b|\bconcert\b|\bchoir\b|\bchorus\b|\bopera\b|\bsymphony\b|\bcompose\b|\bcomposer\b|\btune\b|\bchord\b|\blyric\b|\bhymn\b|\banthem\b|\bballad\b|\blullaby\b|\bserenade\b|\bsonata\b|\bconcerto\b|\boverture\b|\baria\b|\bduet\b|\bquartet\b|\bensemble\b|\btempo\b|\bcrescendo\b|\bstaccato\b|\blegato\b|\ballegro\b|\badagio\b|\bappoggiatura\b|\bleitmotif\b|\bdiapason\b|\bterpsichorean\b|\bballet\b/i],

  ['art', /\bartist\b|\bartistic\b|\bpaint\b|\bpainter\b|\bpainting\b|\bdrawing\b|\bsketch\b|\bsculpt\b|\bsculpture\b|\bcanvas\b|\bgallery\b|\bmuseum\b|\bportrait\b|\bphotography\b|\bmasterpiece\b|\baesthetic\b|\bmural\b|\bmosaic\b|\bcollage\b|\bpottery\b|\bceramic\b|\bcarving\b|\bengraving\b|\billustration\b|\bcalligraphy\b|\bgraffiti\b|\bfresco\b|\btapestry\b|\blithograph\b|\betching\b|\bwatercolor\b|\bpigment\b|\bpalette\b|\beasel\b|\bchisel\b|\bstatue\b|\bfigurine\b|\bchiaroscurist\b|\bdaguerreotype\b|\brococo\b|\bfiligree\b|\btrompe\b|\bdecorative\b|\bbeautiful\b.*\bhandwriting\b|\bpictures\b.*\bcamera\b|\bcamera\b/i],

  ['performance', /\btheater\b|\btheatre\b|\bactor\b|\bactress\b|\bperformance\b|\bdrama\b|\bdramatic\b|\bcomedy\b|\btragedy\b|\btragic\b|\bentertain\b|\bpuppet\b|\bcinema\b|\bfilm\b|\bmovie\b|\bplaywright\b|\baudience\b|\bspotlight\b|\brehearsal\b|\baudition\b|\bimprovise\b|\bmonologue\b|\bdialogue\b|\bpantomime\b|\bvaudeville\b|\bburlesque\b|\bcabaret\b|\brecital\b|\bmasquerade\b|\bventriloquist\b|\btroupe\b|\bfunny play\b/i],

  ['sports', /\bsport\b|\bathletic\b|\bexercise\b|\bworkout\b|\bwrestl\b|\bboxing\b|\bboxer\b|\bmartial\b|\bsoccer\b|\bfootball\b|\bbaseball\b|\bbasketball\b|\btennis\b|\bgolf\b|\bgolfer\b|\bhockey\b|\bvolleyball\b|\brugby\b|\bskating\b|\bsurfing\b|\bcycling\b|\bcyclist\b|\barchery\b|\bfencing\b|\bgymnast\b|\bmarathon\b|\bsprint\b|\bhurdle\b|\bjavelin\b|\bdiscus\b|\bdecathlon\b|\btriathlon\b|\bolympic\b|\breferee\b|\bumpire\b|\bstadium\b|\barena\b|\brink\b|\bracket\b|\bpuck\b|\bgoalkeeper\b|\bquarterback\b|\bdribble\b|\bchampion\b|\btournament\b|\bcompetition\b|\bcompete\b|\bcontest\b|\bfirst place\b|\bboard game\b|\bgame\b.*\bwin\b|\bwin\b.*\bgame\b/i],

  ['science', /\bscien\b|\bchemist\b|\bchemical\b|\bphysics\b|\bbiolog\b|\bexperiment\b|\blaboratory\b|\bmicroscop\b|\btelescop\b|\bmolecule\b|\batom\b|\batoms\b|\belectric\b|\bmagnet\b|\bgravity\b|\bvelocity\b|\bacceleration\b|\bfrequency\b|\bwavelength\b|\bspectrum\b|\bradiation\b|\bnuclear\b|\bquantum\b|\bgenome\b|\bchromosome\b|\bevolution\b|\becosystem\b|\borganism\b|\bbacteria\b|\bDNA\b|\benzyme\b|\bastronom\b|\bplanet\b|\bgalaxy\b|\borbit\b|\bsatellite\b|\btechnology\b|\brobot\b|\bcircuit\b|\blaser\b|\bradar\b|\bhypothesis\b|\btheorem\b|\bphenomenon\b|\bentropy\b|\bkinetic\b|\bthermal\b|\bcelsius\b|\bfahrenheit\b|\bbarometer\b|\bseismograph\b|\bcentrifuge\b|\bcatalyst\b|\bisotope\b|\belectron\b|\bneutron\b|\bproton\b|\bquark\b|\bneutrino\b|\bsupernova\b|\bnebula\b|\bcomet\b|\basteroid\b|\bmeteor\b|\beclipse\b|\bsolstice\b|\bequinox\b|\bgeodesic\b|\bpneumatic\b|\bcelestial\b|\bstars\b.*\bpattern\b.*\bsky\b|\bstars\b.*\bsky\b|\boptical\b|\billusion\b|\bmachinery\b/i],

  ['math', /\bmath\b|\bnumber\b|\bnumbers\b|\bsubtract\b|\bmultiply\b|\bequation\b|\bformula\b|\bcalculat\b|\bgeometry\b|\btriangle\b|\brectangle\b|\bpolygon\b|\bhexagon\b|\bpentagon\b|\boctagon\b|\bdiameter\b|\bradius\b|\bcircumference\b|\bfraction\b|\bdecimal\b|\bpercent\b|\bratio\b|\bproportion\b|\balgebra\b|\bstatistic\b|\bprobability\b|\bsymmetry\b|\bparallel\b|\bperpendicular\b|\bhypotenuse\b|\blogarithm\b|\bexponent\b|\bcoefficient\b|\binteger\b|\bfibonacci\b|\balgorithm\b|\bvector\b|\bcalculus\b|\bdifferential\b|\binfinity\b|\bpalindrom\b|\bmathematic\b|\bcube\b.*\bsquare\b.*\bsides\b|\bsquare\b.*\bsides\b|\bten cents\b/i],

  ['money', /\bmoney\b|\bpayment\b|\bcost\b|\bprice\b|\bbuy\b|\bbuying\b|\bsell\b|\bselling\b|\bpurchase\b|\bmarket\b|\bbusiness\b|\bcompany\b|\bindustry\b|\bfactory\b|\bmanufacture\b|\beconom\b|\bfinancial\b|\bfinance\b|\bloan\b|\bdebt\b|\binvest\b|\bprofit\b|\bbudget\b|\bsalary\b|\bwage\b|\bincome\b|\bwealth\b|\bcurrency\b|\bdollar\b|\bmerchant\b|\bcommerce\b|\bcommercial\b|\bauction\b|\bbargain\b|\bdiscount\b|\breceipt\b|\bdividend\b|\bmortgage\b|\binsurance\b|\bpension\b|\bbankrupt\b|\binflation\b|\brecession\b|\brevenue\b|\basset\b|\bbroker\b|\bentrepreneur\b|\bfranchise\b|\bmonopoly\b|\bsubsidy\b|\btariff\b|\bwholesale\b|\bretail\b|\bpecuniary\b|\bremuneration\b|\bemolument\b|\busurious\b|\bcoin\b.*\bworth\b|\bexchange\b.*\bthing\b|\btrade\b.*\bone thing\b|\bcharity\b|\bcharitable\b|\bdonation\b/i],

  ['language', /\blanguage\b|\blinguist\b|\bspeech\b|\bpronunciation\b|\bdialect\b|\btranslat\b|\bvocabulary\b|\bgrammar\b|\bsyntax\b|\bessay\b|\bpoem\b|\bpoetry\b|\bpoet\b|\bnovel\b.*\bbook\b|\bwriting\b|\bwritten\b|\bauthor\b|\bnarrative\b|\bfiction\b|\bliterary\b|\bliterature\b|\balphabet\b|\brhetoric\b|\bsynonym\b|\bantonym\b|\bmetaphor\b|\bsimile\b|\birony\b|\bsatire\b|\bprose\b|\bmanuscript\b|\bdiary\b|\bnewspaper\b|\bmagazine\b|\bpublish\b|\beditor\b|\blibrary\b|\bdictionary\b|\bencyclopedia\b|\bthesaurus\b|\betymology\b|\bonomatopoeia\b|\btautolog\b|\bpleonasm\b|\bsolecism\b|\bmalapropism\b|\bneologism\b|\bcolloqui\b|\bvernacular\b|\blexicon\b|\bphilolog\b|\bsemantics\b|\bmorpheme\b|\bphoneme\b|\bsyllable\b|\bconsonant\b|\balliteration\b|\bassonance\b|\bbibliophile\b|\blogodaedaly\b|\bhapax\b|\bprolegomenon\b|\btoponym\b|\btmetic\b|\bcaesura\b|\blogorrhea\b|\bparoemiology\b|\btsundoku\b|\bnonfiction\b|\brecherche\b|\bsection\b.*\bbook\b|\bwrite\b.*\bquickly\b|\bletters\b.*\bneatly\b|\bsummary\b|\bsummariz\b|\bhandwriting\b|\bstory\b|\bstories\b/i],

  ['time', /\bhour\b|\bweek\b|\bmonth\b|\byear\b|\bdecade\b|\bcentury\b|\bmillennium\b|\bepoch\b|\bancient\b|\bmedieval\b|\bhistory\b|\bhistoric\b|\bcalendar\b|\bschedule\b|\bdeadline\b|\bannual\b|\bseason\b|\bdawn\b|\bdusk\b|\bsunrise\b|\bsunset\b|\bmidnight\b|\bnoon\b|\btemporary\b|\bpermanent\b|\beternal\b|\bimmortal\b|\bantique\b|\bvintage\b|\barchaic\b|\bobsolete\b|\bcontemporary\b|\bprimordial\b|\bprehistoric\b|\bdynasty\b|\bgenealogy\b|\bchronolog\b|\banachronism\b|\bantediluvian\b|\bnostalgia\b|\bposterity\b|\bprecedent\b|\bretrospect\b|\bquinquennial\b|\bephemeral\b|\bsimultaneous\b|\bconcurrent\b|\bconsecutive\b|\bpast tense\b|\bago\b.*\btime\b|\bfleeting\b|\brevival\b.*\bart\b|\brevival\b.*\bculture\b|\brenaissance\b/i],

  ['people', /\bperson\b|\bpeople\b|\bhuman\b|\bwoman\b|\bchild\b|\bchildren\b|\bbaby\b|\binfant\b|\btoddler\b|\bboy\b|\bgirl\b|\bteenager\b|\badolescent\b|\badult\b|\belder\b|\bfamily\b|\bparent\b|\bmother\b|\bfather\b|\bsister\b|\bbrother\b|\bdaughter\b|\bson\b.*\bfamily\b|\buncle\b|\baunt\b|\bcousin\b|\bgrandmother\b|\bgrandfather\b|\bhusband\b|\bwife\b|\bspouse\b|\bfriend\b|\bneighbor\b|\bstranger\b|\bcolleague\b|\bcompanion\b|\bking\b|\bqueen\b|\bprince\b|\bprincess\b|\bknight\b|\bsoldier\b|\bwarrior\b|\bchief\b|\bleader\b|\bruler\b|\bgovernor\b|\bpresident\b|\bmayor\b|\bteacher\b|\bprofessor\b|\bstudent\b|\bscholar\b|\bworker\b|\bfarmer\b|\bcarpenter\b|\bpilot\b|\bsailor\b|\bfirefighter\b|\bpolice\b|\bdetective\b|\bthief\b|\bprisoner\b|\bservant\b|\bcitizen\b|\bimmigrant\b|\brefugee\b|\bveteran\b|\bvolunteer\b|\bcelebrity\b|\baristocrat\b|\bpeasant\b|\bmonk\b|\bnun\b|\bpriest\b|\bbishop\b|\bambassador\b|\bdiplomat\b|\bbureaucrat\b|\bphilanthropist\b|\bmisanthrope\b|\bsycophant\b|\braconteur\b|\bdilettante\b|\bconnoisseur\b|\bcurmudgeon\b|\bdemagogue\b|\biconoclast\b|\bpolyglot\b|\bvirtuoso\b|\bcharlatan\b|\bmartyr\b|\bheretic\b|\bmentor\b|\bapprentice\b|\bprotege\b|\bdisciple\b|\bpatriarch\b|\bmatriarch\b|\bmonarch\b|\btyrant\b|\bdictator\b|\bsamurai\b|\bgladiator\b|\bcenturion\b|\bmyrmidon\b|\bsomeone\b|\bsomebody\b|\bsomeone who\b|\ba person\b|\bmiddle class\b|\bnobility\b|\bengaged\b.*\bmarried\b|\brank\b.*\borganization\b|\bclass\b.*\bsocial\b|\bclass\b.*\bsociety\b|\bpopulation\b/i],

  ['feelings', /\bfeel\b|\bfeeling\b|\bemotion\b|\bemotional\b|\bhappy\b|\bhappiness\b|\bglad\b|\bsad\b|\bsadness\b|\bangry\b|\banger\b|\brage\b|\bfury\b|\bfear\b|\bafraid\b|\bscared\b|\bfrighten\b|\bworry\b|\bworried\b|\banxious\b|\banxiety\b|\bnervous\b|\bexcite\b|\bexcitement\b|\bjoyful\b|\bjoyous\b|\baffection\b|\bhate\b|\bhatred\b|\bjealous\b|\bjealousy\b|\benvy\b|\benvious\b|\bproud\b|\bpride\b|\bshame\b|\bashamed\b|\bguilt\b|\bguilty\b|\bembarrass\b|\blonely\b|\bbored\b|\bboredom\b|\bdisgust\b|\bhopeful\b|\bhopeless\b|\bdespair\b|\bgrief\b|\bmourn\b|\bsorrow\b|\bdelight\b|\bcheerful\b|\bgloomy\b|\bgloom\b|\bmiserable\b|\bmisery\b|\bdisappoint\b|\bfrustrat\b|\boverwhelm\b|\bpeaceful\b|\bserene\b|\bserenity\b|\bpanic\b|\bterror\b|\bhorror\b|\bdread\b|\bgrateful\b|\bthankful\b|\bgratitude\b|\bcompassion\b|\bsympathy\b|\bempathy\b|\bpity\b|\bremorse\b|\bregret\b|\bresent\b|\bcontempt\b|\bdisdain\b|\badmiration\b|\badore\b|\bfondness\b|\btenderness\b|\bmelancholy\b|\bwistful\b|\beuphoria\b|\becstasy\b|\bbliss\b|\bagony\b|\banguish\b|\btorment\b|\bapathy\b|\bambivalence\b|\btrepidation\b|\bconsternation\b|\bchagrin\b|\bennui\b|\bmalaise\b|\benthusiasm\b|\benthusiastic\b|\bmood\b|\bcry\b.*\bhard\b|\bsmile\b|\bcry\b.*\bsoftly\b|\bweeping\b|\btearful\b|\boptimistic\b|\bcomposure\b|\bcoolness\b.*\bstrain\b|\breluctant\b|\bindifference\b|\blonging\b|\bpleasant\b.*\bfeeling\b|\brestless\b|\bsentimental\b/i],

  ['mind', /\bthink\b|\bthinking\b|\bthought\b|\bidea\b|\bconcept\b|\bintellig\b|\bwise\b|\bwisdom\b|\bknowledge\b|\bunderstand\b|\bcomprehend\b|\blogic\b|\blogical\b|\brational\b|\bbelieve\b|\bbelief\b|\bopinion\b|\btheory\b|\bconclusion\b|\bdecision\b|\bjudgment\b|\banalyz\b|\bponder\b|\bcontemplate\b|\bimagine\b|\bimagination\b|\bmemory\b|\bremember\b|\bforget\b|\brecognize\b|\bperceive\b|\bperception\b|\bawareness\b|\bconscious\b|\bsubconscious\b|\bphilosophy\b|\bphilosophical\b|\bpsychology\b|\bmental\b|\bcognitive\b|\binsight\b|\bintuition\b|\bgenius\b|\bignorant\b|\bfoolish\b|\bnaive\b|\bskeptic\b|\bmystery\b|\benigma\b|\bparadox\b|\bdilemma\b|\bstrategy\b|\bsolve\b|\bsolution\b|\bdiscern\b|\bscrutin\b|\bastute\b|\bperspicac\b|\bsagac\b|\berudite\b|\besoteric\b|\brecondite\b|\bpedantic\b|\bdidactic\b|\bpedagog\b|\bpropaedeutic\b|\bepistem\b|\bontolog\b|\bdialectic\b|\bsyllogism\b|\bsophist\b|\bempiric\b|\bpragmatic\b|\bdogmatic\b|\bideolog\b|\bdoctrine\b|\btenet\b|\bpremise\b|\bpostulate\b|\bcorollary\b|\bconjecture\b|\bspeculate\b|\bruminate\b|\bcogitate\b|\bcerebral\b|\bsapient\b|\bprescient\b|\bclairvoyant\b|\bomniscient\b|\boblivious\b|\bvacuous\b|\bfatuous\b|\binane\b|\basinine\b|\bcuriosity\b|\bparadigm\b|\brealization\b|\bunderstanding\b|\blearning\b|\bcomplex\b.*\bpaths\b|\bmaze\b|\bunclear\b|\bclear\b.*\bexplain\b|\bexplain\b.*\bdetail\b/i],

  ['character', /\bhonest\b|\bdishonest\b|\bloyal\b|\bloyalty\b|\bbetray\b|\bfaithful\b|\bgenerous\b|\bgenerosity\b|\bselfish\b|\bgreedy\b|\bgreed\b|\bhumble\b|\bhumility\b|\barrogant\b|\barrogance\b|\bmodest\b|\bvanity\b|\bimpatient\b|\bstubborn\b|\bobstinate\b|\btenacious\b|\bpersistent\b|\bdetermined\b|\blazy\b|\bdiligent\b|\bindustrious\b|\bambitious\b|\bcoward\b|\bcowardly\b|\bheroic\b|\bvaliant\b|\bvillain\b|\bwicked\b|\bevil\b|\bcruel\b|\bcruelty\b|\bkindness\b|\bgentle\b|\bharsh\b|\bruthless\b|\bmerciless\b|\bmerciful\b|\bforgiving\b|\bvengeful\b|\bvindictive\b|\bspiteful\b|\bmalicious\b|\bmalevolent\b|\bbenevolent\b|\bvirtuous\b|\brighteous\b|\bdevout\b|\bpious\b|\bsinful\b|\bimmoral\b|\bethical\b|\bunethical\b|\bcorrupt\b|\bintegrity\b|\bhonor\b|\bdignity\b|\bcourteous\b|\brude\b|\bpolite\b|\bgracious\b|\binsolent\b|\bimpudent\b|\bbrazen\b|\bmeek\b|\bdocile\b|\bsubmissive\b|\bdefiant\b|\brebellious\b|\bobedient\b|\bdisobedient\b|\breliable\b|\bunreliable\b|\btrustworthy\b|\bdeceitful\b|\bcunning\b|\bdevious\b|\bscrupulous\b|\bunscrupulous\b|\bconscientious\b|\bnegligent\b|\bcareless\b|\bmeticulous\b|\bfastidious\b|\bpunctilious\b|\bzealous\b|\bfervent\b|\bardent\b|\bstoic\b|\bascetic\b|\bhedonist\b|\bsybarite\b|\bquixotic\b|\bsupercilious\b|\bobsequious\b|\bsycophantic\b|\bpusillanimous\b|\bmagnanimous\b|\bimperious\b|\bhaughty\b|\bcondescending\b|\bpatronizing\b|\bsanctimonious\b|\bhypocritical\b|\bduplicitous\b|\bperfidious\b|\btreacherous\b|\binsidious\b|\bnefarious\b|\bheinous\b|\breprehensible\b|\bdeplorable\b|\bexemplary\b|\badmirable\b|\bcommendable\b|\blaudable\b|\bpraiseworthy\b|\breprobate\b|\bprofligate\b|\bdissolute\b|\babstemious\b|\btemperate\b|\bintemperate\b|\bprodigal\b|\bparsimonious\b|\bmiserly\b|\bmunificent\b|\baltruistic\b|\bnarcissistic\b|\bcantankerous\b|\birascible\b|\bobstreperous\b|\bindefatigable\b|\bsolicitous\b|\bgaucherie\b|\bresilient\b|\bnot giving up\b|\bfirm in purpose\b|\bgood manners\b|\brespect\b.*\bothers\b|\btrouble\b.*\bannoy\b|\bplayfully\b.*\btrouble\b|\bmoral\b|\bmanners\b|\bdepravity\b|\bwickedness\b/i],

  ['communication', /\bconversation\b|\bdiscuss\b|\bdebate\b|\bpersuade\b|\bconvince\b|\bnegotiate\b|\bagree\b|\bdisagree\b|\bpromise\b|\bvow\b|\boath\b|\bpledge\b|\bannounce\b|\bdeclare\b|\bproclaim\b|\bexclaim\b|\bwhisper\b|\bshout\b|\byell\b|\bscream\b|\bmumble\b|\bmurmur\b|\bstammer\b|\bstutter\b|\bgossip\b|\brumor\b|\bcomplain\b|\bcriticize\b|\bcompliment\b|\binsult\b|\bmock\b|\bridicule\b|\btease\b|\btaunt\b|\bbully\b|\bthreaten\b|\bwarn\b|\badvise\b|\bsuggest\b|\brecommend\b|\bcommand\b|\bdemand\b|\bplead\b|\bimplore\b|\bbeseech\b|\bapologize\b|\bconfess\b|\bexaggerat\b|\bboast\b|\bbrag\b|\bflatter\b|\bpreach\b|\bgarrulous\b|\bloquacious\b|\bverbose\b|\btaciturn\b|\breticent\b|\blaconic\b|\bterse\b|\bsuccinct\b|\bprevaricate\b|\bequivocate\b|\bdissembl\b|\bobfuscate\b|\bcircumlocution\b|\binnuendo\b|\binsinuate\b|\bvociferous\b|\bstentorian\b|\bmellifluous\b|\brodomontade\b|\bexpatiate\b|\bcastigate\b|\btalk\b.*\blot\b|\btalkative\b|\btalk\b.*\bsoftly\b|\bcall out\b.*\bloudly\b|\bsecret\b.*\btell\b|\bwitty\b.*\bconversation\b|\bwitty\b.*\brepl\b|\bspoken\b.*\bwithout\b.*\bpreparation\b/i],

  ['actions', /\bwalk\b|\bjump\b|\bclimb\b|\bcrawl\b|\bslide\b|\bswing\b|\bpush\b|\bpull\b|\blift\b|\bcarry\b|\bhold\b|\bgrab\b|\breach\b|\bstretch\b|\bbend\b|\btwist\b|\bspin\b|\broll\b|\bbounce\b|\bgallop\b|\btrot\b|\bmarch\b|\bstomp\b|\bshuffle\b|\bstumble\b|\bcollapse\b|\bcrash\b|\bsmash\b|\bchop\b|\bslice\b|\bcarve\b|\bscrape\b|\bscratch\b|\bpour\b|\bspill\b|\bsplash\b|\bspray\b|\bsqueeze\b|\bcrush\b|\bpress\b|\bpound\b|\bknock\b|\bslap\b|\bpunch\b|\bclap\b|\bshrug\b|\bkneel\b|\bcrouch\b|\bdodge\b|\bflee\b|\bchase\b|\bescape\b|\bhide\b|\bseek\b|\bsearch\b|\bwander\b|\broam\b|\bstroll\b|\bhike\b|\btrek\b|\bdrift\b|\brescue\b|\bprotect\b|\bdefend\b|\battack\b|\bfight\b|\bstruggle\b|\bresist\b|\bsurrender\b|\bretreat\b|\bcapture\b|\brelease\b|\bfetch\b|\bsnip\b|\bshred\b|\bchurn\b|\bchomp\b|\bwhack\b|\bflap\b|\bflutter\b|\blurch\b|\bslink\b|\bswirl\b|\bgouge\b|\bscour\b|\bplop\b|\bwag\b|\bsnag\b|\bsway\b|\bswoop\b|\bloiter\b|\babsquatulate\b|\bstrike\b|\btear\b.*\bstrips\b|\blet\b.*\bfall\b|\bturn\b.*\bover\b|\bran away\b|\bmoved\b.*\bsmoothly\b|\bbite\b.*\bdown\b|\bback and forth\b|\btake apart\b|\buntangle\b|\bundo\b/i],

  ['quantity', /\babundant\b|\bscarce\b|\bvast\b|\benormous\b|\bhuge\b|\btiny\b|\bgiant\b|\bminiature\b|\bmassive\b|\bimmense\b|\bcolossal\b|\bmicroscopic\b|\bmaximum\b|\bminimum\b|\bexcess\b|\bsurplus\b|\bshortage\b|\boverflow\b|\bwhole\b|\bpartial\b|\bcomplete\b|\bincomplete\b|\bmyriad\b|\binnumerable\b|\bcopious\b|\bprofuse\b|\bscant\b|\bmeager\b|\bsparse\b|\bdense\b|\bplethora\b|\bdearth\b|\bpaucity\b|\bsurfeit\b|\bplentiful\b|\bubiquitous\b|\bnot thick\b|\bnot tall\b|\bnot thin\b|\bthick piece\b|\blarge amount\b|\bsmall piece\b|\bthin and narrow\b|\bwide from one side\b|\bnot sharp\b/i],

  ['texture', /\bsmooth\b|\brough\b|\bsoft\b|\bbumpy\b|\blumpy\b|\bfuzzy\b|\bfluffy\b|\bfurry\b|\bprickly\b|\bthorny\b|\bslippery\b|\bsticky\b|\bgooey\b|\bslimy\b|\bcrisp\b|\bcrunchy\b|\bbrittle\b|\bfragile\b|\bdelicate\b|\bsturdy\b|\brigid\b|\bflexible\b|\belastic\b|\bspongy\b|\bcoarse\b|\bsilky\b|\bvelvety\b|\bfeathery\b|\bdowny\b|\bglossy\b|\bmatte\b|\bpolished\b|\brusty\b|\bcorroded\b|\bweathered\b|\btattered\b|\bragged\b|\bfrayed\b|\bwrinkled\b|\bcreased\b|\bcrumpled\b|\bshiny\b.*\bsurface\b|\bshiny\b.*\blook\b|\boily\b/i],

  ['water', /\bwater\b|\bliquid\b|\bfluid\b|\bdrip\b|\bsplash\b|\bstream\b|\bdrown\b|\bwade\b|\bsail\b|\bnavigate\b|\banchor\b|\bharbor\b|\bmarina\b|\bpier\b|\bwharf\b|\bcanal\b|\breservoir\b|\bfountain\b|\bhydrant\b|\bdrain\b|\bsewer\b|\birrigation\b|\baqueduct\b|\bcistern\b|\baquatic\b|\bmarine\b|\bmaritime\b|\bnautical\b|\bnaval\b|\bseafaring\b|\bhydro\b|\bhydraulic\b|\baquifer\b|\bwatershed\b|\bfjord\b|\bstrait\b|\bgulf\b|\byacht\b|\bboat\b|\bship\b/i],

  ['light', /\billuminat\b|\bshadow\b|\bsilhouette\b|\brefract\b|\bprism\b|\bbeacon\b|\bphosphorescent\b|\bfluorescent\b|\bbioluminescen\b|\bincandescent\b|\bdazzle\b|\bbrightness\b|\bmoonlight\b|\bshine\b|\bsparkle\b|\bglitter\b|\bshimmer\b|\bgleam\b|\bglimmer\b|\bflicker\b|\bradiant\b|\bluminous\b|\blight up\b|\bbrighter\b|\bvisible\b|\bsee\b.*\bclearly\b|\btransparent\b|\btranslucent\b|\bsun\b.*\bnot shine\b|\bcool spot\b.*\bsun\b/i],

  ['sensory', /\bsound\b|\bnoise\b|\bloud\b|\bsilent\b|\bsilence\b|\bhear\b|\blisten\b|\becho\b|\bbuzz\b|\bwhistle\b|\bclang\b|\bbang\b|\bboom\b|\broar\b|\bhowl\b|\bgrowl\b|\bchirp\b|\bsqueak\b|\bsqueal\b|\bscreech\b|\brumble\b|\brushle\b|\bcrackle\b|\bsizzle\b|\bacoustic\b|\bresonance\b|\bamplify\b|\bmute\b|\bdeaf\b|\btinnitus\b|\bcacophony\b|\bdissonance\b|\beuphony\b|\btintinnabulation\b|\bsnore\b|\bsmell\b|\bstench\b|\bodor\b|\bsmell\b.*\bbad\b/i],

  ['tools', /\btool\b|\bdevice\b|\bmachine\b|\bequipment\b|\bapparatus\b|\bgadget\b|\butensil\b|\bmechanism\b|\blever\b|\bpulley\b|\bgear\b|\baxle\b|\bpiston\b|\bvalve\b|\bpump\b|\bengine\b|\bmotor\b|\bgenerator\b|\bturbine\b|\bconveyor\b|\btractor\b|\bplow\b|\bsickle\b|\bscythe\b|\banvil\b|\bbellows\b|\bkiln\b|\bloom\b|\bsextant\b|\bprotractor\b|\bcaliper\b|\bgauge\b|\bclamp\b|\blathe\b|\bawl\b|\bgimlet\b|\bauger\b|\bpointed tip\b.*\bpen\b|\bhammer\b|\bscrewdriver\b|\bwrench\b/i],

  ['nature', /\bnature\b|\bnatural\b|\benvironment\b|\bhabitat\b|\bwilderness\b|\boutdoor\b|\blandscape\b|\bscenery\b|\becology\b|\bbiome\b|\btundra\b|\bsavanna\b|\bsteppe\b|\btaiga\b|\bbiodiversity\b|\bconservation\b|\bendangered\b|\bmigrate\b|\bmigration\b|\bhibernate\b|\bpollinate\b|\bsymbiosis\b|\bparasite\b|\bcamouflage\b|\bindigenous\b|\bnative\b.*\bplace\b/i],

  ['building', /\bbuild\b|\bbuilding\b|\bconstruct\b|\barchitecture\b|\barchitect\b|\btower\b|\bcastle\b|\bpalace\b|\bfortress\b|\bchurch\b|\bcathedral\b|\bmosque\b|\bsynagogue\b|\bmonument\b|\bpillar\b|\bdome\b|\bspire\b|\bturret\b|\bcourtyard\b|\bplaza\b|\bamphitheater\b|\bcolosseum\b|\bpyramid\b|\bobelisk\b|\bpagoda\b|\bminaret\b|\blighthouse\b|\bwindmill\b|\bbarn\b|\bwarehouse\b|\bskyscraper\b|\bbridge\b|\bedifice\b|\bfacade\b|\bscaffold\b|\bblueprint\b|\bmason\b|\bplaster\b|\bbrick\b|\bconcrete\b|\bbuttress\b|\bcolonnade\b|\bportico\b|\bvestibule\b|\brotunda\b|\bcloister\b|\bperistyle\b|\bflagpole\b|\bflag\b.*\bflown\b/i],

  ['movement', /\bmovement\b|\bmotion\b|\bspeed\b|\brapid\b|\bswift\b|\brush\b|\bhurry\b|\bhasten\b|\baccelerat\b|\bdecelerat\b|\bmomentum\b|\binertia\b|\btrajectory\b|\brevolve\b|\brotate\b|\bspiral\b|\boscillat\b|\bundulat\b|\bfluctuat\b|\bcirculate\b|\bglide\b|\bsoar\b|\bhover\b|\bdescend\b|\bascend\b|\bplunge\b|\bplummet\b|\bsurge\b|\brecede\b|\bconverge\b|\bdiverge\b|\bmeander\b|\bzigzag\b|\bperipatetic\b|\bbrisk\b|\bshiver\b|\bshake\b.*\bcold\b|\bmoving very fast\b|\bquick\b.*\benergy\b/i],

  ['law', /\blaw\b|\blegal\b|\btrial\b|\bjury\b|\bverdict\b|\bcrime\b|\bfelony\b|\bmisdemeanor\b|\boffense\b|\bprosecute\b|\battorney\b|\blawyer\b|\bbarrister\b|\bsolicitor\b|\bmagistrate\b|\bjustice\b|\bconstitution\b|\bamendment\b|\bstatute\b|\blegislation\b|\bregulation\b|\bordinance\b|\bdecree\b|\bmandate\b|\binjunction\b|\bsubpoena\b|\bwarrant\b|\bbail\b|\bparole\b|\bprobation\b|\bincarcerat\b|\bimprison\b|\bpenitentiary\b|\blawsuit\b|\blitigation\b|\bplaintiff\b|\bdefendant\b|\btestimony\b|\bevidence\b|\bacquit\b|\bconvict\b|\bindict\b|\barraign\b|\bjurisprudence\b|\bhabeas\b|\bextradition\b|\bamnesty\b|\bpardon\b|\bclemency\b|\bjurisdiction\b|\bemancipat\b|\btheft\b|\bstealing\b|\bwrongdoing\b.*\bofficial\b|\bsabotage\b|\bcounterfeit\b/i],

  ['color', /\bcolor\b|\bcolour\b|\bhue\b|\btint\b|\bpigment\b|\bdye\b|\biridescent\b|\bopaque\b|\btranslucent\b|\btransparent\b|\brubescent\b|\bvivid\b|\bcolorful\b/i],

  ['power', /\bauthority\b|\bgovern\b|\bgovernment\b|\bpolitic\b|\brepublic\b|\bdemocracy\b|\boligarch\b|\btheocracy\b|\bautocra\b|\btyrann\b|\bregime\b|\bparliament\b|\bcongress\b|\bsenate\b|\blegislat\b|\belection\b|\bvote\b|\bballot\b|\brevolution\b|\breform\b|\bsovereignty\b|\bdominion\b|\bempire\b|\bcolony\b|\bimperial\b|\bfederation\b|\bveto\b|\btreaty\b|\bdiplomacy\b|\bhegemony\b|\bdominance\b.*\bleadership\b|\binterference\b.*\bpolicy\b/i],

  ['war', /\bwar\b|\bwarfare\b|\barmy\b|\bmilitary\b|\bnavy\b|\bweapon\b|\bsword\b|\bshield\b|\barmor\b|\bcannon\b|\bbomb\b|\bmissile\b|\brifle\b|\bgun\b|\bammunition\b|\bsiege\b|\binvasion\b|\btruce\b|\bceasefire\b|\bcombat\b|\bguerrilla\b|\binfantry\b|\bcavalry\b|\bbattalion\b|\bregiment\b|\bbrigade\b|\bgarrison\b|\bbunker\b|\breconnaissance\b|\bespionage\b|\bambush\b|\bmercenary\b|\bconscript\b/i],

  ['fire', /\bfire\b|\bflame\b|\bburn\b|\bburning\b|\bblaze\b|\binferno\b|\bember\b|\bsmoke\b|\bsmolder\b|\bignite\b|\bcombust\b|\bsinge\b|\bscorch\b|\bincinerate\b|\bconflagration\b|\bwildfire\b|\bbonfire\b|\bexplode\b.*\bviolently\b/i],

  ['sleep', /\bsleep\b|\bsleeping\b|\bslumber\b|\bdoze\b|\bdrowsy\b|\bdrowsiness\b|\bsnooze\b|\bbedtime\b|\binsomnia\b|\bsomnolent\b|\bsoporific\b|\bnightmare\b|\basleep\b|\bdormant\b|\binactivity\b.*\bdormancy\b/i],

  ['school', /\bschool\b|\bclassroom\b|\bhomework\b|\bexam\b|\bdiploma\b|\bgraduate\b|\beducation\b|\bcurriculum\b/i],

  ['magic', /\bmagic\b|\bmagical\b|\bwizard\b|\bwitch\b|\bsorcerer\b|\benchant\b|\bsupernatural\b|\bmystic\b|\boccult\b|\balchemy\b|\bpotion\b|\bwand\b|\blegerdemain\b|\bsleight\b.*\bhand\b|\btricks\b.*\bhands\b/i],

  ['travel', /\btravel\b|\bjourney\b|\bvoyage\b|\badventure\b|\bvisit\b|\btour\b|\bvacation\b|\bdestination\b|\bcountry\b|\bnation\b|\bcity\b|\btown\b|\bvillage\b|\bforeign\b|\babroad\b|\bpassport\b|\bluggage\b|\bsuitcase\b|\bvehicle\b|\btruck\b|\bairplane\b|\bbicycle\b|\bmotorcycle\b|\bhelicopter\b|\bsubmarine\b|\broad\b|\bhighway\b|\btunnel\b|\bpath\b|\btrail\b|\broute\b|\bgeography\b|\bairport\b|\bdetour\b|\bsouvenir\b|\bthoroughfare\b|\bcrossroads\b|\bstreet\b|\bmetropolitan\b|\btracks\b.*\brail\b|\btraveling\b.*\bnew places\b|\bhemisphere\b|\bfarewell\b|\bgoodbye\b/i],
];

// ─── PASS 3: Broader definition fallbacks ───────────────────────────────────
// Looser patterns for remaining unclassified words.

var FALLBACK_DEF_THEMES = [
  ['animals', /\bbite\b|\bchew\b|\bcreature\b|\bwild\b.*\banimal\b|\btame\b|\bdomesticat\b|\bbeast\b|\bspecies\b|\bbreed\b|\begg\b|\bpersistently\b.*\bbite\b/i],
  ['food', /\bsweet\b|\bsalty\b|\btasty\b|\bflavor\b|\bserve\b.*\bdish\b|\bdrink\b.*\bfast\b|\bcard game\b/i],
  ['actions', /\bto move\b|\bto cut\b|\bto throw\b|\bto kick\b|\bto hit\b|\bto pull\b|\bto push\b|\bclose\b.*\bshut\b|\bsend\b.*\bthrough.*air\b|\bturn\b.*\bcircle\b|\bgo get\b.*\bbring\b|\bstir\b.*\bshake\b|\brub\b.*\bsore\b|\bhop\b.*\bstep\b|\bgo away\b|\bleave\b.*\bquickly\b|\bleave\b.*\babrupt\b|\blook\b.*\bcarefully\b|\blook\b.*\blong time\b|\bquick\b.*\blook\b|\bpersistently\b|\bnot move\b|\bmoved\b.*\bquickly\b/i],
  ['people', /\bwho\b.*\bworks\b|\bsomeone who\b|\ba person who\b|\btype of person\b|\bmember\b.*\bclass\b|\bnovice\b|\bbeginner\b/i],
  ['feelings', /\bfeeling of\b|\bstate of\b.*\bmind\b|\bto feel\b|\bstrong\b.*\bemotion\b|\bagain\b.*\bpleasant\b|\bintense\b.*\binterest\b|\bpleasure\b|\brelief\b|\bcaring\b.*\byourself\b|\bunable\b.*\bstay still\b/i],
  ['science', /\bstudy of\b|\brelating to\b.*\bscien\b|\bstep-by-step\b.*\bprocedure\b|\bfast\b.*\bmoves\b/i],
  ['home', /\bused in\b.*\bhome\b|\bfound in\b.*\bkitchen\b|\bhousehold\b|\bmetal or plastic holder\b|\bclip\b.*\bhold\b|\bhang things\b/i],
  ['clothing', /\bworn on\b|\bpiece of\b.*\bcloth\b|\btype of\b.*\bgarment\b|\bcloak\b.*\bshoulder\b|\bcovering\b.*\bhead\b/i],
  ['earth', /\btype of\b.*\brock\b|\bland\b.*\bform\b|\bnarrow\b.*\bstrip\b.*\bland\b|\bnarrow\b.*\bopening\b|\bcrack\b.*\bsomething\b|\bground\b.*\bslant\b/i],
  ['quantity', /\bnot thick\b|\bnot tall\b|\bthick piece\b|\bsmall\b.*\blump\b|\btop edge\b.*\bcup\b|\bnot enough\b|\blarge enough\b|\blarge\b.*\bamount\b|\bsmall\b.*\bpiece\b|\bgreat\b.*\bdegree\b|\bgreat\b.*\bdeal\b/i],
  ['texture', /\bshiny\b|\bcoating\b|\bsurface\b.*\bsmooth\b/i],
  ['character', /\bgood\b.*\bmanners\b|\bneat\b.*\bproper\b|\bstrong\b.*\bnot giving up\b|\bcaring\b.*\bonly\b.*\byourself\b|\bavoiding\b.*\bdanger\b|\bcorrect\b.*\bbehavior\b|\bdetail\b.*\bcareful\b|\bunconventional\b.*\bstrange\b|\bfriendly\b.*\bpleasant\b|\bbold\b.*\brisk\b|\bdaring\b/i],
  ['mind', /\bfind\b.*\banswer\b|\bguess\b.*\bhappen\b|\bwatch\b.*\bcarefully\b.*\blearn\b|\bcarefully\b.*\bclosely\b|\bappearance\b.*\btrue\b|\bbeing true\b|\btrue or real\b|\bcompare\b|\bcontrasting\b.*\beffect\b|\buncertainty\b.*\bmeaning\b|\bmeaning\b.*\bunclear\b/i],
  ['light', /\blight\b.*\bpass\b|\blight\b.*\bclearly\b|\bglow\b.*\bbright\b|\bseen\b.*\bclearly\b/i],
  ['water', /\bfloat\b|\bsink\b|\bswim\b|\bdive\b/i],
  ['travel', /\bwhere\b.*\broads\b.*\bcross\b|\bshort trip\b|\bedge\b.*\bboundary\b|\bnarrow strip\b.*\bconnecting\b/i],
  ['money', /\bsupply\b.*\bsaved\b|\bgather\b.*\bcollect\b.*\btime\b|\bpaying\b|\bbenefits\b.*\bpay\b/i],
  ['building', /\bdesigning\b.*\bbuildings\b|\btall pole\b.*\bflag\b/i],
  ['movement', /\bmoving\b.*\bfast\b|\bquick\b.*\bfull\b.*\benergy\b|\bshake\b.*\bcold\b|\brunning\b.*\bfast\b/i],
  ['performance', /\bfunny\b.*\bplay\b|\bshort\b.*\bplay\b/i],
  ['sports', /\bboard game\b|\bcontest\b|\bwinner\b|\bfirst place\b|\btarget\b.*\bpoint\b|\bsharp point\b.*\bsticking\b/i],
  ['time', /\bperiod\b.*\btime\b|\bperiod\b.*\bdays\b|\bseven days\b|\bafter\b.*\bexpected\b.*\btime\b|\bout of\b.*\btime period\b|\bthousand years\b|\bevery five years\b|\bfive years\b|\bshort time\b/i],
  ['language', /\bbooklet\b|\binformation\b.*\bproduct\b|\blist\b.*\bbooks\b.*\bsources\b|\bflowers\b.*\barranged\b|\boutcome\b.*\bresolution\b.*\bstory\b|\bbrief\b.*\bdescription\b.*\bscene\b|\bdetailed\b.*\bevaluation\b/i],
  ['law', /\bstealing\b|\bstolen\b|\bdeliberate\b.*\bdestruction\b|\bgenuine\b.*\bdeceive\b/i],
  ['health', /\bsore\b|\bpain\b|\bcondition\b.*\bfrequent\b|\binjured\b/i],
];

// ── Parse + classify ─────────────────────────────────────────────────────────

var audit = [];
var distribution = {};
var allThemeNames = ['animals', 'plants', 'weather', 'earth', 'food', 'body', 'health', 'home', 'clothing', 'art', 'academic', 'money', 'language', 'time', 'people', 'feelings', 'mind', 'character', 'communication', 'actions', 'quantity', 'water', 'sensory', 'nature', 'society', 'travel', 'everyday'];
allThemeNames.forEach(function (t) { distribution[t] = 0; });

function classify(word, definition) {
  var wordLower = word.toLowerCase();

  var matchedTheme = 'everyday';

  // PASS 1: Direct word lookup
  if (WORD_THEME[wordLower]) {
    matchedTheme = WORD_THEME[wordLower];
  } else {
    var defLower = definition.toLowerCase();
    var found = false;

    // PASS 2: Definition keyword matching
    for (var i = 0; i < DEF_THEMES.length; i++) {
      if (DEF_THEMES[i][1].test(defLower)) {
        matchedTheme = DEF_THEMES[i][0];
        found = true;
        break;
      }
    }

    if (!found) {
      // PASS 3: Looser fallback patterns
      for (var j = 0; j < FALLBACK_DEF_THEMES.length; j++) {
        if (FALLBACK_DEF_THEMES[j][1].test(defLower)) {
          matchedTheme = FALLBACK_DEF_THEMES[j][0];
          break;
        }
      }
    }
  }

  // Combine small themes into broader ones
  var merges = {
    'color': 'sensory',
    'light': 'sensory',
    'texture': 'sensory',
    'music': 'art',
    'performance': 'art',
    'magic': 'mind',
    'fire': 'nature',
    'sleep': 'health',
    'movement': 'actions',
    'sports': 'actions',
    'building': 'home',
    'tools': 'home',
    'power': 'society',
    'law': 'society',
    'war': 'society',
    'school': 'academic',
    'math': 'academic',
    'science': 'academic'
  };

  return merges[matchedTheme] || matchedTheme;
}

tierFiles.forEach(function (tierName) {
  var filePath = path.join(wordsDir, tierName + '.ts');
  var content = fs.readFileSync(filePath, 'utf8');

  var newContent = content.replace(
    /(\bword:\s*'([^']+)',\s*\n\s*definition:\s*'((?:[^'\\]|\\.)*)',[\s\S]*?)theme:\s*'([^']+)'/g,
    function (match, prefix, word, definition, oldTheme) {
      var newTheme = classify(word, definition);

      distribution[newTheme]++;
      audit.push({
        word: word,
        oldTheme: oldTheme,
        newTheme: newTheme,
        changed: oldTheme !== newTheme,
        file: tierName,
      });

      return prefix + "theme: '" + newTheme + "'";
    }
  );

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
});

// ── Output results ───────────────────────────────────────────────────────────

console.log('\n=== Theme Distribution ===');
var sortedThemes = Object.keys(distribution).sort(function (a, b) { return distribution[b] - distribution[a]; });
var total = 0;
sortedThemes.forEach(function (t) {
  if (distribution[t] > 0) {
    total += distribution[t];
    console.log('  ' + t + ': ' + distribution[t]);
  }
});
console.log('\n  Total: ' + total);

var changed = audit.filter(function (a) { return a.changed; });
console.log('\n=== Changes ===');
console.log('  Changed: ' + changed.length + ' / ' + audit.length);

// Show sample changes
console.log('\n=== Sample changes (first 80) ===');
changed.slice(0, 80).forEach(function (a) {
  console.log('  ' + a.word + ': ' + a.oldTheme + ' -> ' + a.newTheme + ' (' + a.file + ')');
});

// Show words that fell to everyday
var everydayWords = audit.filter(function (a) { return a.newTheme === 'everyday'; });
console.log('\n=== Everyday (unclassified) words: ' + everydayWords.length + ' ===');
console.log('Sample: ' + everydayWords.slice(0, 80).map(function (a) { return a.word; }).join(', '));

// Write full audit log
var auditPath = path.join(__dirname, 'theme-audit.json');
fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2), 'utf8');
console.log('\nFull audit log: ' + auditPath);

if (DRY_RUN) {
  console.log('\n[DRY RUN] No files were modified.');
} else {
  console.log('\nTier files updated.');
}
