<script lang="ts" generics="T">
	/**
	 * The `<tbody>`. A row is never clickable: `rowHref` renders a real `<a>` in the primary cell, so
	 * open-in-new-tab, middle-click and the screen-reader link list all work, and nothing interactive
	 * nests in anything else. Selection is read from and written to the shared `BulkSelection` by row
	 * id, so a row that is sorted away, paged away or recycled out of the window keeps its state.
	 *
	 * Windowed (`win.active`): only `win.start..win.end` are rendered, between two spacer rows, plus
	 * the row that holds focus (so recycling never drops it). Every rendered row is measured on its own.
	 *
	 * Keyboard (`nav`): row keys act only when the row itself is the target (a key typed in a row's
	 * checkbox, link or menu belongs to that control), and the current row follows focus by row id. Only
	 * the current row's controls are tab stops, so Tab leaves a long table in a few presses.
	 */
	import { tick } from 'svelte';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Checkbox } from '#lib/components/ui/checkbox/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import type { KeyboardListNav } from '#lib/hooks/index.ts';
	import { hideBelowClass } from './columns.ts';
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
		nav?: KeyboardListNav<T>;
		/** Rows before the first shown one (a client page), for `aria-rowindex`. */
		rowOffset?: number;
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
		nav,
		rowOffset = 0
	}: Props = $props();

	const span = $derived(columns.length + (selection ? 1 : 0) + (rowActions ? 1 : 0));
	let tbody = $state<HTMLElement | null>(null);

	// ---- the row that holds focus, by id ----
	let focusedId = $state<string | null>(null);
	let focusInside = $state(false);
	let lastIndex = 0;
	// a plain lookup of the rendered rows' elements: nothing renders from it, so it must not be reactive
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const refs = new Map<string, HTMLElement>();

	const indexById = $derived(new Map(rows.map((row, i) => [getRowId(row), i])));
	const focusedIndex = $derived(focusedId === null ? -1 : (indexById.get(focusedId) ?? -1));

	// The window, widened to keep the focused row mounted: a recycled row would drop focus to <body>.
	const from = $derived(
		win.active && focusInside && focusedIndex >= 0 ? Math.min(win.start, focusedIndex) : win.start
	);
	const to = $derived(
		win.active && focusInside && focusedIndex >= 0 ? Math.max(win.end, focusedIndex + 1) : win.end
	);
	const slice = $derived(rows.slice(from, to));

	// The current row follows the focused row when rows are sorted or removed around it.
	$effect(() => {
		if (nav && focusedIndex >= 0) {
			nav.syncFocus(focusedIndex);
			lastIndex = focusedIndex;
		}
	});

	// The row at hand: the focused one, else the one nav last pointed at.
	const activeId = $derived(
		focusedId !== null && focusedIndex >= 0
			? focusedId
			: nav
				? (() => {
						const row = rows[nav.focusedIdx];
						return row === undefined ? null : getRowId(row);
					})()
				: null
	);

	// After rows change (a sort moves the focused row, a delete removes it, recycling) focus can
	// have fallen to <body>: put it back on the row, or on the neighbour of a row that is gone.
	$effect(() => {
		void rows;
		void from;
		void to;
		if (!nav || !focusInside || focusedId === null) return;
		const active = document.activeElement;
		if (active && active !== document.body && tbody?.contains(active)) return;
		let id = focusedId;
		if (!indexById.has(id)) {
			const neighbour = rows[Math.min(lastIndex, rows.length - 1)];
			if (neighbour === undefined) {
				focusInside = false;
				focusedId = null;
				return;
			}
			id = getRowId(neighbour);
			focusedId = id;
		}
		const index = indexById.get(id) ?? 0;
		void tick().then(() => {
			win.reveal(index);
			refs.get(id)?.focus({ preventScroll: true });
		});
	});

	// Only the current row's controls are tab stops.
	const CONTROLS = 'a[href], button, input, select, textarea, [role="checkbox"], [role="menuitem"]';
	$effect(() => {
		if (!nav || !tbody) return;
		void from;
		void to;
		void rows;
		const current = activeId;
		for (const tr of tbody.querySelectorAll<HTMLElement>('tr[data-row-id]')) {
			const isCurrent = tr.dataset.rowId === current;
			for (const el of tr.querySelectorAll<HTMLElement>(CONTROLS)) {
				if (isCurrent) {
					if (el.dataset.rowTab === 'off') {
						el.removeAttribute('tabindex');
						delete el.dataset.rowTab;
					}
				} else if (el.getAttribute('tabindex') !== '-1') {
					el.setAttribute('tabindex', '-1');
					el.dataset.rowTab = 'off';
				}
			}
		}
	});

	function rowIdOf(target: EventTarget | null): string | null {
		return target instanceof Element
			? (target.closest<HTMLElement>('tr[data-row-id]')?.dataset.rowId ?? null)
			: null;
	}

	function onfocusin(event: FocusEvent): void {
		if (!nav) return;
		nav.onFocusIn();
		const id = rowIdOf(event.target);
		if (id === null) return;
		focusInside = true;
		focusedId = id;
		// Now, not on the next effect run: the key that follows must already act on this row.
		const index = indexById.get(id);
		if (index !== undefined) nav.syncFocus(index);
	}

	function onfocusout(event: FocusEvent): void {
		if (!nav) return;
		nav.onFocusOut(event);
		const next = event.relatedTarget;
		if (next instanceof Node && tbody?.contains(next)) return;
		const left = event.target;
		// A focused row that is removed from the DOM reports a focusout with no target and focus on
		// <body>: that is not the user leaving, and the row's neighbour is focused next (above).
		queueMicrotask(() => {
			const gone = left instanceof Node && !left.isConnected;
			if (next === null && gone) return;
			if (!tbody?.contains(document.activeElement)) focusInside = false;
		});
	}

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

	function tabindexFor(index: number): 0 | -1 {
		if (!nav) return -1;
		const id = activeId;
		const current = id === null ? -1 : (indexById.get(id) ?? -1);
		// The tab stop must be a row that exists: when the current row is not rendered, the first one stands in.
		if (current < from || current >= to) return index === from ? 0 : -1;
		return index === current ? 0 : -1;
	}

	function targetIndex(key: string, current: number): number | null {
		switch (key) {
			case 'j':
			case 'ArrowDown':
				return current + 1;
			case 'k':
			case 'ArrowUp':
				return current - 1;
			case 'Home':
				return 0;
			case 'End':
				return rows.length - 1;
			default:
				return null;
		}
	}

	async function onkeydown(event: KeyboardEvent): Promise<void> {
		// Keys typed in a control inside the row (link, menu, checkbox) are that control's. The one
		// exception is `x` on the row's own checkbox: it toggles that row (focus has made it the current row).
		if (!nav) return;
		const onRow = event.target instanceof HTMLTableRowElement;
		const onCheckbox =
			event.target instanceof Element &&
			event.target.matches('[role="checkbox"]') &&
			(event.key === 'x' || event.key === 'X');
		if (!onRow && !onCheckbox) return;
		if (!win.active) {
			nav.handleKey(event);
			return;
		}
		if (event.metaKey || event.ctrlKey || event.altKey) return;
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
	onfocusin={nav ? onfocusin : undefined}
	onfocusout={nav ? onfocusout : undefined}
>
	{@render spacer(win.before(from))}
	{#each slice as row, i (getRowId(row))}
		{@const id = getRowId(row)}
		{@const index = from + i}
		{@const selected = selection?.state.isSelected(id) ?? false}
		<Table.Row
			data-row-id={id}
			data-state={selected ? 'selected' : undefined}
			aria-rowindex={rowOffset + index + 2}
			tabindex={nav ? tabindexFor(index) : undefined}
			{@attach (el: HTMLElement) => {
				refs.set(id, el);
				nav?.registerRef(id, el);
				const off = win.active ? win.observe(el, index) : undefined;
				return () => {
					off?.();
					if (refs.get(id) === el) refs.delete(id);
					nav?.registerRef(id, null);
				};
			}}
		>
			{#if selection}
				<Table.Cell class={cn('w-10 px-3', density === 'compact' ? 'py-2' : 'py-3.5')}>
					<Checkbox
						class="size-6"
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
						hideBelowClass(col),
						col.class
					)}
				>
					{#if rowHref && col.id === primaryId}
						<!-- eslint-disable svelte/no-navigation-without-resolve -- the caller passes a resolved path -->
						<a
							href={rowHref(row)}
							class="text-primary-text focus-visible:ring-ring block w-fit max-w-full rounded font-medium outline-none hover:underline focus-visible:ring-2"
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
	{@render spacer(win.after(to))}
</Table.Body>
