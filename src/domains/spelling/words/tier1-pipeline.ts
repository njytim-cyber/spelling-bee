/**
 * words/tier1-pipeline.ts
 *
 * Barrel file — combines chunked pipeline files for tier 1.
 * Total: 1321 words across 2 chunks.
 *
 * DO NOT EDIT MANUALLY.
 */
import type { SpellingWord } from './types';
import { TIER_1_PIPELINE_A_WORDS } from './tier1-pipeline-a';
import { TIER_1_PIPELINE_B_WORDS } from './tier1-pipeline-b';

export const TIER_1_PIPELINE_WORDS: SpellingWord[] = [...TIER_1_PIPELINE_A_WORDS, ...TIER_1_PIPELINE_B_WORDS];
