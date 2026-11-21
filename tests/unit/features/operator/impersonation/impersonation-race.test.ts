/**
 * The impersonation banner is a security indicator, so a late response can neither bring an ended session back nor
 * reset the End control mid-DELETE. The focus / visibility reconcile can race End: an unfocused window gets focus
 * BEFORE the click lands, so the reconcile GET and the DELETE are in flight together. Controlled promises.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
	startImpersonation: vi.fn(),
	endImpersonation: vi.fn(),
	listImpersonationSessions: vi.fn()
}));
vi.mock('#lib/features/operator/impersonation/api.ts', () => api);
vi.mock('#lib/features/operator/impersonation/api', () => api);

import { impersonation } from '#lib/features/operator/impersonation/stores/impersonation.svelte.ts';
import { IMPERSONATION_SESSION_KEY } from '#lib/utils/impersonation-session-key.ts';

const dto = (id: string) => ({
	session_id: id,
	reason: 'support',
	expires_at: '2030-01-01T00:00:00Z'
});
function deferred<T>() {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
	vi.clearAllMocks();
	window.localStorage.clear();
	api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
	await impersonation.reconcile();
	// the operator has session A active
	window.localStorage.setItem(IMPERSONATION_SESSION_KEY, 'A');
	api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('A')] });
	await impersonation.reconcile();
	expect(impersonation.active?.session_id).toBe('A');
	vi.clearAllMocks();
});

describe('impersonation: a late reconcile cannot undo End', () => {
	it('a GET that resolves AFTER the DELETE leaves the banner ended', async () => {
		const get = deferred<{ sessions: unknown[] }>();
		api.listImpersonationSessions.mockReturnValueOnce(get.promise);
		api.endImpersonation.mockResolvedValue(undefined);

		const late = impersonation.reconcile(); // focus fired first: the GET is in flight
		await impersonation.end(); // then the click: DELETE done, banner ended
		expect(impersonation.active).toBeNull();
		expect(impersonation.status).toBe('idle');

		get.resolve({ sessions: [dto('A')] }); // the stale answer arrives
		await late;
		await flush();
		expect(impersonation.active).toBeNull();
		expect(impersonation.status).toBe('idle');
	});

	it('a GET that resolves DURING the DELETE keeps the status mutating, so End cannot be clicked twice', async () => {
		const get = deferred<{ sessions: unknown[] }>();
		const del = deferred<void>();
		api.listImpersonationSessions.mockReturnValueOnce(get.promise);
		api.endImpersonation.mockReturnValue(del.promise);

		const late = impersonation.reconcile();
		const ending = impersonation.end();
		expect(impersonation.status).toBe('mutating');

		get.resolve({ sessions: [dto('A')] });
		await late;
		await flush();
		expect(impersonation.status).toBe('mutating'); // not reset to 'active' mid-DELETE
		expect(impersonation.active?.session_id).toBe('A');

		del.resolve();
		await ending;
		expect(impersonation.active).toBeNull();
		expect(impersonation.status).toBe('idle');
		expect(api.endImpersonation).toHaveBeenCalledTimes(1);
	});

	it('a reconcile asked for while End is running does not start a request', async () => {
		const del = deferred<void>();
		api.endImpersonation.mockReturnValue(del.promise);
		const ending = impersonation.end();
		await impersonation.reconcile();
		expect(api.listImpersonationSessions).not.toHaveBeenCalled();
		expect(impersonation.status).toBe('mutating');
		del.resolve();
		await ending;
	});

	it('a failed stale reconcile does not set the error state over a finished End', async () => {
		const get = deferred<{ sessions: unknown[] }>();
		api.listImpersonationSessions.mockReturnValueOnce(
			get.promise.then(() => {
				throw new Error('network');
			})
		);
		api.endImpersonation.mockResolvedValue(undefined);
		const late = impersonation.reconcile();
		await impersonation.end();
		get.resolve({ sessions: [] });
		await late;
		await flush();
		expect(impersonation.status).toBe('idle');
		expect(impersonation.error).toBeNull();
	});

	it('the newest reconcile wins over an older one', async () => {
		const first = deferred<{ sessions: unknown[] }>();
		const second = deferred<{ sessions: unknown[] }>();
		api.listImpersonationSessions
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise);
		const p1 = impersonation.reconcile();
		const p2 = impersonation.reconcile();
		second.resolve({ sessions: [dto('A')] });
		await p2;
		first.resolve({ sessions: [] }); // older answer: ignored
		await p1;
		await flush();
		expect(impersonation.active?.session_id).toBe('A');
	});
});
