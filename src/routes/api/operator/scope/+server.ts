/**
 * Operator-scope BFF endpoint.
 *
 *   POST   /api/operator/scope  { slug }   → resolve slug→UUID server-side,
 *                                            store {id, slug, display_name}
 *                                            in httpOnly cookie. Returns 200
 *                                            `{ scope_context }`: the fingerprint of the context
 *                                            the cookie now names.
 *   DELETE /api/operator/scope             → clear cookie. Returns 200 `{ scope_context }` (the
 *                                            fingerprint of "no context"). Needs the page's context
 *                                            fingerprint like every proxied call (409 scope_changed).
 *
 * The returned fingerprint is not a secret (the page data carries it): the tab records it as the
 * context its own change is expected to commit, so a commit of any OTHER value is recognised as
 * somebody else's change.
 *
 * No tenant identifier ever appears in the URL. Subsequent API calls
 * under /api/* automatically receive X-Tenant-Id from the cookie via
 * the catch-all proxy.
 *
 * CSRF: enforced (double-submit cookie pattern, same shape as the
 * /api/[...path] proxy).
 *
 * Authorisation: entering a tenant's scope needs the same platform permission
 * as the /operator/tenants page. A JSON endpoint answers 403, never a redirect.
 * An ended session is a 401 tagged `session_expired` so the client guard sends
 * the user to /signin.
 */

