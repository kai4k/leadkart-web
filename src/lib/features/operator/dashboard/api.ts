import { api } from '#lib/api/client.ts';
import { platformStatsResponseSchema, type PlatformStatsResponse } from './schemas';

/** Fetch platform-wide aggregate stats — operator-scoped.
 *  Calls GET /v1/platform/stats. */
export function getPlatformStats(signal?: AbortSignal): Promise<PlatformStatsResponse> {
	return api.get('/v1/platform/stats', platformStatsResponseSchema, { signal });
}
