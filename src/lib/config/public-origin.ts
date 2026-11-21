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

/** The value to render: the origin itself, or `''` for anything that is not exactly one (never the raw value). */
export function renderablePublicOrigin(v: unknown): string {
	return isPublicOrigin(v) ? v : '';
}
