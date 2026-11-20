/**
 * Entering and leaving a tenant context: one flow each. After either, the (app) layout load is
 * invalidated (so `inTenantContext` follows the cookie) and the previous context's cache is gone.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ goto: vi.fn(), invalidate: vi.fn() }));
vi.mock('$app/navigation', () => nav);
vi.mock('$app/paths', () => ({ resolve: (p: string) => `/${p}` }));
const gw = vi.hoisted(() => ({ enterScope: vi.fn(), exitScope: vi.fn() }));
vi.mock('#lib/features/operator/scope/api.ts', () => gw);
vi.mock('#lib/features/operator/scope/api', () => gw);
vi.mock('#lib/utils/private-caches.ts', () => ({ clearPrivateCaches: vi.fn() }));
const del = vi.hoisted(() => vi.fn());
vi.mock('#lib/api/client.ts', () => ({ api: { delete: del } }));
vi.mock('#lib/api/client', () => ({ api: { delete: del } }));

import { enterTenantContext, exitTenantContext } from '#lib/features/operator/scope/service.ts';
import { exitOperatorScope } from '#lib/api/operator-scope.ts';

const qc = () => ({ clear: vi.fn() }) as never as { clear: ReturnType<typeof vi.fn> };

beforeEach(() => {
	vi.clearAllMocks();
	nav.invalidate.mockResolvedValue(undefined);
	nav.goto.mockResolvedValue(undefined);
});

describe('enterTenantContext (tenants list and command palette share it)', () => {
	it('sets the cookie, clears the cache, re-runs the (app) layout, then navigates', async () => {
		gw.enterScope.mockResolvedValue({});
		const client = qc();
		await enterTenantContext(client as never, 'acme');
		expect(gw.enterScope).toHaveBeenCalledWith({ slug: 'acme' });
		expect(client.clear).toHaveBeenCalledTimes(1);
		expect(nav.invalidate).toHaveBeenCalledWith('app:scope');
		expect(nav.goto).toHaveBeenCalledWith('/operator/scope/profile');
		expect(nav.invalidate.mock.invocationCallOrder[0]).toBeLessThan(
			nav.goto.mock.invocationCallOrder[0]
		);
	});

	it('a refused entry changes nothing', async () => {
		gw.enterScope.mockRejectedValue(new Error('403'));
		const client = qc();
		await expect(enterTenantContext(client as never, 'acme')).rejects.toThrow();
		expect(client.clear).not.toHaveBeenCalled();
		expect(nav.invalidate).not.toHaveBeenCalled();
		expect(nav.goto).not.toHaveBeenCalled();
	});
});

describe('exit', () => {
	it('exitTenantContext clears the cache and navigates back to the tenant list', async () => {
		gw.exitScope.mockResolvedValue(undefined);
		const client = qc();
		await exitTenantContext(client as never);
		expect(client.clear).toHaveBeenCalledTimes(1);
		expect(nav.goto).toHaveBeenCalledWith('/operator/tenants', { replace: true });
	});

	it('the shared BFF exit (scope layout AND session guard) re-runs the (app) layout, so inTenantContext turns false', async () => {
		del.mockResolvedValue(undefined);
		await exitOperatorScope();
		expect(del).toHaveBeenCalledWith('/operator/scope');
		expect(nav.invalidate).toHaveBeenCalledWith('app:scope');
	});
});
