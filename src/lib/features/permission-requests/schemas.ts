/**
 * Permission-elevation request schemas (ADR 0055 / Wave 9.1e).
 *
 * Derived from the generated contract (leadkart-go/api/openapi.yaml via
 * `npm run openapi:codegen`); nothing here restates a generated shape.
 */
import { z } from 'zod';
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

/** Duration (1-90 days) and reason (max 1024) bounds are the generated ones; only the messages are ours. */
export const createPermissionRequestSchema = CreatePermissionRequestRequest.extend({
	permission: z.string().min(1, 'Pick a permission'),
	reason: z.string().min(10, 'Reason must be at least 10 characters').max(1024)
});
export type CreatePermissionRequest = z.output<typeof createPermissionRequestSchema>;

export const createPermissionRequestResponseSchema = CreatePermissionRequestResponseContract;
export type CreatePermissionRequestResponse = z.output<
	typeof createPermissionRequestResponseSchema
>;

export const approvePermissionRequestSchema = z.object({
	decision_reason: z.string().max(1024).optional()
});
export const denyPermissionRequestSchema = z.object({
	decision_reason: z.string().min(1, 'Reason is required').max(1024)
});
