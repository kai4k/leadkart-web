import type { z } from 'zod';
import { PlatformStatsResponse as PlatformStatsResponseContract } from '#lib/api/generated/index.ts';

export const platformStatsResponseSchema = PlatformStatsResponseContract;

export type PlatformStatsResponse = z.output<typeof platformStatsResponseSchema>;
