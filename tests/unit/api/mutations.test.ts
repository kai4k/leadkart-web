import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MutationObserver, QueryClient } from '@tanstack/svelte-query';

const toastMock = vi.hoisted(() => ({
	success: vi.fn(),
	warning: vi.fn(),
	error: vi.fn()
}));
const gotoMock = vi.hoisted(() => vi.fn((_url: string) => Promise.resolve()));
const invalidateMock = vi.hoisted(() => vi.fn((_key: string) => Promise.resolve()));
vi.mock('#lib/components/ui/index.ts', () => ({ toast: toastMock }));
vi.mock('$app/navigation', () => ({ goto: gotoMock, invalidate: invalidateMock }));
vi.mock('#lib/api/client.ts', () => ({ api: { delete: vi.fn() } }));
import { createQueryClient } from '#lib/api/query-client.ts';
import { ApiError } from '#lib/api/errors.ts';
import { resourceMutationOptions } from '#lib/api/mutations.ts';

beforeEach(() => vi.clearAllMocks());

function deferred<T = void>() {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}

describe('refreshesCapabilities', () => {
	const run = async (refreshesCapabilities: boolean) => {
		const qc = new QueryClient();
		const opts = resourceMutationOptions(qc, {
			fn: (_: { id: string }) => Promise.resolve(undefined),
			invalidate: () => [['users', 'list']],
			refreshesCapabilities
		});
		await opts.onSuccess(undefined, { id: 'm1' });
	};

	it('re-runs the (app) layout load (the session capabilities) after a mutation that can change the caller own access', async () => {
		await run(true);
		expect(invalidateMock).toHaveBeenCalledWith('app:capabilities');
	});

	it('leaves it alone for every other mutation', async () => {
		await run(false);
		expect(invalidateMock).not.toHaveBeenCalled();
	});
});

describe('resourceMutationOptions', () => {
	it('awaits invalidation of every key, then toasts', async () => {
		const qc = new QueryClient();
		const spy = vi.spyOn(qc, 'invalidateQueries');
		const opts = resourceMutationOptions(qc, {
			fn: (_: { id: string }) => Promise.resolve(undefined),
			invalidate: ({ id }) => [
				['leads', 'detail', id],
				['leads', 'list']
			],
			successToast: 'Saved'
		});
		await opts.onSuccess?.(undefined, { id: 'a' });
		expect(spy).toHaveBeenCalledWith({ queryKey: ['leads', 'detail', 'a'] });
		expect(spy).toHaveBeenCalledWith({ queryKey: ['leads', 'list'] });
		expect(toastMock.success).toHaveBeenCalledWith('Saved', undefined);
	});

	it('sets skipErrorToast when the caller shows errors inline', () => {
		const opts = resourceMutationOptions(new QueryClient(), {
			fn: () => Promise.resolve(undefined),
			invalidate: () => [],
			inlineErrors: true
		});
		expect(opts.meta).toEqual({ skipErrorToast: true });
	});

	it('passes mutationKey through', () => {
		const opts = resourceMutationOptions(new QueryClient(), {
			fn: () => Promise.resolve(undefined),
			invalidate: () => [],
			mutationKey: ['users', 'deactivate']
		});
		expect(opts.mutationKey).toEqual(['users', 'deactivate']);
	});

	it('toast and the caller onSuccess wait for the invalidation to resolve', async () => {
		const qc = new QueryClient();
		const gate = deferred();
		vi.spyOn(qc, 'invalidateQueries').mockReturnValue(gate.promise);
		const onSuccess = vi.fn();
		const opts = resourceMutationOptions(qc, {
			fn: (_: string) => Promise.resolve({ id: 'x' }),
			invalidate: () => [['a']],
			successToast: (vars, data) => `${vars}:${data.id}`,
			onSuccess
		});
		const done = opts.onSuccess({ id: 'x' }, 'v');
		await Promise.resolve();
		expect(toastMock.success).not.toHaveBeenCalled();
		expect(onSuccess).not.toHaveBeenCalled();
		gate.resolve();
		await done;
		expect(toastMock.success).toHaveBeenCalledWith('v:x', undefined);
		expect(onSuccess).toHaveBeenCalledWith('v', { id: 'x' });
		expect(toastMock.success.mock.invocationCallOrder[0]).toBeLessThan(
			onSuccess.mock.invocationCallOrder[0]!
		);
	});

	it('wires an Undo action into the success toast', async () => {
		const undo = vi.fn();
		const opts = resourceMutationOptions(new QueryClient(), {
			fn: (_: string) => Promise.resolve(1),
			invalidate: () => [],
			successToast: 'Done',
			undo,
			toastDurationMs: 7_000
		});
		await opts.onSuccess(1, 'v');
		const [, toastOpts] = toastMock.success.mock.calls[0] as [
			string,
			{ duration: number; action: { label: string; onClick: () => void } }
		];
		expect(toastOpts.duration).toBe(7_000);
		expect(toastOpts.action.label).toBe('Undo');
		toastOpts.action.onClick();
		await vi.waitFor(() => expect(undo).toHaveBeenCalledWith('v', 1));
	});

	it('a failing undo reaches the global handler: one error toast, no unhandled rejection', async () => {
		const unhandled = vi.fn();
		process.on('unhandledRejection', unhandled);
		const qc = createQueryClient();
		const opts = resourceMutationOptions(qc, {
			fn: (_: string) => Promise.resolve(1),
			invalidate: () => [],
			successToast: 'Done',
			undo: () => Promise.reject(new ApiError(500))
		});
		await opts.onSuccess(1, 'v');
		const [, toastOpts] = toastMock.success.mock.calls[0] as [
			string,
			{ action: { onClick: () => void } }
		];
		toastOpts.action.onClick();
		await vi.waitFor(() => expect(toastMock.error).toHaveBeenCalledTimes(1));
		expect(toastMock.error).toHaveBeenCalledWith('An unexpected error occurred.');
		await new Promise((r) => setTimeout(r, 10));
		process.off('unhandledRejection', unhandled);
		expect(unhandled).not.toHaveBeenCalled();
	});

	it('a 401 during undo goes through the session guard (sign-in redirect), not a generic toast', async () => {
		const qc = createQueryClient();
		const opts = resourceMutationOptions(qc, {
			fn: (_: string) => Promise.resolve(1),
			invalidate: () => [],
			successToast: 'Done',
			undo: () =>
				Promise.reject(
					ApiError.fromResponse(new Response(null, { status: 401 }), { error: 'session_expired' })
				)
		});
		await opts.onSuccess(1, 'v');
		const [, toastOpts] = toastMock.success.mock.calls[0] as [
			string,
			{ action: { onClick: () => void } }
		];
		toastOpts.action.onClick();
		await vi.waitFor(() => expect(gotoMock).toHaveBeenCalledTimes(1));
		expect(String(gotoMock.mock.calls[0]?.[0])).toMatch(/^\/signin\?next=/);
		expect(toastMock.error).not.toHaveBeenCalled();
	});

	it('the warning variant is used when successToastVariant says so', async () => {
		const opts = resourceMutationOptions(new QueryClient(), {
			fn: (_: string) => Promise.resolve({ failed: 1 }),
			invalidate: () => [],
			successToast: () => '2 done, 1 failed',
			successToastVariant: (_v, d) => (d.failed > 0 ? 'warning' : 'success')
		});
		await opts.onSuccess({ failed: 1 }, 'v');
		expect(toastMock.warning).toHaveBeenCalledWith('2 done, 1 failed', undefined);
		expect(toastMock.success).not.toHaveBeenCalled();
	});

	it('a failing mutation produces exactly one error toast through the real query client', async () => {
		const qc = createQueryClient();
		const failing = () => Promise.reject(new ApiError(500));
		for (const inlineErrors of [false, true]) {
			const observer = new MutationObserver(
				qc,
				resourceMutationOptions(qc, { fn: failing, invalidate: () => [], inlineErrors })
			);
			await observer.mutate(undefined as never).catch(() => {});
		}
		expect(toastMock.error).toHaveBeenCalledTimes(1);
		expect(toastMock.error).toHaveBeenCalledWith('An unexpected error occurred.');
	});
});

