<script lang="ts" generics="T extends RowData">
	/**
	 * DataTable — the list table every feature composes. TanStack Table v9 (see `columns.ts`, the only
	 * file that names it) owns sorting, client paging and column visibility; selection is the shared
	 * `BulkSelection`, keyed by row id, and the loading / error / empty states are `QueryState`'s.
	 *
	 * Pages write `DataTableColumn<T>` and never see TanStack. Sorting is `none`, `client` or `server`;
	 * paging is `none`, `client`, `offset` (a page number the page owns) or `cursor` (an infinite list;
	 * its sorting is `none` or `server`, never `client`). Above `virtualizeAbove` rows the body is
	 * windowed (`row-window.svelte.ts`), the column widths are locked (a cell clips what does not fit),
	 * and the table has row keys whether or not the page passed `nav`. Printing renders every row.
	 */
	import { _ } from 'svelte-i18n';
	import { flushSync, tick, untrack } from 'svelte';
	import { createTable, type RowData } from '@tanstack/svelte-table';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Skeleton } from '#lib/components/ui/index.ts';
	import QueryState, { type QueryLike } from '#lib/components/feedback/QueryState.svelte';
	import Pagination from '../Pagination.svelte';
	import InfiniteListFooter from '../InfiniteListFooter.svelte';
	import { cn } from '#lib/utils/cn.ts';
	import { createKeyboardListNav } from '#lib/hooks/index.ts';
	import DataTableHeader from './DataTableHeader.svelte';
	import DataTableBody from './DataTableBody.svelte';
	import DataTableColumnsMenu from './DataTableColumnsMenu.svelte';
	import { createRowWindow } from './row-window.svelte.ts';
	import {
		dataTableFeatures,
		hideBelowClass,
		hideableColumns,
		initialVisibility,
		toTableColumns
	} from './columns.ts';
	import type { DataTableProps, SortState } from './types.ts';

	let {
		columns,
		data,
		getRowId,
		noun,
		query,
		selection,
		sorting = { mode: 'none' },
		pagination = { mode: 'none' },
		columnVisibility = false,
		rowHref,
		rowActions,
		footer,
		empty,
		stickyHeader = true,
		density = 'default',
		virtualizeAbove = 100,
		nav,
		caption
	}: DataTableProps<T> = $props();

	// ---- state the table owns: client sorting, the client page, column visibility ----
	function initialClientSort(): SortState {
		return sorting.mode === 'client' ? (sorting.initial ?? null) : null;
	}
	let clientSort = $state<SortState>(initialClientSort());
	let pageIndex = $state(0);
	// what the user toggled; `defaultHidden` columns start hidden until they are
	let toggled = $state<Record<string, boolean>>({});
	const visibility = $derived({ ...initialVisibility(columns), ...toggled });

	const activeSort = $derived<SortState>(
		sorting.mode === 'server' ? sorting.state : sorting.mode === 'client' ? clientSort : null
	);
	const pageSize = $derived(pagination.mode === 'client' ? pagination.pageSize : 0);
	const pageCount = $derived(
		pagination.mode === 'client' ? Math.max(1, Math.ceil(data.length / pagination.pageSize)) : 0
	);
	// The page can end up past the last one when rows are removed; the clamped page is the page.
	const page = $derived(Math.min(pageIndex, Math.max(0, pageCount - 1)));
	$effect(() => {
		if (pageIndex !== page) pageIndex = page;
	});

	const table = createTable({
		features: dataTableFeatures,
		get columns() {
			return toTableColumns(columns);
		},
		get data() {
			return data;
		},
		getRowId: (row: T) => getRowId(row),
		get manualSorting() {
			return sorting.mode !== 'client';
		},
		get manualPagination() {
			return pagination.mode !== 'client';
		},
		autoResetPageIndex: false,
		state: {
			get sorting() {
				return activeSort ? [activeSort] : [];
			},
			get pagination() {
				return { pageIndex: page, pageSize: pageSize || Number.MAX_SAFE_INTEGER };
			},
			get columnVisibility() {
				return visibility;
			}
		},
		// State is owned above and handed in through the getters; the table never needs to write it.
		onSortingChange: () => {},
		onPaginationChange: () => {},
		onColumnVisibilityChange: () => {}
	});

	const rows = $derived(table.getRowModel().rows.map((r) => r.original));
	const visibleColumns = $derived(columns.filter((c) => visibility[c.id] !== false));
	const primaryId = $derived(columns.find((c) => c.primary)?.id ?? columns[0]?.id ?? '');

	function onSort(id: string): void {
		const next: SortState =
			activeSort?.id !== id ? { id, desc: false } : activeSort.desc ? null : { id, desc: true };
		if (sorting.mode === 'server') {
			sorting.onChange(next);
		} else if (sorting.mode === 'client') {
			clientSort = next;
			pageIndex = 0;
		}
	}

	function toggleColumn(id: string, visible: boolean): void {
		toggled = { ...toggled, [id]: visible };
		// A hidden column leaves no sort indicator behind: the order would change with no sign why.
		if (!visible && activeSort?.id === id) {
			if (sorting.mode === 'server') sorting.onChange(null);
			else clientSort = null;
		}
	}

	// ---- selection: the header box acts on every LOADED row, not the page or the window ----
	function loadedItems(): { id: string }[] {
		return data.map((row) => ({ id: getRowId(row) }));
	}
	const selectAll = $derived.by(() => {
		if (!selection) return undefined;
		const items = loadedItems();
		const all = selection.state.areAllVisibleSelected(items);
		return {
			multi: selection.mode === 'multi',
			checked: all,
			indeterminate: !all && items.some((i) => selection.state.isSelected(i.id)),
			label: $_('dataTable.selectAll', { values: { count: items.length } }),
			onToggle: () => {
				if (all) selection.state.deselectAllVisible(items);
				else selection.state.selectAllVisible(items);
			}
		};
	});

	// Rows that are gone (filtered away, deleted, the list shrank) are not selected any more: a bulk
	// action would send ids the user can no longer see. In `offset` paging `data` is one page of a
	// longer list, so ids from other pages stay (the page clears them when the filter changes).
	$effect(() => {
		if (!selection || pagination.mode === 'offset' || queryLike.isPending) return;
		const present = new Set(data.map((row) => getRowId(row)));
		const stale = [...selection.state.selected].filter((id) => !present.has(id));
		if (stale.length > 0) selection.state.deselectAllVisible(stale.map((id) => ({ id })));
	});

	// ---- query: static data, an explicit query, or the cursor list's own ----
	const queryLike = $derived.by<QueryLike<T[]>>(() => {
		const q =
			query ??
			(pagination.mode === 'cursor'
				? pagination.list.query
				: { isPending: false, isError: false, error: null, refetch: undefined });
		return {
			isPending: q.isPending,
			isError: q.isError,
			error: q.error,
			refetch: q.refetch,
			data: q.isPending || (q.isError && data.length === 0) ? undefined : data
		};
	});

	// ---- windowing, locked column widths, scrolling, printing ----
	let printing = $state(false);
	let scroller = $state<HTMLElement | null>(null);
	let widths = $state<Record<string, number> | null>(null);

	const win = createRowWindow({
		count: () => rows.length,
		threshold: () => (printing ? Number.POSITIVE_INFINITY : virtualizeAbove),
		estimate: () => (density === 'compact' ? 36 : 53)
	});

	// ---- keyboard nav sees every row, in the order shown ----
	// A windowed table always has row keys: the focused row is tracked (so it stays mounted) and only the
	// current row's controls are tab stops, and without arrow keys that would strand a keyboard user.
	const ownNav = createKeyboardListNav<T>({ getId: (row) => getRowId(row) });
	const bodyNav = $derived(nav ?? (win.active ? ownNav : undefined));
	$effect(() => {
		bodyNav?.setItems(rows);
	});

	let measuring = 0;
	/** Let the columns size to what is on screen once, then keep those widths while rows recycle. */
	async function lockWidths(): Promise<void> {
		const token = ++measuring;
		widths = null;
		await tick();
		if (token !== measuring || !scroller) return;
		const next: Record<string, number> = {};
		for (const th of scroller.querySelectorAll<HTMLElement>('thead th[data-col-id]')) {
			const width = th.getBoundingClientRect().width;
			if (width > 0 && th.dataset.colId) next[th.dataset.colId] = width;
		}
		widths = next;
	}

	$effect(() => {
		// the shape of the table: windowed or not, which columns, selection and actions columns
		void [
			win.active,
			visibleColumns.map((c) => c.id).join(','),
			selection !== undefined,
			rowActions !== undefined
		];
		untrack(() => {
			if (win.active) void lockWidths();
			else {
				measuring++;
				widths = null;
			}
		});
	});

	function watchWidth(el: HTMLElement): () => void {
		let last = el.clientWidth;
		const observer = new ResizeObserver(() => {
			if (el.clientWidth === last) return;
			last = el.clientWidth;
			if (win.active) void lockWidths();
		});
		observer.observe(el);
		return () => observer.disconnect();
	}

	// A new order or a new page starts at the top (and the browser's scroll anchoring is off).
	$effect(() => {
		void activeSort?.id;
		void activeSort?.desc;
		void page;
		void (pagination.mode === 'offset' ? pagination.page : 0);
		untrack(() => {
			if (scroller) scroller.scrollTop = 0;
		});
	});

	// The cursor list's sentinel is watched against the scroll container, so a page loads before the end is reached.
	$effect(() => {
		if (pagination.mode === 'cursor') pagination.list.rootRef = scroller;
	});

	const rowOffset = $derived(pagination.mode === 'client' ? page * pageSize : 0);
	// ARIA: -1 while a cursor list has more rows to load.
	const ariaRowCount = $derived(
		pagination.mode === 'client'
			? data.length + 1
			: pagination.mode === 'cursor' && pagination.list.hasNextPage
				? -1
				: rows.length + 1
	);

	const showingFrom = $derived(page * pageSize + 1);
	const showingTo = $derived(Math.min(data.length, showingFrom + rows.length - 1));
	const SKELETON_ROWS = 5;
