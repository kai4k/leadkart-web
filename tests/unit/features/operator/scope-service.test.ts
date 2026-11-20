/**
 * Entering and leaving a tenant context: one flow each. After either, the (app) layout load is
 * invalidated (so `inTenantContext` and the page's fingerprint follow the cookie), the previous
 * context's cache is gone, and the other tabs are told. The ORDER (with a real QueryClient) is
 * pinned in scope-service-ordering.test.ts.
 *
 * A change made by ANOTHER tab is not followed in place: components of this tab that stay mounted
 * (an open form, typed values, a selection) would be re-bound to the new context's fingerprint and
 * a submit would write there. It is a hard reset (cache cleared, page reloaded). ONE function
 * (`scopeChangedElsewhere`) decides own versus foreign.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ goto: vi.fn(), invalidate: vi.fn() }));
vi.mock('$app/navigation', () => nav);
vi.mock('$app/paths', () => ({ resolve: (p: string) => `/${p}` }));
const gw = vi.hoisted(() => ({ enterScope: vi.fn(), exitScope: vi.fn() }));
vi.mock('#lib/features/operator/scope/api.ts', () => gw);
vi.mock('#lib/features/operator/scope/api', () => gw);
const del = vi.hoisted(() => vi.fn());
vi.mock('#lib/api/client.ts', () => ({ api: { delete: del } }));
vi.mock('#lib/api/client', () => ({ api: { delete: del } }));

import type * as ScopeModule from '#lib/api/operator-scope.ts';
import type * as ServiceModule from '#lib/features/operator/scope/service.ts';

const calls: string[] = [];
const qc = () =>
	({
		removeQueries: vi.fn(() => void calls.push('removeInactive')),
		resetQueries: vi.fn(() => {
			calls.push('reset');
			return Promise.resolve();
		}),
		clear: vi.fn(() => void calls.push('clear'))
	}) as never as {
		removeQueries: ReturnType<typeof vi.fn>;
		resetQueries: ReturnType<typeof vi.fn>;
		clear: ReturnType<typeof vi.fn>;
	};

/** A BroadcastChannel registry: a message reaches the OTHER objects of the same name, never the sender. */
class FakeChannel {
	static all: FakeChannel[] = [];
	listeners = new Set<() => void>();
	constructor(public name: string) {
		FakeChannel.all.push(this);
	}
	postMessage() {
		for (const c of FakeChannel.all) {
			if (c !== this && c.name === this.name) c.listeners.forEach((l) => l());
		}
	}
	addEventListener(_t: string, l: () => void) {
		this.listeners.add(l);
	}
	removeEventListener(_t: string, l: () => void) {
		this.listeners.delete(l);
	}
}

const reload = vi.fn(() => void calls.push('reload'));

/** A fresh copy of the modules (its own channel, its own flags): a tab. */
async function tab(): Promise<{
	scope: typeof ScopeModule;
	service: typeof ServiceModule;
}> {
	vi.resetModules();
	return {
		scope: await import('#lib/api/operator-scope.ts'),
		service: await import('#lib/features/operator/scope/service.ts')
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	calls.length = 0;
	FakeChannel.all = [];
	vi.stubGlobal('BroadcastChannel', FakeChannel);
	vi.stubGlobal('location', { reload, pathname: '/leads' });
	nav.invalidate.mockImplementation(() => {
		calls.push('invalidate');
		return Promise.resolve();
	});
	nav.goto.mockImplementation(() => {
		calls.push('goto');
		return Promise.resolve();
	});
});

describe('enterTenantContext (tenants list and command palette share it)', () => {
	it('sets the cookie, drops unshown cache, re-runs the (app) layout, resets what is mounted, then navigates', async () => {
		const { service } = await tab();
		gw.enterScope.mockResolvedValue({});
		const client = qc();
		await service.enterTenantContext(client as never, 'acme');
		expect(gw.enterScope).toHaveBeenCalledWith({ slug: 'acme' });
		expect(nav.invalidate).toHaveBeenCalledWith('app:scope');
		expect(nav.goto).toHaveBeenCalledWith('/operator/scope/profile');
		expect(calls).toEqual(['removeInactive', 'invalidate', 'reset', 'goto']);
		expect(reload).not.toHaveBeenCalled(); // the tab's own change keeps the in-place flow
	});

	it('a refused entry changes nothing', async () => {
		const { service } = await tab();
		gw.enterScope.mockRejectedValue(new Error('403'));
		const client = qc();
		await expect(service.enterTenantContext(client as never, 'acme')).rejects.toThrow();
		expect(calls).toEqual([]);
		expect(client.removeQueries).not.toHaveBeenCalled();
	});
});

