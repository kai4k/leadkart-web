/**
 * Unit tests for DataTable helper functions.
 *
 * These are pure functions extracted from DataTable.svelte and tested
 * in isolation — no DOM / Svelte rendering required.
 */
import { describe, expect, it } from 'vitest';
import type { DataTableColumn } from '$lib/components/ui/data-table';

// ─── Replicate helpers from DataTable.svelte (pure, no Svelte deps) ──────────

function getCellValue<T>(row: T, accessor: DataTableColumn<T>['accessor']): string | number | null {
	if (typeof accessor === 'function') return accessor(row);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (row as any)[accessor] ?? null;
}

function getHideBreakpoint<T>(col: DataTableColumn<T>): string {
	if (!col.hideBelow) return '';
	const map: Record<NonNullable<DataTableColumn<T>['hideBelow']>, string> = {
		sm: 'hidden sm:table-cell',
		md: 'hidden md:table-cell',
		lg: 'hidden lg:table-cell',
		xl: 'hidden xl:table-cell'
	};
	return map[col.hideBelow];
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

type TestRow = {
	id: string;
	name: string;
	count: number;
	nested: { value: string } | null;
};

const row: TestRow = { id: '1', name: 'Acme', count: 42, nested: { value: 'deep' } };

// ─── getCellValue ─────────────────────────────────────────────────────────────

describe('getCellValue — key accessor', () => {
	it('returns string property value', () => {
		const col: DataTableColumn<TestRow> = { id: 'name', header: 'Name', accessor: 'name' };
		expect(getCellValue(row, col.accessor)).toBe('Acme');
	});

	it('returns numeric property value', () => {
		const col: DataTableColumn<TestRow> = { id: 'count', header: 'Count', accessor: 'count' };
		expect(getCellValue(row, col.accessor)).toBe(42);
	});

	it('returns null when property is absent (undefined coerced to null)', () => {
		// Cast to bypass type: accessing a missing key
		const col = { id: 'missing', header: 'Missing', accessor: 'missing' as keyof TestRow };
		expect(getCellValue(row, col.accessor)).toBeNull();
	});
});

describe('getCellValue — function accessor', () => {
	it('calls the accessor function with the row', () => {
		const col: DataTableColumn<TestRow> = {
			id: 'derived',
			header: 'Derived',
			accessor: (r) => `${r.name} (${r.count})`
		};
		expect(getCellValue(row, col.accessor)).toBe('Acme (42)');
	});

	it('returns null when function returns null', () => {
		const col: DataTableColumn<TestRow> = {
			id: 'nulled',
			header: 'Null',
			accessor: () => null
		};
		expect(getCellValue(row, col.accessor)).toBeNull();
	});

	it('returns 0 (falsy number) correctly — does not coerce to null', () => {
		const col: DataTableColumn<TestRow> = {
			id: 'zero',
			header: 'Zero',
			accessor: () => 0
		};
		expect(getCellValue(row, col.accessor)).toBe(0);
	});
});

// ─── getHideBreakpoint ────────────────────────────────────────────────────────

describe('getHideBreakpoint', () => {
	it('returns empty string when hideBelow is not set', () => {
		const col: DataTableColumn<TestRow> = { id: 'x', header: 'X', accessor: 'name' };
		expect(getHideBreakpoint(col)).toBe('');
	});

	it('returns hidden/sm:table-cell for sm', () => {
		const col: DataTableColumn<TestRow> = {
			id: 'x',
			header: 'X',
			accessor: 'name',
			hideBelow: 'sm'
		};
		expect(getHideBreakpoint(col)).toBe('hidden sm:table-cell');
	});

	it('returns hidden/md:table-cell for md', () => {
		const col: DataTableColumn<TestRow> = {
			id: 'x',
			header: 'X',
			accessor: 'name',
			hideBelow: 'md'
		};
		expect(getHideBreakpoint(col)).toBe('hidden md:table-cell');
	});

	it('returns hidden/lg:table-cell for lg', () => {
		const col: DataTableColumn<TestRow> = {
			id: 'x',
			header: 'X',
			accessor: 'name',
			hideBelow: 'lg'
		};
		expect(getHideBreakpoint(col)).toBe('hidden lg:table-cell');
	});

	it('returns hidden/xl:table-cell for xl', () => {
		const col: DataTableColumn<TestRow> = {
			id: 'x',
			header: 'X',
			accessor: 'name',
			hideBelow: 'xl'
		};
		expect(getHideBreakpoint(col)).toBe('hidden xl:table-cell');
	});
});
