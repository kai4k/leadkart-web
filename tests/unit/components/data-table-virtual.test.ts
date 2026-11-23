import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import DataTable from '#lib/components/data/data-table/DataTable.svelte';
import { createBulkSelection, createKeyboardListNav } from '#lib/hooks/index.ts';

type Row = { id: string; name: string };

const ROWS: Row[] = Array.from({ length: 1000 }, (_, i) => ({
	id: `r-${i + 1}`,
	name: `Row ${i + 1}`
}));

const VIEWPORT = 400;
const ROW_HEIGHT = 40;

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

// jsdom has no layout: a fixed viewport and a fixed row height stand in for it.
beforeEach(() => {
	Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
		configurable: true,
		get() {
			return (this as HTMLElement).dataset.slot === 'data-table-scroll' ? VIEWPORT : 0;
		}
	});
	Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
		configurable: true,
		get() {
			return (this as HTMLElement).tagName === 'TR' ? ROW_HEIGHT : 0;
		}
	});
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
	// @ts-expect-error restore jsdom's own accessors
	delete HTMLElement.prototype.clientHeight;
	// @ts-expect-error restore jsdom's own accessors
	delete HTMLElement.prototype.offsetHeight;
});

function render(props: Record<string, unknown> = {}) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(DataTable as never, {
		target,
		props: {
			columns: [{ id: 'name', header: 'Name', accessor: (r: Row) => r.name }],
			data: ROWS,
			getRowId: (r: Row) => r.id,
			noun: 'rows',
			...props
		}
	});
	flushSync();
}

const scroller = () => target.querySelector<HTMLElement>('[data-slot="data-table-scroll"]')!;
const rendered = () => [
	...target.querySelectorAll<HTMLElement>('tbody tr:not([aria-hidden="true"])')
];
const ids = () => rendered().map((r) => r.getAttribute('data-row-id'));

async function scrollTo(top: number) {
	const el = scroller();
	Object.defineProperty(el, 'scrollTop', { configurable: true, writable: true, value: top });
	el.dispatchEvent(new Event('scroll'));
	await tick();
	flushSync();
}

describe('DataTable virtualisation', () => {
	it('renders a window, not the 1,000 rows, and says how many rows there are', () => {
		render();
		expect(rendered().length).toBeGreaterThan(0);
		expect(rendered().length).toBeLessThan(100);
		expect(target.querySelector('table')!.getAttribute('aria-rowcount')).toBe('1001');
		// the header is row 1, the first data row is row 2
		expect(rendered()[0]!.getAttribute('aria-rowindex')).toBe('2');
	});

	it('does not virtualise at or below the threshold', () => {
		render({ data: ROWS.slice(0, 100) });
		expect(rendered()).toHaveLength(100);
	});

	it('a smaller virtualizeAbove virtualises a smaller table', () => {
		render({ data: ROWS.slice(0, 200), virtualizeAbove: 50 });
		expect(rendered().length).toBeLessThan(100);
	});

	it('scrolling to the end renders the last row and recycles the first', async () => {
		render();
		expect(ids()).toContain('r-1');
		await scrollTo(ROW_HEIGHT * 1000);
		expect(ids()).toContain('r-1000');
		expect(ids()).not.toContain('r-1');
		expect(rendered().length).toBeLessThan(100);
	});

	it('the spacer rows keep the scroll height of the whole list', async () => {
		render();
		await scrollTo(ROW_HEIGHT * 500);
		const spacers = [...target.querySelectorAll<HTMLElement>('tbody tr[aria-hidden="true"]')];
		expect(spacers).toHaveLength(2);
		const heights = spacers.map((s) => parseFloat(s.style.height));
		const renderedHeight = rendered().length * ROW_HEIGHT;
		expect(heights[0]! + heights[1]! + renderedHeight).toBe(ROW_HEIGHT * 1000);
	});

	it('a selected row stays selected after it was recycled and comes back', async () => {
		const state = createBulkSelection<Row>();
		render({ selection: { mode: 'multi', state, rowLabel: (r: Row) => `Select ${r.name}` } });
		target.querySelector<HTMLElement>('[aria-label="Select Row 5"]')!.click();
		flushSync();
		expect([...state.selected]).toEqual(['r-5']);
		await scrollTo(ROW_HEIGHT * 1000);
		expect(target.querySelector('[aria-label="Select Row 5"]')).toBeNull();
		expect([...state.selected]).toEqual(['r-5']);
		await scrollTo(0);
		expect(target.querySelector('[aria-label="Select Row 5"]')!.getAttribute('aria-checked')).toBe(
			'true'
		);
	});

	it('Select all selects every one of the 1,000 loaded rows, not only the rendered window', () => {
		const state = createBulkSelection<Row>();
		render({ selection: { mode: 'multi', state, rowLabel: (r: Row) => `Select ${r.name}` } });
		target.querySelector<HTMLElement>('[aria-label="Select all"]')!.click();
		flushSync();
		expect(state.count).toBe(1000);
	});

	it('arrow keys move focus across the window edge to a row that was not rendered', async () => {
		const nav = createKeyboardListNav<Row>();
		render({ nav });
		const first = rendered()[0]!;
		first.focus();
		expect(document.activeElement).toBe(first);
		// walk down past the last rendered row
		const lastRendered = rendered().length;
		for (let i = 0; i < lastRendered + 2; i++) {
			document.activeElement!.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
			);
			await tick();
			flushSync();
			await new Promise((r) => setTimeout(r, 0));
			flushSync();
		}
		expect((document.activeElement as HTMLElement).getAttribute('data-row-id')).toBe(
			`r-${lastRendered + 3}`
		);
	});

	it('End jumps to the last row and focuses it', async () => {
		const nav = createKeyboardListNav<Row>();
		render({ nav });
		rendered()[0]!.focus();
		document.activeElement!.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'End', bubbles: true })
		);
		await tick();
		flushSync();
		await new Promise((r) => setTimeout(r, 0));
		flushSync();
		expect((document.activeElement as HTMLElement).getAttribute('data-row-id')).toBe('r-1000');
	});

	it('only one row is in the tab order, and it is always rendered', async () => {
		const nav = createKeyboardListNav<Row>();
		render({ nav });
		await scrollTo(ROW_HEIGHT * 600);
		const tabbable = rendered().filter((r) => r.getAttribute('tabindex') === '0');
		expect(tabbable).toHaveLength(1);
	});
});
