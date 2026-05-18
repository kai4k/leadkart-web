/**
 * Tenant-context layout load — validates the platform.tenants.view
 * permission and passes the slug to the layout + child routes.
 *
 * Tenant data is fetched reactively via tenantDetailQuery in the
 * layout component itself (TanStack Query handles caching, loading
 * state, and error display). No store dependency.
 *
 * Phase A note: the backend today resolves UUIDs via
 * GET /v1/tenants/{id}. Slug resolution (ADR 0038 §A.3) is a backend
 * prereq. Until it ships, slug routes work when the caller navigates
 * with a UUID (e.g. /operator/tenants/019e3a27-... uses the UUID as
 * the "slug" param — the [id=uuid] route handles UUIDs via a
 * separate file; this layout handles human-readable slugs).
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
