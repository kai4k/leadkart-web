/**
 * M-3 / M-11: what happens after a START whose outcome is unknown. The modal gets its verdict at the second follow-up
 * read; the later reads keep running, so a session the server commits late is still found and shown with the SERVER's
 * company name. Real store, real timers' schedule (fake clock), only the gateway is faked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
	startImpersonation: vi.fn(),
	endImpersonation: vi.fn(),
	listImpersonationSessions: vi.fn()
}));
vi.mock('#lib/features/operator/impersonation/api.ts', () => api);
vi.mock('#lib/features/operator/impersonation/api', () => api);
vi.mock('$app/state', () => ({ page: { data: { capabilities: { person_id: 'A' } } } }));

import {
	createImpersonation,
	type Impersonation
} from '#lib/features/operator/impersonation/stores/impersonation.svelte.ts';

const session = (name: string) => ({
	session_id: 'S1',
	operator_id: 'op',
	target_tenant_id: 't',
	tenant_display_name: name,
	reason: 'support',
	created_at: '2030-01-01T00:00:00Z',
	expires_at: '2099-01-01T00:00:00Z'
});
const START = { target_tenant_id: 't', reason: 'a reason that is long enough' } as never;
// reads at 100, 300, 600 and 1000 ms after the deadline (each delay follows the previous read)
const DELAYS = [100, 200, 300, 400] as const;

let store: Impersonation;
const reads = () => api.listImpersonationSessions.mock.calls.length;

beforeEach(() => {
	vi.useFakeTimers();
	vi.resetAllMocks();
	window.localStorage.clear();
	api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
	api.startImpersonation.mockReturnValue(new Promise(() => {})); // the POST never answers
	store = createImpersonation({
		personId: () => 'A',
		mutationDeadlineMs: 10,
		deadlineMs: 10,
		followUpDelaysMs: DELAYS
	});
});
afterEach(() => {
	store.dispose();
	vi.useRealTimers();
});

async function unknownStart() {
	const started = store.start(START, 'Name the modal passed').catch(() => {});
	await vi.advanceTimersByTimeAsync(50);
	await started;
	expect(store.checking).toBe(true);
	api.listImpersonationSessions.mockClear();
	return { verdict: store.resolveUnknownStart() }; // not awaited here
}

describe('M-3: the 15 s and 30 s reads keep running after the modal was told "did not start"', () => {
	it('the verdict comes at the second read; the third and fourth still read; the status settles at the last', async () => {
		const { verdict } = await unknownStart();
		const answered = vi.fn();
		void verdict.then(answered);

		await vi.advanceTimersByTimeAsync(100); // first read
		expect(reads()).toBe(1);
		expect(answered).not.toHaveBeenCalled(); // one empty read is not believed
		await vi.advanceTimersByTimeAsync(200); // second read: the modal's verdict
		expect(reads()).toBe(2);
		expect(answered).toHaveBeenCalledWith('not-started');
		expect(store.checking, 'still checking: the server may commit later').toBe(true);
		expect(store.unknown).toBe(true); // the banner stays

		await vi.advanceTimersByTimeAsync(300); // third read
		expect(reads()).toBe(3);
		expect(store.checking).toBe(true);
		await vi.advanceTimersByTimeAsync(400); // fourth and last read
		expect(reads()).toBe(4);
		expect(store.checking).toBe(false);
		expect(store.unknown).toBe(false);
		await vi.advanceTimersByTimeAsync(5_000);
		expect(reads()).toBe(4); // and then it stops
	});

	it('a session the server commits after the verdict is found by a later read and shown', async () => {
		const { verdict } = await unknownStart();
		await vi.advanceTimersByTimeAsync(300);
		await expect(verdict).resolves.toBe('not-started');
		expect(store.active).toBeNull();

		api.listImpersonationSessions.mockResolvedValue({ sessions: [session('Acme Pharma')] });
		await vi.advanceTimersByTimeAsync(300); // the third read
		expect(store.active?.session_id).toBe('S1');
		expect(store.checking).toBe(false);
		await vi.advanceTimersByTimeAsync(5_000);
		expect(reads()).toBe(3); // found: no further reads
	});

	it('a second ask after the verdict is answered at once, not at the end of the schedule', async () => {
		const { verdict } = await unknownStart();
		await vi.advanceTimersByTimeAsync(300);
		await verdict;
		await expect(store.resolveUnknownStart()).resolves.toBe('not-started');
	});

	it('when every follow-up read fails, the waiter is not left hanging', async () => {
		const { verdict } = await unknownStart();
		api.listImpersonationSessions.mockRejectedValue(new Error('net')); // from now on
		const answered = vi.fn();
		void verdict.then(answered);
		await vi.advanceTimersByTimeAsync(2_000);
		expect(answered).toHaveBeenCalledWith('not-started');
		expect(store.checking).toBe(false);
		expect(store.unknown).toBe(true); // the status is still unknown: the banner offers Retry
	});
});

describe('M-11: an unknown start that turns out started shows the company name the server sent', () => {
	it('the name comes from tenant_display_name of the read, not from what the modal passed', async () => {
		const { verdict } = await unknownStart();
		api.listImpersonationSessions.mockResolvedValue({ sessions: [session('Acme Pharma Pvt Ltd')] });
		await vi.advanceTimersByTimeAsync(100); // the first read already finds it
		await expect(verdict).resolves.toBe('started');
		expect(store.targetName).toBe('Acme Pharma Pvt Ltd');
	});

	it('a server that sends no name falls back to what the caller passed only when a session was created by start()', async () => {
		const { verdict } = await unknownStart();
		api.listImpersonationSessions.mockResolvedValue({ sessions: [session('')] });
		await vi.advanceTimersByTimeAsync(100);
		await expect(verdict).resolves.toBe('started');
		// the start never answered: nothing was remembered, so no invented name either
		expect(store.targetName).toBeNull();
	});
});
