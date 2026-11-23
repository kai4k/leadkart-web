import type { z } from 'zod';
import { ListAuditEventsResponse } from '#lib/api/generated/index.ts';

/**
 * Go's audit page, from the generated contract (leadkart-go/api/openapi.yaml, `ListAuditEventsResponse`):
 * `{ events, has_more, next_cursor? }`, one event = a command that ran (`action`, who, when, whether it
 * succeeded, its payload).
 */
export const auditEventsResponseSchema = ListAuditEventsResponse;
export type AuditEventsResponse = z.output<typeof auditEventsResponseSchema>;
export type AuditEvent = AuditEventsResponse['events'][number];

/** One timeline entry: what the gateway makes of a Go audit event. */
export type ActivityDto = {
	id: string;
	/** Go's `action`: the command that ran. */
	event_type: string;
	/** The person who ran it; `null` for the system. */
	actor_id: string | null;
	occurred_at: string;
	/** False when the command was refused or failed: it is recorded, it did not happen. */
	succeeded: boolean;
	failure_reason: string | null;
	/** Go's `correlation_id`, the reference support asks for. */
	trace_id: string | null;
	payload: Record<string, unknown>;
};

export type ActivityListResponse = {
	items: ActivityDto[];
	/** The cursor of the next page; `null` on the last one. */
	next_cursor: string | null;
};
