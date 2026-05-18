/**
 * Tenant-context layout load — resolves the tenant by id-or-slug,
 * validates the platform.tenants.view permission, and attaches the
 * tenant to page data so the layout + child routes share one fetch.
 *
 * Phase A note: the backend today only resolves UUIDs via
 * GET /v1/platform/tenants/{id}. Slug resolution (ADR 0038 §A.3)
 * is a backend prereq. Until it ships, slug routes work when the
 * caller navigates with a UUID (e.g. /operator/tenants/platform
 * uses the literal slug "platform" — will 404 backend-side until
 * the /by-slug/{slug} endpoint lands). The frontend route structure
 * is laid down now per spec.
 */
import { redirect, error } from '@sveltejs/kit';
import { session } from '$features/auth/stores/session.svelte';
import { hasPermission } from '$features/auth/tier';
import { operatorTenants } from '$features/operator/tenants/stores/operator-tenants.svelte';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ params }) => {
	if (!hasPermission(session.principal, 'platform.tenants.view')) {
		throw redirect(303, '/dashboard');
	}
	const slug = params.slug;
	if (!slug) throw error(404, 'Tenant not found');

	// Load into the shared operatorTenants.current so child routes and
	// the contextual sidebar read a consistent value.
	await operatorTenants.loadDetail(slug);

	return { slug };
};
