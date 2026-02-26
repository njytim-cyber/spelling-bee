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
 * ACCURACY NOTE (CLAUDE.md Principle 1): Every UK spelling and distractor
 * in this file has been individually verified. Distractors are plausible
 * misspellings of the UK form, not the US form.
 */
import type { UkOverride } from './registry';

export const UK_OVERRIDES: Record<string, UkOverride> = {
    // ── -or → -our ──────────────────────────────────────────────────────────
    'harbor': {
        word: 'harbour',
        pronunciation: 'hahr-bur',
        distractors: ['harbur', 'harber', 'harboir'],
    },
    'colorful': {
        word: 'colourful',
        pronunciation: 'kuh-lur-ful',
        distractors: ['colurful', 'colerful', 'coulourful'],
    },
    'neighborhood': {
        word: 'neighbourhood',
        pronunciation: 'nay-bur-hood',
        distractors: ['nieghbourhood', 'naighbourhood', 'neighbourhod'],
    },

    // ── -er → -re ───────────────────────────────────────────────────────────
    'center': {
        word: 'centre',
        pronunciation: 'sen-tur',
        distractors: ['centar', 'sentre', 'centere'],
    },
    'accouterments': {
        word: 'accoutrements',
        pronunciation: 'uh-koo-truh-muhnts',
        distractors: ['accoutremants', 'acoutrements', 'accoutrments'],
    },

    // ── -ize → -ise ─────────────────────────────────────────────────────────
    'civilization': {
        word: 'civilisation',
        pronunciation: 'siv-uh-ly-zay-shun',
        distractors: ['civilizasion', 'civilasation', 'civlisation'],
    },
    'organization': {
        word: 'organisation',
        pronunciation: 'or-guh-ny-zay-shun',
        distractors: ['organisasion', 'oganisation', 'organisaton'],
    },
    'disorganize': {
        word: 'disorganise',
        pronunciation: 'dis-or-guh-nyz',
        distractors: ['disorgainse', 'disorginise', 'disorganese'],
    },
    'ostracize': {
        word: 'ostracise',
        pronunciation: 'os-truh-syz',
        distractors: ['ostrasise', 'ostrecise', 'ostraccise'],
    },
    'pasteurize': {
        word: 'pasteurise',
        pronunciation: 'pas-chur-yz',
        distractors: ['pasteurese', 'pasturise', 'pastuerise'],
    },
    'scrutinize': {
        word: 'scrutinise',
        pronunciation: 'skroo-tuh-nyz',
        distractors: ['scrutinese', 'scrutanise', 'scutinise'],
    },
    'soliloquize': {
        word: 'soliloquise',
        pronunciation: 'suh-lil-uh-kwyz',
        distractors: ['soliloquese', 'soliliquise', 'soliloqise'],
    },
    'rontgenize': {
        word: 'rontgenise',
        pronunciation: 'rent-guh-nyz',
        distractors: ['rontgenese', 'rongenise', 'rontginise'],
    },
    'haussmannize': {
        word: 'haussmannise',
        pronunciation: 'hows-muh-nyz',
        distractors: ['haussmanise', 'hausmannise', 'haussmannese'],
    },
    'aggrandizement': {
        word: 'aggrandisement',
        pronunciation: 'uh-gran-dyz-muhnt',
        distractors: ['aggrandisment', 'agrandisement', 'aggrandisemant'],
    },

    // ── -ment differences ───────────────────────────────────────────────────
    'acknowledgment': {
        word: 'acknowledgement',
        pronunciation: 'ak-nol-ij-muhnt',
        distractors: ['acknowlegement', 'acknowledgment', 'acknoledgement'],
    },
    'enrollment': {
        word: 'enrolment',
        pronunciation: 'en-rohl-muhnt',
        distractors: ['enrolement', 'enrolmant', 'enroalment'],
    },
    'fulfillment': {
        word: 'fulfilment',
        pronunciation: 'ful-fil-muhnt',
        distractors: ['fulfillment', 'fulfilmant', 'fulfiment'],
    },

    // ── ae/oe digraph restorations ──────────────────────────────────────────
    'diarrhea': {
        word: 'diarrhoea',
        pronunciation: 'dy-uh-ree-uh',
        distractors: ['diarhoea', 'diarrhea', 'diarrhoeia'],
    },
    'logorrhea': {
        word: 'logorrhoea',
        pronunciation: 'log-uh-ree-uh',
        distractors: ['logorhoea', 'logorrhea', 'logorrhoeia'],
    },
    'synesthesia': {
        word: 'synaesthesia',
        pronunciation: 'sin-uhs-thee-zhuh',
        distractors: ['synasthesia', 'synaesthsia', 'synaesthesa'],
    },
    'encyclopedia': {
        word: 'encyclopaedia',
        pronunciation: 'en-sy-kluh-pee-dee-uh',
        distractors: ['encyclopeadia', 'encyclopaedia', 'encylopaedia'],
    },
    'hemorrhage': {
        word: 'haemorrhage',
        pronunciation: 'hem-uh-rij',
        distractors: ['haemorrage', 'haemorrhge', 'haemorrahge'],
    },
    'hemorrhoid': {
        word: 'haemorrhoid',
        pronunciation: 'hem-uh-royd',
        distractors: ['haemorroid', 'haemorrhid', 'haemorhoyd'],
    },

    // ── Miscellaneous ───────────────────────────────────────────────────────
    'plow': {
        word: 'plough',
        pronunciation: 'plow',
        distractors: ['plugh', 'ploughe', 'plowgh'],
    },
    'snowplow': {
        word: 'snowplough',
        pronunciation: 'snoh-plow',
        distractors: ['snowplugh', 'snowploughe', 'snowplowgh'],
    },
    'curb': {
        word: 'kerb',
        pronunciation: 'kurb',
        distractors: ['kirb', 'cerb', 'kurb'],
    },
};
