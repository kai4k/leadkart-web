import { beforeEach, describe, expect, it, vi } from 'vitest';
import { error, redirect } from '@sveltejs/kit';

const loadCapabilities = vi.hoisted(() => vi.fn());
const readOperatorScope = vi.hoisted(() => vi.fn(() => ({ state: 'none' }) as { state: string }));
vi.mock('#lib/server/capabilities.ts', () => ({ loadCapabilities }));
vi.mock('#lib/server/scope.ts', () => ({ readOperatorScope }));

import { authoriseAction, callGoForAction } from '#lib/server/form-action.ts';
import { P } from '#lib/features/auth/permissions.ts';
import { caps } from '../helpers/capability-personas.ts';
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

describe('authoriseAction', () => {
	const cookies = {} as never;
	beforeEach(() => {
		loadCapabilities.mockReset();
		readOperatorScope.mockReturnValue({ state: 'none' });
	});

	it('is null (go ahead) when the permission is held', async () => {
		loadCapabilities.mockResolvedValue(caps([P.identityTenantsUpdate]));
		expect(await authoriseAction(cookies, P.identityTenantsUpdate, { a: 1 })).toBeNull();
	});

	it('any-of: one held permission is enough', async () => {
		loadCapabilities.mockResolvedValue(caps([P.platformUsersManage]));
		expect(
			await authoriseAction(cookies, [P.identityUsersCreate, P.platformUsersManage], {})
		).toBeNull();
	});

	it('refuses with a 403 that keeps the values and speaks the copy map line, never Go text', async () => {
		loadCapabilities.mockResolvedValue(caps([P.identityTenantsView]));
		const r = await authoriseAction(cookies, P.identityTenantsUpdate, { a: 1 });
		expect(r).toMatchObject({
			status: 403,
			data: { values: { a: 1 }, bannerError: "You don't have permission to do this." }
		});
	});

	it('does not infer: is_super_user / tenant.admin alone hold nothing', async () => {
		loadCapabilities.mockResolvedValue(caps(['tenant.admin'], { is_super_user: true }));
		expect(await authoriseAction(cookies, P.identityTenantsUpdate, {})).toMatchObject({
			status: 403
		});
	});

	it('applies the tenant-context restriction (a blocked write is refused in context)', async () => {
		readOperatorScope.mockReturnValue({ state: 'valid' });
		loadCapabilities.mockResolvedValue(caps([P.crmLeadsManage]));
		expect(await authoriseAction(cookies, P.crmLeadsManage, {})).toMatchObject({ status: 403 });
	});

	it('no usable capabilities means the session is over: redirect to sign-in', async () => {
		loadCapabilities.mockResolvedValue(null);
		await expect(authoriseAction(cookies, P.identityTenantsUpdate, {})).rejects.toMatchObject({
			status: 303,
			location: '/signin'
		});
	});

	it('an outage reading capabilities keeps the form (same failure as a Go outage)', async () => {
		loadCapabilities.mockImplementation(() => Promise.reject(error(503, 'down')));
		expect(await authoriseAction(cookies, P.identityTenantsUpdate, { a: 1 })).toMatchObject({
			status: 503,
			data: { values: { a: 1 }, formErrorKey: 'auth.errors.upstreamUnavailable' }
		});
	});

	it('lets a redirect (session over) through', async () => {
		loadCapabilities.mockImplementation(() => Promise.reject(redirect(303, '/signin')));
		await expect(authoriseAction(cookies, P.identityTenantsUpdate, {})).rejects.toMatchObject({
			status: 303
		});
	});
});