describe('exit', () => {
	it('exitTenantContext follows the change, then navigates back to the tenant list', async () => {
		const { service } = await tab();
		gw.exitScope.mockResolvedValue(undefined);
		const client = qc();
		await service.exitTenantContext(client as never);
		expect(calls).toEqual(['removeInactive', 'invalidate', 'reset', 'goto']);
		expect(nav.goto).toHaveBeenCalledWith('/operator/tenants', { replace: true });
		expect(reload).not.toHaveBeenCalled();
	});

	it('the shared BFF exit only changes the cookie and the offline copies; following it is separate', async () => {
		const { scope } = await tab();
		del.mockResolvedValue(undefined);
		await scope.exitOperatorScope();
		expect(del).toHaveBeenCalledWith('/operator/scope');
		expect(nav.invalidate).not.toHaveBeenCalled();
	});

	it('the session guard leaves through the same two steps', async () => {
		const { scope } = await tab();
		del.mockResolvedValue(undefined);
		await scope.leaveTenantContext(qc() as never);
		expect(del).toHaveBeenCalledWith('/operator/scope');
		expect(calls).toEqual(['removeInactive', 'invalidate', 'reset']);
	});
});

describe('the other tabs of the browser', () => {
	it("an enter or exit in one tab reloads the others: cache cleared, and no layout re-run that leaves their components mounted on the new context's fingerprint", async () => {
		const mine = qc();
		const theirs = qc();
		const mineTab = await tab();
		const otherTab = await tab(); // a second tab is a second copy of the module (its own channel object)
		const stop = otherTab.scope.listenForScopeChanges(theirs as never);
		del.mockResolvedValue(undefined);
		await mineTab.scope.leaveTenantContext(mine as never);
		expect(theirs.clear).toHaveBeenCalledTimes(1);
		expect(reload).toHaveBeenCalledTimes(1);
		// Only the changing tab re-ran its layout.
		expect(nav.invalidate).toHaveBeenCalledTimes(1);
		expect(theirs.resetQueries).not.toHaveBeenCalled();
		expect(calls.indexOf('clear')).toBeLessThan(calls.indexOf('reload'));
		stop();
	});

	it('a tab does not follow its own announcement', async () => {
		const { scope } = await tab();
		const a = qc();
		const stopA = scope.listenForScopeChanges(a as never);
		del.mockResolvedValue(undefined);
		await scope.leaveTenantContext(a as never);
		await Promise.resolve();
		expect(a.resetQueries).toHaveBeenCalledTimes(1); // once, from its own call
		expect(reload).not.toHaveBeenCalled();
		stopA();
	});

	it('stopping the listener stops following', async () => {
		const mineTab = await tab();
		const otherTab = await tab();
		const theirs = qc();
		const stop = otherTab.scope.listenForScopeChanges(theirs as never);
		stop();
		del.mockResolvedValue(undefined);
		await mineTab.scope.leaveTenantContext(qc() as never);
		await Promise.resolve();
		expect(reload).not.toHaveBeenCalled();
		expect(theirs.clear).not.toHaveBeenCalled();
	});

	it('announcements that arrive in a burst reload once', async () => {
		const { scope } = await tab();
		const client = qc();
		expect(scope.scopeChangedElsewhere(client as never, 'announcement')).toBe(true);
		expect(scope.scopeChangedElsewhere(client as never, 'announcement')).toBe(false);
		expect(scope.scopeChangedElsewhere(client as never, 'refusal')).toBe(false);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('a sign-in or sign-out announces too, and the other tabs reload', async () => {
		const mineTab = await tab();
		const otherTab = await tab();
		const stop = otherTab.scope.listenForScopeChanges(qc() as never);
		mineTab.scope.announceContextChange();
		expect(reload).toHaveBeenCalledTimes(1);
		stop();
	});
});

describe('a refusal this tab did not cause', () => {
	it('reloads (a refused call says the page is behind the cookie)', async () => {
		const { scope } = await tab();
		const client = qc();
		expect(scope.scopeChangedElsewhere(client as never, 'refusal')).toBe(true);
		expect(client.clear).toHaveBeenCalledTimes(1);
		expect(reload).toHaveBeenCalledTimes(1);
		expect(nav.invalidate).not.toHaveBeenCalled();
	});

	it("is ignored while this tab's own change is in flight: a refetch between the POST and the commit is not 'another tab'", async () => {
		const { scope } = await tab();
		const client = qc();
		let during: boolean | undefined;
		del.mockImplementation(() => {
			during = scope.scopeChangedElsewhere(client as never, 'refusal');
			return Promise.resolve();
		});
		await scope.leaveTenantContext(client as never);
		expect(during).toBe(false);
		expect(reload).not.toHaveBeenCalled();
		// ... and once the change is committed the same refusal IS foreign again.
		expect(scope.scopeChangedElsewhere(client as never, 'refusal')).toBe(true);
	});

	it("an announcement that arrives while this tab's own change is in flight reloads once it has committed", async () => {
		const { scope } = await tab();
		const client = qc();
		del.mockImplementation(() => {
			scope.scopeChangedElsewhere(client as never, 'announcement');
			expect(reload).not.toHaveBeenCalled();
			return Promise.resolve();
		});
		await scope.leaveTenantContext(client as never);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('a failed own change clears the in-flight flag', async () => {
		const { scope } = await tab();
		del.mockRejectedValue(new Error('offline'));
		await expect(scope.leaveTenantContext(qc() as never)).rejects.toThrow();
		expect(scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(true);
	});
});
