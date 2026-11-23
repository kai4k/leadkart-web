import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet, flushSync, mount, tick, unmount } from 'svelte';
import DataTable from '#lib/components/data/data-table/DataTable.svelte';
import type { DataTableColumn, DataTableProps } from '#lib/components/data/data-table/types.ts';
import { createBulkSelection, createKeyboardListNav } from '#lib/hooks/index.ts';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import { createFakeInfiniteQuery } from './fake-infinite-query.svelte.ts';

type Item = { id: string; name: string; rank?: number | null; label?: string };

const nameCell = createRawSnippet<[Item]>((row) => ({
	render: () => `<span data-testid="name">${row().name}</span>`
}));
const linkCell = createRawSnippet<[Item]>((row) => ({
	render: () => `<span data-testid="name">${row().name}</span>`
}));

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

function render(props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(DataTable as never, { target, props });
	flushSync();
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

const base = (over: Record<string, unknown> = {}) => ({
	columns: [{ id: 'name', header: 'Name', accessor: (r: Item) => r.name, cell: nameCell }],
	data: [] as Item[],
	getRowId: (r: Item) => r.id,
	noun: 'items',
	...over
});
const items = (n: number): Item[] =>
	Array.from({ length: n }, (_, i) => ({
		id: `i-${i + 1}`,
		name: `Item ${String(i + 1).padStart(2, '0')}`
	}));
const rows = () => [...target.querySelectorAll<HTMLElement>('tbody tr[data-row-id]')];
const names = () => rows().map((r) => r.querySelector('[data-testid="name"]')?.textContent);
const sortBy = (label: string) =>
	[...target.querySelectorAll<HTMLButtonElement>('thead th button')]
		.find((b) => b.textContent?.includes(label))!
		.click();

describe('DataTable keyboard: a key belongs to the control it is typed in', () => {
	it('x typed in a row checkbox toggles that row, not the first one', () => {
		const state = createBulkSelection<{ id: string }>();
		const data = items(12);
		const nav = createKeyboardListNav<Item>({ onToggleSelect: (row) => state.toggle(row.id) });
		render(
			base({
				data,
				nav,
				selection: { mode: 'multi', state, rowLabel: (r: Item) => `Select ${r.name}` }
			})
		);
		const box = target.querySelector<HTMLElement>('[aria-label="Select Item 09"]')!;
		box.focus();
		box.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
		flushSync();
		expect([...state.selected]).toEqual(['i-9']);
	});

	it('x typed on the row itself toggles the row it is on', () => {
		const state = createBulkSelection<{ id: string }>();
		const nav = createKeyboardListNav<Item>({ onToggleSelect: (row) => state.toggle(row.id) });
		render(
			base({
				data: items(12),
				nav,
				selection: { mode: 'multi', state, rowLabel: (r: Item) => `Select ${r.name}` }
			})
		);
		const row = rows()[8]!;
		row.focus();
		flushSync();
		row.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
		flushSync();
		expect([...state.selected]).toEqual(['i-9']);
	});

	it('Enter on a link in a row fires nothing: not onSelect of any row', () => {
		const onSelect = vi.fn();
		const nav = createKeyboardListNav<Item>({ onSelect });
		render(base({ data: items(12), nav, rowHref: (r: Item) => `/items/${r.id}` }));
		const link = target.querySelector<HTMLElement>('tr[data-row-id="i-8"] a')!;
		link.focus();
		link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		expect(onSelect).not.toHaveBeenCalled();
	});

	it('Enter on the row selects that row', () => {
		const onSelect = vi.fn();
		const nav = createKeyboardListNav<Item>({ onSelect });
		render(base({ data: items(12), nav }));
		const row = rows()[7]!;
		row.focus();
		row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'i-8' }));
	});

	it('focus arriving in a row (click or Tab) makes it the current row: the next arrow starts there', () => {
		const nav = createKeyboardListNav<Item>();
		render(base({ data: items(20), nav }));
		const box = rows()[11]!;
		box.focus();
		flushSync();
		box.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
		flushSync();
		expect((document.activeElement as HTMLElement).dataset.rowId).toBe('i-13');
	});

	it('works for rows without an id field when the nav is given getId', () => {
		type Member = { membership_id: string; name: string };
		const members: Member[] = [
			{ membership_id: 'm-1', name: 'Asha' },
			{ membership_id: 'm-2', name: 'Bram' },
			{ membership_id: 'm-3', name: 'Chen' }
		];
		const onSelect = vi.fn();
		const nav = createKeyboardListNav<Member>({ getId: (m) => m.membership_id, onSelect });
		render({
			columns: [{ id: 'name', header: 'Name', accessor: (m: Member) => m.name }],
			data: members,
			getRowId: (m: Member) => m.membership_id,
			noun: 'members',
			nav
		});
		const first = rows()[0]!;
		first.focus();
		first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
		flushSync();
		expect((document.activeElement as HTMLElement).dataset.rowId).toBe('m-2');
		document.activeElement!.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
		);
		expect(onSelect).toHaveBeenCalledWith(members[1]);
	});

	it('only the current row has tabbable controls', () => {
		const nav = createKeyboardListNav<Item>();
		render(base({ data: items(5), nav, rowHref: (r: Item) => `/items/${r.id}` }));
		const links = [...target.querySelectorAll<HTMLElement>('tbody a')];
		expect(links[0]!.getAttribute('tabindex')).toBeNull();
		for (const link of links.slice(1)) expect(link.getAttribute('tabindex')).toBe('-1');
	});
});

