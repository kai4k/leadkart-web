/**
 * Tenant settings shared layout load — fetches the current tenant
 * once for all five tabs (profile / statutory / contact / preferences
 * / security). Each page's form pre-populates from `data.tenant`;
 * each page's action PATCHes the relevant sub-resource. After a
 * successful action, SvelteKit auto-reruns this load to surface the
 * new values without manual invalidation.
 *
 * tenant_id is extracted from the JWT access cookie.
 */
import { redirect } from '@sveltejs/kit';
import { goFetch, readGoJson } from '$lib/server/go';
import { decodeJwtPrincipal } from '$api/jwt';
import { ACCESS_COOKIE } from '$lib/server/cookies';
import type { Tenant } from '$features/tenant/types';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const access = cookies.get(ACCESS_COOKIE());
	if (!access) throw redirect(303, '/signin');
	const { tenantId } = decodeJwtPrincipal(access);
	const resp = await goFetch(cookies, `/v1/tenants/${tenantId}`);
	if (!resp.ok) throw redirect(303, '/dashboard');
	const tenant = (await readGoJson<Tenant>(resp)) as Tenant;
	return { tenant };
};
