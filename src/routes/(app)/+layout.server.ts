/**
 * (app) group auth guard + capabilities bootstrap — runs server-side on
 * every request to the (app) route group.
 *
 * Checks the __Host-lk_access cookie. If absent → redirect to /signin.
 * Fetches GET /api/v1/auth/me/capabilities server-to-server (loadCapabilities).
 * An expired access cookie is refreshed in hooks.server.ts before this runs; a
 * 401 there triggers one more refresh + retry.
 *
 * The returned `capabilities` object is baked into the initial HTML
 * (SvelteKit SSR serialisation) so the first paint has no loading
 * skeleton — TanStack Query seeds from this via initialData.
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import { redirect } from '@sveltejs/kit';
import { ACCESS_COOKIE, mustChangePassword } from '#lib/server/cookies.ts';
import { loadCapabilities } from '#lib/server/capabilities.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	// hooks.server.ts already refreshed an expired access cookie before this
	// load ran, so a missing cookie here means the session is really gone.
	const access = cookies.get(ACCESS_COOKIE());

	if (!access) {
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

	// Go answered without usable capabilities (401 after refresh, non-2xx,
	// unexpected shape) — redirect to signin. Don't clear cookies: the user may
	// still be valid and the endpoint merely misbehaving. Go unreachable is a 503
	// thrown by loadCapabilities (the session is fine; no signin bounce).
	const capabilities = await loadCapabilities(cookies);
	if (!capabilities) {
		const next = encodeURIComponent(url.pathname + url.search);
		throw redirect(303, `/signin?next=${next}`);
	}

	return { capabilities };
};
