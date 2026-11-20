/**
 * The exit flow against a REAL QueryClient and a real observer, in the order the browser runs it:
 * the cookie is deleted, the (app) layout is re-run (its guard redirects off the scope tree and the
 * destination page MOUNTS and starts its queries), and only then is the old context's cache dealt
 * with. A mock QueryClient cannot see that order; the tenants list stuck on a spinner after Exit
 * was exactly that: `qc.clear()` after the navigation destroyed the freshly mounted queries.
 */
import { QueryClient, QueryObserver } from '@tanstack/svelte-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ goto: vi.fn(), invalidate: vi.fn() }));
vi.mock('$app/navigation', () => nav);
vi.mock('$app/paths', () => ({ resolve: (p: string) => `/${p}` }));
const gw = vi.hoisted(() => ({ enterScope: vi.fn(), exitScope: vi.fn() }));
vi.mock('#lib/features/operator/scope/api.ts', () => gw);
vi.mock('#lib/features/operator/scope/api', () => gw);
const del = vi.hoisted(() => vi.fn());
vi.mock('#lib/api/client.ts', () => ({ api: { deleteJson: del } }));
vi.mock('#lib/api/client', () => ({ api: { deleteJson: del } }));

import { exitOperatorScope } from '#lib/api/operator-scope.ts';
import { enterTenantContext, exitTenantContext } from '#lib/features/operator/scope/service.ts';

let qc: QueryClient;
let tenantsList: QueryObserver<string[], Error, string[], string[], string[]>;
let stop: (() => void) | undefined;

/** The page the guard redirects to: mounts while `invalidate('app:scope')` is still in flight. */
function mountTenantsPage() {
	tenantsList = new QueryObserver(qc, {
		queryKey: ['tenants', 'list'],
		// A real request takes time: the fetch is still in flight when the flow reaches the cache.
		queryFn: () => new Promise<string[]>((r) => setTimeout(() => r(['acme', 'globex']), 20))
	});
	stop = tenantsList.subscribe(() => {});
}

beforeEach(() => {
	vi.clearAllMocks();
	stop?.();
	stop = undefined;
	qc = new QueryClient();
	gw.exitScope.mockImplementation(() => exitOperatorScope());
	gw.enterScope.mockResolvedValue('fp-b');
	del.mockResolvedValue({ scope_context: 'fp-none' });
	nav.goto.mockResolvedValue(undefined);
	nav.invalidate.mockImplementation(async () => {
		await Promise.resolve();
		mountTenantsPage();
	});
});

describe('exitTenantContext with a real QueryClient', () => {
	it('the tenants page that mounts during the layout refresh ends up with its rows', async () => {
		await exitTenantContext(qc);
		await vi.waitFor(() => expect(tenantsList.getCurrentResult().status).toBe('success'));
		expect(tenantsList.getCurrentResult().data).toEqual(['acme', 'globex']);
	});

	it("nothing of the left tenant's cache is still there afterwards", async () => {
		qc.setQueryData(['users', 'list'], ['someone in the tenant']);
		await exitTenantContext(qc);
		expect(qc.getQueryData(['users', 'list'])).toBeUndefined();
	});
});

describe('enterTenantContext with a real QueryClient', () => {
	it("drops the previous context's cache before the first scoped page can read it", async () => {
		qc.setQueryData(['users', 'list'], ['own-tenant user']);
		nav.goto.mockImplementation(() => {
			// The scope page reads the cache the moment it is navigated to.
			expect(qc.getQueryData(['users', 'list'])).toBeUndefined();
			return Promise.resolve();
		});
		await enterTenantContext(qc, 'acme');
		expect(nav.goto).toHaveBeenCalled();
	});
});
