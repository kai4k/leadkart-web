/**
 * (app) group auth guard + capabilities bootstrap — runs server-side on
 * every request to the (app) route group.
 *
 * Checks the access cookie. hooks.server.ts refreshes an expired one before
 * this runs; if it is still absent: refresh rejected or no refresh cookie →
 * redirect to /signin; Go unreachable during that refresh → 503 (the session
 * may be fine, so the user is not signed out).
 * Fetches GET /api/v1/auth/me/capabilities server-to-server (loadCapabilities);
 * a 401 there triggers one more refresh + retry.
 *
 * The returned `capabilities` object is baked into the initial HTML
 * (SvelteKit SSR serialisation) so the first paint has no loading
 * skeleton — TanStack Query seeds from this via initialData.
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import { redirect } from '@sveltejs/kit';
import { assertRefreshReachable } from '#lib/server/auth-refresh.ts';
import { ACCESS_COOKIE, mustChangePassword } from '#lib/server/cookies.ts';
import { loadCapabilities } from '#lib/server/capabilities.ts';
import { clearOperatorScope, readOperatorScope } from '#lib/server/scope.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, url, locals }) => {
	// hooks.server.ts already tried to refresh an expired access cookie. Still
	// missing: Go down → 503; otherwise the session is really gone.
	const access = cookies.get(ACCESS_COOKIE());

	if (!access) {
		assertRefreshReachable(locals);
		const next = encodeURIComponent(url.pathname + url.search);
		throw redirect(303, `/signin?next=${next}`);
	}

	// lk_mcp is a UX gate only (page redirects). /api/* calls are not blocked
	// by it; the Go API must enforce forced password change itself.
	if (mustChangePassword(cookies) && url.pathname !== '/must-change-password') {
		throw redirect(
			303,
			`/must-change-password?next=${encodeURIComponent(url.pathname + url.search)}`
		);
	}

	// An expired/tampered scope cookie makes every scoped /api call answer 409. A
	// navigation is a safe place to drop it, so a failed client-side scope exit
	// cannot loop 409 → DELETE → /signin. /operator/scope clears it itself (and
	// redirects). The state is checked first so `url` is only read (and tracked
	// as a load dependency) when there is something to clear.
	if (
		readOperatorScope(cookies).state === 'invalid' &&
		!url.pathname.startsWith('/operator/scope')
	) {
		clearOperatorScope(cookies);
	}

	// Go answered without usable capabilities (401 after refresh, non-2xx, empty
	// body) — redirect to signin. Don't clear cookies: the user may still be valid
	// and the endpoint merely misbehaving. Go unreachable (503), too slow (504) or
	// answering 2xx with a body the web cannot read (502) is thrown by
	// loadCapabilities: the session is fine, and signing in again would only hit
	// the same body, so no signin bounce.
	const capabilities = await loadCapabilities(cookies);
	if (!capabilities) {
		const next = encodeURIComponent(url.pathname + url.search);
		throw redirect(303, `/signin?next=${next}`);
	}

	return { capabilities };
};