describe('DataTable focus follows the row, by id', () => {
	it('a deleted focused row hands focus to its neighbour', async () => {
		const props = reactiveProps<Record<string, unknown>>(
			base({ data: items(6), nav: createKeyboardListNav<Item>() })
		);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(DataTable as never, { target, props });
		flushSync();
		const row = rows()[2]!;
		row.focus();
		flushSync();
		props.data = items(6).filter((i) => i.id !== 'i-3');
		await tick();
		await new Promise((r) => setTimeout(r, 0));
		flushSync();
		expect(document.activeElement?.getAttribute('data-row-id')).toBe('i-4');
	});
});

describe('DataTable sorting', () => {
	const run = (data: Item[], column: Partial<DataTableColumn<Item>>) => {
		render(
			base({
				data,
				sorting: { mode: 'client' },
				columns: [
					{
						id: 'k',
						header: 'Key',
						cell: nameCell,
						accessor: (r: Item) => r.name,
						sortable: true,
						...column
					}
				]
			})
		);
	};
	const mk = (...list: Array<Partial<Item> & { name: string }>): Item[] =>
		list.map((p, i) => ({ id: `s-${i}`, ...p }));

	it('plain text sorts without regard to case', () => {
		run(mk({ name: 'Banana' }, { name: 'apple' }, { name: 'Damson' }, { name: 'cherry' }), {});
		sortBy('Key');
		flushSync();
		expect(names()).toEqual(['apple', 'Banana', 'cherry', 'Damson']);
	});

	it('names with numbers sort naturally', () => {
		run(mk({ name: 'Item 10' }, { name: 'Item 2' }, { name: 'Item 1' }), {});
		sortBy('Key');
		flushSync();
		expect(names()).toEqual(['Item 1', 'Item 2', 'Item 10']);
	});

	it('numbers sort numerically and nulls come last in both directions', () => {
		const data = mk(
			{ name: 'a', rank: 10 },
			{ name: 'b', rank: null },
			{ name: 'c', rank: 2 },
			{ name: 'd', rank: null }
		);
		run(data, { accessor: (r) => r.rank });
		sortBy('Key');
		flushSync();
		expect(names()).toEqual(
			['a', 'c', 'b', 'd'].sort(
				(x, y) => ['c', 'a', 'b', 'd'].indexOf(x) - ['c', 'a', 'b', 'd'].indexOf(y)
			)
		);
		sortBy('Key');
		flushSync();
		expect(names().slice(0, 2)).toEqual(['a', 'c']);
		expect(names().slice(2).sort()).toEqual(['b', 'd']);
	});

	it('sortValue decides the order, not the displayed text', () => {
		const data = mk({ name: 'x', rank: 3 }, { name: 'y', rank: 1 }, { name: 'z', rank: 2 });
		run(data, { accessor: (r) => r.name, sortValue: (r) => r.rank ?? 0 });
		sortBy('Key');
		flushSync();
		expect(names()).toEqual(['y', 'z', 'x']);
	});

	it('a sortable column with nothing to sort by offers no sort button on a client table', () => {
		run(mk({ name: 'x' }), { accessor: undefined });
		expect(target.querySelector('thead th button')).toBeNull();
	});

	it('hiding the sorted column drops the sort', async () => {
		render(
			base({
				data: mk({ name: 'b' }, { name: 'a' }),
				sorting: { mode: 'client' },
				columnVisibility: true,
				columns: [
					{ id: 'k', header: 'Key', cell: nameCell, accessor: (r: Item) => r.name, sortable: true },
					{ id: 'x', header: 'Extra', accessor: () => 'x' }
				]
			})
		);
		sortBy('Key');
		flushSync();
		expect(names()).toEqual(['a', 'b']);
		const trigger = [...target.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Columns')
		)!;
		trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await tick();
		flushSync();
		[...document.body.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]')]
			.find((i) => i.textContent?.includes('Key'))!
			.click();
		await tick();
		flushSync();
		expect(target.querySelector('thead th[aria-sort]')).toBeNull();
	});
});

