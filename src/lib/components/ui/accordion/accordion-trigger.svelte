<script lang="ts">
	import { Accordion as AccordionPrimitive } from 'bits-ui';
	import { ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon } from '#lib/icons/index.ts';
	import { cn, type WithoutChild } from '#lib/utils/cn.ts';

	let {
		ref = $bindable(null),
		class: className,
		level = 3,
		children,
		...restProps
	}: WithoutChild<AccordionPrimitive.TriggerProps> & {
		level?: AccordionPrimitive.HeaderProps['level'];
	} = $props();
</script>

<AccordionPrimitive.Header {level} class="flex">
	<AccordionPrimitive.Trigger
		data-slot="accordion-trigger"
		bind:ref
		class={cn(
			'focus-visible:ring-ring focus-visible:border-ring focus-visible:after:border-ring **:data-[slot=accordion-trigger-icon]:text-muted-foreground rounded-lg py-2.5 text-start text-sm font-medium hover:underline focus-visible:ring-3 **:data-[slot=accordion-trigger-icon]:ms-auto **:data-[slot=accordion-trigger-icon]:size-4 group/accordion-trigger relative flex flex-1 items-start justify-between border border-transparent transition-all outline-none disabled:pointer-events-none disabled:opacity-50',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		<ChevronDownIcon
			data-slot="accordion-trigger-icon"
			class="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
		/>
		<ChevronUpIcon
			data-slot="accordion-trigger-icon"
			class="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
		/>
	</AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>
