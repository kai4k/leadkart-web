<!-- src/lib/components/ui/accordion/AccordionItem.svelte -->
<script lang="ts">
	import { Accordion as BitsAccordion } from 'bits-ui';
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

<BitsAccordion.Item {value} {disabled} class={cn('data-[disabled]:opacity-50', className)}>
	{@render children()}
</BitsAccordion.Item>
