/**
 * Pure helpers for the BFF proxy (`routes/api/[...path]/+server.ts`).
 * Everything security-relevant about the proxy is decided here so it can
 * be unit-tested without a server.
 */

import { SCOPE_REQUIRED_HEADER } from '../api/scope-header.ts';

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

/** No conditional requests are forwarded and responses are no-store, so no etag / last-modified. */
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'retry-after'];

/**
 * A Go `Location` is forwarded only as a same-origin relative `/api/v1/...`
 * path: an absolute URL must be on the Go origin (and is stripped to
 * path + query, so the internal host never leaks); anything else is dropped.
 */
function sanitiseLocation(value: string, goOrigin: string): string | null {
	let url: URL;
	try {
		url = new URL(value, goOrigin);
	} catch {
		return null;
	}
	if (url.origin !== goOrigin || !url.pathname.startsWith(UPSTREAM_PREFIX)) return null;
	return url.pathname + url.search;
}

/** Allowlist of upstream response headers. Authenticated responses are never cached. */
export function pickResponseHeaders(upstream: Headers, goBaseUrl: string): Headers {
	const out = new Headers();
	for (const name of FORWARDED_RESPONSE_HEADERS) {
		const value = upstream.get(name);
		if (value) out.set(name, value);
	}
	const location = upstream.get('location');
	if (location) {
		const safe = sanitiseLocation(location, new URL(goBaseUrl).origin);
		if (safe) out.set('location', safe);
	}
	out.set('cache-control', 'no-store');
	return out;
}

export interface UpstreamTimeout {
	signal: AbortSignal;
	/** Call as soon as the response headers arrive: the timeout bounds time-to-first-byte only. */
	headersReceived: () => void;
}

/**
 * Abort signal for an upstream call. Fires with a `TimeoutError` when no
 * response headers arrive within `ms`, and follows `parent` (the browser
 * request) so a disconnect cancels the upstream call. Unlike
 * `AbortSignal.timeout`, the clock stops once headers are in, so a long
 * streamed export is never cut off.
 */
export function upstreamTimeout(parent: AbortSignal | undefined, ms: number): UpstreamTimeout {
	const controller = new AbortController();
	const timer = setTimeout(() => {
		controller.abort(new DOMException('Upstream timed out', 'TimeoutError'));
	}, ms);
	const clear = (): void => clearTimeout(timer);

	if (parent) {
		if (parent.aborted) {
			clear();
			controller.abort(parent.reason);
		} else {
			parent.addEventListener(
				'abort',
				() => {
					clear();
					controller.abort(parent.reason);
				},
				{ once: true }
			);
		}
	}
	return { signal: controller.signal, headersReceived: clear };
}

/**
 * True when the browser says the request is made from inside the operator
 * scope tree. The proxy then refuses to run it unless a valid scope cookie
 * is present (covers the cookie having vanished: `none` would otherwise
 * run in the operator's home tenant). The header can only make the proxy
 * stricter, never looser, so trusting a client-supplied value is safe.
 * It is not forwarded to Go.
 */
export function scopeRequired(headers: Headers): boolean {
	return headers.get(SCOPE_REQUIRED_HEADER) === '1';
}

/**
 * True when an upstream call failed because Go was too slow: our own
 * time-to-first-byte abort (`TimeoutError`) or undici's body timeout while a
 * response was streaming (`TypeError` whose cause is `UND_ERR_BODY_TIMEOUT`).
 * One definition for the proxy and server loads, so both answer 504.
 */
export function isUpstreamTimeout(err: unknown): boolean {
	if (err instanceof DOMException && err.name === 'TimeoutError') return true;
	if (!(err instanceof TypeError)) return false;
	return (err.cause as { code?: unknown } | undefined)?.code === 'UND_ERR_BODY_TIMEOUT';
}
