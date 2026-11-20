/**
 * Tenant settings shared layout load — fetches the caller's own tenant once for all five tabs
 * (profile / statutory / contact / preferences / security). Each page's form pre-populates from
 * `data.tenant`; each page's action saves one section. After a successful action, SvelteKit
 * auto-reruns this load to surface the new values without manual invalidation.
 *
 * Access is the route guard (`/settings` layout, entry `/settings/tenant` in the nav config); the
 * fetch itself is the tenant gateway's `loadTenant`, shared with the operator scope layout.
 */
import { error } from '@sveltejs/kit';
import { loadTenant, ownTenantId } from '$features/tenant/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, parent }) => {
	// Loads run concurrently: wait for the section guard (a redirect throws here) before any Go call.
	await parent();
	// scoped:false: this is the caller's OWN tenant, never an operator's selected one.
	const loaded = await loadTenant(cookies, ownTenantId(cookies), { scoped: false });
	if (loaded.status === 'not_found') throw error(404, 'Could not load tenant settings');
	return { tenant: loaded.tenant };
};
