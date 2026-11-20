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
