/**
 * domains/spelling/spellingCategories.tsx
 *
 * Spelling domain category definitions with chalk-style SVG icons.
 */
import type { ReactNode } from 'react';

// ── Type unions ───────────────────────────────────────────────────────────────

export type SpellingCategory =
    | 'cvc'
    | 'blends'
    | 'digraphs'
    | 'silent-e'
    | 'vowel-teams'
    | 'r-controlled'
    | 'diphthongs'
    | 'prefixes'
    | 'suffixes'
    | 'multisyllable'
    | 'latin-roots'
    | 'greek-roots'
    | 'french-origin'
    | 'review'
    | 'bee'
    | 'daily'
    | 'challenge'
    | 'ghost'
    | 'tier-1'
    | 'tier-2'
    | 'tier-3'
    | 'tier-4'
    | 'tier-5'
    // Semantic themes (42)
    | 'theme-animals' | 'theme-plants' | 'theme-weather' | 'theme-earth'
    | 'theme-food' | 'theme-body' | 'theme-health' | 'theme-home'
    | 'theme-clothing' | 'theme-art' | 'theme-academic'
    | 'theme-science' | 'theme-math' | 'theme-money'
    | 'theme-language' | 'theme-time' | 'theme-people' | 'theme-feelings'
    | 'theme-mind' | 'theme-character' | 'theme-communication' | 'theme-actions'
    | 'theme-quantity' | 'theme-texture' | 'theme-water'
    | 'theme-sensory' | 'theme-nature'
    | 'theme-society' | 'theme-travel' | 'theme-everyday'
    | 'vocab'
    | 'origin-latin' | 'origin-greek' | 'origin-french' | 'origin-german' | 'origin-other'
    | 'wotc-one' | 'wotc-two' | 'wotc-three'
    | 'written-test'
    | 'roots'
    | 'etymology'
    | 'custom';

export type SpellingGroup = 'daily' | 'basic' | 'core' | 'advanced' | 'expert' | 'tier' | 'themes' | 'origins' | 'competition' | 'practice';

// ── Grade levels ─────────────────────────────────────────────────────────────

export type GradeLevel = 'tier-1' | 'tier-2' | 'tier-3' | 'tier-4' | 'tier-5';

export interface GradeConfig {
    id: GradeLevel;
    label: string;
    grades: string;
    defaultCategory: SpellingCategory;
    /** Minimum adaptive difficulty level (1-5). useDifficulty will never drop below this. */
    minDifficultyLevel: number;
}

// ── Category entries ──────────────────────────────────────────────────────────

export interface CategoryEntry {
    id: SpellingCategory;
    icon: ReactNode;
    label: string;
    group: SpellingGroup;
}

// ── SVG icon helper ─────────────────────────────────────────────────────────
// Consistent chalk-style: 24×24 viewBox, stroke-based, rounded caps.

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function I(children: ReactNode) {
    return <svg viewBox="0 0 24 24" className="w-6 h-6" {...S}>{children}</svg>;
}

// ── Icons ───────────────────────────────────────────────────────────────────

// Daily — sun with rays
const iDaily = I(<>
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="4.2" y1="4.2" x2="6.3" y2="6.3" />
    <line x1="17.7" y1="17.7" x2="19.8" y2="19.8" />
    <line x1="2" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="22" y2="12" />
    <line x1="4.2" y1="19.8" x2="6.3" y2="17.7" />
    <line x1="17.7" y1="6.3" x2="19.8" y2="4.2" />
</>);

// CVC — "cat" letters c·a·t
const iCvc = I(<>
    <text x="4" y="16" fill="currentColor" stroke="none" fontSize="11" fontFamily="var(--font-chalk)">c</text>
    <text x="10" y="16" fill="currentColor" stroke="none" fontSize="11" fontFamily="var(--font-chalk)">a</text>
    <text x="16" y="16" fill="currentColor" stroke="none" fontSize="11" fontFamily="var(--font-chalk)">t</text>
</>);

// Blends — two arrows merging into one
const iBlends = I(<>
    <line x1="4" y1="6" x2="12" y2="12" />
    <line x1="4" y1="18" x2="12" y2="12" />
    <line x1="12" y1="12" x2="21" y2="12" />
    <polyline points="17,8 21,12 17,16" />
</>);

