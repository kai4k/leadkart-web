<script lang="ts" generics="T">
	/**
	 * The `<thead>`: the hard edge of the table (opaque `bg-card`, no material and no backdrop filter,
	 * Apple's "hard style" for a pinned column header). The edge itself is drawn on the cells, as an
	 * inset shadow: with `border-collapse` a border on the `<thead>` stays with the table and is gone
	 * once the header sticks. Sortable columns render a `<button>` inside the `<th>`, which carries
	 * `aria-sort`; the cycle is none, ascending, descending, none.
	 */
	import { _ } from 'svelte-i18n';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Checkbox } from '#lib/components/ui/checkbox/index.ts';
	import { ArrowDown, ArrowUp, ChevronsUpDown, Icon } from '#lib/icons/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import { canSortColumn, hideBelowClass } from './columns.ts';
	import type { DataTableColumn, SortState } from './types.ts';

	type Props = {
		columns: DataTableColumn<T>[];
		sortMode: 'none' | 'client' | 'server';
		sort: SortState;
		onSort: (id: string) => void;
		/** Present when the table has a selection column. */
		selectAll?: {
			multi: boolean;
			checked: boolean;
			indeterminate: boolean;
			label: string;
			onToggle: () => void;
		};
		hasActions: boolean;
		sticky: boolean;
		/** Measured widths while the body is windowed (see DataTable); a column keeps its width while rows come and go. */
		widths?: Record<string, number> | null;
	};
	let { columns, sortMode, sort, onSort, selectAll, hasActions, sticky, widths }: Props = $props();

	const edge = 'shadow-[inset_0_-1px_0_0_var(--border)]';

	function ariaSort(col: DataTableColumn<T>): 'ascending' | 'descending' | 'none' {
		if (sort?.id !== col.id) return 'none';
		return sort.desc ? 'descending' : 'ascending';
	}
	function nextLabel(col: DataTableColumn<T>): string {
		const state = ariaSort(col);
		return state === 'none'
			? $_('dataTable.sortAscending')
			: state === 'ascending'
				? $_('dataTable.sortDescending')
				: $_('dataTable.sortClear');
	}
	const width = (id: string) => (widths?.[id] ? `width: ${widths[id]}px` : undefined);
</script>

<Table.Header class={cn('[&_tr]:border-b-0', sticky && 'bg-card sticky top-0 z-(--z-sticky)')}>
	<Table.Row class="border-b-0 hover:bg-transparent" aria-rowindex={1}>
		{#if selectAll}
			<Table.Head class={cn('bg-muted w-10', edge)} data-col-id="select" style={width('select')}>
				{#if selectAll.multi}
					<Checkbox
						class="size-6"
						aria-label={selectAll.label}
						checked={selectAll.checked}
						indeterminate={selectAll.indeterminate}
						onCheckedChange={() => selectAll.onToggle()}
					/>
				{:else}
					<span class="sr-only">{$_('dataTable.select')}</span>
				{/if}
			</Table.Head>
		{/if}
		{#each columns as col (col.id)}
			{@const canSort = canSortColumn(col, sortMode)}
			<Table.Head
				class={cn(
					'bg-muted text-muted-foreground px-3',
					edge,
					col.align === 'end' && 'text-end',
					hideBelowClass(col),
					col.class
				)}
				data-col-id={col.id}
				style={width(col.id)}
				aria-sort={canSort ? ariaSort(col) : undefined}
			>
				{#if canSort}
					<button
						type="button"
						class={cn(
							'hover:text-foreground focus-visible:ring-ring -mx-1 inline-flex min-h-6 items-center gap-1 rounded px-1 font-medium outline-none focus-visible:ring-2',
							col.align === 'end' && 'flex-row-reverse'
						)}
						title={nextLabel(col)}
						onclick={() => onSort(col.id)}
					>
						{col.header}
						<Icon
							icon={ariaSort(col) === 'ascending'
								? ArrowUp
								: ariaSort(col) === 'descending'
									? ArrowDown
									: ChevronsUpDown}
							size="xs"
						/>
					</button>
				{:else}
					{col.header}
				{/if}
			</Table.Head>
		{/each}
		{#if hasActions}
			<Table.Head class={cn('bg-muted w-10', edge)} data-col-id="actions" style={width('actions')}>
				<span class="sr-only">{$_('dataTable.actions')}</span>
			</Table.Head>
		{/if}
	</Table.Row>
</Table.Header>
