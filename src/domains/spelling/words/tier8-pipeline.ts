/**
 * words/tier8-pipeline.ts
 *
 * Barrel file — combines chunked pipeline files for tier 8.
 * Total: 4994 words across 5 chunks.
 *
 * DO NOT EDIT MANUALLY.
 */
import type { SpellingWord } from './types';
import { TIER_8_PIPELINE_A_WORDS } from './tier8-pipeline-a';
import { TIER_8_PIPELINE_B_WORDS } from './tier8-pipeline-b';
import { TIER_8_PIPELINE_C_WORDS } from './tier8-pipeline-c';
import { TIER_8_PIPELINE_D_WORDS } from './tier8-pipeline-d';
import { TIER_8_PIPELINE_E_WORDS } from './tier8-pipeline-e';

export const TIER_8_PIPELINE_WORDS: SpellingWord[] = [...TIER_8_PIPELINE_A_WORDS, ...TIER_8_PIPELINE_B_WORDS, ...TIER_8_PIPELINE_C_WORDS, ...TIER_8_PIPELINE_D_WORDS, ...TIER_8_PIPELINE_E_WORDS];