// Digraphs — two letters linked: "sh"
const iDigraphs = I(<>
    <text x="3" y="16" fill="currentColor" stroke="none" fontSize="12" fontFamily="var(--font-chalk)">sh</text>
    <path d="M17 8c2 0 3 1.5 3 3.5S19 15 17 15" {...S} strokeWidth={1.5} />
</>);

// Silent-e — letter "e" with a slash through it
const iSilentE = I(<>
    <text x="6" y="18" fill="currentColor" stroke="none" fontSize="16" fontFamily="var(--font-chalk)">e</text>
    <line x1="5" y1="20" x2="19" y2="4" strokeWidth={2.5} />
</>);

// Vowel teams — two letters holding hands: "ea"
const iVowelTeams = I(<>
    <text x="2" y="16" fill="currentColor" stroke="none" fontSize="12" fontFamily="var(--font-chalk)">ea</text>
    <path d="M9 5c1.5-1.5 3.5-1.5 5 0" />
</>);

// R-controlled — letter R with a lasso
const iRControlled = I(<>
    <text x="6" y="18" fill="currentColor" stroke="none" fontSize="16" fontFamily="var(--font-chalk)" fontWeight="bold">R</text>
    <path d="M18 6c2 2 2 5 0 7s-5 2-7 0" strokeDasharray="2 2" />
</>);

// Diphthongs — sound wave rising and falling
const iDiphthongs = I(<>
    <path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" />
</>);

// Prefixes — plus sign before a line (add to front)
const iPrefixes = I(<>
    <line x1="5" y1="12" x2="11" y2="12" />
    <line x1="8" y1="9" x2="8" y2="15" />
    <line x1="14" y1="12" x2="21" y2="12" />
</>);

// Suffixes — line with plus at end (add to back)
const iSuffixes = I(<>
    <line x1="3" y1="12" x2="10" y2="12" />
    <line x1="13" y1="12" x2="19" y2="12" />
    <line x1="16" y1="9" x2="16" y2="15" />
</>);

// Multisyllable — staircase / steps
const iMulti = I(<>
    <path d="M3 18h5v-4h5v-4h5v-4h3" />
</>);

// Latin roots — column / pillar
const iLatin = I(<>
    <line x1="12" y1="4" x2="12" y2="20" />
    <path d="M8 4h8" />
    <path d="M8 20h8" />
    <path d="M9 4c0 3 3 4 3 4s3-1 3-4" />
</>);

// Greek roots — omega symbol
const iGreek = I(<>
    <path d="M7 19v-2c0-3 2-6 5-6s5 3 5 6v2" />
    <path d="M4 19h6M14 19h6" />
</>);

// French origin — fleur-de-lis simplified
const iFrench = I(<>
    <path d="M12 3c0 4-4 6-4 10 0 2 1.5 3 4 3s4-1 4-3c0-4-4-6-4-10z" />
    <path d="M8 18c-2 1-3 2-3 3h14c0-1-1-2-3-3" />
</>);

// Tier 1 K-1st — small seedling
const iTier1 = I(<>
    <path d="M12 20v-8" />
    <path d="M12 12c-3-1-5-4-4-7 3 0 5 3 4 7z" />
    <path d="M12 14c3-1 5-4 4-7-3 0-5 3-4 7z" />
</>);

// Tier 2 2nd-3rd — small plant with leaves
const iTier2 = I(<>
    <path d="M12 20v-12" />
    <path d="M12 14c-4 0-6-3-5-6 3 0 6 2 5 6z" />
    <path d="M12 10c4 0 6-3 5-6-3 0-6 2-5 6z" />
    <path d="M9 20h6" />
</>);

// Tier 3 4th-5th — tree
const iTier3 = I(<>
    <path d="M12 22v-6" />
    <path d="M12 4c-5 0-8 4-8 8 0 3 3 5 8 5s8-2 8-5c0-4-3-8-8-8z" />
</>);

// Tier 4 6th-7th — mountain
const iTier4 = I(<>
    <path d="M3 20L10 6l3 5 3-3 5 12H3z" />
</>);

// Tier 5 8th+ — mountain with flag
const iTier5 = I(<>
    <path d="M3 21L12 5l9 16H3z" />
    <line x1="12" y1="5" x2="12" y2="2" />
    <path d="M12 2l5 2-5 2" />
</>);

