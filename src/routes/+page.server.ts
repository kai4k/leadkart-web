/**
 * Root page server load — redirect to dashboard if authenticated,
 * signin if not. Runs server-side so it can check the httpOnly cookie.
 */
import { redirect } from '@sveltejs/kit';
import { ACCESS_COOKIE } from '$lib/server/cookies';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies }) => {
	const access = cookies.get(ACCESS_COOKIE());
	throw redirect(307, access ? '/dashboard' : '/signin');
};
