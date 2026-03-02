/**
 * words/tier4-pipeline.ts
 *
 * Barrel file — combines chunked pipeline files for tier 4.
 * Total: 13000 words across 13 chunks.
 *
 * DO NOT EDIT MANUALLY.
 */
import type { SpellingWord } from './types';
import { TIER_4_PIPELINE_A_WORDS } from './tier4-pipeline-a';
import { TIER_4_PIPELINE_B_WORDS } from './tier4-pipeline-b';
import { TIER_4_PIPELINE_C_WORDS } from './tier4-pipeline-c';
import { TIER_4_PIPELINE_D_WORDS } from './tier4-pipeline-d';
import { TIER_4_PIPELINE_E_WORDS } from './tier4-pipeline-e';
import { TIER_4_PIPELINE_F_WORDS } from './tier4-pipeline-f';
import { TIER_4_PIPELINE_G_WORDS } from './tier4-pipeline-g';
import { TIER_4_PIPELINE_H_WORDS } from './tier4-pipeline-h';
import { TIER_4_PIPELINE_I_WORDS } from './tier4-pipeline-i';
import { TIER_4_PIPELINE_J_WORDS } from './tier4-pipeline-j';
import { TIER_4_PIPELINE_K_WORDS } from './tier4-pipeline-k';
import { TIER_4_PIPELINE_L_WORDS } from './tier4-pipeline-l';
import { TIER_4_PIPELINE_M_WORDS } from './tier4-pipeline-m';

export const TIER_4_PIPELINE_WORDS: SpellingWord[] = [...TIER_4_PIPELINE_A_WORDS, ...TIER_4_PIPELINE_B_WORDS, ...TIER_4_PIPELINE_C_WORDS, ...TIER_4_PIPELINE_D_WORDS, ...TIER_4_PIPELINE_E_WORDS, ...TIER_4_PIPELINE_F_WORDS, ...TIER_4_PIPELINE_G_WORDS, ...TIER_4_PIPELINE_H_WORDS, ...TIER_4_PIPELINE_I_WORDS, ...TIER_4_PIPELINE_J_WORDS, ...TIER_4_PIPELINE_K_WORDS, ...TIER_4_PIPELINE_L_WORDS, ...TIER_4_PIPELINE_M_WORDS];