// Theme: Animals — paw print
const iAnimals = I(<>
    <circle cx="8" cy="7" r="2" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="5" cy="13" r="2" />
    <circle cx="19" cy="13" r="2" />
    <path d="M9 17c0-2 1.5-3 3-3s3 1 3 3-1.5 4-3 4-3-2-3-4z" />
</>);

// Theme: Plants — leaf
const iPlants = I(<>
    <path d="M12 22v-8" />
    <path d="M6 8c0-3 3-6 6-6s6 3 6 6c0 4-3 7-6 8-3-1-6-4-6-8z" />
    <path d="M12 8c-2-1-3-3-3-5" />
</>);

// Theme: Weather — cloud + rain
const iWeather = I(<>
    <path d="M6 18h12a4 4 0 0 0 0-8 5 5 0 0 0-10 0 3 3 0 0 0 0 6" />
    <line x1="8" y1="19" x2="8" y2="21" />
    <line x1="12" y1="19" x2="12" y2="21" />
    <line x1="16" y1="19" x2="16" y2="21" />
</>);

// Theme: Earth — globe
const iEarth = I(<>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 4 9 15 15 0 0 1-4 9" />
    <path d="M12 3a15 15 0 0 0-4 9 15 15 0 0 0 4 9" />
</>);

// Theme: Food — apple
const iFood = I(<>
    <path d="M12 6c-4 0-7 3-7 7 0 5 3 8 7 8s7-3 7-8c0-4-3-7-7-7z" />
    <path d="M12 6c0-3 2-4 3-4" />
    <path d="M10 6c-1-1-1-3 0-3" />
</>);

// Theme: Body — person outline
const iBody = I(<>
    <circle cx="12" cy="5" r="3" />
    <path d="M8 22v-5l-3-4 3-3h8l3 3-3 4v5" />
</>);

// Theme: Health — cross / plus
const iHealth = I(<>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
</>);

// Theme: Home — house
const iHome = I(<>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h14V10" />
    <rect x="10" y="14" width="4" height="6" />
</>);

// Theme: Clothing — shirt / hanger
const iClothing = I(<>
    <path d="M12 2c-2 0-3 1-3 2s1 2 3 2" />
    <path d="M12 2c2 0 3 1 3 2s-1 2-3 2" />
    <path d="M3 9l9-3 9 3-3 2v10H6V11L3 9z" />
</>);

// Theme: Art — palette
const iArt = I(<>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1 0 2-.8 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4c3 0 5.6-2.5 5.6-5.6C22 5.8 17.5 2 12 2z" />
    <circle cx="8" cy="10" r="1.5" fill="currentColor" />
    <circle cx="12" cy="7" r="1.5" fill="currentColor" />
    <circle cx="16" cy="10" r="1.5" fill="currentColor" />
</>);

// Theme: Science — beaker
const iScience = I(<>
    <path d="M9 3v6l-5 8c-1 1.5 0 3 2 3h12c2 0 3-1.5 2-3l-5-8V3" />
    <line x1="9" y1="3" x2="15" y2="3" />
    <line x1="7" y1="15" x2="17" y2="15" strokeDasharray="2 2" />
</>);

// Theme: Math — calculator/numbers
const iMath = I(<>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <rect x="7" y="5" width="10" height="4" rx="1" />
    <circle cx="8" cy="13" r="1" fill="currentColor" />
    <circle cx="12" cy="13" r="1" fill="currentColor" />
    <circle cx="16" cy="13" r="1" fill="currentColor" />
    <circle cx="8" cy="17" r="1" fill="currentColor" />
    <circle cx="12" cy="17" r="1" fill="currentColor" />
    <circle cx="16" cy="17" r="1" fill="currentColor" />
</>);

// Theme: Money — dollar sign
const iMoney = I(<>
    <line x1="12" y1="2" x2="12" y2="22" />
    <path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7" />
</>);

// Theme: Language — book
const iLanguage = I(<>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v16H6.5a2.5 2.5 0 0 0 0 5H20" />
    <line x1="4" y1="19.5" x2="4" y2="22" />
</>);

// Theme: Time — clock
const iTime = I(<>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="6" x2="12" y2="12" />
    <line x1="12" y1="12" x2="16" y2="14" />
</>);

