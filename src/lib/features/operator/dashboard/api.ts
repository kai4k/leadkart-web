import { api, parseResponse } from '$api/client';
import { platformStatsResponseSchema, type PlatformStatsResponse } from './schemas';

/** Fetch platform-wide aggregate stats — operator-scoped.
 *  Calls GET /v1/platform/stats. */
export async function getPlatformStats(): Promise<PlatformStatsResponse> {
	const raw = await api.get<unknown>('/v1/platform/stats');
	return parseResponse(platformStatsResponseSchema, raw);
}
