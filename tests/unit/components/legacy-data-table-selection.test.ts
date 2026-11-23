import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { createBulkSelection, type BulkSelection } from '#lib/hooks/index.ts';
import Host from './legacy-table-host.svelte';
import { createLegacyTableControl, type HostRow } from './legacy-table-control.svelte.ts';

const A: HostRow = { id: 'a', name: 'A' };
const B: HostRow = { id: 'b', name: 'B' };
const C: HostRow = { id: 'c', name: 'C' };

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
});

function setup(rows: HostRow[]) {
	const control = createLegacyTableControl(rows);
	const selection: BulkSelection<HostRow> = createBulkSelection<HostRow>();
	target = document.body.appendChild(document.createElement('div'));
	component = mount(Host, { target, props: { control, selection } });
	flushSync();
	return { control, selection };
}

describe('legacy ui/data-table: a selected row that is no longer in the loaded rows is dropped', () => {
	it('a sort that leaves the page drops the row; the bar count follows', () => {
		const { control, selection } = setup([A, B]);
		selection.toggle('a');
		selection.toggle('b');
		control.rows = [B, C];
		flushSync();
		expect([...selection.selected]).toEqual(['b']);
		expect(selection.count).toBe(1);
	});

	it('the same rows in another order keep the selection', () => {
		const { control, selection } = setup([A, B]);
		selection.toggle('a');
		control.rows = [B, A];
		flushSync();
		expect([...selection.selected]).toEqual(['a']);
	});

	it('nothing is dropped while the new rows are still loading', () => {
		const { control, selection } = setup([A, B]);
		selection.toggle('a');
		control.state = 'loading';
		control.rows = [];
		flushSync();
		expect([...selection.selected]).toEqual(['a']);
		control.state = 'ready';
		control.rows = [A, C];
		flushSync();
		expect([...selection.selected]).toEqual(['a']);
	});

	it('a list that settles empty selects nothing', () => {
		const { control, selection } = setup([A, B]);
		selection.toggle('a');
		control.state = 'empty';
		control.rows = [];
		flushSync();
		expect(selection.count).toBe(0);
	});
});
