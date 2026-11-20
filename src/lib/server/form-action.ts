/**
 * The one way a form action calls Go.
 *
 * An outage (transport failure, timeout, or the 503 goFetch throws when the session could not be
 * renewed) must not replace the form with the error page: the user's input would be lost. This
 * helper turns it into a failure the action returns with `fail()`, keeping the form; the copy is
 * the i18n key `auth.errors.upstreamUnavailable`. A redirect (the session is over) propagates.
 * Anything Go ANSWERS, whatever its status, comes back as `resp` for the action to map.
 */
import { fail, isHttpError, redirect, type RequestEvent } from '@sveltejs/kit';
import { contextMatches, routeForPath } from '../config/nav.ts';
import { canAny } from '../features/auth/capabilities.ts';
import { SCOPE_CONTEXT_FIELD } from '../api/scope-header.ts';
import { loadCapabilities } from './capabilities.ts';
import type { z } from 'zod';
import { goErrorStatus, readGoFailure } from './go.ts';
import { pathForRouteId } from './guards.ts';
import { isUpstreamFailure, upstreamStatus } from './proxy.ts';
import { pageShowsContext } from './scope-context.ts';
import { readOperatorScope } from './scope.ts';

export const UPSTREAM_UNAVAILABLE_KEY = 'auth.errors.upstreamUnavailable';
const SCOPE_CHANGED_KEY = 'auth.errors.scopeChanged';

export type GoActionCall =
	| { ok: true; resp: Response }
	| { ok: false; status: number; key: string };

/**
 * The status of a real upstream failure, or null for anything else. Only these are outages: a
 * timeout, a connection failure, an oversized pre-login body, and the 502 / 503 / 504 `HttpError`s
 * goFetch itself throws. A `TypeError` from the caller's own closure is a bug, not an outage.
 */
function asOutage(err: unknown): number | null {
	if (isHttpError(err)) return [502, 503, 504].includes(err.status) ? err.status : null;
	return isUpstreamFailure(err) ? upstreamStatus(err) : null;
}

export async function callGoForAction(call: () => Promise<Response>): Promise<GoActionCall> {
	try {
		return { ok: true, resp: await call() };
	} catch (err) {
		const outage = asOutage(err);
		if (outage === null) throw err; // a redirect, or a bug: both must reach the framework / the logger
		return { ok: false, status: outage, key: UPSTREAM_UNAVAILABLE_KEY };
	}
}

/**
 * The action guard: a form action is a separate entry point from the page loads (it runs first,
 * and no layout guard stands in front of it), so it checks the specific permission its Go route
 * requires BEFORE any call that writes. `null` = go ahead; otherwise a `fail()` to return as is.
 *
 *   1. the form must carry the context fingerprint of the page it was rendered in
 *      (`ScopeContextField`) and it must be the scope cookie's current one: the cookie is shared
 *      by every tab, so a form on a page that is behind it never writes (409, kept form);
 *   2. the matched route's nav entry decides whether the action exists in this context (the same
 *      rule as the page guard: an own-tenant action would otherwise run under the scope header and
 *      write to the SCOPED tenant); a route with no entry fails closed;
 *   3. the one permission rule (`canAny` on Go's effective permissions, minus what Go refuses in an
 *      operator's tenant context). Go stays the enforcer, this gives the right message without a
 *      round trip. Reading the capabilities is itself a Go call, so an outage there keeps the form.
 */
