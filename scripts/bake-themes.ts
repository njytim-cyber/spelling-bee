/**
 * scripts/bake-themes.ts
 *
 * Auto-tags every word in the bank with a semantic theme based on
 * keyword matching against the word itself, its definition, and
 * example sentence.
 *
 * GOAL: 100% coverage — every word gets a theme.
 *
 * Run with: npx tsx scripts/bake-themes.ts
 */
import * as fs from 'fs';
import * as path from 'path';

type SemanticTheme =
    | 'animals' | 'nature' | 'food' | 'body' | 'home'
    | 'school' | 'sports' | 'music' | 'science' | 'feelings'
    | 'clothes' | 'travel';

// ── Theme keyword rules ──────────────────────────────────────────────────────
// Each theme has:
//   words: direct word matches (the word itself)
//   defKeywords: regex to match in definition + exampleSentence
// First match wins.

const THEME_RULES: { theme: SemanticTheme; words: Set<string>; defKeywords: RegExp }[] = [
    {
        theme: 'animals',
        words: new Set([
            'cat', 'dog', 'pig', 'hen', 'fox', 'bat', 'rat', 'bug', 'ant', 'bee',
            'cow', 'ram', 'elk', 'emu', 'owl', 'ape', 'yak', 'cub', 'pup', 'kit',
            'frog', 'fish', 'bird', 'bear', 'deer', 'duck', 'goat', 'lamb', 'lion',
            'moth', 'mule', 'newt', 'seal', 'slug', 'swan', 'toad', 'wolf', 'worm',
            'crab', 'fawn', 'foal', 'hare', 'hawk', 'lark', 'lynx', 'mink', 'pony',
            'robin', 'snail', 'snake', 'shark', 'whale', 'mouse', 'moose', 'horse',
            'tiger', 'eagle', 'crane', 'finch', 'gecko', 'heron', 'hyena', 'koala',
            'lemur', 'llama', 'otter', 'panda', 'quail', 'raven', 'skunk', 'sloth',
            'squid', 'stork', 'trout', 'viper', 'zebra', 'bison', 'camel', 'coral',
            'chipmunk', 'dolphin', 'giraffe', 'gorilla', 'hamster', 'jaguar',
            'leopard', 'lobster', 'mackerel', 'mammoth', 'meerkat', 'monkey',
            'octopus', 'ostrich', 'panther', 'parrot', 'pelican', 'penguin',
            'pigeon', 'python', 'rabbit', 'raccoon', 'salmon', 'spider', 'turtle',
            'vulture', 'walrus', 'weasel', 'badger', 'beetle', 'bobcat', 'canary',
            'cheetah', 'cicada', 'cougar', 'coyote', 'ferret', 'falcon', 'iguana',
            'impala', 'jackal', 'lizard', 'magpie', 'mantis', 'marlin', 'osprey',
            'oyster', 'puffin', 'raptor', 'toucan', 'buffalo', 'catfish', 'chicken',
            'cricket', 'dingo', 'donkey', 'dragon', 'flamingo', 'gazelle', 'grizzly',
            'halibut', 'herring', 'ibex', 'kitten', 'mustang', 'narwhal', 'peacock',
            'piranha', 'platypus', 'porcupine', 'scorpion', 'seahorse', 'sparrow',
            'starfish', 'stingray', 'sturgeon', 'swallow', 'termite', 'warthog',
            'woodpecker', 'alligator', 'armadillo', 'barracuda', 'butterfly',
            'caterpillar', 'chameleon', 'chimpanzee', 'crocodile', 'dragonfly',
            'grasshopper', 'hedgehog', 'hippopotamus', 'hummingbird', 'jellyfish',
            'kangaroo', 'nightingale', 'rhinoceros', 'salamander', 'wolverine',
            'puppy', 'calf', 'chick', 'gosling', 'tadpole', 'larvae',
            'chrysalis', 'cocoon', 'nest', 'burrow', 'den', 'habitat',
            'leash', 'hoof', 'claw', 'paw', 'fang', 'mane', 'tusk', 'snout',
            'plumage', 'antler', 'fleece', 'whisker', 'tentacle',
            'stampede', 'flock', 'herd', 'pack', 'swarm', 'litter', 'brood',
            'kennel', 'stable', 'coop', 'aquarium', 'terrarium', 'vivarium',
            'veterinarian', 'zoology', 'ornithology', 'entomology',
            'carnivore', 'herbivore', 'omnivore', 'predator', 'prey',
            'nocturnal', 'hibernate', 'migrate', 'camouflage', 'metamorphosis',
            'diphtheria',
        ]),
        defKeywords: /\b(animal|pet|furry|purr|bark|wag|tail|paw|claw|wing|beak|feather|hoof|horn|scale|fin|gill|mammal|reptile|bird|insect|fish|amphibian|creature|species|breed|predator|prey|zoo|aquarium|cage|leash|collar|veterinar|puppy|kitten|cub|fawn|foal|hatch|egg|nest|den|burrow|hunt|graze|migrate|hibernate|nocturnal|spider|dog|cat|horse|cow|pig|chicken|sheep|duck|goose|frog|snake|lizard|whale|dolphin|shark|butterfly|caterpillar|worm|beetle|mosquito|wasp|robin|eagle|hawk|parrot|penguin|elephant|monkey|gorilla|tiger|lion|bear|wolf|fox|deer|rabbit|squirrel|mouse|rat|bat|turtle|snail|crab|lobster|oyster|clam|coral|ant colony|beehive)\b/i,
    },
    {
        theme: 'nature',
        words: new Set([
            'sun', 'sky', 'mud', 'fog', 'dew', 'ice', 'log', 'oak', 'elm', 'ivy',
            'bud', 'sap', 'gem', 'ore', 'bay', 'dam', 'fen', 'bog',
            'rain', 'snow', 'wind', 'leaf', 'tree', 'bush', 'moss', 'fern', 'vine',
            'weed', 'root', 'pond', 'lake', 'hill', 'cave', 'rock', 'sand',
            'clay', 'dust', 'soil', 'moon', 'star', 'dawn', 'dusk', 'gust', 'hail',
            'mist', 'peat', 'reef', 'seed', 'stem', 'tide', 'turf', 'vale', 'wave',
            'bloom', 'bluff', 'brook', 'cliff', 'cloud', 'coast', 'creek', 'crest',
            'delta', 'field', 'flame', 'flora', 'frost', 'gorge', 'grove', 'marsh',
            'ocean', 'petal', 'plain', 'plant', 'river', 'shore', 'slope', 'smoke',
            'stone', 'storm', 'swamp', 'thorn', 'trail', 'trunk', 'water', 'woods',
            'beach', 'canyon', 'desert', 'forest', 'glacier', 'island',
            'jungle', 'meadow', 'mountain', 'prairie', 'valley', 'volcano', 'wetland',
            'rainbow', 'thunder', 'lightning', 'blizzard', 'drought', 'earthquake',
            'erosion', 'estuary', 'geyser', 'lagoon', 'plateau', 'savanna', 'tundra',
            'terrain', 'wilderness', 'atmosphere', 'landscape', 'vegetation',
            'flower', 'pollen', 'nectar', 'sprout', 'branch', 'canopy', 'horizon',
            'sunrise', 'sunset', 'twilight', 'breeze', 'tornado', 'hurricane',
            'monsoon', 'avalanche', 'waterfall', 'peninsula',
            'chrysanthemum', 'geranium', 'hibiscus', 'magnolia', 'rhododendron',
            'sequoia', 'sycamore', 'eucalyptus', 'bougainvillea',
            'amber', 'flint', 'slate', 'granite', 'marble', 'obsidian', 'quartz',
            'topaz', 'opal', 'ruby', 'pearl', 'jade', 'emerald', 'sapphire',
            'ash', 'ember', 'spark', 'blaze', 'char', 'soot',
            'drought', 'flood', 'thaw', 'squall', 'tempest', 'cyclone',
            'ravine', 'ridge', 'summit', 'basin', 'cape', 'cove', 'inlet',
            'archipelago', 'atoll', 'fjord', 'isthmus', 'strait', 'tributary',
            'topography', 'meridian', 'latitude', 'longitude', 'equator',
            'stalactite', 'stalagmite', 'sediment', 'magma', 'lava',
            'aurora', 'solstice', 'equinox', 'constellation', 'meteor',
            'rot', 'wilt', 'thrive', 'flourish', 'germinate', 'pollinate',
            'photosynthesis', 'chlorophyll', 'deciduous', 'evergreen', 'conifer',
            'autochthonous',
        ]),
        defKeywords: /\b(nature|natural|tree|plant|flower|forest|river|ocean|sea|lake|mountain|sky|weather|rain|snow|wind|storm|cloud|sun|moon|star|earth|soil|rock|stone|mineral|crystal|fossil|leaf|bloom|grow|season|spring|summer|autumn|winter|garden|field|meadow|valley|desert|jungle|island|shore|beach|wave|tide|climate|environment|ecosystem|organic|outdoor|landscape|terrain|botany|geological|volcanic|seismic|creek|stream|pond|marsh|swamp|petal|seed|branch|root|trunk|bark|moss|fern|vine|weed|bush|shrub|grass|thorn|sprout|blossom|harvest|dirt|mud|sand|clay|gravel|boulder|pebble|gem|jewel|cave|cliff|gorge|canyon|gully|volcano|glacier|iceberg|frost|dew|fog|mist|haze|sleet|drizzle|tornado|hurricane|flood|drought|thunder|lightning|sunset|sunrise|dusk|dawn|twilight|horizon|ember|flame|fire|ash|soot|char|smolder|lava|magma|erosion|sediment|fossil|crystal|quartz|granite|marble|amber)\b/i,
    },
    {
        theme: 'food',
        words: new Set([
            'jam', 'ham', 'pie', 'fig', 'nut', 'yam', 'pea', 'rye', 'oat',
            'bun', 'dip', 'sip', 'gum',
            'cake', 'soup', 'rice', 'milk', 'corn', 'plum', 'lime', 'bean', 'chip',
            'chop', 'cook', 'bake', 'beef', 'pork', 'kale', 'dill', 'sage', 'mint',
            'clam', 'curd', 'date', 'flan', 'hash', 'loaf', 'mayo', 'miso', 'naan',
            'okra', 'pear', 'stew', 'taco', 'tofu', 'wrap', 'zest',
            'apple', 'bread', 'candy', 'cream', 'flour', 'fruit', 'grain', 'grape',
            'honey', 'juice', 'lemon', 'mango', 'melon', 'olive', 'onion', 'pasta',
            'peach', 'pizza', 'salad', 'sauce', 'snack', 'spice', 'sugar', 'toast',
            'wheat', 'berry', 'broth', 'cocoa', 'curry', 'feast', 'guava',
            'kebab', 'maple', 'mocha', 'nacho', 'panko', 'papaya', 'prawn', 'quiche',
            'raita', 'ramen', 'roast', 'scone', 'syrup', 'thyme', 'wafer',
            'banana', 'butter', 'carrot', 'celery', 'cheese', 'cherry', 'cookie',
            'dinner', 'ginger', 'muffin', 'noodle', 'orange', 'pepper', 'pickle',
            'potato', 'recipe', 'tomato', 'waffle', 'yogurt', 'almond', 'apricot',
            'avocado', 'biscuit', 'burrito', 'cashew', 'chutney', 'coconut',
            'cracker', 'custard', 'dessert', 'eggplant', 'granola', 'lasagna',
            'lettuce', 'mustard', 'omelette', 'parsley', 'pretzel',
            'pumpkin', 'quinoa', 'saffron', 'sausage', 'spinach', 'vanilla',
            'broccoli', 'cinnamon', 'blueberry', 'cranberry', 'raspberry',
            'strawberry', 'pineapple', 'watermelon', 'artichoke', 'asparagus',
            'cauliflower', 'pomegranate', 'zucchini', 'vinegar', 'turmeric',
            'cardamom', 'coriander', 'marjoram', 'tarragon', 'rosemary',
            'chocolate', 'croissant', 'cappuccino', 'espresso', 'macchiato',
            'brioche', 'baguette', 'restaurant', 'cuisine', 'gourmet',
            'sommelier', 'connoisseur',
            'pan', 'pot', 'wok', 'fork', 'cup', 'mug', 'jug',
            'stir', 'fry', 'boil', 'grill', 'blend', 'whisk', 'knead',
            'feast', 'banquet', 'brunch', 'buffet', 'potluck',
            'morsel', 'crumb', 'slice', 'portion', 'serving',
            'pantry', 'larder', 'scullery',
        ]),
        defKeywords: /\b(food|eat|eaten|cook|cooked|cooking|bake|baked|baking|meal|dish|recipe|ingredient|flavor|flavour|taste|tasty|delicious|yummy|kitchen|chef|restaurant|snack|breakfast|lunch|dinner|supper|dessert|appetizer|fruit|vegetable|grain|bread|meat|dairy|spice|herb|sauce|soup|salad|drink|beverage|nutrition|calorie|vitamin|protein|cuisine|cereal|candy|chocolate|cake|pie|cookie|pastry|dough|batter|frosting|icing|sprinkle|garnish|seasoning|marinade|glaze|roast|grill|fry|boil|simmer|saute|steam|stir|whisk|chop|dice|mince|slice|peel|grate|pour|serve|plate|bowl|fork|spoon|knife|cup|mug|glass|pan|pot|oven|stove|microwave|refrigerat|freezer|pantry|grocery|market|bakery|deli|cafe|cafeteria|dine|dining|feast|banquet|appetite|hungry|thirsty|swallow|chew|bite|sip|gulp|nibble|munch|savor|devour)\b/i,
    },
    {
        theme: 'body',
        words: new Set([
            'arm', 'leg', 'hip', 'lip', 'rib', 'toe', 'jaw',
            'back', 'bone', 'chin', 'face', 'foot', 'hair', 'hand', 'head', 'heel',
            'knee', 'lung', 'neck', 'nose', 'palm', 'shin', 'skin', 'wrist',
            'ankle', 'brain', 'chest', 'cheek', 'elbow', 'heart', 'mouth', 'nerve',
            'skull', 'spine', 'teeth', 'thigh', 'thumb', 'waist',
            'finger', 'muscle', 'tongue', 'temple', 'tendon', 'tissue', 'throat',
            'kidney', 'spleen', 'pelvis', 'artery', 'trachea', 'larynx', 'bronchi',
            'abdomen', 'forearm', 'knuckle', 'nostril', 'eyebrow', 'eyelash',
            'eardrum', 'ribcage', 'sternum', 'shoulder', 'ligament', 'vertebra',
            'skeleton', 'diaphragm', 'esophagus', 'cartilage', 'collarbone',
            'nap', 'yawn', 'cough', 'sneeze', 'breathe', 'blink', 'sweat',
            'stretch', 'shiver', 'flinch', 'wince', 'cringe', 'limp',
            'health', 'illness', 'fever', 'ache', 'pain', 'sore', 'wound',
            'bruise', 'scar', 'blister', 'rash', 'itch', 'cramp', 'sprain',
            'cure', 'heal', 'bandage', 'splint', 'stitch',
            'doctor', 'nurse', 'hospital', 'clinic', 'pharmacy', 'medicine',
            'prescription', 'diagnosis', 'symptom', 'therapy', 'surgery',
            'pharmaceutical', 'stethoscope', 'physiotherapy',
            'fatigue', 'stamina', 'posture', 'reflex', 'immune', 'metabolism',
        ]),
        defKeywords: /\b(body|organ|anatomy|bone|muscle|blood|skin|cell|tissue|nerve|brain|heart|lung|stomach|liver|kidney|joint|limb|torso|skeleton|digest|breath|breathe|pulse|vein|artery|gland|membrane|head|face|eye|ear|nose|mouth|tooth|teeth|tongue|lip|chin|cheek|jaw|neck|throat|shoulder|arm|elbow|wrist|hand|finger|thumb|chest|rib|spine|back|hip|waist|leg|knee|ankle|foot|toe|heel|hair|nail|skull|pelvis|tendon|ligament|cartilage|marrow|organ|doctor|nurse|hospital|medicine|medical|health|healthy|sick|ill|disease|cure|heal|wound|injury|pain|ache|sore|fever|cough|sneeze|sweat|bleed|bruise|scar|bandage|surgery|symptom|diagnos|therapy|treatment|patient|prescri|immune|infection|inflam)\b/i,
    },
    {
        theme: 'home',
        words: new Set([
            'bed', 'mop', 'rug', 'lid', 'tap', 'bin', 'box', 'fan', 'key', 'mat',
            'bath', 'door', 'lamp', 'oven', 'roof', 'room', 'sink', 'sofa', 'wall',
            'yard', 'desk', 'iron', 'knob', 'lock', 'nail', 'pipe', 'plug',
            'rack', 'step', 'tile', 'tray', 'vent', 'wire',
            'broom', 'chair', 'couch', 'fence', 'floor', 'house', 'shelf', 'stair',
            'stove', 'table', 'towel', 'attic', 'blind', 'brush', 'cabin', 'clock',
            'cloth', 'drain', 'drape', 'frame', 'glass', 'hinge', 'hutch', 'latch',
            'ledge', 'linen', 'mantle', 'patio', 'porch', 'quilt',
            'basket', 'blender', 'bucket', 'candle', 'carpet', 'closet', 'corner',
            'drawer', 'faucet', 'freezer', 'garage', 'gutter', 'hallway',
            'hammer', 'heater', 'kettle', 'ladder', 'mirror', 'pillow', 'pliers',
            'shower', 'socket', 'sponge', 'teapot', 'toilet', 'vacuum', 'window',
            'balcony', 'blanket', 'cabinet', 'ceiling', 'chimney', 'curtain',
            'doorbell', 'fireplace', 'furniture', 'mattress', 'plumbing',
            'appliance', 'chandelier', 'upholstery',
            // Clothes merged in
            'cap', 'tie', 'belt', 'boot', 'cape', 'coat', 'gown', 'hood', 'jean',
            'lace', 'mask', 'mitt', 'robe', 'sash', 'shoe', 'sock', 'suit', 'vest',
            'apron', 'cloak', 'dress', 'glove', 'heels', 'jeans', 'pants',
            'scarf', 'shawl', 'shirt', 'skirt', 'smock', 'stole', 'visor',
            'blouse', 'bonnet', 'button', 'collar', 'corset', 'fabric',
            'jacket', 'jumper', 'mitten', 'outfit', 'pajama', 'pocket', 'poncho',
            'ribbon', 'sandal', 'shorts', 'sleeve', 'slipper', 'stitch', 'thread',
            'tights', 'tunic', 'tuxedo', 'zipper',
            'bandana', 'cardigan', 'costume', 'fashion', 'flannel', 'garment',
            'leather', 'leotard', 'overcoat', 'raincoat', 'sneaker', 'sweater',
            'uniform', 'wardrobe', 'bracelet', 'camisole', 'cashmere', 'necklace',
            'lingerie', 'suspenders', 'accessories', 'embroidery',
            // Tools & objects
            'bag', 'jar', 'jug', 'lid', 'peg', 'pin', 'rod', 'tag', 'wax',
            'bolt', 'clip', 'cord', 'hook', 'knot', 'loop', 'rope', 'tape',
            'crate', 'chest', 'pouch', 'purse', 'sack', 'trunk',
            'gadget', 'widget', 'wrench', 'screwdriver',
            'bead', 'gem', 'ring', 'charm', 'brooch', 'pendant', 'locket',
        ]),
        defKeywords: /\b(home|house|room|door|window|wall|floor|ceiling|roof|kitchen|bedroom|bathroom|living|garage|attic|basement|furniture|chair|table|sofa|couch|lamp|curtain|shelf|cabinet|closet|drawer|appliance|household|domestic|interior|decor|clean|vacuum|sweep|mop|laundry|plumbing|fixture|cloth|clothing|wear|garment|fabric|textile|dress|shirt|pants|skirt|coat|jacket|shoe|boot|hat|cap|sock|glove|scarf|belt|tie|button|zipper|pocket|sleeve|collar|fashion|outfit|uniform|costume|apparel|attire|lace|silk|wool|cotton|linen|denim|velvet|satin|stitch|sew|knit|tailor|wardrobe|accessory|jewelry|tool|hammer|nail|screw|wrench|pliers|drill|saw|tape|glue|paint|brush|ladder|rope|chain|wire|cable|plug|socket|battery|switch|candle|lamp|lantern|torch|broom|mop|bucket|sponge|towel|blanket|pillow|mattress|quilt|sheet|curtain|rug|carpet|mat|container|box|bag|basket|jar|can|bottle|crate|chest|trunk|lid|handle|knob|hinge|latch|lock|key|bolt|hook|clip|pin|peg|rack|shelf|tray|cart|toy|doll|game|puzzle|block|cradle|crib)\b/i,
    },
    {
        theme: 'school',
        words: new Set([
            'pen', 'sum', 'add',
            'book', 'math', 'read', 'test', 'quiz', 'note', 'page', 'rule',
            'chalk', 'class', 'count', 'essay', 'grade', 'learn', 'paint', 'paper',
            'spell', 'study', 'teach', 'write', 'draft', 'erase', 'graph', 'index',
            'board', 'chart', 'globe', 'ruler',
            'answer', 'crayon', 'eraser', 'lesson', 'pencil', 'report', 'school',
            'sketch', 'folder', 'marker', 'recess', 'student', 'teacher',
            'diploma', 'grammar', 'library', 'problem', 'project', 'pronoun',
            'subject', 'syllabus', 'textbook', 'alphabet', 'calculus', 'geometry',
            'semester', 'paragraph', 'education', 'curriculum', 'dictionary',
            'encyclopedia', 'literature', 'vocabulary',
            // Music & arts merged in
            'hum', 'rap', 'art',
            'band', 'beat', 'bell', 'clap', 'drum', 'duet', 'harp', 'hymn', 'jazz',
            'lute', 'lyric', 'oboe', 'reed', 'sing', 'solo', 'song', 'tone',
            'tune', 'bass', 'gong', 'riff',
            'album', 'banjo', 'brass', 'cello', 'choir', 'chord', 'dance', 'flute',
            'genre', 'melody', 'opera', 'organ', 'piano', 'polka', 'rhythm', 'tempo',
            'tenor', 'tuba', 'viola', 'vocal', 'waltz',
            'anthem', 'ballad', 'chorus', 'cymbal', 'fiddle', 'guitar', 'jingle',
            'lyrics', 'maraca', 'octave', 'record', 'reggae', 'sonata', 'string',
            'treble', 'ukulele', 'violin',
            'clarinet', 'composer', 'concerto', 'ensemble', 'falsetto', 'harmonica',
            'keyboard', 'mandolin', 'musician', 'overture', 'piccolo', 'serenade',
            'symphony', 'trombone', 'trumpet', 'xylophone', 'accordion', 'baritone',
            'conductor', 'crescendo', 'orchestra', 'percussion', 'saxophone',
            'tambourine', 'metronome', 'staccato', 'fortissimo', 'pianissimo',
            // Language & words
            'word', 'verb', 'noun', 'text', 'tale', 'poem', 'myth', 'lore',
            'quote', 'prose', 'verse', 'story', 'fable', 'novel',
            'author', 'writer', 'editor', 'publish', 'chapter',
            'rhyme', 'stanza', 'sonnet', 'limerick', 'haiku',
            'syllable', 'consonant', 'vowel', 'prefix', 'suffix',
            'synonym', 'antonym', 'homonym', 'metaphor', 'simile',
            'allegory', 'rhetoric', 'eloquent', 'articulate',
            'sesquipedalian', 'loquacious', 'grandiloquent', 'verbose',
            'mnemonic', 'acronym', 'etymology',
            'ink', 'type', 'font', 'print', 'stamp',
            'archive', 'museum', 'gallery', 'exhibit', 'artifact',
            'sculpture', 'portrait', 'canvas', 'palette', 'easel',
            'theater', 'theatre', 'cinema', 'stage', 'curtain',
        ]),
        defKeywords: /\b(school|class|teach|learn|study|read|write|spell|math|history|english|homework|exam|test|quiz|grade|student|teacher|professor|principal|lesson|lecture|textbook|library|pencil|pen|paper|book|notebook|education|academic|scholarship|curriculum|diploma|graduate|university|college|music|song|sing|instrument|melody|rhythm|beat|tune|note|chord|band|orchestra|concert|perform|dance|piano|guitar|drum|violin|flute|trumpet|vocal|choir|harmony|compose|lyric|genre|jazz|classical|opera|symphony|acoustic|tempo|art|artist|paint|draw|sketch|sculpt|craft|creative|gallery|museum|theater|theatre|stage|act|play|drama|comedy|tragedy|poem|poet|story|novel|fiction|author|writer|publish|chapter|verse|rhyme|stanza|literature|language|grammar|sentence|paragraph|word|letter|alphabet|vowel|consonant|syllable|prefix|suffix|synonym|antonym|metaphor|vocabulary|dictionary|encyclopedia|knowledge|wisdom|intellect|genius|scholar|philosopher|doctrine|thesis|dissertation|lecture|seminar|symposium)\b/i,
    },
    {
        theme: 'sports',
        words: new Set([
            'hit', 'run', 'win', 'gym',
            'ball', 'goal', 'jump', 'kick', 'race', 'swim', 'team', 'toss', 'skip',
            'catch', 'climb', 'coach', 'match', 'score', 'throw', 'vault',
            'arena', 'bench', 'block', 'chase', 'court', 'guard', 'hurdle',
            'pitch', 'relay', 'serve', 'slide', 'sport', 'squat', 'swing',
            'boxing', 'diving', 'fencer', 'hockey', 'karate', 'league', 'player',
            'rowing', 'soccer', 'sprint', 'tennis', 'trophy', 'basket', 'bounce',
            'defeat', 'fumble', 'goalie', 'jogger', 'kickoff', 'paddle', 'tackle',
            'archery', 'athlete', 'badminton', 'baseball', 'cycling', 'dribble',
            'exercise', 'football', 'gymnastics', 'lacrosse', 'marathon', 'olympics',
            'practice', 'referee', 'softball', 'swimming', 'training', 'triathlon',
            'volleyball', 'wrestling', 'basketball', 'gymnasium',
            'championship', 'sportsmanship',
            // Movement & physical actions
            'dash', 'hop', 'jog', 'lunge', 'leap', 'vault', 'dive', 'hurl',
            'flex', 'twist', 'spin', 'dodge', 'duck', 'spar', 'bout',
            'trophy', 'medal', 'podium', 'champion', 'finalist',
        ]),
        defKeywords: /\b(sport|game|play|team|score|win|lose|match|race|compete|compet|athlete|coach|train|exercise|ball|bat|kick|throw|catch|jump|swim|run|sprint|goal|point|champion|medal|trophy|league|tournament|field|court|pitch|arena|stadium|gym|fitness|workout|jog|dash|sprint|hurdle|relay|marathon|triathlon|boxing|wrestling|fencing|karate|judo|archery|cycling|rowing|sailing|surfing|skiing|skating|hockey|soccer|football|baseball|basketball|tennis|volleyball|golf|cricket|rugby|polo|bowling|billiard|referee|umpire|penalty|foul|overtime|halftime|playoff|scrimmage|tackle|dribble|volley|smash|serve|punt|lob|slam|dunk)\b/i,
    },
    {
        theme: 'science',
        words: new Set([
            'lab', 'gas', 'ion', 'ray',
            'acid', 'atom', 'data', 'gene', 'heat', 'mass', 'volt', 'watt',
            'beam', 'flux', 'lens', 'mole', 'ohms', 'spin',
            'alloy', 'cycle', 'decay', 'force', 'laser', 'light',
            'lunar', 'magma', 'metal', 'orbit', 'ozone', 'phase', 'power',
            'prism', 'probe', 'radar', 'radio', 'solar', 'sound', 'space', 'speed',
            'vapor', 'virus',
            'carbon', 'charge', 'comet', 'cosmos', 'energy', 'fossil', 'genome',
            'helium', 'magnet', 'matter', 'meteor', 'motion', 'neuron', 'newton',
            'oxygen', 'photon', 'plasma', 'proton', 'quartz', 'rocket', 'sodium',
            'static', 'vector',
            'anatomy', 'biology', 'calorie', 'celsius', 'chamber', 'channel',
            'circuit', 'density', 'eclipse', 'element', 'entropy',
            'formula', 'friction', 'gravity', 'isotope', 'kinetic',
            'mixture', 'nebula', 'neutron', 'nucleus', 'orbital',
            'osmosis', 'physics', 'polymer', 'protein', 'quantum', 'reactor',
            'theorem', 'thermal', 'uranium', 'voltage',
            'bacteria', 'catalyst', 'chemical', 'compound', 'decibel', 'dinosaur',
            'electron', 'equation', 'evolution', 'genetics', 'hydrogen',
            'molecule', 'nitrogen', 'particle', 'pendulum', 'reaction', 'spectrum',
            'velocity', 'algorithm', 'astronomy', 'biosphere', 'chemistry',
            'chromosome', 'ecosystem', 'frequency', 'magnetism', 'microscope',
            'organism', 'radiation', 'satellite', 'telescope', 'centrifugal',
            'combustion', 'convection', 'evaporation', 'hypothesis', 'metabolism',
            'photosynthesis', 'thermometer', 'wavelength',
            // Tech & computing
            'code', 'byte', 'chip', 'disk', 'file', 'link', 'node', 'port',
            'pixel', 'robot', 'cache', 'debug', 'input', 'modem', 'mouse',
            'cursor', 'server', 'binary', 'digital', 'software', 'hardware',
            'network', 'program', 'browser', 'database', 'internet', 'download',
            'algorithm', 'encryption', 'firewall',
            // Numbers & math
            'zero', 'half', 'pair', 'dozen', 'ratio', 'angle', 'fraction',
            'percent', 'decimal', 'integer', 'equation', 'formula',
            'diameter', 'circumference', 'perimeter', 'symmetry', 'polygon',
            'theorem', 'calculus', 'geometry', 'algebra', 'arithmetic',
            'hypothesis', 'experiment', 'theory', 'thesis',
            'millennium',
        ]),
        defKeywords: /\b(science|scientist|experiment|lab|chemical|element|atom|molecule|cell|energy|force|gravity|magnet|electric|physics|biology|chemistry|geology|astronomy|research|theory|hypothesis|discover|invent|microscope|telescope|fossil|mineral|equation|formula|reaction|compound|specimen|analyze|observe|measure|data|evidence|DNA|gene|virus|bacteria|organism|evolution|species|technology|tech|computer|digital|machine|engine|motor|device|invent|robot|circuit|battery|electricity|solar|nuclear|radiation|frequency|wavelength|spectrum|particle|quantum|relativity|thermodynamic|entropy|kinetic|potential|velocity|accelerat|momentum|density|volume|mass|weight|temperature|celsius|fahrenheit|kelvin|meter|litre|gram|newton|joule|watt|volt|ampere|hertz|decimal|fraction|percent|ratio|proportion|algebra|geometry|calculus|statistic|probability|logarithm|exponent|variable|coefficient|theorem|axiom|postulate|integer|prime|composite|factorial|polynomial|matrix|vector|algorithm|binary|hexadecimal|pixel|megabyte|gigabyte|bandwidth|latitude|longitude|centrifug|combustion|convection|evaporat|condensat|osmosis|diffusion|catalyst|enzyme|photosynthesis|chromosome|genome|mutation|natural selection|epoch|era|stratum|tectonic|seismic)\b/i,
    },
    {
        theme: 'feelings',
        words: new Set([
            'joy', 'sad', 'shy', 'mad',
            'calm', 'fear', 'glad', 'glee', 'grim', 'hope', 'kind', 'love', 'mood',
            'rage', 'wary', 'zeal', 'bold', 'dull', 'envy', 'glum', 'keen',
            'mild', 'pity', 'rude', 'smug', 'sour', 'tame', 'vain', 'weak', 'woe',
            'angry', 'bliss', 'brave', 'cheer', 'cross', 'eager', 'faith', 'happy',
            'jolly', 'merry', 'moody', 'peace', 'pride', 'quiet', 'scare', 'shame',
            'sorry', 'sweet', 'tense', 'trust', 'upset', 'worry',
            'afraid', 'caring', 'clever', 'gentle', 'grumpy', 'humble', 'joyful',
            'lonely', 'loving', 'polite', 'relief', 'tender',
            'anxious', 'bashful', 'content', 'curious', 'delight', 'devoted',
            'elation', 'emotion', 'excited', 'fearful', 'furious', 'grateful',
            'grouchy', 'hopeful', 'jealous', 'nervous', 'patient', 'pleased',
            'restless', 'somber', 'tearful', 'worried',
            'cheerful', 'confused', 'depressed', 'ecstatic', 'euphoria',
            'generous', 'irritable', 'merciful', 'nostalgic',
            'optimistic', 'pessimistic', 'sensitive', 'terrified', 'thrilled',
            'vulnerable', 'melancholy', 'compassion', 'enthusiasm', 'resentment',
            'satisfaction', 'bewildered', 'exhilarated', 'sympathetic',
            // Character & personality
            'mean', 'nice', 'cool', 'warm', 'fair', 'true', 'wise', 'dumb',
            'good', 'bad', 'fun', 'odd', 'new', 'old', 'raw',
            'smart', 'proud', 'loyal', 'snide', 'stern', 'stoic', 'naive',
            'witty', 'meek', 'brash', 'coy', 'prim', 'suave', 'aloof',
            'candid', 'devout', 'docile', 'fickle', 'frugal', 'genial',
            'giddy', 'jovial', 'lavish', 'modest', 'nimble', 'placid',
            'serene', 'shrewd', 'somber', 'supple', 'timid', 'zealous',
            'adamant', 'affable', 'ardent', 'austere', 'benign', 'callous',
            'complacent', 'diligent', 'dormant', 'eloquent', 'fervent',
            'gracious', 'haughty', 'impudent', 'insolent', 'languid',
            'lethargic', 'magnanimous', 'nonchalant', 'oblivious', 'obstinate',
            'pensive', 'petulant', 'pompous', 'prudent', 'reckless',
            'resilient', 'reticent', 'sanguine', 'sardonic', 'skeptical',
            'taciturn', 'tenacious', 'truculent', 'vehement', 'vigilant',
            'whimsical', 'wistful', 'effervescent', 'insouciance',
            'obsequious', 'pusillanimous', 'supercilious', 'querulous',
            'perspicacious', 'recalcitrant', 'sycophant',
            'schadenfreude', 'ennui', 'angst', 'malaise',
            // Social interaction
            'hug', 'nod', 'sob', 'beg', 'bow', 'cry', 'yell',
            'wink', 'grin', 'sigh', 'gasp', 'weep', 'moan', 'groan',
            'laugh', 'smile', 'frown', 'scowl', 'smirk', 'sneer',
            'praise', 'blame', 'scold', 'taunt', 'mock', 'plead',
            'forgive', 'betray', 'console', 'comfort', 'encourage',
            'flatter', 'compliment', 'criticize', 'condemn', 'acquiesce',
            'conscientious', 'magnanimous',
        ]),
        defKeywords: /\b(feel|feeling|emotion|mood|happy|sad|angry|scared|afraid|brave|calm|nervous|excited|worried|anxious|joy|sorrow|grief|love|hate|fear|hope|pride|shame|guilt|envy|jealous|lonely|grateful|compassion|empathy|sympathy|content|delight|frustrat|confus|disappoint|embarrass|tender|gentle|kind|cruel|bitter|cheerful|gloomy|melanchol|shy|bold|timid|brave|coward|stubborn|patient|impatient|generous|selfish|honest|dishonest|loyal|faithful|trust|betray|forgive|resent|admire|despise|pity|merciful|ruthless|humble|proud|arrogant|modest|vain|grumpy|cheerful|optimistic|pessimistic|anxious|relaxed|tense|peaceful|agitat|irritat|annoy|please|satisfy|disappoint|thrill|bore|excite|frighten|terrif|horrif|astonish|amaze|surprise|shock|stun|bewilder|perplex|dismay|elat|ecstat|eupher|wistful|nostalgic|sentimental|solemn|somber|sullen|morose|dour|bleak|dismal|dreary|forlorn|desolat|character|personality|temper|disposition|demeanor|attitude|manner|behavior|behavio|conduct|virtue|vice|moral|immoral|ethical|wicked|noble|ignoble|dignif|respect|disrespect|courteous|rude|polite|impolite|gracious|boorish|tactful|tactless|diplomatic|blunt|candid|sincere|insincere|disingenuous|pretentious|pompous|haughty|smug|conceited|egotistic|narcissi|altruistic|benevolent|malevolent|philanthropic|misanthropic|stoic|apathetic|indifferent|zealous|fervent|ardent|lukewarm|tepid|nonchalant|insoucian|complacen|vigilant|diligent|negligent|meticulous|careless|scrupulous|unscrupulous|conscientious|perfunctory|assiduous|lackadaisical)\b/i,
    },
    {
        theme: 'travel',
        words: new Set([
            'bus', 'cab', 'car', 'fly', 'jet', 'map', 'van',
            'bike', 'boat', 'dock', 'lane', 'path', 'port', 'ride', 'road', 'sail',
            'ship', 'taxi', 'tour', 'trek', 'trip', 'walk',
            'canoe', 'drive', 'ferry', 'float', 'hotel', 'kayak', 'plane',
            'route', 'steer', 'train', 'truck', 'wagon', 'yacht',
            'cruise', 'flight', 'harbor',
            'journey', 'launch', 'runway', 'subway', 'ticket', 'travel',
            'trolley', 'tunnel', 'voyage',
            'airport', 'bicycle', 'caravan', 'charter', 'compass', 'freeway',
            'highway', 'luggage', 'mileage', 'passage', 'pilgrim',
            'railway', 'scooter', 'suitcase', 'terminal', 'vehicle',
            'aircraft', 'aviation', 'commuter', 'crossing', 'escalator',
            'excursion', 'explorer', 'itinerary', 'limousine', 'locomotive',
            'navigator', 'passenger', 'transport', 'wanderlust',
            'destination', 'automobile', 'helicopter', 'intersection',
            // Places & geography
            'town', 'city', 'park', 'mall', 'shop', 'store', 'market',
            'bridge', 'tower', 'castle', 'palace', 'temple', 'church', 'mosque',
            'village', 'suburb', 'country', 'nation', 'state', 'province',
            'border', 'frontier', 'territory', 'colony', 'empire',
            'continent', 'hemisphere', 'region', 'district', 'precinct',
            'address', 'avenue', 'boulevard', 'highway', 'alley', 'street',
            'expatriate', 'gubernatorial',
        ]),
        defKeywords: /\b(travel|trip|journey|voyage|tour|explore|adventure|visit|drive|ride|fly|sail|boat|ship|plane|train|bus|car|truck|bicycle|motorcycle|vehicle|transport|road|highway|bridge|tunnel|airport|station|port|harbor|dock|hotel|motel|hostel|passport|ticket|luggage|suitcase|map|compass|route|destination|foreign|abroad|tourist|vacation|holiday|commute|navigate|depart|arrive|embark|disembark|transit|freight|cargo|locomotiv|carriage|wagon|chariot|bicycle|automobile|engine|fuel|gasoline|diesel|traffic|intersection|pedestrian|crosswalk|sidewalk|pavement|avenue|boulevard|highway|freeway|turnpike|plaza|square|park|garden|fountain|monument|statue|landmark|museum|cathedral|mosque|synagogue|temple|palace|castle|fortress|citadel|tower|city|town|village|suburb|metropolis|capital|province|state|country|nation|continent|island|border|frontier|colony|territory|empire|republic|kingdom|democracy|citizen|resident|immigrant|emigrant|refugee|exile|nomad|pilgrim|wanderer|voyager|explorer|pioneer|settler|conquer|colonize)\b/i,
    },
];

