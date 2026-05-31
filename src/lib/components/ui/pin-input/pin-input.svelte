<script lang="ts">
	import { PinInput as PinInputPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		value = $bindable(''),
		...rest
	}: PinInputPrimitive.RootProps = $props();
</script>

<PinInputPrimitive.Root
	bind:ref
	bind:value
	data-slot="pin-input"
	class={cn('flex gap-2', className)}
	{...rest}
/>
