<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils/cn';

	type Props = HTMLAttributes<HTMLParagraphElement> & {
		children?: Snippet;
	};

	let { class: className = '', children, ...rest }: Props = $props();
</script>

<p class={cn('label text-[var(--color-fg-muted)]', className)} {...rest}>
	{#if children}{@render children()}{/if}
</p>
