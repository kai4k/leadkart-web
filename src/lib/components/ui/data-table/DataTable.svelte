<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export type DataTableColumn<T> = {
		/** Stable column ID — used for sort param + column-customization.
		 * When set to `'select'`, the column auto-renders a checkbox cell
		 * wired to the `selection` prop (Linear / Stripe / Shopify canon). */
		id: string;
		/** Header label. Ignored when `id === 'select'` (header renders a select-all checkbox). */
		header: string;
		/** Accessor — either a key on T or a function returning the display value.
		 * Optional for `id === 'select'` columns. */
		accessor?: keyof T | ((row: T) => string | number | null);
		/** Optional custom renderer — receives the row, returns a Svelte snippet via {@render}. */
		cell?: Snippet<[T]>;
		/** Sort key for server-side sorting. Set if sortable. */
		sortBy?: string;
		/** CSS classes for this column's cells (e.g. width, alignment). */
		class?: string;
		/** Hide column below this Tailwind breakpoint. */
		hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
		/** Optional ARIA label override for the row checkbox in `id === 'select'` columns. */
		selectLabel?: (row: T) => string;
	};

	export type DataTableProps<T> = {
		/** Column definitions. */
		columns: DataTableColumn<T>[];
		/** Row data. */
		rows: T[];
		/** Extracts a stable key for {#each ...} — usually `(r) => r.id`. */
		rowKey: (row: T) => string;
		/** State: loading | error | empty | ready. Drives the rendered UI. */
		state?: 'loading' | 'error' | 'empty' | 'ready';
		/** Error message for the error state. */
		error?: string | null;
		/** Empty-state slot — defaults to a generic EmptyState. */
		emptyState?: Snippet;
		/** Row click handler — typically navigation. */
		onRowClick?: (row: T) => void;
		/** Row-level actions snippet rendered in the last column. */
		rowActions?: Snippet<[T]>;
		/** Current sort state. */
		sort?: { column: string; order: 'asc' | 'desc' } | null;
		/** Sort change handler — emits to the parent which encodes to URL state. */
		onSortChange?: (column: string, order: 'asc' | 'desc') => void;
		/**
		 * Selection store. Required when any column has `id === 'select'`.
		 * Wires the row + select-all checkboxes to the shared bulk-selection
		 * primitive — `selectAllVisible`, `deselectAllVisible`, `toggle`,
		 * `isSelected`, `areAllVisibleSelected`.
		 *
		 * The selection store's items must extend `{ id: string }`. The
		 * table uses `rowKey` to look up the selection id, so callers
		 * whose row shape uses a different identity field (e.g.
		 * `membership_id`) MUST NOT include a `select` column unless
		 * they also pass a selection whose item shape matches.
		 */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		selection?: import('$lib/hooks').UseBulkSelection<any>;
		/** Optional class on the wrapping element. */
		class?: string;
	};
</script>

<script lang="ts" generics="T">
	import { Skeleton, EmptyState } from '$ui';
	import { ChevronUp, ChevronDown, ChevronsUpDown, Icon } from '$icons';
	import { cn } from '$lib/utils/cn';
	import Alert from '../Alert.svelte';

	let {
		columns,
		rows,
		rowKey,
		state = 'ready',
		error = null,
		emptyState,
		onRowClick,
		rowActions,
		sort = null,
		onSortChange,
		selection,
		class: className = ''
	}: DataTableProps<T> = $props();

	export function getCellValue(
		row: T,
		accessor: DataTableColumn<T>['accessor']
	): string | number | null {
		if (accessor === undefined) return null;
		if (typeof accessor === 'function') return accessor(row);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (row as any)[accessor] ?? null;
	}

	export function getHideBreakpoint(col: DataTableColumn<T>): string {
		if (!col.hideBelow) return '';
		const map: Record<NonNullable<DataTableColumn<T>['hideBelow']>, string> = {
			sm: 'hidden sm:table-cell',
			md: 'hidden md:table-cell',
			lg: 'hidden lg:table-cell',
			xl: 'hidden xl:table-cell'
		};
		return map[col.hideBelow];
	}

	function onHeaderClick(col: DataTableColumn<T>) {
		if (!col.sortBy || !onSortChange) return;
		const nextOrder: 'asc' | 'desc' =
			sort?.column === col.sortBy && sort.order === 'asc' ? 'desc' : 'asc';
		onSortChange(col.sortBy, nextOrder);
	}

	function isSelectCol(col: DataTableColumn<T>): boolean {
		return col.id === 'select';
	}

	// Normalize rows into `{ id }` shape for the selection store. When the
	// caller's row already has an `id` field this is a no-op; otherwise
	// `rowKey` provides the identifier the store keys on.
	const selectableRows = $derived(
		rows.map((r) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const maybeId = (r as any)?.id;
			return typeof maybeId === 'string' ? r : { ...(r as object), id: rowKey(r) };
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		}) as any[]
	);

	const allVisibleSelected = $derived(
		selection ? rows.length > 0 && selection.areAllVisibleSelected(selectableRows) : false
	);
	const someVisibleSelected = $derived(
		selection ? selection.count > 0 && !allVisibleSelected : false
	);

	function toggleAllVisible() {
		if (!selection) return;
		if (selection.areAllVisibleSelected(selectableRows))
			selection.deselectAllVisible(selectableRows);
		else selection.selectAllVisible(selectableRows);
	}
