/**
 * (app) group auth guard + capabilities bootstrap — runs server-side on
 * every request to the (app) route group.
 *
 * Checks the __Host-lk_access cookie. If absent → redirect to /signin.
 * Fetches GET /api/v1/auth/me/capabilities server-to-server using the
 * JWT as Bearer. An expired access cookie is refreshed in hooks.server.ts
 * before this runs; a 401 here triggers one more refresh + retry.
 *
 * The returned `capabilities` object is baked into the initial HTML
 * (SvelteKit SSR serialisation) so the first paint has no loading
 * skeleton — TanStack Query seeds from this via initialData.
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import { redirect } from '@sveltejs/kit';
import { config } from '#lib/server/config.ts';
import { ACCESS_COOKIE, mustChangePassword } from '#lib/server/cookies.ts';
import { refreshSession } from '#lib/server/auth-refresh.ts';
import type { LayoutServerLoad } from './$types';
import type { Capabilities } from '#lib/features/auth/api.ts';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	// hooks.server.ts already refreshed an expired access cookie before this
	// load ran, so a missing cookie here means the session is really gone.
	let access = cookies.get(ACCESS_COOKIE());

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

	// Fetch capabilities server-to-server — baked into the initial HTML.
	let resp = await fetch(`${config.GO_API_URL}/api/v1/auth/me/capabilities`, {
		headers: { authorization: `Bearer ${access}` }
	});

	// 401 → attempt one silent refresh
	if (resp.status === 401) {
		const newAccess = await refreshSession(cookies);
		if (!newAccess) {
			const next = encodeURIComponent(url.pathname + url.search);
			throw redirect(303, `/signin?next=${next}`);
		}
		access = newAccess;
		resp = await fetch(`${config.GO_API_URL}/api/v1/auth/me/capabilities`, {
			headers: { authorization: `Bearer ${access}` }
		});
	}

	if (!resp.ok) {
		// Capabilities endpoint down / unexpected error — redirect to signin.
		// Don't clear cookies (the user is probably still valid; the endpoint
		// may just be temporarily unavailable).
		const next = encodeURIComponent(url.pathname + url.search);
		throw redirect(303, `/signin?next=${next}`);
	}

	const capabilities = (await resp.json()) as Capabilities;
	return { capabilities };
};
