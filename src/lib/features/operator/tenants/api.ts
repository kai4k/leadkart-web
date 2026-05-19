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

/** Register a new tenant + seed admin. Returns IDs of all three
 *  created records; the seed-admin credentials are the caller's input
 *  and must be conveyed out-of-band (UI surfaces them post-201). */
export async function registerTenant(req: RegisterTenantRequest): Promise<RegisterTenantResponse> {
	const raw = await api.post<unknown>('/v1/tenants', req, { auth: false });
	return registerTenantResponseSchema.parse(raw);
}

/** Read a tenant by UUID — operator-scoped (platform.tenants.view).
 *  Same endpoint the tenant feature uses; access is widened by
 *  the operator's permission claim. */
export async function getTenant(tenantId: string): Promise<TenantDto> {
	const raw = await api.get<unknown>(`/v1/tenants/${tenantId}`);
	return tenantDtoSchema.parse(raw);
}

/** Read a tenant by human-readable slug — per ADR 0038 A.3.
 *  Used by the [slug]/ route hierarchy; slug is the canonical URL path param. */
export async function getTenantBySlug(slug: string): Promise<TenantDto> {
	const raw = await api.get<unknown>(`/v1/tenants/by-slug/${encodeURIComponent(slug)}`);
	return tenantDtoSchema.parse(raw);
}

export async function suspendTenant(
	tenantId: string,
	req: SuspendTenantRequest
): Promise<TenantDto> {
	const raw = await api.post<unknown>(`/v1/tenants/${tenantId}/suspend`, req);
	return tenantDtoSchema.parse(raw);
}

export async function activateTenant(tenantId: string): Promise<TenantDto> {
	const raw = await api.post<unknown>(`/v1/tenants/${tenantId}/activate`, {});
	return tenantDtoSchema.parse(raw);
}

export async function markForDeletion(
	tenantId: string,
	req: MarkForDeletionRequest
): Promise<TenantDto> {
	const raw = await api.post<unknown>(`/v1/tenants/${tenantId}/mark-for-deletion`, req);
	return tenantDtoSchema.parse(raw);
}

export async function restoreTenant(tenantId: string): Promise<TenantDto> {
	const raw = await api.post<unknown>(`/v1/tenants/${tenantId}/restore`, {});
	return tenantDtoSchema.parse(raw);
}

/** List all tenants — operator-scoped (platform.tenants.view).
 *  Calls GET /v1/platform/tenants which returns the full collection. */
export async function listTenants(): Promise<ListAllTenantsResponse> {
	const raw = await api.get<unknown>('/v1/platform/tenants');
	return listAllTenantsResponseSchema.parse(raw);
}
