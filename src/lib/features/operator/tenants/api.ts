import { api, parseResponse } from '$api/client';
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
	const raw = await api.post<unknown>('/v1/tenants', req);
	return parseResponse(registerTenantResponseSchema, raw);
}

/** Read a tenant by UUID — operator-scoped (platform.tenants.view).
 *  Same endpoint the tenant feature uses; access is widened by
 *  the operator's permission claim. */
export async function getTenant(tenantId: string): Promise<TenantDto> {
	const raw = await api.get<unknown>(`/v1/tenants/${tenantId}`);
	return parseResponse(tenantDtoSchema, raw);
}

/** Read a tenant by human-readable slug.
 *
 *  Per backend ADR 0052, the canonical form is the Stripe-style filter
 *  query `GET /v1/tenants?slug=…` returning `{ tenants: [...] }`. The
 *  grandfathered `/v1/tenants/by-slug/{slug}` is deprecated and will be
 *  removed in a future release. Slug uniqueness is a DB invariant — the
 *  list returns either zero or one item. We surface a 404-shaped error
 *  on empty for caller convenience. */
export async function getTenantBySlug(slug: string): Promise<TenantDto> {
	const raw = await api.get<unknown>(`/v1/tenants?slug=${encodeURIComponent(slug)}`);
	const list = parseResponse(listAllTenantsResponseSchema, raw);
	const tenant = list.tenants[0];
	if (!tenant) {
		const err = new Error(`Tenant not found: ${slug}`);
		(err as Error & { status: number }).status = 404;
		throw err;
	}
	return tenant;
}

export async function suspendTenant(
	tenantId: string,
	req: SuspendTenantRequest
): Promise<TenantDto> {
	const raw = await api.post<unknown>(`/v1/tenants/${tenantId}/suspend`, req);
	return parseResponse(tenantDtoSchema, raw);
}

export async function activateTenant(tenantId: string): Promise<TenantDto> {
	const raw = await api.post<unknown>(`/v1/tenants/${tenantId}/activate`, {});
	return parseResponse(tenantDtoSchema, raw);
}

export async function markForDeletion(
	tenantId: string,
	req: MarkForDeletionRequest
): Promise<TenantDto> {
	const raw = await api.post<unknown>(`/v1/tenants/${tenantId}/mark-for-deletion`, req);
	return parseResponse(tenantDtoSchema, raw);
}

export async function restoreTenant(tenantId: string): Promise<TenantDto> {
	const raw = await api.post<unknown>(`/v1/tenants/${tenantId}/restore`, {});
	return parseResponse(tenantDtoSchema, raw);
}

/** List all tenants — operator-scoped (platform.tenants.view).
 *  Calls GET /v1/platform/tenants which returns the full collection. */
export async function listTenants(): Promise<ListAllTenantsResponse> {
	const raw = await api.get<unknown>('/v1/platform/tenants');
	return parseResponse(listAllTenantsResponseSchema, raw);
}
