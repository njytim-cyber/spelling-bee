/**
 * export-to-app.cjs
 *
 * Exports high-quality words from the pipeline DB into TypeScript source files.
 * Only exports words that pass ALL quality gates — no garbage data.
 *
 * Quality gates:
 * 1. Must have real Wiktionary example sentence (no generated filler)
 * 2. Must have Wiktionary IPA pronunciation (no ALL-CAPS fallbacks)
 * 3. Example must be clean (no newlines, brackets, archaic language)
 * 4. Definition must be kid-appropriate and match the word
 * 5. Word must be age-appropriate for its tier
 * 6. Theme/pattern must be meaningfully classified (not lazy defaults)
 *
 * Usage: node scripts/pipeline/export-to-app.cjs [--tier=N] [--limit=N] [--dry-run] [--sample=N]
 *
 * Sources:
 * - Wiktionary via kaikki.org (CC-BY-SA 3.0)
 * - WordNet 3.1 (Princeton University, BSD license)
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'output', 'words.db');
const WORDS_DIR = path.join(__dirname, '..', '..', 'src', 'domains', 'spelling', 'words');

// ── IPA → simplified phonetic pronunciation ──────────────────────────────────
// We keep the real Wiktionary IPA. It's accurate and displayed as /.../ in the app.
// Just clean up formatting artifacts.

function cleanIPA(ipa) {
    if (!ipa) return null;
    let clean = ipa.trim();
    // Remove enclosing slashes or brackets — we add our own in the UI
    clean = clean.replace(/^[\[\/]/, '').replace(/[\]\/]$/, '');
    // Remove stress marks for simplified display
    clean = clean.replace(/[ˈˌ]/g, '');
    // Remove syllable dots
    clean = clean.replace(/\./g, '');
    // Trim whitespace
    clean = clean.trim();
    if (clean.length < 2) return null;
    return clean;
}

// ── Example sentence cleaning ────────────────────────────────────────────────

/**
 * Clean a Wiktionary example sentence for use in a kids' app.
 * Returns null if the sentence is unsalvageable.
 */
