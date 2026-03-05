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
    | 'level-1'
    | 'level-2'
    | 'level-3'
    | 'level-4'
    | 'level-5'
    | 'level-6'
    | 'level-7'
    | 'level-8'
    | 'level-9'
    | 'level-10'
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
    | 'guided'
    | 'roots'
    | 'etymology'
    | 'custom';

export type SpellingGroup = 'daily' | 'basic' | 'core' | 'advanced' | 'expert' | 'tier' | 'themes' | 'origins' | 'practice';

// ── Levels ───────────────────────────────────────────────────────────────────

export type Level = 'level-1' | 'level-2' | 'level-3' | 'level-4' | 'level-5'
    | 'level-6' | 'level-7' | 'level-8' | 'level-9' | 'level-10';

/** @deprecated Use Level instead */
export type GradeLevel = Level;

export interface LevelConfig {
    id: Level;
    label: string;
    defaultCategory: SpellingCategory;
    /** Minimum adaptive difficulty level (1-10). Equals the level number. */
    minDifficultyLevel: number;
}

/** @deprecated Use LevelConfig instead */
export type GradeConfig = LevelConfig;

// ── Category entries ──────────────────────────────────────────────────────────

export interface CategoryEntry {
    id: SpellingCategory;
    icon: ReactNode;
    label: string;
    group: SpellingGroup;
    /** Requires Champion Pass when true */
    premium?: boolean;
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

// CVC — three blocks (consonant-vowel-consonant)
const iCvc = I(<>
    <rect x="2" y="8" width="5" height="8" rx="1" />
    <rect x="9.5" y="8" width="5" height="8" rx="1" fill="currentColor" stroke="none" />
    <rect x="17" y="8" width="5" height="8" rx="1" />
</>);

// Blends — two arrows merging into one
const iBlends = I(<>
    <line x1="4" y1="6" x2="12" y2="12" />
    <line x1="4" y1="18" x2="12" y2="12" />
    <line x1="12" y1="12" x2="21" y2="12" />
    <polyline points="17,8 21,12 17,16" />
</>);

// Digraphs — two linked blocks (two letters, one sound)
const iDigraphs = I(<>
    <rect x="3" y="8" width="7" height="8" rx="1" />
    <rect x="10" y="8" width="7" height="8" rx="1" />
    <path d="M17 12h3" />
    <path d="M20 9v6" />
</>);

// Silent-e — speech bubble with X (silent sound)
const iSilentE = I(<>
    <path d="M4 6h12a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-3l-3 3v-3H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
    <line x1="8" y1="9" x2="12" y2="13" />
    <line x1="12" y1="9" x2="8" y2="13" />
</>);

// Vowel teams — two circles linked (pair working together)
const iVowelTeams = I(<>
    <circle cx="9" cy="12" r="5" fill="currentColor" stroke="none" opacity="0.3" />
    <circle cx="15" cy="12" r="5" fill="currentColor" stroke="none" opacity="0.3" />
    <circle cx="9" cy="12" r="5" />
    <circle cx="15" cy="12" r="5" />
</>);

// R-controlled — magnet (R pulls vowel sound)
const iRControlled = I(<>
    <path d="M5 4v8a7 7 0 0 0 14 0V4" />
    <line x1="5" y1="4" x2="5" y2="8" strokeWidth={3} />
    <line x1="19" y1="4" x2="19" y2="8" strokeWidth={3} />
    <line x1="9" y1="10" x2="15" y2="10" strokeDasharray="2 2" />
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

// Tier 1 — seedling
const iTier1 = I(<>
    <path d="M12 20v-8" />
    <path d="M12 12c-3-1-5-4-4-7 3 0 5 3 4 7z" />
    <path d="M12 14c3-1 5-4 4-7-3 0-5 3-4 7z" />
</>);

// Tier 2 — small plant
const iTier2 = I(<>
    <path d="M12 20v-12" />
    <path d="M12 14c-4 0-6-3-5-6 3 0 6 2 5 6z" />
    <path d="M12 10c4 0 6-3 5-6-3 0-6 2-5 6z" />
    <path d="M9 20h6" />
</>);

// Tier 3 — tree
const iTier3 = I(<>
    <path d="M12 22v-6" />
    <path d="M12 4c-5 0-8 4-8 8 0 3 3 5 8 5s8-2 8-5c0-4-3-8-8-8z" />
</>);

// Tier 4 — mountain
const iTier4 = I(<>
    <path d="M3 20L10 6l3 5 3-3 5 12H3z" />
</>);

// Tier 5 — mountain with flag
const iTier5 = I(<>
    <path d="M3 21L12 5l9 16H3z" />
    <line x1="12" y1="5" x2="12" y2="2" />
    <path d="M12 2l5 2-5 2" />
</>);

// Tier 6 — shield
const iTier6 = I(<>
    <path d="M12 3l8 4v5c0 5-3.5 9-8 11-4.5-2-8-6-8-11V7l8-4z" />
</>);

// Tier 7 — crown
const iTier7 = I(<>
    <path d="M3 18h18l-2-10-4 4-3-6-3 6-4-4-2 10z" />
    <path d="M3 18v2h18v-2" />
</>);

// Tier 8 — diamond
const iTier8 = I(<>
    <path d="M6 3h12l4 7-10 12L2 10l4-7z" />
    <path d="M2 10h20" />
    <path d="M12 22l-2-12 2-7 2 7-2 12z" />
</>);

// Tier 9 — flame
const iTier9 = I(<>
    <path d="M12 2c-2 4-6 6-6 11a6 6 0 0 0 12 0c0-5-4-7-6-11z" />
    <path d="M12 22c-2 0-3-1.5-3-3 0-2 3-4 3-6 0 2 3 4 3 6 0 1.5-1 3-3 3z" />
</>);

// Tier 10 — star champion
const iTier10 = I(<>
    <polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" />
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

// Origin: Latin — Roman column/pillar
const iOriginLatin = I(<>
    <line x1="12" y1="4" x2="12" y2="20" />
    <line x1="8" y1="4" x2="16" y2="4" />
    <line x1="8" y1="20" x2="16" y2="20" />
    <line x1="9" y1="4" x2="10" y2="8" />
    <line x1="15" y1="4" x2="14" y2="8" />
</>);

// Origin: Greek — temple pediment (Parthenon front)
const iOriginGreek = I(<>
    <path d="M4 20h16" />
    <line x1="6" y1="20" x2="6" y2="11" />
    <line x1="10" y1="20" x2="10" y2="11" />
    <line x1="14" y1="20" x2="14" y2="11" />
    <line x1="18" y1="20" x2="18" y2="11" />
    <path d="M3 11h18L12 4Z" />
</>);

// Origin: French — fleur-de-lis
const iOriginFrench = I(<>
    <path d="M12 22v-10" />
    <path d="M12 4c0 3-4 5-4 8 0 1.5 1.5 2.5 3 2" />
    <path d="M12 4c0 3 4 5 4 8 0 1.5-1.5 2.5-3 2" />
    <path d="M8 18c-2 0-3 1-3 2h14c0-1-1-2-3-2" />
</>);

// Origin: German — eagle silhouette (spread wings)
const iOriginGerman = I(<>
    <path d="M12 8v10" />
    <path d="M12 8c-3-2-6-4-9-3 2 2 4 3 5 6" />
    <path d="M12 8c3-2 6-4 9-3-2 2-4 3-5 6" />
    <circle cx="12" cy="6" r="2" />
</>);

// Origin: Other — globe with meridians
const iOriginOther = I(<>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c-3 3-3 15 0 18" />
    <path d="M12 3c3 3 3 15 0 18" />
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
    // Basic
    { id: 'cvc', icon: iCvc, label: 'CVC Words', group: 'basic' },
    { id: 'blends', icon: iBlends, label: 'Blends', group: 'basic' },
    // Core
    { id: 'digraphs', icon: iDigraphs, label: 'Digraphs', group: 'core' },
    { id: 'silent-e', icon: iSilentE, label: 'Silent E', group: 'core' },
    { id: 'vowel-teams', icon: iVowelTeams, label: 'Vowel Teams', group: 'core' },
    { id: 'r-controlled', icon: iRControlled, label: 'R-Controlled', group: 'core' },
    { id: 'diphthongs', icon: iDiphthongs, label: 'Diphthongs', group: 'core' },
    // Advanced
    { id: 'prefixes', icon: iPrefixes, label: 'Prefixes', group: 'advanced' },
    { id: 'suffixes', icon: iSuffixes, label: 'Suffixes', group: 'advanced' },
    { id: 'multisyllable', icon: iMulti, label: 'Multisyllable', group: 'advanced' },
    // Expert
    { id: 'latin-roots', icon: iLatin, label: 'Latin Roots', group: 'expert' },
    { id: 'greek-roots', icon: iGreek, label: 'Greek Roots', group: 'expert' },
    { id: 'french-origin', icon: iFrench, label: 'French Origin', group: 'expert' },
    // By Level
    { id: 'level-1', icon: iTier1, label: 'Level 1', group: 'tier' },
    { id: 'level-2', icon: iTier2, label: 'Level 2', group: 'tier' },
    { id: 'level-3', icon: iTier3, label: 'Level 3', group: 'tier' },
    { id: 'level-4', icon: iTier4, label: 'Level 4', group: 'tier' },
    { id: 'level-5', icon: iTier5, label: 'Level 5', group: 'tier' },
    { id: 'level-6', icon: iTier6, label: 'Level 6', group: 'tier' },
    { id: 'level-7', icon: iTier7, label: 'Level 7', group: 'tier' },
    { id: 'level-8', icon: iTier8, label: 'Level 8', group: 'tier' },
    { id: 'level-9', icon: iTier9, label: 'Level 9', group: 'tier' },
    { id: 'level-10', icon: iTier10, label: 'Level 10', group: 'tier' },
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
    // Origins (by etymology / language of origin)
    { id: 'origin-latin', icon: iOriginLatin, label: 'Latin', group: 'origins' },
    { id: 'origin-greek', icon: iOriginGreek, label: 'Greek', group: 'origins' },
    { id: 'origin-french', icon: iOriginFrench, label: 'French', group: 'origins' },
    { id: 'origin-german', icon: iOriginGerman, label: 'German', group: 'origins' },
    { id: 'origin-other', icon: iOriginOther, label: 'Other Origins', group: 'origins' },
    { id: 'roots', icon: iRoots, label: 'Word Roots', group: 'origins', premium: true },
    { id: 'etymology', icon: iEtymology, label: 'Etymology Quiz', group: 'origins', premium: true },
    // My Lists
    { id: 'custom', icon: iCustom, label: 'My Lists', group: 'practice' },
];

// eslint-disable-next-line react-refresh/only-export-components
export const SPELLING_GROUP_LABELS: Record<SpellingGroup, string> = {
    daily: 'Daily',
    basic: 'Basic',
    core: 'Core',
    advanced: 'Advanced',
    expert: 'Expert',
    tier: 'By Level',
    themes: 'Themes',
    origins: 'By Origin',
    practice: 'Practice',
};

// ── Level config ─────────────────────────────────────────────────────────────

export const LEVELS: readonly LevelConfig[] = [
    { id: 'level-1', label: 'Level 1', defaultCategory: 'level-1', minDifficultyLevel: 1 },
    { id: 'level-2', label: 'Level 2', defaultCategory: 'level-2', minDifficultyLevel: 2 },
    { id: 'level-3', label: 'Level 3', defaultCategory: 'level-3', minDifficultyLevel: 3 },
    { id: 'level-4', label: 'Level 4', defaultCategory: 'level-4', minDifficultyLevel: 4 },
    { id: 'level-5', label: 'Level 5', defaultCategory: 'level-5', minDifficultyLevel: 5 },
    { id: 'level-6', label: 'Level 6', defaultCategory: 'level-6', minDifficultyLevel: 6 },
    { id: 'level-7', label: 'Level 7', defaultCategory: 'level-7', minDifficultyLevel: 7 },
    { id: 'level-8', label: 'Level 8', defaultCategory: 'level-8', minDifficultyLevel: 8 },
    { id: 'level-9', label: 'Level 9', defaultCategory: 'level-9', minDifficultyLevel: 9 },
    { id: 'level-10', label: 'Level 10', defaultCategory: 'level-10', minDifficultyLevel: 10 },
] as const;

/** @deprecated Use LEVELS instead */
export const GRADE_LEVELS = LEVELS;

/** Icon for a level (reuses the tier icon from SPELLING_CATEGORIES). */
// eslint-disable-next-line react-refresh/only-export-components
export function levelIcon(level: Level): ReactNode {
    return SPELLING_CATEGORIES.find(c => c.id === level)?.icon;
}

/** @deprecated Use levelIcon instead */
// eslint-disable-next-line react-refresh/only-export-components
export const gradeIcon = levelIcon;

/** Lookup helper: get level config by ID. Falls back to tier-1. */
// eslint-disable-next-line react-refresh/only-export-components
export function getLevelConfig(level: Level): LevelConfig {
    return LEVELS.find(g => g.id === level) ?? LEVELS[0];
}

/** @deprecated Use getLevelConfig instead */
// eslint-disable-next-line react-refresh/only-export-components
export const getGradeConfig = getLevelConfig;