describe('DataTable paging', () => {
	it('sorting goes back to the first page', () => {
		render(
			base({
				data: items(25),
				sorting: { mode: 'client' },
				pagination: { mode: 'client', pageSize: 10 },
				columns: [
					{ id: 'k', header: 'Key', cell: nameCell, accessor: (r: Item) => r.name, sortable: true }
				]
			})
		);
		target.querySelector<HTMLElement>('[aria-label="Next page"]')!.click();
		flushSync();
		expect(names()[0]).toBe('Item 11');
		sortBy('Key');
		flushSync();
		expect(names()[0]).toBe('Item 01');
	});

	it('a page past the end after the data shrinks lands on the last page, and stays there when the data grows', async () => {
		const props = reactiveProps<Record<string, unknown>>(
			base({ data: items(25), pagination: { mode: 'client', pageSize: 10 } })
		);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(DataTable as never, { target, props });
		flushSync();
		target.querySelector<HTMLElement>('[aria-label="Next page"]')!.click();
		flushSync();
		target.querySelector<HTMLElement>('[aria-label="Next page"]')!.click();
		flushSync();
		expect(names()[0]).toBe('Item 21');
		props.data = items(8);
		await tick();
		flushSync();
		expect(names()[0]).toBe('Item 01');
		expect(target.textContent).toContain('Showing 1–8 of 8');
		props.data = items(95);
		await tick();
		flushSync();
		expect(names()[0]).toBe('Item 01');
	});

	it('aria-rowindex continues across client pages and aria-rowcount counts all of them', () => {
		render(base({ data: items(25), pagination: { mode: 'client', pageSize: 10 } }));
		target.querySelector<HTMLElement>('[aria-label="Next page"]')!.click();
		flushSync();
		expect(rows()[0]!.getAttribute('aria-rowindex')).toBe('12');
		expect(target.querySelector('table')!.getAttribute('aria-rowcount')).toBe('26');
	});

	it('a page change starts at the top of the scroll container', () => {
		render(base({ data: items(25), pagination: { mode: 'client', pageSize: 10 } }));
		const scroller = target.querySelector<HTMLElement>('[data-slot="data-table-scroll"]')!;
		scroller.scrollTop = 300;
		target.querySelector<HTMLElement>('[aria-label="Next page"]')!.click();
		flushSync();
		expect(scroller.scrollTop).toBe(0);
	});
});

