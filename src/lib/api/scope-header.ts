/**
 * Marker the browser API client adds to every request made from inside the
 * operator scope tree (`/operator/scope/*`). Shared by the client and the
 * BFF proxy so the name lives in one place.
 */
export const SCOPE_REQUIRED_HEADER = 'x-lk-scope-required';

/**
 * SvelteKit dependency key of the (app) layout load: entering or leaving a tenant context
 * invalidates it, so `inTenantContext`, the nav and the guards follow the scope cookie.
 */
export const SCOPE_DEPENDENCY = 'app:scope';

/** True for `/operator/scope` and anything below it, but not look-alikes such as `/operator/scopes`. */
export function isOperatorScopePath(pathname: string): boolean {
	return pathname === '/operator/scope' || pathname.startsWith('/operator/scope/');
}

/** The one user-facing line for a dead operator scope (BFF 409, Go invalid/unknown scope, session guard toast). */
export const SCOPE_EXPIRED_MESSAGE = 'Operator scope expired — select the tenant again';
