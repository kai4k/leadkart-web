/**
 * Pins for guarantees of fix round I that no other test failed without: each describe is named after the mutant it kills
 * (see the report's mutant table).
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
	startImpersonation: vi.fn(),
	endImpersonation: vi.fn(),
	listImpersonationSessions: vi.fn()
}));
vi.mock('#lib/features/operator/impersonation/api.ts', () => api);
vi.mock('#lib/features/operator/impersonation/api', () => api);
vi.mock('#lib/features/auth/index.ts', () => ({
	P: { platformImpersonationManage: 'platform.impersonation.manage' },
	session: { capabilities: { tier: 'operator' }, can: () => true }
}));
vi.mock('$app/state', () => ({ page: { data: { capabilities: { person_id: 'A' } } } }));

import {
	createImpersonation,
	MUTATION_DEADLINE_MS,
	type Impersonation
} from '#lib/features/operator/impersonation/stores/impersonation.svelte.ts';
import ImpersonationBanner from '#lib/features/operator/impersonation/components/ImpersonationBanner.svelte';
import {
	BFF_MAX_UPSTREAM_HOPS,
	DEFAULT_READ_TIMEOUT_MS,
	DEFAULT_UPSTREAM_TIMEOUT_MS
} from '#lib/api/timeouts.ts';

const dto = (id: string) => ({
	session_id: id,
	operator_id: 'op',
	target_tenant_id: 't',
	tenant_display_name: `Company ${id}`,
	reason: 'support',
	created_at: '2030-01-01T00:00:00Z',
	expires_at: '2099-01-01T00:00:00Z'
});
const START = { target_tenant_id: 't', reason: 'a reason that is long enough' } as never;
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

let person: string | null;
let store: Impersonation | undefined;
beforeEach(() => {
	vi.resetAllMocks();
	window.localStorage.clear();
	person = 'A';
	api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
	api.endImpersonation.mockResolvedValue(undefined);
});
afterEach(() => {
	store?.dispose();
	store = undefined;
	vi.useRealTimers();
});

describe('I07: the DEFAULT mutation deadline is above the BFF worst case (not the read deadline)', () => {
	const worstCase = BFF_MAX_UPSTREAM_HOPS * DEFAULT_UPSTREAM_TIMEOUT_MS;
	it('is strictly greater than hops x upstream timeout, and at least the read deadline', () => {
		expect(MUTATION_DEADLINE_MS).toBeGreaterThan(worstCase);
		expect(MUTATION_DEADLINE_MS).toBeGreaterThanOrEqual(DEFAULT_READ_TIMEOUT_MS);
	});

	it('a start whose POST answers just past the read deadline is a success, not an unknown outcome', async () => {
		vi.useFakeTimers();
		store = createImpersonation({ personId: () => person }); // every default
		let answer!: (v: unknown) => void;
		api.startImpersonation.mockReturnValue(new Promise((r) => (answer = r)));
		const started = store.start(START);
		await vi.advanceTimersByTimeAsync(worstCase + 1_000);
		expect(store.checking).toBe(false); // not declared unknown yet
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('N')] });
		answer({
			session_id: 'N',
			tenant_display_name: 'Company N',
			expires_at_utc: '2099-01-01T00:00:00Z'
		});
		await expect(started).resolves.toEqual({ kind: 'started' });
	});
});

describe('I07 (store wiring): a mutation does not inherit the READ deadline', () => {
	it('with a short read deadline and the default mutation deadline, a slow POST still succeeds', async () => {
		vi.useFakeTimers();
		store = createImpersonation({ personId: () => person, deadlineMs: 40 }); // mutationDeadlineMs left at its default
		api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
		let answer!: (v: unknown) => void;
		api.startImpersonation.mockReturnValue(new Promise((r) => (answer = r)));
		const started = store.start(START);
		await vi.advanceTimersByTimeAsync(500); // far past the read deadline
		expect(store.checking).toBe(false);
		answer({
			session_id: 'N',
			tenant_display_name: 'Company N',
			expires_at_utc: '2099-01-01T00:00:00Z'
		});
		await expect(started).resolves.toEqual({ kind: 'started' });
	});
});

describe('I13: a failed read is never written into endError', () => {
	it('a read failure sets readError only', async () => {
		store = createImpersonation({ personId: () => person });
		api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [dto('A1')] });
		await store.reconcile();
		api.listImpersonationSessions.mockRejectedValueOnce(new Error('net'));
		await store.reconcile();
		expect(store.readError).toBeTruthy();
		expect(store.endError).toBeNull();
	});
});

describe('I10 / I20: forget() abandons the old person queue', () => {
	it('A hangs forever; after forget() and a person change B reads at once', async () => {
		store = createImpersonation({ personId: () => person });
		api.listImpersonationSessions.mockReturnValueOnce(new Promise(() => {})); // never settles
		void store.reconcile();
		await tick();
		store.forget();
		person = 'B';
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('B1')] });
		const outcome = await Promise.race([
			store.reconcile().then(() => 'read'),
			tick(200).then(() => 'blocked')
		]);
		expect(outcome).toBe('read');
		expect(store.active?.session_id).toBe('B1');
	});
});

describe('I06: readError carries its person tag', () => {
	it('A has a read error; B signs in on the same tab and sees none', async () => {
		store = createImpersonation({ personId: () => person });
		api.listImpersonationSessions.mockRejectedValueOnce(new Error('net'));
		await store.reconcile();
		expect(store.readError).toBeTruthy();
		person = 'B';
		expect(store.readError).toBeNull();
		expect(store.endError).toBeNull();
	});
});

describe('M-10: endError carries its person tag', () => {
	it('A fails to end a session; B signs in on the same tab and sees no end error', async () => {
		store = createImpersonation({ personId: () => person });
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('A1')] });
		await store.reconcile();
		api.endImpersonation.mockRejectedValue(new Error('boom'));
		await store.end().catch(() => {});
		expect(store.endError).toBeTruthy();
		person = 'B';
		expect(store.endError).toBeNull();
	});
});

describe('I03 / I18: follow-up timers die with forget() and dispose()', () => {
	async function unknownStart() {
		vi.useFakeTimers();
		store = createImpersonation({
			personId: () => person,
			mutationDeadlineMs: 10,
			deadlineMs: 10,
			followUpDelaysMs: [100, 200]
		});
		api.startImpersonation.mockReturnValue(new Promise(() => {}));
		const started = store.start(START).catch(() => {});
		await vi.advanceTimersByTimeAsync(50);
		await started;
		expect(store.checking).toBe(true);
		api.listImpersonationSessions.mockClear();
	}
	it('after forget(), no read is made when the schedule would have fired', async () => {
		await unknownStart();
		store!.forget();
		await vi.advanceTimersByTimeAsync(1_000);
		expect(api.listImpersonationSessions).not.toHaveBeenCalled();
	});
	it('after dispose(), no read is made either', async () => {
		await unknownStart();
		store!.dispose();
		await vi.advanceTimersByTimeAsync(1_000);
		expect(api.listImpersonationSessions).not.toHaveBeenCalled();
	});
});

describe('M-4: a person change WITHOUT forget() resets the unknown-outcome state', () => {
	it('another person does not inherit the unknown-outcome state: no checking, the waiter answered, no timers', async () => {
		vi.useFakeTimers();
		store = createImpersonation({
			personId: () => person,
			mutationDeadlineMs: 10,
			deadlineMs: 10,
			followUpDelaysMs: [100, 200]
		});
		api.startImpersonation.mockReturnValue(new Promise(() => {}));
		await Promise.all([store.start(START).catch(() => {}), vi.advanceTimersByTimeAsync(50)]);
		expect(store.checking).toBe(true);
		const waiter = store.resolveUnknownStart();
		person = 'B';
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('B1')] });
		await store.reconcile();
		expect(store.checking).toBe(false);
		await expect(waiter).resolves.toBe('not-started'); // never resolved from B's list
		api.listImpersonationSessions.mockClear();
		await vi.advanceTimersByTimeAsync(1_000);
		expect(api.listImpersonationSessions).not.toHaveBeenCalled();
	});
});

describe('B05: a banner button has an accessible name that contains its visible text (WCAG 2.5.3)', () => {
	let component: ReturnType<typeof mount> | undefined;
	afterEach(() => {
		if (component) unmount(component);
		component = undefined;
		document.body.innerHTML = '';
	});
	const buttons = () =>
		[...document.querySelectorAll<HTMLButtonElement>('[role="region"] button')].map((b) => ({
			name: (b.getAttribute('aria-label') ?? b.textContent ?? '').trim().toLowerCase(),
			text: (b.textContent ?? '').trim().toLowerCase()
		}));
	const settle = async () => {
		for (let i = 0; i < 10; i++) {
			flushSync();
			await tick();
		}
	};
	const check = () => {
		const found = buttons();
		expect(found.length).toBeGreaterThan(0);
		for (const { name, text } of found)
			expect(name, `"${name}" must contain "${text}"`).toContain(text);
	};

	it('a shown session ("End"), then a failed End ("Try ending again")', async () => {
		const { impersonation } =
			await import('#lib/features/operator/impersonation/stores/impersonation.svelte.ts');
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('A1')] });
		component = mount(ImpersonationBanner, { target: document.body });
		await settle();
		check();
		api.endImpersonation.mockRejectedValue(new Error('boom'));
		document.querySelector<HTMLButtonElement>('[role="region"] button')!.click();
		await settle();
		expect(impersonation.endError).toBeTruthy();
		check();
		impersonation.forget();
	});
});
