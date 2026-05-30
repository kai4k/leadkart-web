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

export function createBulkSelection<TItem extends SelectableItem>(): BulkSelection<TItem> {
	const selected = new SvelteSet<string>();

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
