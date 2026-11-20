/**
 * ONE header for the tenant context a page is showing: the opaque fingerprint the server put in
 * the (app) layout's page data (`scopeFingerprint`: a keyed hash of the scope cookie's tenant id,
 * or `none`). The API client sends it on every call; the BFF proxy compares it with the signed
 * cookie's own fingerprint BEFORE calling Go and answers 409 `scope_changed` when they differ or it
 * is missing. It is never forwarded to Go and never carries the tenant itself.
 */
export const SCOPE_CONTEXT_HEADER = 'x-lk-scope-context';
/** The hidden form field that carries the same fingerprint to a server form action. */
export const SCOPE_CONTEXT_FIELD = 'scope_context';
/** 409 code (BFF) for a call whose page shows another context than the cookie names. */
export const SCOPE_CHANGED_CODE = 'scope_changed';
/** The one user-facing line for it (toast, and the form banner's English). */
export const SCOPE_CHANGED_MESSAGE = 'Your tenant context changed in another tab. Reloading.';

/** BroadcastChannel name the tabs of one browser use to tell each other the context changed. */
export const SCOPE_CHANGE_CHANNEL = 'lk-scope-context';

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

/**
 * Response header the BFF proxy sets when it renewed the session while answering a call (a stale
 * token after a role change, or the hook's silent refresh): the caller's permissions may have
 * changed, so the client has the page re-read its capabilities.
 */
export const SESSION_RENEWED_HEADER = 'x-lk-session-renewed';
