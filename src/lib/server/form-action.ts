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
import { ACCESS_COOKIE, sessionRenewalPending } from './cookies.ts';
import { goCodeKey } from '../api/code-copy.ts';
import { SCOPE_CONTEXT_FIELD } from '../api/scope-header.ts';
import { loadCapabilities } from './capabilities.ts';
import type { z } from 'zod';
import { goErrorStatus, readGoFailure } from './go.ts';
import { pathForRouteId } from './guards.ts';
import { isUpstreamFailure, upstreamStatus } from './proxy.ts';
import { pageShowsContext } from './scope-context.ts';
import { readOperatorScope, type ScopeReading } from './scope.ts';

export const UPSTREAM_UNAVAILABLE_KEY = 'auth.errors.upstreamUnavailable';
const SCOPE_CHANGED_KEY = 'auth.errors.scopeChanged';
/** The proxy answers a dead scope cookie `scope_invalid`; so does an action (same state, same copy). */
const SCOPE_INVALID_KEY = goCodeKey('scope_invalid') ?? 'auth.errors.unexpected';

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

/** The kept-form failure a refused action returns (a `fail()` carrying the form's values and one banner key). */
type Refusal<V extends object> = ReturnType<typeof failForm<V>>;

/**
 * The values a refusal gives back to the form: the object itself, or a function that builds it. A
 * function lets the action call the guard FIRST (its first statements are `formData()` and the
 * guard, nothing between: the walker's positional contract) and still echo what was typed: reading
 * the fields is a call, and it runs only when the guard refuses.
 */
export type RefusalValues<V extends object> = V | (() => V);
const valuesOf = <V extends object>(values: RefusalValues<V>): V =>
	typeof values === 'function' ? (values as () => V)() : values;

type Bound<V extends object> = { refused: Refusal<V> } | { refused: null; scope: ScopeReading };

/**
 * The prefix EVERY action runs first, shared by `authoriseAction` and `authoriseSelfService`: the
 * session, then "is this form from a page that shows the person and context the cookies name now".
 *
 *   - renewal pending (the hook could not reach Go) -> 503 kept form; no access cookie -> sign-in:
 *     neither is a "context changed" problem, so the session is decided before any fingerprint talk;
 *   - a dead scope cookie -> 409 `scope_invalid`, the key the proxy uses for the same state;
 *   - the form must carry the context fingerprint of the page it was rendered in
 *     (`ScopeContextField`) and it must be the current one. The fingerprint is bound to the person
 *     and to the scope cookie, which every tab shares: a form on a page that is behind it (another
 *     tab entered or left a context, or signed out and in as somebody else) never writes (409, kept form).
 */
function bindToPage<V extends object>(
	cookies: RequestEvent['cookies'],
	form: FormData,
	refusalValues: RefusalValues<V>
): Bound<V> {
	const values = () => valuesOf(refusalValues);
	if (sessionRenewalPending(cookies)) {
		return { refused: failForm(503, { values: values(), formErrorKey: UPSTREAM_UNAVAILABLE_KEY }) };
	}
	if (!cookies.get(ACCESS_COOKIE())) redirect(303, '/signin');
	const scope = readOperatorScope(cookies);
	if (scope.state === 'invalid') {
		return { refused: failForm(409, { values: values(), formErrorKey: SCOPE_INVALID_KEY }) };
	}
	const claimed = form.get(SCOPE_CONTEXT_FIELD);
	if (typeof claimed !== 'string' || !pageShowsContext(claimed, scope, cookies)) {
		return { refused: failForm(409, { values: values(), formErrorKey: SCOPE_CHANGED_KEY }) };
	}
	return { refused: null, scope };
}

/**
 * The guard of a self-service action (the caller's own password, email or profile): no permission
 * is needed, but the form must still come from the page of the person the browser holds now (see
 * `bindToPage`), or tab 1's form for X would write as the Y who signed in in tab 2. `null` = go
 * ahead; otherwise a `fail()` to return as is. A promise, like `authoriseAction`, so both are used
 * the same way (`await`, then `if (refused) return refused`) and the walker holds both to one shape.
 */
export function authoriseSelfService<V extends object>(
	event: Pick<RequestEvent, 'cookies'>,
	form: FormData,
	values: RefusalValues<V>
): Promise<Refusal<V> | null> {
	// A promise like `authoriseAction`'s, so both guards are used the same way (`await`, then `if (refused)`).
	return Promise.resolve().then(() => bindToPage(event.cookies, form, values).refused);
}

/**
 * The action guard: a form action is a separate entry point from the page loads (it runs first,
 * and no layout guard stands in front of it), so it checks the specific permission its Go route
 * requires BEFORE any call that writes. `null` = go ahead; otherwise a `fail()` to return as is.
 *
 *   0-1. the session, then the page binding (`bindToPage`: renewal pending -> 503 kept form; no
 *      access cookie -> sign-in; a dead scope cookie or a fingerprint that is not the current one
 *      -> 409, kept form);
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
	refusalValues: RefusalValues<V>
) {
	const values = () => valuesOf(refusalValues);
	const { cookies, route } = event;
	const bound = bindToPage(cookies, form, refusalValues);
	if (bound.refused) return bound.refused;
	const { scope } = bound;
	let caps;
	try {
		caps = await loadCapabilities(cookies);
	} catch (err) {
		const status = asOutage(err);
		if (status === null) throw err;
		return failForm(status, { values: values(), formErrorKey: UPSTREAM_UNAVAILABLE_KEY });
	}
	if (!caps) redirect(303, '/signin');
	const permissions = typeof permission === 'string' ? [permission] : permission;
	const inTenantContext = scope.state === 'valid';
	const entry = route.id === null ? null : routeForPath(pathForRouteId(route.id));
	if (!entry) return failForm(403, { values: values(), formErrorKey: goFailureKey(403) });
	if (!contextMatches(entry, inTenantContext)) {
		return failForm(403, {
			values: values(),
			formErrorKey: inTenantContext ? 'auth.errors.tenantContext' : goFailureKey(403)
		});
	}
	return canAny(caps, permissions, inTenantContext)
		? null
		: failForm(403, { values: values(), formErrorKey: goFailureKey(403) });
}

/**
 * Copy for a non-2xx Go answer: i18n keys, never Go's text and never English. A code in THE code
 * table (`api/code-copy.ts`, the one the client describer reads) names its own line; anything else
 * (and a rate limit, whatever the code) gets the key of its status class.
 */
export function goFailureKey(status: number, code?: string): string {
	if (status === 429) return 'auth.errors.rateLimited';
	const own = goCodeKey(code);
	if (own !== undefined) return own;
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
	// A code the table knows says what to fix (a role name taken, a level above your own, ...).
	if (goCodeKey(failure.code) !== undefined) {
		return failForm(failure.status, {
			values,
			formErrorKey: goFailureKey(failure.status, failure.code)
		});
	}
	// A bare 400 / 422 (no field to blame) is "check the values"; unlike a password call's
	// `invalid_body`, the forms using this have values the user can change.
	if (failure.status === 400 || failure.status === 422) {
		return failForm(failure.status, { values, formErrorKey: 'auth.errors.validation' });
	}
	return failFromStatus(resp, values);
}
