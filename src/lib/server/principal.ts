/**
 * The signed-in caller's claims, read from the access cookie. The one place a server load / action
 * turns the cookie into ids (own tenant, own membership); signed out goes to /signin.
 */
import { redirect, type Cookies } from '@sveltejs/kit';
import { decodeJwtPrincipal, type JwtPrincipalClaims } from '../api/jwt.ts';
import { ACCESS_COOKIE } from './cookies.ts';

export function ownPrincipal(cookies: Cookies): JwtPrincipalClaims {
	const access = cookies.get(ACCESS_COOKIE());
	if (!access) throw redirect(303, '/signin');
	return decodeJwtPrincipal(access);
}
