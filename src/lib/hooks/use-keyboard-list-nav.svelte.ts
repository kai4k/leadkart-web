/**
 * `useRovingNav` — WAI-ARIA APG roving-tabindex keyboard nav for
 * resource list pages, matching the Linear / Notion / GitHub canon.
 *
 * Roving tabindex: exactly ONE row owns `tabindex=0` (the focused
 * row); every other row carries `tabindex=-1`. Arrow / j / k keys
 * move the focus AND the `tabindex=0` ownership in lockstep, so
 * Tab from anywhere on the page lands the user back on the row
 * they were last viewing — the WCAG 2.2 expectation for grid /
 * listbox patterns.
 *
 * Consumer pattern:
 *
 *   const nav = new UseKeyboardListNav<MyItem>({
 *     onSelect: (it) => goto(`/leads/${it.id}`),
 *     onEdit:   (it) => openEditDrawer(it),
 *     onToggleSelect: (it) => bulk.toggle(it.id)
 *   });
 *
 *   $effect(() => nav.setItems(list.items));
 *
 *   <tbody
 *     data-roving-root
 *     onkeydown={(e) => nav.handleKey(e)}
 *     onfocusin={() => nav.onFocusIn()}
 *     onfocusout={(e) => nav.onFocusOut(e)}
 *   >
 *     {#each rows as item, i (item.id)}
 *       <tr
 *         tabindex={nav.tabindexFor(i)}
 *         bind:this={refs[item.id]}
 *         ...
 *       />
 *     {/each}
 *   </tbody>
 *
 * Guards baked in:
 *   - target is `<input>`/`<textarea>`/`<select>`/[contenteditable]
 *     → bail (typing in the search bar doesn't jump rows)
 *   - meta/ctrl/alt held → bail (browser shortcuts + Cmd+K win)
 *
 * `focusedIdx` starts at `0` (NOT `-1`) so consumers never branch
 * on a sentinel. When the list is empty the index stays at `0`
 * but `focusRow` short-circuits; `hasFocus` reports whether the
 * list currently owns DOM focus so consumers can gate the
 * "active row" accent without flashing on initial mount.
 */
import { SvelteMap } from 'svelte/reactivity';

export type KeyableItem = { id: string };

export interface UseKeyboardListNavOptions<TItem extends KeyableItem> {
	/** Invoked on Enter while a row is focused. */
	onSelect?: (item: TItem) => void;
	/** Invoked on `e` while a row is focused. */
	onEdit?: (item: TItem) => void;
	/** Invoked on `x` while a row is focused — typically toggles bulk selection. */
	onToggleSelect?: (item: TItem) => void;
}

export class UseKeyboardListNav<TItem extends KeyableItem> {
	/**
	 * Index of the currently focused row. Starts at `0` — consumers
	 * gate on `items.length > 0` to render the accent, never on a
	 * `< 0` sentinel.
	 */
	focusedIdx: number = $state(0);

	/** True while the list itself owns DOM focus. */
	hasFocus: boolean = $state(false);

	private items: TItem[] = $state([]);
	private readonly refs: SvelteMap<string, HTMLElement> = new SvelteMap();
	private readonly options: UseKeyboardListNavOptions<TItem>;

	constructor(options: UseKeyboardListNavOptions<TItem> = {}) {
		this.options = options;
	}

	/**
	 * Update the navigable set. Keeps `focusedIdx` in range when the
	 * list shrinks; clamps to the last row when needed.
	 */
	setItems(items: TItem[]): void {
		this.items = items;
		if (this.focusedIdx >= items.length) {
			this.focusedIdx = Math.max(0, items.length - 1);
		}
	}

	/**
	 * Register a row's DOM element under its id. Pass `null` to
	 * unregister — re-renders that swap a row's DOM node should call
	 * `registerRef(id, null)` from the cleanup phase of the `$effect`.
	 */
	registerRef(id: string, el: HTMLElement | null): void {
		if (el) this.refs.set(id, el);
		else this.refs.delete(id);
	}

