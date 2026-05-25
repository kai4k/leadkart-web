/**
 * (app) group auth guard + capabilities bootstrap — runs server-side on
 * every request to the (app) route group.
 *
 * Checks the __Host-lk_access cookie. If absent → redirect to /signin.
 * Fetches GET /api/v1/auth/me/capabilities server-to-server using the
 * JWT as Bearer. On 401 → attempts silent refresh (once) before redirect.
 *
 * The returned `capabilities` object is baked into the initial HTML
 * (SvelteKit SSR serialisation) so the first paint has no loading
 * skeleton — TanStack Query seeds from this via initialData.
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import { redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { config } from '$lib/server/config';
import { setAuthCookies, clearAuthCookies, ACCESS_COOKIE } from '$lib/server/cookies';
import type { LayoutServerLoad } from './$types';
import type { Capabilities } from '$lib/features/auth/api';

/**
 * Attempts a silent token refresh server-side using the lk_refresh cookie.
 * On success: rotates all three cookies and returns the new access token.
 * On failure: clears cookies and returns null.
 */
async function tryRefreshServerSide(cookies: Cookies): Promise<string | null> {
	const refresh = cookies.get('lk_refresh');
	if (!refresh) return null;

	let resp: Response;
	try {
		resp = await fetch(`${config.GO_API_URL}/api/v1/auth/refresh`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token: refresh })
		});
	} catch {
		return null;
	}

	if (!resp.ok) {
		clearAuthCookies(cookies);
		return null;
	}

	const tokens = (await resp.json()) as { access_token: string; refresh_token: string };
	setAuthCookies(cookies, tokens.access_token, tokens.refresh_token);
	return tokens.access_token;
}

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	let access = cookies.get(ACCESS_COOKIE());

	if (!access) {
		const next = encodeURIComponent(url.pathname + url.search);
		throw redirect(303, `/signin?next=${next}`);
	}

	// Fetch capabilities server-to-server — baked into the initial HTML.
	let resp = await fetch(`${config.GO_API_URL}/api/v1/auth/me/capabilities`, {
		headers: { authorization: `Bearer ${access}` }
	});

	// 401 → attempt one silent refresh
	if (resp.status === 401) {
		const newAccess = await tryRefreshServerSide(cookies);
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
