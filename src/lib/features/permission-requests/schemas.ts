/**
 * Permission-elevation request schemas (ADR 0055 / Wave 9.1e).
 *
 * Source-of-record: leadkart-go/api/openapi.yaml — regenerate generated
 * Zod via `npm run openapi:codegen` to detect drift. These hand-rolled
 * schemas mirror the generated PermissionRequestDto + request envelopes
 * for boundary parsing at the gateway. Keep in sync when the backend
 * spec moves.
 */
import { z } from 'zod';

export const permissionRequestStateSchema = z.enum(['pending', 'approved', 'denied', 'cancelled']);
export type PermissionRequestState = z.output<typeof permissionRequestStateSchema>;

// Note: server validates UUIDs server-side; we accept any string here
// to match the rest of the codebase (auth/users/roles schemas). Zod
// 4's `.uuid()` rejects the all-zeros test fixtures, which would break
// every test in the suite for marginal client-side gain.
export const permissionRequestDtoSchema = z.object({
	id: z.string(),
	tenant_id: z.string(),
	requester_membership_id: z.string(),
	permission: z.string(),
	duration_days: z.number().int(),
	reason: z.string(),
	state: permissionRequestStateSchema,
	approver_membership_id: z.string().optional(),
	decided_at: z.string().optional(),
	decision_reason: z.string().optional(),
	expires_at: z.string().optional(),
	created_at: z.string(),
	updated_at: z.string()
});
export type PermissionRequestDto = z.output<typeof permissionRequestDtoSchema>;

export const listPermissionRequestsResponseSchema = z.object({
	requests: z.array(permissionRequestDtoSchema),
	has_more: z.boolean(),
	next_cursor: z.string().optional()
});
export type ListPermissionRequestsResponse = z.output<typeof listPermissionRequestsResponseSchema>;

export const createPermissionRequestSchema = z.object({
	permission: z.string().min(1, 'Pick a permission'),
	duration_days: z.number().int().min(1).max(365).optional(),
	reason: z.string().min(10, 'Reason must be at least 10 characters').max(1024)
});
export type CreatePermissionRequest = z.output<typeof createPermissionRequestSchema>;

export const createPermissionRequestResponseSchema = z.object({
	request_id: z.string()
});
export type CreatePermissionRequestResponse = z.output<
	typeof createPermissionRequestResponseSchema
>;

export const approvePermissionRequestSchema = z.object({
	decision_reason: z.string().max(1024).optional()
});
export const denyPermissionRequestSchema = z.object({
	decision_reason: z.string().min(1, 'Reason is required').max(1024)
});
