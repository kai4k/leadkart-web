<script lang="ts">
	/**
	 * Timeline — vertical event stream root.
	 *
	 * Visual: a vertical guide line runs through the icon-circle centres
	 * of each <TimelineItem>. The line itself is drawn via a flexbox
	 * column with the guide painted by each item's ::before-style border
	 * to keep the markup composable.
	 *
	 * Industry refs: GitHub PR timeline, Linear activity stream, Stripe
	 * dashboard event log.
	 */
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils/cn';

	type Props = HTMLAttributes<HTMLOListElement> & {
		children: Snippet;
		class?: string;
	};

	let { class: className = '', children, ...rest }: Props = $props();
</script>

<ol class={cn('timeline list-none', className)} {...rest}>
	{@render children()}
</ol>
