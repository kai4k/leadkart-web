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
 * Guarded by the operator section's route guard: a user holding a (stale or replayed) scope
 * cookie without the platform permission is sent to /dashboard before any scoped Go call.
 */

import { redirect } from '@sveltejs/kit';
import { clearOperatorScope, readOperatorScope } from '#lib/server/scope.ts';
import { loadTenant } from '$features/tenant/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, parent }) => {
	// Access (platform permission, tenant context) is the route guard in /operator/+layout.server.ts.
	// Loads run concurrently: wait for it (a redirect throws here) before any Go call.
	await parent();
	// The cookie is read here because this layout needs the tenant id it holds.
	const reading = readOperatorScope(cookies);
	if (reading.state !== 'valid') {
		if (reading.state === 'invalid') clearOperatorScope(cookies);
		throw redirect(303, '/operator/tenants');
	}

	// The same gateway call the own-tenant settings layout makes (goFetch adds Bearer and the
	// X-Tenant-Id from the scope cookie, the timeout and the single 401 refresh + retry).
	const loaded = await loadTenant(cookies, reading.scope.id);
	if (loaded.status === 'not_found') {
		clearOperatorScope(cookies);
		throw redirect(303, '/operator/tenants');
	}
	return { tenant: loaded.tenant };
};
