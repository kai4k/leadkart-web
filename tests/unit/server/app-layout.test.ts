import { describe, expect, it, vi } from 'vitest';
import { error } from '@sveltejs/kit';

const loadCapabilities = vi.hoisted(() => vi.fn());
vi.mock('#lib/server/capabilities.ts', () => ({ loadCapabilities }));
const readOperatorScope = vi.hoisted(() => vi.fn(() => ({ state: 'none' }) as { state: string }));
const clearOperatorScope = vi.hoisted(() => vi.fn());
vi.mock('#lib/server/scope.ts', () => ({ readOperatorScope, clearOperatorScope }));

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

	it('declares the scope dependency, so entering / leaving a tenant context can re-run it', async () => {
		loadCapabilities.mockResolvedValueOnce({ person_id: 'p' });
		await run();
		expect(depends).toHaveBeenCalledWith('app:scope');
	});

	it('usable capabilities pass through', async () => {
		loadCapabilities.mockResolvedValueOnce({ person_id: 'p' });
		await expect(run()).resolves.toEqual({
			capabilities: { person_id: 'p' },
			inTenantContext: false
		});
	});

	it('inTenantContext is true only for a valid operator-scope cookie', async () => {
		loadCapabilities.mockResolvedValue({ person_id: 'p' });
		readOperatorScope.mockReturnValueOnce({ state: 'valid' });
		await expect(run()).resolves.toMatchObject({ inTenantContext: true });
		readOperatorScope.mockReturnValueOnce({ state: 'invalid' });
		await expect(run()).resolves.toMatchObject({ inTenantContext: false });
		expect(clearOperatorScope).toHaveBeenCalledTimes(1);
		readOperatorScope.mockReturnValueOnce({ state: 'none' });
		await expect(run()).resolves.toMatchObject({ inTenantContext: false });
	});
});
