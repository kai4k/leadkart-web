<script lang="ts" module>
	import type { VariantProps } from 'class-variance-authority';
	import { cva } from 'class-variance-authority';

	export const kanbanColumnHeaderVariants = cva(
		'inline-flex h-1.5 w-12 flex-shrink-0 rounded-full',
		{
			variants: {
				accent: {
					primary: 'bg-primary',
					success: 'bg-success-500',
					warning: 'bg-warning-500',
					danger: 'bg-danger-500',
					info: 'bg-info-500',
					neutral: 'bg-fg-subtle'
				}
			},
			defaultVariants: { accent: 'neutral' }
		}
	);

	export type KanbanColumnAccent = NonNullable<
		VariantProps<typeof kanbanColumnHeaderVariants>['accent']
	>;
</script>

<script lang="ts">
	/**
	 * KanbanColumn — drop target + scrollable list body.
	 *
	 * Listens for dragover (preventDefault to indicate droppable) and
	 * drop (parse payload, dispatch onCardMove from context). Columns
	 * highlight while a card is dragged over (data-drag-over attribute).
	 */
	import { getContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import Badge from '../Badge.svelte';
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
		label: string;
		count?: number;
		accent?: KanbanColumnAccent;
		class?: string;
		children?: Snippet;
	};

	let { id, label, count, accent = 'neutral', class: className = '', children }: Props = $props();

	const ctx = getContext<KanbanContext>(KANBAN_CTX);

	const isDragOver = $derived(ctx?.state.hoveredColumnId === id);

	function onDragOver(e: DragEvent) {
		if (!ctx?.state.draggingCardId) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		ctx.state.hover(id);
	}

	function onDragLeave(e: DragEvent) {
		// Only clear if leaving the column entirely (not entering a child).
		const related = e.relatedTarget as Node | null;
		if (related && (e.currentTarget as Node).contains(related)) return;
		if (ctx?.state.hoveredColumnId === id) ctx.state.hover(null);
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		const cardId = e.dataTransfer?.getData('application/x-kanban-card');
		const fromColumn = e.dataTransfer?.getData('application/x-kanban-from');
		if (!cardId || !fromColumn) {
			ctx?.state.clear();
			return;
		}
		if (fromColumn !== id) {
			void ctx?.onCardMove?.(cardId, fromColumn, id);
		}
		ctx?.state.clear();
	}
</script>

<section
	data-kanban-column={id}
	data-drag-over={isDragOver ? 'true' : undefined}
	class={cn(
		'flex w-72 min-w-72 flex-col gap-2 rounded-xl p-2 transition-colors',
		'snap-start',
		isDragOver ? 'bg-primary-soft' : 'bg-bg-muted',
		className
	)}
	role="listitem"
	aria-label={`${label}${count !== undefined ? `, ${count} items` : ''}`}
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
>
	<header class="flex items-center justify-between gap-2 px-2 pt-1">
		<div class="flex items-center gap-2">
			<span class={kanbanColumnHeaderVariants({ accent })} aria-hidden="true"></span>
			<h3 class="body-sm text-fg font-semibold">{label}</h3>
		</div>
		{#if count !== undefined}
			<Badge variant="neutral" style="soft" size="sm">{count}</Badge>
		{/if}
	</header>

	<ul
		role="list"
		aria-label={`${label} cards`}
		class="stack stack-tight flex-1 overflow-y-auto px-1 pb-1"
	>
		{#if children}{@render children()}{/if}
	</ul>
</section>
