<!-- src/lib/components/ui/tabs/TabsTrigger.svelte -->
<!--
	TabsTrigger — single tab button.

	bits-ui sets data-[state=active] on the active trigger; the visual
	indicator (underline track for variant='underline', filled pill for
	variant='pills') is driven entirely by that attribute. No JS reacts
	to selection in this component — selection is the parent's concern.

	The variant is read from the parent <TabsList data-variant=...> via
	`[data-variant=...]:` Tailwind variants. Avoids a context just for
	this single relationship.
-->
<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const tabsTriggerVariants = cva(
		[
			'body-sm font-medium whitespace-nowrap',
			'transition-colors duration-[var(--duration-fast)]',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
			'disabled:cursor-not-allowed disabled:opacity-50',
			// underline variant — data-variant from parent List
			'[[data-variant=underline]_&]:text-fg-muted',
			'[[data-variant=underline]_&]:hover:text-fg',
			'[[data-variant=underline]_&]:px-3 [[data-variant=underline]_&]:py-2',
			'[[data-variant=underline]_&]:border-b-2 [[data-variant=underline]_&]:border-transparent',
			'[[data-variant=underline]_&]:-mb-px',
			'[[data-variant=underline]_&][data-state=active]:text-primary',
			'[[data-variant=underline]_&][data-state=active]:border-primary',
			// pills variant
			'[[data-variant=pills]_&]:text-fg-muted',
			'[[data-variant=pills]_&]:hover:text-fg',
			'[[data-variant=pills]_&]:rounded-md',
			'[[data-variant=pills]_&]:px-3 [[data-variant=pills]_&]:py-1.5',
			'[[data-variant=pills]_&][data-state=active]:bg-bg-elevated',
			'[[data-variant=pills]_&][data-state=active]:text-fg',
			'[[data-variant=pills]_&][data-state=active]:shadow-sm'
		],
		{
			variants: {},
			defaultVariants: {}
		}
	);

	export type TabsTriggerVariants = VariantProps<typeof tabsTriggerVariants>;
</script>

<script lang="ts">
	import { Tabs as BitsTabs } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		value: string;
		disabled?: boolean;
		class?: string;
		children: Snippet;
	};

	let { value, disabled = false, class: className = '', children }: Props = $props();
</script>

<BitsTabs.Trigger {value} {disabled} class={cn(tabsTriggerVariants(), className)}>
	{@render children()}
</BitsTabs.Trigger>
