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
		['newline', '/leads\nSet-Cookie: x=1']
	])('rejects %s', (_label, value) => {
		expect(safeRedirectPath(value, origin)).toBe('/dashboard');
	});

	it('uses the caller-supplied fallback', () => {
		expect(safeRedirectPath('//evil.com', origin, '/signin')).toBe('/signin');
	});
});
