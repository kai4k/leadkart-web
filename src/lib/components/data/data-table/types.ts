import type { Snippet } from 'svelte';
import type { BulkSelection, InfiniteList, KeyboardListNav } from '#lib/hooks/index.ts';

export type Density = 'compact' | 'default';
export type SortState = { id: string; desc: boolean } | null;

export interface DataTableColumn<T> {
	id: string;
	/** Visible header text, also the name of the sort button and of the Columns menu entry. */
	header: string;
	/** The displayed value when there is no `cell` snippet, and the sort value unless `sortValue` is given. */
	accessor?: (row: T) => string | number | null | undefined;
	cell?: Snippet<[T]>;
	/**
	 * Client sorting sorts by `sortValue ?? accessor` (a sortable column with neither is not sortable);
	 * server sorting only emits `onChange`.
	 */
	sortable?: boolean;
	sortValue?: (row: T) => string | number;
	/** Appears in the Columns menu (default true unless `primary`). */
	hideable?: boolean;
	defaultHidden?: boolean;
	/** The cell `rowHref` links from (default: the first column). Its content must not be a link itself. */
	primary?: boolean;
	align?: 'start' | 'end';
	/** The column is not shown below this Tailwind breakpoint. */
	hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
	/** Width and alignment utilities only. */
	class?: string;
}

export type DataTableSorting =
	| { mode: 'none' }
	| { mode: 'client'; initial?: SortState }
	| { mode: 'server'; state: SortState; onChange: (next: SortState) => void };

export type DataTablePagination<T> =
	| { mode: 'none' }
	| { mode: 'client'; pageSize: number }
	| { mode: 'offset'; page: number; pageCount: number; onPageChange: (page: number) => void }
	| { mode: 'cursor'; list: InfiniteList<T> };

type CursorPagination<T> = Extract<DataTablePagination<T>, { mode: 'cursor' }>;

interface DataTableBaseProps<T> {
	columns: DataTableColumn<T>[];
	data: T[];
	getRowId: (row: T) => string;
	/** QueryState copy: "people" reads as "Loading people", "No people yet". */
	noun: string;
	/** Omit for static data. In `cursor` paging the list's own query is used when this is omitted. */
	query?: { isPending: boolean; isError: boolean; error: unknown; refetch?: () => unknown };
	/**
	 * Selection is keyed by `getRowId(row)`. Ids of rows that are no longer in `data` are dropped
	 * (not in `offset` paging, where `data` is one page of a longer list).
	 */
	selection?: {
		mode: 'single' | 'multi';
		state: BulkSelection<{ id: string }>;
		rowLabel: (row: T) => string;
	};
	/** Shows the "Columns" menu. */
	columnVisibility?: boolean;
	rowHref?: (row: T) => string;
	/** Last column; its header is the sr-only "Actions". */
	rowActions?: Snippet<[T]>;
	/** Rows of a `<tfoot>` (totals). */
	footer?: Snippet;
	empty?: Snippet;
	/** Default true. */
	stickyHeader?: boolean;
	density?: Density;
	/** Rows above which the body is windowed. Default 100. */
	virtualizeAbove?: number;
	/** Row keyboard navigation. Create it with `getId: getRowId` when rows have no `id` field. */
	nav?: KeyboardListNav<T>;
	/** Accessible name of the table (sr-only `<caption>`). */
	caption?: string;
}

/**
 * Client sorting sorts the rows that are loaded, so it is not offered on a cursor list: "first by
 * name" would be false while more pages remain. A cursor list sorts on the server or not at all.
 */
export type DataTableProps<T> = DataTableBaseProps<T> &
	(
		| {
				pagination?: Exclude<DataTablePagination<T>, { mode: 'cursor' }>;
				sorting?: DataTableSorting;
		  }
		| {
				pagination: CursorPagination<T>;
				sorting?: Exclude<DataTableSorting, { mode: 'client' }>;
		  }
	);
