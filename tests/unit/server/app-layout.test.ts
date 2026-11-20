import { describe, expect, it, vi } from 'vitest';
import { error } from '@sveltejs/kit';

const loadCapabilities = vi.hoisted(() => vi.fn());
vi.mock('#lib/server/capabilities.ts', () => ({ loadCapabilities }));
const readOperatorScope = vi.hoisted(() => vi.fn(() => ({ state: 'none' }) as { state: string }));
const clearOperatorScope = vi.hoisted(() => vi.fn());
vi.mock('#lib/server/scope.ts', () => ({
	readOperatorScope,
	clearOperatorScope,
	scopeFingerprint: (r: { state: string }) => (r.state === 'valid' ? 'fp-valid' : r.state)
}));

import { load } from '../../../src/routes/(app)/+layout.server.ts';

const depends = vi.fn();
const event = () =>
	({
		cookies: {
			get: (n: string) => (n === 'lk_access' ? 'tok' : undefined),
			set: vi.fn(),
			delete: vi.fn()
		},
		url: new URL('http://x/dashboard'),
		locals: {},
		depends
	}) as never;
const run = () => (load as unknown as (e: never) => Promise<unknown>)(event());

describe('(app) layout: sign-in only for a real auth failure', () => {
	it('no usable capabilities (401 after refresh) -> redirect to sign-in with next', async () => {
		loadCapabilities.mockResolvedValueOnce(null);
		await expect(run()).rejects.toMatchObject({
			status: 303,
			location: '/signin?next=%2Fdashboard'
		});
	});

	it('Go answered 2xx with a body the web cannot read -> 502, never a sign-in loop', async () => {
		loadCapabilities.mockImplementationOnce(() => error(502, 'The service answered unexpectedly'));
		await expect(run()).rejects.toMatchObject({ status: 502 });
	});

	it('declares the scope and capabilities dependencies, so a tenant context change or a permission change can re-run it', async () => {
		loadCapabilities.mockResolvedValueOnce({ person_id: 'p' });
		await run();
		expect(depends).toHaveBeenCalledWith('app:scope', 'app:capabilities');
	});

	it('usable capabilities pass through', async () => {
		loadCapabilities.mockResolvedValueOnce({ person_id: 'p' });
		await expect(run()).resolves.toEqual({
			capabilities: { person_id: 'p' },
			inTenantContext: false,
			scopeContext: 'none'
		});
	});

	it('inTenantContext is true only for a valid operator-scope cookie', async () => {
		loadCapabilities.mockResolvedValue({
			person_id: 'p',
			effective_permissions: ['platform.tenants.view']
		});
		readOperatorScope.mockReturnValueOnce({ state: 'valid' });
		await expect(run()).resolves.toMatchObject({ inTenantContext: true });
		readOperatorScope.mockReturnValueOnce({ state: 'invalid' });
		await expect(run()).resolves.toMatchObject({ inTenantContext: false });
		expect(clearOperatorScope).toHaveBeenCalledTimes(1);
		readOperatorScope.mockReturnValueOnce({ state: 'none' });
		await expect(run()).resolves.toMatchObject({ inTenantContext: false });
	});

	it('hands the page the fingerprint of the context it is rendered in (never the tenant itself)', async () => {
		loadCapabilities.mockResolvedValue({
			person_id: 'p',
			effective_permissions: ['platform.tenants.view']
		});
		readOperatorScope.mockReturnValueOnce({
			state: 'valid',
			scope: { id: 'the-tenant-uuid', slug: 'acme', display_name: 'Acme' }
		} as never);
		const data = await run();
		expect(data).toMatchObject({ scopeContext: 'fp-valid' });
		expect(JSON.stringify(data)).not.toContain('the-tenant-uuid');
		expect(JSON.stringify(data)).not.toContain('acme');
	});

	it('an invalid cookie that is cleared here is no context at all: the page is told "none"', async () => {
		loadCapabilities.mockResolvedValue({ person_id: 'p' });
		readOperatorScope.mockReturnValueOnce({ state: 'invalid' });
		await expect(run()).resolves.toMatchObject({ scopeContext: 'none' });
	});
});

describe('(app) layout: an operator who lost the scope permission is not stuck in a context', () => {
	const VALID = { state: 'valid', scope: { id: 'u', slug: 's', display_name: 'd' } } as never;

	it('drops the scope cookie when the capabilities no longer carry platform.tenants.view', async () => {
		clearOperatorScope.mockClear();
		loadCapabilities.mockResolvedValue({
			person_id: 'p',
			effective_permissions: ['platform.users.view']
		});
		readOperatorScope.mockReturnValueOnce(VALID);
		await expect(run()).resolves.toMatchObject({ inTenantContext: false, scopeContext: 'none' });
		expect(clearOperatorScope).toHaveBeenCalledTimes(1);
	});

	it('keeps it while the permission is held', async () => {
		clearOperatorScope.mockClear();
		loadCapabilities.mockResolvedValue({
			person_id: 'p',
			effective_permissions: ['platform.tenants.view']
		});
		readOperatorScope.mockReturnValueOnce(VALID);
		await expect(run()).resolves.toMatchObject({ inTenantContext: true, scopeContext: 'fp-valid' });
		expect(clearOperatorScope).not.toHaveBeenCalled();
	});
});
