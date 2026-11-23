/**
 * Open-redirect guard for `?next=` style parameters.
 *
 * `raw` must already be URL-decoded once (it is, when read through
 * `url.searchParams.get`). Never decode it again here: a second decode is
 * how `%252F%252Fevil.com` turns into `//evil.com`.
 *
 * Browsers normalise backslashes and strip tab/newline inside a URL, so
 * `/\evil.com` and `/<TAB>/evil.com` both navigate to `//evil.com`. Those
 * characters are rejected outright before parsing.
 *
 * A target must also be a page: `/api/...` and `/auth/...` are refused (see `isPage`).
 */
// eslint-disable-next-line no-control-regex -- control characters are exactly what this guard rejects
const UNSAFE_CHARS = /[\\\u0000-\u001f\u007f]/;

export function safeRedirectPath(
	raw: string | null | undefined,
	origin: string,
	fallback = '/dashboard'
): string {
	if (!raw) return fallback;
	if (UNSAFE_CHARS.test(raw)) return fallback;
	if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;

	let url: URL;
	try {
		url = new URL(raw, origin);
	} catch {
		return fallback;
	}
	if (url.origin !== origin) return fallback;
	// Validate the OUTPUT too: dot-segment normalisation turns `/.//evil.com`
	// and `/%2e//evil.com` into `//evil.com`, which a browser reads as another host.
	const path = url.pathname + url.search + url.hash;
	if (!path.startsWith('/') || path.startsWith('//')) return fallback;
	if (!isPage(url.pathname)) return fallback;
	return path;
}

/** The first path segments that are endpoints, not pages: the BFF proxy and the auth endpoints. */
const NOT_PAGES: ReadonlySet<string> = new Set(['api', 'auth']);

/**
 * Whether a (normalised) pathname can be a page. `/api/...` answers JSON and `/auth/...` is
 * sign-out and the email-change endpoint: same origin, so not a redirect hole, but nowhere to send
 * a person after sign-in. The segment is compared the way the router reads it (percent-decoded once,
 * for this comparison only: what is returned is never decoded) and without regard to letter case; a
 * pathname that cannot be decoded is not a page either.
 */
function isPage(pathname: string): boolean {
	let decoded: string;
	try {
		decoded = decodeURI(pathname);
	} catch {
		return false;
	}
	return !NOT_PAGES.has((decoded.split('/')[1] ?? '').toLowerCase());
}
