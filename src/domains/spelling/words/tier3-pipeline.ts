/**
 * words/tier3-pipeline.ts
 *
 * Barrel file — combines chunked pipeline files for tier 3.
 * Total: 4512 words across 5 chunks.
 *
 * DO NOT EDIT MANUALLY.
 */
import type { SpellingWord } from './types';
import { TIER_3_PIPELINE_A_WORDS } from './tier3-pipeline-a';
import { TIER_3_PIPELINE_B_WORDS } from './tier3-pipeline-b';
import { TIER_3_PIPELINE_C_WORDS } from './tier3-pipeline-c';
import { TIER_3_PIPELINE_D_WORDS } from './tier3-pipeline-d';
import { TIER_3_PIPELINE_E_WORDS } from './tier3-pipeline-e';

export const TIER_3_PIPELINE_WORDS: SpellingWord[] = [...TIER_3_PIPELINE_A_WORDS, ...TIER_3_PIPELINE_B_WORDS, ...TIER_3_PIPELINE_C_WORDS, ...TIER_3_PIPELINE_D_WORDS, ...TIER_3_PIPELINE_E_WORDS];
