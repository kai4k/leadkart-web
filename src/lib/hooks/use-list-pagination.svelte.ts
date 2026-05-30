/**
 * `useListPagination` — URL-driven pagination state for client-paginated
 * resource lists.
 *
 * Three list pages (Users, Tenants, Roles) repeated the same shape:
 *   const currentPage = $derived(Number(searchParams.get('page') ?? '1') || 1);
 *   const pageSize = 10;
 *   function setPage(p: number) { goto(`?page=${p}`) }
 *   const paged = $derived(items.slice((currentPage - 1) * pageSize, ...));
 *
 * Rule of Three was triggered — this hook centralises the wiring while
 * letting callers control items + pageSize. Keeps the `?page=` query
 * param as the single source of truth so refresh + share + browser-back
 * preserve the page position. Mounted to `1` (i.e. omits the param)
 * when on the first page — Stripe/Linear/GitHub convention.
 *
 * Usage in a list component:
 *
 *   import { UseListPagination } from '$lib/hooks';
 *
 *   const pagination = new UseListPagination(() => filtered, { pageSize: 10 });
 *
 *   {#each pagination.paged as item}…{/each}
 *   <Pagination
 *     page={pagination.currentPage}
 *     pageCount={pagination.pageCount}
 *     onChange={pagination.setPage}
 *   />
 *
 * Why class-based: CLAUDE.md rule 4 — class with `$state`/`$derived`
 * fields is the canonical cross-module reactive shape. Module-level
 * `$state` would silently break under SSR + multiple list pages
 * mounted concurrently.
 */
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { SvelteURLSearchParams } from 'svelte/reactivity';

export type UseListPaginationOptions = {
	/** Items per page. Default 10 (Stripe/Linear/GitHub canon for list views). */
	pageSize?: number;
	/** Query-param key. Default 'page' — change only when colliding with another param. */
	paramKey?: string;
};

export class UseListPagination<TItem> {
	readonly pageSize: number;
	readonly paramKey: string;
	private getItems: () => ReadonlyArray<TItem>;

	constructor(getItems: () => ReadonlyArray<TItem>, opts: UseListPaginationOptions = {}) {
		this.getItems = getItems;
		this.pageSize = opts.pageSize ?? 10;
		this.paramKey = opts.paramKey ?? 'page';
	}

	get currentPage(): number {
		const raw = page.url.searchParams.get(this.paramKey);
		const n = Number(raw ?? '1');
		return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
	}

	get pageCount(): number {
		const items = this.getItems();
		return Math.max(1, Math.ceil(items.length / this.pageSize));
	}

	get paged(): TItem[] {
		const items = this.getItems();
		const start = (this.currentPage - 1) * this.pageSize;
		return items.slice(start, start + this.pageSize);
	}

	/**
	 * Method-property bound to the instance so it can be passed straight
	 * to `<Pagination onChange={pagination.setPage} />` without re-binding.
	 */
	readonly setPage = (p: number): void => {
		const params = new SvelteURLSearchParams(page.url.searchParams.toString());
		if (p > 1) {
			params.set(this.paramKey, String(p));
		} else {
			params.delete(this.paramKey);
		}
		const qs = params.toString();
		void goto(qs ? `?${qs}` : page.url.pathname, { replaceState: true });
	};
}
