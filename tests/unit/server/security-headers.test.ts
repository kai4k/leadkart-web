import { describe, expect, it } from 'vitest';
import {
	applySecurityHeaders,
	securityHeaders,
	withHtmlNoStore
} from '#lib/server/security-headers.ts';

describe('securityHeaders', () => {
	it('always sets the baseline headers', () => {
		expect(securityHeaders(false)).toMatchObject({
			'x-content-type-options': 'nosniff',
			'x-frame-options': 'DENY',
			'referrer-policy': 'strict-origin-when-cross-origin',
			'permissions-policy': 'camera=(), microphone=(), geolocation=()'
		});
	});
	it('adds HSTS only in production', () => {
		expect(securityHeaders(false)['strict-transport-security']).toBeUndefined();
		expect(securityHeaders(true)['strict-transport-security']).toBe(
			'max-age=63072000; includeSubDomains'
		);
	});
});

describe('applySecurityHeaders', () => {
	it('sets baseline headers on a mutable response', () => {
		const res = applySecurityHeaders(new Response('x'), false);
		expect(res.headers.get('x-frame-options')).toBe('DENY');
	});

	it('survives immutable headers (Response.redirect) by rebuilding the response', () => {
		const original = Response.redirect('http://x/y', 302);
		const res = applySecurityHeaders(original, false);
		expect(res.status).toBe(302);
		expect(res.headers.get('location')).toBe('http://x/y');
		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
	});
});

describe('withHtmlNoStore', () => {
	it('marks HTML without cache-control as private, no-store', () => {
		const h = new Headers({ 'content-type': 'text/html; charset=utf-8' });
		expect(withHtmlNoStore(h).get('cache-control')).toBe('private, no-store');
	});
	it('leaves JSON untouched', () => {
		const h = new Headers({ 'content-type': 'application/json' });
		expect(withHtmlNoStore(h).has('cache-control')).toBe(false);
	});
	it('keeps an existing cache-control', () => {
		const h = new Headers({ 'content-type': 'text/html', 'cache-control': 'max-age=60' });
		expect(withHtmlNoStore(h).get('cache-control')).toBe('max-age=60');
	});
});

describe('__data.json (a signed-in route load as JSON) is no-store like the page', () => {
	const data = () =>
		new Response('{"type":"data"}', { headers: { 'content-type': 'application/json' } });

	it('is marked private, no-store', () => {
		const res = applySecurityHeaders(data(), false, '/settings/users/__data.json');
		expect(res.headers.get('cache-control')).toBe('private, no-store');
	});

	it('the root route data too', () => {
		const res = applySecurityHeaders(data(), false, '/__data.json');
		expect(res.headers.get('cache-control')).toBe('private, no-store');
	});

	it('keeps an explicit cache-control and leaves other JSON alone', () => {
		const kept = new Response('{}', { headers: { 'cache-control': 'max-age=60' } });
		expect(applySecurityHeaders(kept, false, '/x/__data.json').headers.get('cache-control')).toBe(
			'max-age=60'
		);
		expect(applySecurityHeaders(data(), false, '/api/v1/users').headers.has('cache-control')).toBe(
			false
		);
	});
});
