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
 */

import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { clearOperatorScope, getOperatorScope } from '$lib/server/scope';
import { ACCESS_COOKIE } from '$lib/server/cookies';
import type { LayoutServerLoad } from './$types';
import type { TenantDto } from '$features/operator/tenants/types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const scope = getOperatorScope(cookies);
	if (!scope) throw redirect(303, '/operator/tenants');

	const access = cookies.get(ACCESS_COOKIE());
	if (!access) throw redirect(303, '/signin');

	const resp = await fetch(`${env.GO_API_URL}/api/v1/tenants/${scope.id}`, {
		headers: {
			authorization: `Bearer ${access}`,
			'x-tenant-id': scope.id
		}
	});

	if (resp.status === 404) {
		clearOperatorScope(cookies);
		throw redirect(303, '/operator/tenants');
	}
	if (!resp.ok) throw error(resp.status, 'Failed to load tenant scope');

	const tenant = (await resp.json()) as TenantDto;
	return { tenant };
};
