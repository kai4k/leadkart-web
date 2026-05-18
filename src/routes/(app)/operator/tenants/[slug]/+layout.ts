/**
 * Tenant-context layout load — validates the platform.tenants.view
 * permission and passes the slug to the layout + child routes.
 *
 * Tenant data is fetched reactively via tenantBySlugQuery in the
 * layout component itself (TanStack Query handles caching, loading
 * state, and error display). No store dependency.
 *
 * Slug is the canonical path parameter per ADR 0038 §A.3.
 * GET /v1/tenants/by-slug/{slug} is the lookup endpoint.
 */
import { redirect, error } from '@sveltejs/kit';
import { session } from '$features/auth/stores/session.svelte';
import { hasPermission } from '$features/auth/tier';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ params }) => {
	if (!hasPermission(session.principal, 'platform.tenants.view')) {
		throw redirect(303, '/dashboard');
	}
	const slug = params.slug;
	if (!slug) throw error(404, 'Tenant not found');

	return { slug };
};
