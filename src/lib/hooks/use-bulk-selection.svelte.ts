/**
 * `createBulkSelection` — Set-of-ids selection store for resource-list
 * bulk operations. Wraps `SvelteSet<string>` (already self-reactive)
 * so `count` reads through the proxy, and consumers can pass the
 * returned object directly to `<BulkActionBar>`.
 *
 * Svelte canon: a factory closing over reactive state. The returned
 * object has getters for derived values and plain functions for
 * imperative actions. No classes, no `this`.
 */
import { SvelteSet } from 'svelte/reactivity';

export type SelectableItem = { id: string };

export interface BulkSelection<TItem extends SelectableItem> {
	readonly selected: SvelteSet<string>;
	readonly count: number;
	isSelected(id: string): boolean;
	toggle(id: string): void;
	selectAllVisible(items: TItem[]): void;
	deselectAllVisible(items: TItem[]): void;
	clear(): void;
	getSelectedItems(items: TItem[]): TItem[];
	areAllVisibleSelected(items: TItem[]): boolean;
}

/**
 * The scope key of a list driven by URL filters: every filter that decides WHICH rows are shown.
 * `sort` is left out by default: a new order shows the same rows, so the selection stays.
 */
export function filtersScopeKey(
	filters: Record<string, unknown>,
	ignore: string[] = ['sort']
): string {
	return JSON.stringify(
		Object.keys(filters)
			.filter((key) => !ignore.includes(key))
			.sort()
			.map((key) => [key, filters[key]])
	);
}

/**
 * @param getScopeKey what decides which rows the list shows, as a string: the search, the filters, and
 *   the PAGE NUMBER of an offset-paged list (a row on another page is not on screen). When it changes
 *   the selection is cleared: a bulk action must not run on rows the person can no longer see (tick
 *   Ravi, search "asha" or press Next, Deactivate would hit Ravi). The sort order is not part of it.
 *   Pass it from a component; without it the selection is only cleared by the caller.
 */
export function createBulkSelection<TItem extends SelectableItem>(
	getScopeKey?: () => string
): BulkSelection<TItem> {
	const selected = new SvelteSet<string>();

	if (getScopeKey) {
		let seen: string | undefined;
		$effect(() => {
			const key = getScopeKey();
			if (seen !== undefined && key !== seen) selected.clear();
			seen = key;
		});
	}

	return {
		selected,
		get count() {
			return selected.size;
		},
		isSelected(id) {
			return selected.has(id);
		},
		toggle(id) {
			if (selected.has(id)) selected.delete(id);
			else selected.add(id);
		},
		selectAllVisible(items) {
			for (const it of items) selected.add(it.id);
		},
		deselectAllVisible(items) {
			for (const it of items) selected.delete(it.id);
		},
		clear() {
			selected.clear();
		},
		getSelectedItems(items) {
			return items.filter((it) => selected.has(it.id));
		},
		areAllVisibleSelected(items) {
			if (items.length === 0) return false;
			for (const it of items) if (!selected.has(it.id)) return false;
			return true;
		}
	};
}
