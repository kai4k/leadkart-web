/**
 * Gateway for audit activity endpoints per ADR 0038 N2.
 * Each resource that exposes activity uses the same cursor-paginated shape.
 */
import { api, parseResponse } from '$api/client';
import { activityListResponseSchema } from './schemas';
import type { ActivityListResponse } from './schemas';

export type ActivityParams = {
	cursor?: string | null;
	limit?: number;
	since?: string;
	until?: string;
};

function buildQuery(base: string, params?: ActivityParams): string {
	if (!params) return base;
	const qs = new URLSearchParams();
	if (params.cursor) qs.set('cursor', params.cursor);
	if (params.limit != null) qs.set('limit', String(params.limit));
	if (params.since) qs.set('since', params.since);
	if (params.until) qs.set('until', params.until);
	const q = qs.toString();
	return q ? `${base}?${q}` : base;
}

/** GET /v1/tenants/{id}/activity — operator-scoped (platform.tenants.view). */
export async function listTenantActivity(
	tenantId: string,
	params?: ActivityParams
): Promise<ActivityListResponse> {
	const raw = await api.get<unknown>(buildQuery(`/v1/tenants/${tenantId}/activity`, params));
	return parseResponse(activityListResponseSchema, raw);
}

/** GET /v1/platform/persons/{id}/activity — operator-scoped (platform.users.view). */
export async function listPersonActivity(
	personId: string,
	params?: ActivityParams
): Promise<ActivityListResponse> {
	const raw = await api.get<unknown>(
		buildQuery(`/v1/platform/persons/${personId}/activity`, params)
	);
	return parseResponse(activityListResponseSchema, raw);
}

/** GET /v1/auth/me/activity — caller's own activity. */
export async function listMyActivity(params?: ActivityParams): Promise<ActivityListResponse> {
	const raw = await api.get<unknown>(buildQuery('/v1/auth/me/activity', params));
	return parseResponse(activityListResponseSchema, raw);
}
