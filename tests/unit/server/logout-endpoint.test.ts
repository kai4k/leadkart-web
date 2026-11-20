import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CSRF_COOKIE, REFRESH_COOKIE } from '#lib/server/cookies.ts';

const goAuthFetch = vi.hoisted(() =>
	vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
);
vi.mock('#lib/server/go.ts', () => ({ goAuthFetch }));

import { POST } from '../../../src/routes/auth/logout/+server.ts';

function jar(initial: Record<string, string>) {
	const store = new Map(Object.entries(initial));
	return {
		get: (n: string) => store.get(n),
		set: (n: string, v: string) => void store.set(n, v),
		delete: vi.fn((n: string) => void store.delete(n)),
		has: (n: string) => store.has(n)
	};
}

function call(opts: { header?: string; field?: string | null; cookie?: string; json?: boolean }) {
	const cookies = jar({ [CSRF_COOKIE]: opts.cookie ?? 'tok', [REFRESH_COOKIE]: 'rt' });
	const headers: Record<string, string> = {};
	if (opts.header !== undefined) headers['x-csrf-token'] = opts.header;
	let body: BodyInit | undefined;
	if (opts.json) {
		headers['content-type'] = 'application/json';
		body = '{}';
	} else {
		headers['content-type'] = 'application/x-www-form-urlencoded';
		body = new URLSearchParams(opts.field == null ? {} : { csrf: opts.field });
	}
	const request = new Request('http://x/auth/logout', { method: 'POST', headers, body });
	return {
		cookies,
		result: (POST as (e: never) => Promise<Response>)({ request, cookies } as never)
	};
}

beforeEach(() => goAuthFetch.mockClear());

describe('POST /auth/logout', () => {
	it('signs out with the header and answers JSON (the existing JS path)', async () => {
		const { result, cookies } = call({ header: 'tok', json: true });
		const resp = await result;
		expect(resp.status).toBe(200);
		expect(await resp.json()).toEqual({ ok: true });
		expect(cookies.has(CSRF_COOKIE)).toBe(false);
	});

	it('no JavaScript: a form field equal to the cookie, with no header, signs out and sends the browser to /signin', async () => {
		const { result, cookies } = call({ field: 'tok' });
		await expect(result).rejects.toMatchObject({ status: 303, location: '/signin' });
		expect(goAuthFetch).toHaveBeenCalledTimes(1);
		expect(cookies.has(CSRF_COOKIE)).toBe(false);
		expect(cookies.has(REFRESH_COOKIE)).toBe(false);
	});

	it.each([
		['a field that differs from the cookie', { field: 'other' }],
		['no field and no header', { field: null }],
		['an empty field', { field: '' }]
	])('403 and nothing cleared for %s', async (_n, opts) => {
		const { result, cookies } = call(opts);
		const resp = await result;
		expect(resp.status).toBe(403);
		expect(goAuthFetch).not.toHaveBeenCalled();
		expect(cookies.has(CSRF_COOKIE)).toBe(true);
	});

	it('a wrong header never falls back to a correct field', async () => {
		const cookies = jar({ [CSRF_COOKIE]: 'tok' });
		const request = new Request('http://x/auth/logout', {
			method: 'POST',
			headers: { 'x-csrf-token': 'wrong', 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ csrf: 'tok' })
		});
		const resp = await (POST as (e: never) => Promise<Response>)({ request, cookies } as never);
		expect(resp.status).toBe(403);
	});

	it('a JSON body without the header is refused (the field is read for form posts only)', async () => {
		const { result } = call({ json: true });
		expect((await result).status).toBe(403);
	});
});
