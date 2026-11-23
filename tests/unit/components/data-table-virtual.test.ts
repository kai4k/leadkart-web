import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet, flushSync, mount, tick, unmount } from 'svelte';
import DataTable from '#lib/components/data/data-table/DataTable.svelte';
import { createBulkSelection, createKeyboardListNav } from '#lib/hooks/index.ts';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';

type Row = { id: string; name: string };

const ROWS: Row[] = Array.from({ length: 1000 }, (_, i) => ({
	id: `r-${i + 1}`,
	name: `Row ${i + 1}`
}));

const VIEWPORT = 400;
const HEAD = 40;
// the table's own estimate for a row before it is measured (density default), so totals are exact
const ROW = 53;

/** What jsdom cannot do: lay out. A row's height by id, the scroller's size, the header's height. */
let heightOf: (id: string) => number = () => ROW;
const observed: HTMLElement[] = [];

class MockResizeObserver {
	constructor(private callback: ResizeObserverCallback) {}
	observe(el: Element) {
		observed.push(el as HTMLElement);
		queueMicrotask(() => {
			const html = el as HTMLElement;
			const height =
				html.dataset.slot === 'data-table-scroll'
					? VIEWPORT
					: html.tagName === 'TR'
						? heightOf(html.dataset.rowId ?? '')
						: 0;
			this.callback(
				[{ target: el, contentRect: { width: 800, height } } as unknown as ResizeObserverEntry],
				this as unknown as ResizeObserver
			);
		});
	}
	unobserve() {}
	disconnect() {}
}

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const realRO = globalThis.ResizeObserver;

beforeEach(() => {
	// virtua compensates size changes by scrolling the element; jsdom has no layout and no scroll methods
	Element.prototype.scrollBy = function (this: Element, opts?: ScrollToOptions | number) {
		const top = typeof opts === 'object' ? (opts.top ?? 0) : 0;
		this.scrollTop = (this.scrollTop || 0) + top;
	} as typeof Element.prototype.scrollBy;
	Element.prototype.scrollTo = function (this: Element, opts?: ScrollToOptions | number) {
		this.scrollTop = typeof opts === 'object' ? (opts.top ?? 0) : 0;
	} as typeof Element.prototype.scrollTo;
	heightOf = () => ROW;
	observed.length = 0;
	globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
	Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
		configurable: true,
		get() {
			return (this as HTMLElement).dataset.slot === 'data-table-scroll' ? VIEWPORT : 0;
		}
	});
	Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
		configurable: true,
		get() {
			const el = this as HTMLElement;
			return el.tagName === 'THEAD'
				? HEAD
				: el.tagName === 'TR'
					? heightOf(el.dataset.rowId ?? '')
					: 0;
		}
	});
	Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
		configurable: true,
		get() {
			return (this as HTMLElement).tagName === 'TR' ? document.body : null;
		}
	});
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
	globalThis.ResizeObserver = realRO;
	// @ts-expect-error restore jsdom's own accessors
	delete HTMLElement.prototype.clientHeight;
	// @ts-expect-error restore jsdom's own accessors
	delete HTMLElement.prototype.offsetHeight;
	// @ts-expect-error restore jsdom's own accessors
	delete HTMLElement.prototype.offsetParent;
});

const checkbox = createRawSnippet<[Row]>((row) => ({
	render: () => `<span>${row().name}</span>`
}));

async function settle() {
	for (let i = 0; i < 4; i++) {
		await tick();
		await new Promise((r) => setTimeout(r, 0));
		flushSync();
	}
}

async function render(props: Record<string, unknown> = {}) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(DataTable as never, {
		target,
		props: {
			columns: [{ id: 'name', header: 'Name', accessor: (r: Row) => r.name, cell: checkbox }],
			data: ROWS,
			getRowId: (r: Row) => r.id,
			noun: 'rows',
			...props
		}
	});
	flushSync();
	await settle();
}