// Theme: People — group
const iPeople = I(<>
    <circle cx="9" cy="7" r="3" />
    <circle cx="17" cy="7" r="3" />
    <path d="M3 21v-2c0-2.2 1.8-4 4-4h4c2.2 0 4 1.8 4 4v2" />
    <path d="M17 15c2.2 0 4 1.8 4 4v2" />
</>);

// Theme: Feelings — heart
const iFeelings = I(<>
    <path d="M12 21C6 17 2 13 2 9c0-3 2.5-5 5-5 1.5 0 3 .7 5 3 2-2.3 3.5-3 5-3 2.5 0 5 2 5 5 0 4-4 8-10 12z" />
</>);

// Theme: Mind — brain / lightbulb
const iMind = I(<>
    <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="10" y1="22" x2="14" y2="22" />
</>);

// Theme: Character — scales of virtue
const iCharacter = I(<>
    <line x1="12" y1="3" x2="12" y2="21" />
    <path d="M5 7l7-4 7 4" />
    <path d="M3 13c0 2 1 3 2 3s2-1 2-3l-2-6-2 6z" />
    <path d="M17 13c0 2 1 3 2 3s2-1 2-3l-2-6-2 6z" />
</>);

// Theme: Communication — speech bubble
const iCommunication = I(<>
    <path d="M21 12c0 4.4-4 8-9 8-1.6 0-3.1-.3-4.4-.9L3 21l1.9-4.7C3.7 14.8 3 13.5 3 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
</>);

// Theme: Actions — running person
const iActions = I(<>
    <circle cx="14" cy="4" r="2" />
    <path d="M18 9l-4-1-3 3-4-2-3 4" />
    <path d="M14 8l-1 5 4 4v5" />
    <path d="M13 13l-3 3-2 6" />
</>);

// Theme: Quantity — bar chart
const iQuantity = I(<>
    <rect x="4" y="14" width="4" height="8" />
    <rect x="10" y="8" width="4" height="14" />
    <rect x="16" y="3" width="4" height="19" />
</>);

// Theme: Texture — wavy surface
const iTexture = I(<>
    <path d="M3 8c3-2 5 2 9 0s6-2 9 0" />
    <path d="M3 14c3-2 5 2 9 0s6-2 9 0" />
    <path d="M3 20c3-2 5 2 9 0s6-2 9 0" />
</>);

// Theme: Water — water drop
const iWater = I(<>
    <path d="M12 2c-4 6-7 9-7 13a7 7 0 0 0 14 0c0-4-3-7-7-13z" />
</>);

// Theme: Sensory — ear / nose / eye
const iSensory = I(<>
    <path d="M6 8.5c0-3 2.5-5.5 5.5-5.5S17 5.5 17 8.5c0 2-1 3.5-2 4.5l-1 2.5c-.5 1.5-1 2.5-2 2.5s-1.5-1-2-2.5" />
    <path d="M9 12c0 1 .7 2 2 2" />
</>);

// Theme: Nature — tree / pine
const iNature = I(<>
    <path d="M12 3L6 12h3l-3 5h4l-3 4h10l-3-4h4l-3-5h3L12 3z" />
</>);

// Theme: Society — pillars / law
const iSociety = I(<>
    <path d="M2 22h20 M4 22v-8 M8 22v-8 M12 22v-8 M16 22v-8 M20 22v-8 M2 14l10-8 10 8z" />
</>);

// Theme: Academic — graduation cap / book
const iAcademic = I(<>
    <path d="M12 4 2 9l10 5 10-5z" />
    <path d="M6 11v5c0 2 6 3 6 3s6-1 6-3v-5" />
    <path d="M22 9v7" />
</>);

// Theme: Travel — compass
const iTravel = I(<>
    <circle cx="12" cy="12" r="9" />
    <polygon points="12,3 14,10 12,8 10,10" fill="currentColor" stroke="none" />
    <polygon points="12,21 10,14 12,16 14,14" fill="currentColor" stroke="none" opacity={0.4} />
    <line x1="12" y1="3" x2="12" y2="7" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <line x1="3" y1="12" x2="7" y2="12" />
    <line x1="17" y1="12" x2="21" y2="12" />
</>);

// Theme: Everyday — star/generic
const iEveryday = I(<>
    <polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" />
</>);

