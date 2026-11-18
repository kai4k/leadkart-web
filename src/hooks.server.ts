/**
 * Server hooks. `handle` runs before every load, form action and /api proxy
 * call, so it is the one place that can guarantee an expired access cookie
 * is refreshed BEFORE anything reads it. Parallel child loads and form
 * actions would otherwise see no cookie and bounce to /signin.
 *
 * The refresh itself lives in `#lib/server/auth-refresh.ts` (single
 * implementation, single-flight).
 */
import { sequence, type Handle } from '@sveltejs/kit/hooks';
import { refreshSession } from '#lib/server/auth-refresh.ts';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '#lib/server/cookies.ts';

/**
 * Silent refresh: access cookie gone (15-minute expiry) + refresh cookie
 * present → refresh now. Later `event.cookies.get(...)` calls in the same
 * request see the new value.
 *
 * No path filter beyond /auth/ (signin/logout handle their own session):
 * static assets and signed-out visitors carry no refresh cookie, and a
 * request that still has its access cookie is skipped, so this does nothing
 * for them.
 */
const sessionRefresh: Handle = async ({ event, resolve }) => {
	if (
		!event.cookies.get(ACCESS_COOKIE()) &&
		event.cookies.get(REFRESH_COOKIE) &&
		!event.url.pathname.startsWith('/auth/')
	) {
		await refreshSession(event.cookies);
	}
	return resolve(event);
};

export const handle: Handle = sequence(sessionRefresh);
