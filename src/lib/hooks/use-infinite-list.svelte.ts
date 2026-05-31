/**
 * `createInfiniteList` — typed wrapper around TanStack `createInfiniteQuery`
 * tied to an IntersectionObserver sentinel. Returns an object whose
 * `items` getter is the flattened page array; consumer renders `items`
 * and binds the `sentinelRef` to a `<div bind:this>` placed at the
 * bottom of the list. When the sentinel scrolls into view we call
 * `query.fetchNextPage()`.
 *
 * Cursor-based pagination contract (leadkart-go):
 *   page shape = `{ items, has_more, next_cursor? }`
 *   queryFn receives `{ cursor }` derived from `getNextPageParam`.
 *
 * Svelte canon: a factory closing over `$state` (the sentinel ref).
 * The IntersectionObserver lifecycle is pinned to a `$effect` declared
 * INSIDE the factory body, which means the factory MUST be called from
 * a component-mounted context (a `.svelte` file or a function called
 * during a component setup). The `$effect` tears down + rebuilds the
 * observer whenever the sentinel ref changes, and Svelte's runtime
 * disconnects the observer on component teardown.
 */
import { createInfiniteQuery, type CreateInfiniteQueryResult } from '@tanstack/svelte-query';

export interface InfinitePage<T> {
	items: T[];
	has_more: boolean;
	next_cursor?: string;
}

export type InfiniteListState = 'pending' | 'error' | 'empty' | 'ready';

export interface InfiniteListOptions<T> {
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
 * Internal type alias for the TanStack handle. Exposed via the returned
 * `query` field so consumers can reach into `isFetching`, `isError`,
 * `data.pages`, etc. directly when the high-level wrapper isn't enough.
 */
export type InfiniteListQuery<T> = CreateInfiniteQueryResult<
	{ pages: InfinitePage<T>[]; pageParams: (string | undefined)[] },
	Error
>;

export interface InfiniteList<T> {
	readonly query: InfiniteListQuery<T>;
	sentinelRef: HTMLElement | null;
	readonly items: T[];
	readonly state: InfiniteListState;
	readonly error: string | null;
	readonly isFetching: boolean;
	readonly isFetchingNextPage: boolean;
	readonly hasNextPage: boolean;
}

export function createInfiniteList<T>(options: InfiniteListOptions<T>): InfiniteList<T> {
	const enabled = options.enabled ?? (() => true);
	const rootMargin = options.rootMargin ?? '200px';

	const query = createInfiniteQuery(() => ({
		queryKey: options.queryKey(),
		queryFn: ({ pageParam }) => options.queryFn({ cursor: pageParam as string | undefined }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (last: InfinitePage<T>) =>
			last.has_more ? (last.next_cursor ?? undefined) : undefined,
		enabled: enabled()
	})) as InfiniteListQuery<T>;

	let sentinelRef = $state<HTMLElement | null>(null);

	$effect(() => {
		const el = sentinelRef;
		if (!el) return;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
						void query.fetchNextPage();
					}
				}
			},
			{ rootMargin }
		);
		observer.observe(el);
		return () => observer.disconnect();
	});

	return {
		query,
		get sentinelRef() {
			return sentinelRef;
		},
		set sentinelRef(el: HTMLElement | null) {
			sentinelRef = el;
		},
		get items() {
			const pages = query.data?.pages ?? [];
			const out: T[] = [];
			for (const p of pages) {
				for (const it of p.items) out.push(it);
			}
			return out;
		},
		get state() {
			if (query.isPending) return 'pending';
			if (query.isError) return 'error';
			if (this.items.length === 0) return 'empty';
			return 'ready';
		},
		get error() {
			return query.error?.message ?? null;
		},
		get isFetching() {
			return query.isFetching;
		},
		get isFetchingNextPage() {
			return query.isFetchingNextPage;
		},
		get hasNextPage() {
			return query.hasNextPage ?? false;
		}
	};
}
