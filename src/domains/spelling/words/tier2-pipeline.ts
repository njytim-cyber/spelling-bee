/**
 * words/tier2-pipeline.ts
 *
 * Barrel file — combines chunked pipeline files for tier 2.
 * Total: 3075 words across 4 chunks.
 *
 * DO NOT EDIT MANUALLY.
 */
import type { SpellingWord } from './types';
import { TIER_2_PIPELINE_A_WORDS } from './tier2-pipeline-a';
import { TIER_2_PIPELINE_B_WORDS } from './tier2-pipeline-b';
import { TIER_2_PIPELINE_C_WORDS } from './tier2-pipeline-c';
import { TIER_2_PIPELINE_D_WORDS } from './tier2-pipeline-d';

export const TIER_2_PIPELINE_WORDS: SpellingWord[] = [...TIER_2_PIPELINE_A_WORDS, ...TIER_2_PIPELINE_B_WORDS, ...TIER_2_PIPELINE_C_WORDS, ...TIER_2_PIPELINE_D_WORDS];
