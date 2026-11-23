import { seg } from '#lib/utils/path-segment.ts';
import { api } from '#lib/api/client.ts';
import { registerTenantResponseSchema, listAllTenantsResponseSchema } from './schemas';
import type {
	RegisterTenantRequest,
	RegisterTenantResponse,
	SuspendTenantRequest,
	MarkForDeletionRequest,
	ListAllTenantsResponse
} from './types';

/** Register a new tenant + seed admin. Returns IDs of all three
 *  created records; the seed-admin credentials are the caller's input
 *  and must be conveyed out-of-band (UI surfaces them post-201). */
export function registerTenant(req: RegisterTenantRequest): Promise<RegisterTenantResponse> {
	return api.postJson('/v1/tenants', req, registerTenantResponseSchema);
}

/** Lifecycle mutations answer 204 (tenant_http.go writeTenantMutationResult): no DTO. */
export async function suspendTenant(tenantId: string, req: SuspendTenantRequest): Promise<void> {
	await api.post(`/v1/tenants/${seg(tenantId)}/suspend`, req);
}

export async function activateTenant(tenantId: string): Promise<void> {
	await api.post(`/v1/tenants/${seg(tenantId)}/activate`, {});
}

export async function markForDeletion(
	tenantId: string,
	req: MarkForDeletionRequest
): Promise<void> {
	await api.post(`/v1/tenants/${seg(tenantId)}/mark-for-deletion`, req);
}

export async function restoreTenant(tenantId: string): Promise<void> {
	await api.post(`/v1/tenants/${seg(tenantId)}/restore`, {});
}

/** List all tenants — operator-scoped (platform.tenants.view).
 *  Calls GET /v1/platform/tenants which returns the full collection. */
export function listTenants(signal?: AbortSignal): Promise<ListAllTenantsResponse> {
	return api.get('/v1/platform/tenants', listAllTenantsResponseSchema, { signal });
}