const scroller = () => target.querySelector<HTMLElement>('[data-slot="data-table-scroll"]')!;
const rendered = () => [
	...target.querySelectorAll<HTMLElement>('tbody tr:not([aria-hidden="true"])')
];
const ids = () => rendered().map((r) => r.getAttribute('data-row-id'));
const spacers = () => [...target.querySelectorAll<HTMLElement>('tbody tr[aria-hidden="true"]')];

async function scrollTo(top: number) {
	const el = scroller();
	Object.defineProperty(el, 'scrollTop', { configurable: true, writable: true, value: top });
	el.dispatchEvent(new Event('scroll'));
	await settle();
}

describe('DataTable virtualisation', () => {
	it('renders a window, not the 1,000 rows, and says how many rows there are', async () => {
		await render();
		expect(rendered().length).toBeGreaterThan(0);
		expect(rendered().length).toBeLessThan(100);
		expect(target.querySelector('table')!.getAttribute('aria-rowcount')).toBe('1001');
		// the header is row 1, the first data row is row 2
		expect(rendered()[0]!.getAttribute('aria-rowindex')).toBe('2');
	});

	it('does not virtualise at or below the threshold', async () => {
		await render({ data: ROWS.slice(0, 100) });
		expect(rendered()).toHaveLength(100);
		expect(spacers()).toHaveLength(0);
		expect(target.querySelector('table')!.className).not.toContain('overflow-x-clip');
	});

	it('a smaller virtualizeAbove virtualises a smaller table', async () => {
		await render({ data: ROWS.slice(0, 200), virtualizeAbove: 50 });
		expect(rendered().length).toBeLessThan(100);
	});

	it('measures the scroller and every rendered row on its own', async () => {
		await render();
		expect(observed).toContain(scroller());
		const trs = observed.filter((el) => el.tagName === 'TR');
		expect(trs.length).toBeGreaterThanOrEqual(rendered().length);
	});

	it('scrolling to the end renders the last row and recycles the first', async () => {
		await render();
		expect(ids()).toContain('r-1');
		await scrollTo(ROW * 1000);
		expect(ids()).toContain('r-1000');
		expect(ids()).not.toContain('r-1');
		expect(rendered().length).toBeLessThan(100);
	});

	it('the spacer rows keep the scroll height of the whole list', async () => {
		await render();
		await scrollTo(ROW * 500);
		expect(spacers()).toHaveLength(2);
		const heights = spacers().map((s) => parseFloat(s.style.height));
		expect(heights[0]! + heights[1]! + rendered().length * ROW).toBe(ROW * 1000);
	});

	it('the spacer row spans every column, the selection and the actions columns', async () => {
		const state = createBulkSelection<{ id: string }>();
		await render({
			selection: { mode: 'multi', state, rowLabel: (r: Row) => `Select ${r.name}` },
			rowActions: checkbox
		});
		await scrollTo(ROW * 500);
		for (const spacer of spacers()) {
			expect(spacer.querySelector('td')!.getAttribute('colspan')).toBe('3');
		}
	});

	it('rows of different heights are measured, not assumed: no crash, and the spacers add up', async () => {
		heightOf = (id) => (Number(id.slice(2)) % 5 === 0 ? 74 : 53);
		const total = ROW * 1000;
		await render();
		for (const top of [0, 1244, 2799, 3421, 20000, total, 3421, 0]) {
			await scrollTo(top);
			expect(rendered().length).toBeGreaterThan(0);
			expect(rendered().length).toBeLessThan(120);
		}
	});

	it('a selected row stays selected after it was recycled and comes back', async () => {
		const state = createBulkSelection<{ id: string }>();
		await render({ selection: { mode: 'multi', state, rowLabel: (r: Row) => `Select ${r.name}` } });
		target.querySelector<HTMLElement>('[aria-label="Select Row 5"]')!.click();
		flushSync();
		expect([...state.selected]).toEqual(['r-5']);
		await scrollTo(ROW * 1000);
		expect(target.querySelector('[aria-label="Select Row 5"]')).toBeNull();
		expect([...state.selected]).toEqual(['r-5']);
		await scrollTo(0);
		expect(target.querySelector('[aria-label="Select Row 5"]')!.getAttribute('aria-checked')).toBe(
			'true'
		);
	});

	it('Select all selects every one of the 1,000 loaded rows, not only the rendered window', async () => {
		const state = createBulkSelection<{ id: string }>();
		await render({ selection: { mode: 'multi', state, rowLabel: (r: Row) => `Select ${r.name}` } });
		const all = target.querySelector<HTMLElement>('[aria-label="Select all 1000 loaded rows"]')!;
		all.click();
		flushSync();
		expect(state.count).toBe(1000);
		expect(all.getAttribute('aria-checked')).toBe('true');
	});

	it('the header checkbox is mixed when only some loaded rows are selected', async () => {
		const state = createBulkSelection<{ id: string }>();
		await render({ selection: { mode: 'multi', state, rowLabel: (r: Row) => `Select ${r.name}` } });
		target.querySelector<HTMLElement>('[aria-label="Select Row 2"]')!.click();
		flushSync();
		expect(
			target
				.querySelector('[aria-label="Select all 1000 loaded rows"]')!
				.getAttribute('aria-checked')
		).toBe('mixed');
	});

	it('every table checkbox has a 24 px hit area', async () => {
		const state = createBulkSelection<{ id: string }>();
		await render({ selection: { mode: 'multi', state, rowLabel: (r: Row) => `Select ${r.name}` } });
		for (const box of target.querySelectorAll('[role="checkbox"]')) {
			expect(box.className).toContain('size-6');
		}
	});

	it('widths are locked while windowed: the header cells carry measured widths in a fixed layout', async () => {
		await render();
		expect(target.querySelector('table')!.className).toContain('table-fixed');
		// a value longer than its locked column is clipped, not drawn over the next column
		expect(target.querySelector('table')!.className).toContain('[&_tbody_td]:overflow-x-clip');
		expect(target.querySelector('table')!.className).toContain('[&_tbody_td]:text-ellipsis');
		const th = target.querySelector<HTMLElement>('thead th[data-col-id="name"]')!;
		// jsdom measures 0: the lock is only taken from a real width, so no width is written here
		expect(th.getAttribute('data-col-id')).toBe('name');
	});

	it('the scroller does not let the browser anchor the scroll position, and prints in full', async () => {
		await render();
		expect(scroller().className).toContain('[overflow-anchor:none]');
		expect(scroller().className).toContain('print:max-h-none');
	});

	it('printing renders every row, and the window is back afterwards', async () => {
		await render();
		window.dispatchEvent(new Event('beforeprint'));
		flushSync();
		expect(rendered()).toHaveLength(1000);
		window.dispatchEvent(new Event('afterprint'));
		await settle();
		expect(rendered().length).toBeLessThan(100);
	});

	it('sorting starts again at the top', async () => {
		await render({
			sorting: { mode: 'client' },
			columns: [{ id: 'name', header: 'Name', accessor: (r: Row) => r.name, sortable: true }]
		});
		await scrollTo(ROW * 500);
		scroller().scrollTop = ROW * 500;
		target.querySelector<HTMLElement>('thead th button')!.click();
		await settle();
		expect(scroller().scrollTop).toBe(0);
	});
});

