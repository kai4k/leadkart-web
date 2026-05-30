/**
 * `createKeyboardListNav` — WAI-ARIA APG roving-tabindex keyboard nav
 * for resource list pages, matching the Linear / Notion / GitHub canon.
 *
 * Roving tabindex: exactly ONE row owns `tabindex=0` (the focused row);
 * every other row carries `tabindex=-1`. Arrow / j / k keys move the
 * focus AND the `tabindex=0` ownership in lockstep, so Tab from
 * anywhere on the page lands the user back on the row they were last
 * viewing — the WCAG 2.2 expectation for grid / listbox patterns.
 *
 * Svelte canon: a factory closing over reactive `$state` for
 * `focusedIdx` + `hasFocus`. Returns an object with getter accessors
 * and plain action functions. No classes, no `this`.
 *
 * Consumer pattern:
 *
 *   const nav = createKeyboardListNav<MyItem>({
 *     onSelect: (it) => goto(`/leads/${it.id}`),
 *     onEdit:   (it) => openEditDrawer(it),
 *     onToggleSelect: (it) => bulk.toggle(it.id)
 *   });
 *
 *   $effect(() => nav.setItems(list.items));
 *
 *   <tbody
 *     data-roving-root
 *     onkeydown={nav.handleKey}
 *     onfocusin={nav.onFocusIn}
 *     onfocusout={nav.onFocusOut}
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
 */
import { SvelteMap } from 'svelte/reactivity';

export type KeyableItem = { id: string };

export interface KeyboardListNavOptions<TItem extends KeyableItem> {
	/** Invoked on Enter while a row is focused. */
	onSelect?: (item: TItem) => void;
	/** Invoked on `e` while a row is focused. */
	onEdit?: (item: TItem) => void;
	/** Invoked on `x` while a row is focused — typically toggles bulk selection. */
	onToggleSelect?: (item: TItem) => void;
}

export interface KeyboardListNav<TItem extends KeyableItem> {
	readonly focusedIdx: number;
	readonly hasFocus: boolean;
	setItems(items: TItem[]): void;
	registerRef(id: string, el: HTMLElement | null): void;
	tabindexFor(idx: number): 0 | -1;
	focusRow(idx: number): void;
	handleKey(event: KeyboardEvent): void;
	onFocusIn(): void;
	onFocusOut(event: FocusEvent): void;
}

function isTypingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
	if (target.isContentEditable) return true;
	return false;
}

export function createKeyboardListNav<TItem extends KeyableItem>(
	options: KeyboardListNavOptions<TItem> = {}
): KeyboardListNav<TItem> {
	let focusedIdx = $state(0);
	let hasFocus = $state(false);
	let items: TItem[] = $state([]);
	const refs = new SvelteMap<string, HTMLElement>();

	function setItems(next: TItem[]): void {
		items = next;
		if (focusedIdx >= next.length) {
			focusedIdx = Math.max(0, next.length - 1);
		}
	}

	function focusRow(idx: number): void {
		if (idx < 0 || idx >= items.length) return;
		focusedIdx = idx;
		const id = items[idx]?.id;
		const el = id ? refs.get(id) : null;
		if (!el) return;
		el.focus();
		// jsdom doesn't implement scrollIntoView — guard so unit tests
		// don't trip over it. Real browsers always have the method.
		if (typeof el.scrollIntoView === 'function') {
			el.scrollIntoView({ block: 'nearest' });
		}
	}

	function handleKey(event: KeyboardEvent): void {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		const target = event.target as HTMLElement | null;
		if (isTypingTarget(target)) return;

		switch (event.key) {
			case 'j':
			case 'ArrowDown':
				if (focusedIdx < items.length - 1) {
					event.preventDefault();
					focusRow(focusedIdx + 1);
				}
				return;
			case 'k':
			case 'ArrowUp':
				if (focusedIdx > 0) {
					event.preventDefault();
					focusRow(focusedIdx - 1);
				}
				return;
			case 'Enter': {
				const item = items[focusedIdx];
				if (item && options.onSelect) {
					event.preventDefault();
					options.onSelect(item);
				}
				return;
			}
			case 'e':
			case 'E': {
				const item = items[focusedIdx];
				if (item && options.onEdit) {
					event.preventDefault();
					options.onEdit(item);
				}
				return;
			}
			case 'x':
			case 'X': {
				const item = items[focusedIdx];
				if (item && options.onToggleSelect) {
					event.preventDefault();
					options.onToggleSelect(item);
				}
				return;
			}
			case 'Home':
				event.preventDefault();
				focusRow(0);
				return;
			case 'End':
				event.preventDefault();
				focusRow(items.length - 1);
				return;
			default:
				return;
		}
	}

	function onFocusOut(event: FocusEvent): void {
		const next = event.relatedTarget as HTMLElement | null;
		if (!next) {
			hasFocus = false;
			return;
		}
		let walk: HTMLElement | null = next;
		while (walk) {
			if (walk.hasAttribute('data-roving-root')) return;
			walk = walk.parentElement;
		}
		hasFocus = false;
	}

	return {
		get focusedIdx() {
			return focusedIdx;
		},
		get hasFocus() {
			return hasFocus;
		},
		setItems,
		registerRef(id, el) {
			if (el) refs.set(id, el);
			else refs.delete(id);
		},
		tabindexFor(idx) {
			return idx === focusedIdx ? 0 : -1;
		},
		focusRow,
		handleKey,
		onFocusIn() {
			hasFocus = true;
		},
		onFocusOut
	};
}
