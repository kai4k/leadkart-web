import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, type MutationObserver } from '@tanstack/svelte-query';
import type * as TanstackQuery from '@tanstack/svelte-query';

const h = vi.hoisted(() => ({ qc: undefined as unknown as QueryClient }));
vi.mock('@tanstack/svelte-query', async (importOriginal) => {
	const actual = await importOriginal<typeof TanstackQuery>();
	return {
		...actual,
		createQuery: vi.fn(),
		useQueryClient: () => h.qc,
		createMutation: (opts: () => never) => new actual.MutationObserver(h.qc, opts())
	};
});
vi.mock('$ui', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
const gw = vi.hoisted(() => ({
	registerTenant: vi.fn(),
	suspendTenant: vi.fn(),
	activateTenant: vi.fn()
}));
const nav = vi.hoisted(() => ({ refreshAll: vi.fn(() => Promise.resolve()) }));
vi.mock('$app/navigation', () => nav);
vi.mock('#lib/features/operator/tenants/api.ts', () => gw);
vi.mock('#lib/features/operator/tenants/api', () => gw);

import {
	activateTenantMutation,
	registerTenantMutation,
	suspendTenantMutation
} from '#lib/features/operator/tenants/queries.ts';

beforeEach(() => {
	vi.clearAllMocks();
	h.qc = new QueryClient();
});

describe('tenant mutations', () => {
	it('register shows its error in the drawer banner, so the global toast is skipped', () => {
		const m = registerTenantMutation() as unknown as { options: { meta?: object } };
		expect(m.options.meta).toEqual({ skipErrorToast: true });
	});

	describe('lifecycle mutations', () => {
		let invalidated: unknown[][];
		beforeEach(() => {
			invalidated = [];
			vi.spyOn(h.qc, 'invalidateQueries').mockImplementation((f) => {
				invalidated.push([...(f?.queryKey ?? [])]);
				return Promise.resolve();
			});
			gw.suspendTenant.mockResolvedValue(undefined);
			gw.activateTenant.mockResolvedValue(undefined);
		});
		const suspend = () =>
			suspendTenantMutation() as unknown as MutationObserver<
				void,
				Error,
				{ id: string; reason: string }
			>;

		it('invalidates the tenants root once', async () => {
			window.history.pushState({}, '', '/operator/tenants');
			await suspend().mutate({ id: 't1', reason: 'x' });
			expect(invalidated).toEqual([['tenants']]);
		});
		it('inside the scope tree the server-loaded tenant is refreshed', async () => {
			window.history.pushState({}, '', '/operator/scope/settings');
			await suspend().mutate({ id: 't1', reason: 'x' });
			expect(nav.refreshAll).toHaveBeenCalledTimes(1);
		});
		it('outside the scope tree nothing is refreshed', async () => {
			window.history.pushState({}, '', '/operator/tenants');
			await suspend().mutate({ id: 't1', reason: 'x' });
			const activate = activateTenantMutation() as unknown as MutationObserver<void, Error, string>;
			await activate.mutate('t1');
			expect(nav.refreshAll).not.toHaveBeenCalled();
		});
	});
});