describe('DataTable keyboard in a windowed table', { timeout: 30000 }, () => {
	it('arrow keys move focus across the window edge to a row that was not rendered', async () => {
		const nav = createKeyboardListNav<Row>();
		await render({ nav });
		const first = rendered()[0]!;
		first.focus();
		expect(document.activeElement).toBe(first);
		const shown = rendered().length;
		for (let i = 0; i < shown + 2; i++) {
			document.activeElement!.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
			);
			await settle();
		}
		expect((document.activeElement as HTMLElement).getAttribute('data-row-id')).toBe(
			`r-${shown + 3}`
		);
	});

	it('End jumps to the last row and focuses it, Home comes back', async () => {
		const nav = createKeyboardListNav<Row>();
		await render({ nav });
		rendered()[0]!.focus();
		document.activeElement!.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'End', bubbles: true })
		);
		await settle();
		expect((document.activeElement as HTMLElement).getAttribute('data-row-id')).toBe('r-1000');
		document.activeElement!.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Home', bubbles: true })
		);
		await settle();
		expect((document.activeElement as HTMLElement).getAttribute('data-row-id')).toBe('r-1');
	});

	it('moving up to a row hidden under the sticky header scrolls it clear of the header', async () => {
		const nav = createKeyboardListNav<Row>();
		await render({ nav });
		await scrollTo(HEAD + ROW * 20);
		// r-21 is the first row under the header at this offset; r-20 is above the visible area
		const target21 = target.querySelector<HTMLElement>('tr[data-row-id="r-21"]')!;
		target21.focus();
		await settle();
		document.activeElement!.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
		);
		await settle();
		// r-20 starts at HEAD + 19 * ROW; it must end up just below the header, not under it
		expect(scroller().scrollTop).toBe(ROW * 19);
	});

	it('only one row is in the tab order, and it is rendered', async () => {
		const nav = createKeyboardListNav<Row>();
		await render({ nav });
		await scrollTo(ROW * 600);
		const tabbable = rendered().filter((r) => r.getAttribute('tabindex') === '0');
		expect(tabbable).toHaveLength(1);
	});

	it('the focused row stays mounted when the window moves away from it', async () => {
		const nav = createKeyboardListNav<Row>();
		await render({ nav });
		const row = rendered()[2]!;
		row.focus();
		await settle();
		await scrollTo(ROW * 600);
		expect(ids()).toContain('r-3');
		expect(document.activeElement).toBe(target.querySelector('tr[data-row-id="r-3"]'));
	});

	it('keeps ONE extra row, the focused one, above the window: not the rows in between', async () => {
		const nav = createKeyboardListNav<Row>();
		await render({ nav });
		rendered()[2]!.focus();
		await settle();
		await scrollTo(ROW * 600);
		expect(ids()[0]).toBe('r-3');
		expect(ids()).not.toContain('r-4');
		expect(ids()).not.toContain('r-300');
		// the window and one row more, however far the window is from the focused row
		const windowRows = ids()
			.slice(1)
			.map((id) => Number(id!.slice(2)));
		expect(windowRows.every((n, i) => i === 0 || n === windowRows[i - 1]! + 1)).toBe(true);
		expect(windowRows[0]).toBeGreaterThan(500);
		expect(rendered().length).toBeLessThan(40);
		// a spacer on each side of the kept row, and the one after the window
		expect(spacers()).toHaveLength(3);
		const height = spacers().reduce((a, s) => a + parseFloat(s.style.height), 0);
		expect(height + rendered().length * ROW).toBe(ROW * 1000);
	});

	it('keeps ONE extra row, the focused one, below the window', async () => {
		const nav = createKeyboardListNav<Row>();
		await render({ nav });
		await scrollTo(ROW * 600);
		const row = rendered()[4]!;
		const id = row.dataset.rowId!;
		row.focus();
		await settle();
		const atRest = rendered().length;
		await scrollTo(0);
		expect(ids()).toContain('r-1');
		expect(ids().at(-1)).toBe(id);
		expect(document.activeElement).toBe(target.querySelector(`tr[data-row-id="${id}"]`));
		expect(ids()).not.toContain('r-300');
		expect(rendered().length).toBeLessThanOrEqual(atRest + 1);
		const height = spacers().reduce((a, s) => a + parseFloat(s.style.height), 0);
		expect(height + rendered().length * ROW).toBe(ROW * 1000);
	});

	it('the kept row goes when focus leaves the table', async () => {
		const nav = createKeyboardListNav<Row>();
		await render({ nav });
		rendered()[2]!.focus();
		await settle();
		await scrollTo(ROW * 600);
		expect(ids()).toContain('r-3');
		const outside = document.body.appendChild(document.createElement('button'));
		outside.focus();
		await settle();
		expect(ids()).not.toContain('r-3');
		expect(spacers()).toHaveLength(2);
	});

	it('without nav, a windowed table still keeps the row whose control has focus', async () => {
		const state = createBulkSelection<{ id: string }>();
		await render({
			selection: { mode: 'multi', state, rowLabel: (r: Row) => `Select ${r.name}` }
		});
		const box = target.querySelector<HTMLElement>('[aria-label="Select Row 3"]')!;
		box.focus();
		await settle();
		await scrollTo(ROW * 600);
		expect(ids()).toContain('r-3');
		expect(document.activeElement).toBe(box);
		expect(rendered().length).toBeLessThan(100);
	});

	it('without nav, a windowed table has one tab stop per row and row keys', async () => {
		const state = createBulkSelection<{ id: string }>();
		await render({
			selection: { mode: 'multi', state, rowLabel: (r: Row) => `Select ${r.name}` }
		});
		expect(rendered().filter((r) => r.getAttribute('tabindex') === '0')).toHaveLength(1);
		const boxes = [...target.querySelectorAll<HTMLElement>('tbody [role="checkbox"]')];
		expect(boxes.filter((b) => b.getAttribute('tabindex') !== '-1')).toHaveLength(1);
		rendered()[0]!.focus();
		document.activeElement!.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
		);
		await settle();
		expect((document.activeElement as HTMLElement).dataset.rowId).toBe('r-2');
		// x selects with no page handler: the table's own toggle
		document.activeElement!.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'x', bubbles: true })
		);
		expect([...state.selected]).toEqual(['r-2']);
	});

	it('without nav, a table that is not windowed leaves its rows out of the tab order', async () => {
		await render({ data: ROWS.slice(0, 20) });
		expect(rendered().some((r) => r.hasAttribute('tabindex'))).toBe(false);
	});

	it('keeps the focused row focused through a re-sort', async () => {
		const nav = createKeyboardListNav<Row>();
		await render({
			nav,
			sorting: { mode: 'client' },
			columns: [{ id: 'name', header: 'Name', accessor: (r: Row) => r.name, sortable: true }]
		});
		rendered()[0]!.focus();
		await settle();
		target.querySelector<HTMLElement>('thead th button')!.click();
		target.querySelector<HTMLElement>('thead th button')!.click();
		await settle();
		expect((document.activeElement as HTMLElement).getAttribute('data-row-id')).toBe('r-1');
		expect(
			rendered()
				.filter((r) => r.getAttribute('tabindex') === '0')
				.map((r) => r.dataset.rowId)
		).toEqual(['r-1']);
	});
});

