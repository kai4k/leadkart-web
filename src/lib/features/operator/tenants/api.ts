import { api } from '$api/client';
import {
	tenantDtoSchema,
	registerTenantResponseSchema,
	listAllTenantsResponseSchema
} from './schemas';
import type {
	RegisterTenantRequest,
	RegisterTenantResponse,
	SuspendTenantRequest,
	MarkForDeletionRequest,
	TenantDto,
	ListAllTenantsResponse
} from './types';

/**
 * Try to parse a 200+body response as TenantDto.
 * Returns the DTO when the server sends one (E4 pattern), undefined for 204.
 * This lets mutation hooks use setQueryData for instant cache hydration
 * when the backend ships 200+DTO instead of 204 No Content.
 */
function parseTenantOrVoid(raw: unknown): TenantDto | void {
	if (raw === null || raw === undefined || raw === '') return;
	const result = tenantDtoSchema.safeParse(raw);
	return result.success ? result.data : undefined;
}

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

export async function suspendTenant(
	tenantId: string,
	req: SuspendTenantRequest
): Promise<TenantDto | void> {
	const raw = await api.post<unknown>(`/v1/tenants/${tenantId}/suspend`, req);
	return parseTenantOrVoid(raw);
}

export async function activateTenant(tenantId: string): Promise<TenantDto | void> {
	const raw = await api.post<unknown>(`/v1/tenants/${tenantId}/activate`, {});
	return parseTenantOrVoid(raw);
}

export async function markForDeletion(
	tenantId: string,
	req: MarkForDeletionRequest
): Promise<TenantDto | void> {
	const raw = await api.post<unknown>(`/v1/tenants/${tenantId}/mark-for-deletion`, req);
	return parseTenantOrVoid(raw);
}

export async function restoreTenant(tenantId: string): Promise<TenantDto | void> {
	const raw = await api.post<unknown>(`/v1/tenants/${tenantId}/restore`, {});
	return parseTenantOrVoid(raw);
}

/** List all tenants — operator-scoped (platform.tenants.view).
 *  Calls GET /v1/platform/tenants which returns the full collection. */
export async function listTenants(): Promise<ListAllTenantsResponse> {
	const raw = await api.get<unknown>('/v1/platform/tenants');
	return listAllTenantsResponseSchema.parse(raw);
}