// Origin: Latin — pillar (reuse concept)
const iOriginLatin = I(<>
    <text x="5" y="18" fill="currentColor" stroke="none" fontSize="15" fontFamily="var(--font-chalk)" fontStyle="italic">L</text>
    <path d="M16 4v16 M13 4h6 M13 20h6" />
</>);

// Origin: Greek — alpha symbol
const iOriginGreek = I(<>
    <text x="4" y="18" fill="currentColor" stroke="none" fontSize="16" fontFamily="var(--font-chalk)" fontStyle="italic">&alpha;</text>
    <path d="M16 6c2 0 3 2 3 5s-1 5-3 5" />
</>);

// Origin: French — fleur simplified
const iOriginFrench = I(<>
    <text x="5" y="18" fill="currentColor" stroke="none" fontSize="15" fontFamily="var(--font-chalk)" fontStyle="italic">F</text>
    <path d="M17 4c0 4-2 6-2 9 0 1.5 1 2.5 2.5 2.5" />
</>);

// Origin: German — gothic G
const iOriginGerman = I(<>
    <text x="5" y="18" fill="currentColor" stroke="none" fontSize="15" fontFamily="var(--font-chalk)" fontStyle="italic">G</text>
    <path d="M18 8c-1-2-3-3-5-3s-4 2-4 4 2 3 4 3" />
</>);

// Origin: Other — globe with question
const iOriginOther = I(<>
    <circle cx="12" cy="12" r="9" />
    <text x="8" y="16" fill="currentColor" stroke="none" fontSize="10" fontFamily="var(--font-chalk)">?</text>
</>);

// Review — circular arrow
const iReview = I(<>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <polyline points="21 3 21 9 15 9" />
</>);

// Vocab — book with question mark
const iVocab = I(<>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v16H6.5a2.5 2.5 0 0 0 0 5H20" />
    <text x="10" y="14" fill="currentColor" stroke="none" fontSize="10" fontFamily="var(--font-chalk)" fontWeight="bold">?</text>
</>);

// WOTC: One Bee — single bee
const iWotcOne = I(<>
    <circle cx="12" cy="10" r="5" />
    <path d="M9 15c0 2 1.5 4 3 4s3-2 3-4" />
    <path d="M8 8l-3-3 M16 8l3-3" />
</>);

// WOTC: Two Bee — two bees
const iWotcTwo = I(<>
    <circle cx="8" cy="10" r="4" />
    <circle cx="16" cy="10" r="4" />
    <path d="M5 8l-2-2 M11 8l-1-2 M13 8l1-2 M19 8l2-2" />
</>);

// WOTC: Three Bee — trophy bee
const iWotcThree = I(<>
    <path d="M8 3h8v5a4 4 0 0 1-8 0V3z" />
    <path d="M8 5H5c0 3 1.5 4 3 4 M16 5h3c0 3-1.5 4-3 4" />
    <line x1="12" y1="12" x2="12" y2="16" />
    <path d="M8 16h8 M9 19h6" />
</>);

// Bee Sim — microphone (spelling bee stage)
const iBeeSim = I(<>
    <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
    <path d="M19 11a7 7 0 0 1-14 0" />
    <line x1="12" y1="18" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
</>);

// Written Test — clipboard with checklist
const iWrittenTest = I(<>
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <path d="M9 2v2h6V2" />
    <line x1="9" y1="10" x2="15" y2="10" />
    <line x1="9" y1="14" x2="15" y2="14" />
    <line x1="9" y1="18" x2="12" y2="18" />
</>);

// Roots — tree with branching roots
const iRoots = I(<>
    <line x1="12" y1="4" x2="12" y2="14" />
    <path d="M8 4h8" />
    <path d="M12 14c-3 2-6 4-7 6" />
    <path d="M12 14c0 3 0 5 0 8" />
    <path d="M12 14c3 2 6 4 7 6" />
</>);

// Etymology — DNA/origin helix
const iEtymology = I(<>
    <path d="M6 3c0 6 12 6 12 12" />
    <path d="M18 3c0 6-12 6-12 12" />
    <line x1="7" y1="7" x2="17" y2="7" />
    <line x1="7" y1="11" x2="17" y2="11" />
    <path d="M6 15v6 M18 15v6" />
</>);

