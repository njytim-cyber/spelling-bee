/**
 * data/curatedEtymologies.ts
 *
 * Curated etymology fun facts for the "Did you know?" surprise reveal.
 * These are hand-written for readability — much better than raw Wiktionary strings.
 * Each fact includes a minimum level so younger learners see age-appropriate content.
 */

export interface EtymologyFact {
    word: string;
    fact: string;
    /** Only show to users at this level or above */
    minLevel: number;
}

export const CURATED_ETYMOLOGIES: EtymologyFact[] = [
    // Level 1-2 (simple, fun origins)
    { word: 'puppy', fact: 'From French "poupee" meaning "doll" — because puppies are like living dolls!', minLevel: 1 },
    { word: 'cookie', fact: 'From Dutch "koekje" meaning "little cake." The Dutch brought cookies to America!', minLevel: 1 },
    { word: 'ketchup', fact: 'From Hokkien Chinese "ke-tsiap," a fermented fish sauce. Tomatoes came later!', minLevel: 1 },
    { word: 'robot', fact: 'Czech writer Karel Capek invented this word in 1920 from "robota" meaning "forced work."', minLevel: 1 },
    { word: 'penguin', fact: 'Possibly from Welsh "pen gwyn" meaning "white head" — even though penguins have black heads!', minLevel: 1 },
    { word: 'candy', fact: 'From Arabic "qandi" meaning "made of sugar." Sugar was once so rare it was called "white gold."', minLevel: 1 },
    { word: 'piano', fact: 'Short for "pianoforte" — Italian for "soft-loud," because it can play both!', minLevel: 1 },

    // Level 2-3 (animals and food)
    { word: 'muscle', fact: 'From Latin "musculus" meaning "little mouse" — because a flexed muscle looks like a mouse running under your skin!', minLevel: 2 },
    { word: 'salary', fact: 'From Latin "salarium" — Roman soldiers were partly paid in salt, which was incredibly valuable.', minLevel: 2 },
    { word: 'disaster', fact: 'From Italian "disastro" — literally "bad star." People once blamed misfortune on the stars!', minLevel: 2 },
    { word: 'helicopter', fact: 'From Greek "helix" (spiral) + "pteron" (wing). It is actually heli-copter, not helic-opter!', minLevel: 2 },
    { word: 'butterfly', fact: 'Nobody knows for sure! One theory: people thought butterflies stole butter. In Dutch it is "botervlieg" (butter-fly).', minLevel: 2 },
    { word: 'avocado', fact: 'From Nahuatl (Aztec) "ahuacatl." The Aztecs considered it a luxury fruit.', minLevel: 2 },
    { word: 'chocolate', fact: 'From Nahuatl "chocolatl." The Aztecs drank it as a bitter, spicy beverage — no sugar!', minLevel: 2 },
    { word: 'hippopotamus', fact: 'From Greek "hippos" (horse) + "potamos" (river). A "river horse!" They are actually closer to whales.', minLevel: 2 },

    // Level 3-4 (history and everyday words)
    { word: 'sandwich', fact: 'Named after the Earl of Sandwich, who wanted to eat without leaving the card table — so he put meat between bread!', minLevel: 3 },
    { word: 'gymnasium', fact: 'From Greek "gymnasion" — where Greeks exercised completely naked! "Gymnos" means "naked."', minLevel: 3 },
    { word: 'quarantine', fact: 'From Italian "quaranta giorni" meaning "forty days" — how long ships waited at port during plague outbreaks.', minLevel: 3 },
    { word: 'nightmare', fact: 'A "mare" was an evil spirit that sat on your chest while you slept. Nothing to do with female horses!', minLevel: 3 },
    { word: 'tornado', fact: 'From Spanish "tronada" (thunderstorm), influenced by "tornar" (to turn). A turning thunderstorm!', minLevel: 3 },
    { word: 'galaxy', fact: 'From Greek "galaxias" meaning "milky" — the ancient Greeks saw the Milky Way as spilled milk from the goddess Hera.', minLevel: 3 },
    { word: 'volcano', fact: 'Named after Vulcan, the Roman god of fire, who was said to have his forge under Mount Etna.', minLevel: 3 },
    { word: 'algebra', fact: 'From Arabic "al-jabr" meaning "the reunion of broken parts." A 9th-century mathematician in Baghdad wrote the first algebra textbook.', minLevel: 3 },
    { word: 'alphabet', fact: 'From the first two Greek letters: alpha + beta. The Greeks borrowed their letters from the Phoenicians!', minLevel: 3 },

    // Level 4-5 (more complex)
    { word: 'dandelion', fact: 'From French "dent de lion" meaning "lion\'s tooth" — because of the jagged shape of the leaves.', minLevel: 4 },
    { word: 'curfew', fact: 'From Old French "couvre-feu" meaning "cover fire." Medieval people had to put out their fires by a set time each night.', minLevel: 4 },
    { word: 'goodbye', fact: 'A contraction of "God be with ye" — shortened over centuries from "God b\'wy" to "goodbye."', minLevel: 4 },
    { word: 'sarcasm', fact: 'From Greek "sarkazein" meaning "to tear flesh." Sarcasm was considered that painful!', minLevel: 4 },
    { word: 'calculate', fact: 'From Latin "calculus" meaning "small stone." Romans used pebbles on counting boards to do arithmetic!', minLevel: 4 },
    { word: 'companion', fact: 'From Latin "com" (with) + "panis" (bread). A companion is someone you share bread with!', minLevel: 4 },
    { word: 'candidate', fact: 'From Latin "candidatus" meaning "one dressed in white." Roman politicians wore white togas to show purity.', minLevel: 4 },
    { word: 'inauguration', fact: 'From Latin "inaugurare" — Roman priests watched birds to decide if the gods approved of a new leader!', minLevel: 4 },

    // Level 5-6 (advanced)
    { word: 'enthusiasm', fact: 'From Greek "entheos" meaning "having a god within." To be enthusiastic was to be divinely inspired!', minLevel: 5 },
    { word: 'Amazon', fact: 'Named after the Amazons, fierce female warriors of Greek mythology. Early explorers thought they saw women warriors along the river.', minLevel: 5 },
    { word: 'salary', fact: 'From Latin "salarium" — connected to "sal" (salt). Roman soldiers received a "salt allowance," hence our word for pay.', minLevel: 5 },
    { word: 'pandemonium', fact: 'Invented by John Milton in Paradise Lost (1667) as the capital of Hell — "pan" (all) + "daemon" (demon). All the demons in one place!', minLevel: 5 },
    { word: 'clue', fact: 'From "clew," a ball of thread. Theseus used a ball of thread to find his way out of the Minotaur\'s labyrinth.', minLevel: 5 },
    { word: 'lunatic', fact: 'From Latin "luna" (moon). People once believed the full moon could make you go mad!', minLevel: 5 },

    // Level 6-7 (scholarly)
    { word: 'malaria', fact: 'From Italian "mal\'aria" meaning "bad air." Before germs were understood, people blamed swamp air for the disease.', minLevel: 6 },
    { word: 'trivial', fact: 'From Latin "trivium" meaning "three roads" — where roads met, people gathered and chatted about unimportant things.', minLevel: 6 },
    { word: 'vaccine', fact: 'From Latin "vacca" meaning "cow." Edward Jenner used cowpox to immunize against smallpox in 1796.', minLevel: 6 },
    { word: 'mortgage', fact: 'From Old French "mort gage" meaning "death pledge." The debt dies when paid off, or the property dies if you default.', minLevel: 6 },
    { word: 'sinister', fact: 'From Latin "sinister" meaning "left." Left-handedness was once considered unlucky or evil.', minLevel: 6 },
    { word: 'assassin', fact: 'From Arabic "hashshashin" — members of a medieval sect. The connection to hashish is debated by historians.', minLevel: 6 },

    // Level 7-8 (rare knowledge)
    { word: 'serendipity', fact: 'Coined by Horace Walpole in 1754 from the fairy tale "The Three Princes of Serendip" (Sri Lanka), who kept making discoveries by accident.', minLevel: 7 },
    { word: 'algorithm', fact: 'Named after the 9th-century Persian mathematician al-Khwarizmi, whose name was Latinized to "Algoritmi."', minLevel: 7 },
    { word: 'boycott', fact: 'Named after Captain Charles Boycott, an English land agent in Ireland whom tenants refused to deal with in 1880.', minLevel: 7 },
    { word: 'silhouette', fact: 'Named after Etienne de Silhouette, a French finance minister so cheap that "a la Silhouette" meant "on the cheap" — like a shadow portrait.', minLevel: 7 },
    { word: 'onomatopoeia', fact: 'From Greek "onoma" (name) + "poiein" (to make). A word that makes its own name by imitating a sound — buzz, hiss, splash!', minLevel: 7 },
    { word: 'sycophant', fact: 'From Greek "sykophantes" — literally "fig-shower." In ancient Athens, it may have referred to informers who reported illegal fig exports.', minLevel: 8 },

    // Level 9-10 (elite)
    { word: 'defenestration', fact: 'From Latin "de" (out of) + "fenestra" (window). Literally "the act of throwing someone out of a window." It happened enough in Prague to need its own word!', minLevel: 9 },
    { word: 'hippopotomonstrosesquippedaliophobia', fact: 'The fear of long words. Ironically, the word itself is terrifyingly long — a deliberate joke by whoever coined it.', minLevel: 9 },
];
