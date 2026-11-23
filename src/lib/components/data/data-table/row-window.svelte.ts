/**
 * `createRowWindow` — which rows of a long table are rendered.
 *
 * Why not virtua's `Virtualizer as="tbody" item="tr"`: virtua positions every item `position: absolute`,
 * and an absolutely positioned `<tr>` becomes its own table, so the columns of one row no longer line
 * up with the header or the next row. A table stays a table here: the visible slice is rendered in
 * normal flow between two spacer rows whose heights stand for the rows that are not rendered.
 *
 * Rows are one height (cells do not wrap), measured from a rendered row; `estimate` stands in until
 * the first measure. Selection and focus are keyed by row id elsewhere, so a row that leaves the
 * window and comes back is the same row.
 */

export interface RowWindow {
	/** True when the body is windowed. */
	readonly active: boolean;
	/** First rendered index. */
	readonly start: number;
	/** One past the last rendered index. */
	readonly end: number;
	/** Height in px standing for the rows before `start`. */
	readonly before: number;
	/** Height in px standing for the rows from `end` on. */
	readonly after: number;
	/** Attachment for the scroll container: tracks its scroll offset and height. */
	attach(el: HTMLElement): () => void;
	/** Tell the window the height of one rendered row. */
	measure(rowHeight: number): void;
	/** Scroll so row `index` is fully visible below the sticky header. */
	reveal(index: number): void;
}

export interface RowWindowOptions {
	count: () => number;
	/** Windowing starts when `count()` exceeds this. */
	threshold: () => number;
	/** Row height in px before any row was measured. */
	estimate: () => number;
	/** Extra rows rendered above and below the viewport. */
	overscan?: number;
}

/** Viewport height assumed before the scroll container reports one (first render, no layout). */
const FALLBACK_VIEWPORT = 480;

export function createRowWindow(options: RowWindowOptions): RowWindow {
	const overscan = options.overscan ?? 8;
	let scrollEl: HTMLElement | null = null;
	let scrollTop = $state(0);
	let viewport = $state(0);
	let head = $state(0);
	let measured = $state(0);

	const rowHeight = $derived(measured > 0 ? measured : options.estimate());
	const active = $derived(options.count() > options.threshold());
	const range = $derived.by(() => {
		const count = options.count();
		if (!active) return { start: 0, end: count };
		const top = Math.max(0, scrollTop - head);
		const height = viewport > 0 ? viewport : FALLBACK_VIEWPORT;
		const start = Math.max(0, Math.floor(top / rowHeight) - overscan);
		const end = Math.min(count, Math.ceil((top + height) / rowHeight) + overscan);
		return { start: Math.min(start, count), end: Math.max(end, Math.min(start, count)) };
	});

	function sync(): void {
		if (!scrollEl) return;
		scrollTop = scrollEl.scrollTop;
		viewport = scrollEl.clientHeight;
		head = scrollEl.querySelector('thead')?.offsetHeight ?? 0;
	}

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
		get before() {
			return range.start * rowHeight;
		},
		get after() {
			return (options.count() - range.end) * rowHeight;
		},
		attach(el) {
			scrollEl = el;
			sync();
			el.addEventListener('scroll', sync, { passive: true });
			const observer = new ResizeObserver(sync);
			observer.observe(el);
			return () => {
				el.removeEventListener('scroll', sync);
				observer.disconnect();
				scrollEl = null;
			};
		},
		measure(height) {
			if (height > 0 && height !== measured) measured = height;
		},
		reveal(index) {
			if (!scrollEl) return;
			const top = head + index * rowHeight;
			const bottom = top + rowHeight;
			const current = scrollEl.scrollTop;
			let next = current;
			if (top < current + head) next = top - head;
			else if (bottom > current + scrollEl.clientHeight) next = bottom - scrollEl.clientHeight;
			if (next === current) return;
			scrollEl.scrollTop = next;
			// A scroll event follows in a browser; the state is set now so the rows exist this frame.
			scrollTop = next;
		}
	};
}
