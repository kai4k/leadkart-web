import { describe, expect, it } from 'vitest';
import {
	buildUpstreamUrl,
	isTokenEndpoint,
	pickResponseHeaders,
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

describe('pickResponseHeaders', () => {
	it('forwards the allowlist, adds no-store, and drops everything else', () => {
		const out = pickResponseHeaders(
			new Headers({
				'content-type': 'application/json',
				'retry-after': '30',
				etag: '"abc"',
				'content-disposition': 'attachment; filename="x.csv"',
				'set-cookie': 'evil=1',
				server: 'go',
				'x-internal-trace': 't'
			})
		);
		expect(out.get('content-type')).toBe('application/json');
		expect(out.get('retry-after')).toBe('30');
		expect(out.get('etag')).toBe('"abc"');
		expect(out.get('content-disposition')).toContain('x.csv');
		expect(out.get('cache-control')).toBe('no-store');
		expect(out.get('set-cookie')).toBeNull();
		expect(out.get('server')).toBeNull();
		expect(out.get('x-internal-trace')).toBeNull();
	});
});
