/**
 * Gateway for Go's audit-event reads (ADR 0027: the outbox doubles as the audit log; ADR 0038: keyset
 * pages). Go has two: the caller's own feed and a tenant's feed. There is no per-person feed yet, so
 * nothing here asks for one.
 */
import { seg } from '#lib/utils/path-segment.ts';
import { apiLegacy, parseResponse } from '#lib/api/client.ts';
import { auditEventsResponseSchema, type ActivityListResponse } from './schemas';

export type ActivityParams = {
	cursor?: string | null;
	/** Go's `page_size`. */
	pageSize?: number;
};

function buildQuery(base: string, params?: ActivityParams): string {
	if (!params) return base;
	const qs = new URLSearchParams();
	if (params.cursor) qs.set('cursor', params.cursor);
	if (params.pageSize != null) qs.set('page_size', String(params.pageSize));
	const q = qs.toString();
	return q ? `${base}?${q}` : base;
}

/** Go's page (`events`, `has_more`, `next_cursor`) as the timeline reads it. */
function toActivityPage(raw: unknown): ActivityListResponse {
	const page = parseResponse(auditEventsResponseSchema, raw);
	return {
		items: page.events.map((e) => ({
			id: e.id,
			event_type: e.action,
			actor_id: e.actor_id ?? null,
			occurred_at: e.occurred_at,
			succeeded: e.succeeded,
			failure_reason: e.failure_reason ?? null,
			trace_id: e.correlation_id ?? null,
			payload: e.payload ?? {}
		})),
		next_cursor: page.has_more ? (page.next_cursor ?? null) : null
	};
}

/** GET /v1/tenants/{tenantId}/audit/events: a tenant's audit feed (identity.tenants.view in that tenant). */
export async function listTenantActivity(
	tenantId: string,
	params?: ActivityParams
): Promise<ActivityListResponse> {
	const raw = await apiLegacy.get<unknown>(
		buildQuery(`/v1/tenants/${seg(tenantId)}/audit/events`, params)
	);
	return toActivityPage(raw);
}

/** GET /v1/auth/me/activity: the caller's own audit feed. */
export async function listMyActivity(params?: ActivityParams): Promise<ActivityListResponse> {
	const raw = await apiLegacy.get<unknown>(buildQuery('/v1/auth/me/activity', params));
	return toActivityPage(raw);
}
