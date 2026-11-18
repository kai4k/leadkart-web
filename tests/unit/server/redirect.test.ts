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

	it('uses the caller-supplied fallback', () => {
		expect(safeRedirectPath('//evil.com', origin, '/signin')).toBe('/signin');
	});
});
