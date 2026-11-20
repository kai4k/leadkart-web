/**
 * Entering and leaving a tenant context: one flow each. After either, the (app) layout load is
 * invalidated (so `inTenantContext` and the page's fingerprint follow the cookie), the previous
 * context's cache is gone, and the other tabs are told. The ORDER (with a real QueryClient) is
 * pinned in scope-service-ordering.test.ts.
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

import {
	exitOperatorScope,
	followScopeChange,
	leaveTenantContext,
	listenForScopeChanges
} from '#lib/api/operator-scope.ts';
import { enterTenantContext, exitTenantContext } from '#lib/features/operator/scope/service.ts';

const calls: string[] = [];
const qc = () =>
	({
		removeQueries: vi.fn(() => void calls.push('removeInactive')),
		resetQueries: vi.fn(() => {
			calls.push('reset');
			return Promise.resolve();
		})
	}) as never as {
		removeQueries: ReturnType<typeof vi.fn>;
		resetQueries: ReturnType<typeof vi.fn>;
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

beforeEach(() => {
	vi.clearAllMocks();
	calls.length = 0;
	FakeChannel.all = [];
	vi.stubGlobal('BroadcastChannel', FakeChannel);
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
		gw.enterScope.mockResolvedValue({});
		const client = qc();
		await enterTenantContext(client as never, 'acme');
		expect(gw.enterScope).toHaveBeenCalledWith({ slug: 'acme' });
		expect(nav.invalidate).toHaveBeenCalledWith('app:scope');
		expect(nav.goto).toHaveBeenCalledWith('/operator/scope/profile');
		expect(calls).toEqual(['removeInactive', 'invalidate', 'reset', 'goto']);
	});

	it('a refused entry changes nothing', async () => {
		gw.enterScope.mockRejectedValue(new Error('403'));
		const client = qc();
		await expect(enterTenantContext(client as never, 'acme')).rejects.toThrow();
		expect(calls).toEqual([]);
		expect(client.removeQueries).not.toHaveBeenCalled();
	});
});

describe('exit', () => {
	it('exitTenantContext follows the change, then navigates back to the tenant list', async () => {
		gw.exitScope.mockResolvedValue(undefined);
		const client = qc();
		await exitTenantContext(client as never);
		expect(calls).toEqual(['removeInactive', 'invalidate', 'reset', 'goto']);
		expect(nav.goto).toHaveBeenCalledWith('/operator/tenants', { replace: true });
	});

	it('the shared BFF exit only changes the cookie and the offline copies; following it is separate', async () => {
		del.mockResolvedValue(undefined);
		await exitOperatorScope();
		expect(del).toHaveBeenCalledWith('/operator/scope');
		expect(nav.invalidate).not.toHaveBeenCalled();
	});

	it('the session guard leaves through the same two steps', async () => {
		del.mockResolvedValue(undefined);
		await leaveTenantContext(qc() as never);
		expect(del).toHaveBeenCalledWith('/operator/scope');
		expect(calls).toEqual(['removeInactive', 'invalidate', 'reset']);
	});
});

describe('the other tabs of the browser', () => {
	it('an enter or exit in one tab makes the others re-run their layout and reset their cache at once', async () => {
		const mine = qc();
		const theirs = qc();
		// A second tab is a second copy of the module (its own channel object).
		vi.resetModules();
		const otherTab = await import('#lib/api/operator-scope.ts');
		const stop = otherTab.listenForScopeChanges(theirs as never);
		await followScopeChange(mine as never);
		await vi.waitFor(() => expect(theirs.resetQueries).toHaveBeenCalledTimes(1));
		expect(nav.invalidate).toHaveBeenCalledTimes(2); // here, and there
		stop();
	});

	it('a tab does not follow its own announcement, and a tab that followed does not echo it back', async () => {
		const a = qc();
		const stopA = listenForScopeChanges(a as never);
		await followScopeChange(a as never);
		await Promise.resolve();
		expect(a.resetQueries).toHaveBeenCalledTimes(1); // once, from its own call
		expect(nav.invalidate).toHaveBeenCalledTimes(1);
		stopA();
	});

	it('stopping the listener stops following', async () => {
		const theirs = qc();
		const stop = listenForScopeChanges(theirs as never);
		stop();
		await followScopeChange(qc() as never);
		await Promise.resolve();
		expect(theirs.resetQueries).not.toHaveBeenCalled();
	});
});
