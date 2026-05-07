<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils/cn';

	type Props = HTMLAttributes<HTMLHeadingElement> & {
		level?: 2 | 3 | 4;
		children?: Snippet;
	};

	let { level = 3, class: className = '', children, ...rest }: Props = $props();
</script>

{#if level === 2}
	<h2 class={cn('h3', className)} {...rest}>
		{#if children}{@render children()}{/if}
	</h2>
{:else if level === 3}
	<h3 class={cn('h3', className)} {...rest}>
		{#if children}{@render children()}{/if}
	</h3>
{:else}
	<h4 class={cn('h4', className)} {...rest}>
		{#if children}{@render children()}{/if}
	</h4>
{/if}
