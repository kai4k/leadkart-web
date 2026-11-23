import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet, flushSync, mount, tick, unmount } from 'svelte';
import DataTable from '#lib/components/data/data-table/DataTable.svelte';
import type { DataTableColumn } from '#lib/components/data/data-table/types.ts';
import { createBulkSelection } from '#lib/hooks/index.ts';
import { NotFoundError } from '#lib/api/errors.ts';

type Person = { id: string; name: string; role: string; age: number };

const PEOPLE: Person[] = [
	{ id: 'p-1', name: 'Carol', role: 'Admin', age: 41 },
	{ id: 'p-2', name: 'Alice', role: 'Sales', age: 29 },
	{ id: 'p-3', name: 'Bob', role: 'Sales', age: 35 }
];

const nameCell = createRawSnippet<[Person]>((row) => ({
	render: () => `<span data-testid="name">${row().name}</span>`
}));
const actionCell = createRawSnippet<[Person]>((row) => ({
	render: () => `<button type="button">Edit ${row().name}</button>`
}));

function columns(over: Partial<DataTableColumn<Person>> = {}): DataTableColumn<Person>[] {
	return [
		{
			id: 'name',
			header: 'Name',
			accessor: (r) => r.name,
			cell: nameCell,
			sortable: true,
			...over
		},
		{ id: 'role', header: 'Role', accessor: (r) => r.role },
		{ id: 'age', header: 'Age', accessor: (r) => r.age, sortable: true }
	];
}

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

