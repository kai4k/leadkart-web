import { redirect } from '@sveltejs/kit';
// Pure module imported directly: the auth barrel re-exports .svelte components.
import { can, type Capabilities } from '#lib/features/auth/capabilities.ts';
import { P } from '#lib/features/auth/permissions.ts';

/**
 * The permission the /operator/tenants page requires. Entering (and staying in)
 * a tenant's operator scope requires the same one.
 */
export const OPERATOR_SCOPE_PERMISSION = P.platformTenantsView;

/**
 * Non-redirecting check for JSON endpoints (which answer 403, never a
 * redirect) and the one rule behind `requireCapability`. `null` is what
 * `loadCapabilities` returns when Go gave no usable capabilities.
 */
export function hasRequiredCapability(
	caps: Capabilities | null | undefined,
	permission: string
): boolean {
	return can(caps, permission);
}

/**
 * Server-side route guard. Runs in a `+page.server.ts` / `+layout.server.ts`
 * load, so an unauthorised user never receives the page or its data.
 * Behaviour matches the old client guard: back to the dashboard.
 */
export function requireCapability(caps: Capabilities | null | undefined, permission: string): void {
	if (!hasRequiredCapability(caps, permission)) redirect(303, '/dashboard');
}

/**
 * A `+page.server.ts` load that only guards the page:
 *   export const load = guardPage(P.identityUsersView);
 * Capabilities come from the (app) layout load via `parent()`.
 */
export function guardPage(
	permission: string
): (event: { parent: () => Promise<{ capabilities?: Capabilities }> }) => Promise<void> {
	return async ({ parent }) => {
		requireCapability((await parent()).capabilities, permission);
	};
}
