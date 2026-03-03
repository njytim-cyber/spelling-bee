/**
 * words/tier7-pipeline.ts
 *
 * Barrel file — combines chunked pipeline files for tier 7.
 * Total: 5996 words across 6 chunks.
 *
 * DO NOT EDIT MANUALLY.
 */
import type { SpellingWord } from './types';
import { TIER_7_PIPELINE_A_WORDS } from './tier7-pipeline-a';
import { TIER_7_PIPELINE_B_WORDS } from './tier7-pipeline-b';
import { TIER_7_PIPELINE_C_WORDS } from './tier7-pipeline-c';
import { TIER_7_PIPELINE_D_WORDS } from './tier7-pipeline-d';
import { TIER_7_PIPELINE_E_WORDS } from './tier7-pipeline-e';
import { TIER_7_PIPELINE_F_WORDS } from './tier7-pipeline-f';

export const TIER_7_PIPELINE_WORDS: SpellingWord[] = [...TIER_7_PIPELINE_A_WORDS, ...TIER_7_PIPELINE_B_WORDS, ...TIER_7_PIPELINE_C_WORDS, ...TIER_7_PIPELINE_D_WORDS, ...TIER_7_PIPELINE_E_WORDS, ...TIER_7_PIPELINE_F_WORDS];
