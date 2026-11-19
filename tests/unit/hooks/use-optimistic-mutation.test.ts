import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';

const state = vi.hoisted(() => ({ qc: undefined as unknown, opts: undefined as unknown }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('$ui', () => ({ toast: toastMock }));
vi.mock('@tanstack/svelte-query', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	useQueryClient: () => state.qc,
	createMutation: (fn: () => unknown) => {
		state.opts = fn();
		return {};
	}
}));

import { useOptimisticMutation } from '#lib/hooks/use-optimistic-mutation.svelte.ts';

interface Opts {
	meta?: unknown;
	mutationKey?: unknown;
	onMutate: (v: { id: string }) => Promise<unknown>;
	onError: (e: Error, v: { id: string }, ctx: unknown) => void;
	onSuccess: (d: { n: number }, v: { id: string }) => Promise<void>;
}

describe('useOptimisticMutation', () => {
	let qc: QueryClient;
	beforeEach(() => {
		vi.clearAllMocks();
		qc = new QueryClient();
		state.qc = qc;
	});

	function build(extra: Record<string, unknown> = {}) {
		const rollback = vi.fn();
		useOptimisticMutation<{ id: string }, { n: number }, { prev: number }>({
			fn: () => Promise.resolve({ n: 2 }),
			cancelKeys: ({ id }) => [['x', 'detail', id]],
			onMutate: () => ({ prev: 1 }),
			applyOptimistic: ({ id }) => qc.setQueryData(['x', 'detail', id], 2),
			rollback,
			invalidate: () => [['x', 'list']],
			successToast: (vars, data) => `${vars.id}:${data.n}`,
			mutationKey: ['x', 'update'],
			...extra
		});
		return { opts: state.opts as Opts, rollback };
	}

	it('shares resource semantics: key, meta, awaited invalidation, toast with (vars, data)', async () => {
		const { opts } = build({ inlineErrors: true });
		expect(opts.mutationKey).toEqual(['x', 'update']);
		expect(opts.meta).toEqual({ skipErrorToast: true });
		const spy = vi.spyOn(qc, 'invalidateQueries');
		await opts.onSuccess({ n: 2 }, { id: 'a' });
		expect(spy).toHaveBeenCalledWith({ queryKey: ['x', 'list'] });
		expect(toastMock.success).toHaveBeenCalledWith('a:2', undefined);
	});

	it('projects into cached lists on mutate, restores them and rolls back on error, then reconciles', async () => {
		qc.setQueryData(['x', 'list', 'p1'], { rows: [1] });
		const { opts, rollback } = build({
			projectInLists: {
				queryKey: () => [['x', 'list']],
				project: () => ({ rows: [2] })
			}
		});
		const ctx = await opts.onMutate({ id: 'a' });
		expect(qc.getQueryData(['x', 'detail', 'a'])).toBe(2);
		expect(qc.getQueryData(['x', 'list', 'p1'])).toEqual({ rows: [2] });
		const spy = vi.spyOn(qc, 'invalidateQueries');
		opts.onError(new Error('no'), { id: 'a' }, ctx);
		expect(rollback).toHaveBeenCalledWith({ id: 'a' }, { prev: 1 });
		expect(qc.getQueryData(['x', 'list', 'p1'])).toEqual({ rows: [1] });
		expect(spy).toHaveBeenCalledWith({ queryKey: ['x', 'detail', 'a'] });
	});
});