function render(props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(DataTable as never, {
		target,
		props: {
			columns: columns(),
			data: PEOPLE,
			getRowId: (r: Person) => r.id,
			noun: 'people',
			...props
		}
	});
	flushSync();
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

const bodyRows = () => [...target.querySelectorAll<HTMLElement>('tbody tr')];
const names = () => bodyRows().map((r) => r.querySelector('[data-testid="name"]')?.textContent);
const header = (label: string) =>
	[...target.querySelectorAll<HTMLElement>('thead th')].find((th) =>
		th.textContent?.includes(label)
	);
const sortButton = (label: string) => header(label)!.querySelector<HTMLButtonElement>('button')!;

describe('DataTable core', () => {
	it('renders the headers and one tr per row', () => {
		render({});
		const heads = [...target.querySelectorAll('thead th')].map((th) => th.textContent?.trim());
		expect(heads).toEqual(['Name', 'Role', 'Age']);
		expect(bodyRows()).toHaveLength(3);
	});

	it('the sticky header is a hard edge: no material and no backdrop on thead', () => {
		render({});
		const thead = target.querySelector('thead')!;
		expect(thead.className).toContain('sticky');
		expect(thead.className).not.toMatch(/material-/);
		expect(thead.className).not.toMatch(/backdrop-/);
		const wrapper = thead.closest('[data-slot="data-table-scroll"]')!;
		expect(wrapper.className).not.toMatch(/material-|backdrop-/);
	});

	it('client sorting cycles ascending, descending, then none, with aria-sort on the header', () => {
		render({ sorting: { mode: 'client' } });
		expect(header('Name')!.getAttribute('aria-sort')).toBe('none');
		sortButton('Name').click();
		flushSync();
		expect(header('Name')!.getAttribute('aria-sort')).toBe('ascending');
		expect(names()).toEqual(['Alice', 'Bob', 'Carol']);
		sortButton('Name').click();
		flushSync();
		expect(header('Name')!.getAttribute('aria-sort')).toBe('descending');
		expect(names()).toEqual(['Carol', 'Bob', 'Alice']);
		sortButton('Name').click();
		flushSync();
		expect(header('Name')!.getAttribute('aria-sort')).toBe('none');
		expect(names()).toEqual(['Carol', 'Alice', 'Bob']);
	});

	it('client sorting orders numbers numerically', () => {
		render({ sorting: { mode: 'client' } });
		sortButton('Age').click();
		flushSync();
		expect(names()).toEqual(['Alice', 'Bob', 'Carol']);
	});

	it('only sortable columns get a sort button and aria-sort', () => {
		render({ sorting: { mode: 'client' } });
		expect(header('Role')!.querySelector('button')).toBeNull();
		expect(header('Role')!.hasAttribute('aria-sort')).toBe(false);
	});

	it('server sorting emits onChange and does not reorder; the given state drives aria-sort', () => {
		const onChange = vi.fn();
		render({ sorting: { mode: 'server', state: null, onChange } });
		sortButton('Name').click();
		flushSync();
		expect(onChange).toHaveBeenCalledWith({ id: 'name', desc: false });
		expect(names()).toEqual(['Carol', 'Alice', 'Bob']);
		expect(header('Name')!.getAttribute('aria-sort')).toBe('none');
	});

	it('server sorting reflects the state it is handed and asks for descending next', () => {
		const onChange = vi.fn();
		render({ sorting: { mode: 'server', state: { id: 'name', desc: false }, onChange } });
		expect(header('Name')!.getAttribute('aria-sort')).toBe('ascending');
		sortButton('Name').click();
		expect(onChange).toHaveBeenCalledWith({ id: 'name', desc: true });
	});

	it('multi selection: the header checkbox selects every loaded row and the ids survive a re-sort', () => {
		const state = createBulkSelection<Person>();
		render({
			sorting: { mode: 'client' },
			selection: { mode: 'multi', state, rowLabel: (r: Person) => `Select ${r.name}` }
		});
		const all = target.querySelector<HTMLElement>('[aria-label^="Select all"]')!;
		all.click();
		flushSync();
		expect([...state.selected].sort()).toEqual(['p-1', 'p-2', 'p-3']);
		sortButton('Name').click();
		flushSync();
		const boxes = [...target.querySelectorAll<HTMLElement>('tbody [role="checkbox"]')];
		expect(boxes).toHaveLength(3);
		expect(boxes.every((b) => b.getAttribute('aria-checked') === 'true')).toBe(true);
		expect(target.querySelector('[aria-label="Select Alice"]')).not.toBeNull();
	});

	it('a row checkbox toggles that row by id', () => {
		const state = createBulkSelection<Person>();
		render({ selection: { mode: 'multi', state, rowLabel: (r: Person) => `Select ${r.name}` } });
		target.querySelector<HTMLElement>('[aria-label="Select Bob"]')!.click();
		flushSync();
		expect([...state.selected]).toEqual(['p-3']);
		expect(bodyRows()[2]!.getAttribute('data-state')).toBe('selected');
	});

	it('single selection clears the previous row before selecting', () => {
		const state = createBulkSelection<Person>();
		render({ selection: { mode: 'single', state, rowLabel: (r: Person) => `Select ${r.name}` } });
		expect(target.querySelector('[aria-label^="Select all"]')).toBeNull();
		target.querySelector<HTMLElement>('[aria-label="Select Carol"]')!.click();
		flushSync();
		target.querySelector<HTMLElement>('[aria-label="Select Bob"]')!.click();
		flushSync();
		expect([...state.selected]).toEqual(['p-3']);
	});

	it('rowHref links the primary cell and never makes the row clickable', () => {
		render({ rowHref: (r: Person) => `/people/${r.id}` });
		const row = bodyRows()[0]!;
		const links = row.querySelectorAll('a');
		expect(links).toHaveLength(1);
		expect(links[0]!.getAttribute('href')).toBe('/people/p-1');
		expect(row.querySelector('td')!.contains(links[0]!)).toBe(true);
		expect(row.onclick).toBeNull();
		expect(row.getAttribute('role')).toBeNull();
	});

	it('the primary column is the one flagged primary, not always the first', () => {
		render({
			columns: [
				{ id: 'role', header: 'Role', accessor: (r: Person) => r.role },
				{ id: 'name', header: 'Name', accessor: (r: Person) => r.name, primary: true }
			],
			rowHref: (r: Person) => `/people/${r.id}`
		});
		const cells = bodyRows()[0]!.querySelectorAll('td');
		expect(cells[0]!.querySelector('a')).toBeNull();
		expect(cells[1]!.querySelector('a')).not.toBeNull();
	});

	it('the Columns menu hides and shows a column', async () => {
		render({ columnVisibility: true });
		const trigger = [...target.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Columns')
		)!;
		expect(trigger).toBeDefined();
		trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await tick();
		flushSync();
		const items = [...document.body.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]')];
		expect(items.map((i) => i.textContent?.trim())).toEqual(['Name', 'Role', 'Age']);
		items.find((i) => i.textContent?.includes('Age'))!.click();
		await tick();
		flushSync();
		expect(header('Age')).toBeUndefined();
		expect(bodyRows()[0]!.querySelectorAll('td')).toHaveLength(2);
	});

	it('columns flagged defaultHidden start hidden and primary columns are not offered', async () => {
		render({
			columnVisibility: true,
			columns: [
				{ id: 'name', header: 'Name', accessor: (r: Person) => r.name, primary: true },
				{ id: 'role', header: 'Role', accessor: (r: Person) => r.role, defaultHidden: true }
			]
		});
		expect(header('Role')).toBeUndefined();
		const trigger = [...target.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Columns')
		)!;
		trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await tick();
		flushSync();
		const items = [...document.body.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]')];
		expect(items.map((i) => i.textContent?.trim())).toEqual(['Role']);
	});

	it('a pending query shows a status skeleton with the header still visible', () => {
		render({ data: [], query: { isPending: true, isError: false, error: null } });
		expect(target.querySelector('[role="status"]')).not.toBeNull();
		expect(header('Name')).toBeDefined();
		expect(bodyRows().some((r) => r.querySelector('[data-testid="name"]'))).toBe(false);
	});

	it('a NotFoundError renders the shared not-found copy', () => {
		render({
			data: [],
			query: { isPending: false, isError: true, error: new NotFoundError('gone') }
		});
		expect(target.textContent).toContain('Not found');
	});

	it('no rows renders the empty state with the noun', () => {
		render({ data: [] });
		expect(target.textContent).toContain('No people yet');
		expect(target.querySelector('table')).toBeNull();
	});

	it('a custom empty snippet replaces the default', () => {
		const empty = createRawSnippet(() => ({ render: () => '<p>Nobody here</p>' }));
		render({ data: [], empty });
		expect(target.textContent).toContain('Nobody here');
	});

	it('the actions column has an sr-only "Actions" header and a cell per row', () => {
		render({ rowActions: actionCell });
		const th = [...target.querySelectorAll('thead th')].at(-1)!;
		expect(th.querySelector('.sr-only')?.textContent).toBe('Actions');
		expect(bodyRows().every((r) => r.querySelector('td:last-child button'))).toBe(true);
	});

	it('client paging shows one page and Next shows the following rows', () => {
		const many: Person[] = Array.from({ length: 25 }, (_, i) => ({
			id: `m-${i + 1}`,
			name: `Person ${String(i + 1).padStart(2, '0')}`,
			role: 'Sales',
			age: 20 + i
		}));
		render({ data: many, pagination: { mode: 'client', pageSize: 10 } });
		expect(bodyRows()).toHaveLength(10);
		expect(names()[0]).toBe('Person 01');
		expect(target.textContent).toContain('1–10 of 25');
		target.querySelector<HTMLElement>('[aria-label="Next page"]')!.click();
		flushSync();
		expect(bodyRows()).toHaveLength(10);
		expect(names()[0]).toBe('Person 11');
		expect(target.textContent).toContain('11–20 of 25');
	});

	it('client paging keeps the selection across pages', () => {
		const many: Person[] = Array.from({ length: 25 }, (_, i) => ({
			id: `m-${i + 1}`,
			name: `Person ${i + 1}`,
			role: 'Sales',
			age: 20 + i
		}));
		const state = createBulkSelection<Person>();
		render({
			data: many,
			pagination: { mode: 'client', pageSize: 10 },
			selection: { mode: 'multi', state, rowLabel: (r: Person) => `Select ${r.name}` }
		});
		target.querySelector<HTMLElement>('[aria-label^="Select all"]')!.click();
		flushSync();
		expect(state.count).toBe(25);
	});

	it('offset paging calls onPageChange with the next page number', () => {
		const onPageChange = vi.fn();
		render({ pagination: { mode: 'offset', page: 1, pageCount: 3, onPageChange } });
		target.querySelector<HTMLElement>('[aria-label="Next page"]')!.click();
		expect(onPageChange).toHaveBeenCalledWith(2);
	});

	it('compact density tightens the cell padding', () => {
		render({ density: 'compact' });
		expect(bodyRows()[0]!.querySelector('td')!.className).toContain('py-2');
	});

	it('the default density uses the roomy cell padding', () => {
		render({});
		expect(bodyRows()[0]!.querySelector('td')!.className).toContain('py-3.5');
	});

	it('an sr-only caption names the table', () => {
		render({ caption: 'All people' });
		expect(target.querySelector('caption')?.textContent).toBe('All people');
	});

	it('the footer snippet renders a tfoot', () => {
		const footer = createRawSnippet(() => ({
			render: () => '<tr><td colspan="3">Total 3</td></tr>'
		}));
		render({ footer });
		expect(target.querySelector('tfoot')?.textContent).toContain('Total 3');
	});
});