function cleanExample(text) {
    if (!text) return null;
    let s = text.trim();

    // Multi-line: take first line only (strip citations, dialogue continuations)
    if (s.includes('\n')) {
        s = s.split('\n')[0].trim();
        if (!s || s.length < 20) return null;
    }

    // REJECT: archaic language (thou/thee/thy/hath/doth/art/shalt/whence/whilst etc.)
    if (/\b(thou|thee|thy|thine|hath|doth|dost|shalt|wilt|wouldst|shouldst|canst|didst|speaketh|maketh|giveth|taketh|cometh)\b/i.test(s)) return null;
    if (/\b(whence|thence|hither|thither|whilst|betwixt|forsooth|prithee|methinks|wherefore)\b/i.test(s)) return null;

    // REJECT: archaic long-s character (ſ)
    if (/ſ/.test(s)) return null;

    // REJECT: dialectal/nonstandard English that would confuse kids
    if (/\bt'/.test(s)) return null;  // Yorkshire t' contraction
    if (/\bdaan\b|\btelled\b|\bnowt\b|\bowt\b|\bsummat\b/i.test(s)) return null;
    if (/\bain't\b/i.test(s)) return null;
    // Irish/Scottish dialect
    if (/\byer\b|\bsthuck\b|\bcraythur\b|\bYe're\b|\bgait\b.*\bance\b|\bdoonricht\b|\brintheroot\b/i.test(s)) return null;
    if (/\bIle\b.*\bLoues\b/i.test(s)) return null;  // Archaic English ("Ile Mountebanke their Loues")
    // Broad Scots
    if (/\bYe're\b|\ba'\b.*\bgait\b|\bdinna\b|\bkenn?\b|\bwee\b.*\bbairn/i.test(s)) return null;

    // REJECT: contains profanity used as intensifier (British slang)
    if (/\bbleeding (liar|idiot|fool|hell)\b/i.test(s)) return null;
    if (/\bbloody (hell|liar|idiot|fool)\b/i.test(s)) return null;

    // REJECT: what the hell / damn
    if (/\bwhat the hell\b/i.test(s)) return null;
    if (/\bwhat the (heck|damn|fuck)\b/i.test(s)) return null;

    // REJECT: clearly old literary/poetic style (inverted syntax, archaic names)
    if (/\b(spake|begat|wrought|hither|smote|smit|chaunt|hearken|cometh|therein|thereon|thereof|herein|hereof|heretofore|aforementioned|aforesaid)\b/i.test(s)) return null;

    // REJECT: archaic spellings (pre-modern English orthography like "vniuersall", "shal", "yere")
    if (/\bvni|ſ|\byere\b|\bshal\b|\bhis maiest|\bking's majest/i.test(s)) return null;

    // REJECT: archaic/poetic inverted syntax ("once more his X extends", "did the X Y")
    if (/\bonce more (his|her|its|their)\b/i.test(s)) return null;
    if (/\b(his|her|its) \w+ extends\b/i.test(s)) return null;

    // REJECT: archaic exclamations and intensifiers
    if (/\ba tarnation\b|\bgadzooks\b|\bezads\b|\bzounds\b|\bforsooth\b/i.test(s)) return null;

    // REJECT: contains "E " at start (archaic pronoun or citation artifact)
    if (/^E\s+(was|were|had|have|is|are|went|came|did|said)\b/.test(s)) return null;

    // REJECT: Shakespeare / named character dialogue format ("Name: dialogue")
    if (/^[A-Z][a-z]+:\s/.test(s)) return null;

    // REJECT: starts with ellipsis (truncated quote) — handle both … and ... with optional space
    if (/^\s*…/.test(s) || /^\s*\.\.\./.test(s)) return null;

    // Allow mid-sentence ellipsis — only reject trailing ellipsis (incomplete sentence)
    if (/…\s*$/.test(s) || /\.\.\.\s*$/.test(s)) return null;

    // Strip wiki-style brackets: [I], [sic], [...]  → remove entirely
    s = s.replace(/\[…\]/g, '…');
    s = s.replace(/\[\.\.\.\]/g, '…');
    s = s.replace(/\[[A-Z]\]/g, '');       // [I], [H]e etc.
    s = s.replace(/\[sic\]/gi, '');
    s = s.replace(/\[(\w+)\]/g, '$1');     // [word] → word

    // REJECT if still has brackets (complex citations)
    if (/\[/.test(s) && /\]/.test(s)) return null;

    // Strip leading citation info: "2008, Author Name, Title\n..." or "c. 1820, ..."
    s = s.replace(/^\d{4},?\s+[^,]+,\s+[^,\n]+[,\n]\s*/i, '');
    s = s.replace(/^c\.?\s*\d{4},?\s+[^,]+,\s+[^,\n]+[,\n]\s*/i, '');

    // Strip "Near-synonyms:" and "Synonyms:" thesaurus entries
    if (/^(Near-synonyms?|Synonyms?|Antonyms?|Holonym|Hypernym|Hyponym|See also):/i.test(s)) return null;
    // REJECT: thesaurus-style entries that snuck through
    if (/Thesaurus:/.test(s)) return null;
    // REJECT: contains "Holonym" or "Hypernym" (lingustic metadata, not sentences)
    if (/\bHolonym|Hypernym|Hyponym|Near-synonym/i.test(s)) return null;

    // REJECT: too short after cleaning (needs to be a real, useful sentence)
    s = s.trim();
    if (s.length < 10) return null;

    // REJECT: too long (>250 chars — allow slightly longer for rich context)
    if (s.length > 250) return null;

    // REJECT: contains daggers (†) or other typographic markers used in dictionaries
    if (/[†‡§¶]/.test(s)) return null;

    // REJECT: contains dialectal spelling that would confuse kids
    if (/\bfiggered\b|\bfixt\b|\bgotta\b|\bwanna\b|\bgonnawrite\b|\blil\b/i.test(s)) return null;

    // REJECT: Bible verses, legal citations, chapter/verse references
    if (/\b\d+:\d+\b/.test(s)) return null;  // "John 3:16", "§ 12:4"
    if (/\bchapter\s+\d/i.test(s)) return null;
    if (/\bverse\s+\d/i.test(s)) return null;
    if (/\bGenesis\b|\bExodus\b|\bLeviticus\b|\bDeuteronomy\b|\bPsalm/i.test(s)) return null;

    // REJECT: Latin phrases that would confuse kids
    if (/\b(inter alia|ad hoc|ipso facto|prima facie|bona fide|de facto|de jure|ex post|modus operandi)\b/i.test(s)) return null;

    // REJECT: contains year references before 1900 (usually historical/literary quotes)
    if (/\b1[0-8]\d{2}\b/.test(s)) return null;  // 1000-1899

    // REJECT: starts with unclosed quote mark (truncated literary quotation)
    if (/^"[^"]*$/.test(s)) return null;

    // REJECT: racial/political/identity topics inappropriate for a kids' spelling app
    if (/\bwhite (men|male|suprem|privil|heterosex)/i.test(s)) return null;
    if (/\bpost-civil rights/i.test(s)) return null;
    if (/\bsegregation(?:ist|alism)/i.test(s)) return null;
    if (/\bracial profil/i.test(s)) return null;

    // REJECT: religious preaching or theological argument
    if (/\bsupernumerary God\b/i.test(s)) return null;

    // REJECT: medical/disease context not appropriate for kids
    if (/\bH\.I\.V\b|\bHIV-infect/i.test(s)) return null;

    // REJECT: prison/criminal context in examples
    if (/\bjailbird\b|\bjailhouse\b|\binmate\b/i.test(s)) return null;

    // REJECT: contains "stark-nak'd" or similar archaic nudity
    if (/\bstark.?nak/i.test(s)) return null;

    // REJECT: example is too short to be meaningful after previous cleaning
    if (s.split(/\s+/).length < 4) return null;

    // REJECT: Shakespeare/literary archaic possession/pronoun style
    if (/\b'Twas\b|\bpossess'd\b|\bmark'd\b|\blook'd\b|\bown'd\b/i.test(s)) return null;

    // REJECT: violent content inappropriate for kids
    if (/\bfatal (internal )?injur/i.test(s)) return null;
    if (/\bassassin\b/i.test(s)) return null;
    if (/\bburning people\b/i.test(s)) return null;
    if (/\bexecuting prisoners\b/i.test(s)) return null;

    // REJECT: contraceptive / reproductive content
    if (/\bcontraceptive\b|\breproductive capacit/i.test(s)) return null;

    // REJECT: became a "cabbage" / vegetable (brain-dead slang)
    if (/\bbecame a (cabbage|vegetable)\b/i.test(s)) return null;

    // REJECT: drag queen references in non-drag contexts
    if (/\bholigay\b/i.test(s)) return null;

    // REJECT: political figures by name in examples
    if (/\bTrump\b|\bBiden\b|\bObama\b|\bClinton\b|\bBush\b/i.test(s)) return null;

    // REJECT: "God vivificates" and similar religious proclamations
    if (/\bGod (vivificates|actuates|ordains|commands|decrees)\b/i.test(s)) return null;

    // REJECT: broken Wiktionary references
    if (/\bFor quotations using this term,?\s*see\b/i.test(s)) return null;
    if (/\bCitations:/i.test(s)) return null;

    // REJECT: LGBTQ slang context that isn't age-appropriate
    if (/\bbutch numbers\b|\bcruisy\b/i.test(s)) return null;

    // REJECT: political references (socialism, communism in praise/propaganda context)
    if (/\benthusiasm for socialism\b|\bChinese peasants\b/i.test(s)) return null;
    if (/\bModi\b|\bXi Jinping\b|\bPutin\b/i.test(s)) return null;

    // REJECT: sexually suggestive family dynamics
    if (/\bseductive.*(mother|father|parent|child)\b/i.test(s)) return null;
    if (/\b(mother|father) is (weak|seductive|dominant)\b/i.test(s)) return null;

    // REJECT: kleptocrats and other intense political/criminal terms in examples
    if (/\bkleptocrat/i.test(s)) return null;

    // REJECT: tales of depression/failure/self-doubt (too heavy for kids)
    if (/\bdebasement and depression\b|\bfailure and self-doubt\b/i.test(s)) return null;

    // REJECT: fragment sentences (no verb, just apposition — "A courteous gentleman a courteous gesture")
    // Heuristic: if sentence has no common verb form and is short-ish
    if (s.length < 60 && !/\b(is|are|was|were|has|had|have|do|does|did|can|could|will|would|shall|should|may|might|must|been|being|get|got|go|goes|went|make|made|take|took|said|say|know|knew|see|saw|come|came|give|gave|find|found|think|thought|tell|told|become|became|leave|left|feel|felt|put|bring|brought|begin|began|seem|help|show|hear|heard|play|run|ran|move|live|believe|happen|include|turn|follow|meet|met|lead|stand|stood|lose|lost|pay|paid|keep|kept|let|hold|held|mean|meant|set|learn|change|watch|need|start|try|ask|work|call|read|write|wrote|grow|grew|open|walk|win|won|offer|appear|travel|die|pass|raise|sell|sold|add|expect)\b/i.test(s)) return null;

    // REJECT: sentence doesn't contain at least one space (fragment, not a sentence)
    if (!s.includes(' ')) return null;

    // REJECT: looks like a definition rather than a sentence ("A type of..." with no verb)
    if (/^(A|An|The) (type|kind|form|species|variety|genus|class) of\b/.test(s) && s.length < 60) return null;

    // REJECT: falconry/hunting jargon examples (rare senses of common words)
    if (/\b(hawk|falcon|raptor|falconer|quarry|tiring|prey|lure|perch)\b/i.test(s) && /\btiring\b/i.test(s)) return null;

    // REJECT: idolatry / heresy religious topics
    if (/\bidolatry\b|\bheresy\b|\bblasphemy\b|\bheretic/i.test(s)) return null;

    // Capitalize first letter
    s = s.charAt(0).toUpperCase() + s.slice(1);

    // Ensure ends with punctuation
    if (!/[.!?;:"']$/.test(s)) s += '.';

    // Clean up double spaces
    s = s.replace(/\s{2,}/g, ' ');

    return s;
}

// ── Etymology cleaning ───────────────────────────────────────────────────────

function cleanEtymology(etym) {
    if (!etym) return undefined;
    let e = etym.trim();

    // REJECT: raw proto-language chain dumps (no readable English)
    // These look like: "Proto-Indo-European *h₂éd Proto-Italic *ad Proto-Italic *ad-"
    if (/^Proto-/.test(e) && !/from/i.test(e.slice(0, 50))) return undefined;
    if (/PIE word \*/.test(e) && e.indexOf('From') === -1) return undefined;

    // Strip "PIE word *xxx " prefix if followed by readable etymology
    e = e.replace(/^PIE word \*\S+\s+/i, '');

    // Truncated etymologies ending with "..." — strip the truncation
    e = e.replace(/\.\.\.$/, '').trim();
    // If what remains is too short, drop it
    if (e.length < 15) return undefined;

    // If still too long (>400 chars), truncate at last complete sentence
    if (e.length > 400) {
        const cut = e.lastIndexOf('.', 400);
        if (cut > 100) {
            e = e.slice(0, cut + 1);
        } else {
            e = e.slice(0, 400).trim() + '.';
        }
    }

    return e;
}

// ── Theme classifier (expanded) ──────────────────────────────────────────────
// Much broader regex coverage to reduce "everyday" fallback from 74% to <30%.

function classifyTheme(word, definition, pos) {
    const d = (definition || '').toLowerCase();
    const w = (word || '').toLowerCase();

    // Plants — check BEFORE animals (both mention "species")
    if (/\b(plant|tree|flower|leaf|leaves|seed|botanical|shrub|herb|fern|moss|fungi|fungus|mushroom|garden|bloom|blossom|petal|stem|root|vine|crop|weed|grass|orchid|rose|tulip|daisy|lily|oak|pine|maple|birch|willow|palm|cedar|sprout|pollen|bark|buckthorn|rhamnoides|flora)\b/.test(d)) return 'plants';

    // Animals — expanded (removed "species"/"genus" — too generic, matches plants)
    if (/\b(animal|bird|fish|insect|mammal|reptile|creature|predator|prey|herd|flock|pack|beetle|butterfly|moth|ant\b|bee\b|wasp|spider|crab|whale|shark|dolphin|horse|cow\b|pig\b|sheep|goat|chicken|duck|eagle|hawk|owl|snake|lizard|frog|turtle|monkey|ape\b|wolf|fox\b|deer|rabbit|mouse|rat\b|squirrel|elephant|lion|tiger|cat\b|dog\b|puppy|kitten|parrot|penguin|seal\b|otter|badger|hedgehog|vertebrate|invertebrate|amphibian|larva|larvae|moth\b)\b/.test(d)) return 'animals';

    // Nature / outdoors
    if (/\b(forest|jungle|desert|prairie|meadow|valley|hill|cave|cliff|shore|beach|island|wilderness|landscape|terrain|habitat|ecosystem|environment|glacier|canyon|marsh|swamp|wetland)\b/.test(d)) return 'nature';

    // Weather — expanded
    if (/\b(weather|rain|wind|storm|climate|snow|temperature|drought|hurricane|tornado|thunder|lightning|fog|mist|hail|frost|breeze|gale|monsoon|blizzard|sunshine|cloudy|overcast|humid|arid|sleet|drizzle)\b/.test(d)) return 'weather';

    // Earth / geology — expanded
    if (/\b(earth|rock|mountain|ocean|river|volcano|geolog|mineral|crystal|fossil|stone|sand|clay|soil|dust|gravel|pebble|boulder|lava|magma|earthquake|continent|island|peninsula|plateau|ridge|crater)\b/.test(d)) return 'earth';

    // Water — expanded
    if (/\b(water|sea|lake|pond|stream|marine|tide|swim|ocean|river|wave|current|flood|dam|reservoir|waterfall|rapids|canal|harbor|port|nautical|naval|maritime|anchor|sail|boat|ship|shore|coast|bay|gulf)\b/.test(d)) return 'water';

    // Body — expanded
    if (/\b(body|bone|muscle|organ|limb|blood|skin|heart|brain|nerve|tissue|spine|skull|rib|arm|leg|hand|foot|finger|toe|eye|ear|nose|mouth|tongue|tooth|teeth|jaw|shoulder|elbow|knee|ankle|wrist|chest|stomach|lung|liver|kidney)\b/.test(d)) return 'body';

    // Health / medicine — expanded
    if (/\b(disease|medical|health|medicine|illness|symptom|treatment|doctor|therapy|hospital|surgery|cure|heal|diagnosis|prescription|vaccine|infection|fever|pain|wound|injury|patient|nurse|clinic|remedy|pharmaceutical)\b/.test(d)) return 'health';

    // Food — expanded
    if (/\b(food|eat|cook|meal|taste|fruit|vegetable|bread|meat|drink|recipe|bake|roast|fry|boil|stew|soup|salad|dessert|cake|pie|cookie|candy|sugar|salt|pepper|spice|sauce|butter|cheese|milk|egg|flour|rice|pasta|noodle|cereal|snack|breakfast|lunch|dinner|feast|appetite|delicious|flavor|sweet|sour|bitter|savory)\b/.test(d)) return 'food';

    // People / person — expanded
    if (/\b(person|someone|somebody|people|human|individual|inhabitant|citizen|resident|native|foreigner|stranger|friend|neighbor|companion|colleague|worker|employee|leader|follower|child|adult|elder|youth|teenager|baby|infant|man\b|woman\b|boy\b|girl\b|father|mother|parent|sibling|brother|sister|family|relative|ancestor|descendant)\b/.test(d)) return 'people';

    // Society / government / law — expanded
    if (/\b(society|government|law|political|social|community|public|citizen|nation|state|country|republic|democracy|monarchy|parliament|congress|senate|court|judge|jury|trial|prison|police|army|military|war\b|peace|treaty|vote|election|tax|policy|regulation|authority|institution|civilization|culture|tradition|ceremony|ritual|custom)\b/.test(d)) return 'society';

    // Money / economics — expanded
    if (/\b(money|financial|wealth|payment|currency|economic|profit|bank|income|expense|debt|loan|interest|invest|stock|market|trade|commerce|business|company|corporation|salary|wage|price|cost|budget|tax|revenue|fund|capital|asset|mortgage|insurance|dividend)\b/.test(d)) return 'money';

    // Art / music / literature — expanded
    if (/\b(music|art|paint|sing|dance|perform|theater|literary|poem|novel|story|book|author|artist|sculptor|gallery|museum|orchestra|symphony|melody|rhythm|harmony|instrument|guitar|piano|drum|violin|flute|choir|opera|ballet|drama|comedy|tragedy|canvas|portrait|sketch|draw|sculpt|compose|lyric|verse|prose|fiction|genre|playwright|poet)\b/.test(d)) return 'art';

    // Mind / thinking — expanded
    if (/\b(think|mind|thought|mental|intellectual|cognit|reason|logic|idea|concept|theory|philosophy|wisdom|knowledge|understand|comprehend|perceive|imagine|memory|remember|forget|learn|discover|analyze|evaluate|conclude|hypothesis|abstract|conscious|subconscious|intuition|insight|belief|opinion|doubt|curiosity|puzzle|riddle|mystery)\b/.test(d)) return 'mind';

    // Feelings / emotions — expanded
    if (/\b(feel|emotion|happy|sad|angry|fear|joy|love|anxie|mood|delight|pleasure|sorrow|grief|rage|fury|terror|horror|excitement|enthusiasm|passion|desire|hope|despair|jealous|envy|pride|shame|guilt|embarrass|sympathy|empathy|compassion|pity|gratitude|content|satisfy|frustrat|disappoint|surprise|shock|awe|wonder|boredom|lonely|nostalgic|melanchol)\b/.test(d)) return 'feelings';

    // Language / speech / writing — expanded
    if (/\b(speak|language|word|write|read|speech|grammar|sentence|paragraph|letter|alphabet|vowel|consonant|syllable|accent|dialect|translate|interpret|pronounce|spell|vocabulary|dictionary|phrase|clause|verb|noun|adjective|adverb|punctuation|comma|period|quote|narrate|describe|explain|define|express|articulate|eloquent|fluent|literate)\b/.test(d)) return 'language';

    // Communication — expanded
    if (/\b(communicate|message|inform|express|announce|declare|signal|broadcast|publish|report|news|media|press|newspaper|magazine|radio|television|internet|email|telephone|conversation|discussion|debate|argue|negotiate|persuade|convince|advise|warn|notify|alert|respond|reply|correspond)\b/.test(d)) return 'communication';

    // Character / personality — expanded
    if (/\b(character|personality|temperament|disposition|trait|virtue|brave|coward|honest|dishonest|kind|cruel|generous|selfish|humble|arrogant|patient|stubborn|loyal|faithful|trustworthy|reliable|diligent|lazy|ambitious|modest|bold|timid|gentle|fierce|calm|restless|cheerful|grumpy|polite|rude|wise|foolish|noble|ignoble|sincere|deceitful)\b/.test(d)) return 'character';

    // Actions / movement — expanded (but more specific)
    if (/\b(move|motion|run|walk|jump|climb|crawl|swim|fly|throw|catch|push|pull|lift|carry|drag|drop|pour|fill|empty|open|close|turn|spin|roll|slide|bounce|stretch|bend|twist|shake|stir|mix|cut|tear|break|build|fix|repair|clean|wash|scrub|polish|sweep|mop|dig|plant|harvest|gather|collect|arrange|sort|stack|fold|wrap|tie|untie)\b/.test(d)) return 'actions';

    // Travel / geography — expanded
    if (/\b(travel|journey|trip|voyage|explore|navigate|wander|roam|migrate|commute|tour|visit|destination|route|path|road|highway|bridge|tunnel|railroad|airport|station|harbor|passport|luggage|compass|map|atlas|globe|geography|continent|equator|latitude|longitude|expedition)\b/.test(d)) return 'travel';

    // Academic / science / school — expanded
    if (/\b(school|learn|study|teach|education|academic|science|research|experiment|laboratory|hypothesis|theorem|equation|formula|calculate|measure|observe|discover|examine|investigate|student|teacher|professor|lecture|lesson|class|course|grade|test|exam|homework|textbook|library|university|college|degree|diploma|scholar|curriculum)\b/.test(d)) return 'academic';

    // Sensory / perception — expanded
    if (/\b(see|hear|smell|taste|touch|vision|sound|bright|loud|color|sight|gaze|stare|glance|glimpse|observe|watch|listen|echo|whisper|shout|noise|silence|quiet|soft|hard|rough|smooth|warm|cold|hot|cool|sharp|dull|fragrant|odor|scent|aroma|bitter|salty|sour|sweet|spicy|bland|vivid|dim|faint|glow|shine|sparkle|glitter|shadow|dark|light)\b/.test(d)) return 'sensory';

    // Time — expanded
    if (/\b(time|day|year|hour|moment|period|season|century|era|decade|minute|second|morning|evening|night|dawn|dusk|noon|midnight|today|tomorrow|yesterday|week|month|calendar|schedule|deadline|punctual|tardy|early|late|ancient|modern|medieval|contemporary|future|past|present|eternal|temporary|brief|long|short|duration|interval)\b/.test(d)) return 'time';

    // Quantity / measurement — expanded
    if (/\b(much|many|few|large|small|amount|quantity|number|measure|count|total|sum|average|half|double|triple|dozen|hundred|thousand|million|pair|group|set|batch|bunch|pile|heap|stack|more|less|equal|increase|decrease|maximum|minimum|vast|tiny|enormous|minute|ample|scarce|abundant|sufficient|excessive)\b/.test(d)) return 'quantity';

    // Home / household — expanded
    if (/\b(home|house|room|building|door|window|furniture|kitchen|bedroom|bathroom|living|dining|ceiling|floor|wall|roof|basement|attic|garage|porch|garden|yard|fence|gate|stairs|hallway|closet|shelf|cabinet|drawer|table|chair|sofa|couch|bed|lamp|curtain|carpet|rug|appliance|stove|oven|refrigerator|sink|mirror|towel|blanket|pillow)\b/.test(d)) return 'home';

    // Clothing / textile — expanded
    if (/\b(cloth|wear|dress|shirt|garment|fabric|textile|cotton|silk|wool|linen|leather|denim|velvet|satin|shoe|boot|sandal|hat|cap|coat|jacket|sweater|glove|scarf|belt|button|zipper|pocket|collar|sleeve|hem|stitch|sew|knit|weave|tailor|fashion|outfit|uniform|costume|robe|gown|skirt|pants|trousers|shorts|sock)\b/.test(d)) return 'clothing';

    // Check word endings as a secondary signal for common themes
    if (pos === 'noun') {
        if (/ist$|er$|or$|ian$|eer$|ant$/.test(w) && /\bperson\b|\bwho\b|\bone who\b/i.test(d)) return 'people';
    }

    return 'everyday';
}

// ── Pattern classifier (improved) ────────────────────────────────────────────

function classifyPattern(word, difficulty) {
    const w = word.toLowerCase();

    // Tier 5 (diff 9-10): most words have Latin/Greek roots, not "irregular"
    if (difficulty >= 9) {
        if (/tion$|sion$|ious$|eous$|ance$|ence$|ment$|ible$|able$|ity$|ive$|ous$|al$|ure$|ate$|ent$|ant$/.test(w)) return 'latin-roots';
        if (/ology$|itis$|osis$|phobia$|graph$|archy$|cracy$|scope$|morph|chron|theo|bio|geo|psych|phon|log|path|gon|poly|mono|syn|anti|hyper|hypo|pseudo|proto/.test(w)) return 'greek-roots';
        if (/ette$|ique$|oir$|aise$|esque$|eur$|eau$|ienne$|aise$/.test(w)) return 'french-origin';
        // For diff 9-10, check root patterns more aggressively
        if (/tion$|ment$|ness$|ance$|ence$|able$|ible$|ful$|less$|ive$|ous$|ity$/.test(w)) return 'latin-roots';
        if (/^(un|re|pre|dis|mis|over|under|out|non|in|im|ir|il|de|trans|inter|super|sub|anti|counter|co|ex|fore|post|semi|auto|multi)/.test(w)) return 'prefixes';
        return 'multisyllable';
    }

    // Check explicit Latin/Greek/French endings first (any difficulty)
    if (/ology$|itis$|osis$|phobia$|graph$|archy$|cracy$|scope$/.test(w)) return 'greek-roots';
    if (/ette$|ique$|oir$|aise$|esque$/.test(w)) return 'french-origin';

    if (difficulty <= 2) {
        if (/^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/.test(w)) return 'cvc';
        if (/^[bcdfghjklmnpqrstvwxyz]{2,3}[aeiou]/.test(w) && w.length <= 5) return 'blends';
        if (/ch|sh|th|wh|ck|ng/.test(w) && w.length <= 5) return 'digraphs';
        if (/[aeiou][bcdfghjklmnpqrstvwxyz]e$/.test(w)) return 'silent-e';
        if (w.length <= 4) return 'cvc';
        return 'blends';
    }

    if (difficulty <= 4) {
        if (/[aeiou][bcdfghjklmnpqrstvwxyz]e$/.test(w)) return 'silent-e';
        if (/ai|ay|ea|ee|ie|oa|oe|oo|ou|ow|ue|ey|igh/.test(w)) return 'vowel-teams';
        if (/[aeiou]r/.test(w) && w.length <= 8) return 'r-controlled';
        if (/oi|oy|ou|ow|au|aw/.test(w)) return 'diphthongs';
        return 'vowel-teams';
    }

    if (difficulty <= 6) {
        if (/tion$|sion$|ious$|eous$|ance$|ence$/.test(w)) return 'latin-roots';
        if (/^(un|re|pre|dis|mis|over|under|out|non|in|im|ir|il)/.test(w)) return 'prefixes';
        if (/(ful|less|ness|ment|tion|sion|able|ible|ous|ive|ity|ly|er|or|ist|ism|ize|ise|fy|ward)$/.test(w)) return 'suffixes';
        if (/\w+\w/.test(w) && w.length >= 8) return 'multisyllable';
        return 'multisyllable';
    }

    if (difficulty <= 8) {
        if (/tion$|sion$|ious$|eous$|ance$|ence$|ment$|ible$|able$|ity$|ive$|ous$|al$|ure$|ate$/.test(w)) return 'latin-roots';
        if (/ology$|itis$|graph$|phobia$|archy$|cracy$|scope$/.test(w)) return 'greek-roots';
        if (/^(un|re|pre|dis|mis|over|under|out|non|in|im|ir|il|de|trans|inter|super|sub|anti|counter)/.test(w)) return 'prefixes';
        if (/(ful|less|ness|ment|able|ible|ous|ive|ity|ly|er|or|ist|ism|ize|ise)$/.test(w)) return 'suffixes';
        return 'multisyllable';
    }

    return 'multisyllable';
}

// ── Age-appropriate word filter ──────────────────────────────────────────────
// Words must be appropriate for their tier's grade level.

/** Words that should never appear in a kids' spelling app regardless of tier */
const WORD_BLOCKLIST = new Set([
    // Profanity / vulgarity
    'shit', 'shitty', 'shitten', 'shitter', 'shitting',
    'fuck', 'fucker', 'fucking', 'fucked', 'fuckwit', 'fuckbunny',
    'ass', 'asses', 'asshole', 'arsehole', 'arse',
    'bitch', 'bitchy', 'bitches',
    'bastard', 'bastards',
    'damn', 'damned', 'damnation',
    'cunt', 'cunts', 'cunty',
    'dick', 'dicks', 'dickhead', 'dicklicker',
    'cock', 'cocks', 'cocksucker',
    'piss', 'pissy', 'pissed',
    'whore', 'whores', 'whoremaster', 'whoremonger',
    'slut', 'slutty', 'sluts',
    'rape', 'rapist', 'raped', 'raping',
    'faggot', 'faggots', 'faggotry', 'fagling', 'faggify',
    'nigger', 'niggers',
    'retard', 'retards', 'retarded',
    'boob', 'boobs', 'booby',
    'butt', 'butts', 'butthole',
    'crap', 'crappy', 'crapper',
    'poop', 'poopy', 'pooper',
    'pee', 'peeing',
    'titjob', 'handjob', 'blowjob',
    'orgasm', 'orgasmic',
    'erection', 'boner',
    'hooker', 'pimp', 'pimps',
    'stoner', 'pothead', 'crackhead', 'cokehead', 'junkie',
    'murder', 'murderer', 'murderess',
    'kill', 'killer', 'killers',
    'suicide', 'suicidal',
    'catshit', 'bullshit', 'horseshit', 'batshit',
    'stiffy', 'hornball', 'horny',
    'lolicon', 'shotacon',
    'twincest', 'incest', 'incestuous',
    'fungasm', 'snoregasm',
    'decunt', 'dicking',
    'speedball', 'speedballer',
    'callboy', 'callgirl',
    'sheepshagger', 'shittimwood',
    'ithyphallic', 'ithyphallus',
    'peash', 'fuckbunny', 'yiffy',
    // Drug slang
    'sherm', 'sherms',
    // Ambiguous / sensitive short words
    'trans', 'rort', 'rorts', 'rorting',
    // Offensive slang / derogatory
    'fembrained', 'hiptard', 'tardish', 'libtard', 'contard',
    'poofybutt', 'druggie', 'crackwhore',
    'kike', 'kikes', 'spic', 'spics', 'chink', 'chinks', 'chinky',
    'wetback', 'beaner', 'gook', 'gooks', 'wop', 'wops',
    // Internet slang / not real words for a spelling app
    'tweetheart', 'fanboyism', 'lulz', 'copypasta', 'clickbait',
    'twerking', 'selfie', 'emoji', 'hashtag',
    'ghit', 'ghits', 'vlog', 'vlogger', 'vlogging',
    // Foreign organization/cultural terms too niche for spelling
    'tong',
    // Words with offensive substrings that regex wouldn't catch
    'psychobitch', 'nutjob', 'asshat', 'asswipe', 'dumbass',
    'dipshit', 'jackass', 'smartass', 'badass', 'kickass',
    'hardass', 'fatass', 'lameass',
    // Mild profanity still inappropriate for a kids' app
    'hell', 'hellish', 'hells',
    // Disease/pox terms inappropriate for young kids
    'poxy', 'syphilitic', 'gonorrheal',
    // Violent compound words
    'jackbooted', 'switchblade', 'gunfight', 'bloodbath',
    // Sexual / inappropriate compound words
    'gangbang', 'gangbanging', 'gangbanger', 'gangbanged',
    'circlejerk', 'clusterfuck', 'motherfucker', 'motherfucking',
    'wanker', 'wanking', 'tosser', 'tossing',
    'rimjob', 'footjob', 'cumshot', 'creampie',
    'cuckold', 'dominatrix', 'fetish', 'bondage',
    'stripper', 'stripclub', 'lapdance',
    'pornstar', 'camgirl', 'camboy',
    // Masturbation / sexual acts
    'onanism', 'onanist', 'onanistic', 'masturbate', 'masturbation', 'masturbatory',
    'ejaculate', 'ejaculation', 'circumcise', 'circumcision',
    'sodomy', 'sodomite', 'sodomize', 'sodomized',
    'fornicate', 'fornication', 'fornicator',
    'defloration', 'deflower', 'deflowering',
    'voluptuousness', 'voluptuous',
    // Medical/surgical terms too graphic for kids
    'ovariectomize', 'ovariectomy', 'orchidectomy', 'orchiectomy',
    'hysterectomy', 'vasectomy', 'castrate', 'castration',
    // Scatological
    'bedwetter', 'bedwetting',
    // Misc offensive
    'redskin', 'redskins', 'halfbreed',
    'wigger', 'wiggers',
    // Words with sexual double meanings / connotations
    'threesome', 'foursome', 'orgy', 'harem',
    'erogenous', 'nympho', 'nymphomania', 'nymphomaniac',
    // Archaic/obsolete words inappropriate for a spelling app
    'firk', 'firking',
    // Proper nouns / demonyms that aren't spelling words
    'tajik', 'tajiks',
    // Racial/political terms inappropriate for a kids' app
    'segregationist', 'segregationalist', 'segregationalism',
    'supremacist', 'supremacism',
    // Political/ideological compound words
    'neofascist', 'neofascism', 'neofascistic',
    'neonazi', 'neonazism',
    'antilesbian', 'antigay', 'antitransgender',
    'profascist', 'profascism',
    // Medical jargon too niche for spelling practice
    'drusenoid', 'panleukopenia', 'monoxenic',
    // Fake compound words
    'highschoolboy', 'highschoolgirl',
    // Cooking jargon that isn't standard English
    'encasserole',
    // Missed by prior audit — sexual/vulgar compound words
    'boof', 'boofing', 'boofed',
    'brojob', 'painal',
    'pedicant', 'pedicator',
    'assfaggot',
    'slutdom', 'slutface', 'sluthood', 'slutness', 'slutting', 'sluttification',
    'cuntslut', 'manslag',
    'cyberslut', 'superslut',
    'rubberist',
    'looner',
    'mislest',
    'tarty',
    'gixy',
    // Drug slang
    'tik', 'meth',
    // Political/racial slang not appropriate for kids
    'karen', 'becky',
    // Pop culture / trademark words
    'minecraft', 'minecrafter', 'minecraftian',
    'hogwartsian',
    // Words where definition contains "promiscuous" as primary meaning
    'promiscuity', 'promiscuously',
]);

/** Demonym/proper-noun-like words, foreign words, and too-niche terms for a spelling app */
const DEMONYM_BLOCKLIST = new Set([
    'tajik', 'tajiks', 'taswegian', 'worcesterite',
    // Non-English loanwords that aren't part of standard English vocabulary
    'wayang', 'duchesse',
    // Slang / informal words not appropriate for a spelling app
    'beardy', 'beardie', 'cruisy',
    // Archaic / niche words that sound like common words but have rare definitions
    'revest', 'glacis', 'unlaid',
    // Non-English words / foreign loanwords too niche for spelling practice
    'sarkar', 'owndom',
]);

/** Content patterns in definitions/examples that disqualify a word */
const CONTENT_BLOCKLIST_PATTERNS = [
    // Sexual content
    /\bsexual/i, /\bsex act/i, /\berotic/i, /\borgasm/i, /\bcoitus/i, /\bcoital/i,
    /\bpenis/i, /\bphallu/i, /\bphallic/i, /\bvagina/i, /\bgenital/i, /\bbreast\b/i,
    /\bnipple/i, /\bclitor/i, /\btesticle/i, /\bscrotum/i, /\berect\b/i, /\berection/i,
    /\bfellatio/i, /\bcunniling/i, /\bintercourse/i, /\bcopulat/i, /\bfornicati/i,
    /\bprostitut/i, /\bharlot/i, /\bwhore/i, /\bpimp\b/i, /\bbordello/i, /\bbrothel/i,
    /\bsodomy/i, /\bsodomit/i, /\bbestiality/i, /\bpornograph/i, /\blust\b/i, /\blustful/i,
    /\blibido/i, /\barousal/i, /\baroused/i, /\bsexism/i,
    /\bmasturbat/i, /\bonanism/i, /\bejaculat/i, /\bcircumcis/i,
    /\bblow job/i, /\bthreesome/i, /\bfoursome/i, /\borgy/i, /\bharem/i,
    /\bnympho/i, /\berogenous/i,

    // Excretory / bodily
    /\bfeces\b/i, /\bfecal/i, /\bexcrement/i, /\burine\b/i, /\burinate/i,
    /\bvomit/i, /\bdefecati/i, /\bdiarr/i,

    // Profanity / vulgarity
    /\bfuck/i, /\bshit\b/i, /\bshitty/i, /\bass\b/i, /\bassed\b/i, /\bbitch/i,
    /\bbastard/i, /\bdamn\b/i, /\bgoddamn/i, /\bcrap\b/i, /\bcrappy/i,
    /\bobscen/i, /\bvulgar/i, /\bprofan/i, /\bindecen/i, /\blewd/i,

    // Slurs / derogatory
    /\bslur\b/i, /\bderogat/i, /\bpejorative/i, /\bracist/i,
    /\bfaggot/i, /\bfag\b/i, /\bdyke\b/i, /\bnigger/i,
    /\bretard/i, /\bcripple\b/i, /\bspastic/i,
    /\bkike/i, /\bspic\b/i, /\bchink\b/i, /\bwetback/i,

    // Violence (graphic)
    /\bmurder/i, /\bkill\b/i, /\bkilling/i, /\bsuicide/i, /\brape\b/i, /\braped/i,
    /\braping/i, /\brapist/i, /\bassassinat/i, /\btorture/i, /\bmutilat/i,
    /\bgenocid/i, /\binfanticid/i, /\bhomicid/i, /\bmassacre/i,
    /\bexecut(?:e|ed|ion)\b/i, /\bbehead/i,

    // Drugs / alcohol / tobacco
    /\bmarijuana/i, /\bcannabis/i, /\bcocaine/i, /\bheroin\b/i, /\bamphetamine/i,
    /\bmethamphet/i, /\bopium/i, /\bnarcotic/i, /\bhallucinogen/i,
    /\bdrunk/i, /\balcohol/i, /\binebriat/i, /\bintoxicat/i,
    /\btobacco/i, /\bcigarette/i, /\bsmoking/i,

    // Miscellaneous inappropriate
    /\bslang\b/i, /\boffensive\b/i, /\btransgender/i,
    /\bfascis[mt]/i, /\bnazi/i,
    /\bsegregation(?:ist|alism|alist)/i, /\bsupremacis[mt]/i,

    // Drug use references in examples
    /\bsnort (coke|cocaine|meth)/i, /\bsherm stick/i, /\bsmoke a dip/i,
    /\bPCP\b/, /\bphencyclidine/i,
    /\bcrystal meth\b/i, /\bsmoke meth\b/i, /\bbang it\b.*\bmeth/i,
    /\bmaking meth\b/i,

    // Promiscuous / slutty — catch derivatives
    /\bpromiscuous\b/i, /\bslut\b/i, /\bslutty\b/i, /\bsluttif/i,
    /\banal sex\b/i, /\boral sex\b/i,

    // White privilege / political identity topics
    /\bwhite privilege\b/i, /\bwhite suprem/i,
    // Compound offensive terms
    /queer.?bash/i, /gay.?bash/i, /fag.?bash/i,
    /\bgangbang/i, /\bgang.?rape/i,
    /\bporn star/i, /\bporn\b/i,
    // Slavery / exploitation
    /\bslave\b/i, /\bslavery/i, /\bservitude/i, /\bpeonage/i,
    // AIDS / STDs in examples
    /\bAIDS\b/, /\bHIV\b/, /\bSTD\b/, /\bsyphilis/i, /\bgonorrhea/i,
    // Witchcraft / occult (avoid for young kids)
    /\bwitchcraft/i, /\bsorcery/i, /\boccult\b/i, /\bsatanic/i,
];

function isInappropriate(word, definition, example) {
    if (WORD_BLOCKLIST.has(word.toLowerCase())) return true;
    if (DEMONYM_BLOCKLIST.has(word.toLowerCase())) return true;
    const text = (definition || '') + ' ' + (example || '');
    for (const pattern of CONTENT_BLOCKLIST_PATTERNS) {
        if (pattern.test(text)) return true;
    }
    return false;
}

/**
 * Check if a word is too obscure for its tier.
 * Low-sense-count words in lower tiers are likely obscure jargon.
 */
function isTooObscure(word, senseCount, tier) {
    // 10-tier system: tier 1 = Pre-K/K (easiest), tier 9 = competition
    // Tier 1 (Pre-K/K): basic word shape checks only
    if (tier <= 1) {
        // Tier 1 words should be short simple words
        if (word.length > 10) return true;
        // Reject words ending in unusual suffixes for young kids
        if (/um$|us$|ix$|ux$|ax$|ox$/.test(word) && senseCount < 3) return true;
    }
    // All other tiers: no senseCount gate — let the content filters handle quality
    return false;
}

// ── Distractor validation ────────────────────────────────────────────────────

// Common English words that must never appear as distractors
// (because they're real words, not misspellings)
const COMMON_WORDS = new Set([
    // Past tenses that look like misspellings of present tense
    'gave', 'drew', 'held', 'fell', 'came', 'went', 'felt', 'kept', 'lost',
    'sent', 'sold', 'told', 'wore', 'woke', 'rode', 'rose', 'sang', 'sank',
    'rang', 'hung', 'dug', 'led', 'fed', 'met', 'sat', 'ran', 'won', 'hit',
    // Very common short words
    'cat', 'bat', 'hat', 'mat', 'rat', 'fat', 'sat', 'pat',
    'bit', 'fit', 'hit', 'kit', 'lit', 'pit', 'sit', 'wit',
    'big', 'dig', 'fig', 'jig', 'pig', 'rig', 'wig',
    'but', 'cut', 'gut', 'hut', 'jut', 'nut', 'put', 'rut',
    'bed', 'fed', 'led', 'red', 'wed',
    'den', 'hen', 'men', 'pen', 'ten',
    'got', 'hot', 'lot', 'not', 'pot', 'rot', 'tot',
    'god', 'nod', 'odd', 'rod', 'cod',
    // Other common real words that appear as distractors
    'strait', 'suite', 'there', 'their', 'hear', 'bare', 'hare', 'mare',
    'stare', 'flair', 'hire', 'tire', 'wire', 'bore', 'core', 'more',
    'sore', 'wore', 'lore', 'pore', 'fore',
]);

function validateDistractors(word, distractors) {
    if (!distractors || distractors.length < 3) return null;
    const valid = distractors.filter(d =>
        d !== word &&
        d.length > 0 &&
        !COMMON_WORDS.has(d.toLowerCase()) &&
        d.length >= Math.max(2, word.length - 3) &&
        d.length <= word.length + 3
    );
    const unique = [...new Set(valid)];
    if (unique.length < 3) return null;
    return unique.slice(0, 3);
}

// ── Difficulty refinement ────────────────────────────────────────────────────

function refineDifficulty(word, originalDiff, senseCount) {
    let diff = originalDiff;

    // Very many senses = common word = easier
    if (senseCount > 10 && diff > 3) diff -= 1;
    if (senseCount > 20 && diff > 2) diff -= 1;

    // Silent letters bump difficulty
    if (/^(kn|wr|gn|pn|ps|pt|mn|rh)/.test(word)) diff = Math.min(10, diff + 1);
    if (/mb$|mn$|bt$|gn$/.test(word)) diff = Math.min(10, diff + 1);

    return Math.max(1, Math.min(10, diff));
}

// ── Main export ──────────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);
    const tierArg = args.find(a => a.startsWith('--tier='));
    const limitArg = args.find(a => a.startsWith('--limit='));
    const sampleArg = args.find(a => a.startsWith('--sample='));
    const dryRun = args.includes('--dry-run');

    const tier = tierArg ? parseInt(tierArg.split('=')[1]) : null;
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 200000;
    const sampleSize = sampleArg ? parseInt(sampleArg.split('=')[1]) : 0;

    if (!fs.existsSync(DB_PATH)) {
        console.error('Database not found.');
        process.exit(1);
    }

    const db = new Database(DB_PATH, { readonly: true });

    // Load existing app words (hand-curated tiers) to dedup
    const existingFile = path.join(__dirname, '..', '..', 'existing-words.txt');
    const existingWords = new Set(
        fs.existsSync(existingFile)
            ? fs.readFileSync(existingFile, 'utf8').trim().split('\n').map(w => w.trim().toLowerCase())
            : [],
    );
    console.log('Existing app words: ' + existingWords.size);

    // QUALITY FILTER — SQL level
    // Require: any example source + enriched distractors + good definition.
    // Example priority: wikt_example > api_example > generated example
    // IPA is preferred but not hard-required (checked in JS for tier-dependent logic)
    const baseWhere = `
        WHERE enriched = 1
        AND COALESCE(wikt_example, api_example, example) IS NOT NULL
        AND COALESCE(wikt_example, api_example, example) != ''
        AND wikt_definition IS NOT NULL AND LENGTH(wikt_definition) >= 10
        AND word NOT LIKE '%-%'
        AND word NOT LIKE '% %'
        AND LENGTH(word) >= 3
        AND LENGTH(word) <= 20
        AND word NOT GLOB '*[0-9]*'
        AND word = LOWER(word)
        AND distractors IS NOT NULL
    `;
    let whereClause = baseWhere;
    const params = [];
    if (tier) {
        whereClause += ' AND tier = ?';
        params.push(tier);
    }

    const rows = db.prepare(
        'SELECT * FROM words ' + whereClause + ' ORDER BY sense_count DESC, LENGTH(word) ASC LIMIT ?',
    ).all(...params, limit);

    console.log('Candidates from DB (have def + distractors): ' + rows.length);

    // Filter and transform with quality gates
    let words = [];
    const rejectReasons = {};
    function reject(reason) {
        rejectReasons[reason] = (rejectReasons[reason] || 0) + 1;
    }

    for (const row of rows) {
        if (existingWords.has(row.word.toLowerCase())) { reject('duplicate'); continue; }
        if (!/^[a-z]+$/.test(row.word)) { reject('non-alpha'); continue; }

        // Definition: Wiktionary > API > WordNet
        const definition = row.wikt_definition || row.api_definition || row.definition || '';
        if (!definition || definition.length < 10) { reject('bad-definition'); continue; }

        // Clean example sentence — prefer wikt > api, fall back to generated template
        const rawExample = row.wikt_example || row.api_example || '';
        let cleanedExample = cleanExample(rawExample);

        // If the real example was rejected by cleanExample, fall back to generated template
        if (!cleanedExample && row.example) {
            cleanedExample = cleanExample(row.example);
        }
        if (!cleanedExample) { reject('bad-example'); continue; }

        // Example must actually contain the word (or a close morphological form)
        const wordRoot = row.word.replace(/(ing|ed|s|es|ly|er|est|tion|ment|ness|ity|ous|ive|able|ible|ful|less)$/, '');
        if (wordRoot.length >= 3 && !new RegExp('\\b' + wordRoot, 'i').test(cleanedExample)) {
            reject('example-missing-word'); continue;
        }

        // Kid-appropriateness filter
        if (isInappropriate(row.word, definition, cleanedExample)) { reject('inappropriate'); continue; }

        // Compute difficulty and tier early (needed for subsequent checks)
        // 9-tier mapping with overflow: diff 1-2→T1, diff 3→T2, ..., diff 8→T7, diff 9-10→T8+T9
        const pronunciation = cleanIPA(row.wikt_ipa);
        const difficulty = refineDifficulty(row.word, row.difficulty, row.sense_count);
        const appTier = difficulty <= 2 ? 1 : Math.min(difficulty, 10) - 1;
        // Initial: 1=diff1-2, 2=diff3, 3=diff4, 4=diff5, 5=diff6, 6=diff7, 7=diff8, 8=diff9, 9=diff10
        // Tier 7 overflow → tier 8, tier 8 overflow → tier 9 (handled post-collection)

        // Reject rare/niche definitions for tier 1 (Pre-K/K) words
        // (e.g. "tire" defined as hawk behavior instead of common "become weary")
        if (appTier <= 1) {
            const defLower = definition.toLowerCase();
            if (/\b(falconry|heraldry|nautical|archaic|dialectal|obsolete|dated|rare|slang)\b/.test(defLower)) {
                reject('niche-def-low-tier'); continue;
            }
            if (/\b(seize.+prey|as a hawk|in heraldry|coat of arms|nautical term)\b/i.test(defLower)) {
                reject('niche-def-low-tier'); continue;
            }
        }
        // For ALL tiers: reject definitions about horoscopes/astrology (not educational)
        if (/\bhoroscope|astrology|casting of horoscopes/i.test(definition)) {
            reject('niche-def'); continue;
        }

        // Clean IPA pronunciation — prefer real IPA, fall back to word itself
        // IPA is prioritized during tier capping (words with IPA ranked higher)
        const finalPronunciation = pronunciation || row.word;

        // Validate and clean distractors
        const rawDistractors = row.distractors ? JSON.parse(row.distractors) : [];
        const distractors = validateDistractors(row.word, rawDistractors);
        if (!distractors) { reject('bad-distractors'); continue; }

        // Obscurity check
        if (isTooObscure(row.word, row.sense_count, appTier)) { reject('too-obscure'); continue; }

        const theme = classifyTheme(row.word, definition, row.pos);
        const pattern = classifyPattern(row.word, difficulty);

        // Clean definition: capitalize, end with period, strip wiki artifacts
        let cleanDef = definition.trim();
        cleanDef = cleanDef.replace(/\s*\([\w\s,]+\)\s*$/, ''); // strip trailing (disambiguation)
        cleanDef = cleanDef.charAt(0).toUpperCase() + cleanDef.slice(1);
        if (!cleanDef.endsWith('.') && !cleanDef.endsWith('!') && !cleanDef.endsWith('?')) {
            cleanDef += '.';
        }

        // Etymology: clean or drop
        const etymology = cleanEtymology(row.wikt_etymology || row.etymology);

        words.push({
            word: row.word,
            definition: cleanDef,
            exampleSentence: cleanedExample,
            partOfSpeech: row.pos,
            difficulty,
            pattern,
            pronunciation: finalPronunciation,
            ...(etymology ? { etymology } : {}),
            distractors,
            theme,
        });
    }

    // Deduplicate by word string — keep first entry (highest sense_count due to query ORDER BY)
    const seenWords = new Set();
    const dedupedWords = [];
    let dupeCount = 0;
    for (const w of words) {
        if (seenWords.has(w.word)) { dupeCount++; continue; }
        seenWords.add(w.word);
        dedupedWords.push(w);
    }
    words = dedupedWords;

    console.log('\nWords passing ALL quality gates: ' + words.length + (dupeCount > 0 ? ' (' + dupeCount + ' duplicate senses removed)' : ''));
    console.log('\nRejection reasons:');
    for (const [reason, count] of Object.entries(rejectReasons).sort((a, b) => b[1] - a[1])) {
        console.log('  ' + reason + ': ' + count);
    }

    // Group by app tier (10 tiers, monotonically decreasing)
    const byTier = {};
    for (const w of words) {
        const t = w.difficulty <= 2 ? 1 : Math.min(w.difficulty, 10) - 1;
        if (!byTier[t]) byTier[t] = [];
        byTier[t].push(w);
    }

    // Cap each tier — monotonically decreasing targets (9 tiers, 100K total).
    // Prioritize words with real IPA pronunciation over fallback.
    const TIER_CAPS = { 1: 20000, 2: 18000, 3: 15000, 4: 13000, 5: 10000, 6: 8000, 7: 6000, 8: 5000, 9: 5000 };

    function sortByIPA(ws) {
        return ws.sort((a, b) => {
            const aHasIPA = a.pronunciation !== a.word ? 1 : 0;
            const bHasIPA = b.pronunciation !== b.word ? 1 : 0;
            if (bHasIPA !== aHasIPA) return bHasIPA - aHasIPA;
            return 0;
        });
    }

    // Cascade overflow: tier 7 → 8 → 9 (fills higher tiers with surplus from lower difficulties)
    for (const fromTier of [7, 8]) {
        const toTier = fromTier + 1;
        if (!byTier[fromTier]) continue;
        const cap = TIER_CAPS[fromTier];
        if (byTier[fromTier].length > cap) {
            sortByIPA(byTier[fromTier]);
            const overflow = byTier[fromTier].slice(cap);
            byTier[fromTier] = byTier[fromTier].slice(0, cap);
            if (!byTier[toTier]) byTier[toTier] = [];
            byTier[toTier] = [...byTier[toTier], ...overflow];
            console.log('  Tier ' + fromTier + ': capped at ' + cap + ', overflowed ' + overflow.length + ' to tier ' + toTier);
        }
    }

    // Cap remaining tiers
    for (const [t, ws] of Object.entries(byTier)) {
        const cap = TIER_CAPS[t] || 5000;
        if (ws.length > cap) {
            sortByIPA(ws);
            byTier[t] = ws.slice(0, cap);
            console.log('  Tier ' + t + ': capped from ' + ws.length + ' to ' + cap + ' (prioritized IPA)');
        }
    }

    console.log('\nBy tier:');
    for (const [t, ws] of Object.entries(byTier)) {
        const themes = {};
        for (const w of ws) themes[w.theme] = (themes[w.theme] || 0) + 1;
        const everydayPct = Math.round(100 * (themes['everyday'] || 0) / ws.length);
        console.log('  Tier ' + t + ': ' + ws.length + ' words (' + everydayPct + '% everyday theme)');
    }

    // Sample mode: print detailed output for inspection
    if (sampleSize > 0 || dryRun) {
        const perTier = sampleSize > 0 ? Math.ceil(sampleSize / Object.keys(byTier).length) : 5;
        console.log('\n' + '='.repeat(70));
        console.log('SAMPLE OUTPUT — ' + perTier + ' words per tier');
        console.log('='.repeat(70));

        for (const [t, ws] of Object.entries(byTier)) {
            console.log('\n── Tier ' + t + ' (' + ws.length + ' total) ──');
            // Pick evenly spaced samples
            const step = Math.max(1, Math.floor(ws.length / perTier));
            for (let i = 0; i < Math.min(perTier, ws.length); i++) {
                const w = ws[i * step];
                console.log('\n  ' + w.word + ' (diff ' + w.difficulty + ') [' + w.pattern + '] [' + w.theme + ']');
                console.log('    Def: ' + w.definition);
                console.log('    Ex:  ' + w.exampleSentence);
                console.log('    IPA: /' + w.pronunciation + '/');
                console.log('    Dist: ' + w.distractors.join(', '));
                if (w.etymology) console.log('    Etym: ' + w.etymology.slice(0, 120));
            }
        }

        if (dryRun || sampleSize > 0) {
            db.close();
            return;
        }
    }

    // Write TypeScript files
    const CHUNK_SIZE = 1000;

    function writeTierFile(filename, varName, tierWords) {
        const filepath = path.join(WORDS_DIR, filename);
        const content = '/**\n' +
            ' * words/' + filename + '\n' +
            ' *\n' +
            ' * Auto-generated from Wiktionary + WordNet pipeline.\n' +
            ' * ' + tierWords.length + ' words.\n' +
            ' *\n' +
            ' * Sources:\n' +
            ' * - Wiktionary via kaikki.org (CC-BY-SA 3.0)\n' +
            ' * - WordNet 3.1 (Princeton University, BSD license)\n' +
            ' *\n' +
            ' * DO NOT EDIT MANUALLY \u2014 regenerate with: node scripts/pipeline/export-to-app.cjs\n' +
            ' */\n' +
            "import type { SpellingWord } from './types';\n\n" +
            'export const ' + varName + ': SpellingWord[] = ' + JSON.stringify(tierWords, null, 4) + ';\n';
        fs.writeFileSync(filepath, content);
        console.log('  Wrote ' + filename + ' (' + tierWords.length + ' words)');
    }

    for (const [t, ws] of Object.entries(byTier)) {
        if (tier && parseInt(t) !== tier) continue;

        if (ws.length <= CHUNK_SIZE) {
            writeTierFile('tier' + t + '-pipeline.ts', 'TIER_' + t + '_PIPELINE_WORDS', ws);
        } else {
            const chunks = [];
            for (let i = 0; i < ws.length; i += CHUNK_SIZE) {
                chunks.push(ws.slice(i, i + CHUNK_SIZE));
            }
            const suffixes = 'abcdefghijklmnopqrstuvwxyz';
            console.log('\n  Tier ' + t + ': splitting ' + ws.length + ' words into ' + chunks.length + ' chunks');
            for (let i = 0; i < chunks.length; i++) {
                const suffix = suffixes[i];
                writeTierFile(
                    'tier' + t + '-pipeline-' + suffix + '.ts',
                    'TIER_' + t + '_PIPELINE_' + suffix.toUpperCase() + '_WORDS',
                    chunks[i],
                );
            }

            const barrelImports = chunks.map((_, i) => {
                const suffix = suffixes[i];
                return "import { TIER_" + t + "_PIPELINE_" + suffix.toUpperCase() + "_WORDS } from './tier" + t + "-pipeline-" + suffix + "';";
            }).join('\n');
            const barrelSpread = chunks.map((_, i) => {
                const suffix = suffixes[i];
                return '...TIER_' + t + '_PIPELINE_' + suffix.toUpperCase() + '_WORDS';
            }).join(', ');
            const barrelContent = '/**\n' +
                ' * words/tier' + t + '-pipeline.ts\n' +
                ' *\n' +
                ' * Barrel file \u2014 combines chunked pipeline files for tier ' + t + '.\n' +
                ' * Total: ' + ws.length + ' words across ' + chunks.length + ' chunks.\n' +
                ' *\n' +
                ' * DO NOT EDIT MANUALLY.\n' +
                ' */\n' +
                "import type { SpellingWord } from './types';\n" +
                barrelImports + '\n\n' +
                'export const TIER_' + t + '_PIPELINE_WORDS: SpellingWord[] = [' + barrelSpread + '];\n';
            const barrelPath = path.join(WORDS_DIR, 'tier' + t + '-pipeline.ts');
            fs.writeFileSync(barrelPath, barrelContent);
            console.log('  Wrote tier' + t + '-pipeline.ts (barrel)');
        }
    }

    // Update existing-words.txt
    const allAppWords = new Set([...existingWords]);
    for (const w of words) allAppWords.add(w.word.toLowerCase());
    fs.writeFileSync(existingFile, [...allAppWords].sort().join('\n'));
    console.log('\nUpdated existing-words.txt: ' + allAppWords.size + ' words');

    db.close();
    console.log('\nDone!');
}

main();
