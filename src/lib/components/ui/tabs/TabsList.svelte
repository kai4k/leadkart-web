<!-- src/lib/components/ui/tabs/TabsList.svelte -->
<!--
	TabsList — the row of triggers.

	variant='underline' (default): Linear / Notion canon — bottom-border
	track with an active underline indicator drawn by each trigger.
	Horizontal scroll on overflow keeps long tab strips usable on narrow
	viewports without forcing a wrap.

	variant='pills': rounded background-fill track; each trigger renders
	as a pill. Used for stage-style switchers (e.g. lead stage filter).
-->
<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const tabsListVariants = cva(['flex items-center'], {
		variants: {
			variant: {
				underline: [
					'border-border gap-1 border-b',
					'overflow-x-auto',
					'[scrollbar-width:none]',
					'[&::-webkit-scrollbar]:hidden'
				],
				pills: ['bg-bg-muted border-border gap-1 rounded-lg border p-1']
			}
		},
		defaultVariants: { variant: 'underline' }
	});

	export type TabsListVariants = VariantProps<typeof tabsListVariants>;
</script>

<script lang="ts">
	import { Tabs as BitsTabs } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		class?: string;
		variant?: NonNullable<TabsListVariants['variant']>;
		children: Snippet;
	};

	let { class: className = '', variant = 'underline', children }: Props = $props();
</script>

<BitsTabs.List class={cn(tabsListVariants({ variant }), className)} data-variant={variant}>
	{@render children()}
</BitsTabs.List>
