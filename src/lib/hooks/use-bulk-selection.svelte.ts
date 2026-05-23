/**
 * `useBulkSelection` — Set-of-ids selection store for resource list
 * bulk operations. Wraps `SvelteSet<string>` (already self-reactive)
 * so `count` is a proper `$derived` and consumers can pass the
 * instance directly to `<BulkActionBar>`.
 */
import { SvelteSet } from 'svelte/reactivity';

export type SelectableItem = { id: string };

export class UseBulkSelection<TItem extends SelectableItem> {
	readonly selected: SvelteSet<string> = new SvelteSet<string>();

	get count(): number {
		return this.selected.size;
	}

	isSelected(id: string): boolean {
		return this.selected.has(id);
	}

	toggle(id: string): void {
		if (this.selected.has(id)) this.selected.delete(id);
		else this.selected.add(id);
	}

	/** Add every currently-visible item to the selection. */
	selectAllVisible(items: TItem[]): void {
		for (const it of items) this.selected.add(it.id);
	}

	/** Remove every currently-visible item from the selection. */
	deselectAllVisible(items: TItem[]): void {
		for (const it of items) this.selected.delete(it.id);
	}

	clear(): void {
		this.selected.clear();
	}

	/**
	 * Map the selected id-set onto the provided items array. Items not
	 * present in the array (because they're on another page or have
	 * been filtered out) are silently skipped.
	 */
	getSelectedItems(items: TItem[]): TItem[] {
		return items.filter((it) => this.selected.has(it.id));
	}

	/** True iff every visible item is selected. */
	areAllVisibleSelected(items: TItem[]): boolean {
		if (items.length === 0) return false;
		for (const it of items) {
			if (!this.selected.has(it.id)) return false;
		}
		return true;
	}
}
