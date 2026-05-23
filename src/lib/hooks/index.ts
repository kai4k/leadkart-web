/**
 * Reusable hooks barrel — runes-based, class-shaped composables that
 * resource list pages consume to stay under ~200 lines apiece.
 *
 * Each hook exports both the class (for typed `let foo: UseFoo` binds)
 * and its option/result types so consumers can declare typed wrappers
 * without reaching into the module's path directly.
 */
export {
	UseUrlFilters,
	type UrlFilterValue,
	type UrlFiltersBase,
	type UrlFilterFieldSchema,
	type UrlFiltersSchema,
	type UrlFilterChip
} from './use-url-filters.svelte';

export {
	UseInfiniteList,
	type InfinitePage,
	type InfiniteListState,
	type UseInfiniteListOptions,
	type InfiniteListQuery
} from './use-infinite-list.svelte';

export {
	UseKeyboardListNav,
	type KeyableItem,
	type UseKeyboardListNavOptions
} from './use-keyboard-list-nav.svelte';

export { UseSavedViews, type SavedView } from './use-saved-views.svelte';

export {
	useOptimisticMutation,
	type UseOptimisticMutationOptions,
	type OptimisticMutationHandle
} from './use-optimistic-mutation.svelte';

export { UseBulkSelection, type SelectableItem } from './use-bulk-selection.svelte';
