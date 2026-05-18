import { api } from '$api/client';
import { tenantDtoSchema, registerTenantResponseSchema } from './schemas';
import type {
	RegisterTenantRequest,
	RegisterTenantResponse,
	SuspendTenantRequest,
	MarkForDeletionRequest,
	TenantDto
} from './types';

/** Register a new tenant + seed admin. Returns IDs of all three
 *  created records; the seed-admin credentials are the caller's input
 *  and must be conveyed out-of-band (UI surfaces them post-201). */
export async function registerTenant(req: RegisterTenantRequest): Promise<RegisterTenantResponse> {
	const raw = await api.post<unknown>('/v1/tenants', req, { auth: false });
	return registerTenantResponseSchema.parse(raw);
}

/** Read a tenant by ID — operator-scoped (platform.tenants.view).
 *  Same endpoint the tenant feature uses; access is widened by
 *  the operator's permission claim. */
export async function getTenant(tenantId: string): Promise<TenantDto> {
	const raw = await api.get<unknown>(`/v1/tenants/${tenantId}`);
	return tenantDtoSchema.parse(raw);
}

export async function suspendTenant(tenantId: string, req: SuspendTenantRequest): Promise<void> {
	await api.post<void>(`/v1/tenants/${tenantId}/suspend`, req);
}

export async function activateTenant(tenantId: string): Promise<void> {
	await api.post<void>(`/v1/tenants/${tenantId}/activate`, {});
}

export async function markForDeletion(
	tenantId: string,
	req: MarkForDeletionRequest
): Promise<void> {
	await api.post<void>(`/v1/tenants/${tenantId}/mark-for-deletion`, req);
}

export async function restoreTenant(tenantId: string): Promise<void> {
	await api.post<void>(`/v1/tenants/${tenantId}/restore`, {});
}

/**
 * TODO(backend): GET /v1/tenants (list) does not yet exist.
 * When it ships, add `listTenants()` here returning a paginated
 * response, and update OperatorTenantsStore.load() to use it.
 */
