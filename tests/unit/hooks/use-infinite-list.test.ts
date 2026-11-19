import { describe, expect, it, vi } from 'vitest';
import { inRoot } from './root.svelte.ts';

type Captured = {
	queryFn: (ctx: { pageParam: string | undefined; signal: AbortSignal }) => Promise<unknown>;
	getNextPageParam: (last: unknown) => string | undefined;
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
		expect(getNextPageParam({ items: [], has_more: true, next_cursor: 'n' })).toBe('n');
		expect(getNextPageParam({ items: [], has_more: false, next_cursor: 'n' })).toBeUndefined();
		expect(getNextPageParam({ items: [], has_more: true })).toBeUndefined();
		dispose();
	});
});