	/**
	 * Returns the tabindex value for a given row index. Exactly one
	 * row has `tabindex=0` (the focused one); every other row carries
	 * `tabindex=-1`. This is the roving-tabindex contract per
	 * WAI-ARIA APG (grid + listbox patterns).
	 */
	tabindexFor(idx: number): 0 | -1 {
		return idx === this.focusedIdx ? 0 : -1;
	}

	/**
	 * Move focus (DOM + index) to a row. Scrolls the row into view
	 * with `block: 'nearest'` so j/k navigation never overshoots the
	 * viewport. No-op when the target index is out of range.
	 */
	focusRow(idx: number): void {
		if (idx < 0 || idx >= this.items.length) return;
		this.focusedIdx = idx;
		const id = this.items[idx]?.id;
		const el = id ? this.refs.get(id) : null;
		if (!el) return;
		el.focus();
		// jsdom doesn't implement scrollIntoView — guard so unit tests
		// don't trip over it. Real browsers always have the method.
		if (typeof el.scrollIntoView === 'function') {
			el.scrollIntoView({ block: 'nearest' });
		}
	}

	/**
	 * Attach to the list/table container's `onkeydown` (NOT window).
	 * Returns the bound handler that interprets j/k/ArrowUp/ArrowDown
	 * for movement, Enter for select, e for edit, x for toggle-select,
	 * Home/End for jumping to bounds.
	 */
	handleKey(event: KeyboardEvent): void {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		const target = event.target as HTMLElement | null;
		if (this.isTypingTarget(target)) return;

		switch (event.key) {
			case 'j':
			case 'ArrowDown':
				if (this.focusedIdx < this.items.length - 1) {
					event.preventDefault();
					this.focusRow(this.focusedIdx + 1);
				}
				return;
			case 'k':
			case 'ArrowUp':
				if (this.focusedIdx > 0) {
					event.preventDefault();
					this.focusRow(this.focusedIdx - 1);
				}
				return;
			case 'Enter': {
				const item = this.items[this.focusedIdx];
				if (item && this.options.onSelect) {
					event.preventDefault();
					this.options.onSelect(item);
				}
				return;
			}
			case 'e':
			case 'E': {
				const item = this.items[this.focusedIdx];
				if (item && this.options.onEdit) {
					event.preventDefault();
					this.options.onEdit(item);
				}
				return;
			}
			case 'x':
			case 'X': {
				const item = this.items[this.focusedIdx];
				if (item && this.options.onToggleSelect) {
					event.preventDefault();
					this.options.onToggleSelect(item);
				}
				return;
			}
			case 'Home':
				event.preventDefault();
				this.focusRow(0);
				return;
			case 'End':
				event.preventDefault();
				this.focusRow(this.items.length - 1);
				return;
			default:
				return;
		}
	}

	/** Container `onfocusin` — flips `hasFocus` on. */
	onFocusIn(): void {
		this.hasFocus = true;
	}

	/**
	 * Container `onfocusout` — flips `hasFocus` off ONLY when focus is
	 * leaving the list entirely. Row-to-row focus moves inside the
	 * same `data-roving-root` ancestor keep the active-row accent
	 * lit. The host element MUST declare `data-roving-root` on the
	 * `<table>`/`<tbody>`/`<ul>` for this boundary check to work.
	 */
	onFocusOut(event: FocusEvent): void {
		const next = event.relatedTarget as HTMLElement | null;
		if (!next) {
			this.hasFocus = false;
			return;
		}
		let walk: HTMLElement | null = next;
		while (walk) {
			if (walk.hasAttribute('data-roving-root')) return;
			walk = walk.parentElement;
		}
		this.hasFocus = false;
	}

	private isTypingTarget(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;
		const tag = target.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
		if (target.isContentEditable) return true;
		return false;
	}
}
