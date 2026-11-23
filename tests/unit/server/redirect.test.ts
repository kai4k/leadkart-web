/**
 * @vitest-environment node
 *
 * Server code runs on Node's URL; jsdom's URL normalises dot segments differently.
 */
import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '#lib/server/redirect.ts';

const origin = 'https://app.leadkart.test';

describe('safeRedirectPath', () => {
	it('falls back when the value is missing', () => {
		expect(safeRedirectPath(null, origin)).toBe('/dashboard');
		expect(safeRedirectPath('', origin)).toBe('/dashboard');
	});

	it('keeps a same-origin path with query and hash', () => {
		expect(safeRedirectPath('/leads?stage=new#top', origin)).toBe('/leads?stage=new#top');
	});

	it.each([
		['protocol-relative', '//evil.com'],
		['backslash (browsers read /\\ as //)', '/\\evil.com'],
		['tab inside the slashes', '/\t/evil.com'],
		['absolute URL', 'https://evil.com/x'],
		// eslint-disable-next-line no-script-url -- the attack string is the test input
		['javascript scheme', 'javascript:alert(1)'],
		['no leading slash', 'leads'],
		['newline', '/leads\nSet-Cookie: x=1'],
		['dot segment that normalises to //', '/.//evil.com'],
		['dot-dot segment that normalises to //', '/..//evil.com'],
		['encoded dot segment (sent as %252e)', '/%2e//evil.com'],
		['parent traversal that normalises to //', '/a/..//evil.com']
	])('rejects %s', (_label, value) => {
		expect(safeRedirectPath(value, origin)).toBe('/dashboard');
	});

	it('still resolves a legitimate dotted path', () => {
		expect(safeRedirectPath('/leads/../orders?x=1', origin)).toBe('/orders?x=1');
	});

	it.each(['/leads?stage=new&q=a+b', '/orders/1#items', '/x%2Fy'])(
		'survives the signin -> must-change-password hop: %s',
		(v) => {
			const hop1 = safeRedirectPath(v, origin);
			const forwarded = new URL(
				`/must-change-password?next=${encodeURIComponent(hop1)}`,
				origin
			).searchParams.get('next');
			expect(safeRedirectPath(forwarded, origin)).toBe(hop1);
		}
	);

	// input-audit-shared M5: same origin, so not an open redirect, but after sign-in the person would
	// land on raw JSON (`/api/...`) or an endpoint that is not a page (`/auth/...`).
	it.each([
		['the proxy', '/api/v1/users'],
		['the proxy root', '/api'],
		['the proxy root with a slash', '/api/'],
		['the proxy with a query', '/api?x=1'],
		['the operator-scope endpoint', '/api/operator/scope'],
		['sign-out', '/auth/logout'],
		['the email-change endpoint', '/auth/confirm-email-change?token=t'],
		['the auth prefix alone', '/auth'],
		['another letter case', '/API/v1/users'],
		['another letter case (auth)', '/Auth/logout'],
		['a percent-encoded letter (the router decodes it)', '/%61pi/v1/users'],
		['a percent-encoded letter (auth)', '/a%75th/logout'],
		['a dot segment that normalises to it', '/leads/../api/v1/users'],
		['a dot segment that normalises to it (auth)', '/x/../auth/logout'],
		['an encoding that cannot be decoded', '/%E0%A4%A/x']
	])('refuses %s: %s', (_label, value) => {
		expect(safeRedirectPath(value, origin)).toBe('/dashboard');
	});

	it.each([
		'/apiary',
		'/api-keys',
		'/authors',
		'/authentication?x=1',
		'/settings/api',
		'/leads/auth',
		'/leads?next=/api/v1/users'
	])('keeps a page whose path only resembles them: %s', (value) => {
		expect(safeRedirectPath(value, origin)).toBe(value);
	});

	it('uses the caller-supplied fallback', () => {
		expect(safeRedirectPath('//evil.com', origin, '/signin')).toBe('/signin');
	});
});
