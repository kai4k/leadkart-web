/**
 * The one way a form action calls Go.
 *
 * An outage (transport failure, timeout, or the 503 goFetch throws when the session could not be
 * renewed) must not replace the form with the error page: the user's input would be lost. This
 * helper turns it into a failure the action returns with `fail()`, keeping the form; the copy is
 * the i18n key `auth.errors.upstreamUnavailable`. A redirect (the session is over) propagates.
 * Anything Go ANSWERS, whatever its status, comes back as `resp` for the action to map.
 */
import { fail, isHttpError, isRedirect, redirect, type Cookies } from '@sveltejs/kit';
import { FORBIDDEN_COPY, TENANT_CONTEXT_COPY, type DescribeErrorOptions } from '../api/errors.ts';
import { canAny } from '../features/auth/capabilities.ts';
import { loadCapabilities } from './capabilities.ts';
import { readGoFailure } from './go.ts';
import { upstreamStatus } from './proxy.ts';
import { readOperatorScope } from './scope.ts';

export const UPSTREAM_UNAVAILABLE_KEY = 'auth.errors.upstreamUnavailable';

export type GoActionCall =
	| { ok: true; resp: Response }
	| { ok: false; status: number; key: string };

export async function callGoForAction(call: () => Promise<Response>): Promise<GoActionCall> {
	try {
		return { ok: true, resp: await call() };
	} catch (err) {
		if (isRedirect(err)) throw err;
		const status = isHttpError(err) ? err.status : upstreamStatus(err);
		return { ok: false, status, key: UPSTREAM_UNAVAILABLE_KEY };
	}
}

/**
 * The action guard: a form action is a separate entry point from the page loads (it runs first,
 * and no layout guard stands in front of it), so it checks the specific permission its Go route
 * requires BEFORE any call that writes. `null` = go ahead; otherwise a `fail()` to return as is.
 * The check is the one rule (`canAny` on Go's effective permissions, minus what Go refuses in an
 * operator's tenant context); Go stays the enforcer, this gives the right message without a round
 * trip. Reading the capabilities is itself a Go call, so an outage there keeps the form too.
 */
export async function authoriseAction<V>(
	cookies: Cookies,
	permission: string | readonly string[],
	values: V,
	/** The nav config's context for the route the action belongs to: 'own' (default) refuses in tenant context. */
	context: 'own' | 'scope' = 'own'
) {
	let caps;
	try {
		caps = await loadCapabilities(cookies);
	} catch (err) {
		if (isRedirect(err)) throw err;
		const status = isHttpError(err) ? err.status : upstreamStatus(err);
		return fail(status, { values, formErrorKey: UPSTREAM_UNAVAILABLE_KEY });
	}
	if (!caps) redirect(303, '/signin');
	const permissions = typeof permission === 'string' ? [permission] : permission;
	const inTenantContext = readOperatorScope(cookies).state === 'valid';
	// The same context rule as the page guard (`canSee`): an own-tenant action would otherwise run
	// under the scope header and write to the SCOPED tenant.
	if (context === 'own' && inTenantContext) {
		return fail(403, { values, bannerError: TENANT_CONTEXT_COPY });
	}
	if (context === 'scope' && !inTenantContext) {
		return fail(403, { values, bannerError: FORBIDDEN_COPY });
	}
	return canAny(caps, permissions, inTenantContext)
		? null
		: fail(403, { values, bannerError: FORBIDDEN_COPY });
}

/** Copy for a non-2xx Go answer no code explains: Go's rate limiter (429), else generic. */
export function goFailureKey(status: number): string {
	return status === 429 ? 'auth.errors.rateLimited' : 'auth.errors.unexpected';
}

/**
 * A failed Go answer for a form that keeps its values: Go's per-field messages go to the fields;
 * otherwise ONE banner line. Server actions speak i18n keys for the copy that has no Go code behind
 * it (rate limit), so the 429 line exists once; a coded failure keeps `readGoFailure`'s allowlisted line.
 */
export async function failFromGo<V>(resp: Response, values: V, opts: DescribeErrorOptions) {
	const failure = await readGoFailure(resp, opts);
	if (Object.keys(failure.fields).length > 0) {
		return fail(failure.status, { values, errors: failure.fields });
	}
	if (failure.status === 429) {
		return fail(failure.status, { values, formErrorKey: goFailureKey(failure.status) });
	}
	return fail(failure.status, { values, bannerError: failure.message });
}
