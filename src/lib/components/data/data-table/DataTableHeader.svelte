<script lang="ts" generics="T">
	/**
	 * The `<thead>`: the hard edge of the table (opaque `bg-card`, a border, no material and no
	 * backdrop filter, Apple's "hard style" for a pinned column header). Sortable columns render a
	 * `<button>` inside the `<th>`, which carries `aria-sort`; the cycle is none, ascending,
	 * descending, none.
	 */
	import { _ } from 'svelte-i18n';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Checkbox } from '#lib/components/ui/checkbox/index.ts';
	import { ArrowDown, ArrowUp, ChevronsUpDown, Icon } from '#lib/icons/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import type { DataTableColumn, SortState } from './types.ts';

	type Props = {
		columns: DataTableColumn<T>[];
		sortable: boolean;
		sort: SortState;
		onSort: (id: string) => void;
		/** Present when the table has a selection column. */
		selectAll?: {
			multi: boolean;
			checked: boolean;
			indeterminate: boolean;
			onToggle: () => void;
		};
		hasActions: boolean;
		sticky: boolean;
	};
	let { columns, sortable, sort, onSort, selectAll, hasActions, sticky }: Props = $props();

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
</script>

<Table.Header class={cn('border-border border-b', sticky && 'bg-card sticky top-0 z-(--z-sticky)')}>
	<Table.Row class="hover:bg-transparent" aria-rowindex={1}>
		{#if selectAll}
			<Table.Head class="bg-muted w-10">
				{#if selectAll.multi}
					<Checkbox
						aria-label={$_('dataTable.selectAll')}
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
			{@const canSort = sortable && col.sortable === true}
			<Table.Head
				class={cn(
					'bg-muted text-muted-foreground px-3',
					col.align === 'end' && 'text-end',
					col.class
				)}
				aria-sort={canSort ? ariaSort(col) : undefined}
			>
				{#if canSort}
					<button
						type="button"
						class={cn(
							'hover:text-foreground focus-visible:ring-ring -mx-1 inline-flex items-center gap-1 rounded px-1 font-medium outline-none focus-visible:ring-2',
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
			<Table.Head class="bg-muted w-10">
				<span class="sr-only">{$_('dataTable.actions')}</span>
			</Table.Head>
		{/if}
	</Table.Row>
</Table.Header>
