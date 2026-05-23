<script lang="ts" module>
	export type KanbanColumnDescriptor = {
		id: string;
		label: string;
		count?: number;
	};

	export type KanbanMove = (
		cardId: string,
		fromColumn: string,
		toColumn: string
	) => void | Promise<void>;
</script>

<script lang="ts">
	/**
	 * KanbanBoard — root of a column-based drag-and-drop board.
	 *
	 * Sets up the shared drag state in context so KanbanColumn /
	 * KanbanCard children can coordinate. Native HTML5 DnD (no library):
	 * KanbanCard sets dataTransfer payload {cardId,fromColumn};
	 * KanbanColumn calls preventDefault on dragover (signals droppable)
	 * and parses the payload on drop, dispatching `onCardMove`.
	 *
	 * The `columns` prop is descriptive only — actual column markup is
	 * passed via children so callers can place arbitrary content per
	 * column (filters, headers, custom cards). The `onCardMove` callback
	 * is hoisted onto context too so columns can fire it without
	 * prop-drilling.
	 *
	 * Industry refs: Trello, Linear Cycle board, Jira board, GitHub
	 * Projects beta.
	 */
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	import { KanbanDragState, KANBAN_CTX } from './kanban-state.svelte';

	type Props = {
		onCardMove?: KanbanMove;
		ariaLabel?: string;
		class?: string;
		children: Snippet;
	};

	let { onCardMove, ariaLabel = 'Kanban board', class: className = '', children }: Props = $props();

	const state = new KanbanDragState();

	// Context value uses a getter so updates to the onCardMove prop are
	// always visible to consumer columns/cards (Svelte 5 captures values
	// at evaluation, not by reference, hence the getter trick).
	setContext(KANBAN_CTX, {
		state,
		get onCardMove() {
			return onCardMove;
		}
	});
</script>

<div
	class={cn('flex gap-4 overflow-x-auto pb-4', 'snap-x snap-mandatory scroll-px-4', className)}
	role="list"
	aria-label={ariaLabel}
>
	{@render children()}
</div>
