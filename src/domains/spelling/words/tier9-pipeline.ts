/**
 * words/tier9-pipeline.ts
 *
 * Barrel file — combines chunked pipeline files for tier 9.
 * Total: 5000 words across 5 chunks.
 *
 * DO NOT EDIT MANUALLY.
 */
import type { SpellingWord } from './types';
import { TIER_9_PIPELINE_A_WORDS } from './tier9-pipeline-a';
import { TIER_9_PIPELINE_B_WORDS } from './tier9-pipeline-b';
import { TIER_9_PIPELINE_C_WORDS } from './tier9-pipeline-c';
import { TIER_9_PIPELINE_D_WORDS } from './tier9-pipeline-d';
import { TIER_9_PIPELINE_E_WORDS } from './tier9-pipeline-e';

export const TIER_9_PIPELINE_WORDS: SpellingWord[] = [...TIER_9_PIPELINE_A_WORDS, ...TIER_9_PIPELINE_B_WORDS, ...TIER_9_PIPELINE_C_WORDS, ...TIER_9_PIPELINE_D_WORDS, ...TIER_9_PIPELINE_E_WORDS];
