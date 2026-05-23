<!-- src/lib/components/data/Toolbar.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	/**
	 * Toolbar — composable list-page header bar.
	 *
	 * Slot anatomy (Material-3 "top app bar with action chips"
	 * pattern): title on the left, search in the middle, actions on
	 * the right, optional tabs row docked underneath.
	 *
	 * No props beyond slots — variants are expressed by what the
	 * caller renders into each slot. Page composition stays in the
	 * page; this primitive just enforces alignment + spacing.
	 */

	type Props = {
		title?: Snippet;
		search?: Snippet;
		actions?: Snippet;
		tabs?: Snippet;
		class?: string;
	};

	let { title, search, actions, tabs, class: className = '' }: Props = $props();
</script>

<div class={cn('stack stack-tight', className)}>
	<div class="cluster cluster-spread items-center gap-4">
		{#if title}
			<div class="min-w-0 flex-1">{@render title()}</div>
		{/if}
		{#if search}
			<div class="max-w-md min-w-0 flex-1">{@render search()}</div>
		{/if}
		{#if actions}
			<div class="cluster cluster-tight shrink-0">{@render actions()}</div>
		{/if}
	</div>

	{#if tabs}
		<div class="border-border -mx-1 border-b">
			{@render tabs()}
		</div>
	{/if}
</div>
