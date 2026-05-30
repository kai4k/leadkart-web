<script lang="ts">
	import { LinkPreview as LinkPreviewPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 4,
		...rest
	}: LinkPreviewPrimitive.ContentProps = $props();
</script>

<LinkPreviewPrimitive.Portal>
	<LinkPreviewPrimitive.Content
		bind:ref
		data-slot="hover-card-content"
		{sideOffset}
		class={cn(
			'glass-popover z-50 w-64 rounded-md p-4 outline-none shadow-md',
			'data-[state=open]:animate-in data-[state=closed]:animate-out',
			className
		)}
		{...rest}
	/>
</LinkPreviewPrimitive.Portal>
