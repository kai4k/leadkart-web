/**
 * The tenant context the page in THIS tab is showing: the fingerprint the (app) layout's server
 * load computed (`scopeFingerprint`), set by the layout's universal load in the browser whenever
 * that data arrives. The one API client sends it with every call; the BFF proxy refuses a call
 * whose fingerprint is not the cookie's current one (`scope_changed`), so a tab never writes into
 * a tenant it is not showing. Browser only: the server never calls `set` (a module-level value
 * would be shared between requests).
 *
 * A closure, not a rune: nothing renders from it, the client only reads it when it sends.
 */
interface ScopeContext {
	get: () => string | undefined;
	set: (fingerprint: string | undefined) => void;
}

function createScopeContext(): ScopeContext {
	let current: string | undefined;
	return {
		get: () => current,
		set: (fingerprint) => {
			current = fingerprint;
		}
	};
}

export const pageScopeContext = createScopeContext();
