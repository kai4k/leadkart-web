/**
 * `useInfiniteList` — typed wrapper around TanStack `createInfiniteQuery`
 * tied to an IntersectionObserver sentinel. Returns a class instance
 * whose `items` field is the flattened page array; consumer renders
 * `items` and binds the `sentinelRef` to a `<div bind:this>` placed at
 * the bottom of the list. When the sentinel scrolls into view we call
 * `query.fetchNextPage()`.
 *
 * Cursor-based pagination contract (leadkart-go):
 *   page shape = `{ items, has_more, next_cursor? }`
 *   queryFn receives `{ cursor }` derived from `getNextPageParam`.
 *
 * Lifetime: the IntersectionObserver is constructed inside a `$effect`
 * keyed on `sentinelRef` so it tears down + rebuilds whenever the
 * sentinel element changes. Always returns a cleanup function so
 * Svelte's runtime disconnects the observer on component teardown.
 */
import { createInfiniteQuery, type CreateInfiniteQueryResult } from '@tanstack/svelte-query';

export interface InfinitePage<T> {
	items: T[];
	has_more: boolean;
	next_cursor?: string;
}

export type InfiniteListState = 'pending' | 'error' | 'empty' | 'ready';

export interface UseInfiniteListOptions<T> {
	/** Reactive query key — recomputed on every read for proper invalidation. */
	queryKey: () => readonly unknown[];
	/** Page fetcher. `cursor` is the pageParam threaded by TanStack. */
	queryFn: (ctx: { cursor: string | undefined }) => Promise<InfinitePage<T>>;
	/** Gate the query on a reactive predicate. Defaults to `() => true`. */
	enabled?: () => boolean;
	/**
	 * IntersectionObserver root margin — bump for earlier prefetch.
	 * Defaults to `200px` so the next page is requested ~one viewport
	 * before the user reaches the sentinel.
	 */
	rootMargin?: string;
}

/**
 * Internal type alias for the TanStack handle. Exposed via the class
 * field `query` so consumers can reach into `isFetching`, `isError`,
 * `data.pages`, etc. directly when the high-level wrapper isn't enough.
 */
export type InfiniteListQuery<T> = CreateInfiniteQueryResult<
	{ pages: InfinitePage<T>[]; pageParams: (string | undefined)[] },
	Error
>;

export class UseInfiniteList<T> {
	readonly query: InfiniteListQuery<T>;
	/** Sentinel element ref — bind via `<div bind:this={list.sentinelRef}></div>`. */
	sentinelRef: HTMLElement | null = $state(null);

	private readonly rootMargin: string;

	constructor(options: UseInfiniteListOptions<T>) {
		const enabled = options.enabled ?? (() => true);
		this.rootMargin = options.rootMargin ?? '200px';

		this.query = createInfiniteQuery(() => ({
			queryKey: options.queryKey(),
			queryFn: ({ pageParam }) => options.queryFn({ cursor: pageParam as string | undefined }),
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (last: InfinitePage<T>) =>
				last.has_more ? (last.next_cursor ?? undefined) : undefined,
			enabled: enabled()
		})) as InfiniteListQuery<T>;

		// IntersectionObserver lifecycle pinned to sentinel + page state.
		$effect(() => {
			const el = this.sentinelRef;
			if (!el) return;
			const observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting && this.query.hasNextPage && !this.query.isFetchingNextPage) {
							void this.query.fetchNextPage();
						}
					}
				},
				{ rootMargin: this.rootMargin }
			);
			observer.observe(el);
			return () => observer.disconnect();
		});
	}

	/** Flattened items across all loaded pages. */
	get items(): T[] {
		const pages = this.query.data?.pages ?? [];
		const out: T[] = [];
		for (const p of pages) {
			for (const it of p.items) out.push(it);
		}
		return out;
	}

	/** Coarse state for DataTable's `state` prop. */
	get state(): InfiniteListState {
		if (this.query.isPending) return 'pending';
		if (this.query.isError) return 'error';
		if (this.items.length === 0) return 'empty';
		return 'ready';
	}

	/** Error message for the error state. */
	get error(): string | null {
		return this.query.error?.message ?? null;
	}

	/** True while any in-flight fetch (initial or pagination) is open. */
	get isFetching(): boolean {
		return this.query.isFetching;
	}

	/** True while the next-page fetch is in flight. */
	get isFetchingNextPage(): boolean {
		return this.query.isFetchingNextPage;
	}

	/** True if `getNextPageParam` returned a non-null cursor on the last page. */
	get hasNextPage(): boolean {
		return this.query.hasNextPage ?? false;
	}
}
