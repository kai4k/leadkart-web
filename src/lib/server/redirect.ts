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
	return path;
}
