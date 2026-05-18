/**
 * Inferred types for operator-side tenant management.
 *
 * TenantDto is re-exported from the existing tenant feature; the
 * operator module consumes the same DTO shape — access is widened
 * by the operator's `platform.tenants.view` permission claim.
 */
import type { z } from 'zod';
import type {
	registerTenantRequestSchema,
	registerTenantResponseSchema,
	suspendTenantRequestSchema,
	markForDeletionRequestSchema,
	listAllTenantsResponseSchema
} from './schemas';

export type { Tenant as TenantDto } from '$lib/features/tenant/types';

export type RegisterTenantRequest = z.output<typeof registerTenantRequestSchema>;
export type RegisterTenantResponse = z.output<typeof registerTenantResponseSchema>;
export type SuspendTenantRequest = z.output<typeof suspendTenantRequestSchema>;
export type MarkForDeletionRequest = z.output<typeof markForDeletionRequestSchema>;
export type ListAllTenantsResponse = z.output<typeof listAllTenantsResponseSchema>;
