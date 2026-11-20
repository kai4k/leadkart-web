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

describe('assertCsrf with a form field (no-JavaScript posts)', () => {
	it('uses the field when there is no header, under the same equality rule', () => {
		expect(assertCsrf(event(null, 'tok'), 'tok')).toBeNull();
		expect(assertCsrf(event(null, 'tok'), 'nope')?.status).toBe(403);
		expect(assertCsrf(event(null, 'tok'), '')?.status).toBe(403);
		expect(assertCsrf(event(null, undefined), 'tok')?.status).toBe(403);
	});

	it('a header, right or wrong, decides alone: a wrong header never falls back to the field', () => {
		expect(assertCsrf(event('bad', 'tok'), 'tok')?.status).toBe(403);
		expect(assertCsrf(event('', 'tok'), 'tok')?.status).toBe(403);
		expect(assertCsrf(event('tok', 'tok'), 'whatever')).toBeNull();
	});
});
