/**
 * `createListPagination` — URL-driven pagination for client-paginated
 * resource lists.
 *
 * Three list pages (Users, Tenants, Roles) repeated the same shape:
 *   const currentPage = $derived(Number(searchParams.get('page') ?? '1') || 1);
 *   const pageSize = 10;
 *   function setPage(p: number) { goto(`?page=${p}`) }
 *   const paged = $derived(items.slice((currentPage - 1) * pageSize, ...));
 *
 * Rule of Three triggered — this factory centralises the wiring while
 * letting callers control items + pageSize. Keeps the `?page=` query
 * param as the single source of truth so refresh + share + browser-back
 * preserve the page position. Mounted to `1` (i.e. omits the param)
 * when on the first page — Stripe/Linear/GitHub convention.
 *
 * Svelte canon: a factory function that closes over `$state`/`$derived`
 * and returns an object with getter accessors. No classes, no `new`,
 * no `this` — runes track reactivity through the closure. Module-level
 * `$state` is avoided because the factory is called per-component,
 * which gives each list its own pagination instance.
 *
 * Usage:
 *
 *   import { createListPagination } from '$lib/hooks';
 *
 *   const pagination = createListPagination(() => filtered, { pageSize: 10 });
 *
 *   {#each pagination.paged as item}…{/each}
 *   <Pagination
 *     page={pagination.currentPage}
 *     pageCount={pagination.pageCount}
 *     onChange={pagination.setPage}
 *   />
 */
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { SvelteURL } from 'svelte/reactivity';

export type ListPaginationOptions = {
	/** Items per page. Default 10 (Stripe/Linear/GitHub canon for list views). */
	pageSize?: number;
	/** Query-param key. Default 'page' — change only when colliding with another param. */
	paramKey?: string;
};

export interface ListPagination<TItem> {
	readonly pageSize: number;
	readonly paramKey: string;
	readonly currentPage: number;
	readonly pageCount: number;
	readonly paged: TItem[];
	setPage(p: number): void;
}

export function createListPagination<TItem>(
	getItems: () => ReadonlyArray<TItem>,
	opts: ListPaginationOptions = {}
): ListPagination<TItem> {
	const pageSize = opts.pageSize ?? 10;
	const paramKey = opts.paramKey ?? 'page';

	function setPage(p: number): void {
		const next = new SvelteURL(page.url);
		if (p > 1) next.searchParams.set(paramKey, String(p));
		else next.searchParams.delete(paramKey);
		void goto(next, { replaceState: true });
	}

	return {
		pageSize,
		paramKey,
		get currentPage() {
			const raw = page.url.searchParams.get(paramKey);
			const n = Number(raw ?? '1');
			return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
		},
		get pageCount() {
			return Math.max(1, Math.ceil(getItems().length / pageSize));
		},
		get paged() {
			const items = getItems();
			const start = (this.currentPage - 1) * pageSize;
			return items.slice(start, start + pageSize);
		},
		setPage
	};
}
