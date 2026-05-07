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

	setFromLogin(resp: LoginResponse) {
		const next: SessionPrincipal = {
			personId: resp.person_id,
			tenantId: resp.tenant_id,
			membershipId: resp.membership_id,
			accessToken: resp.access_token,
			refreshToken: resp.refresh_token,
			accessTokenExpiresAt: new Date(resp.access_token_expires_at)
		};
		this.principal = next;
		this.persist(next);
	}

	updateFromRefresh(resp: RefreshResponse) {
		if (this.principal === null) return;
		const next: SessionPrincipal = {
			...this.principal,
			accessToken: resp.access_token,
			refreshToken: resp.refresh_token,
			accessTokenExpiresAt: new Date(resp.access_token_expires_at)
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
