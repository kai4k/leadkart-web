/**
 * `createSavedViews` — preset filter combinations rendered as tabs at
 * the top of a resource list page. Pattern reference: Linear's "All /
 * My Issues / In Progress" tabs and Stripe's saved-view chips.
 *
 * Views are pure presets — clicking one writes its `filters` partial
 * to the underlying `UrlFilters` instance (which in turn updates the
 * URL). Active-state detection compares the current URL filters to
 * the view's preset (other schema keys must be empty, mirroring `clearOthers`); the first matching view wins.
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

/** Empty (undefined, '' or []) normalises to undefined; arrays compare order-insensitively. */
function normalise(v: unknown): unknown {
	if (v === undefined || v === null || v === '') return undefined;
	if (Array.isArray(v)) return v.length === 0 ? undefined : [...v].sort();
	return v;
}

function valuesEqual(a: unknown, b: unknown): boolean {
	const na = normalise(a);
	const nb = normalise(b);
	if (Array.isArray(na) && Array.isArray(nb)) {
		return na.length === nb.length && na.every((v, i) => v === nb[i]);
	}
	return na === nb;
}

export function createSavedViews<TFilters extends UrlFiltersBase>(
	views: SavedView<TFilters>[],
	urlFilters: UrlFilters<TFilters>
): SavedViews<TFilters> {
	/**
	 * Mirrors `activate` (`setMany(filters, { clearOthers: true })`): every schema key the view
	 * names must equal it, and every OTHER schema key must be at its default/empty — so "All"
	 * (`{}`) is active only when no filter is set.
	 */
	function isActive(viewId: string): boolean {
		const v = views.find((x) => x.id === viewId);
		if (!v) return false;
		const current = urlFilters.filters;
		for (const key in urlFilters.schema) {
			const expected = key in v.filters ? v.filters[key] : urlFilters.schema[key]?.defaultValue;
			if (!valuesEqual(current[key], expected)) return false;
		}
		return true;
	}

	return {
		views,
		activate(viewId) {
			const v = views.find((x) => x.id === viewId);
			if (v) urlFilters.setMany(v.filters, { clearOthers: true });
		},
		isActive,
		get activeId() {
			for (const v of views) if (isActive(v.id)) return v.id;
			return null;
		}
	};
}
