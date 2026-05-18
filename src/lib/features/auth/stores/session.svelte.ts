/**
 * Session store — Svelte 5 class-based reactive store holding the
 * signed-in principal for the SPA lifetime + persisting access/refresh
 * tokens to localStorage so reloads stay authenticated until the
 * absolute refresh-TTL expires.
 *
 * Wires the api/client token-getter so every authenticated fetch
 * automatically picks up the current access token without each caller
 * threading it.
 */

import { setAuthHooks } from '$api/client';
import { decodeJwtPrincipal, JwtDecodeError } from '$api/jwt';
import type { LoginResponse, RefreshResponse, SessionPrincipal } from '../types';

const STORAGE_KEY = 'leadkart-session';

class SessionStore {
	principal = $state<SessionPrincipal | null>(this.loadFromStorage());

	get isAuthenticated(): boolean {
		const p = this.principal;
		return p !== null && p.accessTokenExpiresAt.getTime() > Date.now();
	}

	get accessToken(): string | null {
		return this.principal?.accessToken ?? null;
	}

	get refreshToken(): string | null {
		return this.principal?.refreshToken ?? null;
	}

	/**
	 * Extracts the `fam` (family ID) claim from the refresh token JWT.
	 * leadkart-go embeds this claim so the sessions list can mark the
	 * "you are here" row without a separate API round-trip.
	 *
	 * Degrades gracefully: returns null if there is no refresh token,
	 * if the token is opaque (non-JWT), or if the `fam` claim is absent.
	 */
	get activeFamilyId(): string | null {
		if (!this.refreshToken) return null;
		try {
			const payload = JSON.parse(atob(this.refreshToken.split('.')[1]));
			return typeof payload.fam === 'string' ? payload.fam : null;
		} catch {
			return null;
		}
	}

	/**
	 * Hydrates the session from a successful login response. The wire
	 * body carries only the tokens; the principal claims (personId,
	 * tenantId, membershipId, etc.) are decoded from the access_token
	 * JWT itself per leadkart-go's "principal lives in token, not
	 * body" convention. Email is supplied by the caller — the form
	 * has it from the user's submitted credentials, the server doesn't
	 * echo it.
	 *
	 * Throws JwtDecodeError if the access token is malformed (which
	 * indicates a server-side wiring bug; the caller should treat it
	 * as an unexpected-error and refuse to mount the session).
	 */
	setFromLogin(resp: LoginResponse, email: string) {
		const claims = decodeJwtPrincipal(resp.access_token);
		const next: SessionPrincipal = {
			personId: claims.personId,
			tenantId: claims.tenantId,
			tenantSlug: claims.tenantSlug,
			membershipId: claims.membershipId,
			email,
			accessToken: resp.access_token,
			refreshToken: resp.refresh_token,
			accessTokenExpiresAt: new Date(resp.access_token_expires_at),
			isPlatform: claims.isPlatform,
			isSuperUser: claims.isSuperUser,
			permissions: claims.permissions
		};
		this.principal = next;
		this.persist(next);
	}

	/**
	 * Refreshed access tokens may carry updated claims (rotated
	 * tenantSlug, fresh permissions) — re-decode rather than reuse
	 * the prior snapshot. Email persists across refresh (it's not in
	 * the JWT; the user's identity hasn't changed).
	 */
	updateFromRefresh(resp: RefreshResponse) {
		if (this.principal === null) return;
		let claims;
		try {
			claims = decodeJwtPrincipal(resp.access_token);
		} catch (err) {
			if (err instanceof JwtDecodeError) {
				this.clear();
				return;
			}
			throw err;
		}
		const next: SessionPrincipal = {
			...this.principal,
			personId: claims.personId,
			tenantId: claims.tenantId,
			tenantSlug: claims.tenantSlug,
			membershipId: claims.membershipId,
			accessToken: resp.access_token,
			refreshToken: resp.refresh_token,
			accessTokenExpiresAt: new Date(resp.access_token_expires_at),
			isPlatform: claims.isPlatform,
			isSuperUser: claims.isSuperUser,
			permissions: claims.permissions
		};
		this.principal = next;
		this.persist(next);
	}

	clear() {
		this.principal = null;
		if (typeof window === 'undefined') return;
		window.localStorage.removeItem(STORAGE_KEY);
	}

	private loadFromStorage(): SessionPrincipal | null {
		if (typeof window === 'undefined') return null;
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		try {
			const parsed = JSON.parse(raw) as Omit<SessionPrincipal, 'accessTokenExpiresAt'> & {
				accessTokenExpiresAt: string;
			};
			// Reject pre-v2 persisted sessions that lack an `email` (the
			// principal-claims-via-JWT change in ca9f9b5 introduced this
			// field). Forcing a re-login is safer than reviving a session
			// with undefined email + downstream UI bugs.
			if (typeof parsed.email !== 'string' || parsed.email.length === 0) {
				window.localStorage.removeItem(STORAGE_KEY);
				return null;
			}
			return {
				...parsed,
				accessTokenExpiresAt: new Date(parsed.accessTokenExpiresAt)
			};
		} catch {
			return null;
		}
	}

	private persist(p: SessionPrincipal) {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
	}
}

export const session = new SessionStore();

/* ─────────────────────────────────────────────────────────────────────
 * Wire the api/client auth hooks at module-load time.
 *   • getAccessToken   — injected on every authenticated request
 *   • refreshTokens    — invoked on 401 to silently refresh + retry
 *   • onUnauthorized   — terminal: refresh failed, clear session
 *
 * Refresh is implemented via a lazy import so this module doesn't
 * pull api/auth at parse time (avoids circular dep).
 * ───────────────────────────────────────────────────────────────────── */
setAuthHooks({
	getAccessToken: () => session.accessToken,
	refreshTokens: async () => {
		const refreshToken = session.refreshToken;
		if (!refreshToken) return false;
		try {
			const { refresh } = await import('../api');
			const resp = await refresh({ refresh_token: refreshToken });
			session.updateFromRefresh(resp);
			return true;
		} catch {
			return false;
		}
	},
	onUnauthorized: () => {
		session.clear();
	}
});