</script>

<svelte:window
	onbeforeprint={() => {
		printing = true;
		flushSync();
	}}
	onafterprint={() => (printing = false)}
/>

{#snippet tableSkeleton()}
	<div class="border-border bg-card overflow-hidden rounded-xl border">
		<Table.Root>
			<Table.Header>
				<Table.Row class="hover:bg-transparent">
					{#if selection}<Table.Head class="bg-muted w-10"></Table.Head>{/if}
					{#each visibleColumns as col (col.id)}
						<Table.Head class={cn('bg-muted text-muted-foreground px-3', hideBelowClass(col))}>
							{col.header}
						</Table.Head>
					{/each}
					{#if rowActions}<Table.Head class="bg-muted w-10"></Table.Head>{/if}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each { length: SKELETON_ROWS } as _row, i (i)}
					<Table.Row class="hover:bg-transparent">
						{#if selection}<Table.Cell class="px-3"><Skeleton class="size-4" /></Table.Cell>{/if}
						{#each visibleColumns as col (col.id)}
							<Table.Cell
								class={cn('px-3', density === 'compact' ? 'py-2' : 'py-3.5', hideBelowClass(col))}
							>
								<Skeleton class="h-4 w-full max-w-40" />
							</Table.Cell>
						{/each}
						{#if rowActions}<Table.Cell class="px-3"><Skeleton class="size-4" /></Table.Cell>{/if}
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/snippet}

<QueryState
	query={queryLike}
	{noun}
	isEmpty={(d) => d.length === 0}
	skeleton={tableSkeleton}
	{empty}
>
	<div class="stack stack-tight">
		{#if columnVisibility}
			<div class="flex justify-end">
				<DataTableColumnsMenu
					columns={hideableColumns(columns)}
					{visibility}
					onToggle={toggleColumn}
				/>
			</div>
		{/if}
		<!-- The scroll region is focusable so a keyboard user can scroll a table whose rows hold nothing focusable. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			data-slot="data-table-scroll"
			role="region"
			aria-label={caption ?? noun}
			tabindex="0"
			bind:this={scroller}
			{@attach win.attach}
			{@attach watchWidth}
			class="border-border bg-card focus-visible:ring-ring max-h-(--data-table-max-height) overflow-auto rounded-xl border [overflow-anchor:none] outline-none focus-visible:ring-2 print:max-h-none print:overflow-visible [&_[data-slot=table-container]]:overflow-visible"
		>
			<!-- Locked widths come from the first window: a longer value further down is clipped, never drawn over the next column. -->
			<Table.Root
				aria-rowcount={ariaRowCount}
				class={cn(widths && 'table-fixed [&_tbody_td]:overflow-x-clip [&_tbody_td]:text-ellipsis')}
			>
				{#if caption}<Table.Caption class="sr-only">{caption}</Table.Caption>{/if}
				<DataTableHeader
					columns={visibleColumns}
					sortMode={sorting.mode}
					sort={activeSort}
					{onSort}
					{selectAll}
					hasActions={rowActions !== undefined}
					sticky={stickyHeader}
					{widths}
				/>
				<DataTableBody
					{rows}
					columns={visibleColumns}
					{primaryId}
					{getRowId}
					{selection}
					{rowHref}
					{rowActions}
					{density}
					{win}
					nav={bodyNav}
					{rowOffset}
				/>
				{#if footer}
					<Table.Footer>{@render footer()}</Table.Footer>
				{/if}
			</Table.Root>
			{#if pagination.mode === 'cursor'}
				<InfiniteListFooter list={pagination.list} />
			{/if}
		</div>
		{#if pagination.mode === 'client'}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-muted-foreground text-sm">
					{$_('dataTable.showing', {
						values: { from: showingFrom, to: showingTo, total: data.length }
					})}
				</p>
				{#if pageCount > 1}
					<Pagination page={page + 1} {pageCount} onChange={(p) => (pageIndex = p - 1)} />
				{/if}
			</div>
		{:else if pagination.mode === 'offset' && pagination.pageCount > 1}
			<Pagination
				page={pagination.page}
				pageCount={pagination.pageCount}
				onChange={pagination.onPageChange}
			/>
		{/if}
	</div>
</QueryState>
