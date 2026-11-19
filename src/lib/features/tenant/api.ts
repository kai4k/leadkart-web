/**
 * Typed wrappers around the leadkart-go Identity tenant-management
 * endpoints. Pure HTTP boundary per Niko Heikkilä "Clean Frontend
 * Architecture": shape, status mapping, Zod-parse the response. NO
 * business logic; NO state mutation; NO session reads.
 *
 * The service layer threads `myCapabilitiesQuery().data.tenant_id` into
 * these wrappers — keeping the gateway stateless leaves it trivially
 * testable + reusable from server-side renders if SvelteKit ever
 * moves off adapter-static.
 *
 * Endpoints (verified against leadkart-go
 * `internal/identity/ports/http.go` AddRoutes):
 *
 *   GET    /v1/tenants/{tenantId}                       → TenantDto
 *   PATCH  /v1/tenants/{tenantId}/profile               → 204
 *   PATCH  /v1/tenants/{tenantId}/statutory             → 204
 *   PATCH  /v1/tenants/{tenantId}/admin-contact         → 204
 *   PATCH  /v1/tenants/{tenantId}/settings              → 204
 *   PATCH  /v1/tenants/{tenantId}/display-preferences   → 204
 *
 * Tenant CREATION (`POST /v1/tenants`) exists server-side but is NOT
 * exposed in this SPA. Per the LeadKart auth model only SuperAdmin
 * creates tenants — that flow lives in the admin tooling (to be wired
 * later under the platform module), NOT in self-serve registration.
 *
 * Auth is handled by the cross-cutting client (`$api/client`) which
 * injects the bearer token + handles 401-silent-refresh.
 */
import { api } from '#lib/api/client.ts';
import { tenantSchema } from './schemas';
import type {
	Tenant,
	UpdateTenantAdminContactRequest,
	UpdateTenantDisplayPreferencesRequest,
	UpdateTenantProfileRequest,
	UpdateTenantSettingsRequest,
	UpdateTenantStatutoryRequest
} from './types';

function tenantPath(tenantId: string, suffix = ''): string {
	return `/v1/tenants/${encodeURIComponent(tenantId)}${suffix}`;
}

export function getTenant(tenantId: string, signal?: AbortSignal): Promise<Tenant> {
	return api.get(tenantPath(tenantId), tenantSchema, { signal });
}

export async function updateTenantProfile(
	tenantId: string,
	body: UpdateTenantProfileRequest
): Promise<void> {
	await api.patch(tenantPath(tenantId, '/profile'), body);
}

export async function updateTenantStatutory(
	tenantId: string,
	body: UpdateTenantStatutoryRequest
): Promise<void> {
	await api.patch(tenantPath(tenantId, '/statutory'), body);
}

export async function updateTenantAdminContact(
	tenantId: string,
	body: UpdateTenantAdminContactRequest
): Promise<void> {
	await api.patch(tenantPath(tenantId, '/admin-contact'), body);
}

export async function updateTenantSettings(
	tenantId: string,
	body: UpdateTenantSettingsRequest
): Promise<void> {
	await api.patch(tenantPath(tenantId, '/settings'), body);
}

export async function updateTenantDisplayPreferences(
	tenantId: string,
	body: UpdateTenantDisplayPreferencesRequest
): Promise<void> {
	await api.patch(tenantPath(tenantId, '/display-preferences'), body);
}
