/**
 * Pure helpers for the BFF proxy (`routes/api/[...path]/+server.ts`).
 * Everything security-relevant about the proxy is decided here so it can
 * be unit-tested without a server.
 */

const UPSTREAM_PREFIX = '/api/v1/';
const SEGMENT_DELIMITERS = new Set(['/', '\\', '?', '#']);

function hasForbiddenChar(segment: string): boolean {
	for (const ch of segment) {
		const code = ch.charCodeAt(0);
		if (code <= 0x1f || code === 0x7f || SEGMENT_DELIMITERS.has(ch)) return true;
	}
	return false;
}

/**
 * Build the Go URL for a proxied request, or null when the path is not a
 * plain `v1/...` path.
 *
 * `path` is SvelteKit's rest param, already percent-decoded once. Every
 * segment is validated and then re-encoded, so a segment such as
 * `%2e%2e` (left over from a double-encoded `..`) is sent to Go as the
 * literal text `%252e%252e` rather than being read as `..` by the URL
 * parser. The final pathname and origin are asserted as a last line of
 * defence.
 */
export function buildUpstreamUrl(base: string, path: string, search: string): URL | null {
	const segments = path.split('/');
	if (segments.length < 2 || segments[0] !== 'v1') return null;

	for (const segment of segments) {
		if (segment === '' || segment === '.' || segment === '..') return null;
		if (hasForbiddenChar(segment)) return null;
		let decoded: string;
		try {
			decoded = decodeURIComponent(segment);
		} catch {
			return null;
		}
		if (decoded === '.' || decoded === '..') return null;
	}

	let origin: string;
	let url: URL;
	try {
		origin = new URL(base).origin;
		url = new URL(`/api/${segments.map(encodeURIComponent).join('/')}${search}`, origin);
	} catch {
		return null;
	}
	if (url.origin !== origin || !url.pathname.startsWith(UPSTREAM_PREFIX)) return null;
	return url;
}

/** Endpoints whose whole purpose is to return tokens. Reached only through /auth/* BFF routes. */
const TOKEN_ENDPOINTS = new Set(['v1/auth/login', 'v1/auth/refresh']);
export function isTokenEndpoint(path: string): boolean {
	return TOKEN_ENDPOINTS.has(path);
}

/** Responses that carry tokens next to data the browser does need. */
export function scrubsTokens(method: string, path: string): boolean {
	return method === 'POST' && path === 'v1/platform/impersonation/sessions';
}

const TOKEN_FIELDS = new Set(['access_token', 'refresh_token', 'token', 'id_token']);
export function stripTokenFields(body: unknown): unknown {
	if (body === null || typeof body !== 'object' || Array.isArray(body)) return body;
	return Object.fromEntries(Object.entries(body).filter(([key]) => !TOKEN_FIELDS.has(key)));
}

const FORWARDED_RESPONSE_HEADERS = [
	'content-type',
	'content-disposition',
	'retry-after',
	'etag',
	'last-modified',
	'location'
];

/** Allowlist of upstream response headers. Authenticated responses are never cached. */
export function pickResponseHeaders(upstream: Headers): Headers {
	const out = new Headers();
	for (const name of FORWARDED_RESPONSE_HEADERS) {
		const value = upstream.get(name);
		if (value) out.set(name, value);
	}
	out.set('cache-control', 'no-store');
	return out;
}

/** Abort when the browser disconnects or the upstream takes too long. */
export function upstreamSignal(request: Request, ms: number): AbortSignal {
	return AbortSignal.any([request.signal, AbortSignal.timeout(ms)]);
}
