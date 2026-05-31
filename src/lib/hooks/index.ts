/**
 * Reusable hooks barrel — runes-based, factory-shaped composables that
 * resource list pages consume to stay under ~200 lines apiece.
 *
 * Each hook exports its factory function (`createX`), its returned-
 * interface type (`X`), and any options/result types. Consumers call
 * the factory in component setup and store the returned object
 * directly. No classes, no `new`, no `this` — runes track reactivity
 * through closures (the Svelte 5 canon for shared reactive logic).
 */
export {
	createUrlFilters,
	type UrlFilters,
	type UrlFilterValue,
	type UrlFiltersBase,
	type UrlFilterFieldSchema,
	type UrlFiltersSchema,
	type UrlFilterChip
} from './use-url-filters.svelte';

export {
	createInfiniteList,
	type InfiniteList,
	type InfinitePage,
	type InfiniteListState,
	type InfiniteListOptions,
	type InfiniteListQuery
} from './use-infinite-list.svelte';

export {
	createKeyboardListNav,
	type KeyboardListNav,
	type KeyableItem,
	type KeyboardListNavOptions
} from './use-keyboard-list-nav.svelte';

export { useUrlTab, type UseUrlTab } from './use-url-tab.svelte';

export { createSavedViews, type SavedViews, type SavedView } from './use-saved-views.svelte';

export {
	useOptimisticMutation,
	type UseOptimisticMutationOptions,
	type OptimisticMutationHandle
} from './use-optimistic-mutation.svelte';

export {
	createBulkSelection,
	type BulkSelection,
	type SelectableItem
} from './use-bulk-selection.svelte';

export {
	createListPagination,
	type ListPagination,
	type ListPaginationOptions
} from './use-list-pagination.svelte';

export { createPwa, type Pwa } from './use-pwa.svelte';

export { useForm, type Form, type FormOpts, type FieldErrors } from './use-form.svelte';

export {
	theme,
	type Theme,
	PRIMARY_COLORS,
	CONTENT_WIDTHS,
	type PrimaryColor,
	type ContentWidth
} from './use-theme.svelte';
