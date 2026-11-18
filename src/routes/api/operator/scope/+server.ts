/**
 * Operator-scope BFF endpoint.
 *
 *   POST   /api/operator/scope  { slug }   → resolve slug→UUID server-side,
 *                                            store {id, slug, display_name}
 *                                            in httpOnly cookie. Returns 204.
 *   DELETE /api/operator/scope             → clear cookie. Returns 204.
 *
 * No tenant identifier ever appears in the URL. Subsequent API calls
 * under /api/* automatically receive X-Tenant-Id from the cookie via
 * the catch-all proxy.
 *
 * CSRF: enforced (double-submit cookie pattern, same shape as the
 * /api/[...path] proxy).
 */

import type { RequestEvent } from '@sveltejs/kit';
import { config } from '#lib/server/config.ts';
import { setOperatorScope, clearOperatorScope } from '#lib/server/scope.ts';
import { timingSafeEqualString } from '#lib/server/csrf.ts';
import { ACCESS_COOKIE, CSRF_COOKIE } from '#lib/server/cookies.ts';

function checkCsrf(event: RequestEvent): Response | null {
	const headerCsrf = event.request.headers.get('x-csrf-token');
	const cookieCsrf = event.cookies.get(CSRF_COOKIE);
	if (!headerCsrf || !cookieCsrf || !timingSafeEqualString(headerCsrf, cookieCsrf)) {
		return Response.json({ error: 'csrf_mismatch' }, { status: 403 });
	}
	return null;
}

export async function POST(event: RequestEvent): Promise<Response> {
	const csrfFail = checkCsrf(event);
	if (csrfFail) return csrfFail;

	const access = event.cookies.get(ACCESS_COOKIE());
	if (!access) return Response.json({ error: 'unauthenticated' }, { status: 401 });

	let body: { slug?: string };
	try {
		body = await event.request.json();
	} catch {
		return Response.json({ error: 'invalid_body' }, { status: 400 });
	}
	const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
	if (!slug) return Response.json({ error: 'missing_slug' }, { status: 400 });

	// Canonical slug lookup per backend ADR 0052 — Stripe-style filter
	// query returning ListTenantsResponse. Slug uniqueness is a DB
	// invariant; the list is either empty (→ 404) or a single hit.
	const resp = await fetch(`${config.GO_API_URL}/api/v1/tenants?slug=${encodeURIComponent(slug)}`, {
		headers: { authorization: `Bearer ${access}` }
	});
	if (!resp.ok) {
		return Response.json({ error: 'tenant_lookup_failed' }, { status: 502 });
	}
	const payload = (await resp.json()) as {
		tenants?: Array<{ id: string; slug: string; display_name: string }>;
	};
	const tenant = payload.tenants?.[0];
	if (!tenant) {
		return Response.json({ error: 'tenant_not_found' }, { status: 404 });
	}

	setOperatorScope(event.cookies, {
		id: tenant.id,
		slug: tenant.slug,
		display_name: tenant.display_name
	});
	return new Response(null, { status: 204 });
}

// eslint-disable-next-line @typescript-eslint/require-await -- SvelteKit handler signature is async by contract
export async function DELETE(event: RequestEvent): Promise<Response> {
	const csrfFail = checkCsrf(event);
	if (csrfFail) return csrfFail;
	clearOperatorScope(event.cookies);
	return new Response(null, { status: 204 });
}