describe('inlineErrors: the global handler toasts when no consumer is left to show the error', () => {
	function setup() {
		const qc = createQueryClient();
		const gate = rejecting();
		const failLater = () => gate.promise;
		const observer = new MutationObserver(
			qc,
			resourceMutationOptions(qc, { fn: failLater, invalidate: () => [], inlineErrors: true })
		);
		const fail = () => gate.reject(new ApiError(500));
		return { observer, fail, settled: () => gate.promise.catch(() => {}) };
	}
	function rejecting() {
		let reject!: (e: unknown) => void;
		const promise = new Promise<never>((_, r) => (reject = r));
		return { promise, reject };
	}

	it('a mounted consumer shows the error itself: no toast', async () => {
		const { observer, fail } = setup();
		const unsubscribe = observer.subscribe(() => {}); // the component's subscription
		const done = observer.mutate(undefined as never).catch(() => {});
		fail();
		await done;
		expect(toastMock.error).not.toHaveBeenCalled();
		unsubscribe();
	});

	it('a consumer that unmounted before the mutation settled: exactly one toast', async () => {
		const { observer, fail } = setup();
		const unsubscribe = observer.subscribe(() => {});
		const done = observer.mutate(undefined as never).catch(() => {});
		unsubscribe(); // navigated away
		fail();
		await done;
		expect(toastMock.error).toHaveBeenCalledTimes(1);
		expect(toastMock.error).toHaveBeenCalledWith('An unexpected error occurred.');
	});

	it('a mutation superseded by a later mutate() of the same consumer: its failure is toasted once', async () => {
		const qc = createQueryClient();
		const failures: Array<(e: unknown) => void> = [];
		const observer = new MutationObserver(
			qc,
			resourceMutationOptions(qc, {
				fn: () => new Promise<never>((_, reject) => failures.push(reject)),
				invalidate: () => [],
				inlineErrors: true
			})
		);
		const unsubscribe = observer.subscribe(() => {});
		const first = observer.mutate(undefined as never).catch(() => {});
		const second = observer.mutate(undefined as never).catch(() => {});
		await vi.waitFor(() => expect(failures).toHaveLength(2));
		failures[0]!(new ApiError(500)); // the first one fails: nobody shows it
		await first;
		expect(toastMock.error).toHaveBeenCalledTimes(1);
		failures[1]!(new ApiError(500)); // the current one fails: the consumer shows it
		await second;
		expect(toastMock.error).toHaveBeenCalledTimes(1);
		unsubscribe();
	});
});
