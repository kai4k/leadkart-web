import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	buildUpstreamUrl,
	isTokenEndpoint,
	isUpstreamTimeout,
	pickResponseHeaders,
	scopeRequired,
	upstreamTimeout,
	scrubsTokens,
	stripTokenFields
} from '#lib/server/proxy.ts';

const base = 'http://go.internal:8080';

describe('buildUpstreamUrl', () => {
	it('maps a v1 path and keeps the query string', () => {
		expect(buildUpstreamUrl(base, 'v1/leads/42', '?stage=new')?.href).toBe(
			'http://go.internal:8080/api/v1/leads/42?stage=new'
		);
	});

	// SvelteKit hands `params.path` over already decoded once.
	it.each([
		['dot-dot segment (from ..%2F)', 'v1/../../debug'],
		['leading dot-dot', '../admin'],
		['encoded dot-dot that survives one decode (from %252e%252e)', 'v1/%2e%2e/%2e%2e/debug'],
		['single dot', 'v1/./leads'],
		['backslash', 'v1/leads\\..\\admin'],
		['empty segment', 'v1//leads'],
		['not under v1', 'v2/leads'],
		['bare v1', 'v1'],
		['control character', 'v1/leads\n/x'],
		['malformed escape', 'v1/%E0%A4%A']
	])('rejects %s', (_label, path) => {
		expect(buildUpstreamUrl(base, path, '')).toBeNull();
	});

	it('never leaves /api/v1/ and never changes origin', () => {
		const url = buildUpstreamUrl(base, 'v1/a%2Fb/c', '')!;
		expect(url.origin).toBe(base);
		expect(url.pathname.startsWith('/api/v1/')).toBe(true);
	});
});

describe('token handling', () => {
	it('blocks the endpoints that return tokens', () => {
		expect(isTokenEndpoint('v1/auth/login')).toBe(true);
		expect(isTokenEndpoint('v1/auth/refresh')).toBe(true);
		expect(isTokenEndpoint('v1/auth/me/capabilities')).toBe(false);
	});

	it('scrubs token fields from the impersonation-start response only', () => {
		expect(scrubsTokens('POST', 'v1/platform/impersonation/sessions')).toBe(true);
		expect(scrubsTokens('GET', 'v1/platform/impersonation/sessions')).toBe(false);
		expect(
			stripTokenFields({
				session_id: 's1',
				access_token: 'jwt',
				refresh_token: 'r',
				expires_at: 'x'
			})
		).toEqual({
			session_id: 's1',
			expires_at: 'x'
		});
	});
});

const GO = 'http://go.internal:8080';

describe('pickResponseHeaders', () => {
	it('forwards the allowlist, adds no-store, and drops everything else', () => {
		const out = pickResponseHeaders(
			new Headers({
				'content-type': 'application/json',
				'retry-after': '30',
				'x-correlation-id': 'c-1',
				etag: '"abc"',
				'last-modified': 'Mon, 01 Jan 2024 00:00:00 GMT',
				'content-disposition': 'attachment; filename="x.csv"',
				'set-cookie': 'evil=1',
				server: 'go',
				'x-internal-trace': 't'
			}),
			GO
		);
		expect(out.get('content-type')).toBe('application/json');
		expect(out.get('retry-after')).toBe('30');
		expect(out.get('x-correlation-id')).toBe('c-1');
		expect(out.get('content-disposition')).toContain('x.csv');
		expect(out.get('cache-control')).toBe('no-store');
		expect(out.get('etag')).toBeNull();
		expect(out.get('last-modified')).toBeNull();
		expect(out.get('set-cookie')).toBeNull();
		expect(out.get('server')).toBeNull();
		expect(out.get('x-internal-trace')).toBeNull();
	});

	const location = (value: string) =>
		pickResponseHeaders(new Headers({ location: value }), GO).get('location');

	it('rewrites a same-origin absolute Location to a relative /api/v1 path', () => {
		expect(location(`${GO}/api/v1/users/1?x=2`)).toBe('/api/v1/users/1?x=2');
	});
	it('keeps a relative /api/v1 Location', () => {
		expect(location('/api/v1/things/9')).toBe('/api/v1/things/9');
	});
	it('drops a foreign-host Location', () => {
		expect(location('http://evil.example/api/v1/users')).toBeNull();
		expect(location('//evil.example/api/v1/users')).toBeNull();
	});
	it('drops a Location outside /api/v1/', () => {
		expect(location('/admin')).toBeNull();
		expect(location(`${GO}/healthz`)).toBeNull();
		expect(location('/api/v1/../../x')).toBeNull();
	});
});

describe('upstreamTimeout', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('aborts with TimeoutError at ms when headers have not arrived', () => {
		const { signal } = upstreamTimeout(undefined, 1000);
		vi.advanceTimersByTime(999);
		expect(signal.aborted).toBe(false);
		vi.advanceTimersByTime(1);
		expect(signal.aborted).toBe(true);
		expect((signal.reason as DOMException).name).toBe('TimeoutError');
	});

	it('does not abort after headersReceived()', () => {
		const t = upstreamTimeout(undefined, 1000);
		t.headersReceived();
		vi.advanceTimersByTime(60_000);
		expect(t.signal.aborted).toBe(false);
	});

	it('aborts when the request signal aborts, with the request reason', () => {
		const ctl = new AbortController();
		const { signal } = upstreamTimeout(ctl.signal, 1000);
		ctl.abort();
		expect(signal.aborted).toBe(true);
		expect((signal.reason as DOMException).name).toBe('AbortError');
	});

	it('is already aborted when the request signal is', () => {
		const { signal } = upstreamTimeout(AbortSignal.abort(), 1000);
		expect(signal.aborted).toBe(true);
	});
});

describe('scopeRequired', () => {
	it('is true only for the marker header set to 1', () => {
		expect(scopeRequired(new Headers({ 'x-lk-scope-required': '1' }))).toBe(true);
		expect(scopeRequired(new Headers({ 'x-lk-scope-required': '0' }))).toBe(false);
		expect(scopeRequired(new Headers())).toBe(false);
	});
});

describe('isUpstreamTimeout', () => {
	it('is true for our own time-to-first-byte abort', () => {
		expect(isUpstreamTimeout(new DOMException('Upstream timed out', 'TimeoutError'))).toBe(true);
	});

	it("is true for undici's body timeout while streaming", () => {
		const err = new TypeError('terminated', {
			cause: Object.assign(new Error('Body Timeout Error'), { code: 'UND_ERR_BODY_TIMEOUT' })
		});
		expect(isUpstreamTimeout(err)).toBe(true);
	});

	it('is false for other failures', () => {
		expect(isUpstreamTimeout(new TypeError('fetch failed'))).toBe(false);
		expect(
			isUpstreamTimeout(
				new TypeError('x', { cause: Object.assign(new Error(), { code: 'ECONNRESET' }) })
			)
		).toBe(false);
		expect(isUpstreamTimeout(new DOMException('gone', 'AbortError'))).toBe(false);
		expect(isUpstreamTimeout(new Error('UND_ERR_BODY_TIMEOUT'))).toBe(false);
		expect(isUpstreamTimeout(null)).toBe(false);
	});
});
