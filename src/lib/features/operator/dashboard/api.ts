import { apiLegacy, parseResponse } from '#lib/api/client.ts';
import { platformStatsResponseSchema, type PlatformStatsResponse } from './schemas';

/** Fetch platform-wide aggregate stats — operator-scoped.
 *  Calls GET /v1/platform/stats. */
export async function getPlatformStats(): Promise<PlatformStatsResponse> {
	const raw = await apiLegacy.get<unknown>('/v1/platform/stats');
	return parseResponse(platformStatsResponseSchema, raw);
}