describe('DataTable cursor paging', () => {
	function fakeList(hasNextPage: boolean) {
		const query = createFakeInfiniteQuery({ hasNextPage });
		return {
			query,
			sentinelRef: null as HTMLElement | null,
			rootRef: null as HTMLElement | null,
			items: items(3),
			hasNextPage,
			isFetchingNextPage: false,
			truncated: false,
			state: 'ready',
			error: null,
			isFetching: false
		};
	}

	it('the load-more footer sits inside the scroll container, where its sentinel is clipped', () => {
		const list = fakeList(true);
		render(base({ data: list.items, pagination: { mode: 'cursor', list } }));
		const scroller = target.querySelector('[data-slot="data-table-scroll"]')!;
		expect(scroller.contains(list.sentinelRef)).toBe(true);
	});

	it('the scroll container is the root the list watches, so the next page loads before the end', () => {
		const list = fakeList(true);
		render(base({ data: list.items, pagination: { mode: 'cursor', list } }));
		expect(list.rootRef).toBe(target.querySelector('[data-slot="data-table-scroll"]'));
	});

	it('aria-rowcount is -1 while more rows can be loaded, the real count at the end', () => {
		const more = fakeList(true);
		render(base({ data: more.items, pagination: { mode: 'cursor', list: more } }));
		expect(target.querySelector('table')!.getAttribute('aria-rowcount')).toBe('-1');
		unmount(component!);
		target.remove();
		const done = fakeList(false);
		render(base({ data: done.items, pagination: { mode: 'cursor', list: done } }));
		expect(target.querySelector('table')!.getAttribute('aria-rowcount')).toBe('4');
	});

	it('does not accept client sorting on a cursor list (type)', () => {
		const list = fakeList(false);
		const ok: DataTableProps<Item> = {
			...base({ data: list.items }),
			pagination: { mode: 'cursor', list: list as never },
			sorting: { mode: 'server', state: null, onChange: () => {} }
		} as DataTableProps<Item>;
		expect(ok).toBeDefined();
		// @ts-expect-error a cursor list cannot sort the loaded rows on the client
		const bad: DataTableProps<Item> = {
			...(base({ data: list.items }) as unknown as DataTableProps<Item>),
			pagination: { mode: 'cursor', list: list as never },
			sorting: { mode: 'client' }
		};
		expect(bad).toBeDefined();
	});
});

describe('DataTable columns and markup', () => {
	it('hideBelow hides the header and cells below the breakpoint', () => {
		render(
			base({
				data: items(2),
				columns: [
					{ id: 'name', header: 'Name', accessor: (r: Item) => r.name },
					{ id: 'x', header: 'Extra', accessor: () => 'x', hideBelow: 'lg' }
				]
			})
		);
		const th = [...target.querySelectorAll('thead th')].find((t) =>
			t.textContent?.includes('Extra')
		)!;
		expect(th.className).toContain('max-lg:hidden');
		expect(rows()[0]!.querySelectorAll('td')[1]!.className).toContain('max-lg:hidden');
	});

	it('the skeleton hides the same columns', () => {
		render(
			base({
				data: [],
				query: { isPending: true, isError: false, error: null },
				columns: [
					{ id: 'name', header: 'Name', accessor: (r: Item) => r.name },
					{ id: 'x', header: 'Extra', accessor: () => 'x', hideBelow: 'md' }
				]
			})
		);
		const th = [...target.querySelectorAll('thead th')].find((t) =>
			t.textContent?.includes('Extra')
		)!;
		expect(th.className).toContain('max-md:hidden');
	});

	it('the header edge is drawn on the cells, so it stays when the header sticks', () => {
		render(base({ data: items(2) }));
		for (const th of target.querySelectorAll('thead th')) {
			expect(th.className).toContain('shadow-[inset_0_-1px_0_0_var(--border)]');
		}
	});

	it('the primary link is a block that wraps the cell, link-coloured', () => {
		render(base({ data: items(2), rowHref: (r: Item) => `/items/${r.id}` }));
		const link = target.querySelector('tbody a')!;
		expect(link.className).toContain('block');
		expect(link.className).toContain('text-primary-text');
	});

	it('a sort button is at least 24 px high', () => {
		render(
			base({
				data: items(2),
				sorting: { mode: 'client' },
				columns: [{ id: 'k', header: 'Key', accessor: (r: Item) => r.name, sortable: true }]
			})
		);
		expect(target.querySelector('thead th button')!.className).toContain('min-h-6');
	});

	it('an indeterminate header checkbox when some rows are selected', () => {
		const state = createBulkSelection<{ id: string }>();
		render(
			base({
				data: items(3),
				selection: { mode: 'multi', state, rowLabel: (r: Item) => `Select ${r.name}` }
			})
		);
		target.querySelector<HTMLElement>('[aria-label="Select Item 01"]')!.click();
		flushSync();
		expect(target.querySelector('[aria-label^="Select all"]')!.getAttribute('aria-checked')).toBe(
			'mixed'
		);
	});
});

void linkCell;
