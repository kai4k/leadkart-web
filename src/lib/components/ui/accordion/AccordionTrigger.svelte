<!-- src/lib/components/ui/accordion/AccordionTrigger.svelte -->
<!--
	AccordionTrigger — full-width button that toggles its sibling Content.

	bits-ui wraps the button in an Accordion.Header (defaults to <h3> via
	`level`). We render Header here so consumers only think about the
	Trigger/Content pair.

	The chevron rotates 180° when `data-state=open` thanks to the
	`group-data-[state=open]/trigger:rotate-180` Tailwind variant. The
	`group/trigger` named group keeps the chevron's rotation scoped to
	*this* trigger if multiple are present inside a custom wrapper.
-->
<script lang="ts">
	import { Accordion as BitsAccordion } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { ChevronDown } from '$lib/icons';
	import { cn } from '$lib/utils/cn';

	type Props = {
		level?: 1 | 2 | 3 | 4 | 5 | 6;
		class?: string;
		children: Snippet;
	};

	let { level = 3, class: className = '', children }: Props = $props();
</script>

<BitsAccordion.Header {level}>
	<BitsAccordion.Trigger
		class={cn(
			'group/trigger flex w-full items-center justify-between gap-3 py-4 text-left',
			'body-base text-fg font-medium',
			'transition-colors duration-[var(--duration-fast)]',
			'hover:text-primary',
			'focus-visible:ring-focus-ring focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
			'disabled:pointer-events-none disabled:opacity-50',
			className
		)}
	>
		{@render children()}
		<ChevronDown
			size={18}
			class="text-fg-muted shrink-0 transition-transform duration-[var(--duration-base)] group-data-[state=open]/trigger:rotate-180"
			aria-hidden="true"
		/>
	</BitsAccordion.Trigger>
</BitsAccordion.Header>
