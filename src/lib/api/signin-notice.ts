/**
 * The sign-in notice: ONE way the sign-in page learns why the person is there again.
 *
 * Where the BFF ends a session that is over (a rejected refresh, a password change) it sets the
 * cookie `lk_signin_notice` to one of the names below (`setSigninNotice` in `server/cookies.ts`).
 * The sign-in page's server load takes it once (`takeSigninNotice`, same file): the page says the
 * matching sentence and the cookie is deleted. The cookie carries a NAME from this list and nothing
 * else: no token, no id, no text from the API. Anything not on the list is never set and never shown.
 *
 * The reader is the server load, not a script on the page: a page reached by a client-side
 * navigation (the session guard's `goto('/signin')`) cannot see a `Path=/signin` cookie through
 * `document.cookie` in Chromium, while the load's request (`/signin` or `/signin/__data.json`)
 * always carries it.
 *
 * Shared by the server (which writes and takes it) and the sign-in card (which renders the
 * sentence), so the name, the path, the list and the sentences live here once. No I/O.
 */
export const SIGNIN_NOTICE_COOKIE = 'lk_signin_notice';
/** The only page that reads it: the browser sends the cookie nowhere else. */
export const SIGNIN_NOTICE_PATH = '/signin';

export const SIGNIN_NOTICES = [
	'session_expired',
	'tenant_suspended',
	'tenant_not_active',
	'password_changed'
] as const;
export type SigninNotice = (typeof SIGNIN_NOTICES)[number];

/** The notice a value names, or null for anything that is not exactly one of the four. */
export function signinNoticeOf(value: unknown): SigninNotice | null {
	return SIGNIN_NOTICES.find((n) => n === value) ?? null;
}

/** The sentence of each notice. The two company lines are the ones sign-in itself uses for Go's 403. */
export const SIGNIN_NOTICE_KEYS: Record<SigninNotice, string> = {
	session_expired: 'auth.signin.notice.sessionExpired',
	tenant_suspended: 'auth.errors.tenantSuspended',
	tenant_not_active: 'auth.errors.tenantNotActive',
	password_changed: 'auth.signin.notice.passwordChanged'
};
