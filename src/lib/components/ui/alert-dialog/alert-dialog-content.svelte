<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import { cn, type WithoutChild, type WithoutChildrenOrChild } from '#lib/utils/cn.ts';
	import { createFocusReturn } from '../overlay-focus.ts';
	import AlertDialogOverlay from './alert-dialog-overlay.svelte';
	import AlertDialogPortal from './alert-dialog-portal.svelte';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		size = 'default',
		portalProps,
		onOpenAutoFocus,
		onCloseAutoFocus,
		...restProps
	}: WithoutChild<AlertDialogPrimitive.ContentProps> & {
		size?: 'default' | 'sm';
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof AlertDialogPortal>>;
	} = $props();

	// WebKit never focuses a clicked button, so bits-ui has nothing to restore: return focus to the invoker.
	const focusReturn = createFocusReturn();
</script>

<AlertDialogPortal {...portalProps}>
	<AlertDialogOverlay />
	<AlertDialogPrimitive.Content
		bind:ref
		data-slot="alert-dialog-content"
		data-size={size}
		class={cn(
			'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 material-milk text-popover-foreground  max-h-[90dvh] gap-4 rounded-xl p-4  duration-100 data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-md group/alert-dialog-content fixed top-1/2 left-1/2 z-(--z-modal) flex flex-col w-full -translate-x-1/2 -translate-y-1/2 outline-none',
			className
		)}
		onOpenAutoFocus={focusReturn.open(onOpenAutoFocus)}
		onCloseAutoFocus={focusReturn.close(onCloseAutoFocus)}
		{...restProps}
	/>
</AlertDialogPortal>
