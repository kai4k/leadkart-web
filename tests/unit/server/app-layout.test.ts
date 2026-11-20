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
		route: { id: '/(app)/dashboard' },
		untrack: <T>(fn: () => T): T => fn(),
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

describe('(app) layout: re-runs when the ROUTE changes, not when only the search changes', () => {
	/**
	 * A stand-in for SvelteKit's dependency tracking: anything read outside `untrack` is a
	 * dependency (a change of it re-runs the load). `route.id` is the route; the URL covers
	 * pathname AND search (a `?q=` change), so a tracked URL read would re-run the guards and call
	 * Go for capabilities on every filter keystroke.
	 */
	async function trackedReads(path: string) {
		const tracked = { route: 0, url: 0 };
		let untracked = false;
		const url = new URL(`http://x${path}`);
		const watch = (u: URL): URL =>
			new Proxy(u, {
				get(target, prop) {
					if (!untracked) tracked.url += 1;
					const v = Reflect.get(target, prop, target) as unknown;
					return typeof v === 'function' ? (v as () => unknown).bind(target) : v;
				}
			});
		loadCapabilities.mockResolvedValue({ person_id: 'p', effective_permissions: [] });
		await (load as unknown as (e: never) => Promise<unknown>)({
			cookies: {
				get: (n: string) => (n === 'lk_access' ? 'tok' : undefined),
				set: vi.fn(),
				delete: vi.fn()
			},
			url: watch(url),
			route: {
				get id() {
					tracked.route += 1;
					return '/(app)/leads';
				}
			},
			untrack: <T>(fn: () => T): T => {
				untracked = true;
				try {
					return fn();
				} finally {
					untracked = false;
				}
			},
			locals: {},
			depends
		} as never);
		return tracked;
	}

	it('depends on the route (a route change re-runs it, so every guard sees fresh capabilities)', async () => {
		expect((await trackedReads('/leads')).route).toBeGreaterThan(0);
	});

	it('does not depend on the URL: a search-only change (?q=) does not re-run it', async () => {
		expect((await trackedReads('/leads?q=abc')).url).toBe(0);
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

describe('(app) layout: a dead scope cookie is cleared everywhere except in the scope tree', () => {
	const runAt = (path: string) =>
		(load as unknown as (e: never) => Promise<unknown>)({
			cookies: {
				get: (n: string) => (n === 'lk_access' ? 'tok' : undefined),
				set: vi.fn(),
				delete: vi.fn()
			},
			url: new URL(`http://x${path}`),
			route: { id: '/(app)/x' },
			untrack: <T>(fn: () => T): T => fn(),
			locals: {},
			depends
		} as never);

	it.each([
		['/operator/scope', false],
		['/operator/scope/members', false],
		['/operator/scopes', true],
		['/operator/scope-x/y', true]
	])('on %s the dead cookie is cleared: %s', async (path, cleared) => {
		clearOperatorScope.mockClear();
		loadCapabilities.mockResolvedValue({ person_id: 'p', effective_permissions: [] });
		readOperatorScope.mockReturnValueOnce({ state: 'invalid' });
		await runAt(path);
		expect(clearOperatorScope).toHaveBeenCalledTimes(cleared ? 1 : 0);
	});
});
