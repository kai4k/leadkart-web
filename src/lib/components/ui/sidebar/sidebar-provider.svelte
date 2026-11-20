<script lang="ts">
	import * as Tooltip from '#lib/components/ui/tooltip/index.ts';
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';
	import { setSidebar } from './context.svelte.ts';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		open = $bindable(true),
		onOpenChange = () => {},
		class: className,
		style,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	} = $props();

	// The open state is the `sidebar` preference (`lk_ui`), which the caller maps through
	// `open` / `onOpenChange`: the generated `sidebar_state` cookie write is gone, and the widths
	// come from `styles/theme/layouts.css`, not an inline style.
	const sidebar = setSidebar({
		open: () => open,
		setOpen: (value: boolean) => {
			open = value;
			onOpenChange(value);
		}
	});
</script>

<svelte:window onkeydown={sidebar.handleShortcutKeydown} />

<Tooltip.Provider delayDuration={0}>
	<div
		data-slot="sidebar-wrapper"
		{style}
		class={cn(
			'group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar',
			className
		)}
		bind:this={ref}
		{...restProps}
	>
		{@render children?.()}
	</div>
</Tooltip.Provider>
