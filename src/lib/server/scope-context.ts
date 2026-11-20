/**
 * The server half of the tenant-context fingerprint check: does the page that made a call (a proxied
 * API call, a form post) show the context the scope cookie names right now? See `scopeFingerprint`.
 */
import { SCOPE_CONTEXT_HEADER } from '../api/scope-header.ts';
import { timingSafeEqualString } from './csrf.ts';
import { scopeFingerprint, type ScopeReading } from './scope.ts';

/**
 * True when the page that made the call is showing the context the cookie names right now.
 * The browser sends the fingerprint its page data carried (`SCOPE_CONTEXT_HEADER`); the cookie is
 * shared by every tab, so a tab that entered or left a context changes what the other tabs'
 * writes would hit. A missing or different fingerprint is "no": the call must not reach Go. The
 * value can only make the proxy stricter (it never selects a tenant; the tenant always comes from
 * the signed cookie), so trusting a client-supplied one is safe. It is not forwarded to Go.
 */
export function pageShowsCurrentContext(headers: Headers, reading: ScopeReading): boolean {
	const claimed = headers.get(SCOPE_CONTEXT_HEADER);
	return claimed !== null && pageShowsContext(claimed, reading);
}

/** The one comparison (proxy header, form field): a claimed fingerprint against the cookie's own. */
export function pageShowsContext(claimed: string, reading: ScopeReading): boolean {
	return timingSafeEqualString(claimed, scopeFingerprint(reading));
}
