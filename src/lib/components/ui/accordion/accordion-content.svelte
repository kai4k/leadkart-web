<script lang="ts">
	import { Accordion as AccordionPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: AccordionPrimitive.ContentProps = $props();
</script>

<AccordionPrimitive.Content
	bind:ref
	data-slot="accordion-content"
	class={cn(
		'overflow-hidden text-sm text-fg-muted transition-all',
		'data-[state=open]:animate-in data-[state=closed]:animate-out',
		className
	)}
	{...rest}
>
	<div class="pb-4 pt-0">{@render children?.()}</div>
</AccordionPrimitive.Content>
