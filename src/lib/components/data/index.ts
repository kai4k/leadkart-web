/**
 * Composition primitives for data-heavy pages.
 *
 * These primitives compose the `$ui` namespace's atoms (Button,
 * Drawer, Dialog, etc.) with the hooks under `$lib/hooks` so that
 * each feature's list page reduces to ~200 lines of declarative
 * config rather than 800 lines of hand-rolled wiring.
 *
 * Usage:
 *   import * as Data from '$lib/components/data';
 *   // or named:
 *   import { ResourceListPage, FilterBar } from '$lib/components/data';
 */
export { default as Toolbar } from './Toolbar.svelte';
export { default as FilterBar } from './FilterBar.svelte';
export type { FilterBarField, FilterBarFieldType, FilterBarOption } from './FilterBar.svelte';
export { default as FilterChips } from './FilterChips.svelte';
export { default as BulkActionBar } from './BulkActionBar.svelte';
export type { BulkAction } from './BulkActionBar.svelte';
export { default as BulkUploadDrawer } from './BulkUploadDrawer.svelte';
export type {
	BulkUploadError,
	BulkUploadPreviewShape,
	BulkUploadResultShape,
	BulkUploadOption
} from './BulkUploadDrawer.svelte';
export { default as ResourceListPage } from './ResourceListPage.svelte';
export type { ResourceListAction } from './ResourceListPage.svelte';
