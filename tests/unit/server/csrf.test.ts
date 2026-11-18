import { describe, expect, it } from 'vitest';
import { assertCsrf } from '#lib/server/csrf.ts';
import { CSRF_COOKIE } from '#lib/server/cookies.ts';

function event(header: string | null, cookie: string | undefined) {
	return {
		request: new Request('http://x/', {
			method: 'POST',
			headers: header === null ? {} : { 'x-csrf-token': header }
		}),
		cookies: { get: (name: string) => (name === CSRF_COOKIE ? cookie : undefined) }
	} as never;
}

describe('assertCsrf', () => {
	it('returns null when header and cookie match', () => {
		expect(assertCsrf(event('tok', 'tok'))).toBeNull();
	});

	it.each([
		['missing header', null, 'tok'],
		['missing cookie', 'tok', undefined],
		['both missing', null, undefined],
		['mismatch', 'tok', 'other'],
		['empty header', '', 'tok']
	])('403 csrf_mismatch on %s', async (_label, header, cookie) => {
		const resp = assertCsrf(event(header, cookie));
		expect(resp?.status).toBe(403);
		expect(await resp?.json()).toEqual({
			error: 'csrf_mismatch',
			message: 'CSRF token missing or invalid'
		});
		expect(resp?.headers.get('cache-control')).toBe('no-store');
	});
});
