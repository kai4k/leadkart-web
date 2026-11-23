/**
 * Permission-elevation request schemas (ADR 0055 / Wave 9.1e).
 *
 * Derived from the generated contract (leadkart-go/api/openapi.yaml via
 * `npm run openapi:codegen`); nothing here restates a generated shape.
 */
import { z } from 'zod';
import { auditReasonField } from '#lib/api/request-schema.ts';
import {
	CreatePermissionRequestRequest,
	CreatePermissionRequestResponse as CreatePermissionRequestResponseContract,
	ListPermissionRequestsResponse as ListPermissionRequestsResponseContract,
	PermissionRequestDto as PermissionRequestDtoContract
} from '#lib/api/generated/index.ts';

export const permissionRequestDtoSchema = PermissionRequestDtoContract;
export type PermissionRequestDto = z.output<typeof permissionRequestDtoSchema>;

export type PermissionRequestState = PermissionRequestDto['state'];

export const listPermissionRequestsResponseSchema = ListPermissionRequestsResponseContract;
export type ListPermissionRequestsResponse = z.output<typeof listPermissionRequestsResponseSchema>;

/** Longest request duration, from the contract. */
export const PERMISSION_REQUEST_MAX_DAYS =
	CreatePermissionRequestRequest.shape.duration_days.unwrap().maxValue ?? 90;

/** Duration (1-90 days) and reason (max 1024) bounds are the generated ones; only the messages are ours. */
export const createPermissionRequestSchema = CreatePermissionRequestRequest.extend({
	permission: z.string().min(1, 'form.errors.permissionRequired'),
	reason: auditReasonField,
	duration_days: z
		.number({ error: 'form.errors.durationOutOfRange' })
		.int('form.errors.durationOutOfRange')
		.gte(1, 'form.errors.durationOutOfRange')
		.lte(PERMISSION_REQUEST_MAX_DAYS, 'form.errors.durationOutOfRange')
		.optional()
});
export type CreatePermissionRequest = z.output<typeof createPermissionRequestSchema>;

export const createPermissionRequestResponseSchema = CreatePermissionRequestResponseContract;
export type CreatePermissionRequestResponse = z.output<
	typeof createPermissionRequestResponseSchema
>;

export const approvePermissionRequestSchema = z.object({
	decision_reason: z.string().max(1024, 'form.tooLong').optional()
});
export const denyPermissionRequestSchema = z.object({
	decision_reason: z.string().min(1, 'form.errors.reasonRequired').max(1024, 'form.tooLong')
});