// ── Process tier files ──────────────────────────────────────────────────────

const WORDS_DIR = path.resolve(import.meta.dirname, '../src/domains/spelling/words');

const TIER_FILES = [
    'tier1.ts', 'tier2.ts', 'tier3.ts', 'tier4.ts', 'tier5.ts',
    'tier5-scripps.ts', 'tier5-state.ts',
];

function detectTheme(word: string, definition: string, example: string): SemanticTheme | null {
    const lowerWord = word.toLowerCase();
    const text = (definition + ' ' + example).toLowerCase();

    // Check direct word matches first (highest confidence)
    for (const rule of THEME_RULES) {
        if (rule.words.has(lowerWord)) return rule.theme;
    }

    // Then check definition + example keywords
    for (const rule of THEME_RULES) {
        if (rule.defKeywords.test(text)) return rule.theme;
    }

    return null;
}

// Fallback: assign unthemed words to a theme based on their part of speech
// and word characteristics
function fallbackTheme(word: string, definition: string, pos: string): SemanticTheme {
    const def = definition.toLowerCase();

    // Adjectives describing people → feelings
    if (pos === 'adjective') {
        if (/person|people|someone|somebody|character|manner|way of|attitude|behavio/i.test(def)) return 'feelings';
        if (/not |without |lacking |opposite|against|wrong|bad|poor|negative/i.test(def)) return 'feelings';
        if (/good|great|fine|nice|wonderful|excellent|superior|best/i.test(def)) return 'feelings';
        if (/large|small|big|tiny|huge|long|short|tall|wide|narrow|thick|thin|heavy|light|fast|slow|quick|bright|dark|loud|soft|hard|smooth|rough|sharp|flat|round|straight|bent|curved/i.test(def)) return 'science';
        if (/color|colour|red|blue|green|yellow|white|black|brown|pink|purple|orange|grey|gray|golden|silver/i.test(def)) return 'nature';
        return 'feelings';
    }

    // Verbs
    if (pos === 'verb') {
        if (/move|go|come|walk|run|push|pull|carry|lift|drag|throw|catch|hold|grab|reach|drop|fall|rise|turn|bend|stretch|squeeze|press|slide|roll|spin|twist|shake|swing|wave|bounce|splash|crash|smash|break|tear|cut|split|fold|wrap|tie|untie|open|close|shut|lock|unlock|pour|fill|empty|pile|stack|spread|scatter|gather|collect|arrange|sort|mix|stir|blend|scrub|scrape|rub|wipe|polish|sand|grind|carve|chip|crack|peel|strip/i.test(def)) return 'home';
        if (/say|tell|ask|answer|speak|talk|call|shout|whisper|yell|scream|sing|hum|chant|announce|declare|proclaim|claim|state|mention|describe|explain|discuss|debate|argue|dispute|deny|admit|confess|promise|swear|vow|warn|threaten|order|command|demand|request|invite|suggest|recommend|advise|persuade|convince|urge/i.test(def)) return 'school';
        if (/think|know|understand|believe|remember|forget|learn|discover|realize|recognize|notice|imagine|wonder|suppose|guess|assume|expect|predict|plan|decide|choose|prefer|intend|mean|consider|compare|contrast|distinguish|judge|evaluate|assess|measure|estimate|calculate|count/i.test(def)) return 'school';
        if (/make|create|build|form|shape|design|draw|paint|write|compose|produce|manufacture|construct|assemble|install|repair|fix|adjust|modify|change|transform|convert|develop|improve|enhance|refine|perfect|complete|finish|accomplish|achieve/i.test(def)) return 'school';
        if (/give|take|get|have|own|keep|save|store|hide|find|search|look|see|watch|observe|examine|inspect|check|test|try|use|need|want|wish|like|enjoy|love|hate|prefer/i.test(def)) return 'home';
        return 'home';
    }

    // Adverbs
    if (pos === 'adverb') {
        if (/manner|way|how|speed|fast|slow|quick|careful|gentle|rough|hard|soft/i.test(def)) return 'feelings';
        return 'feelings';
    }

    // Nouns — try to classify by context
    if (pos === 'noun') {
        if (/person|people|man|woman|child|baby|boy|girl|leader|worker|member|group|crowd|society|community|family|friend|neighbor|stranger|citizen|individual/i.test(def)) return 'travel';
        if (/place|area|region|location|site|spot|position|space|zone|section|part|piece|side|edge|corner|top|bottom|middle|center|front|back|end|beginning/i.test(def)) return 'travel';
        if (/time|moment|second|minute|hour|day|week|month|year|century|decade|period|age|era|epoch|season|morning|evening|night|noon|midnight|past|present|future|beginning|end/i.test(def)) return 'science';
        if (/amount|number|count|total|sum|quantity|measure|size|length|width|height|depth|weight|volume|distance|speed|rate|degree|level|rank|order|sequence|pattern|system|structure|form|shape|type|kind|sort|class|category|group|set|series|list|row|column|line|circle|square|triangle/i.test(def)) return 'science';
        if (/sound|noise|voice|tone|pitch|volume|echo|ring|buzz|hum|click|crack|snap|pop|bang|boom|crash|roar|rumble|thunder|whistle|howl|growl|bark|chirp|tweet|squeak/i.test(def)) return 'school';
        if (/act|action|event|happening|situation|condition|state|case|instance|example|fact|truth|lie|idea|thought|opinion|belief|view|point|question|answer|problem|solution|plan|method|way|means|effort|attempt|result|effect|cause|reason|purpose|goal|aim|target|mark|sign|signal|symbol|clue|hint|trick|trap|secret|mystery|puzzle|riddle/i.test(def)) return 'school';
        if (/power|strength|energy|ability|skill|talent|gift|quality|feature|property|characteristic|nature|tendency|habit|custom|tradition|practice|rule|law|right|duty|responsibility|obligation|freedom|liberty|justice|peace|war|battle|fight|conflict|struggle|victory|defeat|success|failure|progress|change|growth|decline|loss|gain|increase|decrease|rise|fall|start|finish/i.test(def)) return 'feelings';
        if (/money|price|cost|value|worth|wealth|fortune|profit|loss|income|wage|salary|payment|debt|loan|tax|fee|fine|charge|bill|receipt|account|budget|fund|investment|stock|bond|share|asset|capital|currency|dollar|cent|coin|cash|check|credit|interest|rate|market|trade|business|company|firm|industry|economy|commerce|merchant|vendor|customer|client/i.test(def)) return 'travel';
        if (/mark|spot|stain|smudge|scratch|dent|bump|lump|blob|clump|chunk|pile|heap|stack|bundle|batch|load|mass|block|slab|strip|strand|thread|string|rope|chain|link|loop|knot|twist|curl|coil|spiral|ring|band|strap|buckle|clasp|clip|hook|pin|peg|bolt|screw|rivet/i.test(def)) return 'home';
    }

    // Last resort: default to 'home' (broadest catch-all)
    return 'home';
}

