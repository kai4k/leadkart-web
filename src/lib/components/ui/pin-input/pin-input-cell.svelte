<script lang="ts">
	import { PinInput as PinInputPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let { ref = $bindable(null), class: className, ...rest }: PinInputPrimitive.CellProps = $props();
</script>

<PinInputPrimitive.Cell
	bind:ref
	data-slot="pin-input-cell"
	class={cn(
		'flex h-12 w-12 items-center justify-center rounded-md border border-border bg-bg-elevated text-lg font-medium',
		'data-[active=true]:ring-2 data-[active=true]:ring-focus-ring',
		className
	)}
	{...rest}
/>