import { isHttpError, type Cookies, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { SESSION_EXPIRED_CODE, SESSION_RENEWAL_FAILED_MESSAGE } from '#lib/api/errors.ts';
import { SCOPE_CHANGED_CODE, SCOPE_CHANGED_MESSAGE } from '#lib/api/scope-header.ts';
import {
	setOperatorScope,
	clearOperatorScope,
	readOperatorScope,
	scopeFingerprint
} from '#lib/server/scope.ts';
import { pageShowsCurrentContext } from '#lib/server/scope-context.ts';
import { assertCsrf } from '#lib/server/csrf.ts';
import { ACCESS_COOKIE, sessionEnded, sessionRenewalPending } from '#lib/server/cookies.ts';
import { loadCapabilities } from '#lib/server/capabilities.ts';
import { goFetch } from '#lib/server/go.ts';
import { meetsAccess, NAV_ROUTES } from '#lib/config/nav.ts';
import { jsonError, upstreamJsonError } from '#lib/server/http.ts';

/** The 200 answer to a change: the fingerprint of the context the cookie names now. */
const changed = (cookies: Cookies): Response =>
	Response.json({ scope_context: scopeFingerprint(readOperatorScope(cookies), cookies) });

const sessionExpired = (): Response =>
	jsonError(401, SESSION_EXPIRED_CODE, 'Your session has expired');

const tenantLookupSchema = z.object({
	tenants: z
		.array(z.object({ id: z.string(), slug: z.string(), display_name: z.string() }))
		.optional()
});

export async function POST(event: RequestEvent): Promise<Response> {
	// An ended session is reported as one, before CSRF (the rejected refresh deleted lk_csrf too).
	if (sessionEnded(event.cookies)) return sessionExpired();
	const csrfFail = assertCsrf(event);
	if (csrfFail) return csrfFail;

	if (!event.cookies.get(ACCESS_COOKIE())) return sessionExpired();

	let capabilities;
	try {
		capabilities = await loadCapabilities(event.cookies);
	} catch (err) {
		// Go unreachable (503) or too slow (504): the session is fine, say so as JSON.
		if (!isHttpError(err)) throw err;
		return upstreamJsonError(err);
	}
	if (!capabilities) return sessionExpired();
	if (!meetsAccess(capabilities, NAV_ROUTES.scope)) {
		return jsonError(403, 'forbidden', 'Tenant scope requires platform access');
	}

	let body: { slug?: string };
	try {
		body = await event.request.json();
	} catch {
		return jsonError(400, 'invalid_body', 'Request body must be JSON');
	}
	const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
	if (!slug) return jsonError(400, 'missing_slug', 'A tenant slug is required');

	// Canonical slug lookup per backend ADR 0052 — Stripe-style filter
	// query returning ListTenantsResponse. Slug uniqueness is a DB
	// invariant; the list is either empty (→ 404) or a single hit.
	let tenant;
	try {
		// scoped:false: the lookup describes the operator's own view, never a
		// previously selected tenant (or an invalid scope). requireAuth:false:
		// the missing-cookie case is answered above, and a rejected refresh
		// must come back as a plain 401 rather than a redirect.
		const resp = await goFetch(event.cookies, `/v1/tenants?slug=${encodeURIComponent(slug)}`, {
			scoped: false,
			requireAuth: false
		});
		if (resp.status === 401) return sessionExpired();
		// Go answers the lookup 403 when the header's authority is missing (platform.tenants.view):
		// that is "no access", not a failed lookup, and no scope cookie is set.
		if (resp.status === 403) {
			return jsonError(403, 'forbidden', 'Tenant scope requires platform access');
		}
		if (!resp.ok) return jsonError(502, 'tenant_lookup_failed', 'Tenant lookup failed');
		const payload = tenantLookupSchema.safeParse(await resp.json());
		if (!payload.success) {
			// Paths only — never log values from the tenant response.
			console.error(
				'[operator-scope] tenant lookup shape mismatch',
				payload.error.issues.map((i) => i.path.join('.'))
			);
			return jsonError(502, 'tenant_lookup_failed', 'Tenant lookup failed');
		}
		tenant = payload.data.tenants?.[0];
	} catch (err) {
		return upstreamJsonError(err);
	}
	// The filter is exact-match on the backend; verify rather than trust it, so
	// a loose/prefix match can never scope the operator onto a different tenant.
	if (!tenant || tenant.slug !== slug) {
		return jsonError(404, 'tenant_not_found', 'Tenant not found');
	}

	try {
		setOperatorScope(event.cookies, {
			id: tenant.id,
			slug: tenant.slug,
			display_name: tenant.display_name
		});
	} catch (err) {
		// Go returned a tenant that fails the scope schema (id not a UUID, or an
		// over-long slug / display_name) — refuse to sign it. Paths only.
		console.error(
			'[operator-scope] tenant lookup shape mismatch',
			err instanceof z.ZodError ? err.issues.map((i) => i.path.join('.')) : []
		);
		return jsonError(502, 'tenant_lookup_failed', 'Tenant lookup failed');
	}
	return changed(event.cookies);
}

// eslint-disable-next-line @typescript-eslint/require-await -- SvelteKit handler signature is async by contract
export async function DELETE(event: RequestEvent): Promise<Response> {
	const { cookies, request } = event;
	// An ended session is reported as one, before CSRF (the rejected refresh deleted lk_csrf too).
	if (sessionEnded(cookies)) return sessionExpired();
	const csrfFail = assertCsrf(event);
	if (csrfFail) return csrfFail;
	// Session first (as in the proxy): without a caller there is no context to compare.
	if (!cookies.get(ACCESS_COOKIE())) {
		return sessionRenewalPending(cookies)
			? jsonError(503, 'refresh_unavailable', SESSION_RENEWAL_FAILED_MESSAGE)
			: sessionExpired();
	}
	// The exit must come from a tab that shows the context the cookie names now, like every other
	// call: a tab that is behind cannot end a context another tab just entered. A dead cookie is
	// the exception: clearing it is the way out, and there is no context to protect.
	const reading = readOperatorScope(cookies);
	if (reading.state !== 'invalid' && !pageShowsCurrentContext(request.headers, reading, cookies)) {
		return jsonError(409, SCOPE_CHANGED_CODE, SCOPE_CHANGED_MESSAGE);
	}
	clearOperatorScope(cookies);
	return changed(cookies);
}
