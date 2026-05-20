/**
 * Session store — Svelte 5 class-based reactive store.
 *
 * BFF model: the browser never holds access/refresh tokens. Auth state
 * is entirely owned by the SvelteKit Node server (httpOnly cookies).
 * The session store derives principal from $page.data.capabilities —
 * the SSR-bootstrapped capabilities snapshot from +layout.server.ts.
 *
 * No localStorage reads/writes. No JWT decoding. No auth hooks wired
 * to the API client (CSRF header injection happens directly in client.ts).
 *
 * SessionStore exposes:
 *   - principal: derived $state from $page.data.capabilities (null = signed-out)
 *   - isAuthenticated: boolean getter
 *   - logout(): calls /auth/logout BFF endpoint + navigates to /signin
 */

import { page } from '$app/state';
import type { Capabilities } from '../api';
import type { SessionPrincipal } from '../types';

class SessionStore {
	/**
	 * Derives the current principal from the SSR-bootstrapped capabilities
	 * in $page.data. On first render (SSR), this is populated from the
	 * +layout.server.ts load. On navigation, SvelteKit re-runs the load
	 * and updates the store reactively.
	 *
	 * Returns null when capabilities are absent (auth route, sign-out,
	 * or layout server redirect to /signin before load completes).
	 */
	get principal(): SessionPrincipal | null {
		const caps = (page.data as { capabilities?: Capabilities }).capabilities;
		if (!caps) return null;
		return {
			personId: caps.person_id,
			tenantId: caps.tenant_id,
			tenantSlug: caps.tenant_slug,
			membershipId: caps.membership_id,
			email: caps.email,
			isPlatform: caps.is_platform,
			isSuperUser: caps.is_super_user,
			permissions: caps.permissions
		};
	}

	get isAuthenticated(): boolean {
		return this.principal !== null;
	}

	/**
	 * Sign the user out. Calls the BFF /auth/logout endpoint which:
	 *   1. Best-effort revokes the refresh token server-side (Go)
	 *   2. Clears all three auth cookies (__Host-lk_access, lk_refresh, lk_csrf)
	 *
	 * Then navigates to /signin via full page reload (clears in-memory
	 * state + ensures +layout.server.ts runs clean with no cookies).
	 */
	async logout(): Promise<void> {
		// Read the CSRF cookie (non-httpOnly) to echo as X-CSRF-Token header
		const csrf =
			typeof document !== 'undefined'
				? (document.cookie.match(/(?:^|; )lk_csrf=([^;]+)/)?.[1] ?? '')
				: '';

		await fetch('/auth/logout', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				...(csrf ? { 'x-csrf-token': csrf } : {})
			},
			credentials: 'same-origin'
		});

		// Full page reload — ensures SvelteKit re-runs +layout.server.ts
		// which will find no access cookie and redirect to /signin. Using
		// window.location.href instead of goto() so the redirect is clean
		// and the in-memory query cache is fully purged.
		window.location.href = '/signin';
	}
}

export const session = new SessionStore();
