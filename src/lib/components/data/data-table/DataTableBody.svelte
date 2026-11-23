<script lang="ts" generics="T">
	/**
	 * The `<tbody>`. A row is never clickable: `rowHref` renders a real `<a>` in the primary cell, so
	 * open-in-new-tab, middle-click and the screen-reader link list all work, and nothing interactive
	 * nests in anything else. Selection is read from and written to the shared `BulkSelection` by row
	 * id, so a row that is sorted away, paged away or recycled out of the window keeps its state.
	 *
	 * Windowed (`win.active`): only `win.start..win.end` are rendered, between two spacer rows. Keyboard
	 * navigation then reveals the target row first and focuses it once it is in the DOM.
	 */
	import { tick } from 'svelte';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Checkbox } from '#lib/components/ui/checkbox/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import type { KeyboardListNav } from '#lib/hooks/index.ts';
	import type { DataTableColumn, DataTableProps, Density } from './types.ts';
	import type { RowWindow } from './row-window.svelte.ts';

	type Props = {
		/** The rows to show (sorted, and paged when paging is client-side). */
		rows: T[];
		columns: DataTableColumn<T>[];
		primaryId: string;
		getRowId: (row: T) => string;
		selection?: DataTableProps<T>['selection'];
		rowHref?: (row: T) => string;
		rowActions?: DataTableProps<T>['rowActions'];
		density: Density;
		win: RowWindow;
		nav?: KeyboardListNav<T & { id: string }>;
	};
	let {
		rows,
		columns,
		primaryId,
		getRowId,
		selection,
		rowHref,
		rowActions,
		density,
		win,
		nav
	}: Props = $props();

	const slice = $derived(rows.slice(win.start, win.end));
	const span = $derived(columns.length + (selection ? 1 : 0) + (rowActions ? 1 : 0));
	let tbody = $state<HTMLElement | null>(null);

	function display(col: DataTableColumn<T>, row: T): string {
		const value = col.accessor?.(row);
		return value === null || value === undefined || value === '' ? '—' : String(value);
	}

	function toggle(id: string): void {
		if (!selection) return;
		if (selection.mode === 'single') {
			const was = selection.state.isSelected(id);
			selection.state.clear();
			if (!was) selection.state.toggle(id);
		} else {
			selection.state.toggle(id);
		}
	}

	// A windowed row height is read from a rendered row; the window uses it for the spacers.
	$effect(() => {
		if (!win.active || !tbody) return;
		void win.start;
		const first = tbody.querySelector<HTMLElement>('tr[data-row-id]');
		if (first) win.measure(first.offsetHeight);
	});

	function tabindexFor(index: number): 0 | -1 {
		if (!nav) return -1;
		const focused = nav.focusedIdx;
		// The tab stop must be a row that exists: when the focused row is out of the window the first rendered one stands in.
		if (focused < win.start || focused >= win.end) return index === win.start ? 0 : -1;
		return nav.tabindexFor(index);
	}

	function isTyping(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;
		return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
	}

	function targetIndex(key: string, from: number): number | null {
		switch (key) {
			case 'j':
			case 'ArrowDown':
				return from + 1;
			case 'k':
			case 'ArrowUp':
				return from - 1;
			case 'Home':
				return 0;
			case 'End':
				return rows.length - 1;
			default:
				return null;
		}
	}

	async function onkeydown(event: KeyboardEvent): Promise<void> {
		if (!nav) return;
		if (!win.active) {
			nav.handleKey(event);
			return;
		}
		if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
		const target = targetIndex(event.key, nav.focusedIdx);
		if (target === null) {
			nav.handleKey(event);
			return;
		}
		event.preventDefault();
		if (target < 0 || target >= rows.length) return;
		win.reveal(target);
		nav.focusRow(target);
		await tick();
		nav.focusRow(target);
	}
</script>

{#snippet content(col: DataTableColumn<T>, row: T)}
	{#if col.cell}
		{@render col.cell(row)}
	{:else}
		{display(col, row)}
	{/if}
{/snippet}

{#snippet spacer(height: number)}
	{#if win.active && height > 0}
		<tr aria-hidden="true" style="height: {height}px"
			><td colspan={span} class="border-0 p-0"></td></tr
		>
	{/if}
{/snippet}

<Table.Body
	bind:ref={tbody}
	data-roving-root={nav ? '' : undefined}
	onkeydown={nav ? onkeydown : undefined}
	onfocusin={nav ? () => nav.onFocusIn() : undefined}
	onfocusout={nav ? (e: FocusEvent) => nav.onFocusOut(e) : undefined}
>
	{@render spacer(win.before)}
	{#each slice as row, i (getRowId(row))}
		{@const id = getRowId(row)}
		{@const index = win.start + i}
		{@const selected = selection?.state.isSelected(id) ?? false}
		<Table.Row
			data-row-id={id}
			data-state={selected ? 'selected' : undefined}
			aria-rowindex={index + 2}
			tabindex={nav ? tabindexFor(index) : undefined}
			{@attach (el: HTMLElement) => {
				nav?.registerRef(id, el);
				return () => nav?.registerRef(id, null);
			}}
		>
			{#if selection}
				<Table.Cell class={cn('w-10 px-3', density === 'compact' ? 'py-2' : 'py-3.5')}>
					<Checkbox
						aria-label={selection.rowLabel(row)}
						checked={selected}
						onCheckedChange={() => toggle(id)}
					/>
				</Table.Cell>
			{/if}
			{#each columns as col (col.id)}
				<Table.Cell
					class={cn(
						'px-3',
						density === 'compact' ? 'py-2' : 'py-3.5',
						col.align === 'end' && 'text-end',
						col.class
					)}
				>
					{#if rowHref && col.id === primaryId}
						<!-- eslint-disable svelte/no-navigation-without-resolve -- the caller passes a resolved path -->
						<a
							href={rowHref(row)}
							class="text-primary-text focus-visible:ring-ring rounded font-medium outline-none hover:underline focus-visible:ring-2"
							>{@render content(col, row)}</a
						>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{:else}
						{@render content(col, row)}
					{/if}
				</Table.Cell>
			{/each}
			{#if rowActions}
				<Table.Cell class={cn('w-10 px-3 text-end', density === 'compact' ? 'py-2' : 'py-3.5')}>
					{@render rowActions(row)}
				</Table.Cell>
			{/if}
		</Table.Row>
	{/each}
	{@render spacer(win.after)}
</Table.Body>
