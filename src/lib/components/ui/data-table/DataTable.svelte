<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export type DataTableColumn<T> = {
		/** Stable column ID — used for sort param + column-customization. */
		id: string;
		/** Header label. */
		header: string;
		/** Accessor — either a key on T or a function returning the display value. */
		accessor: keyof T | ((row: T) => string | number | null);
		/** Optional custom renderer — receives the row, returns a Svelte snippet via {@render}. */
		cell?: Snippet<[T]>;
		/** Sort key for server-side sorting. Set if sortable. */
		sortBy?: string;
		/** CSS classes for this column's cells (e.g. width, alignment). */
		class?: string;
		/** Hide column below this Tailwind breakpoint. */
		hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
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
		class: className = ''
	}: DataTableProps<T> = $props();

	export function getCellValue(
		row: T,
		accessor: DataTableColumn<T>['accessor']
	): string | number | null {
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
								getHideBreakpoint(col),
								col.class
							)}
						>
							{col.header}
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
								<Skeleton class="h-4 w-3/4" />
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
								getHideBreakpoint(col),
								col.class
							)}
						>
							{#if col.sortBy && onSortChange}
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
						role={onRowClick ? 'button' : undefined}
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
								{#if col.cell}
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
