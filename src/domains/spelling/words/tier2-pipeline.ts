/**
 * words/tier2-pipeline.ts
 *
 * Barrel file — combines chunked pipeline files for tier 2.
 * Total: 2576 words across 3 chunks.
 *
 * DO NOT EDIT MANUALLY.
 */
import type { SpellingWord } from './types';
import { TIER_2_PIPELINE_A_WORDS } from './tier2-pipeline-a';
import { TIER_2_PIPELINE_B_WORDS } from './tier2-pipeline-b';
import { TIER_2_PIPELINE_C_WORDS } from './tier2-pipeline-c';

export const TIER_2_PIPELINE_WORDS: SpellingWord[] = [...TIER_2_PIPELINE_A_WORDS, ...TIER_2_PIPELINE_B_WORDS, ...TIER_2_PIPELINE_C_WORDS];
