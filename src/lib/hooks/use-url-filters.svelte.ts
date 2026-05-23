/**
 * `useUrlFilters` — class-based store that mirrors a typed filter set
 * to the page URL's query string. Resource list pages reach for this
 * once and stop hand-rolling `SvelteURLSearchParams` boilerplate.
 *
 * Single source of truth: the URL. The `filters` field is a reactive
 * `$derived` projection of `page.url.searchParams`. Mutators update
 * the URL via `goto(..., { replaceState, keepFocus })`; the next
 * `$derived` recompute updates `filters` automatically.
 *
 * Two filter shapes are supported per-key:
 *   - `type: 'string'` — single scalar param (`?status=active`)
 *   - `type: 'string[]'` — repeated/CSV param (`?tag=a&tag=b`)
 *
 * Active-chip projection is exposed for `<FilterChips>` consumption
 * (one chip per active filter; multi-value filters render one chip
 * per value so each can be removed independently).
 */
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { SvelteURLSearchParams } from 'svelte/reactivity';

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

function isStringArray(v: UrlFilterValue): v is string[] {
	return Array.isArray(v);
}

/**
 * Class-based filter store. Construct once at the top of a page
 * component:
 *
 *   const filters = new UseUrlFilters<MyFilters>({
 *     status:  { type: 'string',   label: 'Status' },
 *     tag:     { type: 'string[]', label: 'Tag' }
 *   });
 *
 *   <FilterBar urlFilters={filters} ... />
 *   <FilterChips urlFilters={filters} />
 */
export class UseUrlFilters<TFilters extends UrlFiltersBase> {
	readonly schema: UrlFiltersSchema<TFilters>;

	constructor(schema: UrlFiltersSchema<TFilters>) {
		this.schema = schema;
	}

	/** Reactive snapshot of the current filter values, decoded from the URL. */
	get filters(): TFilters {
		const params = page.url.searchParams;
		const out: Record<string, UrlFilterValue> = {};
		for (const key in this.schema) {
			const field = this.schema[key];
			if (field.type === 'string[]') {
				const all = params.getAll(key);
				out[key] = all.length > 0 ? all : (field.defaultValue ?? []);
			} else {
				out[key] = params.get(key) ?? field.defaultValue ?? undefined;
			}
		}
		return out as TFilters;
	}

	/**
	 * Set a filter to a concrete value. Pass `undefined` (string) or
	 * empty array (string[]) to clear.
	 */
	setFilter<K extends keyof TFilters & string>(key: K, value: TFilters[K]): void {
		const next = this.cloneParams();
		const field = this.schema[key];

		if (field.type === 'string[]') {
			next.delete(key);
			if (isStringArray(value)) {
				for (const v of value) {
					if (v != null && v !== '') next.append(key, v);
				}
			}
		} else {
			if (value === undefined || value === null || value === '') {
				next.delete(key);
			} else {
				next.set(key, String(value));
			}
		}

		void this.commit(next);
	}

	/** Remove a filter (equivalent to setting it to undefined / empty). */
	clearFilter<K extends keyof TFilters & string>(key: K): void {
		const next = this.cloneParams();
		next.delete(key);
		void this.commit(next);
	}

	/** Clear all known filters; non-filter params (e.g. `?role=...`) are preserved. */
	clearAll(): void {
		const next = this.cloneParams();
		for (const key in this.schema) {
			next.delete(key);
		}
		void this.commit(next);
	}

	/**
	 * Remove a single value from a multi-value filter (or fully clear
	 * a scalar filter when the values match).
	 */
	clearValue<K extends keyof TFilters & string>(key: K, value: string): void {
		const field = this.schema[key];
		const next = this.cloneParams();
		if (field.type === 'string[]') {
			const remaining = next.getAll(key).filter((v) => v !== value);
			next.delete(key);
			for (const v of remaining) next.append(key, v);
		} else {
			if (next.get(key) === value) next.delete(key);
		}
		void this.commit(next);
	}

	/**
	 * Chip projection — one chip per active value. Multi-value filters
	 * expand to one chip per value so each is independently removable.
	 */
	get activeChips(): UrlFilterChip[] {
		const f = this.filters;
		const chips: UrlFilterChip[] = [];
		for (const key in this.schema) {
			const field = this.schema[key];
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

	/** True iff there is at least one non-default filter applied. */
	get hasActive(): boolean {
		return this.activeChips.length > 0;
	}

	// ── internal ───────────────────────────────────────────────────────

	private cloneParams(): SvelteURLSearchParams {
		return new SvelteURLSearchParams(page.url.searchParams.toString());
	}

	private commit(next: SvelteURLSearchParams): Promise<void> {
		const qs = next.toString();
		const target = qs.length > 0 ? `?${qs}` : page.url.pathname;
		return goto(target, { keepFocus: true, replaceState: true, noScroll: true });
	}
}
