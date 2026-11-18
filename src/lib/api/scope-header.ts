/**
 * Marker the browser API client adds to every request made from inside the
 * operator scope tree (`/operator/scope/*`). Shared by the client and the
 * BFF proxy so the name lives in one place.
 */
export const SCOPE_REQUIRED_HEADER = 'x-lk-scope-required';

/** True for `/operator/scope` and anything below it, but not look-alikes such as `/operator/scopes`. */
export function isOperatorScopePath(pathname: string): boolean {
	return pathname === '/operator/scope' || pathname.startsWith('/operator/scope/');
}
