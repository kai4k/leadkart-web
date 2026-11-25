<script lang="ts">
	import { Popover as PopoverPrimitive } from 'bits-ui';
	import { cn, type WithoutChildrenOrChild } from '#lib/utils/cn.ts';
	import { createFocusReturn } from '../overlay-focus.ts';
	import PopoverPortal from './popover-portal.svelte';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 4,
		align = 'center',
		portalProps,
		onOpenAutoFocus,
		onCloseAutoFocus,
		...restProps
	}: PopoverPrimitive.ContentProps & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof PopoverPortal>>;
	} = $props();

	// WebKit never focuses a clicked button, so bits-ui has nothing to restore: return focus to the invoker.
	const focusReturn = createFocusReturn();
</script>

<PopoverPortal {...portalProps}>
	<PopoverPrimitive.Content
		bind:ref
		data-slot="popover-content"
		{sideOffset}
		{align}
		class={cn(
			'material-milk text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2  flex flex-col gap-2.5 rounded-xl p-2.5 text-sm   duration-100 z-(--z-popover) w-72 origin-(--bits-popover-content-transform-origin) outline-none forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-solid',
			className
		)}
		onOpenAutoFocus={focusReturn.open(onOpenAutoFocus)}
		onCloseAutoFocus={focusReturn.close(onCloseAutoFocus)}
		{...restProps}
	/>
</PopoverPortal>
