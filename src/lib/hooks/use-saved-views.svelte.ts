/**
 * `useSavedViews` — preset filter combinations rendered as tabs at the
 * top of a resource list page. Pattern reference: Linear's "All / My
 * Issues / In Progress" tabs and Stripe's saved-view chips.
 *
 * Views are pure presets — clicking one writes its `filters` partial
 * to the underlying `UseUrlFilters` instance (which in turn updates
 * the URL). Active-state detection compares the current URL filters
 * to the view's preset; the first matching view wins.
 */
import type { UseUrlFilters, UrlFiltersBase } from './use-url-filters.svelte';

export interface SavedView<TFilters extends UrlFiltersBase> {
	id: string;
	label: string;
	/** The filter values applied when this view is activated. */
	filters: Partial<TFilters>;
	/** Optional badge count (e.g. "Awaiting decision · 3"). */
	count?: () => number;
}

function valuesEqual(a: unknown, b: unknown): boolean {
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		const as = [...a].sort();
		const bs = [...b].sort();
		return as.every((v, i) => v === bs[i]);
	}
	return a === b;
}

export class UseSavedViews<TFilters extends UrlFiltersBase> {
	readonly views: SavedView<TFilters>[];
	private readonly urlFilters: UseUrlFilters<TFilters>;

	constructor(views: SavedView<TFilters>[], urlFilters: UseUrlFilters<TFilters>) {
		this.views = views;
		this.urlFilters = urlFilters;
	}

	/**
	 * Apply a view's preset. Filters NOT mentioned by the view are
	 * left intact — callers wanting a "fresh slate" should include
	 * explicit clears in the view's `filters`.
	 */
	activate(viewId: string): void {
		const v = this.views.find((x) => x.id === viewId);
		if (!v) return;
		for (const key in v.filters) {
			const k = key as keyof TFilters & string;
			const value = v.filters[k];
			if (value !== undefined) {
				this.urlFilters.setFilter(k, value as TFilters[typeof k]);
			} else {
				this.urlFilters.clearFilter(k);
			}
		}
	}

	/**
	 * True when every key in `view.filters` matches the current URL
	 * state. Empty-preset views ("All") are active iff no other
	 * preset is active — handled implicitly because their filter
	 * object is empty so the `every` returns true; consumers should
	 * declare the "All" view first and rely on falling through.
	 */
	isActive(viewId: string): boolean {
		const v = this.views.find((x) => x.id === viewId);
		if (!v) return false;
		const current = this.urlFilters.filters;
		for (const key in v.filters) {
			if (!valuesEqual(current[key as keyof TFilters], v.filters[key as keyof TFilters])) {
				return false;
			}
		}
		return true;
	}

	/** The id of the first matching view — null if none match. */
	get activeId(): string | null {
		for (const v of this.views) {
			if (this.isActive(v.id)) return v.id;
		}
		return null;
	}
}
