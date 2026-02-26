/**
 * domains/spelling/etymologyGenerator.ts
 *
 * Generates etymology quiz items — two question types:
 * 1. "What language does this word come from?" (word → origin)
 * 2. "Which word comes from [language]?" (origin → word)
 *
 * Uses the parsed etymology field from SpellingWord and the
 * extractLanguage() utility for consistent language classification.
 */
import type { EngineItem } from '../../engine/domain';
import { getAllWords, getWordMap } from './words';
import { extractLanguage, type LanguageOfOrigin } from '../../utils/etymologyParser';

// Languages that appear frequently enough to quiz on
const QUIZZABLE_LANGUAGES: LanguageOfOrigin[] = ['Latin', 'Greek', 'French', 'German'];

interface EtymologyEntry {
    word: string;
    language: LanguageOfOrigin;
    etymology: string;
}

function getEtymologyPool(): EtymologyEntry[] {
    return getAllWords()
        .filter(w => w.etymology)
        .map(w => ({
            word: w.word,
            language: extractLanguage(w.etymology),
            etymology: w.etymology!,
        }))
        .filter(e => QUIZZABLE_LANGUAGES.includes(e.language));
}

/**
 * Generate an etymology quiz EngineItem.
 *
 * Alternates between two question types:
 * - Type A: "What language does [word] come from?" → pick from 3 languages
 * - Type B: "Which word comes from [language]?" → pick from 3 words
 */
export function generateEtymologyItem(
    difficulty: number,
    category: string,
    hardMode: boolean,
    rng: () => number = Math.random,
): EngineItem {
    const pool = getEtymologyPool();
    if (pool.length < 4) {
        // Fallback: not enough etymology data — shouldn't happen with tiers 3-5 loaded
        const fallback = getAllWords()[0];
        return {
            id: `etymology-fallback-${Date.now()}`,
            prompt: 'Etymology data loading...',
            answer: fallback.word,
            options: [fallback.word, fallback.word + 's', fallback.word + 'ed'],
            correctIndex: 0,
            meta: { word: fallback.word, category },
        };
    }

    const typeA = rng() < 0.5;

    if (typeA) {
        // Type A: word → language
        const entry = pool[Math.floor(rng() * pool.length)];
        const correctLang = entry.language;

        // Pick 2 wrong languages
        const wrongLangs = QUIZZABLE_LANGUAGES.filter(l => l !== correctLang);
        const shuffledWrong = wrongLangs.sort(() => rng() - 0.5).slice(0, 2);
        const options = [correctLang, ...shuffledWrong].sort(() => rng() - 0.5);
        const correctIndex = options.indexOf(correctLang);

        const wordMap = getWordMap();
        const detail = wordMap.get(entry.word);

        return {
            id: `etymology-a-${entry.word}-${Date.now()}-${Math.floor(rng() * 1e6)}`,
            prompt: `What language does "${entry.word}" come from?`,
            answer: correctLang,
            options,
            correctIndex,
            meta: {
                word: entry.word,
                category,
                hardMode,
                quizType: 'word-to-origin',
                etymology: entry.etymology,
                definition: detail?.definition ?? '',
                pronunciation: detail?.pronunciation ?? '',
                partOfSpeech: detail?.partOfSpeech ?? '',
                pattern: detail?.pattern ?? '',
                difficulty: detail?.difficulty ?? 5,
            },
        };
    } else {
        // Type B: language → word
        const targetLang = QUIZZABLE_LANGUAGES[Math.floor(rng() * QUIZZABLE_LANGUAGES.length)];
        const matching = pool.filter(e => e.language === targetLang);
        const notMatching = pool.filter(e => e.language !== targetLang);

        if (matching.length === 0 || notMatching.length < 2) {
            // Degenerate case: fall through to type A
            return generateEtymologyItem(difficulty, category, hardMode, rng);
        }

        const correct = matching[Math.floor(rng() * matching.length)];
        const wrong = notMatching.sort(() => rng() - 0.5).slice(0, 2);

        const options = [correct.word, wrong[0].word, wrong[1].word].sort(() => rng() - 0.5);
        const correctIndex = options.indexOf(correct.word);

        const wordMap = getWordMap();
        const detail = wordMap.get(correct.word);

        return {
            id: `etymology-b-${correct.word}-${Date.now()}-${Math.floor(rng() * 1e6)}`,
            prompt: `Which word comes from ${targetLang}?`,
            answer: correct.word,
            options,
            correctIndex,
            meta: {
                word: correct.word,
                category,
                hardMode,
                quizType: 'origin-to-word',
                etymology: correct.etymology,
                definition: detail?.definition ?? '',
                pronunciation: detail?.pronunciation ?? '',
                partOfSpeech: detail?.partOfSpeech ?? '',
                pattern: detail?.pattern ?? '',
                difficulty: detail?.difficulty ?? 5,
            },
        };
    }
}
