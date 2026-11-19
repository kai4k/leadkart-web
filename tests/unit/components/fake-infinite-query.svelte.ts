import { vi } from 'vitest';

/**
 * A reactive stand-in for TanStack's infinite-query result: pages, hasNextPage and
 * isFetchingNextPage are `$state`, so effects that read them re-run like the real thing.
 */
export function createFakeInfiniteQuery(initial: { pages?: number; hasNextPage?: boolean } = {}) {
	let pages = $state(initial.pages ?? 1);
	let hasNextPage = $state(initial.hasNextPage ?? true);
	let isFetchingNextPage = $state(false);
	let lastEmpty = $state(false);
	const fetchNextPage = vi.fn(() => Promise.resolve());
	return {
		get data() {
			return {
				pages: Array.from({ length: pages }, (_, i) => ({
					items: i === pages - 1 && lastEmpty ? [] : [1],
					has_more: hasNextPage
				}))
			};
		},
		get hasNextPage() {
			return hasNextPage;
		},
		get isFetchingNextPage() {
			return isFetchingNextPage;
		},
		isPending: false,
		isError: false,
		fetchNextPage,
		/** A page arrived. */
		land(opts: { hasNextPage?: boolean; empty?: boolean } = {}) {
			pages += 1;
			lastEmpty = opts.empty ?? false;
			if (opts.hasNextPage !== undefined) hasNextPage = opts.hasNextPage;
		},
		setFetching(v: boolean) {
			isFetchingNextPage = v;
		}
	};
}

/** IntersectionObserver double: records instances; `report(true)` fires every live observer. */
export function installFakeIntersectionObserver() {
	const instances: FakeObserver[] = [];
	class FakeObserver {
		disconnected = false;
		constructor(private readonly cb: (entries: { isIntersecting: boolean }[]) => void) {
			instances.push(this);
		}
		observe() {}
		disconnect() {
			this.disconnected = true;
		}
		fire(isIntersecting: boolean) {
			if (!this.disconnected) this.cb([{ isIntersecting }]);
		}
	}
	vi.stubGlobal('IntersectionObserver', FakeObserver);
	return {
		instances,
		live: () => instances.filter((i) => !i.disconnected)
	};
}
