/**
 * Composition primitives for data-heavy pages.
 *
 * These primitives compose the `$ui` namespace's atoms (Button,
 * Drawer, Dialog, etc.) with the hooks under `#lib/hooks/index.ts` so that
 * each feature's list page reduces to ~200 lines of declarative
 * config rather than 800 lines of hand-rolled wiring.
 *
 * Usage:
 *   import * as Data from '#lib/components/data/index.ts';
 *   // or named:
 *   import { ResourceListPage, FilterBar } from '#lib/components/data/index.ts';
 */
export { default as Toolbar } from './Toolbar.svelte';
export { default as FilterBar } from './FilterBar.svelte';
export type { FilterBarField, FilterBarFieldType, FilterBarOption } from './FilterBar.svelte';
export { default as FilterChips } from './FilterChips.svelte';
export { default as BulkActionBar } from './BulkActionBar.svelte';
export type { BulkAction, BulkActionSubItem } from './BulkActionBar.svelte';
export { default as BulkUploadDrawer } from './BulkUploadDrawer.svelte';
export type {
	BulkUploadError,
	BulkUploadPreviewShape,
	BulkUploadResultShape,
	BulkUploadOption
} from './BulkUploadDrawer.svelte';
export { default as Pagination } from './Pagination.svelte';
export type { PaginationChange } from './Pagination.svelte';
export { default as InfiniteListFooter } from './InfiniteListFooter.svelte';
export { default as ResourceListPage } from './ResourceListPage.svelte';
export type { ResourceListAction } from './ResourceListPage.svelte';
// `DataTable` itself is NOT re-exported here: a barrel import is not tree-shaken away, so it would put TanStack
// Table into every page that imports anything from this barrel. Import it from `data/data-table/index.ts`.
export type {
	DataTableColumn,
	DataTableProps,
	DataTableSorting,
	DataTablePagination,
	Density as DataTableDensity,
	SortState as DataTableSortState
} from './data-table/index.ts';
export { default as IdentityCell } from './IdentityCell.svelte';
export { default as IdChip } from './IdChip.svelte';
export { default as BackLink } from './BackLink.svelte';
export { default as RowActionsMenu } from './RowActionsMenu.svelte';
export type { RowAction } from './RowActionsMenu.svelte';
