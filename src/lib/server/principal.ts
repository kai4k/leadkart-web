/**
 * The signed-in caller's claims, read from the access cookie. The one place a server load / action
 * turns the cookie into ids (own tenant, own membership); signed out goes to /signin.
 */
import { error, redirect, type Cookies } from '@sveltejs/kit';
import { SESSION_RENEWAL_FAILED_MESSAGE } from '../api/errors.ts';
import { decodeJwtPrincipal, type JwtPrincipalClaims } from '../api/jwt.ts';
import { ACCESS_COOKIE, sessionRenewalPending } from './cookies.ts';

export function ownPrincipal(cookies: Cookies): JwtPrincipalClaims {
	const access = cookies.get(ACCESS_COOKIE());
	if (!access) {
		// The renewal could not reach Go: the session is not known to be over.
		if (sessionRenewalPending(cookies)) throw error(503, SESSION_RENEWAL_FAILED_MESSAGE);
		throw redirect(303, '/signin');
	}
	return decodeJwtPrincipal(access);
}
