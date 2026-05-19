import { z } from 'zod';

export const platformStatsResponseSchema = z.object({
	tenants_total: z.number().int().nonnegative(),
	tenants_active: z.number().int().nonnegative(),
	tenants_suspended: z.number().int().nonnegative(),
	persons_total: z.number().int().nonnegative(),
	memberships_active: z.number().int().nonnegative()
});

export type PlatformStatsResponse = z.output<typeof platformStatsResponseSchema>;
