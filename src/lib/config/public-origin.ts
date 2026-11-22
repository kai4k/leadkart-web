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

/** What is wrong with a value that is not an origin: a rule's name, never a part of the value. */
function problemWith(v: string): string {
	let url: URL;
	try {
		url = new URL(v);
	} catch {
		return 'it is not a URL';
	}
	const problems: string[] = [];
	if (url.protocol !== 'http:' && url.protocol !== 'https:')
		problems.push('the scheme is not http or https');
	if (url.username !== '' || url.password !== '') problems.push('it has credentials');
	if (url.search !== '' || url.hash !== '') problems.push('it has a query or fragment');
	else if (url.pathname !== '/' || v.endsWith('/'))
		problems.push('it has a path or a trailing slash');
	if (problems.length === 0)
		problems.push('the host or the spelling is not the bare lower-case form');
	return problems.join('; ');
}

/** Echoed for support: `protocol//hostname` of a value that parses, otherwise only its length. Never userinfo, path, query or fragment. */
function safeEcho(v: unknown): string {
	if (typeof v !== 'string') return `a value of type ${typeof v}`;
	try {
		const url = new URL(v);
		if (
			url.hostname !== '' &&
			/^[a-z0-9.-]+$/i.test(url.hostname) &&
			/^https?:$/.test(url.protocol)
		)
			return `${url.protocol}//${url.hostname}`;
	} catch {
		/* not a URL */
	}
	return `a value of ${v.length} characters`;
}

/**
 * The env schema of `PUBLIC_SITE_URL` (src/env.ts): `''` for unset or empty (allowed outside production; config.ts requires
 * it there), the origin itself when it is exactly one, and a THROW for anything else, so the server refuses to start in
 * every environment instead of silently rendering nothing. The message names the variable, the rule that failed and the
 * expected shape, and echoes at most `protocol//hostname` (or the length): a value may carry credentials, and a start-up
 * message goes to logs.
 */
export function checkedPublicOrigin(v: unknown): string {
	if (v === undefined || v === '') return '';
	if (isPublicOrigin(v)) return v;
	const why = typeof v === 'string' ? problemWith(v) : 'it is not a string';
	throw new PublicOriginError(
		`PUBLIC_SITE_URL must be a bare origin (e.g. https://app.example.com): http or https, a lower-case host and an optional port, with no path or trailing slash, credentials, query or fragment. Problem: ${why}. Got ${safeEcho(v)}`
	);
}
