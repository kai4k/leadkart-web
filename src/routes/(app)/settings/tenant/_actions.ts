/**
 * Shared helpers for the five tenant-settings PATCH actions.
 * All actions follow the same shape — read form data, validate with a
 * Zod schema, PATCH a sub-resource of /v1/tenants/{tenant_id}/*, and
 * return fail() / { success } accordingly.
 *
 * Authorisation is enforced by the Go API only: there is no BFF-side permission check (no permission string exists yet; tracked in docs/superpowers/plans/2026-11-18-phase-1c-worklist.md item 4).
 */
import { fail, redirect, type Cookies } from '@sveltejs/kit';
import type { z } from 'zod';
import { goErrorStatus, goFetch, readGoError, flattenGoErrors } from '#lib/server/go.ts';
import { decodeJwtPrincipal } from '$api/jwt';
import { ACCESS_COOKIE } from '#lib/server/cookies.ts';

function getTenantId(cookies: Cookies): string {
	const access = cookies.get(ACCESS_COOKIE());
	if (!access) throw redirect(303, '/signin');
	return decodeJwtPrincipal(access).tenantId;
}

export interface PatchTenantOptions<P> {
	cookies: Cookies;
	pathSuffix: `/${string}`;
	schema: z.ZodSchema<P>;
	payload: P;
}

export async function patchTenant<P>({
	cookies,
	pathSuffix,
	schema,
	payload
}: PatchTenantOptions<P>) {
	const parsed = schema.safeParse(payload);
	if (!parsed.success) {
		return fail(422, {
			values: payload,
			errors: parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>
		});
	}
	const tenantId = getTenantId(cookies);
	const resp = await goFetch(cookies, `/v1/tenants/${tenantId}${pathSuffix}`, {
		method: 'PATCH',
		body: JSON.stringify(parsed.data)
	});
	if (resp.ok || resp.status === 204) {
		return { success: true as const };
	}
	const body = await readGoError(resp);
	if (resp.status === 422) {
		return fail(422, { values: payload, errors: flattenGoErrors(body) });
	}
	return fail(goErrorStatus(resp), { values: payload, bannerError: body.detail ?? 'Save failed' });
}
