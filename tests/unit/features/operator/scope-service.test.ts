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
vi.mock('#lib/api/client.ts', () => ({ api: { deleteJson: del } }));
vi.mock('#lib/api/client', () => ({ api: { deleteJson: del } }));

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
	listeners = new Set<(e: { data: unknown }) => void>();
	constructor(public name: string) {
		FakeChannel.all.push(this);
	}
	postMessage(data: unknown) {
		for (const c of FakeChannel.all) {
			if (c !== this && c.name === this.name) c.listeners.forEach((l) => l({ data }));
		}
	}
	addEventListener(_t: string, l: (e: { data: unknown }) => void) {
		this.listeners.add(l);
	}
	removeEventListener(_t: string, l: (e: { data: unknown }) => void) {
		this.listeners.delete(l);
	}
}

/** A hard reset replaces the entry with its own URL (never `reload()`, which re-POSTs a result page). */
const reload = vi.fn((url: string) => void calls.push(`reload:${url}`));

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
	vi.stubGlobal('location', { replace: reload, pathname: '/leads', search: '?page=2' });
	vi.stubGlobal('navigator', { onLine: true });
	sessionStorage.clear();
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
		gw.enterScope.mockResolvedValue('fp-a');
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
		gw.exitScope.mockResolvedValue('fp-none');
		const client = qc();
		await service.exitTenantContext(client as never);
		expect(calls).toEqual(['removeInactive', 'invalidate', 'reset', 'goto']);
		expect(nav.goto).toHaveBeenCalledWith('/operator/tenants', { replace: true });
		expect(reload).not.toHaveBeenCalled();
	});

	it('the shared BFF exit only changes the cookie and the offline copies; following it is separate', async () => {
		const { scope } = await tab();
		del.mockResolvedValue({ scope_context: 'fp-none' });
		await scope.exitOperatorScope();
		expect(del).toHaveBeenCalledWith('/operator/scope', undefined, expect.anything());
		expect(nav.invalidate).not.toHaveBeenCalled();
	});

	it('the session guard leaves through the same two steps', async () => {
		const { scope } = await tab();
		del.mockResolvedValue({ scope_context: 'fp-none' });
		await scope.leaveTenantContext(qc() as never);
		expect(del).toHaveBeenCalledWith('/operator/scope', undefined, expect.anything());
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
		del.mockResolvedValue({ scope_context: 'fp-none' });
		await mineTab.scope.leaveTenantContext(mine as never);
		expect(theirs.clear).toHaveBeenCalledTimes(1);
		expect(reload).toHaveBeenCalledTimes(1);
		// Only the changing tab re-ran its layout.
		expect(nav.invalidate).toHaveBeenCalledTimes(1);
		expect(theirs.resetQueries).not.toHaveBeenCalled();
		expect(calls.indexOf('clear')).toBeLessThan(calls.findIndex((c) => c.startsWith('reload:')));
		stop();
	});

	it('a tab does not follow its own announcement', async () => {
		const { scope } = await tab();
		const a = qc();
		const stopA = scope.listenForScopeChanges(a as never);
		del.mockResolvedValue({ scope_context: 'fp-none' });
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
		del.mockResolvedValue({ scope_context: 'fp-none' });
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

	it('replaces the entry with its own URL (a native-POST result page is never re-POSTed) and leaves the reason behind first', async () => {
		const { scope } = await tab();
		const written: Array<string | null> = [];
		reload.mockImplementationOnce(
			() => void written.push(sessionStorage.getItem('lk_reload_reason'))
		);
		scope.scopeChangedElsewhere(qc() as never, 'refusal');
		expect(reload).toHaveBeenCalledWith('/leads?page=2');
		expect(JSON.parse(written[0] ?? 'null')).toMatchObject({ reason: 'context' });
	});

	it('a sign-in or sign-out elsewhere leaves the "session" reason', async () => {
		const mineTab = await tab();
		const otherTab = await tab();
		otherTab.scope.listenForScopeChanges(qc() as never);
		mineTab.scope.announceContextChange('session');
		expect(JSON.parse(sessionStorage.getItem('lk_reload_reason') ?? 'null')).toMatchObject({
			reason: 'session'
		});
	});

	it('a reset that is cancelled stays latched (no time release): the stalled block takes over until a document is shown again', async () => {
		vi.useFakeTimers();
		try {
			const { scope } = await tab();
			expect(scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(true);
			expect(scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(false);
			vi.advanceTimersByTime(6_000);
			// The flag is NOT cleared by the stall (a slow navigation would land without its toast):
			// it expires by its own timestamp, and it is not evidence that THIS document came from a reset.
			expect(sessionStorage.getItem('lk_reload_reason')).not.toBeNull();
			const hard = await import('#lib/api/hard-reset.ts');
			expect(hard.resetPending()).toBe(true);
			expect(scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(false);
			vi.advanceTimersByTime(61_000);
			expect(scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(false);
			expect(hard.takeReloadReason()).toBeNull();
			const block = await import('#lib/api/reset-block.svelte.ts');
			block.resetBlock.clear();
			window.dispatchEvent(new Event('pageshow'));
		} finally {
			vi.useRealTimers();
		}
	});

	it('pageshow (back-forward restore after a cancelled reset) releases it', async () => {
		const { scope } = await tab();
		expect(scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(true);
		window.dispatchEvent(new Event('pageshow'));
		expect(scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(true);
	});

	it("is ignored while this tab's own change is in flight: a refetch between the POST and the commit is not 'another tab'", async () => {
		const { scope } = await tab();
		const client = qc();
		let during: boolean | undefined;
		const watch = scope.createCommittedContext(client as never);
		watch.observe('fp-a');
		del.mockImplementation(() => {
			during = scope.scopeChangedElsewhere(client as never, 'refusal');
			return Promise.resolve({ scope_context: 'fp-none' });
		});
		await scope.leaveTenantContext(client as never);
		expect(during).toBe(false);
		expect(reload).not.toHaveBeenCalled();
		// Still between the answer and the layout's commit: a refetch refused now is OUR change's.
		expect(scope.scopeChangedElsewhere(client as never, 'refusal')).toBe(false);
		// ... once the layout has committed the expected fingerprint the same refusal IS foreign again.
		expect(watch.observe('fp-none')).toBe(false);
		expect(scope.scopeChangedElsewhere(client as never, 'refusal')).toBe(true);
	});

	it("an announcement that arrives while this tab's own change is in flight reloads once it has committed", async () => {
		const { scope } = await tab();
		const client = qc();
		del.mockImplementation(() => {
			scope.scopeChangedElsewhere(client as never, 'announcement');
			expect(reload).not.toHaveBeenCalled();
			return Promise.resolve({ scope_context: 'fp-none' });
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

describe('a hard reset that must not happen', () => {
	it('offline: no reload (it would land on the offline page); a block banner stands in, and the next refusal still tries', async () => {
		vi.stubGlobal('navigator', { onLine: false });
		const { scope } = await tab();
		const block = await import('#lib/api/reset-block.svelte.ts');
		expect(scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(false);
		expect(reload).not.toHaveBeenCalled();
		expect(block.resetBlock.kind).toBe('offline');
		expect(sessionStorage.getItem('lk_reload_reason')).toBeNull();
		vi.stubGlobal('navigator', { onLine: true });
		expect(scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(true);
	});

	it('a page that is itself the result of a reset (reason under 10 s old) does not reset again: error state, no reload', async () => {
		sessionStorage.setItem(
			'lk_reload_reason',
			JSON.stringify({ reason: 'context', at: Date.now() - 2_000 })
		);
		const { scope } = await tab();
		const block = await import('#lib/api/reset-block.svelte.ts');
		const hard = await import('#lib/api/hard-reset.ts');
		// The (app) layout takes the reason on arrival (the toast), which removes the flag...
		expect(hard.takeReloadReason()).toBe('context');
		expect(sessionStorage.getItem('lk_reload_reason')).toBeNull();
		// ... and the loop stop still knows this document came from a reset.
		expect(scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(false);
		expect(reload).not.toHaveBeenCalled();
		expect(block.resetBlock.kind).toBe('loop');
	});

	it('a reason older than the window is not a loop', async () => {
		sessionStorage.setItem(
			'lk_reload_reason',
			JSON.stringify({ reason: 'context', at: Date.now() - 30_000 })
		);
		const { scope } = await tab();
		const hard = await import('#lib/api/hard-reset.ts');
		hard.takeReloadReason();
		expect(scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(true);
	});

	it('unavailable storage: the reset still happens, with nothing to show', async () => {
		const { scope } = await tab();
		const boom = () => {
			throw new Error('storage disabled');
		};
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
		try {
			expect(scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(true);
			expect(reload).toHaveBeenCalledTimes(1);
		} finally {
			vi.restoreAllMocks();
		}
	});

	it('takeReloadReason hands the reason out once and ignores garbage', async () => {
		await tab();
		const hard = await import('#lib/api/hard-reset.ts');
		sessionStorage.setItem('lk_reload_reason', 'not json');
		expect(hard.takeReloadReason()).toBeNull();
		sessionStorage.setItem(
			'lk_reload_reason',
			JSON.stringify({ reason: 'session', at: Date.now() })
		);
		expect(hard.takeReloadReason()).toBe('session');
		expect(hard.takeReloadReason()).toBeNull();
	});
});

describe('the layout commits a context (item: a page never keeps its state when its context moves)', () => {
	it('the first commit is remembered; the same fingerprint again is nothing', async () => {
		const { scope } = await tab();
		const watch = scope.createCommittedContext(qc() as never);
		expect(watch.observe('fp-a')).toBe(false);
		expect(watch.observe('fp-a')).toBe(false);
		expect(reload).not.toHaveBeenCalled();
	});

	it('a different fingerprint with no own change in flight (a capabilities refresh, any layout run) hard-resets: no in-place follow', async () => {
		const { scope } = await tab();
		const client = qc();
		const watch = scope.createCommittedContext(client as never);
		watch.observe('fp-a');
		expect(watch.observe('fp-b')).toBe(true);
		expect(client.clear).toHaveBeenCalledTimes(1);
		expect(reload).toHaveBeenCalledWith('/leads?page=2');
		expect(nav.invalidate).not.toHaveBeenCalled();
	});

	it('an own enter / exit commits a different fingerprint in place, as before: remembered, no reset', async () => {
		const { scope } = await tab();
		del.mockResolvedValue({ scope_context: 'fp-b' });
		const watch = scope.createCommittedContext(qc() as never);
		watch.observe('fp-a');
		nav.invalidate.mockImplementation(() => {
			expect(watch.observe('fp-b')).toBe(false); // the layout commits while the change is in flight
			return Promise.resolve();
		});
		await scope.leaveTenantContext(qc() as never);
		expect(reload).not.toHaveBeenCalled();
		// ... and the new fingerprint is now the baseline.
		expect(watch.observe('fp-b')).toBe(false);
		expect(watch.observe('fp-c')).toBe(true);
	});
});

describe('a reset another tab asked for is never mistaken for a loop', () => {
	/** The document a reset lands on: fresh modules, the flag in sessionStorage, the reason taken. */
	async function landAfterReset() {
		const next = await tab();
		const hard = await import('#lib/api/hard-reset.ts');
		hard.takeReloadReason();
		return next;
	}

	it('two announcements two seconds apart are two resets, and no banner', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			const first = await tab();
			expect(first.scope.scopeChangedElsewhere(qc() as never, 'announcement')).toBe(true);
			vi.setSystemTime(Date.now() + 2_000);
			const second = await landAfterReset();
			expect(second.scope.scopeChangedElsewhere(qc() as never, 'announcement')).toBe(true);
			const block = await import('#lib/api/reset-block.svelte.ts');
			expect(block.resetBlock.kind).toBeNull();
			expect(reload).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('a refusal on a page an announcement just reset is a real change: it resets too', async () => {
		const first = await tab();
		first.scope.scopeChangedElsewhere(qc() as never, 'announcement');
		const second = await landAfterReset();
		expect(second.scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(true);
		expect(reload).toHaveBeenCalledTimes(2);
	});

	it('resets that refusals start still stop at the second one: the banner, and no third reload', async () => {
		const first = await tab();
		expect(first.scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(true);
		const second = await landAfterReset();
		const block = await import('#lib/api/reset-block.svelte.ts');
		expect(second.scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(false);
		expect(block.resetBlock.kind).toBe('loop');
		expect(reload).toHaveBeenCalledTimes(1);
		// the announcement of a third change is still followed (it can never be a loop)
		block.resetBlock.clear();
		expect(second.scope.scopeChangedElsewhere(qc() as never, 'announcement')).toBe(true);
		expect(reload).toHaveBeenCalledTimes(2);
	});
});

describe("this tab's own change is recognised by the fingerprint the BFF answered", () => {
	it("another invalidate superseding the scope one: the commit still lands on the expected value, so the tab's OWN enter is not reset", async () => {
		const { scope } = await tab();
		gw.exitScope.mockResolvedValue('fp-b');
		del.mockResolvedValue({ scope_context: 'fp-b' });
		const watch = scope.createCommittedContext(qc() as never);
		watch.observe('fp-a');
		// the scope invalidate is superseded: it settles with nothing committed ...
		nav.invalidate.mockResolvedValue(undefined);
		await scope.leaveTenantContext(qc() as never);
		// ... and the superseding load (a capabilities refresh) commits the new context afterwards
		expect(watch.observe('fp-b')).toBe(false);
		expect(reload).not.toHaveBeenCalled();
	});

	it('the cookie ends as B while this tab entered A: the commit of B is foreign and resets', async () => {
		const { scope } = await tab();
		del.mockResolvedValue({ scope_context: 'fp-a' }); // what the BFF answered for OUR change
		const client = qc();
		const watch = scope.createCommittedContext(client as never);
		watch.observe('fp-none');
		nav.invalidate.mockImplementation(() => {
			// another tab moved the cookie to B before the layout re-ran: the layout commits B
			expect(watch.observe('fp-b')).toBe(true);
			return Promise.resolve();
		});
		await scope.leaveTenantContext(client as never);
		expect(reload).toHaveBeenCalledWith('/leads?page=2');
		expect(client.clear).toHaveBeenCalledTimes(1);
	});

	it('a foreign change landing inside the window is not absorbed: any value but the expected one resets', async () => {
		const { scope } = await tab();
		del.mockResolvedValue({ scope_context: 'fp-a' });
		const watch = scope.createCommittedContext(qc() as never);
		watch.observe('fp-none');
		nav.invalidate.mockResolvedValue(undefined);
		await scope.leaveTenantContext(qc() as never); // answered, not yet committed
		expect(watch.observe('fp-b')).toBe(true);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('an expectation nothing committed in time absorbs nothing later: a foreign move to exactly that value resets', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			const { scope } = await tab();
			del.mockResolvedValue({ scope_context: 'fp-a' });
			nav.invalidate.mockResolvedValue(undefined);
			const watch = scope.createCommittedContext(qc() as never);
			watch.observe('fp-none');
			await scope.leaveTenantContext(qc() as never); // answered fp-a, never committed
			vi.setSystemTime(Date.now() + 6_000); // the window is over
			expect(watch.observe('fp-a')).toBe(true);
			expect(reload).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});

	it('an announcement between the BFF answer and the layout commit is not lost (it waits for nothing: the call has answered)', async () => {
		const { scope } = await tab();
		const client = qc();
		del.mockResolvedValue({ scope_context: 'fp-a' });
		nav.invalidate.mockImplementation(() => {
			// the call has answered; the layout has not committed yet: another tab announces a change
			expect(scope.scopeChangedElsewhere(client as never, 'announcement')).toBe(true);
			return Promise.resolve();
		});
		await scope.leaveTenantContext(client as never);
		expect(reload).toHaveBeenCalledTimes(1);
		expect(client.clear).toHaveBeenCalledTimes(1);
	});

	it("a refusal inside the window after the answer is this tab's own change; after the window it is foreign", async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			const { scope } = await tab();
			del.mockResolvedValue({ scope_context: 'fp-a' });
			nav.invalidate.mockResolvedValue(undefined);
			await scope.leaveTenantContext(qc() as never);
			expect(scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(false);
			vi.setSystemTime(Date.now() + 6_000);
			expect(scope.scopeChangedElsewhere(qc() as never, 'refusal')).toBe(true);
		} finally {
			vi.useRealTimers();
		}
	});
});
