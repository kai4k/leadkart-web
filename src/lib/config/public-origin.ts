/**
 * The one rule for a public origin (PUBLIC_SITE_URL), shared by `src/env.ts` (the value SvelteKit substitutes, unescaped,
 * into the link-preview tags of src/app.html) and `src/lib/server/config.ts` (start-up validation). Pure: no server
 * imports, so the env schema can use it.
 *
 * A valid value is EXACTLY an origin: http(s) scheme in lower case, a host of letters, digits, dots and hyphens (an IDN
 * is written as punycode: `new URL` would rewrite it), an optional port, and nothing else, so no quote, angle bracket,
 * whitespace, `&`, backslash, credential, path (a trailing slash is a path), query or fragment can reach an attribute.
 * `''` is not valid here: callers decide whether empty is allowed.
 */
const ORIGIN_GRAMMAR = /^https?:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::[0-9]{1,5})?$/;

export function isPublicOrigin(v: unknown): v is string {
	if (typeof v !== 'string' || !ORIGIN_GRAMMAR.test(v)) return false;
	try {
		return new URL(v).origin === v;
	} catch {
		return false;
	}
}

/** A start-up configuration error (not an API error): the value of PUBLIC_SITE_URL is not an origin. */
class PublicOriginError extends Error {}

/**
 * The env schema of `PUBLIC_SITE_URL` (src/env.ts): `''` for unset or empty (allowed outside production; config.ts requires
 * it there), the origin itself when it is exactly one, and a THROW for anything else, so the server refuses to start in
 * every environment instead of silently rendering nothing. The message names the variable and the expected shape and
 * echoes at most the first 60 characters of the bad value (JSON-quoted, so control characters show as escapes).
 */
export function checkedPublicOrigin(v: unknown): string {
	if (v === undefined || v === '') return '';
	if (isPublicOrigin(v)) return v;
	const shown =
		typeof v === 'string' ? JSON.stringify(v.length > 60 ? `${v.slice(0, 60)}...` : v) : typeof v;
	throw new PublicOriginError(
		`PUBLIC_SITE_URL must be a bare origin (e.g. https://app.example.com): http or https, a lower-case host and an optional port, with no path or trailing slash, credentials, query or fragment. Got ${shown}`
	);
}
