<script lang="ts" generics="T">
	/**
	 * The `<tbody>`. A row is never clickable: `rowHref` renders a real `<a>` in the primary cell, so
	 * open-in-new-tab, middle-click and the screen-reader link list all work, and nothing interactive
	 * nests in anything else. Selection is read from and written to the shared `BulkSelection` by row
	 * id, so a row that is sorted away, paged away or recycled out of the window keeps its state.
	 *
	 * Windowed (`win.active`): only `win.start..win.end` are rendered, plus ONE more row when the row
	 * that holds focus is outside that range (so recycling never drops focus), with a spacer row wherever
	 * rows are left out. Every rendered row is measured on its own.
	 *
	 * Keyboard (`nav`; a windowed table always has one, see DataTable): row keys act only when the row
	 * itself is the target (a key typed in a row's checkbox, link or menu belongs to that control), and
	 * the current row follows focus by row id. Only the current row's controls are tab stops, so Tab
	 * leaves a long table in a few presses. `x` selects through the table's own toggle.
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

	// The focused row stays mounted when the window has moved away from it (a recycled row would drop
	// focus to <body>): that ONE row, never the rows between it and the window.
	const kept = $derived(
		win.active &&
			focusInside &&
			focusedIndex >= 0 &&
			(focusedIndex < win.start || focusedIndex >= win.end)
			? focusedIndex
			: -1
	);

	// Spacer keys cannot be row ids (no row id starts with NUL). The spacer between the kept row and the
	// window has one key per side, so the keyed each never has to move the focused row past it.
	const GAP = { head: '\0head', above: '\0above', below: '\0below', tail: '\0tail' } as const;
	type Entry = { key: string; gap: number } | { key: string; index: number; row: T };
	/** What the body renders, top to bottom: rows, and a spacer wherever rows are left out. */
	const entries = $derived.by<Entry[]>(() => {
		const out: Entry[] = [];
		const push = (index: number) => {
			const row = rows[index];
			if (row !== undefined) out.push({ key: getRowId(row), index, row });
		};
		const gap = (key: string, height: number) => {
			if (win.active && height > 0) out.push({ key, gap: height });
		};
		const above = kept >= 0 && kept < win.start;
		gap(GAP.head, win.before(above ? kept : win.start));
		if (above) {
			push(kept);
			gap(GAP.above, win.before(win.start) - win.before(kept + 1));
		}
		for (let i = win.start; i < win.end; i++) push(i);
		let next = win.end;
		if (kept >= win.end) {
			gap(GAP.below, win.before(kept) - win.before(win.end));
			push(kept);
			next = kept + 1;
		}
		gap(GAP.tail, win.after(next));
		return out;
	});

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

	// Rows changing under the focused row. The DOM follows LATER in the same task: the table library
	// applies new rows from an effect of its own, so this component's effects run before the rows move.
	// Until the DOM has caught up, a focusout with no target is the browser reporting the focused row's
	// move or removal, not the person leaving.
	let rowsChanging = 0;
	$effect.pre(() => {
		void rows;
		rowsChanging++;
		void tick().then(() => rowsChanging--);
	});

	/**
	 * Focus has fallen to <body> because the focused row was moved (a sort, a refetch) or removed: put
	 * it back on the row, or on the neighbour of a row that is gone. Does nothing while focus is in the
	 * table, so it is safe to call from every place that may see the change first.
	 */
	function restoreFocus(): void {
		if (!nav || !focusInside || focusedId === null) return;
		const active = document.activeElement;
		if (active && active !== document.body && tbody?.contains(active)) return;
		let id = focusedId;
		let gone = false;
		if (!indexById.has(id)) {
			const neighbour = rows[Math.min(lastIndex, rows.length - 1)];
			if (neighbour === undefined) {
				focusInside = false;
				focusedId = null;
				return;
			}
			id = getRowId(neighbour);
			focusedId = id;
			gone = true;
		}
		// The same row, still rendered: focus it where it is. The list does not scroll to where it went.
		const el = refs.get(id);
		if (el && !gone) {
			el.focus({ preventScroll: true });
			return;
		}
		const index = indexById.get(id) ?? 0;
		void tick().then(() => {
			if (gone) win.reveal(index);
			refs.get(id)?.focus({ preventScroll: true });
		});
	}
	$effect(() => {
		void rows;
		void entries;
		restoreFocus();
		// The rows may move after this effect has run (see above), and not every browser reports that
		// with a focusout: look again once the DOM has caught up.
		void tick().then(restoreFocus);
	});

	// Only the current row's controls are tab stops.
	const CONTROLS = 'a[href], button, input, select, textarea, [role="checkbox"], [role="menuitem"]';
	$effect(() => {
		if (!nav || !tbody) return;
		void entries;
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
		// The focused row is being moved or removed by a rows change: not the person leaving. Focus goes
		// back (to the row, or to its neighbour) once the DOM has caught up.
		if (next === null && rowsChanging > 0) {
			void tick().then(restoreFocus);
			return;
		}
		const left = event.target;
		queueMicrotask(() => {
			// A focused row that left the DOM for another reason: not the person leaving either.
			const gone = left instanceof Node && !left.isConnected;
			if (next === null && gone) {
				restoreFocus();
				return;
			}
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
		const rendered = (current >= win.start && current < win.end) || (kept >= 0 && current === kept);
		if (!rendered) return index === win.start ? 0 : -1;
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
		// exception is `x` on the row's OWN checkbox (not a checkbox a cell happens to render): it toggles that row.
		if (!nav) return;
		const onRow = event.target instanceof HTMLTableRowElement;
		const isX = event.key === 'x' || event.key === 'X';
		const onCheckbox =
			isX && event.target instanceof Element && event.target.matches('[data-row-select]');
		if (!onRow && !onCheckbox) return;
		// `x` selects through the table's own toggle, which is what keeps single mode to one row.
		if (isX && selection) {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			const id = rowIdOf(event.target);
			if (id === null) return;
			event.preventDefault();
			toggle(id);
			return;
		}
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
	<tr aria-hidden="true" style="height: {height}px"
		><td colspan={span} class="border-0 p-0"></td></tr
	>
{/snippet}

{#snippet tableRow(row: T, index: number)}
	{@const id = getRowId(row)}
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
			// A cell that renders its own link inside `rowHref`'s link nests anchors: say so where it is built.
			if (import.meta.env.DEV && rowHref && el.querySelector('a a'))
				console.error(
					`DataTable: row "${id}" has a link inside the rowHref link. Give the cell no href.`
				);
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
					data-row-select
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
{/snippet}

<Table.Body
	bind:ref={tbody}
	data-roving-root={nav ? '' : undefined}
	onkeydown={nav ? onkeydown : undefined}
	onfocusin={nav ? onfocusin : undefined}
	onfocusout={nav ? onfocusout : undefined}
>
	{#each entries as entry (entry.key)}
		{#if 'gap' in entry}
			{@render spacer(entry.gap)}
		{:else}
			{@render tableRow(entry.row, entry.index)}
		{/if}
	{/each}
</Table.Body>