// Custom — pencil writing on paper
const iCustom = I(<>
    <path d="M4 20h16" />
    <path d="M4 16l12-12 4 4-12 12H4v-4z" />
    <path d="M14 6l4 4" />
</>);

// ── Category list ───────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export const SPELLING_CATEGORIES: ReadonlyArray<CategoryEntry> = [
    // Daily
    { id: 'daily', icon: iDaily, label: 'Daily', group: 'daily' },
    // Basic (K-1st)
    { id: 'cvc', icon: iCvc, label: 'CVC Words', group: 'basic' },
    { id: 'blends', icon: iBlends, label: 'Blends', group: 'basic' },
    // Core (2nd-3rd)
    { id: 'digraphs', icon: iDigraphs, label: 'Digraphs', group: 'core' },
    { id: 'silent-e', icon: iSilentE, label: 'Silent E', group: 'core' },
    { id: 'vowel-teams', icon: iVowelTeams, label: 'Vowel Teams', group: 'core' },
    { id: 'r-controlled', icon: iRControlled, label: 'R-Controlled', group: 'core' },
    { id: 'diphthongs', icon: iDiphthongs, label: 'Diphthongs', group: 'core' },
    // Advanced (4th-5th)
    { id: 'prefixes', icon: iPrefixes, label: 'Prefixes', group: 'advanced' },
    { id: 'suffixes', icon: iSuffixes, label: 'Suffixes', group: 'advanced' },
    { id: 'multisyllable', icon: iMulti, label: 'Multisyllable', group: 'advanced' },
    // Expert (6th-8th)
    { id: 'latin-roots', icon: iLatin, label: 'Latin Roots', group: 'expert' },
    { id: 'greek-roots', icon: iGreek, label: 'Greek Roots', group: 'expert' },
    { id: 'french-origin', icon: iFrench, label: 'French Origin', group: 'expert' },
    // By Grade (tier)
    { id: 'tier-1', icon: iTier1, label: 'K-1st', group: 'tier' },
    { id: 'tier-2', icon: iTier2, label: '2nd-3rd', group: 'tier' },
    { id: 'tier-3', icon: iTier3, label: '4th-5th', group: 'tier' },
    { id: 'tier-4', icon: iTier4, label: '6th-7th', group: 'tier' },
    { id: 'tier-5', icon: iTier5, label: '8th+', group: 'tier' },
    // Semantic themes (42) — sorted by approximate word count descending
    { id: 'theme-people', icon: iPeople, label: 'People', group: 'themes' },
    { id: 'theme-feelings', icon: iFeelings, label: 'Feelings', group: 'themes' },
    { id: 'theme-actions', icon: iActions, label: 'Actions', group: 'themes' },
    { id: 'theme-everyday', icon: iEveryday, label: 'Everyday', group: 'themes' },
    { id: 'theme-mind', icon: iMind, label: 'Mind', group: 'themes' },
    { id: 'theme-animals', icon: iAnimals, label: 'Animals', group: 'themes' },
    { id: 'theme-food', icon: iFood, label: 'Food', group: 'themes' },
    { id: 'theme-character', icon: iCharacter, label: 'Character', group: 'themes' },
    { id: 'theme-body', icon: iBody, label: 'Body', group: 'themes' },
    { id: 'theme-home', icon: iHome, label: 'Home', group: 'themes' },
    { id: 'theme-language', icon: iLanguage, label: 'Language', group: 'themes' },
    { id: 'theme-plants', icon: iPlants, label: 'Plants', group: 'themes' },
    { id: 'theme-communication', icon: iCommunication, label: 'Communication', group: 'themes' },
    { id: 'theme-earth', icon: iEarth, label: 'Earth', group: 'themes' },
    { id: 'theme-time', icon: iTime, label: 'Time', group: 'themes' },
    { id: 'theme-health', icon: iHealth, label: 'Health', group: 'themes' },
    { id: 'theme-science', icon: iScience, label: 'Science', group: 'themes' },
    { id: 'theme-money', icon: iMoney, label: 'Money', group: 'themes' },
    { id: 'theme-clothing', icon: iClothing, label: 'Clothing', group: 'themes' },
    { id: 'theme-sensory', icon: iSensory, label: 'Sensory', group: 'themes' },
    { id: 'theme-travel', icon: iTravel, label: 'Travel', group: 'themes' },
    { id: 'theme-math', icon: iMath, label: 'Math', group: 'themes' },
    { id: 'theme-quantity', icon: iQuantity, label: 'Quantity', group: 'themes' },
    { id: 'theme-weather', icon: iWeather, label: 'Weather', group: 'themes' },
    { id: 'theme-texture', icon: iTexture, label: 'Texture', group: 'themes' },
    { id: 'theme-water', icon: iWater, label: 'Water', group: 'themes' },
    { id: 'theme-nature', icon: iNature, label: 'Nature', group: 'themes' },
    { id: 'theme-society', icon: iSociety, label: 'Society', group: 'themes' },
    { id: 'theme-academic', icon: iAcademic, label: 'Academic', group: 'themes' },
    { id: 'theme-art', icon: iArt, label: 'Arts', group: 'themes' },
    // Competition (WOTC tiers)
    { id: 'wotc-one', icon: iWotcOne, label: 'One Bee', group: 'competition' },
    { id: 'wotc-two', icon: iWotcTwo, label: 'Two Bee', group: 'competition' },
    { id: 'wotc-three', icon: iWotcThree, label: 'Three Bee', group: 'competition' },
    { id: 'written-test', icon: iWrittenTest, label: 'Written Test', group: 'competition' },
    { id: 'bee', icon: iBeeSim, label: 'Bee Sim', group: 'competition' },
    // Origins (by etymology / language of origin)
    { id: 'origin-latin', icon: iOriginLatin, label: 'Latin', group: 'origins' },
    { id: 'origin-greek', icon: iOriginGreek, label: 'Greek', group: 'origins' },
    { id: 'origin-french', icon: iOriginFrench, label: 'French', group: 'origins' },
    { id: 'origin-german', icon: iOriginGerman, label: 'German', group: 'origins' },
    { id: 'origin-other', icon: iOriginOther, label: 'Other Origins', group: 'origins' },
    // Practice
    { id: 'review', icon: iReview, label: 'Review', group: 'practice' },
    { id: 'vocab', icon: iVocab, label: 'Vocab Quiz', group: 'practice' },
    { id: 'roots', icon: iRoots, label: 'Word Roots', group: 'practice' },
    { id: 'etymology', icon: iEtymology, label: 'Etymology Quiz', group: 'practice' },
    { id: 'custom', icon: iCustom, label: 'My Lists', group: 'practice' },
];

