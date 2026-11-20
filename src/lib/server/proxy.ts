/**
 * Pure helpers for the BFF proxy (`routes/api/[...path]/+server.ts`).
 * Everything security-relevant about the proxy is decided here so it can
 * be unit-tested without a server.
 */

import { deadlineSignal } from '../api/abort.ts';
import { SCOPE_REQUIRED_HEADER } from '../api/scope-header.ts';
import { config } from './config.ts';

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

/** Endpoints whose whole purpose is to return tokens. The browser can never reach them through the /api proxy (it refuses these paths); only the BFF's own routes and actions call them, via goAuthFetch. */
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
const FORWARDED_RESPONSE_HEADERS = [
	'content-type',
	'content-disposition',
	'retry-after',
	'x-correlation-id'
];

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
 * streamed export is never cut off. The signal keeps following `parent` after
 * that (the listeners live and die with the request).
 */
export function upstreamTimeout(parent: AbortSignal | undefined, ms: number): UpstreamTimeout {
	const { signal, stopTimer } = deadlineSignal(parent, ms);
	return { signal, headersReceived: stopTimer };
}

/**
 * Pre-login Go call (login, password reset, refresh, ...): POST JSON, no auth, no
 * scope. Never follows redirects. The deadline covers the WHOLE exchange: these bodies are
 * small token / error envelopes, so the body is read before the clock stops and returned as a
 * fresh `Response` (same status and headers). A stalled body therefore rejects with the same
 * timeout as a stalled header, instead of waiting for undici's 300 s body timeout while a
 * single-flight refresh holds every request of the session.
 * Throws on transport failure or timeout: callers catch, use
 * `isUpstreamTimeout` and answer 504 / 502. Never logs the body (it can hold
 * a password or token). `fetchFn` is for tests (refresh).
 * Re-exported from go.ts; defined here because go.ts imports auth-refresh.ts, which needs it.
 */
export async function goAuthFetch(
	path: `/v1/${string}`,
	init: { method?: 'POST'; body?: unknown } = {},
	fetchFn: typeof fetch = fetch
): Promise<Response> {
	const timeout = upstreamTimeout(undefined, config.UPSTREAM_TIMEOUT_MS);
	try {
		const resp = await fetchFn(`${config.GO_API_URL}/api${path}`, {
			method: init.method ?? 'POST',
			redirect: 'manual',
			signal: timeout.signal,
			headers: { 'content-type': 'application/json', accept: 'application/json' },
			body: init.body === undefined ? undefined : JSON.stringify(init.body)
		});
		// A status that cannot carry a body (redirects arrive as-is under redirect: 'manual').
		const text = NULL_BODY_STATUS.has(resp.status) ? null : await readCapped(resp);
		// The re-wrapped body is decoded text of a different length: these two no longer describe it.
		const headers = new Headers(resp.headers);
		headers.delete('content-encoding');
		headers.delete('content-length');
		return new Response(text, { status: resp.status, statusText: resp.statusText, headers });
	} finally {
		timeout.headersReceived();
	}
}

/** What a pre-login answer may weigh: these are small token / error envelopes. */
export const AUTH_BODY_LIMIT_BYTES = 64 * 1024;

/** An upstream answer larger than the pre-login cap: a bad gateway, not a client problem. */
class UpstreamBodyTooLarge extends Error {
	constructor() {
		super('Upstream response body exceeds the pre-login limit');
		this.name = 'UpstreamBodyTooLarge';
	}
}

/** Read through the body reader; past the cap the stream is cancelled and the call fails. */
async function readCapped(resp: Response): Promise<string> {
	if (!resp.body) return '';
	const reader = resp.body.getReader();
	const decoder = new TextDecoder();
	let received = 0;
	let text = '';
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		received += value.byteLength;
		if (received > AUTH_BODY_LIMIT_BYTES) {
			await reader.cancel().catch(() => {});
			throw new UpstreamBodyTooLarge();
		}
		text += decoder.decode(value, { stream: true });
	}
	return text + decoder.decode();
}

const NULL_BODY_STATUS = new Set([101, 204, 205, 304]);

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

/**
 * True for a failure that IS the upstream's (or the network's): a timeout, a fetch that could not
 * connect (undici's `TypeError('fetch failed')`, or any TypeError carrying a connection error code),
 * or an oversized pre-login body. A programming error (a TypeError from our own code) is not one.
 */
export function isUpstreamFailure(err: unknown): boolean {
	if (isUpstreamTimeout(err) || err instanceof UpstreamBodyTooLarge) return true;
	if (!(err instanceof TypeError)) return false;
	if (err.message === 'fetch failed') return true;
	return typeof (err.cause as { code?: unknown } | undefined)?.code === 'string';
}

/** The status a failed upstream call is reported as: 504 when Go was too slow, else 502. The one mapping. */
export function upstreamStatus(err: unknown): 502 | 504 {
	return isUpstreamTimeout(err) ? 504 : 502;
}
