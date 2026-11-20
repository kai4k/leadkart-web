import { beforeEach, describe, expect, it, vi } from 'vitest';
import { error, redirect } from '@sveltejs/kit';

const loadCapabilities = vi.hoisted(() => vi.fn());
const readOperatorScope = vi.hoisted(() => vi.fn(() => ({ state: 'none' }) as { state: string }));
vi.mock('#lib/server/capabilities.ts', () => ({ loadCapabilities }));
vi.mock('#lib/server/scope.ts', () => ({
	readOperatorScope,
	scopeFingerprint: (r: { state: string }) => (r.state === 'valid' ? 'fp-valid' : r.state)
}));

import {
	authoriseAction,
	callGoForAction,
	failForm,
	zodFieldMessages
} from '#lib/server/form-action.ts';
import { z } from 'zod';
import { P } from '#lib/features/auth/permissions.ts';
import { caps } from '../../support/go-personas.ts';
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

	it('rethrows a programming error: it is not an outage and must reach the logger', async () => {
		await expect(
			callGoForAction(() =>
				Promise.reject(new TypeError("Cannot read properties of undefined (reading 'x')"))
			)
		).rejects.toBeInstanceOf(TypeError);
		await expect(callGoForAction(() => Promise.reject(new RangeError('bad')))).rejects.toThrow(
			'bad'
		);
	});

	it('rethrows an HttpError that is not a bad-gateway family status', async () => {
		await expect(callGoForAction(() => Promise.reject(error(500, 'boom')))).rejects.toMatchObject({
			status: 500
		});
	});

	it('maps a refused / reset connection (fetch failed with a cause code) and 502 / 504 HttpErrors', async () => {
		const refused = new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } });
		expect(await callGoForAction(() => Promise.reject(refused))).toMatchObject({
			ok: false,
			status: 502
		});
		expect(await callGoForAction(() => Promise.reject(error(504, 'x')))).toMatchObject({
			ok: false,
			status: 504
		});
	});

	it('lets a redirect (session over) through', async () => {
		await expect(
			callGoForAction(() => Promise.reject(redirect(303, '/signin')))
		).rejects.toMatchObject({ status: 303 });
	});
});

