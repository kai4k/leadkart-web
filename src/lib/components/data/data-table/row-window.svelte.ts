/**
 * `createRowWindow` — which rows of a long table are rendered, on virtua's own layout, store and
 * driver (`virtua/unstable_core`, pinned to an exact version; typed by `virtua-core.d.ts`; this is the
 * only file that imports it).
 *
 * Why not virtua's `Virtualizer as="tbody" item="tr"`: it positions every item `position: absolute`,
 * and an absolutely positioned `<tr>` becomes its own table, so its columns stop lining up with the
 * header. Here a table stays a table: the visible slice is rendered in normal flow between two spacer
 * rows, and every rendered row is observed on its own (`observe`), so rows of different heights
 * (an `IdentityCell` with and without a subtitle, a wrapped cell, another density) are measured, not
 * assumed. Selection and focus are keyed by row id elsewhere, so a row that leaves the window and
 * comes back is the same row.
 */
import {
	ACTION_ITEMS_LENGTH_CHANGE,
	ACTION_START_OFFSET_CHANGE,
	UPDATE_VIRTUAL_STATE,
	createContainerDriver,
	createListLayout,
	createVirtualStore
} from 'virtua/unstable_core';

export interface RowWindow {
	/** True when the body is windowed. */
	readonly active: boolean;
	/** First index virtua wants rendered. */
	readonly start: number;
	/** One past the last index virtua wants rendered. */
	readonly end: number;
	/** Height in px standing for the rows before `index`. */
	before(index: number): number;
	/** Height in px standing for the rows from `index` on. */
	after(index: number): number;
	/** Attachment for the scroll container: tracks its scroll offset and size. */
	attach(el: HTMLElement): () => void;
	/** Measure one rendered row (an attachment on every `<tr>`); returns its cleanup. */
	observe(el: HTMLElement, index: number): () => void;
	/** Scroll so row `index` is fully visible below the sticky header. */
	reveal(index: number): void;
}

export interface RowWindowOptions {
	count: () => number;
	/** Windowing starts when `count()` exceeds this. */
	threshold: () => number;
	/** Row height in px until a row has been measured. */
	estimate: () => number;
}

/** virtua's store action that reports the scroll offset. */
const ACTION_SCROLL = 1;
/** Rows rendered before the scroll container has reported its size (first paint, no layout yet). */
const FIRST_PAINT_ROWS = 24;
/** Extra px rendered above and below the viewport. */
const BUFFER_PX = 300;

export function createRowWindow(options: RowWindowOptions): RowWindow {
	const layout = createListLayout(options.count(), options.estimate());
	const store = createVirtualStore(layout);
	const driver = createContainerDriver(store, layout, false);
	let version = $state(store.$getStateVersion());
	const unsubscribe = store.$subscribe((flag) => {
		if (flag & UPDATE_VIRTUAL_STATE) version = store.$getStateVersion();
	});
	let scrollEl: HTMLElement | null = null;
	let head = 0;

	const active = $derived(options.count() > options.threshold());

	$effect.pre(() => {
		store.$update(ACTION_ITEMS_LENGTH_CHANGE, options.count(), false);
	});
	let previous: number | undefined;
	$effect(() => {
		if (previous === version) return;
		previous = version;
		driver.$effect();
	});
	$effect(() => () => unsubscribe());

	const range = $derived.by(() => {
		void version;
		const count = options.count();
		if (!active) return { start: 0, end: count };
		const [first, last] = store.$getRange(BUFFER_PX);
		if (last < first) return { start: 0, end: Math.min(count, FIRST_PAINT_ROWS) };
		return { start: Math.min(first, count), end: Math.min(last + 1, count) };
	});

	return {
		get active() {
			return active;
		},
		get start() {
			return range.start;
		},
		get end() {
			return range.end;
		},
		before(index) {
			void version;
			return index > 0 ? store.$getItemOffset(index) : 0;
		},
		after(index) {
			void version;
			if (index >= options.count()) return 0;
			return Math.max(0, store.$getTotalSize() - store.$getItemOffset(index));
		},
		attach(el) {
			scrollEl = el;
			head = el.querySelector('thead')?.offsetHeight ?? 0;
			store.$update(ACTION_START_OFFSET_CHANGE, head);
			driver.$observe(el.querySelector('tbody'), el);
			return () => {
				driver.$dispose();
				scrollEl = null;
			};
		},
		observe(el, index) {
			return driver.$observeItem(el, index);
		},
		reveal(index) {
			if (!scrollEl) return;
			const top = head + store.$getItemOffset(index);
			const bottom = top + layout.$getItemSize(index);
			const current = scrollEl.scrollTop;
			let next = current;
			// The sticky header covers the first `head` px of the viewport: a row under it is not visible.
			if (top < current + head) next = top - head;
			else if (bottom > current + scrollEl.clientHeight) next = bottom - scrollEl.clientHeight;
			if (next === current) return;
			scrollEl.scrollTop = next;
			// A scroll event follows in a browser; the store is told now so the rows exist this frame.
			store.$update(ACTION_SCROLL, scrollEl.scrollTop);
		}
	};
}
