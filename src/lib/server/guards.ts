import { error, redirect } from '@sveltejs/kit';
import { NAV_ROUTES, canSee, routeForPath } from '#lib/config/nav.ts';
// Pure module imported directly: the auth barrel re-exports .svelte components.
import type { Capabilities } from '#lib/features/auth/capabilities.ts';

/**
 * The URL path a route id stands for: route groups dropped, param segments kept
 * (`/(app)/settings/users/[id]` -> `/settings/users/[id]`). Guards resolve the
 * MATCHED ROUTE, never `url.pathname`: the browser's spelling of a path (percent
 * encoding, dot segments) must not pick which nav entry guards a page.
 */
export function pathForRouteId(routeId: string): string {
	return routeId
		.split('/')
		.filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')))
		.join('/');
}

/**
 * THE server route guard rule: the page's entry in `nav.ts` (longest prefix, so a
 * detail or nested page resolves to its parent) decides, with the request's
 * capabilities and tenant-context flag, exactly as it decides what the sidebar
 * shows. A page with no entry is a 404 (the route-walk unit test keeps that from
 * shipping): the guard never fails open.
 */
export function requireRouteAccess(
	caps: Capabilities | null | undefined,
	pathname: string,
	inTenantContext: boolean
): void {
	const route = routeForPath(pathname);
	if (!route) throw error(404, 'Not found');
	if (canSee(caps, route, inTenantContext)) return;
	// An own-tenant page requested inside a tenant context: its data would be the SCOPED tenant's
	// under own-tenant labels. Send the operator to the tenant's own tree (that route's guard decides
	// further); no Go call has been made.
	if (route.context === 'own' && inTenantContext) {
		redirect(303, NAV_ROUTES.scopeProfile.href);
	}
	// A scope page opened outside a tenant context: back to where a context is chosen.
	if (route.context === 'scope' && !inTenantContext && canSee(caps, NAV_ROUTES.tenants)) {
		redirect(303, NAV_ROUTES.tenants.href);
	}
	redirect(303, NAV_ROUTES.dashboard.href);
}

interface GuardEvent {
	route: { id: string | null };
	parent: () => Promise<{ capabilities?: Capabilities | null; inTenantContext?: boolean }>;
}

/**
 * The load every `(app)` section exports from its `+layout.server.ts`:
 *   export const load = guardAppRoute;
 * Capabilities and the tenant-context flag come from the (app) layout via `parent()`,
 * so no extra Go call; a layout load re-runs on navigation, so it guards client-side
 * transitions too. Runs before any child load reaches Go.
 */
export async function guardAppRoute({ route, parent }: GuardEvent): Promise<void> {
	if (route.id === null) throw error(404, 'Not found');
	const { capabilities, inTenantContext } = await parent();
	requireRouteAccess(capabilities, pathForRouteId(route.id), inTenantContext === true);
}
