/**
 * The only file that names TanStack Table v9. `DataTableColumn<T>` (what pages write) is converted to
 * TanStack column defs here, and the feature set is registered once: sorting, client paging and column
 * visibility. Row selection is NOT a TanStack feature here: it lives in `BulkSelection`, keyed by row id.
 */
import {
	columnVisibilityFeature,
	createPaginatedRowModel,
	createSortedRowModel,
	rowPaginationFeature,
	rowSortingFeature,
	sortFn_alphanumeric,
	sortFn_basic,
	tableFeatures,
	type ColumnDef,
	type Row,
	type RowData
} from '@tanstack/svelte-table';
import type { DataTableColumn } from './types.ts';

export const dataTableFeatures = tableFeatures({
	rowSortingFeature,
	rowPaginationFeature,
	columnVisibilityFeature,
	sortedRowModel: createSortedRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic }
});

export type DataTableFeatures = typeof dataTableFeatures;
export type DataTableRow<T extends RowData> = Row<DataTableFeatures, T>;

/** The value the table sorts by: an explicit `sortValue`, else what the cell shows. */
function sortKey<T>(col: DataTableColumn<T>, row: T): string | number | null | undefined {
	return col.sortValue ? col.sortValue(row) : col.accessor?.(row);
}

export function toTableColumns<T extends RowData>(
	columns: DataTableColumn<T>[]
): ColumnDef<DataTableFeatures, T>[] {
	return columns.map((col) => ({
		id: col.id,
		header: col.header,
		accessorFn: (row: T) => sortKey(col, row),
		enableSorting: col.sortable === true,
		enableHiding: col.hideable ?? !col.primary,
		sortUndefined: 'last' as const
	}));
}

/** Columns the Columns menu offers: hideable, and never the primary link column. */
export function hideableColumns<T>(columns: DataTableColumn<T>[]): DataTableColumn<T>[] {
	return columns.filter((c) => c.hideable ?? !c.primary);
}

/** Initial TanStack visibility state: only `defaultHidden` columns are listed, as `false`. */
export function initialVisibility<T>(columns: DataTableColumn<T>[]): Record<string, boolean> {
	return Object.fromEntries(columns.filter((c) => c.defaultHidden).map((c) => [c.id, false]));
}
