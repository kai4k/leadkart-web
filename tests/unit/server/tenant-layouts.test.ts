/**
 * The two layouts that load a tenant share ONE gateway call (`loadTenant`), and neither
 * reaches Go before the section guard (they await `parent()`, which rethrows its redirect).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirect } from '@sveltejs/kit';

const loadTenant = vi.hoisted(() => vi.fn());
const ownTenantId = vi.hoisted(() => vi.fn(() => 'own-tenant'));
vi.mock('#lib/features/tenant/server.ts', () => ({ loadTenant, ownTenantId }));
const readOperatorScope = vi.hoisted(() => vi.fn());
const clearOperatorScope = vi.hoisted(() => vi.fn());
vi.mock('#lib/server/scope.ts', () => ({ readOperatorScope, clearOperatorScope }));

import { load as settingsLoad } from '../../../src/routes/(app)/settings/tenant/+layout.server.ts';
import { load as scopeLoad } from '../../../src/routes/(app)/operator/scope/+layout.server.ts';

const TENANT = { id: 'scoped-id', slug: 'acme' };
const cookies = {} as never;
const denied = () => Promise.reject(redirect(303, '/dashboard'));
const run = (fn: unknown, parent: () => Promise<unknown>) =>
	(fn as (e: never) => Promise<unknown>)({ cookies, parent } as never);

beforeEach(() => {
	loadTenant.mockReset();
	readOperatorScope.mockReset();
	clearOperatorScope.mockReset();
});

describe('own-tenant settings layout', () => {
	it('loads the caller’s own tenant, unscoped, through the gateway', async () => {
		loadTenant.mockResolvedValue({ status: 'ok', tenant: TENANT });
		await expect(run(settingsLoad, () => Promise.resolve({}))).resolves.toEqual({
			tenant: TENANT
		});
		expect(loadTenant).toHaveBeenCalledWith(cookies, 'own-tenant', { scoped: false });
	});

	it('makes no Go call when the section guard refuses', async () => {
		await expect(run(settingsLoad, denied)).rejects.toMatchObject({ status: 303 });
		expect(loadTenant).not.toHaveBeenCalled();
	});

	it('a missing own tenant is a 404 page', async () => {
		loadTenant.mockResolvedValue({ status: 'not_found' });
		await expect(run(settingsLoad, () => Promise.resolve({}))).rejects.toMatchObject({
			status: 404
		});
	});
});

describe('operator scope layout', () => {
	it('loads the scoped tenant through the same gateway call', async () => {
		readOperatorScope.mockReturnValue({ state: 'valid', scope: { id: 'scoped-id' } });
		loadTenant.mockResolvedValue({ status: 'ok', tenant: TENANT });
		await expect(run(scopeLoad, () => Promise.resolve({}))).resolves.toEqual({ tenant: TENANT });
		expect(loadTenant).toHaveBeenCalledWith(cookies, 'scoped-id');
	});

	it('makes no Go call when the section guard refuses', async () => {
		readOperatorScope.mockReturnValue({ state: 'valid', scope: { id: 'scoped-id' } });
		await expect(run(scopeLoad, denied)).rejects.toMatchObject({ status: 303 });
		expect(loadTenant).not.toHaveBeenCalled();
	});

	it('no scope cookie: back to the tenant list, no Go call; an invalid one is dropped', async () => {
		readOperatorScope.mockReturnValue({ state: 'invalid' });
		await expect(run(scopeLoad, () => Promise.resolve({}))).rejects.toMatchObject({
			status: 303,
			location: '/operator/tenants'
		});
		expect(clearOperatorScope).toHaveBeenCalledTimes(1);
		expect(loadTenant).not.toHaveBeenCalled();
	});

	it('a tenant that no longer exists drops the scope cookie', async () => {
		readOperatorScope.mockReturnValue({ state: 'valid', scope: { id: 'scoped-id' } });
		loadTenant.mockResolvedValue({ status: 'not_found' });
		await expect(run(scopeLoad, () => Promise.resolve({}))).rejects.toMatchObject({
			status: 303,
			location: '/operator/tenants'
		});
		expect(clearOperatorScope).toHaveBeenCalledTimes(1);
	});
});
