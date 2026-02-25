/**
 * domains/spelling/spellingMessages.ts
 *
 * Spelling-specific companion message pools.
 * Injected into the generic chalkMessages picker via the `overrides` parameter.
 */
import type { SpellingCategory } from './spellingCategories';
import type { ChalkMessageOverrides } from '../../utils/chalkMessages';

// ── Topic-specific quips ──────────────────────────────────────────────────────

const TOPIC_SUCCESS: Partial<Record<SpellingCategory, string[]>> = {
    cvc: ['Short and sweet! 🐱', 'Nailed that CVC! ✅', 'Consonant-Vowel-Consonant? Piece of cake! 🍰'],
    blends: ['Blending brilliance! 🌬️✨', 'Smooth as a blend! 🎵', 'Blend master! 🏆'],
    digraphs: ['Two letters, one sound — and you nailed it! 🔤', 'Digraph dynamo! 💥', 'Two-for-one! ✌️'],
    'silent-e': ['Silent but deadly! 🤫✨', 'Magic E mastered! 🪄', 'The E may be quiet, but you\'re loud! 📣'],
    'vowel-teams': ['Vowel power! 🎭', 'The team works! 🤝', 'Two vowels, walk the walk! 🚶‍♂️'],
    'review': ['Mix master! 🎧', 'You can spell EVERYTHING! 🌈'],
};

const TOPIC_FAIL: Partial<Record<SpellingCategory, string[]>> = {
    cvc: ['Short words, big practice! 💙', 'Sound it out! 🔊', 'C-V-C, you\'ve got this! 💪'],
    blends: ['Blends take practice! 🌬️', 'Blend it a bit more! 🎵'],
    digraphs: ['Two letters sneaking around! 🔤', 'That digraph got you — next time! 💙'],
    'silent-e': ['That E is sneaky! 🤫', 'Magic takes practice! 🪄', 'Even wizards need practice! ⚡'],
    'vowel-teams': ['Vowels working together — team effort! 🎭', 'When two vowels go walking… practice! 📖'],
    'review': ['Mixed bag — keep going! 🌀', 'One word at a time! 📝'],
};

// ── Spelling Easter eggs ──────────────────────────────────────────────────────

const SPELLING_EASTER_EGGS: string[] = [
    '"Rhythm" has no vowels — and you\'re still crushing it! 🎵',
    'Fun fact: "queue" is just the letter Q with 4 silent letters! 🤐',
    'The word "set" has 464 definitions. You\'ve got this! 📖',
    '"Stewardesses" is the longest word typed with only the left hand! ✋',
    '"Dreamt" is the only English word ending in "mt"! 🌙',
    'The word "bookkeeper" has three consecutive double-letter pairs! 👀',
    'Even Shakespeare made spelling mistakes — you\'re in good company! 🖋️',
    '"Schoolmaster" is an anagram of "the classroom"! 🏫',
    'Bee Buddy says: spelling bees are the coolest! And bees are never wrong! 🐝',
];

// ── Exported overrides object ─────────────────────────────────────────────────

export const SPELLING_MESSAGE_OVERRIDES: ChalkMessageOverrides = {
    topicSuccess: (id: string) => TOPIC_SUCCESS[id as SpellingCategory] ?? null,
    topicFail: (id: string) => TOPIC_FAIL[id as SpellingCategory] ?? null,
    easterEggs: SPELLING_EASTER_EGGS,
};
