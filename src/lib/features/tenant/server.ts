/**
 * The tenant feature's SERVER-side gateway (SvelteKit loads and form actions; the browser
 * never calls it). The one place that knows Go's `/v1/tenants/{id}` paths:
 *
 *   loadTenant   GET   /v1/tenants/{id}            parsed with the generated TenantDto schema
 *   patchTenant  PATCH /v1/tenants/{id}/{section}  the FULL-REPLACE body for that section
 *
 * Used by the own-tenant settings layout and the operator scope layout (one fetch, one parse),
 * and by the five settings actions. Who may call it is the caller's business (route guard /
 * `authoriseAction`); Go stays the enforcer.
 *
 * Go's tenant PATCH routes REPLACE the section: a missing or null field answers 400
 * `invalid_body` with `errors` keyed by field (nested keys dotted: `address.pincode`). So
 * every field is always sent, blank as an empty string.
 */
import { error, type Cookies } from '@sveltejs/kit';
import { callGoForAction, type GoActionCall } from '#lib/server/form-action.ts';
import { goErrorStatus, goFetch, readGoJson } from '#lib/server/go.ts';
import { upstreamStatus } from '#lib/server/proxy.ts';
import { ownPrincipal } from '#lib/server/principal.ts';
import {
	tenantSchema,
	updateTenantAdminContactSchema,
	updateTenantDisplayPreferencesSchema,
	updateTenantProfileSchema,
	updateTenantSettingsSchema,
	updateTenantStatutorySchema,
	type UpdateTenantAdminContactInput,
	type UpdateTenantDisplayPreferencesInput,
	type UpdateTenantProfileInput,
	type UpdateTenantSettingsInput,
	type UpdateTenantStatutoryInput
} from './schemas.ts';
import type { Tenant } from './types.ts';

export type TenantSection =
	| 'profile'
	| 'statutory'
	| 'admin-contact'
	| 'settings'
	| 'display-preferences';

export interface TenantSectionBodies {
	profile: UpdateTenantProfileInput;
	statutory: UpdateTenantStatutoryInput;
	'admin-contact': UpdateTenantAdminContactInput;
	settings: UpdateTenantSettingsInput;
	'display-preferences': UpdateTenantDisplayPreferencesInput;
}

const blank = (v: string | undefined): string => v ?? '';

/**
 * Per section: the schema forms validate with, and the function that completes a body to
 * exactly the fields Go requires. Adding a field to a section is one edit here.
 */
export const TENANT_SECTIONS = {
	profile: {
		schema: updateTenantProfileSchema,
		full: (b: UpdateTenantProfileInput) => ({
			legal_name: blank(b.legal_name),
			display_name: blank(b.display_name)
		})
	},
	statutory: {
		schema: updateTenantStatutorySchema,
		full: (b: UpdateTenantStatutoryInput) => ({
			gst_number: blank(b.gst_number),
			pan_number: blank(b.pan_number),
			drug_licence_number: blank(b.drug_licence_number)
		})
	},
	'admin-contact': {
		schema: updateTenantAdminContactSchema,
		full: (b: UpdateTenantAdminContactInput) => ({
			phone: blank(b.phone),
			address: {
				street: blank(b.address?.street),
				city: blank(b.address?.city),
				district: blank(b.address?.district),
				state: blank(b.address?.state),
				state_code: blank(b.address?.state_code),
				pincode: blank(b.address?.pincode)
			}
		})
	},
	settings: {
		schema: updateTenantSettingsSchema,
		full: (b: UpdateTenantSettingsInput) => ({ password_policy: b.password_policy })
	},
	'display-preferences': {
		schema: updateTenantDisplayPreferencesSchema,
		full: (b: UpdateTenantDisplayPreferencesInput) => ({
			locale: blank(b.locale),
			time_zone: blank(b.time_zone),
			date_format: blank(b.date_format),
			currency: blank(b.currency)
		})
	}
} as const;

/** The signed-in caller's own tenant, from the access token. Signed out: to /signin. */
export function ownTenantId(cookies: Cookies): string {
	return ownPrincipal(cookies).tenantId;
}

export type LoadedTenant = { status: 'ok'; tenant: Tenant } | { status: 'not_found' };

/**
 * One tenant, parsed with the generated schema. A 404 is a result (the operator scope layout
 * drops its cookie on it); every other failure is an error page: Go's status, 504 when Go is too
 * slow (the body read is inside the try: a stalled stream is also a 504), 502 when the body is
 * not the contract. `scoped: false` for the caller's own tenant (never the operator scope).
 */
export async function loadTenant(
	cookies: Cookies,
	id: string,
	opts: { scoped?: boolean } = {}
): Promise<LoadedTenant> {
	let resp: Response;
	let body: unknown;
	try {
		resp = await goFetch(cookies, `/v1/tenants/${encodeURIComponent(id)}`, {
			scoped: opts.scoped ?? true
		});
		body = resp.ok ? await readGoJson<unknown>(resp) : null;
	} catch (err) {
		if (upstreamStatus(err) === 504) throw error(504, 'Tenant service timed out');
		throw err;
	}
	if (resp.status === 404) return { status: 'not_found' };
	if (!resp.ok) throw error(goErrorStatus(resp), 'Could not load tenant settings');
	const parsed = tenantSchema.safeParse(body);
	if (!parsed.success) throw error(502, 'Tenant service returned an unexpected response');
	return { status: 'ok', tenant: parsed.data };
}

/**
 * PATCH one section of the caller's own tenant with its full body. Returns the outage-safe
 * `GoActionCall` (see `callGoForAction`): Go's answer, whatever its status, is `resp`.
 */
export function patchTenant<S extends TenantSection>(
	cookies: Cookies,
	id: string,
	section: S,
	body: TenantSectionBodies[S]
): Promise<GoActionCall> {
	const full = (TENANT_SECTIONS[section].full as (b: TenantSectionBodies[S]) => unknown)(body);
	return callGoForAction(() =>
		goFetch(cookies, `/v1/tenants/${encodeURIComponent(id)}/${section}`, {
			method: 'PATCH',
			body: JSON.stringify(full),
			scoped: false
		})
	);
}
