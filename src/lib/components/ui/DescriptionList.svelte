<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export interface DescriptionItem {
		label: string;
		/** Shown as text; empty (null, undefined, '') renders the fallback. 0 is a real value. */
		value?: string | number | null;
		mono?: boolean;
		/** Keep line breaks in a free-text value (a reason, a note). */
		multiline?: boolean;
		/** 2 stretches the item across both columns from the `sm` breakpoint. */
		span?: 1 | 2;
		/** Replaces `value` (a badge, a copy button, a link). */
		render?: Snippet;
	}
</script>

<script lang="ts">
	import { cn } from '#lib/utils/cn.ts';

	type Props = {
		items: readonly DescriptionItem[];
		cols?: 1 | 2 | 3;
		/** Shown for an empty value. */
		fallback?: string;
		class?: string;
	};

	let { items, cols = 2, fallback = '—', class: className }: Props = $props();
</script>

<dl
	class={cn(
		'grid grid-cols-1 gap-x-6 gap-y-3',
		cols >= 2 && 'sm:grid-cols-2',
		cols === 3 && 'lg:grid-cols-3',
		className
	)}
>
	{#each items as item (item.label)}
		<div class={cn('stack stack-tight', item.span === 2 && 'sm:col-span-2')}>
			<dt class="caption text-muted-foreground">{item.label}</dt>
			<dd
				class={cn(
					'body-base text-foreground',
					item.mono && 'font-mono',
					item.multiline && 'whitespace-pre-wrap'
				)}
			>
				{#if item.render}
					{@render item.render()}
				{:else if item.value == null || item.value === ''}
					{fallback}
				{:else}
					{item.value}
				{/if}
			</dd>
		</div>
	{/each}
</dl>
