import { describe, expect, it } from 'vitest';
import { error, redirect } from '@sveltejs/kit';
import { callGoForAction } from '#lib/server/form-action.ts';
import { upstreamStatus } from '#lib/server/proxy.ts';

describe('upstreamStatus', () => {
	it('is 504 for a timeout and 502 for everything else', () => {
		expect(upstreamStatus(new DOMException('slow', 'TimeoutError'))).toBe(504);
		expect(upstreamStatus(new TypeError('fetch failed'))).toBe(502);
		expect(upstreamStatus(null)).toBe(502);
	});
});

describe('callGoForAction', () => {
	it('hands back the response when the call returns, whatever its status', async () => {
		const resp = new Response(null, { status: 409 });
		expect(await callGoForAction(() => Promise.resolve(resp))).toEqual({ ok: true, resp });
	});

	it('turns a transport failure into the kept-form outage failure (502)', async () => {
		const r = await callGoForAction(() => Promise.reject(new TypeError('fetch failed')));
		expect(r).toEqual({ ok: false, status: 502, key: 'auth.errors.upstreamUnavailable' });
	});

	it('turns a timeout into 504', async () => {
		const r = await callGoForAction(() => Promise.reject(new DOMException('slow', 'TimeoutError')));
		expect(r).toMatchObject({ ok: false, status: 504 });
	});

	it('turns the 503 goFetch throws when the session could not be renewed into the same failure', async () => {
		const r = await callGoForAction(() => Promise.reject(error(503, 'renew')));
		expect(r).toEqual({ ok: false, status: 503, key: 'auth.errors.upstreamUnavailable' });
	});

	it('lets a redirect (session over) through', async () => {
		await expect(
			callGoForAction(() => Promise.reject(redirect(303, '/signin')))
		).rejects.toMatchObject({ status: 303 });
	});
});
