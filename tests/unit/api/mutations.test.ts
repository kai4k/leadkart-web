import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MutationCache, MutationObserver, QueryClient } from '@tanstack/svelte-query';

const toastMock = vi.hoisted(() => ({
	success: vi.fn(),
	error: vi.fn()
}));
vi.mock('$ui', () => ({ toast: toastMock }));
import { resourceMutationOptions } from '#lib/api/mutations.ts';

beforeEach(() => vi.clearAllMocks());

function deferred<T = void>() {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}

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
		expect(undo).toHaveBeenCalledWith('v', 1);
	});

	it('a failing mutation produces exactly one error toast through a real MutationCache', async () => {
		const errorToast = vi.fn();
		const cache = new MutationCache({
			onError: (error, _v, _c, mutation) => {
				if (mutation.meta?.skipErrorToast === true) return;
				errorToast(error);
			}
		});
		const qc = new QueryClient({ mutationCache: cache });
		const failing = () => Promise.reject(new Error('boom'));
		for (const inlineErrors of [false, true]) {
			const observer = new MutationObserver(
				qc,
				resourceMutationOptions(qc, { fn: failing, invalidate: () => [], inlineErrors })
			);
			await observer.mutate(undefined as never).catch(() => {});
		}
		expect(errorToast).toHaveBeenCalledTimes(1);
		expect(toastMock.error).not.toHaveBeenCalled();
	});
});
