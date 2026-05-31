<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { X, Icon } from '$lib/icons';
	import { cn } from '$lib/utils/cn';
	import DialogOverlay from './dialog-overlay.svelte';

	let {
		ref = $bindable(null),
		class: className,
		showCloseButton = true,
		children,
		...rest
	}: DialogPrimitive.ContentProps & { showCloseButton?: boolean } = $props();
</script>

<DialogPrimitive.Portal>
	<DialogOverlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			'bg-bg-elevated border border-border rounded-xl shadow-card fixed left-[50%] top-[50%] z-50 flex max-h-[90vh] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden p-0',
			'data-[state=open]:animate-in data-[state=closed]:animate-out',
			'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
			'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
			className
		)}
		{...rest}
	>
		{@render children?.()}
		{#if showCloseButton}
			<DialogPrimitive.Close
				class="absolute end-3 top-3 rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
				aria-label="Close"
			>
				<Icon icon={X} size="sm" />
			</DialogPrimitive.Close>
		{/if}
	</DialogPrimitive.Content>
</DialogPrimitive.Portal>
