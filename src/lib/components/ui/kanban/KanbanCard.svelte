<script lang="ts">
	/**
	 * KanbanCard — draggable card inside a KanbanColumn.
	 *
	 * Renders a Card-styled li (role=listitem) with draggable=true. The
	 * `fromColumn` is auto-detected by walking up to the nearest
	 * data-kanban-column attribute so callers don't repeat the column id.
	 *
	 * Keyboard reordering: Tab focuses the card. Space starts a "pick";
	 * arrow keys would move between columns but cross-column DOM-level
	 * keyboard reorder is non-trivial without an explicit move-target
	 * list — the v1 keyboard contract is Space-to-grab + ArrowLeft/Right
	 * to swap columns, dispatched via the same onCardMove hook. We keep
	 * this minimal: Space announces the card; ArrowRight/Left move it.
	 */
	import { getContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	import { KANBAN_CTX } from './kanban-state.svelte';
	import type { KanbanDragState } from './kanban-state.svelte';
	import type { KanbanMove } from './KanbanBoard.svelte';

	type KanbanContext = {
		state: KanbanDragState;
		onCardMove?: KanbanMove;
	};

	type Props = {
		id: string;
		draggable?: boolean;
		'aria-label'?: string;
		class?: string;
		children?: Snippet;
	};

	let {
		id,
		draggable = true,
		'aria-label': ariaLabel,
		class: className = '',
		children
	}: Props = $props();

	const ctx = getContext<KanbanContext>(KANBAN_CTX);

	const isDragging = $derived(ctx?.state.draggingCardId === id);

	let cardEl: HTMLLIElement | null = $state(null);

	function nearestColumnId(): string | null {
		let node: HTMLElement | null = cardEl;
		while (node) {
			if (node.dataset.kanbanColumn) return node.dataset.kanbanColumn;
			node = node.parentElement;
		}
		return null;
	}

	function onDragStart(e: DragEvent) {
		if (!draggable) return;
		const from = nearestColumnId();
		if (!from) return;
		e.dataTransfer?.setData('application/x-kanban-card', id);
		e.dataTransfer?.setData('application/x-kanban-from', from);
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
		ctx?.state.start(id, from);
	}

	function onDragEnd() {
		ctx?.state.clear();
	}

	function neighbourColumn(direction: 1 | -1): string | null {
		const from = nearestColumnId();
		if (!from) return null;
		const board = cardEl?.closest('[role="list"]');
		if (!board) return null;
		const cols = Array.from(board.querySelectorAll<HTMLElement>('[data-kanban-column]')).map(
			(el) => el.dataset.kanbanColumn ?? ''
		);
		const idx = cols.indexOf(from);
		const targetIdx = idx + direction;
		if (idx === -1 || targetIdx < 0 || targetIdx >= cols.length) return null;
		return cols[targetIdx] ?? null;
	}

	function onKeyDown(e: KeyboardEvent) {
		if (!draggable) return;
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			const dir = e.key === 'ArrowRight' ? 1 : -1;
			const to = neighbourColumn(dir);
			const from = nearestColumnId();
			if (to && from) {
				e.preventDefault();
				void ctx?.onCardMove?.(id, from, to);
			}
		}
	}
</script>

<!-- KanbanCard is a draggable interactive list item: tabindex + key/mouse
	 handlers are intentional. The a11y warnings on noninteractive <li>
	 don't apply — this is the WAI-ARIA "listitem with controls" pattern. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<li
	bind:this={cardEl}
	{draggable}
	tabindex={draggable ? 0 : -1}
	data-kanban-card={id}
	aria-label={ariaLabel}
	aria-grabbed={isDragging ? 'true' : undefined}
	class={cn(
		'bg-bg-elevated border-border rounded-lg border p-3 shadow-xs',
		'transition-shadow',
		'hover:ring-border-strong hover:ring-1',
		'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:outline-none',
		draggable && 'cursor-grab active:cursor-grabbing',
		isDragging && 'ring-primary opacity-50 ring-2',
		className
	)}
	ondragstart={onDragStart}
	ondragend={onDragEnd}
	onkeydown={onKeyDown}
>
	{#if children}{@render children()}{/if}
</li>
