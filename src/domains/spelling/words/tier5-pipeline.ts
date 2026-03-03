/**
 * words/tier5-pipeline.ts
 *
 * Barrel file — combines chunked pipeline files for tier 5.
 * Total: 9971 words across 10 chunks.
 *
 * DO NOT EDIT MANUALLY.
 */
import type { SpellingWord } from './types';
import { TIER_5_PIPELINE_A_WORDS } from './tier5-pipeline-a';
import { TIER_5_PIPELINE_B_WORDS } from './tier5-pipeline-b';
import { TIER_5_PIPELINE_C_WORDS } from './tier5-pipeline-c';
import { TIER_5_PIPELINE_D_WORDS } from './tier5-pipeline-d';
import { TIER_5_PIPELINE_E_WORDS } from './tier5-pipeline-e';
import { TIER_5_PIPELINE_F_WORDS } from './tier5-pipeline-f';
import { TIER_5_PIPELINE_G_WORDS } from './tier5-pipeline-g';
import { TIER_5_PIPELINE_H_WORDS } from './tier5-pipeline-h';
import { TIER_5_PIPELINE_I_WORDS } from './tier5-pipeline-i';
import { TIER_5_PIPELINE_J_WORDS } from './tier5-pipeline-j';

export const TIER_5_PIPELINE_WORDS: SpellingWord[] = [...TIER_5_PIPELINE_A_WORDS, ...TIER_5_PIPELINE_B_WORDS, ...TIER_5_PIPELINE_C_WORDS, ...TIER_5_PIPELINE_D_WORDS, ...TIER_5_PIPELINE_E_WORDS, ...TIER_5_PIPELINE_F_WORDS, ...TIER_5_PIPELINE_G_WORDS, ...TIER_5_PIPELINE_H_WORDS, ...TIER_5_PIPELINE_I_WORDS, ...TIER_5_PIPELINE_J_WORDS];
