/**
 * Root layout server load: hands the page the double-submit CSRF value (`lk_csrf`, a cookie
 * scripts can already read; nothing new is exposed) so the error page can render its sign-out
 * form WITHOUT JavaScript. Present exactly while a session exists. No Go call, no dependency.
 */
import { CSRF_COOKIE } from '#lib/server/cookies.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies }) => ({
	csrfToken: cookies.get(CSRF_COOKIE) ?? null
});