let totalWords = 0;
let totalTagged = 0;
let totalFallback = 0;
const themeCounts: Record<string, number> = {};

for (const filename of TIER_FILES) {
    const filepath = path.join(WORDS_DIR, filename);
    let content = fs.readFileSync(filepath, 'utf-8');

    // Remove any existing theme lines (entire line including newline)
    content = content.replace(/^.*theme: '.*?',?\s*\n/gm, '');

    // Find all word+definition+example+pos entries
    const wordRegex = /word:\s*'((?:[^'\\]|\\.)*)'/g;
    const defRegex = /definition:\s*'((?:[^'\\]|\\.)*)'/g;
    const exRegex = /exampleSentence:\s*'((?:[^'\\]|\\.)*)'/g;
    const posRegex = /partOfSpeech:\s*'(\w+)'/g;

    const words: { word: string; rawWord: string; index: number }[] = [];
    const defs: string[] = [];
    const examples: string[] = [];
    const poses: string[] = [];
    let match;

    while ((match = wordRegex.exec(content)) !== null) {
        words.push({ word: match[1].replace(/\\'/g, "'"), rawWord: match[1], index: match.index });
    }
    while ((match = defRegex.exec(content)) !== null) defs.push(match[1].replace(/\\'/g, "'"));
    while ((match = exRegex.exec(content)) !== null) examples.push(match[1].replace(/\\'/g, "'"));
    while ((match = posRegex.exec(content)) !== null) poses.push(match[1]);

    let offset = 0;
    let fileTagged = 0;
    let fileFallback = 0;

    for (let i = 0; i < words.length; i++) {
        totalWords++;
        const { word, rawWord } = words[i];
        const definition = defs[i] ?? '';
        const example = examples[i] ?? '';
        const pos = poses[i] ?? 'noun';

        let theme = detectTheme(word, definition, example);
        let isFallback = false;
        if (!theme) {
            theme = fallbackTheme(word, definition, pos);
            isFallback = true;
            totalFallback++;
            fileFallback++;
        }

        totalTagged++;
        fileTagged++;
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;

        const searchStart = content.indexOf(`word: '${rawWord}'`, offset);
        if (searchStart === -1) continue;

        // Find closing `},` or `}\n` for this word's object.
        // Some entries have distractors ending with `],    },` on the same line,
        // so we also search for `},` preceded by `]` on the same line.
        const closingBrace = content.indexOf('\n    },', searchStart);
        const closingBraceFinal = content.indexOf('\n    }\n', searchStart);

        // Also handle inline `],    },` pattern (from bake-distractors)
        const inlineBraceMatch = content.indexOf('],    },', searchStart);
        const inlineBracePos = inlineBraceMatch !== -1 ? inlineBraceMatch + 2 : -1; // position at `    },`

        const candidates = [closingBrace, closingBraceFinal, inlineBracePos].filter(x => x !== -1);
        const bracePos = candidates.length > 0 ? Math.min(...candidates) : -1;

        if (bracePos === -1) {
            console.warn(`  WARNING: Could not find closing brace for "${word}"`);
            continue;
        }

        // If we matched an inline brace, we need to reformat: insert theme before `},` and fix indentation
        let insertLine: string;
        if (bracePos === inlineBracePos && inlineBracePos !== -1) {
            // Replace `],    },` with `],\n        theme: '${theme}',\n    },`
            const beforeInline = content.lastIndexOf('],', bracePos);
            insertLine = `],\n        theme: '${theme}',\n    },`;
            content = content.slice(0, beforeInline) + insertLine + content.slice(bracePos + 6); // skip `    },`
        } else {
            insertLine = `\n        theme: '${theme}',`;
            content = content.slice(0, bracePos) + insertLine + content.slice(bracePos);
        }
        offset = bracePos + insertLine.length;

        if (isFallback && totalFallback <= 20) {
            console.log(`  FALLBACK: "${word}" (${pos}) → ${theme} — ${definition.slice(0, 60)}`);
        }
    }

    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(`${filename}: ${fileTagged}/${words.length} tagged (${fileFallback} fallback)`);
}

console.log(`\nDone! ${totalTagged}/${totalWords} words tagged (${totalFallback} via fallback).`);
console.log('\nTheme distribution:');
for (const [theme, count] of Object.entries(themeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${theme}: ${count}`);
}
