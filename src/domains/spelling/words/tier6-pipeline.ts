/**
 * words/tier6-pipeline.ts
 *
 * Barrel file — combines chunked pipeline files for tier 6.
 * Total: 7985 words across 8 chunks.
 *
 * DO NOT EDIT MANUALLY.
 */
import type { SpellingWord } from './types';
import { TIER_6_PIPELINE_A_WORDS } from './tier6-pipeline-a';
import { TIER_6_PIPELINE_B_WORDS } from './tier6-pipeline-b';
import { TIER_6_PIPELINE_C_WORDS } from './tier6-pipeline-c';
import { TIER_6_PIPELINE_D_WORDS } from './tier6-pipeline-d';
import { TIER_6_PIPELINE_E_WORDS } from './tier6-pipeline-e';
import { TIER_6_PIPELINE_F_WORDS } from './tier6-pipeline-f';
import { TIER_6_PIPELINE_G_WORDS } from './tier6-pipeline-g';
import { TIER_6_PIPELINE_H_WORDS } from './tier6-pipeline-h';

export const TIER_6_PIPELINE_WORDS: SpellingWord[] = [...TIER_6_PIPELINE_A_WORDS, ...TIER_6_PIPELINE_B_WORDS, ...TIER_6_PIPELINE_C_WORDS, ...TIER_6_PIPELINE_D_WORDS, ...TIER_6_PIPELINE_E_WORDS, ...TIER_6_PIPELINE_F_WORDS, ...TIER_6_PIPELINE_G_WORDS, ...TIER_6_PIPELINE_H_WORDS];