describe('authoriseAction', () => {
	/** An action on the tenant-settings route (an `own` nav entry) from a page rendered with context `ctx`. */
	const at = (
		routeId: string | null = '/(app)/settings/tenant/profile',
		ctx: string | null = 'none'
	) => ({
		event: { cookies: {}, route: { id: routeId } } as never,
		form: new URLSearchParams(ctx === null ? {} : { scope_context: ctx }) as unknown as FormData
	});
	const authorise = (permission: string | readonly string[], values: object, where = at()) =>
		authoriseAction(where.event, where.form, permission, values);
	beforeEach(() => {
		loadCapabilities.mockReset();
		readOperatorScope.mockReturnValue({ state: 'none' });
	});

	it('is null (go ahead) when the permission is held', async () => {
		loadCapabilities.mockResolvedValue(caps([P.identityTenantsUpdate]));
		expect(await authorise(P.identityTenantsUpdate, { a: 1 })).toBeNull();
	});

	it('any-of: one held permission is enough', async () => {
		loadCapabilities.mockResolvedValue(caps([P.platformUsersManage]));
		expect(await authorise([P.identityUsersCreate, P.platformUsersManage], {})).toBeNull();
	});

	it('refuses with a 403 that keeps the values and speaks an i18n key, never Go text', async () => {
		loadCapabilities.mockResolvedValue(caps([P.identityTenantsView]));
		const r = await authorise(P.identityTenantsUpdate, { a: 1 });
		expect(r).toMatchObject({
			status: 403,
			data: { values: { a: 1 }, formErrorKey: 'auth.errors.forbidden' }
		});
	});

	it('does not infer: is_super_user / tenant.admin alone hold nothing', async () => {
		loadCapabilities.mockResolvedValue(caps(['tenant.admin'], { is_super_user: true }));
		expect(await authorise(P.identityTenantsUpdate, {})).toMatchObject({
			status: 403
		});
	});

	it('applies the tenant-context restriction (a blocked write is refused in context)', async () => {
		readOperatorScope.mockReturnValue({ state: 'valid' });
		loadCapabilities.mockResolvedValue(caps([P.crmLeadsManage]));
		expect(await authorise(P.crmLeadsManage, {}, at('/(app)/leads', 'fp-valid'))).toMatchObject({
			status: 403
		});
	});

	describe('the context rule comes from the matched route, as in the page guard', () => {
		it('an own-tenant route refuses inside a tenant context, with the context copy', async () => {
			readOperatorScope.mockReturnValue({ state: 'valid' });
			loadCapabilities.mockResolvedValue(caps([P.identityTenantsUpdate]));
			expect(await authorise(P.identityTenantsUpdate, {}, at(undefined, 'fp-valid'))).toMatchObject(
				{
					status: 403,
					data: { formErrorKey: 'auth.errors.tenantContext' }
				}
			);
		});
		it('a scope route refuses outside a tenant context', async () => {
			loadCapabilities.mockResolvedValue(caps([P.platformTenantsManage]));
			expect(
				await authorise(P.platformTenantsManage, {}, at('/(app)/operator/scope/settings'))
			).toMatchObject({ status: 403, data: { formErrorKey: 'auth.errors.forbidden' } });
		});
		it('a route with no nav entry fails closed', async () => {
			loadCapabilities.mockResolvedValue(caps([P.identityTenantsUpdate]));
			expect(await authorise(P.identityTenantsUpdate, {}, at('/(app)/nowhere'))).toMatchObject({
				status: 403
			});
			expect(await authorise(P.identityTenantsUpdate, {}, at(null))).toMatchObject({ status: 403 });
		});
	});

	describe('the form must come from a page that shows the current context', () => {
		it('a form with no fingerprint is refused before anything is read from Go', async () => {
			expect(await authorise(P.identityTenantsUpdate, { a: 1 }, at(undefined, null))).toMatchObject(
				{
					status: 409,
					data: { values: { a: 1 }, formErrorKey: 'auth.errors.scopeChanged' }
				}
			);
			expect(loadCapabilities).not.toHaveBeenCalled();
		});
		it('a form rendered in own context is refused once another tab entered a tenant', async () => {
			readOperatorScope.mockReturnValue({ state: 'valid' });
			expect(await authorise(P.identityTenantsUpdate, {}, at(undefined, 'none'))).toMatchObject({
				status: 409,
				data: { formErrorKey: 'auth.errors.scopeChanged' }
			});
			expect(loadCapabilities).not.toHaveBeenCalled();
		});
		it('a form rendered in a tenant context is refused after the context was exited', async () => {
			expect(await authorise(P.identityTenantsUpdate, {}, at(undefined, 'fp-valid'))).toMatchObject(
				{
					status: 409
				}
			);
		});
	});

	it('no usable capabilities means the session is over: redirect to sign-in', async () => {
		loadCapabilities.mockResolvedValue(null);
		await expect(authorise(P.identityTenantsUpdate, {})).rejects.toMatchObject({
			status: 303,
			location: '/signin'
		});
	});

	it('an outage reading capabilities keeps the form (same failure as a Go outage)', async () => {
		loadCapabilities.mockImplementation(() => Promise.reject(error(503, 'down')));
		expect(await authorise(P.identityTenantsUpdate, { a: 1 })).toMatchObject({
			status: 503,
			data: { values: { a: 1 }, formErrorKey: 'auth.errors.upstreamUnavailable' }
		});
	});

	it('rethrows a programming error: it is not an outage and must reach the logger', async () => {
		await expect(
			callGoForAction(() =>
				Promise.reject(new TypeError("Cannot read properties of undefined (reading 'x')"))
			)
		).rejects.toBeInstanceOf(TypeError);
		await expect(callGoForAction(() => Promise.reject(new RangeError('bad')))).rejects.toThrow(
			'bad'
		);
	});

	it('rethrows an HttpError that is not a bad-gateway family status', async () => {
		await expect(callGoForAction(() => Promise.reject(error(500, 'boom')))).rejects.toMatchObject({
			status: 500
		});
	});

	it('maps a refused / reset connection (fetch failed with a cause code) and 502 / 504 HttpErrors', async () => {
		const refused = new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } });
		expect(await callGoForAction(() => Promise.reject(refused))).toMatchObject({
			ok: false,
			status: 502
		});
		expect(await callGoForAction(() => Promise.reject(error(504, 'x')))).toMatchObject({
			ok: false,
			status: 504
		});
	});

	it('lets a redirect (session over) through', async () => {
		loadCapabilities.mockImplementation(() => Promise.reject(redirect(303, '/signin')));
		await expect(authorise(P.identityTenantsUpdate, {})).rejects.toMatchObject({
			status: 303
		});
	});
});

describe('failForm', () => {
	it('is always { values, fieldKeys, fieldMessages, formErrorKey }, defaults filled', () => {
		expect(failForm(422, {})).toMatchObject({
			status: 422,
			data: { values: {}, fieldKeys: {}, fieldMessages: {}, formErrorKey: null }
		});
	});

	it('carries the parts and the extra facts a page needs', () => {
		const r = failForm(
			423,
			{ values: { email: 'a@b.co' }, fieldKeys: { email: 'k' }, formErrorKey: 'banner' },
			{ retryAfterSeconds: 9 }
		);
		expect(r.data).toEqual({
			values: { email: 'a@b.co' },
			fieldKeys: { email: 'k' },
			fieldMessages: {},
			formErrorKey: 'banner',
			retryAfterSeconds: 9
		});
	});
});

describe('zodFieldMessages', () => {
	it('is the first message per (dotted) field', () => {
		const r = z
			.object({ a: z.string().min(2, 'a short'), b: z.object({ c: z.number('c nan') }) })
			.safeParse({ a: '', b: { c: 'x' } });
		expect(r.success ? {} : zodFieldMessages(r.error)).toEqual({ a: 'a short', 'b.c': 'c nan' });
	});
});
