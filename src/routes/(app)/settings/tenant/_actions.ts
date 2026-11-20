/**
 * The one save path of the five tenant-settings actions: authorise → validate → PATCH → map the
 * answer. Each section's `+page.server.ts` only turns its form into a payload.
 *
 * The permission per section is what Go's route requires (`internal/identity/ports/http.go`):
 * the password policy needs `identity.tenants.update_settings`, every other section
 * `identity.tenants.update`. The check runs before any write to Go; Go stays the enforcer.
 * Go's PATCH routes are full-replace, so the gateway (`features/tenant/server.ts`) always sends
 * every field; field errors come back keyed by field (nested keys dotted) and land on the form.
 */
import { fail, type Cookies } from '@sveltejs/kit';
import { P } from '#lib/features/auth/permissions.ts';
import { authoriseAction, failFromGo } from '#lib/server/form-action.ts';
import {
	ownTenantId,
	patchTenant,
	TENANT_SECTIONS,
	type TenantSection,
	type TenantSectionBodies
} from '$features/tenant/server';

export const TENANT_SECTION_PERMISSION: Record<TenantSection, string> = {
	profile: P.identityTenantsUpdate,
	statutory: P.identityTenantsUpdate,
	'admin-contact': P.identityTenantsUpdate,
	'display-preferences': P.identityTenantsUpdate,
	settings: P.identityTenantsUpdateSettings
};

export async function saveTenantSection<S extends TenantSection>({
	cookies,
	section,
	payload
}: {
	cookies: Cookies;
	section: S;
	payload: TenantSectionBodies[S];
}) {
	const refused = await authoriseAction(cookies, TENANT_SECTION_PERMISSION[section], payload);
	if (refused) return refused;

	const parsed = TENANT_SECTIONS[section].schema.safeParse(payload);
	if (!parsed.success) {
		return fail(422, {
			values: payload,
			errors: parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>
		});
	}

	const call = await patchTenant(cookies, ownTenantId(cookies), section, payload);
	if (!call.ok) return fail(call.status, { values: payload, formErrorKey: call.key });
	if (call.resp.ok) return { success: true as const };
	return failFromGo(call.resp, payload, { fallback: 'Save failed' });
}