export async function authoriseAction<V extends object>(
	event: Pick<RequestEvent, 'cookies' | 'route'>,
	form: FormData,
	permission: string | readonly string[],
	values: V
) {
	const { cookies, route } = event;
	const scope = readOperatorScope(cookies);
	const claimed = form.get(SCOPE_CONTEXT_FIELD);
	if (typeof claimed !== 'string' || !pageShowsContext(claimed, scope)) {
		return failForm(409, { values, formErrorKey: SCOPE_CHANGED_KEY });
	}
	let caps;
	try {
		caps = await loadCapabilities(cookies);
	} catch (err) {
		const status = asOutage(err);
		if (status === null) throw err;
		return failForm(status, { values, formErrorKey: UPSTREAM_UNAVAILABLE_KEY });
	}
	if (!caps) redirect(303, '/signin');
	const permissions = typeof permission === 'string' ? [permission] : permission;
	const inTenantContext = scope.state === 'valid';
	const entry = route.id === null ? null : routeForPath(pathForRouteId(route.id));
	if (!entry) return failForm(403, { values, formErrorKey: goFailureKey(403) });
	if (!contextMatches(entry, inTenantContext)) {
		return failForm(403, {
			values,
			formErrorKey: inTenantContext ? 'auth.errors.tenantContext' : goFailureKey(403)
		});
	}
	return canAny(caps, permissions, inTenantContext)
		? null
		: failForm(403, { values, formErrorKey: goFailureKey(403) });
}

/** Copy for a non-2xx Go answer, by status class: i18n keys, never Go's text and never English. */
export function goFailureKey(status: number): string {
	if (status === 429) return 'auth.errors.rateLimited';
	if (status === 403) return 'auth.errors.forbidden';
	if (status === 404) return 'auth.errors.notFound';
	if (status === 409) return 'auth.errors.conflict';
	return 'auth.errors.unexpected';
}

/**
 * THE failure every form action returns, whatever went wrong: one shape, i18n keys for copy.
 *
 *   values        what the user typed, to repopulate the form (never a password)
 *   fieldKeys     field -> i18n key
 *   fieldMessages field -> text that comes from a schema or from Go's own per-field answer
 *                 (kept apart from the keys so a page can tell the two sources)
 *   formErrorKey  one banner line as an i18n key, or null
 *
 * `extra` adds the few action-specific facts a page needs (`which` for a page with two forms,
 * `retryAfterSeconds` for the lockout countdown). The type is `ActionFailure` so pages and server
 * agree; `readFailure` (utils/form-failure.ts) is the page-side reader.
 */
export function failForm<
	V extends object = Record<never, never>,
	X extends object = Record<never, never>
>(
	status: number,
	parts: {
		values?: V;
		fieldKeys?: Record<string, string>;
		fieldMessages?: Record<string, string>;
		formErrorKey?: string | null;
	},
	extra?: X
) {
	return fail(status, {
		values: (parts.values ?? {}) as V,
		fieldKeys: parts.fieldKeys ?? {},
		fieldMessages: parts.fieldMessages ?? {},
		formErrorKey: parts.formErrorKey ?? null,
		...(extra ?? ({} as X))
	});
}

/** The kept-form failure for an outage `callGoForAction` reported. */
export function failOutage<V extends object>(
	call: { status: number; key: string },
	values?: V,
	extra?: object
) {
	return failForm(call.status, { values, formErrorKey: call.key }, extra);
}

/** A Go answer no code of ours explains: its status class's banner key (rate limit, forbidden, ...). */
export function failFromStatus<V extends object>(resp: Response, values?: V, extra?: object) {
	return failForm(goErrorStatus(resp), { values, formErrorKey: goFailureKey(resp.status) }, extra);
}

/** A schema's per-field messages as `field -> first message` (the client forms read the same text). */
export function zodFieldMessages(error: z.ZodError): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of error.issues) {
		const field = issue.path.join('.');
		if (field && !(field in out)) out[field] = issue.message;
	}
	return out;
}

/**
 * A failed Go answer for a form that keeps its values: Go's per-field messages go to the fields;
 * otherwise ONE banner line, the i18n key of the status class (`goFailureKey`).
 */
export async function failFromGo<V extends object>(resp: Response, values: V) {
	const failure = await readGoFailure(resp);
	if (Object.keys(failure.fields).length > 0) {
		return failForm(failure.status, { values, fieldMessages: failure.fields });
	}
	// A bare 400 / 422 (no field to blame) is "check the values"; unlike a password call's
	// `invalid_body`, the forms using this have values the user can change.
	if (failure.status === 400 || failure.status === 422) {
		return failForm(failure.status, { values, formErrorKey: 'auth.errors.validation' });
	}
	return failFromStatus(resp, values);
}
