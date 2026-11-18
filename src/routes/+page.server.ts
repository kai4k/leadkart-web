/**
 * Root page server load — redirect to dashboard if authenticated,
 * signin if not. Runs server-side so it can check the httpOnly cookie.
 */
import { redirect } from '@sveltejs/kit';
import { assertRefreshReachable } from '#lib/server/auth-refresh.ts';
import { ACCESS_COOKIE } from '#lib/server/cookies.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies, locals }) => {
	const access = cookies.get(ACCESS_COOKIE());
	// Go unreachable during the hook's refresh is not "signed out".
	if (!access) assertRefreshReachable(locals);
	throw redirect(307, access ? '/dashboard' : '/signin');
};
