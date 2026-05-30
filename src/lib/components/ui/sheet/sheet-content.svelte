<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { X, Icon } from '$lib/icons';
	import { cn } from '$lib/utils/cn';
	import SheetOverlay from './sheet-overlay.svelte';

	let {
		ref = $bindable(null),
		class: className,
		side = 'right',
		showCloseButton = true,
		children,
		...rest
	}: DialogPrimitive.ContentProps & {
		side?: 'top' | 'right' | 'bottom' | 'left';
		showCloseButton?: boolean;
	} = $props();

	const sideClasses = $derived(
		{
			top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
			bottom:
				'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
			left: 'inset-y-0 left-0 h-full w-3/4 sm:max-w-sm border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
			right:
				'inset-y-0 right-0 h-full w-3/4 sm:max-w-sm border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right'
		}[side]
	);
</script>

<DialogPrimitive.Portal>
	<SheetOverlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="sheet-content"
		class={cn(
			'glass-card fixed z-50 flex flex-col gap-0 overflow-hidden',
			'data-[state=open]:animate-in data-[state=closed]:animate-out',
			sideClasses,
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