</script>

{#if state === 'loading'}
	<div class={cn('overflow-x-auto', className)}>
		<table class="w-full text-left">
			<thead>
				<tr class="border-border border-b">
					{#each columns as col (col.id)}
						<th
							class={cn(
								'text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase',
								isSelectCol(col) && 'w-10',
								getHideBreakpoint(col),
								col.class
							)}
						>
							{#if !isSelectCol(col)}
								{col.header}
							{/if}
						</th>
					{/each}
					{#if rowActions}<th class="w-12"></th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each [0, 1, 2, 3, 4, 5] as i (i)}
					<tr class="border-border border-b">
						{#each columns as col (col.id)}
							<td class={cn('px-3 py-3', getHideBreakpoint(col), col.class)}>
								{#if isSelectCol(col)}
									<Skeleton class="h-4 w-4" />
								{:else}
									<Skeleton class="h-4 w-3/4" />
								{/if}
							</td>
						{/each}
						{#if rowActions}<td class="w-12"></td>{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else if state === 'error'}
	<Alert variant="danger" title="Couldn't load">{error ?? 'Unknown error'}</Alert>
{:else if state === 'empty' || rows.length === 0}
	{#if emptyState}
		{@render emptyState()}
	{:else}
		<EmptyState title="No results" />
	{/if}
{:else}
	<div class={cn('overflow-x-auto', className)}>
		<table class="w-full text-left">
			<thead>
				<tr class="border-border border-b">
					{#each columns as col (col.id)}
						<th
							class={cn(
								'text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase',
								isSelectCol(col) && 'w-10',
								getHideBreakpoint(col),
								col.class
							)}
						>
							{#if isSelectCol(col)}
								{#if selection}
									<input
										type="checkbox"
										checked={allVisibleSelected}
										indeterminate={someVisibleSelected}
										onchange={toggleAllVisible}
										aria-label={allVisibleSelected ? 'Deselect all' : 'Select all'}
										data-testid="select-all"
									/>
								{/if}
							{:else if col.sortBy && onSortChange}
								<button
									type="button"
									class="cluster cluster-tight hover:text-fg inline-flex items-center gap-1"
									onclick={() => onHeaderClick(col)}
								>
									{col.header}
									{#if sort?.column === col.sortBy}
										<Icon icon={sort.order === 'asc' ? ChevronUp : ChevronDown} size="xs" />
									{:else}
										<Icon icon={ChevronsUpDown} size="xs" class="opacity-30" />
									{/if}
								</button>
							{:else}
								{col.header}
							{/if}
						</th>
					{/each}
					{#if rowActions}
						<th class="w-12"></th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each rows as row (rowKey(row))}
					<tr
						class={cn(
							'border-border hover:bg-bg-muted border-b transition-colors',
							onRowClick && 'cursor-pointer'
						)}
						onclick={onRowClick ? () => onRowClick!(row) : undefined}
						tabindex={onRowClick ? 0 : undefined}
						onkeydown={onRowClick
							? (e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										onRowClick!(row);
									}
								}
							: undefined}
					>
						{#each columns as col (col.id)}
							<td class={cn('px-3 py-3', getHideBreakpoint(col), col.class)}>
								{#if isSelectCol(col)}
									{@const selectId = rowKey(row)}
									<div
										onclick={(e) => e.stopPropagation()}
										onkeydown={(e) => e.stopPropagation()}
										role="presentation"
									>
										{#if selection}
											<input
												type="checkbox"
												checked={selection.isSelected(selectId)}
												onchange={() => selection.toggle(selectId)}
												aria-label={col.selectLabel ? col.selectLabel(row) : `Select row`}
												data-testid={`row-checkbox-${selectId}`}
											/>
										{/if}
									</div>
								{:else if col.cell}
									{@render col.cell(row)}
								{:else}
									{getCellValue(row, col.accessor) ?? '—'}
								{/if}
							</td>
						{/each}
						{#if rowActions}
							<td class="w-12 px-3 text-right" onclick={(e) => e.stopPropagation()} role="cell">
								{@render rowActions(row)}
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
