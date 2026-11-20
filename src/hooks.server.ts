/**
 * Server hooks. `handle` runs before every load, form action and /api proxy
 * call, so it is the one place that can guarantee an expired access cookie
 * is refreshed BEFORE anything reads it. Parallel child loads and form
 * actions would otherwise see no cookie and bounce to /signin.
 *
 * The refresh itself lives in `#lib/server/auth-refresh.ts` (single
 * implementation, single-flight).
 */
import { sequence, type Handle, type ServerInit } from '@sveltejs/kit/hooks';
import { waitLocale } from 'svelte-i18n';
import { initI18n } from '#lib/i18n/index.ts';
import { refreshSession } from '#lib/server/auth-refresh.ts';
import { isProd, validateConfig } from '#lib/server/config.ts';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '#lib/server/cookies.ts';
import { applySecurityHeaders } from '#lib/server/security-headers.ts';

// Runs once at server start (never during `vite build`).
// 1. A bad environment must stop the process now, not on the first request.
// 2. svelte-i18n throws on `$_` during SSR unless a locale is set. The server
//    always renders the fallback locale (per-request locale is not built).
export const init: ServerInit = async () => {
	validateConfig();
	initI18n();
	await waitLocale();
};

/**
 * Silent refresh: access cookie gone (10-minute expiry) + refresh cookie
 * present → refresh now. Later `event.cookies.get(...)` calls in the same
 * request see the new value; the outcome is kept on `event.locals.refreshOutcome`.
 *
 * Skips NO_REFRESH_PREFIXES (signin/logout/reset handle their own session):
 * static assets and signed-out visitors carry no refresh cookie, and a
 * request that still has its access cookie is skipped, so this does nothing
 * for them.
 */
// Pre-login / session-ending pages: refreshing here would rotate a refresh
// token the page is about to discard, orphaning its token family.
const NO_REFRESH_PREFIXES = ['/auth/', '/signin', '/forgot-password', '/reset-password'];

const sessionRefresh: Handle = async ({ event, resolve }) => {
	if (
		!event.cookies.get(ACCESS_COOKIE()) &&
		event.cookies.get(REFRESH_COOKIE) &&
		!NO_REFRESH_PREFIXES.some((prefix) => event.url.pathname.startsWith(prefix))
	) {
		const outcome = await refreshSession(event.cookies);
		// Loads tell "Go is down" (503) from "signed out" (redirect) by this.
		event.locals.refreshOutcome = outcome.ok ? 'renewed' : outcome.reason;
	}
	return resolve(event);
};

/** Baseline security headers on every response (CSP itself is Kit config in vite.config.ts). */
const securityHeadersHandle: Handle = async ({ event, resolve }) =>
	applySecurityHeaders(await resolve(event), isProd(), event.url.pathname);

// Headers handle first so it wraps (and stamps) every response, including redirects.
export const handle: Handle = sequence(securityHeadersHandle, sessionRefresh);
