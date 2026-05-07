/**
 * Session store — holds the signed-in principal for the SPA lifetime
 * + persists access/refresh token pair to localStorage so reloads
 * stay signed in until the absolute refresh-TTL expires.
 *
 * Svelte 5 runes — module-scoped state, accessor functions. The
 * api/client.ts setTokenGetter() wires this up so every authenticated
 * fetch automatically picks up the current access token.
 */
import { setTokenGetter } from '$api/client';
import type { LoginResponse, SessionPrincipal } from '../types';

const STORAGE_KEY = 'leadkart-session';

let session = $state<SessionPrincipal | null>(loadFromStorage());

export function getSession(): SessionPrincipal | null {
	return session;
}

export function isAuthenticated(): boolean {
	return session !== null && session.accessTokenExpiresAt.getTime() > Date.now();
}

export function setSessionFromLogin(resp: LoginResponse) {
	const principal: SessionPrincipal = {
		personId: resp.person_id,
		tenantId: resp.tenant_id,
		membershipId: resp.membership_id,
		accessToken: resp.access_token,
		refreshToken: resp.refresh_token,
		accessTokenExpiresAt: new Date(resp.access_token_expires_at)
	};
	session = principal;
	persistToStorage(principal);
}

export function clearSession() {
	session = null;
	if (typeof window !== 'undefined') {
		window.localStorage.removeItem(STORAGE_KEY);
	}
}

function loadFromStorage(): SessionPrincipal | null {
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

function persistToStorage(principal: SessionPrincipal) {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(principal));
}

// Wire the api/client token-getter once at module load.
setTokenGetter(() => session?.accessToken ?? null);
