/**
 * `createUrlFilters` — factory that mirrors a typed filter set to the
 * page URL's query string. Resource list pages reach for this once
 * and stop hand-rolling `SvelteURLSearchParams` boilerplate.
 *
 * Single source of truth: the URL. The `filters` getter is a reactive
 * projection of `page.url.searchParams`. Mutators update the URL via
 * `goto(..., { replaceState, keepFocus })`; the next read picks up
 * the change automatically.
 *
 * Two filter shapes are supported per-key:
 *   - `type: 'string'` — single scalar param (`?status=active`)
 *   - `type: 'string[]'` — repeated/CSV param (`?tag=a&tag=b`)
 *
 * Active-chip projection is exposed for `<FilterChips>` consumption
 * (one chip per active filter; multi-value filters render one chip
 * per value so each can be removed independently).
 *
 * Svelte canon: a factory returning an object with reactive getters
 * and plain action functions. No classes, no `this`.
 *
 * Usage:
 *
 *   const filters = createUrlFilters<MyFilters>({
 *     status:  { type: 'string',   label: 'Status' },
 *     tag:     { type: 'string[]', label: 'Tag' }
 *   });
 *
 *   <FilterBar urlFilters={filters} ... />
 *   <FilterChips urlFilters={filters} />
 */
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { SvelteURL, SvelteURLSearchParams } from 'svelte/reactivity';

export type UrlFilterValue = string | string[] | undefined;
export type UrlFiltersBase = Record<string, UrlFilterValue>;

export interface UrlFilterFieldSchema<V extends UrlFilterValue> {
	type: V extends string[] ? 'string[]' : 'string';
	defaultValue?: V;
	label: string;
}

export type UrlFiltersSchema<TFilters extends UrlFiltersBase> = {
	[K in keyof TFilters]: UrlFilterFieldSchema<TFilters[K]>;
};

export interface UrlFilterChip {
	/** Schema key the chip belongs to (e.g. `status`). */
	key: string;
	/** Schema label used in `aria-label` + visible chip text. */
	label: string;
	/** The exact value being represented — for multi-value filters, ONE entry. */
	value: string;
}

export interface UrlFilters<TFilters extends UrlFiltersBase> {
	readonly schema: UrlFiltersSchema<TFilters>;
	readonly filters: TFilters;
	readonly activeChips: UrlFilterChip[];
	readonly hasActive: boolean;
	setFilter<K extends keyof TFilters & string>(key: K, value: TFilters[K]): void;
	clearFilter<K extends keyof TFilters & string>(key: K): void;
	clearAll(): void;
	clearValue<K extends keyof TFilters & string>(key: K, value: string): void;
}

function isStringArray(v: UrlFilterValue): v is string[] {
	return Array.isArray(v);
}

export function createUrlFilters<TFilters extends UrlFiltersBase>(
	schema: UrlFiltersSchema<TFilters>
): UrlFilters<TFilters> {
	function cloneParams(): SvelteURLSearchParams {
		return new SvelteURLSearchParams(page.url.searchParams.toString());
	}

	function commit(next: SvelteURLSearchParams): void {
		const url = new SvelteURL(page.url);
		url.search = next.toString();
		void goto(url, { keepFocus: true, replaceState: true, noScroll: true });
	}

	function readFilters(): TFilters {
		const params = page.url.searchParams;
		const out: Record<string, UrlFilterValue> = {};
		for (const key in schema) {
			const field = schema[key];
			if (field.type === 'string[]') {
				const all = params.getAll(key);
				out[key] = all.length > 0 ? all : (field.defaultValue ?? []);
			} else {
				out[key] = params.get(key) ?? field.defaultValue ?? undefined;
			}
		}
		return out as TFilters;
	}

	function readChips(): UrlFilterChip[] {
		const f = readFilters();
		const chips: UrlFilterChip[] = [];
		for (const key in schema) {
			const field = schema[key];
			const value = f[key];
			if (field.type === 'string[]' && isStringArray(value)) {
				for (const v of value) {
					if (v != null && v !== '') {
						chips.push({ key, label: field.label, value: v });
					}
				}
			} else if (typeof value === 'string' && value !== '') {
				chips.push({ key, label: field.label, value });
			}
		}
		return chips;
	}

	return {
		schema,
		get filters() {
			return readFilters();
		},
		get activeChips() {
			return readChips();
		},
		get hasActive() {
			return readChips().length > 0;
		},
		setFilter(key, value) {
			const next = cloneParams();
			const field = schema[key];
			if (field.type === 'string[]') {
				next.delete(key);
				if (isStringArray(value)) {
					for (const v of value) if (v != null && v !== '') next.append(key, v);
				}
			} else if (value === undefined || value === null || value === '') {
				next.delete(key);
			} else {
				next.set(key, String(value));
			}
			commit(next);
		},
		clearFilter(key) {
			const next = cloneParams();
			next.delete(key);
			commit(next);
		},
		clearAll() {
			const next = cloneParams();
			for (const key in schema) next.delete(key);
			commit(next);
		},
		clearValue(key, value) {
			const field = schema[key];
			const next = cloneParams();
			if (field.type === 'string[]') {
				const remaining = next.getAll(key).filter((v) => v !== value);
				next.delete(key);
				for (const v of remaining) next.append(key, v);
			} else if (next.get(key) === value) {
				next.delete(key);
			}
			commit(next);
		}
	};
}
