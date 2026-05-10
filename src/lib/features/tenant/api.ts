/**
 * Typed wrappers around the leadkart-go Identity tenant-management
 * endpoints. Pure HTTP boundary per Niko Heikkilä "Clean Frontend
 * Architecture": shape, status mapping, Zod-parse the response. NO
 * business logic; NO state mutation; NO session reads.
 *
 * The service layer threads `session.principal.tenantId` into these
 * wrappers — keeping the gateway stateless leaves it trivially
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
import { api } from '$api/client';
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

export async function getTenant(tenantId: string): Promise<Tenant> {
	const raw = await api.get<unknown>(tenantPath(tenantId));
	return tenantSchema.parse(raw);
}

export function updateTenantProfile(
	tenantId: string,
	body: UpdateTenantProfileRequest
): Promise<void> {
	return api.patch<void>(tenantPath(tenantId, '/profile'), body);
}

export function updateTenantStatutory(
	tenantId: string,
	body: UpdateTenantStatutoryRequest
): Promise<void> {
	return api.patch<void>(tenantPath(tenantId, '/statutory'), body);
}

export function updateTenantAdminContact(
	tenantId: string,
	body: UpdateTenantAdminContactRequest
): Promise<void> {
	return api.patch<void>(tenantPath(tenantId, '/admin-contact'), body);
}

export function updateTenantSettings(
	tenantId: string,
	body: UpdateTenantSettingsRequest
): Promise<void> {
	return api.patch<void>(tenantPath(tenantId, '/settings'), body);
}

export function updateTenantDisplayPreferences(
	tenantId: string,
	body: UpdateTenantDisplayPreferencesRequest
): Promise<void> {
	return api.patch<void>(tenantPath(tenantId, '/display-preferences'), body);
}
