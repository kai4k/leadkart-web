/**
 * `useKeyboardListNav` — j/k/Enter/Esc/E/X keyboard navigation for
 * resource list pages, matching the Linear / Superhuman convention.
 *
 * The consumer:
 *   const nav = new UseKeyboardListNav<MyItem>({
 *     isAnyOverlayOpen: () => createOpen || drawerOpen,
 *     onSelect: (it) => goto(`/leads/${it.id}`),
 *     onEdit:   (it) => openEditDrawer(it),
 *     onToggleSelect: (it) => bulk.toggle(it.id)
 *   });
 *
 *   $effect(() => nav.setItems(list.items));
 *
 *   <svelte:window onkeydown={nav.bindWindow()} />
 *
 * Guards baked in:
 *   - any focused input/textarea/select/[contenteditable] → return
 *     (so typing in the search bar doesn't jump rows)
 *   - any overlay open (consumer-supplied predicate) → return
 *     (drawer/dialog/dropdown captures keyboard)
 *   - meta/ctrl held → return (browser shortcuts win)
 */

export type KeyableItem = { id: string };

export interface UseKeyboardListNavOptions<TItem extends KeyableItem> {
	/** Invoked on Enter while a row is focused. */
	onSelect?: (item: TItem) => void;
	/** Invoked on `E` while a row is focused. */
	onEdit?: (item: TItem) => void;
	/** Invoked on `X` while a row is focused — typically toggles bulk selection. */
	onToggleSelect?: (item: TItem) => void;
	/**
	 * Consumer reports whether any modal/drawer/popover is currently
	 * showing. When true, the hook returns early so the overlay can
	 * own the keyboard.
	 */
	isAnyOverlayOpen?: () => boolean;
}

export class UseKeyboardListNav<TItem extends KeyableItem> {
	focusedIndex: number = $state(-1);

	private items: TItem[] = $state([]);
	private readonly options: UseKeyboardListNavOptions<TItem>;

	constructor(options: UseKeyboardListNavOptions<TItem> = {}) {
		this.options = options;
	}

	/**
	 * Update the navigable set. Keeps the focused index in range —
	 * collapses to -1 when the list empties.
	 */
	setItems(items: TItem[]): void {
		this.items = items;
		if (items.length === 0) {
			this.focusedIndex = -1;
		} else if (this.focusedIndex >= items.length) {
			this.focusedIndex = items.length - 1;
		}
	}

	clearFocus(): void {
		this.focusedIndex = -1;
	}

	/** Currently-focused item (or null). */
	get focusedItem(): TItem | null {
		const i = this.focusedIndex;
		if (i < 0 || i >= this.items.length) return null;
		return this.items[i];
	}

	/**
	 * Returns a keydown handler bound to this instance. Pass to
	 * `<svelte:window onkeydown={nav.bindWindow()} />` once per page.
	 */
	bindWindow(): (event: KeyboardEvent) => void {
		return (event: KeyboardEvent) => this.handle(event);
	}

	// ── internal ───────────────────────────────────────────────────────

	private handle(event: KeyboardEvent): void {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		if (this.options.isAnyOverlayOpen?.()) return;
		if (this.isTypingTarget(event.target)) return;

		const k = event.key;
		switch (k) {
			case 'j':
			case 'ArrowDown':
				this.moveNext();
				event.preventDefault();
				return;
			case 'k':
			case 'ArrowUp':
				this.movePrev();
				event.preventDefault();
				return;
			case 'Enter': {
				const it = this.focusedItem;
				if (it && this.options.onSelect) {
					this.options.onSelect(it);
					event.preventDefault();
				}
				return;
			}
			case 'e':
			case 'E': {
				const it = this.focusedItem;
				if (it && this.options.onEdit) {
					this.options.onEdit(it);
					event.preventDefault();
				}
				return;
			}
			case 'x':
			case 'X': {
				const it = this.focusedItem;
				if (it && this.options.onToggleSelect) {
					this.options.onToggleSelect(it);
					event.preventDefault();
				}
				return;
			}
			case 'Escape':
				if (this.focusedIndex !== -1) {
					this.clearFocus();
					event.preventDefault();
				}
				return;
			default:
				return;
		}
	}

	private moveNext(): void {
		if (this.items.length === 0) return;
		this.focusedIndex = Math.min(this.items.length - 1, Math.max(0, this.focusedIndex) + 1);
		if (this.focusedIndex < 0) this.focusedIndex = 0;
	}

	private movePrev(): void {
		if (this.items.length === 0) return;
		const next = this.focusedIndex < 0 ? 0 : this.focusedIndex - 1;
		this.focusedIndex = Math.max(0, next);
	}

	private isTypingTarget(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;
		const tag = target.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
		if (target.isContentEditable) return true;
		return false;
	}
}
