<script lang="ts">
	import { Accordion as AccordionPrimitive } from 'bits-ui';
	import { ChevronDown, Icon } from '$icons';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: AccordionPrimitive.TriggerProps = $props();
</script>

<AccordionPrimitive.Header class="flex">
	<AccordionPrimitive.Trigger
		bind:ref
		data-slot="accordion-trigger"
		class={cn(
			'flex flex-1 items-center justify-between gap-4 py-4 text-sm font-medium text-fg',
			'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
			'[&[data-state=open]>svg]:rotate-180',
			className
		)}
		{...rest}
	>
		{@render children?.()}
		<Icon icon={ChevronDown} size="sm" class="shrink-0 transition-transform" />
	</AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>