// eslint-disable-next-line react-refresh/only-export-components
export const SPELLING_GROUP_LABELS: Record<SpellingGroup, string> = {
    daily: 'Daily',
    basic: 'Basic',
    core: 'Core',
    advanced: 'Advanced',
    expert: 'Expert',
    tier: 'By Grade',
    themes: 'Themes',
    origins: 'By Origin',
    competition: 'Competition',
    practice: 'Practice',
};

// ── Grade level config ───────────────────────────────────────────────────────

export const GRADE_LEVELS: readonly GradeConfig[] = [
    { id: 'tier-1', label: 'Seedling', grades: 'K – 1st', defaultCategory: 'tier-1', minDifficultyLevel: 1 },
    { id: 'tier-2', label: 'Sprout', grades: '2nd – 3rd', defaultCategory: 'tier-2', minDifficultyLevel: 2 },
    { id: 'tier-3', label: 'Growing', grades: '4th – 5th', defaultCategory: 'tier-3', minDifficultyLevel: 3 },
    { id: 'tier-4', label: 'Climbing', grades: '6th – 7th', defaultCategory: 'tier-4', minDifficultyLevel: 4 },
    { id: 'tier-5', label: 'Summit', grades: '8th+', defaultCategory: 'tier-5', minDifficultyLevel: 5 },
] as const;

/** Icon for a grade level (reuses the tier icon from SPELLING_CATEGORIES). */
// eslint-disable-next-line react-refresh/only-export-components
export function gradeIcon(grade: GradeLevel): ReactNode {
    return SPELLING_CATEGORIES.find(c => c.id === grade)?.icon;
}

/** Lookup helper: get grade config by ID. Falls back to tier-1. */
// eslint-disable-next-line react-refresh/only-export-components
export function getGradeConfig(grade: GradeLevel): GradeConfig {
    return GRADE_LEVELS.find(g => g.id === grade) ?? GRADE_LEVELS[0];
}
