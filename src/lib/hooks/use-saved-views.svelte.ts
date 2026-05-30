/**
 * `createSavedViews` — preset filter combinations rendered as tabs at
 * the top of a resource list page. Pattern reference: Linear's "All /
 * My Issues / In Progress" tabs and Stripe's saved-view chips.
 *
 * Views are pure presets — clicking one writes its `filters` partial
 * to the underlying `UrlFilters` instance (which in turn updates the
 * URL). Active-state detection compares the current URL filters to
 * the view's preset; the first matching view wins.
 *
 * Svelte canon: a factory returning an object with reactive getters
 * and action functions, closing over the views + url filters.
 */
import type { UrlFilters, UrlFiltersBase } from './use-url-filters.svelte';

export interface SavedView<TFilters extends UrlFiltersBase> {
	id: string;
	label: string;
	/** The filter values applied when this view is activated. */
	filters: Partial<TFilters>;
	/** Optional badge count (e.g. "Awaiting decision · 3"). */
	count?: () => number;
}

export interface SavedViews<TFilters extends UrlFiltersBase> {
	readonly views: SavedView<TFilters>[];
	readonly activeId: string | null;
	activate(viewId: string): void;
	isActive(viewId: string): boolean;
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

export function createSavedViews<TFilters extends UrlFiltersBase>(
	views: SavedView<TFilters>[],
	urlFilters: UrlFilters<TFilters>
): SavedViews<TFilters> {
	function isActive(viewId: string): boolean {
		const v = views.find((x) => x.id === viewId);
		if (!v) return false;
		const current = urlFilters.filters;
		for (const key in v.filters) {
			if (!valuesEqual(current[key as keyof TFilters], v.filters[key as keyof TFilters])) {
				return false;
			}
		}
		return true;
	}

	return {
		views,
		activate(viewId) {
			const v = views.find((x) => x.id === viewId);
			if (!v) return;
			for (const key in v.filters) {
				const k = key as keyof TFilters & string;
				const value = v.filters[k];
				if (value !== undefined) {
					urlFilters.setFilter(k, value as TFilters[typeof k]);
				} else {
					urlFilters.clearFilter(k);
				}
			}
		},
		isActive,
		get activeId() {
			for (const v of views) if (isActive(v.id)) return v.id;
			return null;
		}
	};
}
