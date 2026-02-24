/**
 * domains/spelling/index.ts
 *
 * Public API surface for the spelling domain.
 * Other modules should import from here, not from individual spelling domain files.
 */

export type { SpellingCategory, SpellingBand, SpellingGroup } from './spellingCategories';
export {
    SPELLING_CATEGORIES,
    SPELLING_BANDS,
    SPELLING_BAND_LABELS,
    SPELLING_AGE_BANDS,
    typesForBand,
    defaultTypeForBand,
} from './spellingCategories';

export { SPELLING_MESSAGE_OVERRIDES } from './spellingMessages';

export { generateSpellingItem } from './spellingGenerator';

export type { SpellingAchievementStats } from './spellingAchievements';
export { EVERY_SPELLING_ACHIEVEMENT } from './spellingAchievements';