describe('DataTable data shrinking and cursor paging', () => {
	it('selection drops ids that are no longer in the data', async () => {
		const state = createBulkSelection<{ id: string }>();
		const props = reactiveProps<Record<string, unknown>>({
			columns: [{ id: 'name', header: 'Name', accessor: (r: Row) => r.name }],
			data: ROWS,
			getRowId: (r: Row) => r.id,
			noun: 'rows',
			selection: { mode: 'multi', state, rowLabel: (r: Row) => `Select ${r.name}` }
		});
		target = document.body.appendChild(document.createElement('div'));
		component = mount(DataTable as never, { target, props });
		flushSync();
		await settle();
		target.querySelector<HTMLElement>('[aria-label="Select all 1000 loaded rows"]')!.click();
		flushSync();
		expect(state.count).toBe(1000);
		props.data = ROWS.slice(0, 100);
		await settle();
		expect(state.count).toBe(100);
		expect(state.isSelected('r-500')).toBe(false);
	});

	it('selection keeps ids from other pages in offset paging', async () => {
		const state = createBulkSelection<{ id: string }>();
		state.toggle('elsewhere');
		await render({
			data: ROWS.slice(0, 10),
			pagination: { mode: 'offset', page: 2, pageCount: 5, onPageChange: vi.fn() },
			selection: { mode: 'multi', state, rowLabel: (r: Row) => `Select ${r.name}` }
		});
		expect(state.isSelected('elsewhere')).toBe(true);
	});
});
