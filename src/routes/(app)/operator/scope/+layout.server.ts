/**
 * Operator-scope layout server load.
 *
 * Reads the lk_op_tenant cookie set by POST /api/operator/scope and
 * fetches the canonical TenantDto from Go. The fresh DTO becomes
 * page.data.tenant, available to all /operator/scope/* pages.
 *
 * Why server-side: the tenant identifier is server-only state (httpOnly
 * cookie); resolving it happens on the BFF, never in the browser. The
 * tenant DTO returned here is the only place pages get the active
 * tenant data — they never receive a slug or UUID via URL params.
 *
 * Guarded like /operator/tenants: a non-platform user holding a (stale or
 * replayed) scope cookie is sent to /dashboard before any scoped Go call.
 */

import { redirect, error } from '@sveltejs/kit';
import { clearOperatorScope, readOperatorScope } from '#lib/server/scope.ts';
import { goErrorStatus, goFetch, readGoJson } from '#lib/server/go.ts';
import { OPERATOR_SCOPE_PERMISSION, requireCapability } from '#lib/server/guards.ts';
import { isUpstreamTimeout } from '#lib/server/proxy.ts';
import { tenantDtoSchema } from '#lib/features/operator/tenants/schemas.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, parent }) => {
	requireCapability((await parent()).capabilities, OPERATOR_SCOPE_PERMISSION);

	const reading = readOperatorScope(cookies);
	if (reading.state !== 'valid') {
		if (reading.state === 'invalid') clearOperatorScope(cookies);
		throw redirect(303, '/operator/tenants');
	}
	const { scope } = reading;

	let resp: Response;
	let tenantJson: unknown;
	try {
		// goFetch adds Bearer, X-Tenant-Id from the scope cookie, the timeout
		// and the single 401 refresh + retry.
		resp = await goFetch(cookies, `/v1/tenants/${encodeURIComponent(scope.id)}`);
		// Body read inside the try: undici's body timeout (a stalled stream) is also a 504.
		tenantJson = resp.ok ? await readGoJson<unknown>(resp) : null;
	} catch (err) {
		if (isUpstreamTimeout(err)) {
			throw error(504, 'Tenant service timed out');
		}
		throw err;
	}

	if (resp.status === 404) {
		clearOperatorScope(cookies);
		throw redirect(303, '/operator/tenants');
	}
	if (!resp.ok) throw error(goErrorStatus(resp), 'Failed to load tenant scope');

	const parsed = tenantDtoSchema.safeParse(tenantJson);
	if (!parsed.success) throw error(502, 'Tenant service returned an unexpected response');
	return { tenant: parsed.data };
};
