import { describe, expect, it, vi } from 'vitest';
import { inRoot } from './root.svelte.ts';

type Captured = {
	queryFn: (ctx: { pageParam: string | undefined; signal: AbortSignal }) => Promise<unknown>;
	getNextPageParam: (
		last: unknown,
		all: unknown[],
		lastParam: string | undefined,
		allParams: (string | undefined)[]
	) => string | undefined;
	initialPageParam: undefined;
};
const captured = vi.hoisted(() => ({ opts: undefined as unknown }));
vi.mock('@tanstack/svelte-query', () => ({
	createInfiniteQuery: (fn: () => unknown) => {
		captured.opts = fn();
		return { data: undefined, isPending: true, hasNextPage: false };
	}
}));

import { createInfiniteList } from '#lib/hooks/use-infinite-list.svelte.ts';

describe('createInfiniteList', () => {
	it('forwards the TanStack signal and cursor to queryFn', async () => {
		const queryFn = vi.fn().mockResolvedValue({ items: [1], has_more: false });
		const { dispose } = inRoot(() =>
			createInfiniteList<number>({ queryKey: () => ['t'], queryFn })
		);
		const opts = captured.opts as Captured;
		const signal = new AbortController().signal;
		await opts.queryFn({ pageParam: 'c2', signal });
		expect(queryFn).toHaveBeenCalledWith({ cursor: 'c2', signal });
		dispose();
	});

	it('getNextPageParam uses the shared nextCursor rule', () => {
		const { dispose } = inRoot(() =>
			createInfiniteList<number>({ queryKey: () => ['t'], queryFn: vi.fn() })
		);
		const { getNextPageParam } = captured.opts as Captured;
		const first = (last: unknown) => getNextPageParam(last, [], undefined, [undefined]);
		expect(first({ items: [], has_more: true, next_cursor: 'n' })).toBe('n');
		expect(first({ items: [], has_more: false, next_cursor: 'n' })).toBeUndefined();
		expect(first({ items: [], has_more: true })).toBeUndefined();
		dispose();
	});

	it('getNextPageParam stops on a cursor it already requested (an echo, or A -> B -> A)', () => {
		const err = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { dispose } = inRoot(() =>
			createInfiniteList<number>({ queryKey: () => ['t'], queryFn: vi.fn() })
		);
		const { getNextPageParam } = captured.opts as Captured;
		const more = (c: string) => ({ items: [], has_more: true, next_cursor: c });
		// echo: asked for X, Go answers next_cursor X
		expect(getNextPageParam(more('X'), [], 'X', [undefined, 'X'])).toBeUndefined();
		// A -> B -> A
		expect(getNextPageParam(more('A'), [], 'B', [undefined, 'A', 'B'])).toBeUndefined();
		// a new cursor still advances
		expect(getNextPageParam(more('C'), [], 'B', [undefined, 'A', 'B'])).toBe('C');
		err.mockRestore();
		dispose();
	});
});
