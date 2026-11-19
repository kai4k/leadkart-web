import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MutationObserver, QueryClient } from '@tanstack/svelte-query';

const toastMock = vi.hoisted(() => ({
	success: vi.fn(),
	warning: vi.fn(),
	error: vi.fn()
}));
const gotoMock = vi.hoisted(() => vi.fn((_url: string) => Promise.resolve()));
vi.mock('$ui', () => ({ toast: toastMock }));
vi.mock('$app/navigation', () => ({ goto: gotoMock }));
vi.mock('#lib/utils/private-caches.ts', () => ({
	clearPrivateCaches: vi.fn(),
	IMPERSONATION_SESSION_KEY: 'leadkart-impersonation-session'
}));
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
