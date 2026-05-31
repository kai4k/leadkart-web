<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let { ref = $bindable(null), class: className, ...rest }: DialogPrimitive.OverlayProps = $props();
</script>

<DialogPrimitive.Overlay
	bind:ref
	data-slot="sheet-overlay"
	class={cn('fixed inset-0 z-50 bg-black/50 backdrop-blur-sm', className)}
	{...rest}
/>
