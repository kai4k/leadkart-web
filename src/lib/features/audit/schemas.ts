import { z } from 'zod';

/**
 * ActivityDto — wire shape of a single audit log entry.
 * Mirrors the leadkart-go audit event structure per ADR 0038 N2.
 */
export const activityDtoSchema = z.object({
	id: z.string(),
	event_type: z.string(),
	actor_id: z.string().nullable(),
	actor_display_name: z.string().nullable(),
	target_id: z.string().nullable(),
	target_type: z.string().nullable(),
	payload: z.record(z.string(), z.unknown()).default({}),
	occurred_at: z.string(),
	trace_id: z.string().nullable()
});

export const activityListResponseSchema = z.object({
	items: z.array(activityDtoSchema),
	next_cursor: z.string().nullable()
});

export type ActivityDto = z.output<typeof activityDtoSchema>;
export type ActivityListResponse = z.output<typeof activityListResponseSchema>;
